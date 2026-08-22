import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, ChevronDown, ImageIcon, Video, Loader2, AlertCircle, Camera, MessageSquareQuote, Copy, Bookmark, Check, Phone, PhoneOff, Volume2, VolumeX, Mic, MicOff, RotateCcw, Trash2, Plus, Upload, Music, Film, X, Play, Sparkles, Paperclip, FileText, SlidersHorizontal, Settings, Hand, Maximize2, Download, Shirt, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Persona, NavActions, RelationshipState } from '../types';
import { ModelInfo, authFetch, fetchAllModelTypes, editImage, generateImage, generateVideo, textToSpeech } from '../services/imageService';
import { cn } from '../utils/cn';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';
import ImageLightboxModal from '../components/ImageLightboxModal';
import PersonaReferenceModal from '../components/PersonaReferenceModal';
import RelationshipProgressBadge from '../components/RelationshipProgressBadge';
import VoiceNoteBubble from '../components/VoiceNoteBubble';
import PersonaAvatar from '../components/PersonaAvatar';
import { getCreatorProfile } from '../utils/creatorProfile';

// ── Typewriter hook ──────────────────────────────────────
function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= text.length) { clearInterval(interval); setDone(true); return; }
      setDisplayed(text.slice(0, i + 1));
      i++;
    }, speed);
    return () => clearInterval(interval);
  }, [text]);
  return { displayed, done };
}

// ── localStorage helpers ──────────────────────────────────
const HISTORY_KEY = (personaId: string) => `chat_history_${personaId}`;
const MEMORY_KEY = (personaId: string) => `persona_memories_${personaId}`;
const USER_NAME_KEY = 'persona_user_name';
const MAX_STORED = 300; // Complete cross-session conversation capacity

const INVALID_NAMES = new Set([
  'allowing', 'serious', 'asking', 'done', 'trying', 'thinking', 'looking', 
  'curious', 'wondering', 'sure', 'here', 'just', 'ready', 'happy', 'glad',
  'user', 'khalil', 'admin', 'anonymous', 'null', 'undefined', 'not', 'no',
  'yes', 'sending', 'an', 'a', 'the', 'actually', 'playing', 'talking', 'fine',
  'right', 'wrong', 'good', 'bad', 'ok', 'okay', 'busy', 'bored', 'tired'
]);

export function getStoredUserName(): string {
  try {
    const stored = localStorage.getItem(USER_NAME_KEY);
    if (!stored || INVALID_NAMES.has(stored.toLowerCase().trim())) {
      localStorage.setItem(USER_NAME_KEY, 'Dr. H');
      return 'Dr. H';
    }
    return stored.trim();
  } catch { return 'Dr. H'; }
}

export function setStoredUserName(name: string) {
  try {
    if (name && name.trim()) {
      const clean = name.trim();
      if (!INVALID_NAMES.has(clean.toLowerCase())) {
        localStorage.setItem(USER_NAME_KEY, clean);
      }
    }
  } catch {}
}

