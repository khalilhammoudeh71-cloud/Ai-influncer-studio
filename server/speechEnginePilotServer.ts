import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { requireAuth, isCreatorUser, type AuthenticatedRequest } from './auth';
import { PilotSessions, PilotSetupError, conversationRoom, pilotMessages, selectPilotPersona, streamPilotReply, applyPilotVoice, pilotSetupError, shouldEndPilotCall, type PilotMessage } from './speechEnginePilot';

const port = Number(process.env.SPEECH_ENGINE_PORT || 5301);
const upstream = process.env.SPEECH_ENGINE_APP_ORIGIN || 'https://ai-influencerstudio.com';
const publicOrigin = process.env.SPEECH_ENGINE_PUBLIC_ORIGIN || '';
// Explicit, temporary pilot choices. Never written back to a saved persona.
const pilotVoices: Record<string, string> = JSON.parse(process.env.SPEECH_ENGINE_PILOT_VOICES || '{}');
const origins = (process.env.SPEECH_ENGINE_BROWSER_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5205,http://127.0.0.1:5205').split(',');
const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
const app = express();
const server = createServer(app);
app.use(cors({ origin: origins, methods: ['GET','POST'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '128kb' }));
app.get('/health', (_req,res) => res.json({ ready: Boolean(publicOrigin), pilot: true }));
app.use('/pilot', requireAuth);
app.use('/pilot', (req: AuthenticatedRequest,res,next) => {
  if (!isCreatorUser(req.user?.email)) return res.status(403).json({ error: 'This pilot is available to the studio owner.' });
  next();
});
type Context = { userId: string; authorization: string; persona: any; history: PilotMessage[]; model: string; memories: string[]; fixture: boolean };
const pending = new PilotSessions<Context>();
const contexts = new Map<string, Context>();
let attached = false;
const stateFile = 'work/speech-engine/engines.json';
let engines: Record<string, string> = {};
try { engines = JSON.parse(readFileSync(stateFile, 'utf8')); } catch {}
const requests = new Map<string, number>();
const setupJobs = new Map<string, Promise<string>>();

function attach(engine: Awaited<ReturnType<typeof client.speechEngine.get>>) {
  if (attached) return;
  engine.attach(server, '/ws', {
    onInit(id, session) {
      const context = pending.claim(id);
      if (!context) { session.close(); return; }
      contexts.set(id, context);
      console.log('[Speech pilot] conversation connected');
    },
    async onTranscript(transcript, signal, session) {
      const context = session.conversationId && contexts.get(session.conversationId);
      if (!context) { session.close(); return; }
      const messages = pilotMessages(transcript, context.history);
      if (messages.at(-1)?.role !== 'user') return;
      if (shouldEndPilotCall(messages.at(-1)!.content)) { session.close(); return; }
      if (context.fixture) {
        await session.sendResponse('The voice connection is working. This is a stock test voice, not your persona. You can interrupt me now, or end this connection test.');
        return;
      }
      const response = await fetch(`${upstream}/api/agent/voice-chat-stream`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: context.authorization }, signal,
        body: JSON.stringify({ messages, activePersona: context.persona, voiceLlmModel: context.model, memories: context.memories }),
      });
      if (!signal.aborted) await session.sendResponse(streamPilotReply(response, signal));
    },
    onClose(session) { if (session.conversationId) contexts.delete(session.conversationId); },
    onDisconnect(session) { if (session.conversationId) contexts.delete(session.conversationId); },
    onError(_error, session) { console.warn('[Speech pilot] Session error; ending call.'); session.close(); if (session.conversationId) contexts.delete(session.conversationId); },
  });
  attached = true;
}
async function getEngine(persona: any) {
  if (!/^https:\/\//.test(publicOrigin)) throw new PilotSetupError('Public Speech Engine URL is not configured.');
  const settings = { voiceId: persona.voiceId, modelId: 'eleven_v3_conversational' as const,
    stability: typeof persona.voiceStability === 'number' ? persona.voiceStability / 100 : 0.5,
    similarityBoost: typeof persona.voiceLikeness === 'number' ? persona.voiceLikeness / 100 : 0.88,
    speed: persona.voiceSpeakingSpeed ?? 1 };
  const identity = createHash('sha256').update(JSON.stringify({ origin: publicOrigin, settings })).digest('hex');
  let job = setupJobs.get(identity);
  if (!job) {
    job = (async () => {
      // Check that the configured provider account can still access this exact voice.
      const voice=await client.voices.get(persona.voiceId);
      if (voice.category==='cloned' && process.env.SPEECH_ENGINE_BLOCK_INSTANT_CLONES==='true') throw new PilotSetupError('ElevenLabs currently blocks this account’s instant clones with Speech Engine custom LLMs. Your saved voice is unchanged. The stock connection test is available.');
      const engine = engines[identity] ? await client.speechEngine.get(engines[identity]) : await client.speechEngine.create({
        name: `Studio voice pilot ${identity.slice(0,8)}`,
        speechEngine: { wsUrl: publicOrigin.replace(/^https:/,'wss:') + '/ws' }, tts: settings,
        asr: { provider: 'scribe_realtime' }, language: 'en',
        turn: { turnEagerness: 'normal', speculativeTurn: false },
        privacy: { recordVoice: false, retentionDays: 1 },
        conversation: { maxDurationSeconds: 240, clientEvents: ['audio','interruption','user_transcript','agent_response','agent_response_correction'] },
        callLimits: { agentConcurrencyLimit: 1, dailyLimit: 20, burstingEnabled: false },
      });
      engines[identity] = engine.engineId;
      mkdirSync('work/speech-engine',{recursive:true});
      writeFileSync(stateFile, JSON.stringify(engines,null,2), { mode: 0o600 });
      attach(engine);
      return engine.engineId;
    })();
    setupJobs.set(identity,job);
    job.catch(()=>setupJobs.delete(identity));
  }
  return job;
}
app.post('/pilot/token', async (req: AuthenticatedRequest,res) => {
  try {
    const now = Date.now();
    for (const [id,time] of requests) if (now-time>60000) requests.delete(id);
    if (now - (requests.get(req.user.id) || 0) < 3000) return res.status(429).json({error:'Please wait a moment before starting another call.'});
    requests.set(req.user.id,now);
    const authorization = req.headers.authorization!;
    const fixture = req.body.fixture===true;
    let saved: any[]=[];
    if (!fixture) {
      const response = await fetch(`${upstream}/api/personas`, { headers: { Authorization: authorization }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new PilotSetupError('Could not load your saved personas. Sign in again and retry.');
      saved = await response.json();
    }
    const owned = saved.find((p:any)=>p.id===req.body.personaId);
    if (owned && pilotVoices[owned.name] && saved.filter((p:any)=>p.name===owned.name).length!==1) throw new PilotSetupError('The pilot voice selection needs a unique persona name.');
    const persona = fixture ? {id:'speech-engine-connection-fixture',name:'Stock voice connection test',voiceId:'EXAVITQu4vr4xnSDxMaL',voiceEngine:'elevenlabs'} : selectPilotPersona(saved.map((p:any)=>applyPilotVoice(p,pilotVoices)), req.body.personaId);
    const history = fixture ? [] : pilotMessages((req.body.history || []).map((m:any)=>({role:m.role==='model'?'agent':m.role,content:m.content})), []);
    const memories = !fixture && Array.isArray(req.body.memories) ? req.body.memories.filter((m:unknown)=>typeof m==='string').slice(0,20).map((m:string)=>m.slice(0,1000)) : [];
    const engineId = await getEngine(persona);
    const { token } = await client.conversationalAi.conversations.getWebrtcToken({agentId:engineId});
    const room = conversationRoom(token);
    pending.register(room, {userId:req.user.id,authorization,persona,history,memories,fixture,model: typeof req.body.model==='string'?req.body.model:'adaptive'});
    res.setHeader('Cache-Control','no-store');
    res.json({ token, personaName: persona.name, voiceId: persona.voiceId, pilotVoice: Boolean(pilotVoices[persona.name]), maxDurationSeconds:240 });
  } catch (error) {
    console.warn('[Speech pilot] Token request failed', {status:(error as any)?.statusCode,code:(error as any)?.body?.detail?.code || (error as any)?.body?.detail?.status});
    res.status(503).json({error:pilotSetupError(error)});
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`Speech Engine pilot listening on 127.0.0.1:${port}`));
for (const event of ['SIGINT','SIGTERM'] as const) process.on(event,()=>{server.close();process.exit(0);});
