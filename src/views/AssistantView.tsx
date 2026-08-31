import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, ChevronDown, ImageIcon, Video, Loader2, AlertCircle, Camera, MessageSquareQuote, Copy, Bookmark, Check, Phone, PhoneOff, Volume2, VolumeX, Mic, MicOff, RotateCcw, Trash2, Plus, Upload, Music, Film, X, Play, Sparkles, Paperclip, FileText, SlidersHorizontal, Settings, Hand, Maximize2, Download, Shirt, Heart, Pencil, BookOpen, ShieldCheck, Brain, Pin, Search, ArrowUpCircle, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Persona, NavActions, RelationshipState } from '../types';
import { ModelInfo, authFetch, fetchAllModelTypes, textToSpeech } from '../services/imageService';
import { requestPersonaMediaJob, talkingAvatarJob, type MediaJob } from '../services/mediaJobService';
import { cn } from '../utils/cn';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';
import ImageLightboxModal, {
  type AnimateImageInput,
  type ImageStudioMode,
  type ImageStudioVersionResult,
  type MediaStudioResult,
  type TalkingAvatarInput,
} from '../components/ImageLightboxModal';
import PersonaReferenceModal from '../components/PersonaReferenceModal';
import VoiceNoteBubble from '../components/VoiceNoteBubble';
import PersonaAvatar from '../components/PersonaAvatar';
import MediaJobCenter from '../components/MediaJobCenter';
import { getCreatorProfile } from '../utils/creatorProfile';
import { accountLocalStorage } from '../utils/accountStorage';
import {
  archiveConversationRecords,
  clearConversationHistory,
  deleteConversationRecord,
  loadConversationArchive,
  loadConversationContext,
  loadRecentConversation,
  mergeUniqueConversationRecords,
  migrateRecentConversationToArchive,
  saveRecentConversation,
  searchConversationMemories,
  type ConversationRecord,
} from '../utils/conversationContinuity';
import {
  addPersonaMemoryNote,
  buildRecentConversationSummary,
  deletePersonaMemoryNote,
  loadPersonaMemoryNotes,
  togglePersonaMemoryPinned,
  updatePersonaMemoryNote,
  type PersonaMemoryNote,
} from '../utils/personaMemory';
import { resolveMediaModelFromPrompt } from '../utils/mediaModelResolver';
import { resolveImageRevisionContext, type GeneratedImageMessage } from '../utils/mediaRevisionContext';
import {
  VOICE_IDENTITY_ONBOARDING_STORAGE_KEY,
  VOICE_IDENTITY_STORAGE_KEY,
  createVoiceIdentityProfile,
  extractVoiceFeatureVector,
  isEnrolledSpeaker,
  parseVoiceIdentityProfile,
  scoreVoiceIdentity,
  shouldOfferVoiceIdentitySetup,
  type VoiceIdentityProfile,
} from '../utils/voiceIdentity';
import {
  VOICE_ACCURACY_STORAGE_KEY,
  addVoiceTerms,
  applyVoiceCorrections,
  buildVoiceKeyterms,
  deriveCalibrationCorrections,
  isDuplicateVoiceTranscript,
  needsVoiceConfirmation,
  parseVoiceAccuracyProfile,
  saveVoiceCorrection,
  type VoiceAccuracyProfile,
} from '../utils/voiceAccuracy';
import {
  drainSseData,
  isLikelyPersonaEcho,
  shouldInterruptPersonaSpeech,
  summarizeVoiceLatency,
  takeSpeakableSpeechChunk,
  type VoiceLatencySnapshot,
  type VoiceTurnTiming,
} from '../utils/voiceStability';
import { buildVoiceConversationHistory } from '../../shared/voiceConversationContext';
import { CommitStrategy, RealtimeEvents, Scribe, type RealtimeConnection } from '@elevenlabs/client';

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

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!copied) throw new Error('Clipboard access was denied');
}

async function copyImageBlobToClipboard(imageUrl: string) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined' || !window.isSecureContext) {
    throw new Error('Image clipboard is not available');
  }

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error('Could not load the generated image');
  const sourceBlob = await response.blob();
  let clipboardBlob = sourceBlob;

  if (sourceBlob.type !== 'image/png') {
    const bitmap = await createImageBitmap(sourceBlob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare image for clipboard');
    context.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    clipboardBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not prepare PNG image')), 'image/png');
    });
  }

  await navigator.clipboard.write([
    new ClipboardItem({ [clipboardBlob.type || 'image/png']: clipboardBlob }),
  ]);
}

// ── localStorage helpers ──────────────────────────────────
const USER_NAME_KEY = 'persona_user_name';

const INVALID_NAMES = new Set([
  'allowing', 'serious', 'asking', 'done', 'trying', 'thinking', 'looking', 
  'curious', 'wondering', 'sure', 'here', 'just', 'ready', 'happy', 'glad',
  'user', 'khalil', 'admin', 'anonymous', 'null', 'undefined', 'not', 'no',
  'yes', 'sending', 'an', 'a', 'the', 'actually', 'playing', 'talking', 'fine',
  'right', 'wrong', 'good', 'bad', 'ok', 'okay', 'busy', 'bored', 'tired'
]);