function correctSpeechPhonetics(transcript: string, activePersonaName?: string): string {
  if (!transcript) return '';
  let corrected = transcript.trim();

  // 1. Remove stutter artifacts (e.g. "c-can", "w-what", "p-photo")
  corrected = corrected.replace(/\b([a-zA-Z])-([a-zA-Z]{2,})\b/gi, '$2');

  // 2. Remove duplicate consecutive words from speech recognition glitches (e.g. "I I want", "can can you", "the the")
  // Run loop to handle multiple consecutive repetitions (e.g. "photo photo photo")
  let prev = '';
  while (prev !== corrected) {
    prev = corrected;
    corrected = corrected.replace(/\b([a-zA-Z0-9']{1,25})\s+\1\b/gi, '$1');
  }

  // 3. Remove duplicate 2-word phrase loops (e.g. "can you can you", "send a send a")
  corrected = corrected.replace(/\b([a-zA-Z0-9']+\s+[a-zA-Z0-9']+)\s+\1\b/gi, '$1');

  // 4. Creator & Persona Name homophones
  corrected = corrected
    .replace(/\b(?:doctor\s*(?:h|age|eight|ate|a|hate|ache)|dr\.?\s*(?:h|age|eight|ate|a|hate|ache))\b/gi, 'Dr. H')
    .replace(/\b(?:doc\s*(?:h|age|eight))\b/gi, 'Dr. H')
    .replace(/\b(?:row\s*one\s*hasan|raw\s*one\s*hasan|roan\s*hasan|rawan\s*hassan|rawan\s*hasen)\b/gi, 'Rawan Hasan')
    .replace(/\b(?:lean|lien|liam|lynn|lane|lin)\s*hasan\b/gi, 'Leen Hasan')
    .replace(/\b(?:lean\s*hassan|lean\s*hasen)\b/gi, 'Leen Hasan');

  if (activePersonaName) {
    const pFirst = activePersonaName.split(/\s+/)[0];
    if (pFirst.toLowerCase() === 'leen') {
      corrected = corrected.replace(/\b(?:lean|lien|lynn|lane)\b/gi, 'Leen');
    } else if (pFirst.toLowerCase() === 'rawan') {
      corrected = corrected.replace(/\b(?:roan|rowan|row\s*one)\b/gi, 'Rawan');
    }
  }

  // 5. Contextual Visual & Photoshoot ASR corrections
  corrected = corrected
    .replace(/\b(?:requeaed|requeast|reques|recwest|rekwest)\b/gi, 'requested')
    .replace(/\b(take|send|snap|show|give|make|post)\s+(?:a\s+)?(?:pick|peek)\b/gi, '$1 a pic')
    .replace(/\b(?:sell\s*fee|cell\s*fee|sellfie|cellfie)\b/gi, 'selfie')
    .replace(/\b(?:photo\s*shot|photo\s*shoots?)\b/gi, 'photoshoot')
    .replace(/\b(?:out\s*fitt?|out-fit)\b/gi, 'outfit')
    .replace(/\b(?:full\s*buddy)\b/gi, 'full-body')
    .replace(/\b(?:half\s*buddy|have\s*body)\b/gi, 'half-body')
    .replace(/\b(?:front\s*face\s*ing|from\s*facing)\b/gi, 'front-facing')
    .replace(/\b(?:core\s*set)\b/gi, 'corset')
    .replace(/\b(?:sat\s*in)\s+(slip|dress|sheets?|robe|corset|fabric)\b/gi, 'satin $1')
    .replace(/\b(?:lingeree|linger\s*ee|lingery)\b/gi, 'lingerie')
    .replace(/\b(?:she\s*meez|shameez)\b/gi, 'chemise')
    .replace(/\b(?:oat\s*couture|hot\s*couture|out\s*couture)\b/gi, 'haute couture')
    .replace(/\b(?:barge\s*in|barj\s*in)\b/gi, 'barge in')
    .replace(/\b(?:up\s*scale|up-scale)\b/gi, 'upscale');

  // 6. Clean up spacing
  corrected = corrected.replace(/\s+/g, ' ').trim();

  return corrected;
}

function loadHistory(personaId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY(personaId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed
      .filter((m: any) => m && m.type !== 'loading')
      .map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch { return []; }
}

function saveHistory(personaId: string, msgs: ChatMessage[]) {
  try {
    const toStore = msgs.filter(m => m && m.type !== 'loading').slice(-MAX_STORED);
    localStorage.setItem(HISTORY_KEY(personaId), JSON.stringify(toStore));
  } catch { /* quota */ }
}

function loadPersonaMemories(personaId: string): string[] {
  try {
    const raw = localStorage.getItem(MEMORY_KEY(personaId));
    let parsed: string[] = raw ? JSON.parse(raw) : [];
    const userName = getStoredUserName();
    // Filter out corrupted memories with words like "Allowing", "Serious", etc.
    parsed = parsed.filter(m => 
      !m.toLowerCase().includes('allowing is the') && 
      !m.toLowerCase().includes("user's name is allowing") && 
      !m.toLowerCase().includes("user's name is serious")
    );
    const defaultFacts = [
      `User's name is ${userName}`,
      `${userName} is the creator and close partner of this persona`,
      `Values authentic conversation, wit, and intellectual depth`,
      `Enjoys playful teasing, spontaneous photo generation, and deep banter`
    ];
    for (const f of defaultFacts) {
      if (!parsed.some(m => m.includes(f))) {
        parsed.unshift(f);
      }
    }
    return parsed.slice(0, 30);
  } catch { 
    return [`User's name is Dr. H`, `Dr. H is the creator and partner`]; 
  }
}

function savePersonaMemory(personaId: string, memoryText: string) {
  try {
    const existing = loadPersonaMemories(personaId);
    const trimmed = memoryText.trim();
    if (!trimmed) return;

    // Only extract name if user explicitly introduces their name ("my name is John", "call me John")
    const nameMatch = trimmed.match(/\b(?:my name is|call me)\s+([a-zA-Z]{2,20})\b/i);
    if (nameMatch && nameMatch[1]) {
      const candidate = nameMatch[1].toLowerCase();
      if (!INVALID_NAMES.has(candidate)) {
        const extractedName = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        setStoredUserName(extractedName);
      }
    }

    // Do not save conversational complaints or generic queries as long-term memories
    if (/^(why|what|how|who|when|where|no|stop|ure|you are|are you|is that|can you)\b/i.test(trimmed)) {
      return;
    }

    if (!existing.includes(trimmed)) {
      const updated = [...existing, trimmed].slice(-30);
      localStorage.setItem(MEMORY_KEY(personaId), JSON.stringify(updated));
    }
  } catch { /* quota */ }
}

interface Props {
  personas: Persona[];
  persona: Persona;
  onSelectPersona?: (id: string) => void;
  nav: NavActions;
}

type MessageType = 'text' | 'image' | 'video' | 'voice_note' | 'loading' | 'error';
type MessageRole = 'user' | 'persona';

interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: Date;
  attachment?: { url: string; type: 'image' | 'video' | 'file'; name?: string; base64?: string };
  prompt?: string;
  audioUrl?: string;
  duration?: number;
  transcript?: string;
}

function detectIntent(message: string): 'image' | 'video' | 'chat' {
  const lower = message.toLowerCase().trim();

  // 1. Strict conversational override: Genuine questions, complaints, or discussions about media are ALWAYS chat
  const isConversationalRemark = /(?:why did you send|why are you sending|why do you keep sending|stop sending (?:photos|pics|images|videos|selfies)|don't send (?:photos|pics|images)|not asking for (?:a |an )?(?:photo|image|picture|video)|didn't ask for (?:a |an )?(?:photo|image|picture|video)|why is there (?:a |an )?(?:photo|image)|what is that (?:photo|image|picture)|did you like (?:that|the) (?:photo|image|picture)|talk about something else|let's just talk|let's chat without photos)\b/i.test(lower) ||
    /(?:while generating|about that photo|about this photo|look at the photo|what do you think of the photo|let's talk about something else|let's just chat|keep talking|continue talking)\b/i.test(lower);
  if (isConversationalRemark) return 'chat';

  // 2. Explicit video commands
  if (/\b(?:send|record|make|generate|shoot|create)\s+(?:me\s+)?(?:a\s+|an\s+|another\s+)?(?:new\s+)?(?:video|clip|reel|animation)\b/i.test(lower) ||
      /\b(?:send a video|make a video|record a video|animate this|animate it)\b/i.test(lower)) {
    return 'video';
  }

  // 3. Strict explicit visual & photo intent detection
  if (
    /\b(?:send|take|show|give|snap|shoot|make|generate|post|create|share|get|see)\s+(?:me\s+)?(?:a\s+|an\s+|another\s+|the\s+|some\s+|your\s+)?(?:one|pic|pics|photo|photos|picture|pictures|image|images|selfie|selfies|shot|portrait|outfit|look|tits|boobs|cleavage|body)\b/i.test(lower) ||
    /\b(?:can i see|let me see|wanna see|want to see|show me|send me|take a pic|take a photo|take a picture|snap a photo|snap a pic|take photo|take pic|picture of you|photo of you|pic of you|selfie of you|image of you|photos of you|pics of you|pictures of you|photo in|pic in|picture in|photo wearing|pic wearing|picture wearing|send another one|send one more|send another pic|send another photo|send it to me|send it|send that|send it again|try sending it|try sending it again|send it over|send it now|send a photo|send an image)\b/i.test(lower) ||
    /\b(?:photo|pic|picture|selfie|image)\s+(?:please|now|right now|of you|wearing|dressed|naked|exposed)\b/i.test(lower) ||
    /^(another one|send another|another pic|another photo|new photo|new pic|send it|send it to me|send|photo|pic|selfie)$/i.test(lower)
  ) {
    return 'image';
  }

  return 'chat';
}

export const VOICE_CALL_ENGINES = [
  { id: 'eleven_turbo_v2_5', name: 'ElevenLabs Turbo 2.5', badge: 'Fast (~250ms)', desc: 'Rich human tone & nuances (Recommended)' },
  { id: 'eleven_flash_v2_5', name: 'ElevenLabs Flash 2.5', badge: 'Ultra Fast (~75ms)', desc: 'Instantaneous response' },
  { id: 'cartesia-sonic', name: 'Cartesia Sonic', badge: 'Extreme Speed (~90ms)', desc: 'Fastest conversational turn-taking' },
  { id: 'eleven_multilingual_v2', name: 'ElevenLabs Multilingual v2', badge: 'Expressive (~800ms)', desc: 'High cinematic emotion' },
];

export const PERSONA_VOICE_CHARACTERS = [
  { id: 'ov7JSkufAlSs386OYTaC', name: 'Rawan Hasan (Newly Cloned Voice - Latest)', gender: 'Female' },
  { id: 'FkiPCg9ZhlwLIOml7TKM', name: 'Rawan Hasan (Multi-Sample Cloned Voice)', gender: 'Female' },
  { id: 'W4ynDvR6NFiK8lj2I8iL', name: 'Rawan Hasan (Original Direct Clone)', gender: 'Female' },
  { id: 'bEp1nJ6RU85e3wsylRfE', name: 'Rawan Hasan (Multi-Sample 178682133)', gender: 'Female' },
  { id: '7jFje9BJoTWzqZzouT0j', name: 'Leen Hasan (Cloned Voice)', gender: 'Female' },
  { id: 'sabrina', name: 'Sabrina (Sweet, Flirty & Playful)', gender: 'Female' },
  { id: 'brielle', name: 'Brielle (Ultra-Natural Podcast)', gender: 'Female' },
  { id: 'madison', name: 'Madison (Cool & Conversational)', gender: 'Female' },
  { id: 'zara', name: 'Zara (Warm & Relatable)', gender: 'Female' },
  { id: 'kristen', name: 'Kristen (Upbeat Influencer)', gender: 'Female' },
  { id: 'vanessa', name: 'Vanessa (Cute Social Girl)', gender: 'Female' },
  { id: 'john', name: 'John (Conversational & Confident)', gender: 'Male' },
  { id: 'jason', name: 'Jason (Warm Authority)', gender: 'Male' },
  { id: 'stark', name: 'Stark (Classic American)', gender: 'Male' },
];

export function getActivePersonaVoice(persona?: Persona | null) {
  if (!persona) return { voiceId: 'ov7JSkufAlSs386OYTaC', voiceReference: undefined };
  const name = (persona.name || '').toLowerCase();
  let voiceId = persona.voiceId;
  
  if (!voiceId || voiceId === 'default' || voiceId === 'female_default' || (name.includes('leen') && (voiceId === 'ov7JSkufAlSs386OYTaC' || voiceId === 'W4ynDvR6NFiK8lj2I8iL'))) {
    if (name.includes('leen')) {
      voiceId = '7jFje9BJoTWzqZzouT0j';
    } else if (name.includes('rawan')) {
      voiceId = 'ov7JSkufAlSs386OYTaC';
    } else if (name.includes('brielle')) {
      voiceId = '6u6JbqKdaQy89ENzLSju';
    } else if (name.includes('sabrina')) {
      voiceId = 'v2cluk168jzrg0LQKNRl';
    } else if (name.includes('madison')) {
      voiceId = 'NUjosfEayZAdRcDmcHM8';
    } else if (name.includes('kristen')) {
      voiceId = 'XZUXLIpE3dqJ9aCZUj2R';
    } else if (name.includes('zara')) {
      voiceId = 'jqcCZkN6Knx8BJ5TBdYR';
    } else if (name.includes('fiona')) {
      voiceId = 'RXtWW6etvimS8QJ5nhVk';
    } else if (name.includes('vanessa')) {
      voiceId = '8DzKSPdgEQPaK5vKG0Rs';
    } else if (name.includes('crystal')) {
      voiceId = 'pq3wL6Xv3fuEM14W6ZCg';
    } else if (name.includes('navya')) {
      voiceId = 'h2dQOVyUfIDqY2whPOMo';
    } else if (name.includes('kendra')) {
      voiceId = 'Xkem7o24n3aQyiwIXNeT';
    } else if (name.includes('john')) {
      voiceId = 'KLbbwrUTS6brBkjmN4Fp';
    } else if (name.includes('jason')) {
      voiceId = 'PUhCSw74BFEgrq8dqe8I';
    } else if (name.includes('stark')) {
      voiceId = 'W6zuQRTYRBdAK8ypjo5V';
    } else {
      voiceId = 'ov7JSkufAlSs386OYTaC';
    }
  }

  const voiceReference = persona.voiceSampleUrl || 
                         (persona as any)?.audioSamples?.[0]?.base64 || 
                         (persona as any)?.voiceFile || 
                         (persona as any)?.voiceReference;

  return { voiceId, voiceReference };
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AssistantView({ personas, persona: propActivePersona, onSelectPersona, nav }: Props) {
  const [selectedPersonaId, setSelectedPersonaId] = useState(propActivePersona.id);

  // Synchronize when global active persona is changed from top header
  useEffect(() => {
    if (propActivePersona?.id && propActivePersona.id !== selectedPersonaId) {
      setSelectedPersonaId(propActivePersona.id);
    }
  }, [propActivePersona?.id]);

  const [localPersonaOverrides, setLocalPersonaOverrides] = useState<Record<string, Persona>>({});
  const activePersona = localPersonaOverrides[selectedPersonaId] || personas.find(p => p.id === selectedPersonaId) || propActivePersona;

  useEffect(() => {
    const handlePersonaUpdated = (e: any) => {
      const updated = e.detail as Persona;
      if (updated && updated.id) {
        setLocalPersonaOverrides(prev => ({ ...prev, [updated.id]: updated }));
      }
    };
    window.addEventListener('persona-updated', handlePersonaUpdated as EventListener);
    return () => window.removeEventListener('persona-updated', handlePersonaUpdated as EventListener);
  }, []);
  const [voiceLlmModel, setVoiceLlmModel] = useState<string>(() => localStorage.getItem('agent_voice_llm') || 'gemini');
  const [selectedVoiceEngine, setSelectedVoiceEngine] = useState<string>(() => localStorage.getItem('agent_voice_engine') || 'eleven_turbo_v2_5');

  const handleVoiceEngineChange = (engineId: string) => {
    setSelectedVoiceEngine(engineId);
    localStorage.setItem('agent_voice_engine', engineId);
    const found = VOICE_CALL_ENGINES.find(e => e.id === engineId);
    if (found) {
      toast.success(`Voice Engine set to ${found.name}`);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(propActivePersona.id));
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingMsgId, setSavingMsgId] = useState<string | null>(null);
  const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set());

  const [activeSegment, setActiveSegment] = useState<'chat' | 'replies'>('chat');
  const [replyInput, setReplyInput] = useState('');
  const [generatedReplies, setGeneratedReplies] = useState<string[]>([]);
  const [showEngineSettings, setShowEngineSettings] = useState(false);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);

  // ── Multimodal Media Attachment States ──────────────────
  const [chatAttachment, setChatAttachment] = useState<{ url: string; base64: string; type: 'image' | 'video' | 'file'; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const callFileInputRef = useRef<HTMLInputElement>(null);
  const primaryPhotoInputRef = useRef<HTMLInputElement>(null);
  const [lastUploadedReference, setLastUploadedReference] = useState<string | null>(null);

  const handleSetPrimaryReferenceImage = async (newUrl: string) => {
    try {
      const updatedPersona: Persona = {
        ...activePersona,
        referenceImage: newUrl,
        avatar: newUrl,
        visualLibrary: activePersona.visualLibrary?.length
          ? activePersona.visualLibrary
          : [
              {
                id: `ref-${Date.now()}`,
                url: newUrl,
                prompt: 'Primary Reference Portrait',
                timestamp: Date.now(),
                model: selectedEditModelId,
                mediaType: 'image'
              }
            ]
      };

      try {
        await api.personas.update(updatedPersona);
        await api.updatePersonaInVault(updatedPersona);
      } catch (dbErr) {
        console.warn('DB update notice:', dbErr);
      }

      if (onSelectPersona) {
        onSelectPersona(updatedPersona.id);
      }

      window.dispatchEvent(new CustomEvent('persona-updated', { detail: updatedPersona }));
      window.dispatchEvent(new CustomEvent('personas-refresh'));

      toast.success(`👑 Updated ${activePersona.name}'s Primary Reference Photo!`, { id: 'primary-ref-update' });
    } catch (err: any) {
      console.error('Failed to update primary reference photo:', err);
      toast.error('Failed to update photo: ' + (err?.message || 'Unknown error'));
    }
  };

  const handlePrimaryPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await handleSetPrimaryReferenceImage(base64);
    } catch (err) {
      toast.error('Failed to process image');
    }
    if (e.target) e.target.value = '';
  };

  const handleChatFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const f = files[0];
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      const fileType: 'image' | 'video' | 'file' = f.type.startsWith('image') ? 'image' : f.type.startsWith('video') ? 'video' : 'file';
      const att = { url: base64, base64, type: fileType, name: f.name };
      setChatAttachment(att);
      setLastUploadedReference(base64);
      toast.success(`📎 Attached "${f.name}"!`);
    } catch (err) {
      toast.error('Failed to attach file');
    }
    if (e.target) e.target.value = '';
  };

  // ── Multi-Sample Voice Clone States ─────────────────────
  const [showVoiceCloneModal, setShowVoiceCloneModal] = useState(false);
  const [uploadedVoiceSamples, setUploadedVoiceSamples] = useState<Array<{ name: string; size: string; type: string; base64: string }>>([]);
  const [isCloningVoice, setIsCloningVoice] = useState(false);

  const handleMultipleFilesSelected = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    toast.loading(`Processing ${fileArray.length} audio/video sample(s)...`, { id: 'sample-proc' });

    const newSamples: Array<{ name: string; size: string; type: string; base64: string }> = [];

    for (const f of fileArray) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
        const sizeMb = (f.size / (1024 * 1024)).toFixed(2) + ' MB';
        newSamples.push({
          name: f.name,
          size: sizeMb,
          type: f.type.startsWith('video') ? 'video' : 'audio',
          base64
        });
      } catch (err) {
        console.warn(`Failed to read file ${f.name}`);
      }
    }

    setUploadedVoiceSamples(prev => [...prev, ...newSamples]);
    toast.success(`Added ${newSamples.length} voice sample(s)!`, { id: 'sample-proc' });
  };

  const handleExecuteMultiSampleClone = async () => {
    if (uploadedVoiceSamples.length === 0) return;
    setIsCloningVoice(true);
    toast.loading(`Cloning high-fidelity voice using ${uploadedVoiceSamples.length} audio/video sample(s)...`, { id: 'multi-clone' });

    try {
      const references = uploadedVoiceSamples.map(s => s.base64);
      const updated = {
        ...activePersona,
        voiceReferences: references,
        voiceSampleUrl: references[0],
        voiceFile: references[0],
        voiceEngine: 'elevenlabs'
      };

      await api.personas.update(updated);
      toast.success(`🎉 Voice cloned with ${uploadedVoiceSamples.length} sample(s) for ${activePersona.name}!`, { id: 'multi-clone' });
      setShowVoiceCloneModal(false);
    } catch (err: any) {
      console.error('[MultiVoice Clone Error]:', err);
      toast.error('Voice clone failed: ' + (err.message || 'Unknown error'), { id: 'multi-clone' });
    } finally {
      setIsCloningVoice(false);
    }
  };

  // ── Voice Call States & Refs ──────────────────────────────
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'speaking' | 'listening' | 'disconnected'>('disconnected');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [callTranscript, setCallTranscript] = useState<Array<{ id: string; role: 'user' | 'persona'; type?: 'text' | 'image' | 'video' | 'loading' | 'error'; content: string; prompt?: string }>>([]);
  const [activeCallMedia, setActiveCallMedia] = useState<{ type: 'image' | 'video'; url: string; prompt?: string } | null>(null);
  const [fullScreenModalMedia, setFullScreenModalMedia] = useState<{ type: 'image' | 'video'; url: string; prompt?: string } | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; prompt?: string } | null>(null);

  const handleUpdateImageInChat = (oldUrl: string, newUrl: string) => {
    setMessages(prev => prev.map(m => (m.type === 'image' && m.content === oldUrl) ? { ...m, content: newUrl } : m));
    if (activeCallMedia?.type === 'image' && activeCallMedia.url === oldUrl) {
      setActiveCallMedia({ ...activeCallMedia, url: newUrl });
    }
  };

  // ── Relationship & Mood State ─────────────────────────────
  const [relationshipState, setRelationshipState] = useState<RelationshipState>(() => {
    try {
      const raw = localStorage.getItem(`persona_relationship_${propActivePersona.id}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      affinityScore: 28,
      stage: 'partner',
      currentMood: 'playful',
      totalInteractions: 6,
      unlockedPerks: ['Standard chat banter', 'Playful teasing', 'Duo photoshoots']
    };
  });

  const updateRelationship = (updated: RelationshipState) => {
    setRelationshipState(updated);
    try {
      localStorage.setItem(`persona_relationship_${selectedPersonaId}`, JSON.stringify(updated));
    } catch {}
  };

  // ── Talking Head Video & Voice Note Handlers ──────────────
  const handleGenerateTalkingVideo = async (imageMsg: ChatMessage) => {
    if (!imageMsg.content) return;
    toast.loading('Generating talking video with realistic lip-sync...', { id: 'talking-video' });
    const loadingId = uid();
    addMessage({ role: 'persona', type: 'loading', content: `Creating talking video with ${activePersona.name}...` });
    try {
      const res = await fetch('/api/generate-talking-head', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageMsg.content,
          persona: activePersona,
          prompt: `cinematic talking video portrait of ${activePersona.name}, speaking expressively with subtle head movements and soft smile, looking at camera`,
        })
      });
      const data = await res.json();
      if (data.videoUrl) {
        toast.success('🎉 Talking video created!', { id: 'talking-video' });
        replaceMessage(loadingId, {
          type: 'video',
          content: data.videoUrl,
          prompt: data.promptUsed,
        });
      } else {
        throw new Error(data.error || 'Video generation failed');
      }
    } catch (e: any) {
      toast.error('Talking video generation failed: ' + (e?.message || 'Error'), { id: 'talking-video' });
      replaceMessage(loadingId, { type: 'error', content: 'Could not generate talking video clip.' });
    }
  };

  const handleSendVoiceNoteRequest = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    const loadingId = uid();
    addMessage({ role: 'persona', type: 'loading', content: `Recording voice note for you...` });
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activePersona,
          userMessage: 'Send me an intimate, playful, or teasing voice note right now',
          priorChatHistory: messages.slice(-10),
          creatorProfile: getCreatorProfile(),
          relationshipState,
        })
      });
      const data = await res.json();
      if (data.relationshipState) {
        updateRelationship(data.relationshipState);
      }
      const spokenText = data.reply || `Hey ${getStoredUserName()}... was just thinking about you.`;
      
      const vnRes = await fetch('/api/generate-voice-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: spokenText,
          persona: activePersona,
        })
      });
      const vnData = await vnRes.json();
      if (vnData.audioUrl) {
        replaceMessage(loadingId, {
          type: 'voice_note',
          content: spokenText,
          audioUrl: vnData.audioUrl,
          duration: vnData.duration,
          transcript: spokenText,
        });
      } else {
        replaceMessage(loadingId, { type: 'text', content: spokenText });
      }
    } catch (e) {
      replaceMessage(loadingId, { type: 'error', content: 'Could not record voice note.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const [callInput, setCallInput] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeCallAbortControllerRef = useRef<AbortController | null>(null);
  const callTimerRef = useRef<any>(null);
  const callRecRef = useRef<any>(null);
  const isAgentSpeakingRef = useRef<boolean>(false);
  const voiceCallBusyRef = useRef<boolean>(false);
  const currentPersonaSpeechRef = useRef<string>('');
  const isCallActiveRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const isStartingRecRef = useRef<boolean>(false);
  const lastRestartTimeRef = useRef<number>(0);
  const restartCountRef = useRef<number>(0);
  const recognitionStartIndexRef = useRef<number>(0);

  const vadStreamRef = useRef<MediaStream | null>(null);
  const vadAudioCtxRef = useRef<AudioContext | null>(null);
  const vadAnimFrameRef = useRef<number | null>(null);
  const personaSpeakingStartTimeRef = useRef<number>(0);

  // ── Adaptive Acoustic Echo-Cancelled VAD Interruption Monitor ───
  const startVadInterruptionMonitor = async () => {
    if (vadAudioCtxRef.current || !isCallActiveRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      vadStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      vadAudioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.20;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let sustainedSpeechFrames = 0;
      let dynamicNoiseFloor = 0.08;

      const checkAudioEnergy = () => {
        if (!isCallActiveRef.current || !vadAudioCtxRef.current) return;

        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        // Focus on primary human vocal speech frequencies (180Hz - 3200Hz)
        const minBin = Math.floor((180 / (ctx.sampleRate / 2)) * buffer.length);
        const maxBin = Math.min(buffer.length - 1, Math.floor((3200 / (ctx.sampleRate / 2)) * buffer.length));
        let binCount = 0;

        for (let i = minBin; i <= maxBin; i++) {
          sum += buffer[i];
          binCount++;
        }

        const avgEnergy = binCount > 0 ? (sum / binCount) / 255 : 0;

        // If the persona is actively speaking, detect user vocal barge-in immediately
        if (isAgentSpeakingRef.current) {
          // Adapt smoothly to ambient room noise
          dynamicNoiseFloor = dynamicNoiseFloor * 0.92 + avgEnergy * 0.08;

          // Sensitive vocal threshold with hardware echoCancellation
          const speechThreshold = Math.max(0.11, dynamicNoiseFloor + 0.06);
          const timeSinceStart = Date.now() - personaSpeakingStartTimeRef.current;

          // After minimal 200ms startup buffer, detect user voice within ~60ms (4 frames at 60fps)
          if (timeSinceStart > 200 && avgEnergy > speechThreshold) {
            sustainedSpeechFrames++;
            if (sustainedSpeechFrames >= 4) {
              console.log('[Vocal Barge-In] 🎙️ User voice detected over speaker! Instantly halting persona...');
              sustainedSpeechFrames = 0;
              interruptPersona();
            }
          } else {
            sustainedSpeechFrames = Math.max(0, sustainedSpeechFrames - 1);
          }
        } else {
          sustainedSpeechFrames = 0;
          dynamicNoiseFloor = Math.min(dynamicNoiseFloor, avgEnergy);
        }

        vadAnimFrameRef.current = requestAnimationFrame(checkAudioEnergy);
      };

      vadAnimFrameRef.current = requestAnimationFrame(checkAudioEnergy);
    } catch (err) {
      console.warn('[VAD] Could not initialize voice interruption monitor:', err);
    }
  };

  const stopVadInterruptionMonitor = () => {
    if (vadAnimFrameRef.current) {
      cancelAnimationFrame(vadAnimFrameRef.current);
      vadAnimFrameRef.current = null;
    }
    if (vadAudioCtxRef.current) {
      try { vadAudioCtxRef.current.close(); } catch {}
      vadAudioCtxRef.current = null;
    }
    if (vadStreamRef.current) {
      try {
        vadStreamRef.current.getTracks().forEach(t => t.stop());
      } catch {}
      vadStreamRef.current = null;
    }
  };

  const interruptPersona = useCallback(() => {
    console.log('[Interrupt] 🛑 Halting persona audio playback and cancelling in-flight request...');
    if (activeCallAbortControllerRef.current) {
      try { activeCallAbortControllerRef.current.abort(); } catch {}
      activeCallAbortControllerRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      } catch {}
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    currentPersonaSpeechRef.current = '';
    isAgentSpeakingRef.current = false;
    voiceCallBusyRef.current = false;
    setLiveUserSpeech('');
    if (isCallActiveRef.current) {
      setCallStatus('listening');
      restartSpeechRecognition();
    }
  }, []);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  const stopSpeechRecognition = () => {
    const rec = callRecRef.current;
    callRecRef.current = null;
    if (rec) {
      try {
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.abort();
      } catch {}
    }
  };

  const [liveUserSpeech, setLiveUserSpeech] = useState<string>('');

  const restartSpeechRecognition = () => {
    if (isMutedRef.current || !isCallActiveRef.current) return;
    if (callRecRef.current || isStartingRecRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    isStartingRecRef.current = true;

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.maxAlternatives = 1;

      let interimSilenceTimer: any = null;

      rec.onresult = (e: any) => {
        if (callRecRef.current !== rec || !isCallActiveRef.current) return;

        // Build entire utterance across all results from index 0
        let fullTranscript = '';
        let hasFinalResult = false;
        for (let i = 0; i < e.results.length; i++) {
          const res = e.results[i];
          if (res && res[0] && res[0].transcript) {
            const chunk = res[0].transcript.trim();
            if (chunk) {
              fullTranscript += (fullTranscript ? ' ' : '') + chunk;
            }
            if (res.isFinal) hasFinalResult = true;
          }
        }

        const trimmed = fullTranscript.trim();
        if (!trimmed || trimmed.length < 1) return;

        // Instant Vocal Barge-in: If the persona is speaking, immediately halt speech on any incoming user voice
        if (isAgentSpeakingRef.current) {
          console.log('[Vocal Barge-In] ⚡ Spoken words recognized while persona was speaking! Halting playback immediately...');
          if (audioRef.current) {
            try {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              audioRef.current.src = '';
            } catch {}
            audioRef.current = null;
          }
          if (activeCallAbortControllerRef.current) {
            try { activeCallAbortControllerRef.current.abort(); } catch {}
            activeCallAbortControllerRef.current = null;
          }
          isAgentSpeakingRef.current = false;
          voiceCallBusyRef.current = false;
          setCallStatus('listening');
        }

        setLiveUserSpeech(trimmed);

        // Reset silence timer on any newly recognized speech chunk
        if (interimSilenceTimer) clearTimeout(interimSilenceTimer);

        // Intelligent Conversational Pause Buffer (Generous breathing room so user is never interrupted):
        const lastWord = trimmed.split(/\s+/).pop()?.toLowerCase().replace(/[^a-z]/g, '') || '';
        const isTrailingThought = /^(and|or|but|so|because|like|um|uh|then|when|if|that|which|to|with|for|about|my|your|the|a|i|we|you|he|she|it|they|got|had|was|is)$/i.test(lastWord);

        let pauseDelay = 2200;
        if (isTrailingThought) {
          pauseDelay = 3000;
        } else if (hasFinalResult && /[.?!]$/.test(trimmed)) {
          pauseDelay = 1500;
        }

        interimSilenceTimer = setTimeout(() => {
          if (trimmed && trimmed.length >= 2 && isCallActiveRef.current) {
            console.log('[Call Voice] 🎤 Captured complete user utterance:', trimmed);
            setLiveUserSpeech('');
            handleSendCallMessage(correctSpeechPhonetics(trimmed, activePersona?.name));
          }
        }, pauseDelay);
      };

      rec.onerror = (e: any) => {
        if (callRecRef.current !== rec) return;
        isStartingRecRef.current = false;
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          callRecRef.current = null;
          setTimeout(() => {
            if (isCallActiveRef.current && !isMutedRef.current) {
              restartSpeechRecognition();
            }
          }, 200);
        }
      };

      rec.onend = () => {
        isStartingRecRef.current = false;
        if (callRecRef.current === rec) {
          callRecRef.current = null;
        }
        if (isCallActiveRef.current && !isMutedRef.current) {
          setTimeout(() => {
            if (isCallActiveRef.current && !isMutedRef.current) {
              restartSpeechRecognition();
            }
          }, 100);
        }
      };

      rec.start();
      callRecRef.current = rec;
      isStartingRecRef.current = false;
      if (!isAgentSpeakingRef.current) {
        setCallStatus('listening');
      }
    } catch (err) {
      isStartingRecRef.current = false;
      setTimeout(() => {
        if (isCallActiveRef.current && !isMutedRef.current) {
          restartSpeechRecognition();
        }
      }, 200);
    }
  };

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (isMuted) {
      stopSpeechRecognition();
    } else if (isCallActiveRef.current) {
      restartSpeechRecognition();
    }
  }, [isMuted]);

  // Global keydown for instant Spacebar interruption during active call
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isCallActive) return;
      if (e.code === 'Space' && e.target === document.body && callStatus === 'speaking') {
        e.preventDefault();
        console.log('[Spacebar] Interrupted persona playback');
        interruptPersona();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isCallActive, callStatus, interruptPersona]);

  // Quick space key on window
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isCallActive && isAgentSpeakingRef.current) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        interruptPersona();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCallActive, interruptPersona]);

  // ── Auto-Recovery Watchdog for Live Voice Calls ──────────
  useEffect(() => {
    if (!isCallActive) return;
    const watchdog = setInterval(() => {
      // If speech recognition died while we are in listening mode, restart it
      if (isCallActiveRef.current && !isMutedRef.current && !callRecRef.current && !isStartingRecRef.current && !isAgentSpeakingRef.current && !voiceCallBusyRef.current) {
        restartSpeechRecognition();
      }
      // If agent has been "speaking" for >60s without ending, force recover
      if (isAgentSpeakingRef.current && (Date.now() - personaSpeakingStartTimeRef.current > 60000)) {
        console.warn('[Voice Watchdog] ⏰ Agent stuck >60s. Force recovering...');
        interruptPersona();
      }
    }, 1500);
    return () => clearInterval(watchdog);
  }, [isCallActive, interruptPersona]);

  // Format timer duration (e.g. 00:05)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── Web Speech Fallback Engine (Robotic Voice Suppressed) ──
  const speakWithWebSpeech = (text: string, onStart?: () => void, onEnd?: () => void) => {
    console.log('[Web Speech] Robotic synthesis suppressed to preserve cloned voice identity');
    onEnd?.();
  };

  // ── Play TTS Helper ─────────────────────────────────────
  const playTTS = async (text: string, onStart?: () => void) => {
    currentPersonaSpeechRef.current = text.toLowerCase().trim();
    if (!speakerOn) {
      isAgentSpeakingRef.current = false;
      voiceCallBusyRef.current = false;
      onStart?.();
      setCallStatus('listening');
      restartSpeechRecognition();
      return;
    }
    setCallStatus('speaking');
    isAgentSpeakingRef.current = true;
    personaSpeakingStartTimeRef.current = Date.now();
    // Stop microphone recognition while persona is speaking to eliminate speaker-mic feedback loop
    stopSpeechRecognition();

    const onPlaybackComplete = () => {
      isAgentSpeakingRef.current = false;
      voiceCallBusyRef.current = false;
      currentPersonaSpeechRef.current = '';
      if (isCallActiveRef.current) {
        setCallStatus('listening');
        setTimeout(() => {
          if (isCallActiveRef.current && !isAgentSpeakingRef.current) {
            restartSpeechRecognition();
          }
        }, 150);
      }
    };

    try {
      const { voiceId: targetVoiceId, voiceReference: targetVoiceRef } = getActivePersonaVoice(activePersona);
      const controller = new AbortController();
      activeCallAbortControllerRef.current = controller;

      const ttsRes = await authFetch('/api/agent/voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activePersona,
          directTTS: text,
          voiceId: targetVoiceId,
          voiceReference: targetVoiceRef,
          voiceModel: selectedVoiceEngine,
          ttsModel: selectedVoiceEngine,
        }),
        signal: controller.signal,
      });
      const ttsData = await ttsRes.json().catch(() => ({}));
      const audioUrl = ttsData.audioUrl;
      
      if (!audioUrl || !isCallActiveRef.current) {
        onPlaybackComplete();
        return;
      }

      // Create a fresh Audio element for each playback to avoid stale state
      const audio = new Audio();
      audioRef.current = audio;
      
      audio.src = audioUrl;
      audio.volume = 1.0;

      audio.onplay = () => {
        if (!isCallActiveRef.current) {
          audio.pause();
          audio.src = '';
          return;
        }
        stopSpeechRecognition();
        personaSpeakingStartTimeRef.current = Date.now();
        onStart?.();
      };
      
      audio.onended = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        onPlaybackComplete();
      };
      
      audio.onerror = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        onPlaybackComplete();
      };
      
      if (isCallActiveRef.current) {
        try {
          await audio.play();
        } catch (playErr: any) {
          if (playErr?.name !== 'AbortError') {
            console.warn('[Audio Play Error]:', playErr);
          }
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
        }
      } else {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        onPlaybackComplete();
      }
    } catch (err: any) {
      console.warn("TTS fetch failed, falling back to Web Speech Synthesis", err);
      speakWithWebSpeech(text, onStart, onPlaybackComplete);
    }
  };

  // Send message inside Live Call
  const handleSendCallMessage = async (overrideText?: string) => {
    const text = (overrideText || callInput).trim();
    if (!text || !isCallActiveRef.current) return;
    if (voiceCallBusyRef.current) {
      console.log('[Call Voice] ⏳ Already processing, ignoring duplicate input');
      return;
    }

    voiceCallBusyRef.current = true;
    isAgentSpeakingRef.current = true;
    personaSpeakingStartTimeRef.current = Date.now();
    restartSpeechRecognition();

    const watchdogTimer = setTimeout(() => {
      if (voiceCallBusyRef.current) {
        console.warn('[Call Watchdog] ⏰ Request timed out, auto-recovering...');
        isAgentSpeakingRef.current = false;
        voiceCallBusyRef.current = false;
        if (isCallActiveRef.current) {
          setCallStatus('listening');
          restartSpeechRecognition();
        }
      }
    }, 25000);

    // Stop any currently playing persona audio
    if (audioRef.current) {
      try { audioRef.current.pause(); audioRef.current.src = ''; } catch {}
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    
    setCallInput('');

    const sentCallAttachment = chatAttachment;
    setChatAttachment(null);
    
    const userMsg: any = { id: uid(), role: 'user' as const, type: 'text' as const, content: text };
    if (sentCallAttachment) {
      userMsg.attachment = sentCallAttachment;
    }
    const updatedHistory = [...callTranscript.filter(t => t.content.indexOf('Calling') !== 0), userMsg];
    setCallTranscript(updatedHistory);
    
    setCallStatus('speaking');

    try {
      const priorHistory = loadHistory(activePersona.id);
      const personaMemories = loadPersonaMemories(activePersona.id);
      const creator = getCreatorProfile();

      const controller = new AbortController();
      activeCallAbortControllerRef.current = controller;

      // Single-hop Unified Real-Time Voice Endpoint (LLM generation + ElevenLabs Turbo in ONE parallel round-trip)
      const res = await authFetch('/api/agent/voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activePersona,
          creatorProfile: creator,
          userName: creator.name || getStoredUserName(),
          attachedImage: sentCallAttachment?.type === 'image' ? sentCallAttachment.base64 : undefined,
          messages: updatedHistory.slice(-15).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.type === 'image' 
              ? `[Persona generated and sent a photo of herself: "${m.prompt || 'photo requested by user'}". User is looking at the photo on screen.]` 
              : m.type === 'video'
              ? `[Persona generated and sent a video clip to the user's screen.]`
              : m.content
          })),
          priorChatHistory: priorHistory.slice(-40).map(m => ({ role: m.role === 'user' ? 'user' : 'model', content: m.content })),
          memories: personaMemories,
          voiceId: getActivePersonaVoice(activePersona).voiceId,
          voiceReference: getActivePersonaVoice(activePersona).voiceReference,
          voiceModel: selectedVoiceEngine,
          ttsModel: selectedVoiceEngine,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed call dialogue response');
      
      clearTimeout(watchdogTimer);

      // If call was ended while we were waiting for network response, do NOT play audio
      if (!isCallActiveRef.current) {
        voiceCallBusyRef.current = false;
        isAgentSpeakingRef.current = false;
        return;
      }

      let reply = data.text || data.reply || "Hey, I'm right here with you!";
      if (/^(?:generating|creating|rendering|loading|producing|processing|taking)\s+(?:image|photo|video|picture|visual|content|look|selfie)/i.test(reply) || /^take a look at this (?:image|photo|picture)/i.test(reply)) {
        reply = `Let me take that for you right now, babe...`;
      }
      const personaMsg = { id: uid(), role: 'persona' as const, type: 'text' as const, content: reply };
      
      // Auto-extract and save user memory if user introduced new facts
      if (text.length > 5 && /\b(my name is|i live in|i love|i like|i work as|i am a|remember that|i want to|my goal is)\b/i.test(text)) {
        savePersonaMemory(activePersona.id, text);
      }
      
      setMessages(prev => [...prev, 
        { id: uid(), role: 'user', type: 'text', content: text, timestamp: new Date() },
        { id: uid(), role: 'persona', type: 'text', content: reply, timestamp: new Date() }
      ]);

      const isVoiceImageIntent = data.action?.type === 'image' || 
        detectIntent(text) === 'image' || 
        (/\b(?:photo|pic|picture|selfie|image)\b/i.test(text) && /\b(?:take|send|snap|show|generate|make|see|want|wearing|exposed|nude|naked|bedroom|bed)\b/i.test(text)) ||
        /\b(?:sending it|try again right now.*sending it|sending you a (?:photo|selfie|pic|image)|sending a (?:photo|selfie|pic|image)|taking a (?:photo|selfie)|take a quick (?:photo|selfie)|here is the (?:photo|selfie)|snap that for you|take that for you|snapping (?:this|that|a photo)|let me take|give me one second.*(?:snap|take|photo|pic)|here you go.*(?:pic|photo))\b/i.test(reply);

      const isVoiceVideoIntent = !isVoiceImageIntent && (data.action?.type === 'video' || detectIntent(text) === 'video' || /\b(?:sending you a video|recorded a video|sending the video)\b/i.test(reply));

      if (isVoiceImageIntent) {
        const loadingMsgId = uid();
        setCallTranscript(prev => [...prev, personaMsg, { id: loadingMsgId, role: 'persona', type: 'loading', content: '' }]);
        const visualPrompt = data.action?.prompt || text || `${activePersona.name}, ${activePersona.niche}, glamorous photorealistic portrait, intimate, natural lighting, ultra high resolution 8k`;
        
        const isDuoShoot = /\b(with me|with (?:dr\.?\s*h|alex|chris|creator)|duo|together|both of us|us at|with you)\b/i.test(visualPrompt) || /\b(with me|with (?:dr\.?\s*h|alex|chris|creator)|duo|together|both of us|us at)\b/i.test(text);
        const isExplicitNude = /\b(naked|nude|topless|unclothed|bare|boobs|tits|breasts|nipples|exposed|sensual|erotic|no clothes|without clothes|undressed|pussy|ass)\b/i.test(visualPrompt) || /\b(naked|nude|topless|unclothed|bare|boobs|tits|breasts|nipples|exposed|sensual|erotic|no clothes|without clothes|undressed|pussy|ass)\b/i.test(text);
        const extraImages: string[] = [];
        if (sentCallAttachment?.type === 'image') extraImages.push(sentCallAttachment.base64);
        else if (lastUploadedReference) extraImages.push(lastUploadedReference);
        if (isDuoShoot && creator?.primaryPhoto && !extraImages.includes(creator.primaryPhoto)) {
          extraImages.push(creator.primaryPhoto);
        }

        // Primary persona reference photo for exact facial identity locking
        const personaPrimaryRef = activePersona.referenceImage || activePersona.avatar || activePersona.alternateReferenceImage;

        // Generate high-fidelity photorealistic image using ByteDance Seedream 5.0 Pro
        generateImage({
          persona: activePersona,
          prompt: visualPrompt,
          modelId: 'wavespeed:bytedance/seedream-v5.0-pro',
          aspectRatio: '9:16',
          isChatContext: true,
          chatPrompt: text, // preserve exact spoken request with user specifics
          allowNsfw: true,
          referenceImage: personaPrimaryRef,
          additionalImages: extraImages.length > 0 ? extraImages : undefined,
          creatorProfile: isDuoShoot ? creator : undefined,
        } as any).then(result => {
          const imgUrl = Array.isArray(result) ? result[0].imageUrl : result.imageUrl;
          setActiveCallMedia({ type: 'image', url: imgUrl, prompt: visualPrompt });
          setCallTranscript(prev => prev.map(m => m.id === loadingMsgId ? { ...m, type: 'image', content: imgUrl, prompt: visualPrompt } : m));
          setMessages(prev => [...prev, { id: uid(), role: 'persona', type: 'image', content: imgUrl, timestamp: new Date() }]);
        }).catch(err => {
          console.warn('[Voice Call Image Generation Error]:', err);
          setCallTranscript(prev => prev.map(m => m.id === loadingMsgId ? { ...m, type: 'error', content: err?.message || 'Failed to generate photo' } : m));
        });
      } else if (isVoiceVideoIntent) {
        const loadingMsgId = uid();
        setCallTranscript(prev => [...prev, personaMsg, { id: loadingMsgId, role: 'persona', type: 'loading', content: '' }]);
        const personaPhoto = activePersona.referenceImage || activePersona.avatar || activePersona.alternateReferenceImage;
        const videoPrompt = data.action?.prompt || text || `${activePersona.name}, ${activePersona.niche}, cinematic motion video clip, 4k uhd`;
        generateVideo(videoPrompt, selectedVideoModelId, personaPhoto || undefined).then(result => {
          setActiveCallMedia({ type: 'video', url: result.videoUrl, prompt: videoPrompt });
          setCallTranscript(prev => prev.map(m => m.id === loadingMsgId ? { ...m, type: 'video', content: result.videoUrl, prompt: videoPrompt } : m));
          setMessages(prev => [...prev, { id: uid(), role: 'persona', type: 'video', content: result.videoUrl, timestamp: new Date() }]);
        }).catch(err => {
          setCallTranscript(prev => prev.map(m => m.id === loadingMsgId ? { ...m, type: 'error', content: err?.message || 'Failed to generate video' } : m));
        });
      } else {
        setCallTranscript(prev => [...prev, personaMsg]);
      }
      
      if (data.audioUrl && isCallActiveRef.current) {
        currentPersonaSpeechRef.current = reply.toLowerCase().trim();
        setCallStatus('speaking');
        isAgentSpeakingRef.current = true;
        voiceCallBusyRef.current = false;
        personaSpeakingStartTimeRef.current = Date.now();
        
        // Ensure recognition is actively listening for vocal barge-in
        if (!isMutedRef.current) {
          restartSpeechRecognition();
        }
        
        // Stop any currently playing audio instance to prevent overlapping voices
        const existingAudio = audioRef.current as HTMLAudioElement | null;
        if (existingAudio) {
          try {
            existingAudio.pause();
            existingAudio.currentTime = 0;
            existingAudio.src = '';
          } catch {}
          audioRef.current = null;
        }

        const audio = new Audio();
        audioRef.current = audio;
        audio.src = data.audioUrl;
        audio.volume = 1.0;

        const onCallAudioEnded = () => {
          if (audioRef.current === audio) audioRef.current = null;
          setTimeout(() => {
            if (!isCallActiveRef.current) return;
            isAgentSpeakingRef.current = false;
            voiceCallBusyRef.current = false;
            currentPersonaSpeechRef.current = '';
            setCallStatus('listening');
            restartSpeechRecognition();
          }, 120);
        };

        audio.onended = onCallAudioEnded;

        audio.onerror = () => {
          if (audioRef.current === audio) audioRef.current = null;
          onCallAudioEnded();
        };
        
        setCallTranscript(prev => {
          if (prev.some(m => m.id === personaMsg.id)) return prev;
          return [...prev, personaMsg];
        });
        
        if (isCallActiveRef.current) {
          try {
            await audio.play();
          } catch (pErr: any) {
            if (pErr?.name !== 'AbortError') {
              console.warn('[Audio Play Error]:', pErr);
            }
            if (audioRef.current === audio) audioRef.current = null;
            onCallAudioEnded();
          }
        }
      } else if (isCallActiveRef.current) {
        setCallTranscript(prev => {
          if (prev.some(m => m.id === personaMsg.id)) return prev;
          return [...prev, personaMsg];
        });
        await playTTS(reply, () => {
          if (!isCallActiveRef.current) return;
          setCallStatus('speaking');
          isAgentSpeakingRef.current = true;
        });
      }
    } catch (err) {
      clearTimeout(watchdogTimer);
      console.error('[Call Voice Network Error, recovering]:', err);
      isAgentSpeakingRef.current = false;
      voiceCallBusyRef.current = false;
      if (isCallActiveRef.current) {
        setCallStatus('listening');
        if (!callRecRef.current && !isMutedRef.current) {
          restartSpeechRecognition();
        }
      }
    }
  };

  const lastCallEndedAtRef = useRef<number>(0);

  // Dynamic context-aware greeting generator that picks up from last conversation
  const fetchDynamicGreeting = useCallback(async (persona: Persona, mode: 'voice' | 'chat'): Promise<string> => {
    const creator = getCreatorProfile();
    const cName = creator?.name || 'Dr. H';
    const hour = new Date().getHours();
    const timeWord = hour < 12 ? 'morning' : (hour < 18 ? 'afternoon' : 'evening');
    const isAdultOrFlirty = (persona.niche || '').toLowerCase().includes('adult') || 
                            (persona.tone || '').toLowerCase().includes('seductive') || 
                            (persona.tone || '').toLowerCase().includes('flirty') ||
                            (persona.tone || '').toLowerCase().includes('playful');

    const timeSinceLastSec = lastCallEndedAtRef.current > 0 ? Math.floor((Date.now() - lastCallEndedAtRef.current) / 1000) : 999999;
    const isRecentContinuation = timeSinceLastSec < 600;

    const continuationPool = [
      `Hey, we got disconnected! Where were we?`,
      `Hey babe, you're back. What was that you were saying?`,
      `Hey! Did the call drop? I'm right here.`,
      `Back so soon? Tell me what's on your mind right now.`,
      `Hey handsome, you're back. Let's pick right back up!`
    ];

    const intimatePools = [
      `Hey ${cName}... good ${timeWord}. Was just hoping you'd call. Still thinking about earlier?`,
      `Mmm, hey you. Still thinking about earlier, or did you have something new on your mind?`,
      `Look who it is... what kind of trouble are we getting into today, ${cName}?`,
      `Hey ${cName}! Perfect timing as always. Tell me what's on your mind.`,
      `Hey you... was wondering when I'd hear from you. What are we doing today?`,
      `Hey ${cName}! Back for more? Let's make today interesting.`,
      `Mmm, good ${timeWord} ${cName}. I love when you check in on me.`,
      `Hey you! What have you been up to since we last talked?`
    ];

    const luxuryPools = [
      `Good ${timeWord}, ${cName}. What's on our agenda today?`,
      `Hey ${cName}. Always good to connect with you. What are we creating next?`,
      `Hey there. Ready whenever you are — what's the vision for today?`,
      `Good to see you, ${cName}. Let's make something exceptional today.`,
      `Hey ${cName}! Perfect timing. Let's pick up where we left off.`
    ];

    const fallbackPool = isRecentContinuation ? continuationPool : (isAdultOrFlirty ? intimatePools : luxuryPools);
    const fallbackGreeting = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];

    try {
      const priorHistory = loadHistory(persona.id);
      const memories = loadPersonaMemories(persona.id);
      const res = await fetch('/api/persona-greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          creatorProfile: creator,
          priorChatHistory: priorHistory.slice(-8),
          memories,
          mode,
          timeSinceLastInteractionSeconds: timeSinceLastSec,
        }),
      });
      if (res.ok) {
        const d = await res.json() as { greeting?: string };
        if (d?.greeting && d.greeting.length > 5) {
          return d.greeting;
        }
      }
    } catch (e) {
      console.warn('[Dynamic Greeting] Using contextual fallback greeting:', e);
    }
    return fallbackGreeting;
  }, []);

  // Start Hands-Free Live Call with Interruption support
  const handleStartCall = async () => {
    setIsCallActive(true);
    isCallActiveRef.current = true;
    setCallStatus('connecting');
    setCallDuration(0);
    isAgentSpeakingRef.current = true;
    voiceCallBusyRef.current = true;
    
    startVadInterruptionMonitor();

    // Unlock HTML5 audio context directly inside user click gesture
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.volume = 1.0;
      audioRef.current.muted = false;
      audioRef.current.play().catch(() => {});
    } catch {}

    setCallTranscript([
      { id: uid(), role: 'persona', content: `Calling ${activePersona.name}...` }
    ]);
    
    setTimeout(async () => {
      if (!isCallActiveRef.current) return;
      setCallStatus('connected');
      
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Fetch dynamic context-aware greeting picking up from last conversation
      const greeting = await fetchDynamicGreeting(activePersona, 'voice');

      // Synchronize greeting text bubble to appear at the EXACT instant audio starts playing
      if (isCallActiveRef.current) {
        await playTTS(greeting, () => {
          if (!isCallActiveRef.current) return;
          setCallTranscript([
            { id: uid(), role: 'persona', content: greeting }
          ]);
        });
      }
    }, 50);
  };

  // End Call
  const handleEndCall = useCallback(() => {
    setIsCallActive(false);
    isCallActiveRef.current = false;
    setCallStatus('disconnected');
    isAgentSpeakingRef.current = false;
    voiceCallBusyRef.current = false;
    currentPersonaSpeechRef.current = '';
    lastCallEndedAtRef.current = Date.now();
    
    // Save history immediately
    setMessages(currentMsgs => {
      if (currentMsgs.length > 1) {
        saveHistory(activePersona.id, currentMsgs);
      }
      return currentMsgs;
    });

    stopVadInterruptionMonitor();

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    stopSpeechRecognition();
    
    // Stop all audio playback immediately
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      } catch {}
      audioRef.current = null;
    }

    // Cancel browser speech synthesis immediately
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }, [activePersona.id]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      isCallActiveRef.current = false;
      if (audioRef.current) {
        try { audioRef.current.pause(); audioRef.current.src = ''; } catch {}
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
    };
  }, []);

  const [editModels, setEditModels] = useState<ModelInfo[]>([]);
  const [videoModels, setVideoModels] = useState<ModelInfo[]>([]);
  const [selectedEditModelId, setSelectedEditModelId] = useState('');
  const [selectedVideoModelId, setSelectedVideoModelId] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callTranscriptEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isCallActive) {
      callTranscriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [callTranscript, isCallActive]);

  const selectedEditModel = editModels.find(m => m.id === selectedEditModelId);
  const selectedVideoModel = videoModels.find(m => m.id === selectedVideoModelId);

  useEffect(() => {
    fetchAllModelTypes().then(({ editModels: em, videoModels: vm }) => {
      setEditModels(em);
      setVideoModels(vm);
      if (em.length > 0) {
        // Priority 1: ByteDance Seedream 5.0 Pro from Wavespeed (Specifically PRO, not Lite)
        const seedream5Pro = em.find(m => {
          const id = (m.id || '').toLowerCase();
          const name = (m.name || '').toLowerCase();
          return (id.includes('seedream-v5.0-pro') || id.includes('seedream-5.0-pro') || id.includes('seedream-5-pro') || name.includes('seedream 5.0 pro') || name.includes('seedream 5 pro')) && !id.includes('lite') && !name.includes('lite');
        }) || em.find(m => (m.id.includes('seedream-v5') || m.name.toLowerCase().includes('seedream 5')) && !m.id.includes('lite') && !m.name.toLowerCase().includes('lite')) || em[0];
        setSelectedEditModelId(seedream5Pro.id);
      }
          if (vm.length > 0) {
        // Priority 1: ByteDance Seedance 2.0 Mini (Wavespeed - Uncensored)
        const seedanceMini = vm.find(m => {
          const id = (m.id || '').toLowerCase();
          const name = (m.name || '').toLowerCase();
          return (id.includes('wavespeed') || m.provider?.toLowerCase().includes('wavespeed')) && 
            (id.includes('seedance-2-mini') || id.includes('seedance-2.0-mini') || id.includes('seedance-mini') || name.includes('seedance 2.0 mini') || name.includes('seedance 2 mini') || id.includes('seedance-2.0') || name.includes('seedance 2.0') || id.includes('seedance'));
        }) || vm.find(m => m.id.includes('seedance')) || vm.find(m => m.id.startsWith('wavespeed')) || vm[0];
        setSelectedVideoModelId(seedanceMini.id);
      }
      setModelsLoaded(true);
    }).catch(() => setModelsLoaded(true));
  }, []);


  const resetConversation = useCallback(async (persona: Persona) => {
    const greeting = await fetchDynamicGreeting(persona, 'chat');

    setMessages([{
      id: uid(),
      role: 'persona',
      type: 'text',
      content: greeting,
      timestamp: new Date(),
    }]);
    setGeneratedReplies([]);
    setReplyInput('');
  }, [fetchDynamicGreeting]);

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 1) saveHistory(selectedPersonaId, messages);
  }, [messages, selectedPersonaId]);

  useEffect(() => {
    // Load persisted history or reset when persona changes
    const history = loadHistory(selectedPersonaId);
    if (history.length > 0) {
      setMessages(history);
    } else {
      resetConversation(personas.find(p => p.id === selectedPersonaId) || propActivePersona);
    }
    setSavedMsgIds(new Set());

    try {
      const rRaw = localStorage.getItem(`persona_relationship_${selectedPersonaId}`);
      setRelationshipState(rRaw ? JSON.parse(rRaw) : {
        affinityScore: 28,
        stage: 'partner',
        currentMood: 'playful',
        totalInteractions: 6,
        unlockedPerks: ['Standard chat banter', 'Playful teasing', 'Duo photoshoots']
      });
    } catch {}
  }, [selectedPersonaId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSegment === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSegment]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>): string => {
    const id = uid();
    setMessages(prev => [...prev, { ...msg, id, timestamp: new Date() }]);
    return id;
  }, []);

  const replaceMessage = useCallback((id: string, update: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...update } : m));
  }, []);

  const activeAbortControllersRef = useRef<Record<string, AbortController>>({});

  const handleCancelGeneration = useCallback((msgId: string) => {
    if (activeAbortControllersRef.current[msgId]) {
      try {
        activeAbortControllersRef.current[msgId].abort();
      } catch {}
      delete activeAbortControllersRef.current[msgId];
    }
    setMessages(prev => prev.filter(m => m.id !== msgId));
    setIsGenerating(false);
    toast('Generation cancelled', { icon: '🛑', id: 'cancel-gen-' + msgId });
  }, []);

  // Save to Vault from chat
  const handleSaveToVault = async (msg: ChatMessage) => {
    if (savingMsgId === msg.id) return;
    setSavingMsgId(msg.id);
    try {
      const media = {
        id: `chat-${msg.id}`,
        url: msg.content,
        prompt: `Chat: ${activePersona.name}`,
        timestamp: msg.timestamp.getTime(),
        model: msg.type === 'video' ? selectedVideoModelId : selectedEditModelId,
        mediaType: msg.type as 'image' | 'video',
      };
      const updated = { ...activePersona, visualLibrary: [...(activePersona.visualLibrary || []), media] };
      await api.updatePersonaInVault(updated);
      await api.images.create(activePersona.id, media);
      setSavedMsgIds(prev => new Set(prev).add(msg.id));
      toast.success('Saved to Visual Library!');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingMsgId(null);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY(selectedPersonaId));
    resetConversation(activePersona);
    toast.success('Conversation cleared');
  };

  const getNoRefImageResponse = (type: 'image' | 'video'): string => {
    const tone = activePersona.tone.toLowerCase();
    if (tone.includes('luxury') || tone.includes('elite')) {
      return type === 'image'
        ? "I don't just send photos to anyone. Set up my profile properly first."
        : "My presence isn't captured that easily. Set up my reference image first.";
    }
    if (tone.includes('playful') || tone.includes('flirty')) {
      return type === 'image'
        ? "I'd love to share but you need to set up my reference image first! Go to my persona and generate one, then come back 📸"
        : "I wanna make a video for you but I need my reference image set up first! Quick — go set it up and come back 🎬";
    }
    return type === 'image'
      ? "I need my reference image set up before I can share photos. Head to my persona profile and generate one!"
      : "I need my reference image before I can make videos. Set that up in my persona profile first.";
  };

  async function handleSend() {
    const text = input.trim();
    if ((!text && !chatAttachment) || isGenerating) return;
    const effectiveText = text || (chatAttachment ? `[Shared ${chatAttachment.type}: ${chatAttachment.name}]` : '');
    setInput('');
    setIsGenerating(true);

    const sentAttachment = chatAttachment;
    setChatAttachment(null);

    const userMsgObj: any = { role: 'user', type: 'text', content: effectiveText };
    if (sentAttachment) {
      userMsgObj.attachment = sentAttachment;
    }
    addMessage(userMsgObj);

    // Save facts / user memories if mentioned
    if (effectiveText.length > 3 && /\b(my name is|i am|i live|i love|i work|remember that|my goal is|call me)\b/i.test(effectiveText)) {
      savePersonaMemory(activePersona.id, effectiveText);
    }

    const loadingId = addMessage({ role: 'persona', type: 'loading', content: '' });

    try {
      const personaPhoto = activePersona.referenceImage || activePersona.avatar || activePersona.alternateReferenceImage;
      const textMessages = messages.filter(m => m.type === 'text' || m.type === 'image');
      const personaMemories = loadPersonaMemories(activePersona.id);
      const priorHistory = loadHistory(activePersona.id);

      const creator = getCreatorProfile();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activePersona,
          creatorProfile: creator,
          userName: creator.name || getStoredUserName(),
          messages: textMessages.slice(-30).map(m => ({ 
            role: m.role, 
            type: m.type, 
            content: m.content,
            prompt: m.prompt 
          })),
          priorChatHistory: priorHistory.slice(-20).map(m => ({
            role: m.role,
            type: m.type,
            content: m.content,
            prompt: m.prompt
          })),
          memories: personaMemories,
          userMessage: effectiveText,
          voiceLlmModel,
          attachedImage: sentAttachment?.type === 'image' ? sentAttachment.base64 : undefined,
          relationshipState,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');

      if (data.relationshipState) {
        updateRelationship(data.relationshipState);
      }

      // Replace loading bubble with the persona's authentic, witty dialogue
      const replyText = data.reply || "Hey! I'm right here with you.";
      replaceMessage(loadingId, { type: 'text', content: replyText });

      // Determine if a photo, video, or voice note was requested or returned as an action:
      const explicitVisualKeywords = /\b(image|photo|pic|picture|selfie|pose|portrait|photoshoot|video|clip|recording)\b/i.test(effectiveText);
      const isExplicitVisualRequest = /\b(send|take|generate|show|give|snap|make|create|post|capture)\b/i.test(effectiveText) && explicitVisualKeywords;
      const isConversationalQuestion = !isExplicitVisualRequest && /(?:\b(?:why did you send|why are you sending|what is that picture|who is that in the photo|stop sending)\b)/i.test(effectiveText);
      
      const isVoiceNoteAction = data.action?.type === 'voice_note' || (/\b(voice note|audio memo|voice message|audio message|whisper to me)\b/i.test(effectiveText) && !isConversationalQuestion);
      const isImageAction = data.action?.type === 'image' || isExplicitVisualRequest || (!isConversationalQuestion && detectIntent(effectiveText) === 'image');
      const isVideoAction = data.action?.type === 'video' || (!isConversationalQuestion && detectIntent(effectiveText) === 'video');

      if (isVoiceNoteAction) {
        const vnLoadingId = addMessage({ role: 'persona', type: 'loading', content: `Recording voice note for you...` });
        try {
          const vnRes = await fetch('/api/generate-voice-note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: data.action?.text || replyText,
              persona: activePersona,
            })
          });
          const vnData = await vnRes.json();
          if (vnData.audioUrl) {
            replaceMessage(vnLoadingId, {
              type: 'voice_note',
              content: vnData.transcript || replyText,
              audioUrl: vnData.audioUrl,
              duration: vnData.duration,
              transcript: vnData.transcript || replyText,
            });
          } else {
            replaceMessage(vnLoadingId, { type: 'text', content: replyText });
          }
        } catch {
          replaceMessage(vnLoadingId, { type: 'text', content: replyText });
        }
      } else if (isImageAction) {
        const rawVisualPrompt = data.action?.prompt || effectiveText;
        const combinedText = `${rawVisualPrompt} ${effectiveText}`;
        
        // Strict explicit duo check - must explicitly ask for BOTH people together
        const isExplicitDuo = /\b(with me|with (?:dr\.?\s*h|alex|chris|creator)|me and you|you and me|of me and you|of you and me|me and her|her and me|us together|both of us|duo shoot|couple shoot|holding me|holding each other|kissing me|with us|fucking me|together with me)\b/i.test(combinedText);
        
        const isCreatorSoloShoot = !isExplicitDuo && (
          /\b(image of me only|photo of me only|pic of me only|just me|of me only|portrait of me only|solo photo of me|only me|portrait of dr\.?\s*h)\b/i.test(combinedText)
        );

        const isDuoShoot = isExplicitDuo;
        const isExplicitNude = /\b(naked|nude|topless|unclothed|bare|boobs|tits|breasts|nipples|exposed|sensual|erotic|no clothes|without clothes|undressed|pussy|ass)\b/i.test(combinedText);

        const targetReferenceImage = isCreatorSoloShoot 
          ? (creator?.primaryPhoto || personaPhoto)
          : personaPhoto;

        if (!targetReferenceImage) {
          addMessage({ role: 'persona', type: 'text', content: getNoRefImageResponse('image') });
        } else {
          const loadingText = isDuoShoot 
            ? `Generating duo photoshoot with ${activePersona.name} & ${creator?.name || 'Dr. H'}...`
            : (isCreatorSoloShoot ? `Generating solo photo of ${creator?.name || 'Dr. H'}...` : `Generating photo of ${activePersona.name}...`);
          const mediaLoadingId = addMessage({ role: 'persona', type: 'loading', content: loadingText });
          try {
            const extraImages: string[] = [];
            if (sentAttachment?.type === 'image') extraImages.push(sentAttachment.base64);
            else if (lastUploadedReference) extraImages.push(lastUploadedReference);
            const creatorPhoto = creator?.primaryPhoto || (creator?.photos && creator.photos.length > 0 ? creator.photos[0] : undefined);
            if (isDuoShoot && creatorPhoto && !extraImages.includes(creatorPhoto)) {
              extraImages.push(creatorPhoto);
            }

            const result = await generateImage({
              persona: activePersona,
              referenceImage: targetReferenceImage,
              prompt: rawVisualPrompt,
              modelId: selectedEditModelId || 'wavespeed:bytedance/seedream-v5.0-pro',
              aspectRatio: '9:16',
              isChatContext: true,
              chatPrompt: rawVisualPrompt,
              allowNsfw: true,
              additionalImages: extraImages.length > 0 ? extraImages : undefined,
              isDuoShoot,
              isCreatorSolo: isCreatorSoloShoot,
              creatorProfile: isDuoShoot || isCreatorSoloShoot ? creator : undefined,
            } as any);
            const imgUrl = Array.isArray(result) ? result[0].imageUrl : result.imageUrl;
            replaceMessage(mediaLoadingId, { type: 'image', content: imgUrl, prompt: rawVisualPrompt });
          } catch (imgErr: any) {
            replaceMessage(mediaLoadingId, { type: 'error', content: imgErr?.message || 'Failed to generate photo' });
          }
        }
      } else if (isVideoAction) {
        if (!personaPhoto) {
          addMessage({ role: 'persona', type: 'text', content: getNoRefImageResponse('video') });
        } else {
          const mediaLoadingId = addMessage({ role: 'persona', type: 'loading', content: `Rendering video clip with ${activePersona.name}...` });
          try {
            const videoPrompt = data.action?.prompt || effectiveText;
            const result = await generateVideo(videoPrompt, selectedVideoModelId, personaPhoto);
            replaceMessage(mediaLoadingId, { type: 'video', content: result.videoUrl, prompt: videoPrompt });
          } catch (vidErr: any) {
            replaceMessage(mediaLoadingId, { type: 'error', content: vidErr?.message || 'Failed to generate video' });
          }
        }
      }
    } catch (err: any) {
      replaceMessage(loadingId, {
        type: 'error',
        content: err?.message || 'Something went wrong. Try again?',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
  
  const handleGenerateReplies = async () => {
    if (!replyInput.trim()) return;
    setIsGenerating(true);
    setGeneratedReplies([]);
    try {
      const personaMemories = loadPersonaMemories(activePersona.id);
      const prompt = `You are ${activePersona.name}, an authentic human creator and influencer.
Niche: ${activePersona.niche}
Tone & Speaking Style: ${activePersona.tone}
Personality: ${Array.isArray(activePersona.personalityTraits) ? activePersona.personalityTraits.join(', ') : (activePersona.personalityTraits || 'Charismatic, witty, authentic')}
Bio: ${activePersona.bio || ''}

A fan or collaborator left this comment/DM on your post:
"${replyInput}"

Write 3 distinct reply options in your authentic voice. Each should:
- Sound totally natural, charismatic, and emotionally intelligent (never robotic or corporate)
- Match your personality, attitude, and wit perfectly
- Be appropriately concise (1-3 sentences for comments, up to 4 for DMs)
- Include 1-2 relevant emojis matching your aesthetic
- Be ready to post as-is

Return ONLY a JSON array of 3 reply strings (no markdown backticks, no wrapping object).`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activePersona,
          userName: getStoredUserName(),
          messages: [],
          memories: personaMemories,
          userMessage: prompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate replies');

      const raw: string = data.reply || '';
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          const parsed: string[] = JSON.parse(match[0]);
          setGeneratedReplies(parsed.slice(0, 3));
        } catch {
          setGeneratedReplies(raw.split('\n').filter(l => l.trim()).slice(0, 3));
        }
      } else {
        setGeneratedReplies([raw]);
      }
    } catch (err: any) {
      toast.error('Could not generate replies');
    } finally {
      setIsGenerating(false);
    }
  };

  const NSFW_MODEL_IDS = new Set([
    'wavespeed-ai/wan2.1-i2v-480p-turbo',
    'wavespeed-ai/wan2.1-i2v-720p-turbo',
    'wavespeed-ai/wan2.2-i2v-ultra',
    'wavespeed-ai/wan2.2-t2v-ultra',
    'bytedance/seedream-3.0',
    'seededit-v3',
    'wan22',
  ]);

  function isNsfw(model: ModelInfo): boolean {
    if (model.nsfw) return true;
    const id = model.id.toLowerCase();
    for (const nsfwId of NSFW_MODEL_IDS) {
      if (id.includes(nsfwId.toLowerCase())) return true;
    }
    return false;
  }

  return (
    <div className="w-full h-[calc(100vh-70px)] p-2 sm:p-3.5 md:p-4 flex flex-col justify-center items-center bg-[#121316]">
      {/* Framed Chatting Window Box with Visible Border */}
      <div className="w-full h-full max-w-[1320px] flex flex-col bg-[#16171b] border border-white/[0.14] rounded-2xl sm:rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.85)] overflow-hidden ring-1 ring-white/[0.04]">
        
        {/* Sleek Charcoal Minimal Header */}
        <header className="sticky top-0 z-20 bg-[#1c1d22]/95 backdrop-blur-xl border-b border-white/[0.09] px-4 sm:px-5 py-2.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            
            {/* Left: Active Persona Identity & Fast Switcher */}
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="relative flex-shrink-0 group cursor-pointer"
                onClick={() => setIsReferenceModalOpen(true)}
                title={`Click to view all ${activePersona.name}'s reference photos and change primary image`}
              >
                {activePersona.referenceImage || activePersona.avatar ? (
                  <PersonaAvatar
                    src={activePersona.referenceImage || activePersona.avatar} 
                    alt={activePersona.name} 
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/20 shadow-md transition-transform duration-300 group-hover:scale-105" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
                    <Bot size={16} className="text-zinc-300" />
                  </div>
                )}

                {/* Hover Camera Overlay */}
                <div className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={15} className="text-[#F2D58D] drop-shadow-md" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1c1d22]" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span 
                    onClick={() => setIsReferenceModalOpen(true)}
                    className="text-sm font-bold text-white truncate max-w-[150px] sm:max-w-[200px] cursor-pointer hover:text-[#F2D58D] transition-colors"
                    title={`Click to view all reference photos for ${activePersona.name}`}
                  >
                    {activePersona.name}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                    {activePersona.niche || 'Creator'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsReferenceModalOpen(true)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-[#F2D58D] bg-[#E7C477]/10 hover:bg-[#E7C477]/20 border border-[#E7C477]/30 px-2 py-0.5 rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
                    title="View all reference photos and upload new source images"
                  >
                    <Camera size={10} />
                    <span>Reference Photos</span>
                  </button>
                </div>
                <div className="relative flex items-center mt-0.5">
                  <select
                    value={selectedPersonaId}
                    onChange={e => {
                      const newId = e.target.value;
                      setSelectedPersonaId(newId);
                      if (onSelectPersona) onSelectPersona(newId);
                    }}
                    className="bg-transparent text-[11px] font-medium text-zinc-400 hover:text-zinc-200 outline-none cursor-pointer appearance-none pr-4"
                  >
                    {personas.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#1c1d22] text-white">
                        Switch to {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="text-zinc-500 pointer-events-none -ml-3" />
                </div>
              </div>
            </div>

            {/* Right: Relationship Badge + Wardrobe Studio + Mode Switcher + AI Settings + Quick Actions + Voice Call */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              
              {/* Relationship Affinity & Mood Progression Badge */}
              <RelationshipProgressBadge 
                relationship={relationshipState} 
                personaName={activePersona.name} 
                userName={getStoredUserName()} 
              />

              {/* View Mode Toggle */}
              <div className="flex bg-[#141518] border border-white/[0.08] rounded-xl p-1 text-xs">
                <button
                  onClick={() => setActiveSegment('chat')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    activeSegment === 'chat' ? "bg-white/[0.14] text-white shadow-sm" : "text-zinc-400 hover:text-white"
                  )}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveSegment('replies')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                    activeSegment === 'replies' ? "bg-white/[0.14] text-white shadow-sm" : "text-zinc-400 hover:text-white"
                  )}
                >
                  Auto Replies
                </button>
              </div>

              {/* AI Model & Voice Config Trigger */}
              <button
                onClick={() => setShowEngineSettings(true)}
                title="Configure AI Models & Voice Engines"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#24252b] hover:bg-[#2b2c33] border border-white/[0.09] text-zinc-200 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <SlidersHorizontal size={13} className="text-zinc-400" />
                <span className="hidden sm:inline">AI Settings</span>
              </button>

              {/* New Chat */}
              <button
                onClick={clearHistory}
                title="Start a fresh conversation"
                className="p-2 rounded-xl bg-[#24252b] hover:bg-[#2b2c33] border border-white/[0.09] text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <Plus size={14} />
              </button>

              {/* Clear History */}
              <button
                onClick={clearHistory}
                title="Clear message history"
                className="p-2 rounded-xl bg-[#24252b] hover:bg-rose-500/10 border border-white/[0.09] hover:border-rose-500/20 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
              >
                <Trash2 size={14} />
              </button>

              {/* Live Voice Call Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartCall}
                className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer"
              >
                <Phone size={13} />
                <span>Voice Call</span>
              </motion.button>

            </div>

          </div>
        </header>

        {activeSegment === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 min-h-0 bg-[#131417]">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  persona={activePersona}
                  isLatest={i === messages.length - 1}
                  onSaveToVault={handleSaveToVault}
                  isSaving={savingMsgId === msg.id}
                  isSaved={savedMsgIds.has(msg.id)}
                  onImageClick={(url, prompt) => setLightboxMedia({ url, prompt })}
                  onGenerateTalkingVideo={handleGenerateTalkingVideo}
                  onSetAsPrimaryReference={handleSetPrimaryReferenceImage}
                  onCancelGeneration={handleCancelGeneration}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Clean Floating Bottom Message Bar */}
            <div className="sticky bottom-0 bg-[#1c1d22]/95 backdrop-blur-xl border-t border-white/[0.08] p-3 sm:p-4">
              {/* Attachment preview banner */}
              {chatAttachment && (
                <div className="mb-2.5 px-3.5 py-2 bg-[#141518] border border-white/[0.12] rounded-xl flex items-center justify-between shadow-lg animate-fadeIn max-w-4xl mx-auto">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {chatAttachment.type === 'image' ? (
                      <img src={chatAttachment.url} alt="" className="w-9 h-9 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                    ) : chatAttachment.type === 'video' ? (
                      <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0"><Film size={16} className="text-zinc-300" /></div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0"><FileText size={16} className="text-zinc-300" /></div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{chatAttachment.name}</p>
                      <p className="text-[10px] text-zinc-400 font-medium">Attachment ready for analysis</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChatAttachment(null)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2.5 bg-[#141518] border border-white/[0.12] focus-within:border-white/25 rounded-2xl px-3 py-2 shadow-inner transition-all max-w-4xl mx-auto">
                <input type="file" ref={fileInputRef} onChange={handleChatFileSelected} className="hidden" accept="image/*,video/*,.pdf,.txt" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach photo/reference"
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer",
                    chatAttachment
                      ? "bg-white/20 text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
                  )}
                >
                  <Paperclip size={16} />
                </button>

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activePersona.name}…`}
                  rows={1}
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none resize-none leading-relaxed px-1 py-1"
                  style={{ maxHeight: '120px' }}
                />

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  disabled={(!input.trim() && !chatAttachment) || isGenerating}
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
                    (input.trim() || chatAttachment) && !isGenerating
                      ? 'bg-white text-zinc-950 font-semibold shadow-md hover:bg-zinc-200 cursor-pointer'
                      : 'bg-white/[0.05] text-zinc-600 border border-white/[0.05] cursor-not-allowed'
                  )}
                >
                  {isGenerating ? (
                    <Loader2 size={15} className="animate-spin text-zinc-950" />
                  ) : (
                    <Send size={15} />
                  )}
                </motion.button>
              </div>
            </div>
          </>
        ) : (
        <div className="flex-1 p-6 overflow-y-auto space-y-8">
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-2">Paste Comment / DM</label>
            <textarea 
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder="Ex: 'You are so pretty! Where did you get that jacket?'"
              className="w-full premium-input bg-[var(--bg-surface)] p-4 text-sm min-h-[100px] outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-xl border border-[var(--border-default)] focus:border-violet-500/50 transition-colors"
            />
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerateReplies}
            disabled={isGenerating}
            className="w-full premium-button py-4 flex items-center justify-center gap-2 text-white font-bold rounded-xl disabled:opacity-50"
          >
             <MessageSquareQuote size={18} />
             Generate Replies
          </motion.button>

          {generatedReplies.length > 0 && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] block mb-2">AI-Generated Replies</label>
              {generatedReplies.map((reply, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4 relative group"
                >
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { navigator.clipboard.writeText(reply); toast.success('Copied!'); }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-[var(--text-muted)] hover:text-emerald-400 transition-colors"
                      title="Copy"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed pr-16 whitespace-pre-wrap">{reply}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Voice Call Simulator Overlay */}
      <AnimatePresence>
        {isCallActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#121316]/98 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 overflow-y-auto custom-scrollbar rounded-2xl sm:rounded-3xl border border-white/[0.12] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0 mb-2">
              <div className="flex items-center gap-3">
                {activePersona?.avatar || activePersona?.referenceImage ? (
                  <img 
                    src={activePersona.avatar || activePersona.referenceImage} 
                    alt={activePersona.name} 
                    className="w-10 h-10 rounded-full border border-white/20 object-cover shadow-sm" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      const fallback = activePersona?.referenceImage && target.src !== activePersona.referenceImage
                        ? activePersona.referenceImage
                        : (activePersona?.additionalReferenceImages?.[0] || '/demo/ai_sample_influencer.png');
                      if (target.src !== fallback) target.src = fallback;
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/15 flex items-center justify-center">
                    <Bot size={18} className="text-zinc-300" />
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">{activePersona.name}</h3>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{activePersona.niche}</span>
                </div>
              </div>
              
              {/* Voice Status & Voice Engine Selector & Call Duration */}
              <div className="flex items-center gap-2">
                <div 
                  className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-semibold rounded-lg px-2.5 py-1 backdrop-blur-md transition-all shadow-sm max-w-[150px] truncate"
                  title={`Voice strictly locked to ${activePersona.name}'s cloned voice`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <span className="truncate">🎙️ {activePersona.name}</span>
                </div>
                <div className="relative">
                  <select
                    value={selectedVoiceEngine}
                    onChange={e => handleVoiceEngineChange(e.target.value)}
                    className="bg-[#1c1d22] hover:bg-[#222329] border border-white/[0.12] text-zinc-200 text-[11px] font-semibold rounded-lg px-2.5 py-1 outline-none cursor-pointer backdrop-blur-md transition-all"
                    title="Select Voice Engine"
                  >
                    {VOICE_CALL_ENGINES.map(eng => (
                      <option key={eng.id} value={eng.id} className="bg-[#1c1d22] text-white">
                        {eng.name} ({eng.badge})
                      </option>
                    ))}
                  </select>
                </div>
                {callStatus !== 'connecting' && (
                  <div className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs font-mono text-zinc-300">
                    {formatDuration(callDuration)}
                  </div>
                )}
              </div>
            </div>

            {/* Visualizer Area */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 my-2 relative">
              {/* Status Indicator */}
              <div className="text-center z-10 min-h-[38px] flex flex-col items-center justify-center px-4">
                {liveUserSpeech ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs sm:text-sm font-medium shadow-sm backdrop-blur-md max-w-[420px]"
                  >
                    <span className="truncate max-w-[360px]">🎙️ "{liveUserSpeech}"</span>
                  </motion.div>
                ) : (
                  <>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block mb-1">
                      {callStatus === 'connecting' ? 'Calling...' : 
                       callStatus === 'speaking' ? `${activePersona?.name || 'Persona'} Speaking` :
                       callStatus === 'listening' ? 'Listening to You' : 'Connected'}
                    </span>
                    <p className="text-xs text-zinc-400 font-medium">
                      {callStatus === 'connecting' ? 'Establishing secure connection...' : 
                       callStatus === 'speaking' ? `${activePersona?.name || 'Persona'} is speaking...` :
                       callStatus === 'listening' ? 'Speak now or type below...' : 'Call in progress'}
                    </p>
                  </>
                )}
              </div>

              {/* Pulsing Glowing Avatar */}
              <div className={cn("relative flex flex-col items-center justify-center transition-all duration-300", activeCallMedia ? "w-24 h-24" : "w-36 h-36")}>
                {/* Outer Glow Pulse Rings */}
                <motion.div
                  animate={{
                    scale: callStatus === 'speaking' ? [1, 1.2, 1] : [1, 1.08, 1],
                    opacity: callStatus === 'speaking' ? [0.4, 0.7, 0.4] : [0.15, 0.3, 0.15]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: callStatus === 'speaking' ? 1.5 : 3,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl"
                />
                <motion.div
                  animate={{
                    scale: callStatus === 'speaking' ? [1, 1.35, 1] : [1, 1.15, 1],
                    opacity: callStatus === 'speaking' ? [0.25, 0.4, 0.25] : [0.1, 0.2, 0.1]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: callStatus === 'speaking' ? 2 : 4,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-[-10px] rounded-full bg-white/[0.04] blur-2xl"
                />

                {/* Main Avatar Wrapper */}
                <div 
                  className={cn(
                    "rounded-full overflow-hidden border-2 border-white/20 shadow-2xl relative z-10 transition-all",
                    activeCallMedia ? "w-20 h-20" : "w-32 h-32"
                  )}
                >
                  {activePersona?.referenceImage || activePersona?.avatar ? (
                    <img 
                      src={activePersona.referenceImage || activePersona.avatar} 
                      alt={activePersona?.name || 'Persona'} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const fallback = activePersona?.avatar && target.src !== activePersona.avatar
                          ? activePersona.avatar
                          : (activePersona?.additionalReferenceImages?.[0] || '/demo/ai_sample_influencer.png');
                        if (target.src !== fallback) target.src = fallback;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
                      <Bot size={activeCallMedia ? 32 : 48} className="text-zinc-300" />
                    </div>
                  )}
                </div>
              </div>

              {/* Waveform Visualizer */}
              <div className="h-8 flex items-end justify-center gap-1 w-full max-w-[220px] px-4 z-10">
                {[...Array(16)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={callStatus === 'speaking' ? {
                      height: [6, 12 + (i % 5) * 4, 6]
                    } : callStatus === 'listening' ? {
                      height: [6, 10, 6]
                    } : {
                      height: [6, 6, 6]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.5 + (i % 4) * 0.2,
                      ease: "easeInOut",
                      delay: i * 0.03
                    }}
                    className={cn(
                      "w-1.5 rounded-full",
                      callStatus === 'speaking' ? "bg-gradient-to-t from-emerald-500 to-teal-300" :
                      callStatus === 'listening' ? "bg-teal-400/50" : "bg-white/10"
                    )}
                    style={{ height: '6px' }}
                  />
                ))}
              </div>

              {/* Live Media Card if Persona Shared Photo/Video */}
              <AnimatePresence>
                {activeCallMedia && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 8 }}
                    onClick={() => {
                      if (activeCallMedia.type === 'image') {
                        setLightboxMedia({ url: activeCallMedia.url, prompt: activeCallMedia.prompt });
                      } else {
                        setFullScreenModalMedia({ type: activeCallMedia.type, url: activeCallMedia.url, prompt: activeCallMedia.prompt });
                      }
                    }}
                    className="relative group rounded-2xl overflow-hidden border border-white/20 bg-black/95 shadow-2xl w-full max-w-[340px] sm:max-w-[380px] mx-auto z-30 mb-2 backdrop-blur-md cursor-pointer hover:border-white/40 transition-all flex-shrink-0"
                    title="Click to view full screen, upscale & edit"
                  >
                    {activeCallMedia.type === 'image' ? (
                      <div className="relative w-full h-60 sm:h-64 bg-zinc-950 overflow-hidden flex-shrink-0">
                        <img
                          src={activeCallMedia.url}
                          alt="Shared Photo"
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="px-4 py-2 rounded-full bg-black/90 text-white text-xs font-bold border border-white/20 backdrop-blur-md shadow-2xl flex items-center gap-1.5 transform group-hover:scale-105 transition-transform">
                            <Maximize2 size={13} className="text-[#E7C477]" /> Open Studio & Fullscreen
                          </span>
                        </div>
                      </div>
                    ) : (
                      <video
                        src={activeCallMedia.url}
                        controls
                        autoPlay
                        className="w-full h-60 sm:h-64 object-cover flex-shrink-0"
                      />
                    )}
                    <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeCallMedia.type === 'image') {
                            setLightboxMedia({ url: activeCallMedia.url, prompt: activeCallMedia.prompt });
                          } else {
                            setFullScreenModalMedia({ type: activeCallMedia.type, url: activeCallMedia.url, prompt: activeCallMedia.prompt });
                          }
                        }}
                        className="p-1.5 rounded-full bg-black/80 hover:bg-violet-600 text-white text-xs backdrop-blur-md transition-colors"
                        title="Enlarge Full Screen"
                      >
                        <Maximize2 size={12} />
                      </button>
                      <a
                        href={activeCallMedia.url}
                        download="persona-photo.png"
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-full bg-black/80 hover:bg-black text-white text-xs backdrop-blur-md transition-colors"
                        title="Download HD"
                      >
                        <Download size={12} />
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCallMedia(null);
                        }}
                        className="p-1.5 rounded-full bg-black/80 hover:bg-rose-600 text-white text-xs backdrop-blur-md transition-colors"
                        title="Close"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="p-2.5 bg-black/95 border-t border-white/10 flex items-center justify-between px-3">
                      <p className="text-[11px] text-violet-300 font-semibold truncate flex items-center gap-1.5">
                        <span>📸</span> Photo by {activePersona?.name || 'Creator'}
                      </p>
                      <span className="text-[10px] text-[#F2D58D] font-bold hover:underline flex items-center gap-1">
                        <Maximize2 size={10} /> Upscale / Edit
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dynamic Live Captions & Spoken Dialogue Card */}
              <div className="w-full max-w-xl sm:max-w-2xl min-h-[90px] max-h-56 bg-[#16171b]/95 border border-white/[0.12] rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl overflow-y-auto text-sm space-y-2.5 custom-scrollbar flex flex-col z-20">
                {!callTranscript || callTranscript.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-3">
                    <p className="text-xs text-zinc-500 font-medium italic">
                      ✨ Voice Call Connected — start speaking or type below
                    </p>
                  </div>
                ) : (
                  callTranscript.slice(-6).map((item, idx) => {
                    if (!item) return null;
                    const isPersona = item.role === 'persona';
                    const isLatest = idx === Math.min(callTranscript.length, 6) - 1;
                    return (
                      <motion.div
                        key={item.id || idx}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex flex-col gap-1 p-2.5 rounded-xl transition-colors",
                          isPersona ? "bg-[#1f2026]/90 border border-white/[0.08]" : "bg-white/[0.04] border border-white/[0.04] self-end max-w-[85%]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            isPersona ? "text-[#E7C477]" : "text-zinc-400"
                          )}>
                            {isPersona ? (activePersona?.name || 'Creator') : getStoredUserName()}
                          </span>
                          {isPersona && isLatest && callStatus === 'speaking' && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              Speaking
                            </span>
                          )}
                        </div>

                        {item.type === 'loading' ? (
                          <div className="flex items-center gap-2 text-violet-400 text-xs sm:text-sm font-medium py-1 animate-pulse">
                            <span className="inline-block w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                            Creating high-definition photo for you...
                          </div>
                        ) : item.type === 'image' ? (
                          <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-black/40 p-2.5 rounded-xl border border-white/10">
                            {item.content && (
                              <img
                                src={item.content}
                                alt="Shared photo"
                                onClick={() => setLightboxMedia({ url: item.content, prompt: item.prompt })}
                                className="w-24 h-24 rounded-lg object-cover border border-[#E7C477]/40 hover:scale-105 transition-transform cursor-pointer shadow-lg"
                              />
                            )}
                            <div className="space-y-1">
                              <p className="text-xs text-zinc-300 font-medium">Shared a portrait with you</p>
                              <button
                                onClick={() => setLightboxMedia({ url: item.content, prompt: item.prompt })}
                                className="text-xs font-bold text-[#F2D58D] hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <Maximize2 size={11} /> Upscale & Edit Studio
                              </button>
                            </div>
                          </div>
                        ) : item.type === 'video' ? (
                          <div className="mt-2">
                            <video
                              src={item.content}
                              controls
                              className="w-48 rounded-xl border border-violet-500/40 shadow-lg"
                            />
                          </div>
                        ) : item.type === 'error' ? (
                          <p className="text-xs text-rose-400 font-medium">{item.content}</p>
                        ) : (
                          <p className={cn(
                            "text-xs sm:text-[13px] leading-relaxed",
                            isPersona ? "text-zinc-100 font-normal" : "text-zinc-300"
                          )}>
                            {item.content || ''}
                          </p>
                        )}
                      </motion.div>
                    );
                  })
                )}
                <div ref={callTranscriptEndRef} />
              </div>

              {/* Call Controls Bar */}
              <div className="w-full max-w-xl sm:max-w-2xl bg-[#16171b]/95 border border-white/[0.12] rounded-2xl p-2.5 sm:p-3 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-2 z-20">
                {/* Mute Button */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                    isMuted
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/10"
                  )}
                >
                  {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                  <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
                </button>

                {/* Call Input / Quick Chat */}
                <div className="flex-1 flex items-center gap-1.5 bg-[#101114] border border-white/10 rounded-xl px-2.5 py-1">
                  <input
                    type="text"
                    value={callInput}
                    onChange={(e) => setCallInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendCallMessage();
                    }}
                    placeholder="Type to speak or ask for a photo..."
                    className="w-full bg-transparent text-xs text-white placeholder-zinc-500 outline-none"
                  />
                  <button
                    onClick={() => handleSendCallMessage()}
                    disabled={!callInput.trim()}
                    className="p-1 rounded-lg bg-[#E7C477] text-zinc-950 disabled:opacity-40 font-bold transition-opacity cursor-pointer"
                  >
                    <Send size={12} />
                  </button>
                </div>

                {/* End Call Button */}
                <button
                  onClick={handleEndCall}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  <PhoneOff size={14} />
                  <span className="hidden sm:inline">End</span>
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand New Almost Fullscreen Image Lightbox Modal with Upscale, Edit, and Download */}
      {lightboxMedia && (
        <ImageLightboxModal
          isOpen={!!lightboxMedia}
          onClose={() => setLightboxMedia(null)}
          imageUrl={lightboxMedia.url}
          prompt={lightboxMedia.prompt}
          persona={activePersona}
          onImageUpdated={(newUrl) => handleUpdateImageInChat(lightboxMedia.url, newUrl)}
        />
      )}

      {/* Video Modal fallback if a video is clicked */}
      <AnimatePresence>
        {fullScreenModalMedia && fullScreenModalMedia.type === 'video' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-8"
            onClick={() => setFullScreenModalMedia(null)}
          >
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3 z-30">
              <a
                href={fullScreenModalMedia.url}
                download="persona-video.mp4"
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/20 transition-all flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Download size={13} />
                <span>Download Video</span>
              </a>
              <button
                onClick={() => setFullScreenModalMedia(null)}
                className="w-11 h-11 rounded-full bg-white/15 hover:bg-rose-600 text-white text-xl font-bold flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-xl active:scale-90"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-full max-h-[85vh] flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <video
                src={fullScreenModalMedia.url}
                controls
                autoPlay
                className="max-w-[90vw] max-h-[82vh] object-contain rounded-2xl border border-white/15 shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ultra-Premium Luxury Studio Settings Modal */}
      <AnimatePresence>
        {showEngineSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
            onClick={() => setShowEngineSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xl bg-[#0b0e14]/98 border border-white/[0.12] rounded-3xl p-6 sm:p-7 shadow-[0_30px_90px_rgba(0,0,0,0.95)] space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center shadow-inner">
                    <SlidersHorizontal size={18} className="text-zinc-200" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Studio AI & Model Configuration</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Customize neural reasoning, generative visuals & voice synthesis</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEngineSettings(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/10 border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-5 text-xs">
                
                {/* 1. Intelligence & Reasoning Card */}
                <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                      Reasoning & Conversation Engine
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      Fast & Uncensored
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      value={voiceLlmModel}
                      onChange={(e) => {
                        const selected = e.target.value;
                        setVoiceLlmModel(selected);
                        localStorage.setItem('agent_voice_llm', selected);
                        const labels: Record<string, string> = {
                          'llama3.3': 'Meta Llama 3.3 70B (Cloud API)',
                          'ollama:llama3.3': 'Meta Llama 3.3 70B (Local GPU)',
                          venice: 'Venice AI Llama 3.3 70B (Uncensored)',
                          grok: 'xAI Grok 2',
                          deepseek: 'DeepSeek R1 Reasoner',
                          qwen: 'Qwen 2.5 72B Instruct',
                          gemini: 'Gemini 2.5 Flash'
                        };
                        toast.success(`Switched to ${labels[selected] || selected}`);
                      }}
                      className="w-full bg-[#1c1d22] border border-white/[0.1] hover:border-white/20 focus:border-white/30 rounded-xl px-3.5 py-3 text-sm text-white font-medium outline-none cursor-pointer appearance-none transition-all pr-9 shadow-inner"
                    >
                      <option value="gemini" className="bg-[#1c1d22] text-white">⚡ Gemini 2.5 Flash (Ultra Fast & Conversational)</option>
                      <option value="qwen" className="bg-[#1c1d22] text-white">🔮 Qwen 2.5 72B Instruct (Deep Roleplay & Creative)</option>
                      <option value="venice" className="bg-[#1c1d22] text-white">🔓 Venice AI Llama 3.3 70B (Fully Uncensored)</option>
                      <option value="deepseek" className="bg-[#1c1d22] text-white">🧠 DeepSeek R1 Reasoner (Complex Logic & Analysis)</option>
                      <option value="grok" className="bg-[#1c1d22] text-white">🚀 xAI Grok 2 (Direct & Unfiltered)</option>
                      <option value="llama3.3" className="bg-[#1c1d22] text-white">🦙 Meta Llama 3.3 70B (Cloud API)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Powers text dialogue, voice agent reasoning, roleplay fidelity, and multimodal context.
                  </p>
                </div>

                {/* 2. Acoustics & Voice Engine Card */}
                <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                      Voice Persona & Synthesis
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.08] font-semibold">
                      ElevenLabs Cloned
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Voice Character Status */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Voice Identity
                      </label>
                      <div className="w-full bg-[#1c1d22] border border-emerald-500/30 rounded-xl px-3 py-2.5 flex items-center justify-between shadow-inner">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                          <span className="text-xs text-white font-medium truncate">
                            🎙️ {activePersona.name}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold flex-shrink-0">
                          Locked
                        </span>
                      </div>
                    </div>

                    {/* Synthesis Latency Engine */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Latency & Audio Engine
                      </label>
                      <div className="relative">
                        <select
                          value={selectedVoiceEngine}
                          onChange={e => handleVoiceEngineChange(e.target.value)}
                          className="w-full bg-[#1c1d22] border border-white/[0.1] hover:border-white/20 focus:border-white/30 rounded-xl px-3 py-2.5 text-xs text-white font-medium outline-none cursor-pointer appearance-none transition-all pr-8 shadow-inner truncate"
                        >
                          {VOICE_CALL_ENGINES.map(eng => (
                            <option key={eng.id} value={eng.id} className="bg-[#1c1d22] text-white">
                              {eng.name} ({eng.badge})
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Generative Visuals Card (Image & Video) */}
                <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                      Visual & Video Creation Pipelines
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                      Seedream 5.0 Pro • Seedance 2.0 Mini
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Image Model */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Image Generation Model
                        </label>
                      </div>
                      <div className="relative">
                        <select
                          value={selectedEditModelId}
                          onChange={e => setSelectedEditModelId(e.target.value)}
                          disabled={!modelsLoaded || editModels.length === 0}
                          className="w-full bg-[#1c1d22] border border-white/[0.1] hover:border-white/20 focus:border-white/30 rounded-xl px-3 py-2.5 text-xs text-white font-medium outline-none cursor-pointer appearance-none transition-all pr-8 shadow-inner truncate"
                        >
                          {editModels.map(m => (
                            <option key={m.id} value={m.id} className="bg-[#1c1d22] text-white">
                              {isNsfw(m) ? '🔞 ' : ''}{m.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        Default: <strong className="text-zinc-300">ByteDance Seedream 5.0 Pro</strong>
                      </p>
                    </div>

                    {/* Video Model */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Video Generation Engine
                        </label>
                      </div>
                      <div className="relative">
                        <select
                          value={selectedVideoModelId}
                          onChange={e => setSelectedVideoModelId(e.target.value)}
                          disabled={!modelsLoaded || videoModels.length === 0}
                          className="w-full bg-[#1c1d22] border border-white/[0.1] hover:border-white/20 focus:border-white/30 rounded-xl px-3 py-2.5 text-xs text-white font-medium outline-none cursor-pointer appearance-none transition-all pr-8 shadow-inner truncate"
                        >
                          {videoModels.map(m => (
                            <option key={m.id} value={m.id} className="bg-[#1c1d22] text-white">
                              {isNsfw(m) ? '🔞 ' : ''}{m.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        Default: <strong className="text-zinc-300">Seedance 2.0 Mini (Wavespeed • Uncensored)</strong>
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    const seedream5Pro = editModels.find(m => {
                      const id = (m.id || '').toLowerCase();
                      const name = (m.name || '').toLowerCase();
                      return (id.includes('seedream-v5.0-pro') || id.includes('seedream-5.0-pro') || id.includes('seedream-5-pro') || name.includes('seedream 5.0 pro') || name.includes('seedream 5 pro')) && !id.includes('lite') && !name.includes('lite');
                    }) || editModels[0];
                    if (seedream5Pro) setSelectedEditModelId(seedream5Pro.id);
                    
                    const seedanceMini = videoModels.find(m => {
                      const id = (m.id || '').toLowerCase();
                      const name = (m.name || '').toLowerCase();
                      return (id.includes('wavespeed') || m.provider?.toLowerCase().includes('wavespeed')) && 
                        (id.includes('seedance-2-mini') || id.includes('seedance-2.0-mini') || id.includes('seedance-mini') || name.includes('seedance 2.0 mini') || name.includes('seedance 2 mini') || id.includes('seedance-2.0') || name.includes('seedance 2.0') || id.includes('seedance'));
                    }) || videoModels[0];
                    if (seedanceMini) setSelectedVideoModelId(seedanceMini.id);
                    
                    setVoiceLlmModel('gemini');
                    localStorage.setItem('agent_voice_llm', 'gemini');
                    toast.success('Reset to optimal studio defaults!');
                  }}
                  className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer px-2 py-1"
                >
                  Reset Defaults
                </button>

                <button
                  onClick={() => setShowEngineSettings(false)}
                  className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  Apply & Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persona Reference Photo Gallery & Primary Selector Modal */}
      <PersonaReferenceModal
        isOpen={isReferenceModalOpen}
        onClose={() => setIsReferenceModalOpen(false)}
        persona={activePersona}
        onPersonaUpdated={(updated) => {
          if (onSelectPersona) onSelectPersona(updated.id);
        }}
      />
      </div>
    </div>
  );
}

function GeneratingProgressBubble({ 
  msgId,
  label, 
  onCancel 
}: { 
  msgId?: string;
  label?: string; 
  onCancel?: (id: string) => void;
}) {
  const [progress, setProgress] = useState(14);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        const diff = 96 - prev;
        const step = Math.max(1, Math.floor(Math.random() * (diff / 4) + 1));
        return Math.min(95, prev + step);
      });
    }, 450);

    return () => clearInterval(interval);
  }, []);

  const cleanLabel = label
    ? label.replace(/Generating photoshoot of .* in (.*)\.\.\./i, 'Generating ($1)...')
           .replace(/Generating photoshoot with .*\.\.\./i, 'Generating photoshoot...')
           .replace(/Generating photo with .*\.\.\./i, 'Generating photo...')
           .replace(/Generating photoshoot of .*\.\.\./i, 'Generating photoshoot...')
           .replace(/Creating talking video with .*\.\.\./i, 'Creating video...')
           .replace(/Recording voice note for you\.\.\./i, 'Recording voice...')
           .replace(/Rendering video clip with .*\.\.\./i, 'Rendering video...')
    : 'Generating visual...';

  return (
    <div className="group/loading bg-[#10141D]/95 backdrop-blur-md border border-[#E7C477]/30 rounded-2xl rounded-tl-sm px-3.5 py-2 flex flex-col gap-1.5 min-w-[200px] max-w-[260px] shadow-lg shadow-black/60 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Loader2 size={13} className="text-[#F2D58D] animate-spin flex-shrink-0" />
          <span className="text-xs font-medium text-zinc-200 truncate">
            {cleanLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[11px] font-mono font-bold text-[#F2D58D] tabular-nums">
            {progress}%
          </span>
          {onCancel && msgId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(msgId);
              }}
              className="w-4 h-4 rounded-full bg-white/10 hover:bg-rose-500 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Cancel generation"
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#B99655] to-[#F2D58D] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface BubbleProps {
  msg: ChatMessage;
  persona: Persona;
  isLatest: boolean;
  onSaveToVault: (msg: ChatMessage) => void;
  isSaving: boolean;
  isSaved: boolean;
  onImageClick?: (url: string, prompt?: string) => void;
  onGenerateTalkingVideo?: (msg: ChatMessage) => void;
  onSetAsPrimaryReference?: (url: string) => void;
  onCancelGeneration?: (id: string) => void;
}

function MessageBubble({ msg, persona, isLatest, onSaveToVault, isSaving, isSaved, onImageClick, onGenerateTalkingVideo, onSetAsPrimaryReference, onCancelGeneration }: BubbleProps) {
  const isUser = msg.role === 'user';
  const shouldType = !isUser && msg.type === 'text' && isLatest;
  const { displayed, done } = useTypewriter(shouldType ? msg.content : '', 14);
  const textToShow = shouldType ? displayed : msg.content;

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col items-end my-1"
      >
        {msg.attachment && (
          <div className="mb-2 max-w-[75%] rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-[#141518]">
            {msg.attachment.type === 'image' ? (
              <img 
                src={msg.attachment.url} 
                alt="" 
                onClick={() => onImageClick?.(msg.attachment!.url, msg.content)}
                className="w-full max-h-56 object-cover rounded-2xl cursor-pointer hover:opacity-90 transition-opacity" 
              />
            ) : msg.attachment.type === 'video' ? (
              <video src={msg.attachment.url} controls className="w-full max-h-56 object-cover rounded-2xl" />
            ) : (
              <div className="p-3 bg-white/[0.04] flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <FileText size={16} />
                <span>{msg.attachment.name}</span>
              </div>
            )}
          </div>
        )}
        <div className="max-w-[75%] bg-[#28292f] hover:bg-[#2e2f36] border border-white/[0.12] text-zinc-100 rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[12.5px] sm:text-[13px] leading-relaxed shadow-sm transition-colors">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-2.5 items-start my-1"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-lg overflow-hidden bg-white/[0.06] border border-white/10 flex items-center justify-center shadow-sm mt-0.5">
        {persona.referenceImage || persona.avatar ? (
          <PersonaAvatar src={persona.referenceImage || persona.avatar} alt={persona.name} className="w-full h-full object-cover" />
        ) : (
          <Bot size={13} className="text-zinc-400" />
        )}
      </div>

      <div className="max-w-[78%] space-y-1">
        {msg.type === 'text' && (
          <div className="bg-[#1c1d22] border border-white/[0.08] text-zinc-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[12.5px] sm:text-[13px] leading-relaxed shadow-sm">
            {textToShow}
            {shouldType && !done && (
              <span className="inline-block w-0.5 h-3 bg-zinc-400 ml-1 animate-pulse rounded-sm" />
            )}
          </div>
        )}

        {msg.type === 'voice_note' && (
          <VoiceNoteBubble
            audioUrl={msg.audioUrl || msg.content}
            duration={msg.duration}
            transcript={msg.transcript || msg.content}
            senderName={persona.name}
            isPersona={true}
          />
        )}

        {msg.type === 'loading' && (
          <GeneratingProgressBubble 
            msgId={msg.id}
            label={msg.content} 
            onCancel={onCancelGeneration} 
          />
        )}

        {msg.type === 'image' && (
          <div className="rounded-2xl rounded-tl-sm overflow-hidden border border-white/[0.12] max-w-[340px] sm:max-w-[380px] bg-[#141822] shadow-xl group">
            <div 
              className="relative cursor-pointer overflow-hidden bg-black/40"
              onClick={() => onImageClick?.(msg.content, msg.prompt)}
              title="Click to view full screen, upscale & edit"
            >
              <img
                src={msg.content}
                alt="Generated photoshoot"
                className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                onError={e => { (e.target as HTMLImageElement).alt = 'Failed to load image'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/85 text-white text-xs font-bold backdrop-blur-md shadow-2xl border border-[#E7C477]/40 transform group-hover:scale-105 transition-transform">
                  <Maximize2 size={14} className="text-[#F2D58D]" /> Fullscreen Studio & Upscale
                </span>
              </div>
            </div>
            <div className="bg-[#10141D] px-3 py-2 flex items-center justify-between gap-1.5 border-t border-white/[0.08] flex-wrap">
              {/* Set as Persona Primary Reference Button */}
              {onSetAsPrimaryReference && (
                <button
                  type="button"
                  onClick={() => onSetAsPrimaryReference(msg.content)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${
                    persona.referenceImage === msg.content || persona.avatar === msg.content
                      ? 'bg-[#E7C477]/25 border border-[#E7C477]/70 text-[#F2D58D]'
                      : 'bg-[#E7C477]/10 hover:bg-[#E7C477]/25 text-[#F2D58D] border border-[#E7C477]/30 hover:border-[#E7C477]/60'
                  }`}
                  title="Set this image as the persona's primary reference photo"
                >
                  <Sparkles size={10} className="text-[#E7C477]" />
                  <span>
                    {persona.referenceImage === msg.content || persona.avatar === msg.content ? '👑 Primary Lock' : 'Set as Primary'}
                  </span>
                </button>
              )}

              <button
                onClick={() => onImageClick?.(msg.content, msg.prompt)}
                className="flex items-center gap-1 text-[#F2D58D] hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border border-white/10"
                title="Open Studio (Upscale, Edit, Download)"
              >
                <Maximize2 size={11} className="text-[#E7C477]" />
                <span>Fullscreen</span>
              </button>

              {/* Instant Talking Head Video Generator */}
              <button
                onClick={() => onGenerateTalkingVideo?.(msg)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 text-[10px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Create an animated talking video from this photo"
              >
                <Film size={10} className="text-violet-400" />
                <span>Talking Video</span>
              </button>

              <button
                onClick={() => onSaveToVault(msg)}
                disabled={isSaving || isSaved}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                  isSaved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 border border-white/[0.08]'
                }`}
              >
                {isSaving ? <Loader2 size={10} className="animate-spin" /> : isSaved ? <Check size={10} /> : <Bookmark size={10} />}
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {msg.type === 'video' && (
          <div className="rounded-2xl rounded-tl-sm overflow-hidden border border-white/[0.08] max-w-sm bg-[#16171b] shadow-md">
            <video src={msg.content} controls autoPlay loop muted playsInline className="w-full max-h-[380px]" />
            <div className="bg-[#121316] px-3.5 py-2 flex items-center justify-between gap-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <Video size={12} className="text-zinc-400" />
                <span className="text-[11px] font-medium text-zinc-400">Generated Clip</span>
              </div>
              <button
                onClick={() => onSaveToVault(msg)}
                disabled={isSaving || isSaved}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  isSaved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 border border-white/[0.08]'
                }`}
              >
                {isSaving ? <Loader2 size={10} className="animate-spin" /> : isSaved ? <Check size={10} /> : <Bookmark size={10} />}
                {isSaved ? 'Saved' : 'Save to Vault'}
              </button>
            </div>
          </div>
        )}

        {msg.type === 'error' && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-start gap-2">
            <AlertCircle size={14} className="text-rose-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-rose-300">{msg.content}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