export function getStoredUserName(): string {
  try {
    const stored = accountLocalStorage.getItem(USER_NAME_KEY);
    if (!stored || INVALID_NAMES.has(stored.toLowerCase().trim())) {
      accountLocalStorage.setItem(USER_NAME_KEY, 'Dr. H');
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
        accountLocalStorage.setItem(USER_NAME_KEY, clean);
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

  // Preserve the user's actual wording. Broad phonetic substitutions used to
  // turn valid words into rhyming alternatives and could silently change a
  // generation request.
  corrected = corrected.replace(/\s+/g, ' ').trim();

  return corrected;
}

function loadHistory(personaId: string): ChatMessage[] {
  return loadRecentConversation(personaId).map(record => {
    const timestamp = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
    if (record.type === 'loading') {
      return {
        ...record,
        type: 'error',
        content: 'That generation was interrupted before the result returned. Open the source media and try the action again.',
        timestamp,
      };
    }
    return { ...record, timestamp };
  }) as ChatMessage[];
}

function saveHistory(personaId: string, msgs: ChatMessage[]) {
  saveRecentConversation(personaId, msgs as ConversationRecord[]);
}

function loadPersonaMemories(personaId: string): string[] {
  return loadPersonaMemoryNotes(personaId, getDefaultPersonaMemoryFacts()).map(note => note.text).slice(0, 30);
}

function getDefaultPersonaMemoryFacts(): string[] {
  const userName = getStoredUserName();
  return [
    `User's name is ${userName}`,
    `${userName} is the creator and close partner of this persona`,
    'Values authentic conversation, wit, and intellectual depth',
    'Enjoys playful teasing, spontaneous photo generation, and deep banter',
  ];
}

function savePersonaMemory(personaId: string, memoryText: string) {
  try {
    const trimmed = memoryText.trim();
    if (!trimmed) return;

    // Generation instructions are conversation turns, not durable personal
    // facts. Saving them as memories made old one-time requests reappear in
    // unrelated future calls.
    if (/\b(?:send|show|take|snap|generate|create|make|render|record|edit|change|remove|undress|strip)\b[\s\S]{0,80}\b(?:image|photo|picture|selfie|video|clip|clothes|nude|naked|topless)\b/i.test(trimmed)) {
      return;
    }

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

    addPersonaMemoryNote(personaId, trimmed, 'automatic', getDefaultPersonaMemoryFacts());
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

interface ChatAttachment {
  url: string;
  type: 'image' | 'video' | 'file';
  name?: string;
  base64?: string;
  sourceMessageId?: string;
  sourceImageUrl?: string;
  sourcePrompt?: string;
  sourceRootPrompt?: string;
  sourceRevisionHistory?: string[];
  sourceParticipants?: string[];
  sourceModelId?: string;
  sourceModelName?: string;
}

interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: Date;
  attachment?: ChatAttachment;
  prompt?: string;
  rootPrompt?: string;
  revisionHistory?: string[];
  parentMediaId?: string;
  participants?: string[];
  modelId?: string;
  modelName?: string;
  audioUrl?: string;
  duration?: number;
  transcript?: string;
  source?: 'voice' | 'text' | 'system';
  rawContent?: string;
}

interface CallTranscriptItem {
  id: string;
  role: 'user' | 'persona';
  type?: 'text' | 'image' | 'video' | 'loading' | 'error';
  content: string;
  prompt?: string;
  rootPrompt?: string;
  revisionHistory?: string[];
  parentMediaId?: string;
  participants?: string[];
  modelId?: string;
  modelName?: string;
  source?: 'voice' | 'typed';
  rawContent?: string;
}

function getAttachmentRevisionSource(attachment?: ChatAttachment | null): GeneratedImageMessage | undefined {
  if (!attachment?.sourceMessageId || !attachment.sourceImageUrl) return undefined;
  return {
    id: attachment.sourceMessageId,
    role: 'persona',
    type: 'image',
    content: attachment.sourceImageUrl,
    prompt: attachment.sourcePrompt,
    rootPrompt: attachment.sourceRootPrompt,
    revisionHistory: attachment.sourceRevisionHistory,
    participants: attachment.sourceParticipants,
    modelId: attachment.sourceModelId,
    modelName: attachment.sourceModelName,
  };
}

const VOICE_CALIBRATION_SENTENCES = [
  'Generate an image of Leen Hassan and Rawan Hassan using Seedream 5.0 Pro.',
  'Create a video of Dr. H using Seedance 2.5 from Wavespeed.',
  'Use GPT Image 2 or Qwen 3.0 Pro for this request.',
];

const VOICE_CALIBRATION_TERMS = [
  'Leen Hassan',
  'Rawan Hassan',
  'Dr. H',
  'Seedream 5.0 Pro',
  'Seedance 2.5',
  'Wavespeed',
  'GPT Image 2',
  'Qwen 3.0 Pro',
];

function detectIncompleteMediaCreationRequest(message: string): 'image' | 'video' | undefined {
  const match = message.trim().match(
    /\b(?:generate|create|make|render|produce)\s+(?:me\s+)?(?:(?:a|an|the|some|another|new)\s+)*(image|photo|picture|pic|portrait|video|clip|reel|animation)\b([\s\S]*)$/i,
  );
  if (!match) return undefined;

  const remainder = String(match[2] || '')
    .toLowerCase()
    .replace(/[.,!?;:]+/g, ' ')
    .replace(/\b(?:please|for me|for us|right now|now|quickly|real quick|if you can|if you could)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (remainder && !/^(?:of|with|showing|featuring)$/.test(remainder)) return undefined;
  return /^(?:video|clip|reel|animation)$/i.test(match[1]) ? 'video' : 'image';
}

function detectIntent(message: string): 'image' | 'video' | 'chat' {
  const lower = message.toLowerCase().trim();

  // 1. Strict conversational override: Genuine questions, complaints, or discussions about media are ALWAYS chat
  const isConversationalRemark = /(?:why did you send|why are you sending|why do you keep sending|stop sending (?:photos|pics|images|videos|selfies)|don't send (?:photos|pics|images)|not asking for (?:a |an )?(?:photo|image|picture|video)|didn't ask for (?:a |an )?(?:photo|image|picture|video)|why is there (?:a |an )?(?:photo|image)|what is that (?:photo|image|picture)|did you like (?:that|the) (?:photo|image|picture)|talk about something else|let's just talk|let's chat without photos)\b/i.test(lower) ||
    /(?:while generating|about that photo|about this photo|look at the photo|what do you think of the photo|let's talk about something else|let's just chat|keep talking|continue talking)\b/i.test(lower);
  if (isConversationalRemark) return 'chat';
  if (detectIncompleteMediaCreationRequest(message)) return 'chat';

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
  { id: 'eleven_flash_v2_5', name: 'ElevenLabs Flash 2.5', badge: 'Ultra Fast (~75ms)', desc: 'Lowest-latency voice calls (Recommended)' },
  { id: 'eleven_turbo_v2_5', name: 'ElevenLabs Turbo 2.5', badge: 'Fast (~250ms)', desc: 'Rich human tone and nuance' },
  { id: 'cartesia-sonic', name: 'Cartesia Sonic', badge: 'Extreme Speed (~90ms)', desc: 'Fastest conversational turn-taking' },
  { id: 'eleven_multilingual_v2', name: 'ElevenLabs Multilingual v2', badge: 'Expressive (~800ms)', desc: 'High cinematic emotion' },
];

export const PERSONA_VOICE_CHARACTERS = [
  { id: 'W4ynDvR6NFiK8lj2I8iL', name: 'Rawan Hasan (Cloned Voice)', gender: 'Female' },
  { id: 'mnuSAY5SCPZ0NUF04SUe', name: 'Rawan Hasan (Alternate Clone)', gender: 'Female' },
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
  if (!persona) return { voiceId: 'W4ynDvR6NFiK8lj2I8iL', voiceReference: undefined };
  const name = (persona.name || '').toLowerCase();
  let voiceId = persona.voiceId;
  const staleRawanVoice = name.includes('rawan') && [
    'ov7JSkufAlSs386OYTaC',
    'FkiPCg9ZhlwLIOml7TKM',
    'bEp1nJ6RU85e3wsylRfE',
  ].includes(voiceId || '');
  
  if (!voiceId || voiceId === 'default' || voiceId === 'female_default' || staleRawanVoice || (name.includes('leen') && (voiceId === 'ov7JSkufAlSs386OYTaC' || voiceId === 'W4ynDvR6NFiK8lj2I8iL'))) {
    if (name.includes('leen')) {
      voiceId = '7jFje9BJoTWzqZzouT0j';
    } else if (name.includes('rawan')) {
      voiceId = 'W4ynDvR6NFiK8lj2I8iL';
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
      voiceId = 'W4ynDvR6NFiK8lj2I8iL';
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
  const [voiceLlmModel, setVoiceLlmModel] = useState<string>(() => {
    const savedModel = localStorage.getItem('agent_voice_llm');
    const userSelectedModel = localStorage.getItem('agent_voice_llm_user_selected') === '1';

    // Existing installs defaulted to Gemini. Migrate that inherited default once
    // so persona chat uses the adult-friendly roleplay engine without overriding
    // a model the creator deliberately selected.
    if (!userSelectedModel && (!savedModel || savedModel === 'gemini')) {
      localStorage.setItem('agent_voice_llm', 'venice');
      return 'venice';
    }

    return savedModel || 'venice';
  });
  const [selectedVoiceEngine, setSelectedVoiceEngine] = useState<string>(() => localStorage.getItem('agent_voice_engine') || 'eleven_flash_v2_5');

  const handleVoiceEngineChange = (engineId: string) => {
    setSelectedVoiceEngine(engineId);
    localStorage.setItem('agent_voice_engine', engineId);
    const found = VOICE_CALL_ENGINES.find(e => e.id === engineId);
    if (found) {
      toast.success(`Voice Engine set to ${found.name}`);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(propActivePersona.id));
  const messagesRef = useRef<ChatMessage[]>(messages);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingMsgId, setSavingMsgId] = useState<string | null>(null);
  const [savedMsgIds, setSavedMsgIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [activeSegment, setActiveSegment] = useState<'chat' | 'replies'>('chat');
  const [replyInput, setReplyInput] = useState('');
  const [generatedReplies, setGeneratedReplies] = useState<string[]>([]);
  const [showEngineSettings, setShowEngineSettings] = useState(false);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [showMemoryCenter, setShowMemoryCenter] = useState(false);
  const [showMediaJobCenter, setShowMediaJobCenter] = useState(false);
  const [memoryNotes, setMemoryNotes] = useState<PersonaMemoryNote[]>([]);
  const [memoryActivity, setMemoryActivity] = useState<ConversationRecord[]>([]);
  const [memorySearch, setMemorySearch] = useState('');
  const [newMemoryDraft, setNewMemoryDraft] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryDraft, setEditingMemoryDraft] = useState('');

  // ── Multimodal Media Attachment States ──────────────────
  const [chatAttachment, setChatAttachment] = useState<ChatAttachment | null>(null);
  const [copiedGeneratedImage, setCopiedGeneratedImage] = useState<(GeneratedImageMessage & { copiedAt: number }) | null>(null);
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

  const handleCopyGeneratedImage = async (msg: ChatMessage) => {
    if (msg.type !== 'image' || !msg.content) return;
    setCopiedGeneratedImage({
      id: msg.id,
      role: msg.role,
      type: msg.type,
      content: msg.content,
      prompt: msg.prompt,
      rootPrompt: msg.rootPrompt,
      revisionHistory: msg.revisionHistory,
      participants: msg.participants,
      modelId: msg.modelId,
      modelName: msg.modelName,
      copiedAt: Date.now(),
    });

    try {
      await copyImageBlobToClipboard(msg.content);
    } catch {
      // Cross-origin image hosts do not always expose their bytes to the
      // browser. Copying the URL still gives the paste handler a reliable
      // app-internal fallback for this exact generated image.
      await copyTextToClipboard(msg.content).catch(() => undefined);
    }
    toast.success('Image copied — paste it into the prompt to modify it');
  };

  const handleChatPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const recentCopiedImage = copiedGeneratedImage && Date.now() - copiedGeneratedImage.copiedAt < 2 * 60 * 1000
      ? copiedGeneratedImage
      : null;
    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const imageItem = clipboardItems.find(item => item.type.startsWith('image/'));
    const pastedImage = imageItem?.getAsFile();
    const pastedText = event.clipboardData?.getData('text/plain')?.trim();
    const isInternalImageUrl = Boolean(recentCopiedImage?.content && pastedText === recentCopiedImage.content);

    if (!pastedImage && !isInternalImageUrl) return;
    event.preventDefault();

    try {
      const base64 = pastedImage
        ? await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(pastedImage);
          })
        : recentCopiedImage!.content!;
      const source = recentCopiedImage;
      setChatAttachment({
        url: source?.content || base64,
        base64,
        type: 'image',
        name: source ? 'Copied generated image' : pastedImage?.name || 'Pasted image',
        sourceMessageId: source?.id,
        sourceImageUrl: source?.content,
        sourcePrompt: source?.prompt,
        sourceRootPrompt: source?.rootPrompt,
        sourceRevisionHistory: source?.revisionHistory,
        sourceParticipants: source?.participants,
        sourceModelId: source?.modelId,
        sourceModelName: source?.modelName,
      });
      setLastUploadedReference(base64);
      toast.success('Image pasted — type the change you want');
    } catch {
      toast.error('Could not paste that image');
    }
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
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'thinking' | 'speaking' | 'listening' | 'disconnected'>('disconnected');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [callTranscript, setCallTranscript] = useState<CallTranscriptItem[]>([]);
  const callTranscriptRef = useRef<CallTranscriptItem[]>([]);
  const [activeCallMedia, setActiveCallMedia] = useState<{ type: 'image' | 'video'; url: string; prompt?: string; messageId?: string } | null>(null);
  const [fullScreenModalMedia, setFullScreenModalMedia] = useState<{ type: 'image' | 'video'; url: string; prompt?: string } | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; prompt?: string; initialMode?: ImageStudioMode } | null>(null);
  const [voiceAccuracyProfile, setVoiceAccuracyProfile] = useState<VoiceAccuracyProfile>(() =>
    parseVoiceAccuracyProfile(accountLocalStorage.getItem(VOICE_ACCURACY_STORAGE_KEY)),
  );
  const voiceAccuracyProfileRef = useRef(voiceAccuracyProfile);
  const [voiceIdentityProfile, setVoiceIdentityProfile] = useState<VoiceIdentityProfile | null>(() =>
    parseVoiceIdentityProfile(accountLocalStorage.getItem(VOICE_IDENTITY_STORAGE_KEY)),
  );
  const voiceIdentityProfileRef = useRef<VoiceIdentityProfile | null>(voiceIdentityProfile);
  const [voiceEnrollmentStatus, setVoiceEnrollmentStatus] = useState<'idle' | 'recording' | 'ready' | 'error'>(
    voiceIdentityProfile ? 'ready' : 'idle',
  );
  const [voiceEnrollmentSeconds, setVoiceEnrollmentSeconds] = useState(0);
  const [showSpeakerLockSetup, setShowSpeakerLockSetup] = useState(false);
  const [ignoredSpeakerCount, setIgnoredSpeakerCount] = useState(0);
  const [lastSpeakerMatchScore, setLastSpeakerMatchScore] = useState<number | null>(null);
  const voiceFeatureFramesRef = useRef<Array<{ at: number; vector: number[] }>>([]);
  const voiceEnrollmentFramesRef = useRef<number[][]>([]);
  const voiceEnrollmentActiveRef = useRef(false);
  const voiceEnrollmentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceEnrollmentFinishRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceUtteranceStartedAtRef = useRef<number | null>(null);
  const lastVoiceFeatureCaptureAtRef = useRef(0);
  const [showVoiceAccuracyPanel, setShowVoiceAccuracyPanel] = useState(false);
  const [editingVoiceTranscriptId, setEditingVoiceTranscriptId] = useState<string | null>(null);
  const [voiceCorrectionDraft, setVoiceCorrectionDraft] = useState('');
  const [manualHeardDraft, setManualHeardDraft] = useState('');
  const [manualIntendedDraft, setManualIntendedDraft] = useState('');
  const [calibrationStep, setCalibrationStep] = useState<number | null>(null);
  const calibrationStepRef = useRef<number | null>(null);
  const [calibrationCapture, setCalibrationCapture] = useState<{
    heard: string;
    intended: string;
    corrections: Array<{ heard: string; intended: string }>;
  } | null>(null);
  const [pendingVoiceConfirmation, setPendingVoiceConfirmation] = useState<string | null>(null);
  const [lastVoiceLatency, setLastVoiceLatency] = useState<VoiceLatencySnapshot | null>(null);
  const voiceSpeechStartedAtRef = useRef<number | null>(null);
  const browserPendingTranscriptRef = useRef<{ text: string; updatedAt: number }>({ text: '', updatedAt: 0 });

  const updateVoiceAccuracyProfile = useCallback((
    updater: (current: VoiceAccuracyProfile) => VoiceAccuracyProfile,
  ) => {
    setVoiceAccuracyProfile(current => {
      const next = updater(current);
      voiceAccuracyProfileRef.current = next;
      accountLocalStorage.setItem(VOICE_ACCURACY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    voiceAccuracyProfileRef.current = voiceAccuracyProfile;
  }, [voiceAccuracyProfile]);

  useEffect(() => {
    voiceIdentityProfileRef.current = voiceIdentityProfile;
  }, [voiceIdentityProfile]);

  useEffect(() => {
    calibrationStepRef.current = calibrationStep;
  }, [calibrationStep]);

  useEffect(() => {
    callTranscriptRef.current = callTranscript;
  }, [callTranscript]);

  const handlePersistStudioImageVersion = (newUrl: string, result: ImageStudioVersionResult) => {
    const source = [...messagesRef.current]
      .reverse()
      .find(message => message.type === 'image' && message.content === result.sourceUrl);
    const revisionNote = result.kind === 'upscale'
      ? 'Created a separate HD-upscaled version.'
      : result.prompt;

    addMessage({
      role: 'persona',
      type: 'image',
      content: newUrl,
      prompt: result.kind === 'upscale' ? source?.prompt || result.prompt : result.prompt,
      rootPrompt: source?.rootPrompt || source?.prompt || result.prompt,
      revisionHistory: [...(source?.revisionHistory || []), revisionNote].slice(-8),
      parentMediaId: source?.id,
      participants: source?.participants,
      modelId: source?.modelId,
      modelName: result.model || source?.modelName,
      source: 'text',
    });

    setActiveCallMedia({ type: 'image', url: newUrl, prompt: result.prompt });
  };

  const handleRecoveredMediaJob = (job: MediaJob) => {
    const result = job.result;
    if (!result?.url || (job.personaClientId && job.personaClientId !== activePersona.id)) return;
    const type = job.kind === 'video' || job.kind === 'avatar' || result.type === 'video' ? 'video' : 'image';
    addMessage({
      role: 'persona',
      type,
      content: result.url,
      prompt: result.promptUsed || job.summary,
      participants: result.participants,
      modelName: result.model,
      source: 'text',
    });
    setActiveCallMedia({ type, url: result.url, prompt: result.promptUsed || job.summary });
  };

  const handleOpenMediaJobResult = (job: MediaJob) => {
    if (!job.result?.url) return;
    if (job.kind === 'video' || job.kind === 'avatar' || job.result.type === 'video') {
      setFullScreenModalMedia({ type: 'video', url: job.result.url, prompt: job.summary });
    } else {
      setLightboxMedia({ url: job.result.url, prompt: job.summary });
    }
    setShowMediaJobCenter(false);
  };

  // ── Relationship & Mood State ─────────────────────────────
  const [relationshipState, setRelationshipState] = useState<RelationshipState>(() => {
    try {
      const raw = accountLocalStorage.getItem(`persona_relationship_${propActivePersona.id}`);
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
      accountLocalStorage.setItem(`persona_relationship_${selectedPersonaId}`, JSON.stringify(updated));
    } catch {}
  };

  // ── Talking Head Video & Voice Note Handlers ──────────────
  const handleAnimateImageFromStudio = async (input: AnimateImageInput): Promise<MediaStudioResult> => {
    const loadingId = addMessage({
      role: 'persona',
      type: 'loading',
      content: `Animating this image with ${activePersona.name}...`,
      prompt: input.prompt,
      source: 'text',
    });

    try {
      const result = await requestPersonaMediaJob({
        type: 'video',
        persona: activePersona,
        prompt: input.prompt,
        imageModelId: selectedEditModelId || 'wavespeed:bytedance/seedream-v5.0-pro',
        videoModelId: selectedVideoModelId || 'wavespeed-i2v:bytedance/seedance-2-mini',
        referenceImage: input.imageUrl,
        aspectRatio: input.aspectRatio,
        allowNsfw: true,
        creatorProfile: getCreatorProfile(),
      });

      const resultText = result.message || `Done — I animated that image with ${activePersona.name}.`;
      replaceMessage(loadingId, { type: 'text', content: resultText });
      addMessage({
        role: 'persona',
        type: 'video',
        content: result.url!,
        prompt: result.promptUsed || input.prompt,
        modelName: result.model,
        source: 'text',
      });

      return {
        url: result.url!,
        model: result.model,
        prompt: result.promptUsed || input.prompt,
      };
    } catch (error: any) {
      const message = error?.message || 'I could not animate that image.';
      replaceMessage(loadingId, { type: 'error', content: message });
      throw new Error(message);
    }
  };

  const handleCreateTalkingAvatarFromStudio = async (input: TalkingAvatarInput): Promise<MediaStudioResult> => {
    const loadingId = addMessage({
      role: 'persona',
      type: 'loading',
      content: `Creating ${activePersona.name}'s talking avatar...`,
      prompt: input.script,
      source: 'text',
    });

    try {
      if (!activePersona.voiceId) {
        throw new Error(`${activePersona.name} does not have a selected voice yet. Choose a voice in Persona Studio, then try again.`);
      }

      let audioUrl: string;
      try {
        const configuredVoiceEngine = activePersona.voiceEngine;
        const voiceEngine = configuredVoiceEngine === 'openai' || configuredVoiceEngine === 'gemini'
          ? configuredVoiceEngine
          : 'elevenlabs';
        const speech = await textToSpeech({
          text: input.script,
          voiceName: activePersona.name,
          voiceId: activePersona.voiceId,
          engine: voiceEngine,
        });
        audioUrl = speech.audioUrl;
      } catch (voiceError) {
        console.warn('[TalkingAvatar] Persona voice synthesis failed:', voiceError);
        throw new Error(`I couldn't synthesize ${activePersona.name}'s selected voice. Check the voice provider and try again.`);
      }

      const result = await talkingAvatarJob(activePersona.id, {
        portraitImage: input.imageUrl,
        audioUrl,
        script: input.script,
        voiceName: activePersona.voiceId || 'Kore',
        engine: 'wavespeed',
        model: 'wavespeed-ai/ai-talking-photos',
      });

      const resultText = `Done — ${activePersona.name}'s talking avatar is ready.`;
      replaceMessage(loadingId, { type: 'text', content: resultText });
      addMessage({
        role: 'persona',
        type: 'video',
        content: result.videoUrl,
        prompt: input.script,
        modelName: result.model,
        source: 'text',
      });

      return { url: result.videoUrl, model: result.model, prompt: input.script };
    } catch (error: any) {
      const message = error?.message || 'I could not create that talking avatar.';
      replaceMessage(loadingId, { type: 'error', content: message });
      throw new Error(message);
    }
  };

  const handleGenerateTalkingVideo = (imageMsg: ChatMessage) => {
    if (!imageMsg.content) return;
    setLightboxMedia({
      url: imageMsg.content,
      prompt: imageMsg.prompt,
      initialMode: 'avatar',
    });
  };

  const handleSendVoiceNoteRequest = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    const loadingId = uid();
    addMessage({ role: 'persona', type: 'loading', content: `Recording voice note for you...` });
    try {
      const res = await authFetch('/api/chat', {
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
      
      const vnRes = await authFetch('/api/generate-voice-note', {
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
  const speechRecognitionSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scribeConnectionRef = useRef<RealtimeConnection | null>(null);
  const scribeStartPromiseRef = useRef<Promise<boolean> | null>(null);
  const scribeReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedTranscriptRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const scribeFailureCountRef = useRef(0);
  const callTurnIdRef = useRef(0);
  const recentPersonaSpeechRef = useRef<{ text: string; expiresAt: number }>({ text: '', expiresAt: 0 });
  const bargeInEnergyUntilRef = useRef(0);

  const vadStreamRef = useRef<MediaStream | null>(null);
  const vadAudioCtxRef = useRef<AudioContext | null>(null);
  const vadAnimFrameRef = useRef<number | null>(null);
  const personaSpeakingStartTimeRef = useRef<number>(0);

  // ── Adaptive Acoustic Echo-Cancelled VAD Interruption Monitor ───
  const startVadInterruptionMonitor = async (allowOutsideCall = false): Promise<boolean> => {
    if (vadAudioCtxRef.current) return true;
    if (!isCallActiveRef.current && !allowOutsideCall) return false;
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
      if (!AudioContextClass) {
        stream.getTracks().forEach(track => track.stop());
        vadStreamRef.current = null;
        return false;
      }
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
        if ((!isCallActiveRef.current && !voiceEnrollmentActiveRef.current) || !vadAudioCtxRef.current) return;

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

        // Capture a compact spectral signature while someone is speaking.
        // Only feature vectors are retained; microphone audio never leaves
        // this analyser or gets stored in the speaker profile.
        const now = Date.now();
        const featureThreshold = Math.max(
          voiceEnrollmentActiveRef.current ? 0.045 : 0.07,
          dynamicNoiseFloor + 0.015,
        );
        if (avgEnergy > featureThreshold && now - lastVoiceFeatureCaptureAtRef.current >= 45) {
          const vector = extractVoiceFeatureVector(buffer, ctx.sampleRate, analyser.fftSize);
          if (vector) {
            lastVoiceFeatureCaptureAtRef.current = now;
            voiceFeatureFramesRef.current.push({ at: now, vector });
            voiceFeatureFramesRef.current = voiceFeatureFramesRef.current.filter(frame => frame.at >= now - 7000);
            if (voiceEnrollmentActiveRef.current) {
              voiceEnrollmentFramesRef.current.push(vector);
            }
          }
        }

        // If the persona is actively speaking, detect user vocal barge-in immediately
        if (isAgentSpeakingRef.current) {
          // Adapt smoothly to ambient room noise
          dynamicNoiseFloor = dynamicNoiseFloor * 0.92 + avgEnergy * 0.08;

          // Sensitive vocal threshold with hardware echoCancellation
          const speechThreshold = Math.max(0.11, dynamicNoiseFloor + 0.06);
          const timeSinceStart = Date.now() - personaSpeakingStartTimeRef.current;

          // Energy alone cannot distinguish a real interruption from the persona
          // coming back through laptop speakers. Use it only as a short-lived
          // confidence signal; the transcript still has to be non-echo speech.
          if (timeSinceStart > 200 && avgEnergy > speechThreshold) {
            sustainedSpeechFrames++;
            if (sustainedSpeechFrames >= 4) {
              bargeInEnergyUntilRef.current = Date.now() + 750;
              sustainedSpeechFrames = 0;
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
      return true;
    } catch (err) {
      console.warn('[VAD] Could not initialize voice interruption monitor:', err);
      if (vadAudioCtxRef.current) {
        try { vadAudioCtxRef.current.close(); } catch {}
        vadAudioCtxRef.current = null;
      }
      if (vadStreamRef.current) {
        vadStreamRef.current.getTracks().forEach(track => track.stop());
        vadStreamRef.current = null;
      }
      return false;
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

  function commitRecognizedVoiceTranscript(rawTranscript: string) {
    const phoneticCorrection = correctSpeechPhonetics(rawTranscript, activePersona?.name);
    const corrected = applyVoiceCorrections(
      phoneticCorrection,
      voiceAccuracyProfileRef.current.corrections,
    );
    if (!corrected) return;

    const transcriptCommittedAt = performance.now();
    const speechStartedAt = voiceSpeechStartedAtRef.current ?? transcriptCommittedAt;
    voiceSpeechStartedAtRef.current = null;
    const utteranceStartedAt = voiceUtteranceStartedAtRef.current ?? Date.now() - 4500;
    voiceUtteranceStartedAtRef.current = null;

    const activeCalibrationStep = calibrationStepRef.current;
    if (activeCalibrationStep !== null) {
      const intended = VOICE_CALIBRATION_SENTENCES[activeCalibrationStep];
      setCalibrationCapture({
        heard: rawTranscript,
        intended,
        corrections: deriveCalibrationCorrections(rawTranscript, intended),
      });
      setLiveUserSpeech('');
      setCallStatus('listening');
      return;
    }

    // Enrollment speech is used only to build the local profile; it should not
    // become a chat turn or trigger persona actions.
    if (voiceEnrollmentActiveRef.current) {
      setLiveUserSpeech('');
      setCallStatus('listening');
      return;
    }

    const identityProfile = voiceIdentityProfileRef.current;
    if (identityProfile?.enabled) {
      const candidateVectors = voiceFeatureFramesRef.current
        .filter(frame => frame.at >= utteranceStartedAt - 120 && frame.at <= Date.now() + 120)
        .map(frame => frame.vector);
      const score = scoreVoiceIdentity(identityProfile, candidateVectors);
      setLastSpeakerMatchScore(score);
      const enrolledSpeaker = isEnrolledSpeaker(identityProfile, candidateVectors);
      if (enrolledSpeaker === false) {
        setIgnoredSpeakerCount(count => count + 1);
        setLiveUserSpeech('');
        setCallStatus('listening');
        toast('Background speaker ignored', { icon: '🔒', duration: 1800, id: 'speaker-lock-ignored' });
        return;
      }
    }

    const now = Date.now();
    if (isDuplicateVoiceTranscript(corrected, lastCommittedTranscriptRef.current, now)) {
      console.log('[Voice Accuracy] Ignored a stale repeated transcript:', corrected);
      setLiveUserSpeech('');
      return;
    }
    lastCommittedTranscriptRef.current = { text: corrected, at: now };

    if (needsVoiceConfirmation(corrected)) {
      setPendingVoiceConfirmation(corrected);
      setCallInput(corrected);
      setLiveUserSpeech('');
      setCallStatus('listening');
      return;
    }

    setPendingVoiceConfirmation(null);
    setLiveUserSpeech('');
    if (isAgentSpeakingRef.current || voiceCallBusyRef.current) {
      interruptPersona();
    }
    void handleSendCallMessage(corrected, {
      rawTranscript,
      speechStartedAt,
      transcriptCommittedAt,
    });
  }

  const stopRealtimeTranscription = () => {
    if (scribeReconnectTimerRef.current) {
      clearTimeout(scribeReconnectTimerRef.current);
      scribeReconnectTimerRef.current = null;
    }
    const connection = scribeConnectionRef.current;
    scribeConnectionRef.current = null;
    scribeStartPromiseRef.current = null;
    if (connection) {
      try { connection.close(); } catch {}
    }
  };

  const startRealtimeTranscription = async (): Promise<boolean> => {
    if (scribeConnectionRef.current) return true;
    if (scribeStartPromiseRef.current) return scribeStartPromiseRef.current;

    const startPromise = (async () => {
      try {
        const tokenResponse = await authFetch('/api/agent/realtime-transcription-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const tokenData = await tokenResponse.json().catch(() => ({}));
        if (!tokenResponse.ok || !tokenData.token || !isCallActiveRef.current) {
          throw new Error(tokenData.error || 'Realtime transcription is unavailable');
        }

        const connection = Scribe.connect({
          token: tokenData.token,
          modelId: 'scribe_v2_realtime',
          commitStrategy: CommitStrategy.VAD,
          vadSilenceThresholdSecs: 0.95,
          vadThreshold: 0.42,
          minSpeechDurationMs: 80,
          minSilenceDurationMs: 180,
          languageCode: 'en',
          keyterms: buildVoiceKeyterms(voiceAccuracyProfileRef.current, [
            ...personas.map(persona => persona.name),
            activePersona?.name,
            getStoredUserName(),
            'send me',
            'show me',
            'generate',
            'image',
            'photo',
            'selfie',
            'video',
            'Seedream 5.0 Pro',
            'Seedance 2.5',
            'Wavespeed',
            'GPT Image 2',
            'Qwen 3.0 Pro',
          ].filter((term): term is string => Boolean(term))),
          filterBackgroundAudio: true,
          noVerbatim: false,
          microphone: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });

        scribeConnectionRef.current = connection;

        connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (event) => {
          if (!isCallActiveRef.current || isMutedRef.current) return;
          const partial = String(event.text || '').trim();
          if (!partial) return;

          const personaSpeech = getEchoReferenceSpeech();
          if (isLikelyPersonaEcho(partial, personaSpeech)) {
            return;
          }

          if (voiceSpeechStartedAtRef.current === null) {
            voiceSpeechStartedAtRef.current = performance.now();
            voiceUtteranceStartedAtRef.current = Date.now();
          }

          setLiveUserSpeech(partial);

          if (shouldInterruptPersonaSpeech(partial, {
            source: 'realtime',
            personaSpeech,
            personaIsSpeaking: isAgentSpeakingRef.current,
            responseIsPending: voiceCallBusyRef.current,
          })) {
            interruptPersona();
            setLiveUserSpeech(partial);
          }
        });

        connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (event) => {
          if (!isCallActiveRef.current || isMutedRef.current) return;
          const rawTranscript = String(event.text || '').trim();
          if (!rawTranscript) return;

          if (isLikelyPersonaEcho(rawTranscript, getEchoReferenceSpeech())) {
            setLiveUserSpeech('');
            return;
          }

          commitRecognizedVoiceTranscript(rawTranscript);
        });

        connection.on(RealtimeEvents.SESSION_STARTED, () => {
          scribeFailureCountRef.current = 0;
          if (isCallActiveRef.current && !isAgentSpeakingRef.current) {
            setCallStatus('listening');
          }
        });

        connection.on(RealtimeEvents.ERROR, (event) => {
          console.warn('[Realtime Transcription] Scribe error:', event);
        });

        connection.on(RealtimeEvents.CLOSE, () => {
          if (scribeConnectionRef.current === connection) {
            scribeConnectionRef.current = null;
          }
          if (!isCallActiveRef.current || isMutedRef.current) return;

          scribeFailureCountRef.current += 1;
          if (scribeFailureCountRef.current <= 2) {
            scribeReconnectTimerRef.current = setTimeout(() => {
              scribeStartPromiseRef.current = null;
              void startRealtimeTranscription();
            }, 350);
          } else {
            console.warn('[Realtime Transcription] Falling back to browser speech recognition');
            restartSpeechRecognition();
          }
        });

        return true;
      } catch (error) {
        console.warn('[Realtime Transcription] Could not start Scribe; using browser fallback:', error);
        scribeConnectionRef.current = null;
        return false;
      } finally {
        scribeStartPromiseRef.current = null;
      }
    })();

    scribeStartPromiseRef.current = startPromise;
    return startPromise;
  };

  const rememberPersonaSpeech = useCallback(() => {
    const spoken = currentPersonaSpeechRef.current.trim();
    if (spoken) {
      recentPersonaSpeechRef.current = {
        text: spoken,
        // Bluetooth and browser audio pipelines can deliver speaker echo late.
        expiresAt: Date.now() + 2800,
      };
    }
  }, []);

  const getEchoReferenceSpeech = useCallback(() => {
    const current = isAgentSpeakingRef.current ? currentPersonaSpeechRef.current.trim() : '';
    const recent = recentPersonaSpeechRef.current;
    const tail = recent.expiresAt > Date.now() ? recent.text : '';
    return `${current} ${tail}`.trim();
  }, []);

  const interruptPersona = useCallback(() => {
    console.log('[Interrupt] 🛑 Halting persona audio playback and cancelling in-flight request...');
    callTurnIdRef.current += 1;
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
    rememberPersonaSpeech();
    currentPersonaSpeechRef.current = '';
    isAgentSpeakingRef.current = false;
    voiceCallBusyRef.current = false;
    if (isCallActiveRef.current) {
      setCallStatus('listening');
      if (!scribeConnectionRef.current) {
        restartSpeechRecognition();
      }
    }
  }, [rememberPersonaSpeech]);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  const stopSpeechRecognition = () => {
    if (speechRecognitionSilenceTimerRef.current) {
      clearTimeout(speechRecognitionSilenceTimerRef.current);
      speechRecognitionSilenceTimerRef.current = null;
    }
    recognitionStartIndexRef.current = 0;
    browserPendingTranscriptRef.current = { text: '', updatedAt: 0 };
    voiceSpeechStartedAtRef.current = null;
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
    if (scribeConnectionRef.current) return;
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
      recognitionStartIndexRef.current = 0;

      rec.onresult = (e: any) => {
        if (callRecRef.current !== rec || !isCallActiveRef.current) return;

        // Chrome keeps finalized results at the beginning of e.results for the
        // lifetime of a continuous recognition session. Only read results that
        // have not already been sent, otherwise the first utterance is replayed
        // on every later result event.
        const firstUnconsumedResult = Math.max(0, recognitionStartIndexRef.current);
        if (e.results.length <= firstUnconsumedResult) return;

        let fullTranscript = '';
        let hasFinalResult = false;
        for (let i = firstUnconsumedResult; i < e.results.length; i++) {
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

        // Ignore the persona's own speaker audio while leaving recognition live
        // so a real user interruption still retains its opening words.
        if (isLikelyPersonaEcho(trimmed, getEchoReferenceSpeech())) {
          if (hasFinalResult) {
            recognitionStartIndexRef.current = e.results.length;
          }
          return;
        }

        if (voiceSpeechStartedAtRef.current === null) {
          voiceSpeechStartedAtRef.current = performance.now();
          voiceUtteranceStartedAtRef.current = Date.now();
        }

        // Browser fallback uses acoustic activity plus non-echo words. This
        // prevents the laptop speaker from interrupting its own response.
        if ((isAgentSpeakingRef.current || voiceCallBusyRef.current) && !shouldInterruptPersonaSpeech(trimmed, {
          source: 'browser',
          personaSpeech: getEchoReferenceSpeech(),
          personaIsSpeaking: isAgentSpeakingRef.current,
          responseIsPending: voiceCallBusyRef.current,
          hasFreshVoiceEnergy: Date.now() <= bargeInEnergyUntilRef.current,
        })) {
          return;
        }
        if (isAgentSpeakingRef.current || voiceCallBusyRef.current) {
          console.log('[Vocal Barge-In] ⚡ Spoken words recognized while persona was speaking! Halting playback immediately...');
          interruptPersona();
        }

        browserPendingTranscriptRef.current = { text: trimmed, updatedAt: Date.now() };
        setLiveUserSpeech(trimmed);

        // Reset silence timer on any newly recognized speech chunk
        if (speechRecognitionSilenceTimerRef.current) {
          clearTimeout(speechRecognitionSilenceTimerRef.current);
        }

        // Intelligent Conversational Pause Buffer (Generous breathing room so user is never interrupted):
        const lastWord = trimmed.split(/\s+/).pop()?.toLowerCase().replace(/[^a-z]/g, '') || '';
        const isTrailingThought = /^(and|or|but|so|because|like|um|uh|then|when|if|that|which|to|with|for|about|my|your|the|a|i|we|you|he|she|it|they|got|had|was|is)$/i.test(lastWord);

        let pauseDelay = 1100;
        if (isTrailingThought) {
          pauseDelay = 1800;
        } else if (hasFinalResult && /[.?!]$/.test(trimmed)) {
          pauseDelay = 700;
        }

        const resultCountAtSchedule = e.results.length;
        speechRecognitionSilenceTimerRef.current = setTimeout(() => {
          speechRecognitionSilenceTimerRef.current = null;
          if (callRecRef.current === rec && trimmed.length >= 2 && isCallActiveRef.current) {
            browserPendingTranscriptRef.current = { text: '', updatedAt: 0 };
            recognitionStartIndexRef.current = Math.max(
              recognitionStartIndexRef.current,
              resultCountAtSchedule,
            );
            console.log('[Call Voice] 🎤 Captured complete user utterance:', trimmed);
            commitRecognizedVoiceTranscript(trimmed);
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
        if (speechRecognitionSilenceTimerRef.current) {
          clearTimeout(speechRecognitionSilenceTimerRef.current);
          speechRecognitionSilenceTimerRef.current = null;
        }
        const pendingTranscript = browserPendingTranscriptRef.current;
        browserPendingTranscriptRef.current = { text: '', updatedAt: 0 };
        recognitionStartIndexRef.current = 0;
        isStartingRecRef.current = false;
        if (callRecRef.current === rec) {
          callRecRef.current = null;
        }
        // Chrome can close a recognition session before the silence timer fires.
        // Commit the buffered utterance here so its opening words are not lost.
        if (
          pendingTranscript.text.length >= 2 &&
          Date.now() - pendingTranscript.updatedAt < 2500 &&
          isCallActiveRef.current &&
          !isMutedRef.current
        ) {
          commitRecognizedVoiceTranscript(pendingTranscript.text);
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
      try { scribeConnectionRef.current?.mute(); } catch {}
      stopSpeechRecognition();
    } else if (isCallActiveRef.current) {
      if (scribeConnectionRef.current) {
        try { scribeConnectionRef.current.unmute(); } catch {}
      } else {
        restartSpeechRecognition();
      }
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
      // Leave enough room for a complete multi-segment spoken answer. This is
      // only a last-resort recovery for genuinely stuck playback.
      if (isAgentSpeakingRef.current && (Date.now() - personaSpeakingStartTimeRef.current > 120000)) {
        console.warn('[Voice Watchdog] ⏰ Agent stuck >120s. Force recovering...');
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

  const formatLatency = (milliseconds?: number) => {
    if (milliseconds === undefined) return '—';
    return milliseconds < 1000 ? `${milliseconds}ms` : `${(milliseconds / 1000).toFixed(1)}s`;
  };

  // ── Play TTS Helper ─────────────────────────────────────
  type FrozenVoiceRouting = {
    persona: Persona;
    voiceId?: string;
    voiceReference?: string;
    voiceModel: string;
  };

  const playTTS = async (text: string, onStart?: () => void, voiceRouting?: FrozenVoiceRouting) => {
    const speechPersona = voiceRouting?.persona || activePersona;
    currentPersonaSpeechRef.current = text.toLowerCase().trim();
    if (!speakerOn) {
      isAgentSpeakingRef.current = false;
      voiceCallBusyRef.current = false;
      onStart?.();
      setCallStatus('listening');
      restartSpeechRecognition();
      return;
    }
    setCallStatus('thinking');
    isAgentSpeakingRef.current = false;
    voiceCallBusyRef.current = true;

    let controller: AbortController | null = null;
    let playbackSettled = false;
    const onPlaybackComplete = () => {
      if (playbackSettled) return;
      playbackSettled = true;
      const ownsCurrentPlayback = controller === null
        ? activeCallAbortControllerRef.current === null
        : activeCallAbortControllerRef.current === controller;
      // An interrupted older playback must never reset a newer turn to idle.
      if (!ownsCurrentPlayback) return;
      activeCallAbortControllerRef.current = null;
      isAgentSpeakingRef.current = false;
      voiceCallBusyRef.current = false;
      rememberPersonaSpeech();
      currentPersonaSpeechRef.current = '';
      if (isCallActiveRef.current) {
        setCallStatus('listening');
        setTimeout(() => {
          if (isCallActiveRef.current && !isAgentSpeakingRef.current && !scribeConnectionRef.current) {
            restartSpeechRecognition();
          }
        }, 150);
      }
    };

    try {
      const currentVoice = voiceRouting || {
        persona: speechPersona,
        ...getActivePersonaVoice(speechPersona),
        voiceModel: selectedVoiceEngine,
      };
      controller = new AbortController();
      activeCallAbortControllerRef.current = controller;

      const ttsRes = await authFetch('/api/agent/voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activePersona: speechPersona,
          directTTS: text,
          voiceId: currentVoice.voiceId,
          voiceReference: currentVoice.voiceReference,
          voiceModel: currentVoice.voiceModel,
          ttsModel: currentVoice.voiceModel,
        }),
        signal: controller.signal,
      });
      const ttsData = await ttsRes.json().catch(() => ({}));
      if (!ttsRes.ok) {
        if (ttsData.code === 'PERSONA_VOICE_UNAVAILABLE') {
          const message = ttsData.error || `${speechPersona.name}'s saved voice is unavailable. Reselect it in Voice Studio.`;
          toast.error(message, { id: 'persona-voice-unavailable', duration: 7000 });
          onPlaybackComplete();
          return;
        }
        throw new Error(ttsData.error || `Voice synthesis failed (${ttsRes.status})`);
      }
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
        setCallStatus('speaking');
        isAgentSpeakingRef.current = true;
        voiceCallBusyRef.current = false;
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
          onPlaybackComplete();
        }
      } else {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        onPlaybackComplete();
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        onPlaybackComplete();
        return;
      }
      console.warn('Persona TTS failed; browser voice substitution is suppressed', err);
      onPlaybackComplete();
    }
  };

  // Send message inside Live Call
  const handleSendCallMessage = async (
    overrideText?: string,
    voiceMeta?: {
      rawTranscript?: string;
      speechStartedAt?: number;
      transcriptCommittedAt?: number;
    },
  ) => {
    const text = (overrideText || callInput).trim();
    if (!text || !isCallActiveRef.current) return;
    if (voiceCallBusyRef.current || isAgentSpeakingRef.current) {
      console.log('[Call Voice] ⚡ New turn interrupted the active response');
      interruptPersona();
    }

    // Typed turns and fast follow-up speech must cancel every part of the old
    // response, including already-queued TTS segments.
    if (activeCallAbortControllerRef.current) {
      try { activeCallAbortControllerRef.current.abort(); } catch {}
      activeCallAbortControllerRef.current = null;
    }
    rememberPersonaSpeech();
    currentPersonaSpeechRef.current = '';

    voiceCallBusyRef.current = true;
    setPendingVoiceConfirmation(null);
    const callTurnId = ++callTurnIdRef.current;
    isAgentSpeakingRef.current = false;
    restartSpeechRecognition();

    const turnTiming: VoiceTurnTiming = {
      speechStartedAt: voiceMeta?.speechStartedAt,
      transcriptCommittedAt: voiceMeta?.transcriptCommittedAt,
      requestStartedAt: performance.now(),
    };
    let latencyRecorded = false;
    const recordFirstAudioLatency = () => {
      if (latencyRecorded) return;
      latencyRecorded = true;
      turnTiming.firstAudioAt = performance.now();
      setLastVoiceLatency(summarizeVoiceLatency(turnTiming));
    };

    const watchdogTimer = setTimeout(() => {
      if (voiceCallBusyRef.current && callTurnId === callTurnIdRef.current) {
        console.warn('[Call Watchdog] ⏰ Request timed out, auto-recovering...');
        callTurnIdRef.current += 1;
        try { activeCallAbortControllerRef.current?.abort(); } catch {}
        activeCallAbortControllerRef.current = null;
        isAgentSpeakingRef.current = false;
        voiceCallBusyRef.current = false;
        if (isCallActiveRef.current) {
          setCallStatus('listening');
          restartSpeechRecognition();
        }
      }
    }, 75000);

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
    const callRevisionSource = getAttachmentRevisionSource(sentCallAttachment);
    setChatAttachment(null);
    
    const userMsg: CallTranscriptItem & { attachment?: typeof sentCallAttachment } = {
      id: uid(),
      role: 'user',
      type: 'text',
      content: text,
      source: voiceMeta?.rawTranscript ? 'voice' : 'typed',
      rawContent: voiceMeta?.rawTranscript,
    };
    if (sentCallAttachment) {
      userMsg.attachment = sentCallAttachment;
    }
    const updatedHistory = [...callTranscriptRef.current.filter(t => t.content.indexOf('Calling') !== 0), userMsg];
    callTranscriptRef.current = updatedHistory;
    setCallTranscript(updatedHistory);
    appendConversationMessages([{
      id: userMsg.id,
      role: 'user',
      type: 'text',
      content: text,
      timestamp: new Date(),
      source: userMsg.source === 'voice' ? 'voice' : 'text',
      rawContent: voiceMeta?.rawTranscript,
      ...(sentCallAttachment ? { attachment: sentCallAttachment } : {}),
    }]);
    
    setCallStatus('thinking');

    let earlySpeechTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      const personaMemories = loadPersonaMemories(activePersona.id);
      const creator = getCreatorProfile();
      // Voice turns use only the active call transcript. Mixing a one-word
      // acknowledgement with account-wide semantic history let an old image
      // request become the apparent current instruction (for example, "Yeah"
      // was interpreted as approval of a request from an earlier chat).
      const conversationContext = buildVoiceConversationHistory(updatedHistory, text, {
        maxMessages: 10,
      });

      const controller = new AbortController();
      activeCallAbortControllerRef.current = controller;

      let streamedReply = '';
      let speechBuffer = '';
      let streamMetadata: any = {};
      let streamingSpeechQueued = false;
      let streamingAudioPlayed = false;
      let terminalTtsError: string | undefined;
      let streamingPlayback = Promise.resolve();
      const { voiceId: targetVoiceId, voiceReference: targetVoiceRef } = getActivePersonaVoice(activePersona);
      const targetVoiceRouting: FrozenVoiceRouting = {
        persona: activePersona,
        voiceId: targetVoiceId,
        voiceReference: targetVoiceRef,
        voiceModel: selectedVoiceEngine,
      };

      const reportTerminalTtsError = (message: string) => {
        if (terminalTtsError) return;
        terminalTtsError = message;
        const errorId = `voice-routing-error-${callTurnId}`;
        setCallTranscript(prev => prev.some(item => item.id === errorId)
          ? prev
          : [...prev, { id: errorId, role: 'persona', type: 'error', content: message }]);
        toast.error(message, { id: 'persona-voice-unavailable', duration: 7000 });
      };

      const synthesizeSpeechSegment = async (segment: string): Promise<string | undefined> => {
        if (terminalTtsError) return undefined;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const ttsResponse = await authFetch('/api/agent/voice-chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                activePersona,
                directTTS: segment,
                voiceId: targetVoiceRouting.voiceId,
                voiceReference: targetVoiceRouting.voiceReference,
                voiceModel: targetVoiceRouting.voiceModel,
                ttsModel: targetVoiceRouting.voiceModel,
              }),
              signal: controller.signal,
            });
            const ttsData = await ttsResponse.json().catch(() => ({}));
            if (ttsResponse.ok && ttsData.audioUrl) return ttsData.audioUrl;
            if (ttsData.code === 'PERSONA_VOICE_UNAVAILABLE') {
              reportTerminalTtsError(
                ttsData.error || `${activePersona.name}'s saved voice is unavailable. Reselect it in Voice Studio.`,
              );
              return undefined;
            }
          } catch (error: any) {
            if (error?.name === 'AbortError') throw error;
          }
          if (attempt === 0 && !controller.signal.aborted) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        }
        return undefined;
      };

      const playPreparedSegment = async (segment: string, audioPromise: Promise<string | undefined>, playbackAttempt = 0): Promise<void> => {
        const audioUrl = await audioPromise.catch(() => undefined);
        if (!audioUrl || controller.signal.aborted || callTurnId !== callTurnIdRef.current || !isCallActiveRef.current) return;

        const playedToEnd = await new Promise<boolean>((resolve) => {
          const audio = new Audio();
          audioRef.current = audio;
          audio.src = audioUrl;
          audio.volume = 1;
          let settled = false;

          const finish = (completed = false) => {
            if (settled) return;
            settled = true;
            controller.signal.removeEventListener('abort', onAbort);
            if (audioRef.current === audio) audioRef.current = null;
            resolve(completed);
          };
          const onAbort = () => {
            try {
              audio.pause();
              audio.currentTime = 0;
              audio.src = '';
            } catch {}
            finish(false);
          };

          controller.signal.addEventListener('abort', onAbort, { once: true });
          audio.onended = () => finish(true);
          audio.onerror = () => finish(false);
          audio.onplay = () => {
            streamingAudioPlayed = true;
            recordFirstAudioLatency();
            personaSpeakingStartTimeRef.current = Date.now();
            setCallStatus('speaking');
            isAgentSpeakingRef.current = true;
            // Let a new committed transcript barge in while this phrase plays.
            voiceCallBusyRef.current = false;
            if (!isMutedRef.current) restartSpeechRecognition();
          };

          audio.play().catch(() => finish(false));
        });

        // A temporary CDN/audio-element failure should not silently remove the
        // final phrase. Re-synthesize and replay that phrase once.
        if (!playedToEnd && !terminalTtsError && playbackAttempt === 0 && !controller.signal.aborted && callTurnId === callTurnIdRef.current) {
          await playPreparedSegment(segment, synthesizeSpeechSegment(segment), 1);
        }
      };

      const queueSpeechSegment = (segment: string) => {
        const cleanSegment = segment.replace(/\s+/g, ' ').trim();
        if (!speakerOn || cleanSegment.length < 2) return;
        if (earlySpeechTimer) {
          clearTimeout(earlySpeechTimer);
          earlySpeechTimer = null;
        }
        streamingSpeechQueued = true;
        const audioPromise = synthesizeSpeechSegment(cleanSegment);
        streamingPlayback = streamingPlayback.then(() => playPreparedSegment(cleanSegment, audioPromise));
      };

      const flushSpeechBuffer = (force = false, allowEarlyPartial = false) => {
        // Speak one short opening phrase as soon as it is ready, then keep the
        // remainder together as one continuous clip. Starting a new TTS request
        // for every sentence made the same ElevenLabs voice change pitch and
        // prosody several times inside a single response.
        if (streamingSpeechQueued) {
          if (force) {
            const finalSegment = speechBuffer.replace(/\s+/g, ' ').trim();
            speechBuffer = '';
            if (finalSegment) queueSpeechSegment(finalSegment);
          }
          return;
        }

        const extracted = takeSpeakableSpeechChunk(speechBuffer, {
          force,
          firstChunk: true,
          allowEarlyPartial,
        });
        speechBuffer = extracted.remainder;
        if (extracted.chunk) queueSpeechSegment(extracted.chunk);

        if (force && speechBuffer.trim()) {
          const finalSegment = speechBuffer.replace(/\s+/g, ' ').trim();
          speechBuffer = '';
          queueSpeechSegment(finalSegment);
        }
      };

      const scheduleEarlySpeech = () => {
        if (!speakerOn || streamingSpeechQueued || earlySpeechTimer || !speechBuffer.trim()) return;
        earlySpeechTimer = setTimeout(() => {
          earlySpeechTimer = null;
          flushSpeechBuffer(false, true);
          // A very small initial token may not yet be safe to speak. Check it
          // again shortly without resetting the timer on every streamed token.
          if (!streamingSpeechQueued && speechBuffer.trim()) {
            scheduleEarlySpeech();
          }
        }, 180);
      };

      // Stream text immediately. Synthesize one opening phrase for a fast first
      // response, then one continuous tail so the voice remains consistent.
      const res = await authFetch('/api/agent/voice-chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activePersona,
          creatorProfile: creator,
          userName: creator.name || getStoredUserName(),
          attachedImage: sentCallAttachment?.type === 'image' ? sentCallAttachment.base64 : undefined,
          userMessage: text,
          messages: conversationContext.map(m => ({
            id: m.id,
            role: m.role === 'user' ? 'user' : 'model',
            content: m.type === 'image' 
              ? `[Persona generated and sent a photo of herself: "${m.prompt || 'photo requested by user'}". User is looking at the photo on screen.]` 
              : m.type === 'video'
              ? `[Persona generated and sent a video clip to the user's screen.]`
              : m.content,
            source: m.source,
            timestamp: m.timestamp,
          })),
          priorChatHistory: [],
          memories: personaMemories,
          voiceLlmModel,
          voiceId: targetVoiceRouting.voiceId,
          voiceReference: targetVoiceRouting.voiceReference,
          voiceModel: targetVoiceRouting.voiceModel,
          ttsModel: targetVoiceRouting.voiceModel,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed streaming call dialogue response');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let eventBuffer = '';
      const processVoiceStreamPayload = (payloadText: string) => {
        const payload = JSON.parse(payloadText);
        if (payload.error) throw new Error(payload.error);
        if (payload.text && !payload.done) {
          if (turnTiming.firstTextAt === undefined) {
            turnTiming.firstTextAt = performance.now();
          }
          streamedReply += payload.text;
          speechBuffer += payload.text;
          currentPersonaSpeechRef.current = streamedReply.toLowerCase().trim();
          flushSpeechBuffer(false);
          scheduleEarlySpeech();
        }
        if (payload.done) streamMetadata = payload;
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        eventBuffer += decoder.decode(value, { stream: true });
        const drained = drainSseData(eventBuffer);
        eventBuffer = drained.remainder;
        drained.data.forEach(processVoiceStreamPayload);
      }
      eventBuffer += decoder.decode();
      drainSseData(eventBuffer, true).data.forEach(processVoiceStreamPayload);
      if (earlySpeechTimer) {
        clearTimeout(earlySpeechTimer);
        earlySpeechTimer = null;
      }
      flushSpeechBuffer(true);

      const data = {
        ...streamMetadata,
        text: streamMetadata.text || streamedReply,
      };
      if (!data.text) throw new Error('The streaming voice response was empty');
      if (turnTiming.firstTextAt === undefined) {
        turnTiming.firstTextAt = performance.now();
      }
      
      clearTimeout(watchdogTimer);

      if (callTurnId !== callTurnIdRef.current) {
        return;
      }

      // If call was ended while we were waiting for network response, do NOT play audio
      if (!isCallActiveRef.current) {
        voiceCallBusyRef.current = false;
        isAgentSpeakingRef.current = false;
        return;
      }

      let reply = data.text || data.reply || "Mm—what's up?";
      if (/^(?:generating|creating|rendering|loading|producing|processing|taking)\s+(?:image|photo|video|picture|visual|content|look|selfie)/i.test(reply) || /^take a look at this (?:image|photo|picture)/i.test(reply)) {
        reply = `Let me take that for you right now, babe...`;
      }
      const personaMsg = { id: uid(), role: 'persona' as const, type: 'text' as const, content: reply };
      
      // Auto-extract and save user memory if user introduced new facts
      if (text.length > 5 && /\b(my name is|i live in|i love|i like|i work as|i am a|remember that|i want to|my goal is)\b/i.test(text)) {
        savePersonaMemory(activePersona.id, text);
      }
      
      appendConversationMessages([{
        id: personaMsg.id,
        role: 'persona',
        type: 'text',
        content: reply,
        timestamp: new Date(),
        source: 'voice',
      }]);

      const voiceImageRevisionCandidate = resolveImageRevisionContext(text, messagesRef.current, callRevisionSource);
      const incompleteVoiceMediaRequest = detectIncompleteMediaCreationRequest(text);
      if (incompleteVoiceMediaRequest) {
        // Do not let an older completed asset look like the answer to the new,
        // still-underspecified request while we ask the user for details.
        setActiveCallMedia(null);
      }
      const isVoiceImageIntent = voiceImageRevisionCandidate.isRevision || data.action?.type === 'image' || (!incompleteVoiceMediaRequest && (
        detectIntent(text) === 'image' ||
        (/\b(?:photo|pic|picture|selfie|image)\b/i.test(text) && /\b(?:take|send|snap|show|generate|make|see|want|wearing|exposed|nude|naked|bedroom|bed)\b/i.test(text)) ||
        /\b(?:sending it|try again right now.*sending it|sending you a (?:photo|selfie|pic|image)|sending a (?:photo|selfie|pic|image)|taking a (?:photo|selfie)|take a quick (?:photo|selfie)|here is the (?:photo|selfie)|snap that for you|take that for you|snapping (?:this|that|a photo)|let me take|give me one second.*(?:snap|take|photo|pic)|here you go.*(?:pic|photo))\b/i.test(reply)
      ));

      const isVoiceVideoIntent = !isVoiceImageIntent && (data.action?.type === 'video' || (!incompleteVoiceMediaRequest && (
        detectIntent(text) === 'video' || /\b(?:sending you a video|recorded a video|sending the video)\b/i.test(reply)
      )));

      if (isVoiceImageIntent || isVoiceVideoIntent) {
        const mediaType = isVoiceImageIntent ? 'image' as const : 'video' as const;
        setActiveCallMedia(null);
        const loadingMsgId = uid();
        const callGenerationLabel = mediaType === 'image'
          ? 'Generating your image...'
          : 'Rendering your video...';
        setCallTranscript(prev => [...prev, personaMsg, {
          id: loadingMsgId,
          role: 'persona',
          type: 'loading',
          content: callGenerationLabel,
        }]);
        const exactMediaRequest = String(data.action?.prompt || text).trim();
        const rawMediaPrompt = exactMediaRequest || `${activePersona.name}, ${activePersona.niche}, ${mediaType === 'image' ? 'photorealistic portrait' : 'cinematic motion video clip'}`;
        const modelSelection = resolveMediaModelFromPrompt(
          rawMediaPrompt,
          mediaType === 'image' ? editModels : videoModels,
          mediaType,
        );
        const mediaPrompt = modelSelection.prompt;
        const imageRevision = mediaType === 'image'
          ? resolveImageRevisionContext(mediaPrompt, messagesRef.current, callRevisionSource)
          : { isRevision: false, prompt: mediaPrompt, source: undefined, rootPrompt: undefined, revisionHistory: undefined };
        const requestPrompt = imageRevision.prompt;
        const requestedModelId = modelSelection.explicit && modelSelection.matched
          ? modelSelection.modelId
          : mediaType === 'image'
            ? imageRevision.source?.modelId || selectedEditModelId || 'wavespeed:bytedance/seedream-v5.0-pro'
            : selectedVideoModelId || 'wavespeed-i2v:bytedance/seedance-2-mini';
        const extraImages = [
          sentCallAttachment?.type === 'image' && !sentCallAttachment.sourceMessageId ? sentCallAttachment.base64 : undefined,
          !sentCallAttachment && lastUploadedReference ? lastUploadedReference : undefined,
        ].filter((value): value is string => Boolean(value));

        const mediaRequest = modelSelection.explicit && !modelSelection.matched
          ? Promise.reject(new Error(
              `I couldn't find “${modelSelection.requestedText}” in your available ${mediaType} models. Try another model name or choose one in AI Settings.`,
            ))
          : requestPersonaMediaJob({
              type: mediaType,
              persona: activePersona,
              prompt: requestPrompt,
              imageModelId: mediaType === 'image' ? requestedModelId : selectedEditModelId || 'wavespeed:bytedance/seedream-v5.0-pro',
              videoModelId: mediaType === 'video' ? requestedModelId : selectedVideoModelId || 'wavespeed-i2v:bytedance/seedance-2-mini',
              aspectRatio: '9:16',
              allowNsfw: true,
              revisionImage: imageRevision.isRevision ? imageRevision.source?.content : undefined,
              additionalImages: extraImages.length > 0 ? extraImages : undefined,
              creatorProfile: creator,
            });

        void mediaRequest.then(result => {
          const resultText = modelSelection.explicit && modelSelection.matched
            ? `${result.message} Used ${result.model || modelSelection.modelName}.`
            : result.message;
          const mediaMessage = {
            id: uid(),
            role: 'persona' as const,
            type: mediaType,
            content: result.url!,
            prompt: requestPrompt,
            rootPrompt: mediaType === 'image' ? imageRevision.rootPrompt || mediaPrompt : undefined,
            revisionHistory: mediaType === 'image' ? imageRevision.revisionHistory || [] : undefined,
            parentMediaId: imageRevision.isRevision ? imageRevision.source?.id : undefined,
            participants: result.participants,
            modelId: requestedModelId,
            modelName: result.model || imageRevision.source?.modelName,
          };
          const resultMessage = { id: uid(), role: 'persona' as const, type: 'text' as const, content: resultText };
          setActiveCallMedia({ type: mediaType, url: result.url!, prompt: requestPrompt, messageId: mediaMessage.id });
          setCallTranscript(prev => [
            ...prev.map(m => m.id === loadingMsgId ? mediaMessage : m),
            resultMessage,
          ]);
          appendConversationMessages([
            { ...mediaMessage, timestamp: new Date(), source: 'voice' },
            { ...resultMessage, timestamp: new Date(), source: 'voice' },
          ]);
          if (callTurnId === callTurnIdRef.current && isCallActiveRef.current) {
            streamingPlayback.then(() => playTTS(resultText, undefined, targetVoiceRouting)).catch(() => {});
          }
        }).catch(err => {
          const failureMessage = err?.message || `I couldn't finish that ${mediaType}.`;
          setCallTranscript(prev => prev.map(m => m.id === loadingMsgId ? { ...m, type: 'error', content: failureMessage } : m));
          appendConversationMessages([{
            id: uid(),
            role: 'persona',
            type: 'text',
            content: failureMessage,
            timestamp: new Date(),
            source: 'voice',
          }]);
          if (callTurnId === callTurnIdRef.current && isCallActiveRef.current) {
            streamingPlayback.then(() => playTTS(failureMessage, undefined, targetVoiceRouting)).catch(() => {});
          }
        });
      } else {
        setCallTranscript(prev => [...prev, personaMsg]);
      }
      
      if (data.audioUrl && isCallActiveRef.current) {
        currentPersonaSpeechRef.current = reply.toLowerCase().trim();
        setCallStatus('thinking');
        isAgentSpeakingRef.current = false;
        voiceCallBusyRef.current = true;
        
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
        audio.onplay = () => {
          if (callTurnId !== callTurnIdRef.current || !isCallActiveRef.current) {
            try { audio.pause(); audio.src = ''; } catch {}
            return;
          }
          recordFirstAudioLatency();
          setCallStatus('speaking');
          isAgentSpeakingRef.current = true;
          voiceCallBusyRef.current = false;
          personaSpeakingStartTimeRef.current = Date.now();
          if (!isMutedRef.current) restartSpeechRecognition();
        };

        let callAudioSettled = false;
        const onCallAudioEnded = () => {
          if (callAudioSettled) return;
          callAudioSettled = true;
          if (audioRef.current === audio) audioRef.current = null;
          setTimeout(() => {
            if (!isCallActiveRef.current || callTurnId !== callTurnIdRef.current) return;
            isAgentSpeakingRef.current = false;
            voiceCallBusyRef.current = false;
            rememberPersonaSpeech();
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
      } else if (streamingSpeechQueued && isCallActiveRef.current) {
        await streamingPlayback;
        if (callTurnId !== callTurnIdRef.current || !isCallActiveRef.current) return;
        if (terminalTtsError) {
          isAgentSpeakingRef.current = false;
          voiceCallBusyRef.current = false;
          currentPersonaSpeechRef.current = '';
          setCallStatus('listening');
          restartSpeechRecognition();
        } else if (!streamingAudioPlayed) {
          await playTTS(reply, () => {
            recordFirstAudioLatency();
            setCallStatus('speaking');
            isAgentSpeakingRef.current = true;
          }, targetVoiceRouting);
        } else {
          isAgentSpeakingRef.current = false;
          voiceCallBusyRef.current = false;
          rememberPersonaSpeech();
          currentPersonaSpeechRef.current = '';
          setCallStatus('listening');
          restartSpeechRecognition();
        }
      } else if (isCallActiveRef.current) {
        setCallTranscript(prev => {
          if (prev.some(m => m.id === personaMsg.id)) return prev;
          return [...prev, personaMsg];
        });
        await playTTS(reply, () => {
          if (!isCallActiveRef.current) return;
          recordFirstAudioLatency();
          setCallStatus('speaking');
          isAgentSpeakingRef.current = true;
        }, targetVoiceRouting);
      }
    } catch (err: any) {
      if (earlySpeechTimer) {
        clearTimeout(earlySpeechTimer);
        earlySpeechTimer = null;
      }
      clearTimeout(watchdogTimer);
      if (err?.name !== 'AbortError') {
        console.error('[Call Voice Network Error, recovering]:', err);
      }
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

  const saveInlineVoiceCorrection = (item: CallTranscriptItem) => {
    const intended = voiceCorrectionDraft.replace(/\s+/g, ' ').trim();
    const heard = (item.rawContent || item.content).replace(/\s+/g, ' ').trim();
    if (!heard || !intended) return;

    updateVoiceAccuracyProfile(profile => {
      const focusedCorrections = deriveCalibrationCorrections(heard, intended);
      if (focusedCorrections.length === 0) return saveVoiceCorrection(profile, heard, intended);
      return focusedCorrections.reduce(
        (next, correction) => saveVoiceCorrection(next, correction.heard, correction.intended),
        profile,
      );
    });
    setCallTranscript(prev => prev.map(entry => entry.id === item.id ? { ...entry, content: intended } : entry));
    const next = messagesRef.current.map(entry => entry.id === item.id ? { ...entry, content: intended } : entry);
    messagesRef.current = next;
    setMessages(next);
    saveHistory(selectedPersonaId, next);
    const updated = next.find(entry => entry.id === item.id);
    if (updated) archiveConversationRecords(selectedPersonaId, [updated] as ConversationRecord[]);
    setEditingVoiceTranscriptId(null);
    setVoiceCorrectionDraft('');
    toast.success('Voice correction learned for future requests.');
  };

  const saveManualVoiceCorrection = () => {
    const heard = manualHeardDraft.replace(/\s+/g, ' ').trim();
    const intended = manualIntendedDraft.replace(/\s+/g, ' ').trim();
    if (!heard || !intended) return;
    updateVoiceAccuracyProfile(profile => saveVoiceCorrection(profile, heard, intended));
    setManualHeardDraft('');
    setManualIntendedDraft('');
    toast.success('Pronunciation added to your personal vocabulary.');
  };

  const clearVoiceEnrollmentTimers = () => {
    if (voiceEnrollmentTimerRef.current) {
      clearInterval(voiceEnrollmentTimerRef.current);
      voiceEnrollmentTimerRef.current = null;
    }
    if (voiceEnrollmentFinishRef.current) {
      clearTimeout(voiceEnrollmentFinishRef.current);
      voiceEnrollmentFinishRef.current = null;
    }
  };

  const finishVoiceEnrollment = () => {
    clearVoiceEnrollmentTimers();
    voiceEnrollmentActiveRef.current = false;
    setVoiceEnrollmentSeconds(0);
    const profile = createVoiceIdentityProfile(voiceEnrollmentFramesRef.current);
    voiceEnrollmentFramesRef.current = [];
    if (!profile) {
      setVoiceEnrollmentStatus('error');
      if (!isCallActiveRef.current) stopVadInterruptionMonitor();
      toast.error('I could not capture enough clear speech. Try again in a quieter room.');
      return;
    }
    voiceIdentityProfileRef.current = profile;
    setVoiceIdentityProfile(profile);
    setVoiceEnrollmentStatus('ready');
    accountLocalStorage.setItem(VOICE_IDENTITY_STORAGE_KEY, JSON.stringify(profile));
    accountLocalStorage.setItem(VOICE_IDENTITY_ONBOARDING_STORAGE_KEY, '1');
    if (!isCallActiveRef.current) stopVadInterruptionMonitor();
    toast.success('Your voice is enrolled. Speaker Lock is now active.');
  };

  const cancelVoiceEnrollment = (quiet = false) => {
    clearVoiceEnrollmentTimers();
    voiceEnrollmentActiveRef.current = false;
    voiceEnrollmentFramesRef.current = [];
    setVoiceEnrollmentSeconds(0);
    setVoiceEnrollmentStatus(voiceIdentityProfileRef.current ? 'ready' : 'idle');
    if (!isCallActiveRef.current) stopVadInterruptionMonitor();
    if (!quiet) toast('Voice enrollment cancelled.');
  };

  const startVoiceEnrollment = async () => {
    cancelVoiceCalibration();
    cancelVoiceEnrollment(true);
    if (isCallActiveRef.current) interruptPersona();
    voiceFeatureFramesRef.current = [];
    voiceEnrollmentFramesRef.current = [];
    voiceEnrollmentActiveRef.current = true;
    setVoiceEnrollmentStatus('recording');
    setVoiceEnrollmentSeconds(8);
    setPendingVoiceConfirmation(null);
    setCallInput('');
    if (isCallActiveRef.current) setCallStatus('listening');

    const microphoneReady = await startVadInterruptionMonitor(true);
    if (!voiceEnrollmentActiveRef.current) {
      if (!isCallActiveRef.current) stopVadInterruptionMonitor();
      return;
    }
    if (!microphoneReady) {
      voiceEnrollmentActiveRef.current = false;
      setVoiceEnrollmentSeconds(0);
      setVoiceEnrollmentStatus('error');
      toast.error('Microphone access is needed to enroll your voice.');
      return;
    }

    voiceEnrollmentTimerRef.current = setInterval(() => {
      setVoiceEnrollmentSeconds(seconds => Math.max(0, seconds - 1));
    }, 1000);
    voiceEnrollmentFinishRef.current = setTimeout(finishVoiceEnrollment, 8000);
  };

  const toggleVoiceIdentityLock = () => {
    const current = voiceIdentityProfileRef.current;
    if (!current) return;
    const next = { ...current, enabled: !current.enabled };
    voiceIdentityProfileRef.current = next;
    setVoiceIdentityProfile(next);
    accountLocalStorage.setItem(VOICE_IDENTITY_STORAGE_KEY, JSON.stringify(next));
    toast.success(next.enabled ? 'Speaker Lock enabled.' : 'Speaker Lock paused.');
  };

  const removeVoiceIdentityProfile = () => {
    cancelVoiceEnrollment(true);
    voiceIdentityProfileRef.current = null;
    setVoiceIdentityProfile(null);
    setVoiceEnrollmentStatus('idle');
    setLastSpeakerMatchScore(null);
    accountLocalStorage.removeItem(VOICE_IDENTITY_STORAGE_KEY);
    toast.success('Voice profile removed.');
  };

  const startVoiceCalibration = () => {
    cancelVoiceEnrollment(true);
    interruptPersona();
    setCalibrationCapture(null);
    setCalibrationStep(0);
    calibrationStepRef.current = 0;
    setPendingVoiceConfirmation(null);
    setCallInput('');
    setCallStatus('listening');
  };

  const acceptCalibrationCapture = () => {
    if (!calibrationCapture || calibrationStep === null) return;
    const isLastStep = calibrationStep >= VOICE_CALIBRATION_SENTENCES.length - 1;
    updateVoiceAccuracyProfile(profile => {
      let next = addVoiceTerms(profile, VOICE_CALIBRATION_TERMS);
      for (const correction of calibrationCapture.corrections) {
        next = saveVoiceCorrection(next, correction.heard, correction.intended);
      }
      return isLastStep
        ? { ...next, calibrationCompletedAt: new Date().toISOString() }
        : next;
    });
    setCalibrationCapture(null);
    if (isLastStep) {
      setCalibrationStep(null);
      calibrationStepRef.current = null;
      toast.success('Voice calibration complete. New hints apply on your next call.');
    } else {
      setCalibrationStep(step => step === null ? null : step + 1);
    }
  };

  const cancelVoiceCalibration = () => {
    setCalibrationStep(null);
    calibrationStepRef.current = null;
    setCalibrationCapture(null);
  };

  const confirmPendingVoiceRequest = () => {
    const transcript = pendingVoiceConfirmation;
    if (!transcript) return;
    setPendingVoiceConfirmation(null);
    setCallInput('');
    void handleSendCallMessage(transcript, { rawTranscript: transcript });
  };

  const lastCallEndedAtRef = useRef<number>(0);

  // Dynamic context-aware greeting generator that picks up from last conversation
  const fetchDynamicGreeting = useCallback(async (persona: Persona, mode: 'voice' | 'chat'): Promise<string> => {
    const creator = getCreatorProfile();
    const cName = creator?.name || 'Dr. H';
    const isAdultOrFlirty = (persona.niche || '').toLowerCase().includes('adult') || 
                            (persona.tone || '').toLowerCase().includes('seductive') || 
                            (persona.tone || '').toLowerCase().includes('flirty') ||
                            (persona.tone || '').toLowerCase().includes('playful');

    const timeSinceLastSec = lastCallEndedAtRef.current > 0 ? Math.floor((Date.now() - lastCallEndedAtRef.current) / 1000) : 999999;
    const isRecentContinuation = timeSinceLastSec < 600;

    const continuationPool = [
      `Oh—there you are.`,
      `Mm, hey. We got cut off.`,
      `Hey—where were we?`,
      `Oh, hey. You're back.`
    ];

    const intimatePools = [
      `Mm, hey you.`,
      `Hey, ${cName}.`,
      `Oh, hi. You okay?`,
      `Hey—you good?`
    ];

    const luxuryPools = [
      `Hey, ${cName}. What's up?`,
      `Oh, hey.`,
      `Mm, hi. How're you?`,
      `Hey—good to hear you.`
    ];

    const fallbackPool = isRecentContinuation ? continuationPool : (isAdultOrFlirty ? intimatePools : luxuryPools);
    const fallbackGreeting = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];

    try {
      const res = await authFetch('/api/persona-greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          creatorProfile: creator,
          // A call greeting must not resume or imply consent to an old media
          // request. Durable memories remain available after the user states a
          // meaningful new turn; the greeting itself stays socially neutral.
          priorChatHistory: [],
          memories: [],
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
    setShowSpeakerLockSetup(false);
    const greetingTurnId = ++callTurnIdRef.current;
    setIsCallActive(true);
    setActiveCallMedia(null);
    isCallActiveRef.current = true;
    lastCommittedTranscriptRef.current = { text: '', at: 0 };
    voiceSpeechStartedAtRef.current = null;
    browserPendingTranscriptRef.current = { text: '', updatedAt: 0 };
    setLastVoiceLatency(null);
    setPendingVoiceConfirmation(null);
    setEditingVoiceTranscriptId(null);
    cancelVoiceCalibration();
    cancelVoiceEnrollment(true);
    setIgnoredSpeakerCount(0);
    setLastSpeakerMatchScore(null);
    setCallStatus('connecting');
    setCallDuration(0);
    isAgentSpeakingRef.current = false;
    voiceCallBusyRef.current = true;

    // Unlock HTML5 audio context directly inside user click gesture
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.volume = 1.0;
      audioRef.current.muted = false;
      audioRef.current.play().catch(() => {});
    } catch {}

    const connectingTranscript: CallTranscriptItem[] = [
      { id: uid(), role: 'persona', content: `Calling ${activePersona.name}...` },
    ];
    callTranscriptRef.current = connectingTranscript;
    setCallTranscript(connectingTranscript);

    // Keep one echo-cancelled microphone session alive for the entire call.
    // Scribe's realtime VAD commits natural turns and preserves the first words.
    const realtimeStarted = await startRealtimeTranscription();
    if (!isCallActiveRef.current) return;
    // Keep one local, echo-cancelled analyser active for interruption and the
    // optional enrolled-speaker lock even when Scribe handles transcription.
    void startVadInterruptionMonitor();
    if (!realtimeStarted) {
      restartSpeechRecognition();
    }

    setCallStatus('connected');
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    // Fetch dynamic context-aware greeting picking up from last conversation
    const greeting = await fetchDynamicGreeting(activePersona, 'voice');

    // Synchronize greeting text bubble to appear at the exact instant audio starts.
    if (isCallActiveRef.current && greetingTurnId === callTurnIdRef.current) {
      await playTTS(greeting, () => {
        if (!isCallActiveRef.current || greetingTurnId !== callTurnIdRef.current) return;
        const greetingTranscript: CallTranscriptItem[] = [
          { id: uid(), role: 'persona', content: greeting },
        ];
        callTranscriptRef.current = greetingTranscript;
        setCallTranscript(greetingTranscript);
        appendConversationMessages([{
          id: greetingTranscript[0].id,
          role: 'persona',
          type: 'text',
          content: greeting,
          timestamp: new Date(),
          source: 'voice',
        }]);
      });
    }
  };

  const requestStartCall = () => {
    if (shouldOfferVoiceIdentitySetup(
      voiceIdentityProfileRef.current,
      accountLocalStorage.getItem(VOICE_IDENTITY_ONBOARDING_STORAGE_KEY),
    )) {
      setShowSpeakerLockSetup(true);
      return;
    }
    void handleStartCall();
  };

  const skipSpeakerLockAndStartCall = () => {
    cancelVoiceEnrollment(true);
    accountLocalStorage.setItem(VOICE_IDENTITY_ONBOARDING_STORAGE_KEY, '1');
    setShowSpeakerLockSetup(false);
    void handleStartCall();
  };

  // End Call
  const handleEndCall = useCallback(() => {
    callTurnIdRef.current += 1;
    if (activeCallAbortControllerRef.current) {
      try { activeCallAbortControllerRef.current.abort(); } catch {}
      activeCallAbortControllerRef.current = null;
    }
    setIsCallActive(false);
    setActiveCallMedia(null);
    isCallActiveRef.current = false;
    setCallStatus('disconnected');
    isAgentSpeakingRef.current = false;
    voiceCallBusyRef.current = false;
    rememberPersonaSpeech();
    currentPersonaSpeechRef.current = '';
    lastCallEndedAtRef.current = Date.now();
    setPendingVoiceConfirmation(null);
    setShowVoiceAccuracyPanel(false);
    setEditingVoiceTranscriptId(null);
    setCalibrationStep(null);
    calibrationStepRef.current = null;
    setCalibrationCapture(null);
    voiceSpeechStartedAtRef.current = null;
    voiceUtteranceStartedAtRef.current = null;
    browserPendingTranscriptRef.current = { text: '', updatedAt: 0 };
    clearVoiceEnrollmentTimers();
    voiceEnrollmentActiveRef.current = false;
    voiceEnrollmentFramesRef.current = [];
    setVoiceEnrollmentSeconds(0);
    setVoiceEnrollmentStatus(voiceIdentityProfileRef.current ? 'ready' : 'idle');
    
    // Save history immediately
    if (messagesRef.current.length > 0) {
      saveHistory(activePersona.id, messagesRef.current);
      archiveConversationRecords(activePersona.id, messagesRef.current as ConversationRecord[]);
    }

    stopVadInterruptionMonitor();
    stopRealtimeTranscription();

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
      callTurnIdRef.current += 1;
      if (activeCallAbortControllerRef.current) {
        try { activeCallAbortControllerRef.current.abort(); } catch {}
        activeCallAbortControllerRef.current = null;
      }
      stopRealtimeTranscription();
      stopVadInterruptionMonitor();
      if (voiceEnrollmentTimerRef.current) clearInterval(voiceEnrollmentTimerRef.current);
      if (voiceEnrollmentFinishRef.current) clearTimeout(voiceEnrollmentFinishRef.current);
      voiceEnrollmentActiveRef.current = false;
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
    const initialMessages: ChatMessage[] = [{
      id: uid(),
      role: 'persona',
      type: 'text',
      content: greeting,
      timestamp: new Date(),
    }];
    messagesRef.current = initialMessages;
    setMessages(initialMessages);
    saveHistory(persona.id, initialMessages);
    archiveConversationRecords(persona.id, initialMessages as ConversationRecord[]);
    setGeneratedReplies([]);
    setReplyInput('');
  }, [fetchDynamicGreeting]);

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 1) saveHistory(selectedPersonaId, messages);
  }, [messages, selectedPersonaId]);

  useEffect(() => {
    // Load persisted history or reset when persona changes
    migrateRecentConversationToArchive(selectedPersonaId);
    const history = loadHistory(selectedPersonaId);
    if (history.length > 0) {
      messagesRef.current = history;
      setMessages(history);
    } else {
      resetConversation(personas.find(p => p.id === selectedPersonaId) || propActivePersona);
    }
    setSavedMsgIds(new Set());

    try {
      const rRaw = accountLocalStorage.getItem(`persona_relationship_${selectedPersonaId}`);
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

  const appendConversationMessages = useCallback((records: ChatMessage[]): ChatMessage[] => {
    const next = mergeUniqueConversationRecords(
      messagesRef.current as ConversationRecord[],
      records as ConversationRecord[],
    ).map(record => ({
      ...record,
      timestamp: record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp),
    })) as ChatMessage[];
    messagesRef.current = next;
    setMessages(next);
    saveHistory(selectedPersonaId, next);
    archiveConversationRecords(selectedPersonaId, records as ConversationRecord[]);
    return next;
  }, [selectedPersonaId]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>): string => {
    const id = uid();
    const record: ChatMessage = { ...msg, id, timestamp: new Date() };
    appendConversationMessages([record]);
    return id;
  }, [appendConversationMessages]);

  const replaceMessage = useCallback((id: string, update: Partial<ChatMessage>) => {
    const next = messagesRef.current.map(m => m.id === id ? { ...m, ...update } : m);
    messagesRef.current = next;
    setMessages(next);
    saveHistory(selectedPersonaId, next);
    const updated = next.find(message => message.id === id);
    if (updated) archiveConversationRecords(selectedPersonaId, [updated] as ConversationRecord[]);
  }, [selectedPersonaId]);

  const activeAbortControllersRef = useRef<Record<string, AbortController>>({});

  const handleCancelGeneration = useCallback((msgId: string) => {
    if (activeAbortControllersRef.current[msgId]) {
      try {
        activeAbortControllersRef.current[msgId].abort();
      } catch {}
      delete activeAbortControllersRef.current[msgId];
    }
    const next = messagesRef.current.filter(m => m.id !== msgId);
    messagesRef.current = next;
    setMessages(next);
    saveHistory(selectedPersonaId, next);
    setIsGenerating(false);
    toast('Generation cancelled', { icon: '🛑', id: 'cancel-gen-' + msgId });
  }, [selectedPersonaId]);

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

  const handleDeleteGeneratedImage = useCallback((msg: ChatMessage) => {
    if (msg.type !== 'image') return;
    const confirmed = window.confirm(
      'Delete this image from the conversation? A separately saved Vault copy will not be removed.',
    );
    if (!confirmed) return;

    const next = messagesRef.current.filter(message => message.id !== msg.id);
    messagesRef.current = next;
    setMessages(next);
    deleteConversationRecord(selectedPersonaId, msg.id);
    setSavedMsgIds(previous => {
      const updated = new Set(previous);
      updated.delete(msg.id);
      return updated;
    });
    if (lightboxMedia?.url === msg.content) setLightboxMedia(null);
    if (activeCallMedia?.type === 'image' && activeCallMedia.url === msg.content) setActiveCallMedia(null);
    toast.success('Image removed from this conversation');
  }, [activeCallMedia, lightboxMedia, selectedPersonaId]);

  const refreshMemoryCenter = useCallback(() => {
    setMemoryNotes(loadPersonaMemoryNotes(selectedPersonaId, getDefaultPersonaMemoryFacts()));
    setMemoryActivity(
      loadConversationArchive(selectedPersonaId)
        .filter(record => record.type === 'text' && record.content.trim())
        .reverse(),
    );
  }, [selectedPersonaId]);

  useEffect(() => {
    if (showMemoryCenter) refreshMemoryCenter();
  }, [refreshMemoryCenter, showMemoryCenter]);

  const openMemoryCenter = useCallback(() => {
    setMemorySearch('');
    setNewMemoryDraft('');
    setEditingMemoryId(null);
    setShowMemoryCenter(true);
  }, []);

  const handleAddMemoryNote = useCallback(() => {
    const text = newMemoryDraft.trim();
    if (!text) return;
    setMemoryNotes(addPersonaMemoryNote(selectedPersonaId, text, 'manual', getDefaultPersonaMemoryFacts()));
    setNewMemoryDraft('');
    toast.success(`${activePersona.name} will remember that`);
  }, [activePersona.name, newMemoryDraft, selectedPersonaId]);

  const handleSaveMemoryEdit = useCallback(() => {
    if (!editingMemoryId || !editingMemoryDraft.trim()) return;
    setMemoryNotes(updatePersonaMemoryNote(selectedPersonaId, editingMemoryId, editingMemoryDraft));
    setEditingMemoryId(null);
    setEditingMemoryDraft('');
    toast.success('Memory corrected');
  }, [editingMemoryDraft, editingMemoryId, selectedPersonaId]);

  const handleToggleMemoryPin = useCallback((noteId: string) => {
    setMemoryNotes(togglePersonaMemoryPinned(selectedPersonaId, noteId));
  }, [selectedPersonaId]);

  const handleForgetMemoryNote = useCallback((noteId: string) => {
    setMemoryNotes(deletePersonaMemoryNote(selectedPersonaId, noteId));
    if (editingMemoryId === noteId) setEditingMemoryId(null);
    toast.success('Memory forgotten');
  }, [editingMemoryId, selectedPersonaId]);

  const handleForgetConversationRecord = useCallback((recordId: string) => {
    if (!window.confirm('Forget this individual message from this persona’s history?')) return;
    deleteConversationRecord(selectedPersonaId, recordId);
    setMemoryActivity(previous => previous.filter(record => record.id !== recordId));
    const nextMessages = messagesRef.current.filter(message => message.id !== recordId);
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setCallTranscript(previous => previous.filter(record => record.id !== recordId));
    toast.success('Message removed from memory');
  }, [selectedPersonaId]);

  const normalizedMemorySearch = memorySearch.trim().toLowerCase();
  const visibleMemoryNotes = memoryNotes.filter(note => (
    !normalizedMemorySearch || note.text.toLowerCase().includes(normalizedMemorySearch)
  ));
  const visibleMemoryActivity = memoryActivity.filter(record => (
    !normalizedMemorySearch || record.content.toLowerCase().includes(normalizedMemorySearch)
  ));
  const memoryVoiceCount = memoryActivity.filter(record => record.source === 'voice').length;
  const memoryTextCount = memoryActivity.filter(record => record.source !== 'voice').length;
  const recentMemorySummary = buildRecentConversationSummary([...memoryActivity].reverse(), activePersona.name);

  const clearHistory = () => {
    clearConversationHistory(selectedPersonaId);
    resetConversation(activePersona);
    toast.success('Conversation cleared');
  };

  async function handleSend() {
    const text = input.trim();
    if ((!text && !chatAttachment) || isGenerating) return;
    const effectiveText = text || (chatAttachment ? `[Shared ${chatAttachment.type}: ${chatAttachment.name}]` : '');
    setInput('');
    setIsGenerating(true);

    const sentAttachment = chatAttachment;
    const pastedRevisionSource = getAttachmentRevisionSource(sentAttachment);
    setChatAttachment(null);

    const userMsgObj: any = { role: 'user', type: 'text', content: effectiveText, source: 'text' };
    if (sentAttachment) {
      userMsgObj.attachment = sentAttachment;
    }
    const userMessageId = addMessage(userMsgObj);

    // Save facts / user memories if mentioned
    if (effectiveText.length > 3 && /\b(my name is|i am|i live|i love|i work|remember that|my goal is|call me)\b/i.test(effectiveText)) {
      savePersonaMemory(activePersona.id, effectiveText);
    }

    // Show useful feedback immediately instead of waiting for the chat model to
    // finish classifying the request. The label becomes more specific once the
    // selected provider/model is known below.
    const immediateIntent = detectIntent(effectiveText);
    const immediateImageRevision = resolveImageRevisionContext(
      effectiveText,
      messagesRef.current,
      pastedRevisionSource,
    );
    const immediateLoadingLabel = immediateImageRevision.isRevision || immediateIntent === 'image'
      ? 'Preparing your image generation...'
      : immediateIntent === 'video'
        ? 'Preparing your video generation...'
        : 'Thinking...';
    const loadingId = addMessage({
      role: 'persona',
      type: 'loading',
      content: immediateLoadingLabel,
    });

    try {
      const personaMemories = loadPersonaMemories(activePersona.id);
      const conversationContext = mergeUniqueConversationRecords(
        searchConversationMemories(activePersona.id, effectiveText, 12),
        loadConversationContext(activePersona.id, 60),
        messagesRef.current.slice(-60) as ConversationRecord[],
      ).filter(record => record.id !== userMessageId && record.type !== 'loading');

      const creator = getCreatorProfile();
      const res = await authFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activePersona,
          creatorProfile: creator,
          userName: creator.name || getStoredUserName(),
          // Text and voice share one canonical timeline. The current user turn
          // is sent separately below so the server never sees it twice.
          messages: [],
          priorChatHistory: conversationContext.map(m => ({
            id: m.id,
            role: m.role,
            type: m.type,
            content: m.content,
            prompt: m.prompt,
            source: m.source,
            timestamp: m.timestamp,
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

      const replyText = typeof data.reply === 'string' && data.reply.trim()
        ? data.reply.trim()
        : data.action?.type
          ? `I'm working on that ${data.action.type} now.`
          : '';
      if (!replyText) throw new Error('The persona returned an empty reply. Please try again.');

      // Determine if a photo, video, or voice note was requested or returned as an action:
      const incompleteMediaRequest = detectIncompleteMediaCreationRequest(effectiveText);
      const explicitVisualKeywords = /\b(image|photo|pic|picture|selfie|pose|portrait|photoshoot|video|clip|recording)\b/i.test(effectiveText);
      const isExplicitVisualRequest = !incompleteMediaRequest && /\b(send|take|generate|show|give|snap|make|create|post|capture)\b/i.test(effectiveText) && explicitVisualKeywords;
      const isConversationalQuestion = !isExplicitVisualRequest && /(?:\b(?:why did you send|why are you sending|what is that picture|who is that in the photo|stop sending)\b)/i.test(effectiveText);
      const detectedIntent = isConversationalQuestion ? 'chat' : detectIntent(effectiveText);
      const imageRevisionCandidate = resolveImageRevisionContext(effectiveText, messagesRef.current, pastedRevisionSource);
      
      const isVoiceNoteAction = data.action?.type === 'voice_note' || (/\b(voice note|audio memo|voice message|audio message|whisper to me)\b/i.test(effectiveText) && !isConversationalQuestion);
      const isVideoAction = data.action?.type === 'video' || detectedIntent === 'video';
      const isImageAction = !isVideoAction && (imageRevisionCandidate.isRevision || data.action?.type === 'image' || isExplicitVisualRequest || detectedIntent === 'image');

      if (isVoiceNoteAction) {
        replaceMessage(loadingId, { type: 'text', content: replyText });
        const vnLoadingId = addMessage({ role: 'persona', type: 'loading', content: `Recording voice note for you...` });
        try {
          const vnRes = await authFetch('/api/generate-voice-note', {
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
      } else if (isImageAction || isVideoAction) {
        const mediaType = isImageAction ? 'image' as const : 'video' as const;
        const rawMediaPrompt = String(data.action?.prompt || effectiveText).trim();
        const modelSelection = resolveMediaModelFromPrompt(
          rawMediaPrompt,
          mediaType === 'image' ? editModels : videoModels,
          mediaType,
        );
        const mediaPrompt = modelSelection.prompt;
        const imageRevision = mediaType === 'image'
          ? resolveImageRevisionContext(mediaPrompt, messagesRef.current, pastedRevisionSource)
          : { isRevision: false, prompt: mediaPrompt, source: undefined, rootPrompt: undefined, revisionHistory: undefined };
        const requestPrompt = imageRevision.prompt;
        const requestedModelId = modelSelection.explicit && modelSelection.matched
          ? modelSelection.modelId
          : mediaType === 'image'
            ? imageRevision.source?.modelId || selectedEditModelId || 'wavespeed:bytedance/seedream-v5.0-pro'
            : selectedVideoModelId || 'wavespeed-i2v:bytedance/seedance-2-mini';
        replaceMessage(loadingId, {
          type: 'loading',
          content: modelSelection.explicit && modelSelection.matched
            ? `${mediaType === 'image' ? 'Generating' : 'Rendering'} with ${modelSelection.modelName}...`
            : mediaType === 'image' ? `Generating your image...` : `Rendering your video...`,
        });
        try {
          if (modelSelection.explicit && !modelSelection.matched) {
            throw new Error(
              `I couldn't find “${modelSelection.requestedText}” in your available ${mediaType} models. Try another model name or choose one in AI Settings.`,
            );
          }
          const extraImages = [
            sentAttachment?.type === 'image' && !sentAttachment.sourceMessageId ? sentAttachment.base64 : undefined,
            !sentAttachment && lastUploadedReference ? lastUploadedReference : undefined,
          ].filter((value): value is string => Boolean(value));
          const result = await requestPersonaMediaJob({
            type: mediaType,
            prompt: requestPrompt,
            persona: activePersona,
            imageModelId: mediaType === 'image' ? requestedModelId : selectedEditModelId || 'wavespeed:bytedance/seedream-v5.0-pro',
            videoModelId: mediaType === 'video' ? requestedModelId : selectedVideoModelId || 'wavespeed-i2v:bytedance/seedance-2-mini',
            referenceImage: activePersona.referenceImage || activePersona.avatar || activePersona.alternateReferenceImage,
            revisionImage: imageRevision.isRevision ? imageRevision.source?.content : undefined,
            additionalImages: extraImages.length > 0 ? extraImages : undefined,
            creatorProfile: creator,
            aspectRatio: '9:16',
            allowNsfw: true,
          });
          const resultText = modelSelection.explicit && modelSelection.matched
            ? `${result.message} Used ${result.model || modelSelection.modelName}.`
            : result.message;
          replaceMessage(loadingId, { type: 'text', content: resultText });
          addMessage({
            role: 'persona',
            type: mediaType,
            content: result.url!,
            prompt: requestPrompt,
            rootPrompt: mediaType === 'image' ? imageRevision.rootPrompt || mediaPrompt : undefined,
            revisionHistory: mediaType === 'image' ? imageRevision.revisionHistory || [] : undefined,
            parentMediaId: imageRevision.isRevision ? imageRevision.source?.id : undefined,
            participants: result.participants,
            modelId: requestedModelId,
            modelName: result.model || imageRevision.source?.modelName,
          });
        } catch (mediaError: any) {
          replaceMessage(loadingId, {
            type: 'error',
            content: mediaError?.message || `I couldn't finish that ${mediaType}.`,
          });
        }
      } else {
        replaceMessage(loadingId, { type: 'text', content: replyText });
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

      const res = await authFetch('/api/chat', {
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
                </div>
              </div>
            </div>

            {/* Right: Mode Switcher + AI Settings + Quick Actions + Voice Call */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">

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

              <button
                onClick={openMemoryCenter}
                title={`Open ${activePersona.name}'s Memory Center`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#24252b] hover:bg-[#2b2c33] border border-white/[0.09] text-zinc-200 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <Brain size={13} className="text-[#E7C477]" />
                <span className="hidden sm:inline">Memory</span>
              </button>

              <button
                onClick={() => setShowMediaJobCenter(true)}
                title="Open Media Job Center"
                aria-label="Open Media Job Center"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#24252b] hover:bg-[#2b2c33] border border-white/[0.09] text-zinc-200 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <Sparkles size={13} className="text-[#E7C477]" />
                <span className="hidden sm:inline">Jobs</span>
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
                onClick={requestStartCall}
                className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer"
              >
                <Phone size={13} />
                <span>Voice Call</span>
                {voiceIdentityProfile?.enabled && (
                  <ShieldCheck size={13} className="text-emerald-300" aria-label="Speaker Lock active" />
                )}
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
                  onImageClick={(url, prompt, initialMode) => setLightboxMedia({ url, prompt, initialMode })}
                  onGenerateTalkingVideo={handleGenerateTalkingVideo}
                  onSetAsPrimaryReference={handleSetPrimaryReferenceImage}
                  onCancelGeneration={handleCancelGeneration}
                  onDeleteImage={handleDeleteGeneratedImage}
                  onCopyImage={handleCopyGeneratedImage}
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
                  onPaste={handleChatPaste}
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

      <AnimatePresence>
        {showMemoryCenter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-xl"
            onClick={() => setShowMemoryCenter(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={event => event.stopPropagation()}
              className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/[0.14] bg-[#17181d] shadow-[0_32px_100px_rgba(0,0,0,0.8)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="memory-center-title"
            >
              <div className="border-b border-white/[0.09] bg-gradient-to-br from-[#E7C477]/[0.12] via-transparent to-cyan-500/[0.05] px-5 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-2xl border border-[#E7C477]/30 bg-[#E7C477]/10">
                      {activePersona.referenceImage || activePersona.avatar ? (
                        <PersonaAvatar
                          src={activePersona.referenceImage || activePersona.avatar}
                          alt={activePersona.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Brain size={22} className="absolute inset-0 m-auto text-[#F2D58D]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E7C477]">Persona intelligence</p>
                      <h2 id="memory-center-title" className="truncate text-xl font-extrabold text-white sm:text-2xl">
                        {activePersona.name}&apos;s Memory Center
                      </h2>
                      <p className="mt-1 text-xs text-zinc-400">Review, correct, pin, or forget anything this persona remembers.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMemoryCenter(false)}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Close Memory Center"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
                  {[
                    [`${memoryNotes.filter(note => note.pinned).length}`, 'Pinned facts'],
                    [`${memoryTextCount}`, 'Text turns'],
                    [`${memoryVoiceCount}`, 'Voice turns'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2">
                      <p className="text-sm font-black text-white">{value}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar sm:p-6">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      value={memorySearch}
                      onChange={event => setMemorySearch(event.target.value)}
                      placeholder="Search memories and conversation history…"
                      className="w-full rounded-xl border border-white/[0.10] bg-[#101115] py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#E7C477]/45"
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-2.5 text-xs font-bold text-emerald-300">
                    <Check size={15} /> Text and voice share one memory
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E7C477]/20 bg-[#E7C477]/[0.055] p-4">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#F2D58D]">
                    <MessageSquareQuote size={15} /> Latest interaction summary
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{recentMemorySummary}</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="min-h-[360px] rounded-2xl border border-white/[0.09] bg-[#121318] p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
                          <Brain size={16} className="text-[#E7C477]" /> Important memories
                        </h3>
                        <p className="mt-1 text-[11px] text-zinc-500">Pinned facts are prioritized in future conversations.</p>
                      </div>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-zinc-400">
                        {visibleMemoryNotes.length}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <input
                        value={newMemoryDraft}
                        onChange={event => setNewMemoryDraft(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') handleAddMemoryNote();
                        }}
                        placeholder={`Add something ${activePersona.name} should remember…`}
                        className="min-w-0 flex-1 rounded-xl border border-white/[0.10] bg-black/25 px-3 py-2.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-[#E7C477]/45"
                      />
                      <button
                        type="button"
                        onClick={handleAddMemoryNote}
                        disabled={!newMemoryDraft.trim()}
                        className="flex items-center gap-1.5 rounded-xl bg-[#E7C477] px-3 py-2 text-xs font-black text-zinc-950 transition-colors hover:bg-[#F2D58D] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>

                    <div className="mt-4 max-h-[390px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                      {visibleMemoryNotes.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/[0.10] p-8 text-center text-xs text-zinc-500">
                          No matching memories.
                        </div>
                      ) : visibleMemoryNotes.map(note => (
                        <div key={note.id} className="group rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 transition-colors hover:border-white/[0.14]">
                          {editingMemoryId === note.id ? (
                            <div className="space-y-2">
                              <textarea
                                autoFocus
                                value={editingMemoryDraft}
                                onChange={event => setEditingMemoryDraft(event.target.value)}
                                onKeyDown={event => {
                                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') handleSaveMemoryEdit();
                                  if (event.key === 'Escape') setEditingMemoryId(null);
                                }}
                                rows={3}
                                className="w-full resize-none rounded-lg border border-[#E7C477]/35 bg-black/30 px-3 py-2 text-xs leading-relaxed text-white outline-none"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button type="button" onClick={() => setEditingMemoryId(null)} className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 hover:text-white">Cancel</button>
                                <button type="button" onClick={handleSaveMemoryEdit} className="flex items-center gap-1 rounded-lg bg-[#E7C477] px-2.5 py-1.5 text-[10px] font-black text-zinc-950"><Check size={11} /> Save</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleMemoryPin(note.id)}
                                className={cn(
                                  'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border transition-colors',
                                  note.pinned
                                    ? 'border-[#E7C477]/40 bg-[#E7C477]/15 text-[#F2D58D]'
                                    : 'border-white/[0.08] bg-black/20 text-zinc-600 hover:text-zinc-300',
                                )}
                                title={note.pinned ? 'Unpin memory' : 'Pin memory'}
                              >
                                <Pin size={12} className={note.pinned ? 'fill-current' : ''} />
                              </button>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs leading-relaxed text-zinc-200">{note.text}</p>
                                <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                                  {note.source === 'manual' ? 'Added by you' : note.source === 'default' ? 'Core memory' : 'Learned from chat'}
                                </p>
                              </div>
                              <div className="flex flex-shrink-0 gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMemoryId(note.id);
                                    setEditingMemoryDraft(note.text);
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.08] hover:text-white"
                                  title="Correct memory"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleForgetMemoryNote(note.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400"
                                  title="Forget memory"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="min-h-[360px] rounded-2xl border border-white/[0.09] bg-[#121318] p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
                          <BookOpen size={16} className="text-cyan-300" /> Conversation memory
                        </h3>
                        <p className="mt-1 text-[11px] text-zinc-500">Recent text and voice turns in one continuous timeline.</p>
                      </div>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-zinc-400">
                        {visibleMemoryActivity.length}
                      </span>
                    </div>

                    <div className="mt-4 max-h-[470px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                      {visibleMemoryActivity.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/[0.10] p-8 text-center text-xs text-zinc-500">
                          No matching conversation history.
                        </div>
                      ) : visibleMemoryActivity.slice(0, 40).map(record => (
                        <div key={record.id} className="group rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                'rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider',
                                record.source === 'voice'
                                  ? 'bg-emerald-400/10 text-emerald-300'
                                  : 'bg-cyan-400/10 text-cyan-300',
                              )}>
                                {record.source === 'voice' ? 'Voice' : 'Text'}
                              </span>
                              <span className="text-[10px] font-bold text-zinc-500">
                                {record.role === 'user' ? 'You' : activePersona.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <time className="text-[9px] text-zinc-600">
                                {new Date(record.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </time>
                              <button
                                type="button"
                                onClick={() => handleForgetConversationRecord(record.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 opacity-60 transition-colors hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                                title="Forget this message"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-300">{record.content}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional one-time Speaker Lock setup before the first voice call */}
      <AnimatePresence>
        {showSpeakerLockSetup && !isCallActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl"
            onClick={() => {
              if (voiceEnrollmentStatus === 'recording') return;
              cancelVoiceEnrollment(true);
              setShowSpeakerLockSetup(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={event => event.stopPropagation()}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/[0.14] bg-[#18191e] shadow-[0_32px_100px_rgba(0,0,0,0.75)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="speaker-lock-setup-title"
            >
              <button
                type="button"
                onClick={() => {
                  cancelVoiceEnrollment(true);
                  setShowSpeakerLockSetup(false);
                }}
                disabled={voiceEnrollmentStatus === 'recording'}
                className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/25 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Close Speaker Lock setup"
              >
                <X size={17} />
              </button>

              <div className="border-b border-white/[0.08] bg-gradient-to-br from-emerald-500/[0.12] via-transparent to-[#E7C477]/[0.08] p-6 sm:p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 shadow-inner">
                  <ShieldCheck size={24} />
                </div>
                <h2 id="speaker-lock-setup-title" className="mt-4 text-2xl font-extrabold tracking-tight text-white">
                  {voiceEnrollmentStatus === 'ready' ? 'Speaker Lock is ready' : 'Let personas recognize your voice'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {voiceEnrollmentStatus === 'ready'
                    ? `${activePersona.name} will prioritize your voice and ignore longer turns from nearby speakers.`
                    : 'A quick 8-second setup helps personas tell you apart from other people in the room.'}
                </p>
              </div>

              <div className="space-y-4 p-6 sm:p-7">
                {voiceEnrollmentStatus === 'recording' ? (
                  <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] p-5 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
                      <Mic size={27} className="animate-pulse text-emerald-300" />
                    </div>
                    <div className="mt-3 font-mono text-3xl font-black text-white">{voiceEnrollmentSeconds}s</div>
                    <p className="mt-2 text-sm font-bold text-emerald-200">Speak naturally in your usual voice</p>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                      Try: “Hi, this is Dr. H. I’m setting up my voice so {activePersona.name} knows when I’m talking.”
                    </p>
                    <button
                      type="button"
                      onClick={() => cancelVoiceEnrollment()}
                      className="mt-4 text-xs font-semibold text-zinc-500 hover:text-zinc-300"
                    >
                      Cancel recording
                    </button>
                  </div>
                ) : voiceEnrollmentStatus === 'ready' && voiceIdentityProfile ? (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-zinc-950">
                        <Check size={19} strokeWidth={3} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">Your voice signature is saved</p>
                        <p className="mt-0.5 text-[11px] text-zinc-400">No microphone audio was stored.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ['8 seconds', 'One short voice sample'],
                      ['On-device', 'Audio never gets stored'],
                      ['Optional', 'Skip and call anytime'],
                    ].map(([title, description]) => (
                      <div key={title} className="rounded-xl border border-white/[0.09] bg-black/20 p-3">
                        <p className="text-xs font-bold text-zinc-100">{title}</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">{description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {voiceEnrollmentStatus === 'error' && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.07] p-3 text-xs text-amber-200">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    I couldn’t capture enough clear speech. Move closer to the microphone and try once more.
                  </div>
                )}

                {voiceEnrollmentStatus !== 'recording' && (
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    {voiceEnrollmentStatus !== 'ready' && (
                      <button
                        type="button"
                        onClick={skipSpeakerLockAndStartCall}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                      >
                        Skip &amp; start call
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={voiceEnrollmentStatus === 'ready' ? () => void handleStartCall() : () => void startVoiceEnrollment()}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#E7C477] px-5 py-3 text-sm font-extrabold text-zinc-950 shadow-lg transition-colors hover:bg-[#F2D58D]"
                    >
                      {voiceEnrollmentStatus === 'ready' ? <Phone size={16} /> : <Mic size={16} />}
                      {voiceEnrollmentStatus === 'ready' ? 'Start voice call' : voiceEnrollmentStatus === 'error' ? 'Try again' : 'Enroll my voice'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <button
                  onClick={() => setShowVoiceAccuracyPanel(open => !open)}
                  className={cn(
                    "p-2 rounded-lg border text-zinc-300 transition-all cursor-pointer",
                    showVoiceAccuracyPanel
                      ? "bg-[#E7C477]/15 border-[#E7C477]/45 text-[#F2D58D]"
                      : "bg-white/5 border-white/10 hover:bg-white/10",
                  )}
                  title="Voice accuracy and personal vocabulary"
                >
                  <SlidersHorizontal size={14} />
                </button>
                {voiceIdentityProfile?.enabled && (
                  <button
                    type="button"
                    onClick={() => setShowVoiceAccuracyPanel(true)}
                    className={cn(
                      'hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors',
                      ignoredSpeakerCount > 0
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                        : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]',
                    )}
                    title="Open Speaker Lock details"
                  >
                    <ShieldCheck size={12} />
                    {ignoredSpeakerCount > 0 ? `${ignoredSpeakerCount} ignored` : 'Speaker Lock'}
                  </button>
                )}
                {lastVoiceLatency?.responseMs !== undefined && (
                  <div
                    className="hidden md:flex items-center gap-1.5 bg-cyan-500/[0.08] border border-cyan-500/20 rounded-full px-2.5 py-1 text-[10px] font-semibold text-cyan-200"
                    title={`Last reply: recognition ${formatLatency(lastVoiceLatency.recognitionMs)}, AI ${formatLatency(lastVoiceLatency.modelMs)}, voice ${formatLatency(lastVoiceLatency.speechMs)}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    Reply {formatLatency(lastVoiceLatency.responseMs)}
                  </div>
                )}
                {callStatus !== 'connecting' && (
                  <div className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs font-mono text-zinc-300">
                    {formatDuration(callDuration)}
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence>
              {showVoiceAccuracyPanel && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  className="absolute top-16 right-4 sm:right-6 z-[70] w-[min(92vw,430px)] max-h-[72vh] overflow-y-auto custom-scrollbar rounded-2xl border border-white/[0.14] bg-[#17181d]/98 shadow-2xl backdrop-blur-2xl p-4 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-white font-bold">
                        <BookOpen size={16} className="text-[#E7C477]" /> Voice Accuracy
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        {voiceAccuracyProfile.corrections.length} learned correction{voiceAccuracyProfile.corrections.length === 1 ? '' : 's'} · {voiceAccuracyProfile.customTerms.length} vocabulary term{voiceAccuracyProfile.customTerms.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowVoiceAccuracyPanel(false)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                      aria-label="Close voice accuracy settings"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05] p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-cyan-100">Live call health</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Echo protection on · interruption ready · complete-response recovery on</p>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        ['Hearing', lastVoiceLatency?.recognitionMs],
                        ['AI', lastVoiceLatency?.modelMs],
                        ['Voice', lastVoiceLatency?.speechMs],
                        ['Reply', lastVoiceLatency?.responseMs],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-lg bg-black/25 border border-white/[0.07] px-2 py-2 text-center">
                          <p className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</p>
                          <p className="text-[11px] font-bold text-zinc-200 mt-0.5">{formatLatency(value as number | undefined)}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-zinc-500">Reply measures the final transcript to the first audible persona response.</p>
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-emerald-100">Speaker Lock</p>
                          {voiceIdentityProfile && (
                            <span className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border',
                              voiceIdentityProfile.enabled
                                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
                            )}>
                              {voiceIdentityProfile.enabled ? 'Active' : 'Paused'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Enroll Dr. H's voice so longer turns from other people can be ignored.
                        </p>
                      </div>
                      {voiceEnrollmentStatus !== 'recording' && (
                        <button
                          onClick={startVoiceEnrollment}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-400 text-zinc-950 text-[11px] font-bold cursor-pointer hover:bg-emerald-300"
                        >
                          {voiceIdentityProfile ? 'Enroll again' : 'Enroll my voice'}
                        </button>
                      )}
                    </div>

                    {voiceEnrollmentStatus === 'recording' && (
                      <div className="rounded-lg border border-emerald-400/25 bg-black/25 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold text-emerald-200 animate-pulse">Speak naturally now…</p>
                          <span className="font-mono text-sm font-bold text-white">{voiceEnrollmentSeconds}s</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-zinc-400 mt-1.5">
                          Read a few normal sentences in your usual voice. Audio is not saved; only a compact voice signature is stored.
                        </p>
                        <button onClick={() => cancelVoiceEnrollment()} className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer">Cancel</button>
                      </div>
                    )}

                    {voiceIdentityProfile && voiceEnrollmentStatus !== 'recording' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={toggleVoiceIdentityLock}
                          className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/20 text-[10px] font-bold text-zinc-200 hover:bg-white/[0.07] cursor-pointer"
                        >
                          {voiceIdentityProfile.enabled ? 'Pause lock' : 'Enable lock'}
                        </button>
                        <button
                          onClick={removeVoiceIdentityProfile}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] text-[10px] font-bold text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                        >
                          Remove profile
                        </button>
                        <span className="ml-auto text-[9px] text-zinc-500">
                          {ignoredSpeakerCount} ignored this call
                          {lastSpeakerMatchScore !== null ? ` · last match ${Math.round(lastSpeakerMatchScore * 100)}%` : ''}
                        </span>
                      </div>
                    )}

                    {voiceEnrollmentStatus === 'error' && (
                      <p className="text-[10px] text-amber-300">Not enough clear speech was captured. Try again closer to the microphone.</p>
                    )}
                    <p className="text-[9px] text-zinc-500">Speaker Lock is a conversational filter, not identity authentication. Very short phrases are allowed when there is not enough audio to compare safely.</p>
                  </div>

                  <div className="rounded-xl border border-[#E7C477]/20 bg-[#E7C477]/[0.06] p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#F2D58D]">Optional voice calibration</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Read three short sentences so names and model terms are recognized correctly.</p>
                      </div>
                      {calibrationStep === null && (
                        <button
                          onClick={startVoiceCalibration}
                          className="px-3 py-1.5 rounded-lg bg-[#E7C477] text-zinc-950 text-[11px] font-bold cursor-pointer hover:bg-[#F2D58D]"
                        >
                          {voiceAccuracyProfile.calibrationCompletedAt ? 'Run again' : 'Start'}
                        </button>
                      )}
                    </div>

                    {calibrationStep !== null && (
                      <div className="space-y-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Sentence {calibrationStep + 1} of {VOICE_CALIBRATION_SENTENCES.length}
                        </div>
                        <p className="text-sm leading-relaxed text-white rounded-lg bg-black/25 border border-white/10 p-2.5">
                          “{VOICE_CALIBRATION_SENTENCES[calibrationStep]}”
                        </p>
                        {calibrationCapture ? (
                          <div className="space-y-2">
                            <p className="text-[11px] text-zinc-300"><span className="text-zinc-500">Heard:</span> “{calibrationCapture.heard}”</p>
                            <p className="text-[10px] text-emerald-300">
                              {calibrationCapture.corrections.length > 0
                                ? `${calibrationCapture.corrections.length} pronunciation correction${calibrationCapture.corrections.length === 1 ? '' : 's'} found.`
                                : 'Perfect match — no correction needed.'}
                            </p>
                            <button
                              onClick={acceptCalibrationCapture}
                              className="w-full py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold cursor-pointer hover:bg-emerald-500/20"
                            >
                              <Check size={13} className="inline mr-1" />
                              {calibrationStep === VOICE_CALIBRATION_SENTENCES.length - 1 ? 'Finish calibration' : 'Save & next sentence'}
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-emerald-300 animate-pulse">Listening — read the sentence naturally…</p>
                        )}
                        <button onClick={cancelVoiceCalibration} className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer">Cancel calibration</button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-zinc-200">Add a correction manually</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={manualHeardDraft}
                        onChange={event => setManualHeardDraft(event.target.value)}
                        placeholder="App heard…"
                        className="min-w-0 rounded-lg bg-black/25 border border-white/10 px-2.5 py-2 text-xs text-white outline-none focus:border-[#E7C477]/50"
                      />
                      <input
                        value={manualIntendedDraft}
                        onChange={event => setManualIntendedDraft(event.target.value)}
                        onKeyDown={event => { if (event.key === 'Enter') saveManualVoiceCorrection(); }}
                        placeholder="You meant…"
                        className="min-w-0 rounded-lg bg-black/25 border border-white/10 px-2.5 py-2 text-xs text-white outline-none focus:border-[#E7C477]/50"
                      />
                    </div>
                    <button
                      onClick={saveManualVoiceCorrection}
                      disabled={!manualHeardDraft.trim() || !manualIntendedDraft.trim()}
                      className="w-full py-2 rounded-lg bg-white/[0.06] border border-white/10 text-zinc-200 text-xs font-bold disabled:opacity-40 cursor-pointer hover:bg-white/10"
                    >
                      <Plus size={13} className="inline mr-1" /> Add to personal vocabulary
                    </button>
                  </div>

                  {voiceAccuracyProfile.corrections.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-zinc-200">Learned corrections</p>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                        {voiceAccuracyProfile.corrections.slice(0, 12).map(correction => (
                          <div key={`${correction.heard}-${correction.intended}`} className="flex items-center gap-2 rounded-lg bg-black/20 border border-white/[0.07] px-2.5 py-2 text-[11px]">
                            <span className="text-zinc-500 truncate">{correction.heard}</span>
                            <span className="text-[#E7C477]">→</span>
                            <span className="text-zinc-200 truncate flex-1">{correction.intended}</span>
                            <button
                              onClick={() => updateVoiceAccuracyProfile(profile => ({
                                ...profile,
                                corrections: profile.corrections.filter(item => item !== correction),
                              }))}
                              className="p-1 text-zinc-600 hover:text-rose-400 cursor-pointer"
                              title="Remove correction"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Visualizer Area */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 my-2 relative">
              {/* Status Indicator */}
              <div className="text-center z-10 min-h-[38px] flex flex-col items-center justify-center px-4">
                {pendingVoiceConfirmation ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs shadow-sm backdrop-blur-md max-w-[540px]"
                  >
                    <span>Did you mean: “{pendingVoiceConfirmation}”?</span>
                    <button
                      onClick={confirmPendingVoiceRequest}
                      className="px-2.5 py-1 rounded-lg bg-amber-300 text-zinc-950 font-bold cursor-pointer"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => {
                        setPendingVoiceConfirmation(null);
                        setCallInput('');
                        setCallStatus('listening');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 text-zinc-200 font-bold cursor-pointer"
                    >
                      Keep speaking
                    </button>
                  </motion.div>
                ) : liveUserSpeech ? (
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
                       callStatus === 'thinking' ? `${activePersona?.name || 'Persona'} Thinking` :
                       callStatus === 'speaking' ? `${activePersona?.name || 'Persona'} Speaking` :
                       callStatus === 'listening' ? 'Listening to You' : 'Connected'}
                    </span>
                    <p className="text-xs text-zinc-400 font-medium">
                      {callStatus === 'connecting' ? 'Establishing secure connection...' : 
                       callStatus === 'thinking' ? 'Preparing a response — you can interrupt anytime...' :
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
                      {activeCallMedia.type === 'image' && activeCallMedia.messageId && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const imageMessage = messagesRef.current.find(message => message.id === activeCallMedia.messageId);
                            if (imageMessage) handleDeleteGeneratedImage(imageMessage);
                          }}
                          className="p-1.5 rounded-full bg-black/80 hover:bg-rose-600 text-white text-xs backdrop-blur-md transition-colors"
                          title="Delete from conversation"
                          aria-label="Delete generated image"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
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
                          {!isPersona && item.source === 'voice' && editingVoiceTranscriptId !== item.id && (
                            <button
                              onClick={() => {
                                setEditingVoiceTranscriptId(item.id);
                                setVoiceCorrectionDraft(item.content);
                              }}
                              className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-[#F2D58D] cursor-pointer"
                              title="Correct what the app heard"
                            >
                              <Pencil size={10} /> Correct
                            </button>
                          )}
                        </div>

                        {editingVoiceTranscriptId === item.id ? (
                          <div className="space-y-2">
                            <p className="text-[10px] text-zinc-500">Heard: “{item.rawContent || item.content}”</p>
                            <input
                              autoFocus
                              value={voiceCorrectionDraft}
                              onChange={event => setVoiceCorrectionDraft(event.target.value)}
                              onKeyDown={event => {
                                if (event.key === 'Enter') saveInlineVoiceCorrection(item);
                                if (event.key === 'Escape') setEditingVoiceTranscriptId(null);
                              }}
                              className="w-full rounded-lg bg-black/30 border border-[#E7C477]/30 px-2.5 py-2 text-xs text-white outline-none focus:border-[#E7C477]"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setEditingVoiceTranscriptId(null)}
                                className="px-2 py-1 rounded-md text-[10px] text-zinc-400 hover:bg-white/10 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveInlineVoiceCorrection(item)}
                                className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#E7C477] text-zinc-950 cursor-pointer"
                              >
                                Learn correction
                              </button>
                            </div>
                          </div>
                        ) : item.type === 'loading' ? (
                          <GeneratingProgressBubble
                            msgId={item.id}
                            label={item.content}
                            compact
                          />
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

      <MediaJobCenter
        isOpen={showMediaJobCenter}
        onClose={() => setShowMediaJobCenter(false)}
        onOpenResult={handleOpenMediaJobResult}
        onJobCompleted={handleRecoveredMediaJob}
      />

      {/* Brand New Almost Fullscreen Image Lightbox Modal with Upscale, Edit, and Download */}
      {lightboxMedia && (
        <ImageLightboxModal
          isOpen={!!lightboxMedia}
          onClose={() => setLightboxMedia(null)}
          imageUrl={lightboxMedia.url}
          prompt={lightboxMedia.prompt}
          persona={activePersona}
          initialMode={lightboxMedia.initialMode}
          onImageUpdated={handlePersistStudioImageVersion}
          onAnimateImage={handleAnimateImageFromStudio}
          onCreateTalkingAvatar={handleCreateTalkingAvatarFromStudio}
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
                        localStorage.setItem('agent_voice_llm_user_selected', '1');
                        const labels: Record<string, string> = {
                          'llama3.3': 'Meta Llama 3.3 70B (Cloud API)',
                          'ollama:llama3.3': 'Meta Llama 3.3 70B (Local GPU)',
                          venice: 'Venice Adult Roleplay (Uncensored)',
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
                      <option value="venice" className="bg-[#1c1d22] text-white">🔓 Venice Adult Roleplay (Uncensored)</option>
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
  onCancel,
  compact = false,
}: { 
  msgId?: string;
  label?: string; 
  onCancel?: (id: string) => void;
  compact?: boolean;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(previous => previous + 1);
    }, 1000);

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
    : 'Preparing your request...';

  const lowerLabel = cleanLabel.toLowerCase();
  const isVideo = /video|rendering/.test(lowerLabel);
  const isVoice = /voice|recording/.test(lowerLabel);
  const isImage = !isVideo && !isVoice && /image|photo|picture|visual/.test(lowerLabel);
  const title = isVideo
    ? 'Video generation in progress'
    : isVoice
      ? 'Voice note in progress'
      : isImage
        ? 'Image generation in progress'
        : 'Working on your request';
  const ActivityIcon = isVideo ? Video : isVoice ? Mic : isImage ? ImageIcon : Sparkles;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${title}. ${cleanLabel}`}
      className={cn(
        'group/loading relative overflow-hidden bg-[#151515]/98 backdrop-blur-md border border-[#E7C477]/45 rounded-2xl rounded-tl-sm shadow-xl shadow-black/60 transition-all',
        compact ? 'px-3 py-2.5 min-w-[230px] max-w-[320px]' : 'px-4 py-3.5 min-w-[280px] w-[min(380px,78vw)]',
      )}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-[#E7C477]/10 to-transparent"
        animate={{ x: ['0%', '300%'] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative flex items-center gap-3">
        <div className={cn(
          'relative flex-shrink-0 rounded-xl bg-[#E7C477]/10 border border-[#E7C477]/25 flex items-center justify-center',
          compact ? 'w-9 h-9' : 'w-11 h-11',
        )}>
          <ActivityIcon size={compact ? 17 : 20} className="text-[#F2D58D]" />
          <Loader2
            size={compact ? 29 : 36}
            className="absolute text-[#E7C477]/55 animate-spin"
            strokeWidth={1.25}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn('font-bold text-zinc-100 truncate', compact ? 'text-xs' : 'text-sm')}>
              {title}
            </p>
            <span className="text-[10px] font-mono font-semibold text-[#F2D58D]/80 tabular-nums flex-shrink-0">
              {elapsedSeconds}s
            </span>
          </div>
          <p className={cn('text-zinc-400 truncate mt-0.5', compact ? 'text-[10px]' : 'text-[11px]')}>
            {cleanLabel}
          </p>
          <div className="mt-2 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <motion.div
              className="h-full w-2/5 bg-gradient-to-r from-[#9C7A3C] via-[#F2D58D] to-[#B99655] rounded-full"
              animate={{ x: ['-110%', '260%'] }}
              transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>

        <div className="flex items-center flex-shrink-0">
          {onCancel && msgId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(msgId);
              }}
              className="w-6 h-6 rounded-full bg-white/[0.06] hover:bg-rose-500 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Cancel generation"
              aria-label="Cancel generation"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          )}
        </div>
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
  onImageClick?: (url: string, prompt?: string, initialMode?: ImageStudioMode) => void;
  onGenerateTalkingVideo?: (msg: ChatMessage) => void;
  onSetAsPrimaryReference?: (url: string) => void;
  onCancelGeneration?: (id: string) => void;
  onDeleteImage?: (msg: ChatMessage) => void;
  onCopyImage?: (msg: ChatMessage) => void;
}

function MessageBubble({ msg, persona, isLatest, onSaveToVault, isSaving, isSaved, onImageClick, onGenerateTalkingVideo, onSetAsPrimaryReference, onCancelGeneration, onDeleteImage, onCopyImage }: BubbleProps) {
  const isUser = msg.role === 'user';
  const shouldType = !isUser && msg.type === 'text' && isLatest;
  const { displayed, done } = useTypewriter(shouldType ? msg.content : '', 14);
  const textToShow = shouldType ? displayed : msg.content;
  const [showCopyAction, setShowCopyAction] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
  }, []);

  const revealCopyAction = () => {
    if (msg.content.trim()) setShowCopyAction(true);
  };

  const handleMessageKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      revealCopyAction();
    }
  };

  const handleCopyMessage = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      await copyTextToClipboard(msg.content);
      setCopied(true);
      toast.success('Message copied');
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy this message');
    }
  };

  const copyAction = showCopyAction && msg.content.trim() ? (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleCopyMessage}
      className={cn(
        'flex-shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer',
        copied
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
          : 'bg-[#24252b] hover:bg-[#2e3036] border-white/[0.10] text-zinc-400 hover:text-white',
      )}
      title={copied ? 'Copied' : 'Copy entire message'}
      aria-label={copied ? 'Message copied' : 'Copy entire message'}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </motion.button>
  ) : null;

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
        <div className="flex items-center justify-end gap-1.5 max-w-full">
          {copyAction}
          <div
            role="button"
            tabIndex={0}
            onClick={revealCopyAction}
            onKeyDown={handleMessageKeyDown}
            title="Click to show copy button"
            className="max-w-[75%] bg-[#28292f] hover:bg-[#2e2f36] border border-white/[0.12] text-zinc-100 rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[12.5px] sm:text-[13px] leading-relaxed shadow-sm transition-colors cursor-pointer select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7C477]/60"
          >
            {msg.content}
          </div>
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
          <div className="flex items-center gap-1.5 max-w-full">
            <div
              role="button"
              tabIndex={0}
              onClick={revealCopyAction}
              onKeyDown={handleMessageKeyDown}
              title="Click to show copy button"
              className="bg-[#1c1d22] border border-white/[0.08] text-zinc-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[12.5px] sm:text-[13px] leading-relaxed shadow-sm cursor-pointer select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7C477]/60"
            >
              {textToShow}
              {shouldType && !done && (
                <span className="inline-block w-0.5 h-3 bg-zinc-400 ml-1 animate-pulse rounded-sm" />
              )}
            </div>
            {copyAction}
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
              title="Open Media Studio"
            >
              <img
                src={msg.content}
                alt="Generated photoshoot"
                className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                onError={e => { (e.target as HTMLImageElement).alt = 'Failed to load image'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/85 text-white text-xs font-bold backdrop-blur-md shadow-2xl border border-[#E7C477]/40 transform group-hover:scale-105 transition-transform">
                  <Maximize2 size={14} className="text-[#F2D58D]" /> Open Media Studio
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
                title="Open the full Media Studio"
              >
                <Maximize2 size={11} className="text-[#E7C477]" />
                <span>Fullscreen</span>
              </button>

              <button
                type="button"
                onClick={() => onImageClick?.(msg.content, msg.prompt, 'edit')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-200 text-[10px] font-semibold transition-all cursor-pointer active:scale-95"
                title="Modify this image in Media Studio"
              >
                <Wand2 size={10} />
                <span>Modify</span>
              </button>

              <button
                type="button"
                onClick={() => onImageClick?.(msg.content, msg.prompt, 'upscale')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-200 text-[10px] font-semibold transition-all cursor-pointer active:scale-95"
                title="Create a separate HD-upscaled version"
              >
                <ArrowUpCircle size={10} />
                <span>Upscale HD</span>
              </button>

              <button
                type="button"
                onClick={() => onImageClick?.(msg.content, msg.prompt, 'animate')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-200 text-[10px] font-semibold transition-all cursor-pointer active:scale-95"
                title="Animate this image with the selected video model"
              >
                <Film size={10} />
                <span>Animate</span>
              </button>

              <button
                type="button"
                onClick={() => onCopyImage?.(msg)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-200 text-[10px] font-semibold transition-all cursor-pointer active:scale-95"
                title="Copy this image, then paste it into the prompt to modify it"
                aria-label="Copy generated image"
              >
                <Copy size={10} />
                <span>Copy</span>
              </button>

              <button
                onClick={() => onGenerateTalkingVideo?.(msg)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 text-[10px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Create a talking avatar using this photo and the persona's selected voice"
              >
                <Mic size={10} className="text-violet-400" />
                <span>Talking Avatar</span>
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

              <button
                type="button"
                onClick={() => onDeleteImage?.(msg)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 text-[10px] font-semibold transition-all cursor-pointer active:scale-95"
                title="Delete this image from the conversation"
                aria-label="Delete generated image"
              >
                <Trash2 size={10} />
                <span>Delete</span>
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
          <div className="flex items-center gap-1.5 max-w-full">
            <div
              role="button"
              tabIndex={0}
              onClick={revealCopyAction}
              onKeyDown={handleMessageKeyDown}
              title="Click to show copy button"
              className="bg-rose-500/10 border border-rose-500/20 rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-start gap-2 cursor-pointer select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
            >
              <AlertCircle size={14} className="text-rose-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-rose-300">{msg.content}</span>
            </div>
            {copyAction}
          </div>
        )}
      </div>
    </motion.div>
  );
}
