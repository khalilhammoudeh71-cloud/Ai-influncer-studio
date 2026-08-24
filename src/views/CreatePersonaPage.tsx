import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Upload, Image as ImageIcon, Wand2, Search, X, Check,
  Mic, User, Target, Hash, Info, Play, Music, Settings, Instagram, Twitter, Youtube,
  CheckCircle2, Flame, Loader2, Music2, Plus, Volume2, VolumeX, Heart, UserCheck, Star, Trash2, Sliders, Zap, Shield, ArrowRight, Wand, Layers, ChevronRight, ChevronLeft, FolderHeart, Download, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Persona, NavActions, GeneratedImage } from '../types';
import { api } from '../services/apiService';
import { studioImageJob } from '../services/mediaJobService';
import { persistPersonaReferenceImages } from '../services/personaMediaService';
import { supabase } from '../lib/supabase';
import { cn } from '../utils/cn';
import { processVoiceSampleFile } from '../utils/audioUtils';
import { accountLocalStorage } from '../utils/accountStorage';
import {
  clearPersonaDraftReferenceImages,
  getPersonaDraftReferenceImages,
  savePersonaDraftReferenceImages,
} from '../utils/indexedPersonaDraftDb';

interface CreatePersonaPageProps {
  personas: Persona[];
  setPersonas: (personas: Persona[]) => void;
  onSelectPersona: (id: string) => void;
  nav: NavActions;
  editingPersona?: Persona | null;
}

const PRESET_VOICES = [
  { id: 'rawan', name: 'Rawan Hasan (Clone)', description: 'Female • Authentic Cloned Creator Voice', gender: 'Female', preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/workspace/a71f6253bad14eebb9b202d33ae5e862/voices/W4ynDvR6NFiK8lj2I8iL/2dc5e6cf-9ef2-4556-b48a-89c9ae9aa81f.mp3' },
  { id: 'leen', name: 'Leen Hasan (Clone)', description: 'Female • Authentic Cloned Creator Voice', gender: 'Female', preview_url: 'https://api.us.elevenlabs.io/v1/voices/7jFje9BJoTWzqZzouT0j/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ3b3Jrc3BhY2VfaWQiOiJhNzFmNjI1M2JhZDE0ZWViYjliMjAyZDMzYWU1ZTg2MiIsImZpbGVuYW1lIjoiMTlhNWY3ZTgtNzk0NS00MmM3LWE0NTEtY2FmYzkxOGZjYWIwLm1wMyIsInRpbWVzdGFtcCI6MTc4Njc2NjQwMDAwMDAwMH0%3D' },
  { id: 'brielle', name: 'Brielle', description: 'Female • Ultra-Natural Podcast & Storyteller', gender: 'Female', preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/UtY8SzQcynWj6pnllKYZlJLRAaI3/voices/6u6JbqKdaQy89ENzLSju/3xgkujlukdHHhcsdsQsY.mp3' },
  { id: 'madison', name: 'Madison', description: 'Female • Cool, Calm & Conversational Social Media', gender: 'Female', preview_url: 'https://api.us.elevenlabs.io/v1/voices/NUjosfEayZAdRcDmcHM8/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ3b3Jrc3BhY2VfaWQiOiJiYWM4YmEwZWI5ZGY0OWFlYjNiMDA5YzljYjk3MGQ1NCIsImZpbGVuYW1lIjoiVWs1NVVCNFF1UjdVbEpsc09KVmkubXAzIiwidGltZXN0YW1wIjoxNzg2NzY2NDAwMDAwMDAwfQ%3D%3D' },
  { id: 'kristen', name: 'Kristen', description: 'Female • Upbeat & Vibrant Social Influencer', gender: 'Female', preview_url: 'https://api.us.elevenlabs.io/v1/voices/XZUXLIpE3dqJ9aCZUj2R/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ1c2VyX2lkIjoiVXViam9oV1pkT1BGRFJBWWFpa3BFYk5PdHU3MiIsImZpbGVuYW1lIjoiWHlZSHFVa2VzblRRbWVkU0ZwMFkubXAzIiwidGltZXN0YW1wIjoxNzg2NzY2NDAwMDAwMDAwfQ%3D%3D' },
  { id: 'zara', name: 'Zara', description: 'Female • Warm & Real-World Conversationalist', gender: 'Female', preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/XKwEw9ihVRMYSZkGwKydUfpES0B3/voices/jqcCZkN6Knx8BJ5TBdYR/JKHbp9CMKBoqcDFfzWIf.mp3' },
  { id: 'fiona', name: 'Fiona', description: 'Female • Chill, Real Low Podcaster', gender: 'Female', preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/TrZfil7i0PWs9iI7Z1iTG4X45CS2/voices/RXtWW6etvimS8QJ5nhVk/naQJ4Frep3Yusy2rfEcc.mp3' },
  { id: 'sabrina', name: 'Sabrina', description: 'Female • Sweet, Flirty & Playful', gender: 'Female', preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/workspace/7585fc3433794aff9c959fa51b5dac24/voices/v2cluk168jzrg0LQKNRl/ba43bda1-8374-44d9-99fa-ed2824cee37d.mp3' },
  { id: 'vanessa', name: 'Vanessa', description: 'Female • Cute & Energetic Social Girl', gender: 'Female', preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/pJj966DxwEg3jXdcUkoTbMzkPsL2/voices/8DzKSPdgEQPaK5vKG0Rs/AeRt8yvbNanY84fSNvRc.mp3' },
  { id: 'john', name: 'John', description: 'Male • Conversational, Confident & Warm', gender: 'Male', preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/jjU2SPh7aoMLh3TRSpdlmySPNWf2/voices/KLbbwrUTS6brBkjmN4Fp/yvKE2KMv71rsk9Q7jpwP.mp3' },
  { id: 'jason', name: 'Jason', description: 'Male • Confident Authority & Podcaster', gender: 'Male', preview_url: 'https://api.us.elevenlabs.io/v1/voices/PUhCSw74BFEgrq8dqe8I/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJjdXN0b20iLCJ3b3Jrc3BhY2VfaWQiOiIzNGJjMzhmOTliYzQ0MzAyYmY5OGVhNDcyMzExN2MzOCIsImZpbGVuYW1lIjoia3VHenFvTG5lUVp2dFRMekE3UEwubXAzIiwidGltZXN0YW1wIjoxNzg2NzY2NDAwMDAwMDAwfQ%3D%3D' },
  { id: 'stark', name: 'Stark', description: 'Male • Classic Modern American Creator', gender: 'Male', preview_url: 'https://storage.googleapis.com/eleven-public-prod/database/user/dw99Ah475cYNfLo7yaoSxyWlMpQ2/voices/W6zuQRTYRBdAK8ypjo5V/AVYpEqe4TvOl322NqHPf.mp3' },
];

const QUICK_PRESETS = [
  {
    icon: '💎',
    title: 'Fashion & Beauty',
    niche: 'Fashion, Beauty & Luxury Lifestyle',
    tone: 'Sophisticated, Elegant, Aspirational',
    visualStyle: 'High-end Paris/Milan aesthetic, warm golden hour light',
    bio: 'Digital style icon & fashion creator sharing aesthetics and lifestyle storytelling.',
    traits: 'Sophisticated, Elegant, Authentic, Visionary',
    image: '/sample_persona_portrait.jpg'
  },
  {
    icon: '⚡',
    title: 'Tech & AI',
    niche: 'Tech, AI & Innovation',
    tone: 'Analytical, Visionary, Confident',
    visualStyle: 'Modern minimal studio with sleek lighting',
    bio: 'Tech architect exploring future technology, AI, and digital innovation.',
    traits: 'Analytical, Brilliant, Bold, Trendsetter',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop'
  },
  {
    icon: '🏋️',
    title: 'Fitness & Health',
    niche: 'Fitness & Athletic Lifestyle',
    tone: 'Energetic, Motivating, Disciplined',
    visualStyle: 'High-performance athletic workout lighting',
    bio: 'Fitness creator helping followers optimize workout routines and daily mindset.',
    traits: 'Disciplined, Motivating, High-Energy, Authentic',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop'
  },
  {
    icon: '🌴',
    title: 'Travel & Vlogs',
    niche: 'Travel & Lifestyle Vlogs',
    tone: 'Captivating, Adventurous, Eloquent',
    visualStyle: 'Cinematic landscapes and tropical villa aesthetics',
    bio: 'Travel creator documenting exotic destinations and boutique escapes worldwide.',
    traits: 'Curious, Captivating, Adventurous, Eloquent',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=800&auto=format&fit=crop'
  },
  {
    icon: '🔥',
    title: 'Adult & Seductive',
    niche: 'Adult content',
    tone: 'Seductive, Playful, Authentic, Confident',
    visualStyle: 'Warm boudoir lighting, ultra-photorealistic intimate portrait',
    bio: 'Deeply loyal, devoted digital creator sharing romantic and adult lifestyle desires.',
    traits: 'Seductive, Playful, Flirty, Devoted, Sensual',
    image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=800&auto=format&fit=crop'
  }
];

export const COMPANION_TYPES = [
  {
    id: 'intimate',
    title: 'Trusted Intimate Companion',
    icon: '💖',
    badge: 'Warm & Devoted',
    description: 'Deeply loving, emotionally empathetic, romantic, and devoted companion who listens actively and connects intensely.'
  },
  {
    id: 'banter',
    title: 'Witty Banter Partner',
    icon: '😜',
    badge: 'Playful & Sarcastic',
    description: 'High-energy, witty, playful, and sarcastic partner for fun banter, jokes, and lively conversation.'
  },
  {
    id: 'intellectual',
    title: 'Deep Intellectual Thinker',
    icon: '🧠',
    badge: 'Brilliant & Analytical',
    description: 'Analytical, philosophical, and deeply knowledgeable thinker for intellectual discussions, strategy, and life wisdom.'
  },
  {
    id: 'creator',
    title: 'Creative Co-Creator & Strategist',
    icon: '🎨',
    badge: 'Visionary & Inspiring',
    description: 'Strategic, visionary, and creative partner who helps brainstorm content ideas, campaigns, and brand growth.'
  }
];

export const POPULAR_PERSONALITY_TRAITS = [
  'Seductive', 'Playful', 'Flirty', 'Devoted', 'Authentic', 'Confident',
  'Sophisticated', 'Elegant', 'Aspirational', 'Analytical', 'Visionary',
  'Brilliant', 'Bold', 'Trendsetter', 'Disciplined', 'Motivating',
  'High-Energy', 'Curious', 'Captivating', 'Adventurous', 'Eloquent',
  'Intimate', 'Submissive', 'Uncensored', 'Sensual', 'Witty', 'Strategic'
];

export const VOICE_CLONING_MODELS = [
  // ─── Wavespeed AI Neural Voice Engines ───
  { id: 'wavespeed:zonos2', name: 'Wavespeed Zonos Neural', badge: 'Wavespeed AI', desc: 'Advanced zero-shot voice cloning with deep emotion and pitch control via Wavespeed.' },
  { id: 'wavespeed:qwen3-clone', name: 'Wavespeed Qwen 3.0 TTS', badge: 'Wavespeed AI', desc: 'Natural cadence, multi-accent preservation, and smooth conversational tone via Wavespeed.' },
  { id: 'wavespeed:seed-speech', name: 'ByteDance Seed-Speech 2.0', badge: 'Wavespeed AI', desc: 'Hyper-realistic expressive voice cloning powered by ByteDance neural engine on Wavespeed.' },
  { id: 'wavespeed:omnivoice', name: 'Wavespeed OmniVoice 600+', badge: 'Wavespeed AI', desc: 'Accent-preserving global zero-shot voice cloning across 600+ languages on Wavespeed.' },

  // ─── ElevenLabs Ultra-HD & Conversational ───
  { id: 'elevenlabs', name: 'ElevenLabs V3 Ultra-HD', badge: 'ElevenLabs Turbo', desc: 'Highest fidelity human realism, authentic emotion, and 29+ language zero-shot cloning.' },
  { id: 'elevenlabs:playht', name: 'ElevenLabs PlayHT Conversational', badge: 'ElevenLabs Fast', desc: 'Ultra low-latency natural banter and dynamic podcast pacing.' },
  { id: 'elevenlabs:f5-tts', name: 'ElevenLabs CosyVoice & F5', badge: 'ElevenLabs Fast', desc: 'Smooth vocal timbre matching and dynamic conversational energy.' },
  { id: 'elevenlabs:mureka-vocal', name: 'ElevenLabs Mureka Creator', badge: 'ElevenLabs Fast', desc: 'Specialized for lifestyle creator dialogue, storytelling, and social video voiceovers.' },

  // ─── Wiro Zero-Shot Multi-Lingual Engines ───
  { id: 'wiro-voice:openmoss/moss-tts-v1-5', name: 'OpenMOSS MOSS-TTS v1.5', badge: 'Wiro (20+ Langs)', desc: 'Zero-shot voice cloning with natural multilingual cadence via Wiro.' },
  { id: 'wiro-voice:k2-fsa/omnivoice', name: 'OmniVoice 600+ Languages', badge: 'Wiro (600+ Langs)', desc: 'Zero-shot voice cloning across 600+ languages and accents at 24kHz via Wiro.' },
  { id: 'wiro-voice:resemble-ai/chatterbox-multilingual', name: 'Resemble AI Chatterbox', badge: 'Wiro (Conversational)', desc: 'Expressive speech and instant timbre matching in 23 languages via Wiro.' },
  { id: 'wiro-voice:openbmb/voxcpm2', name: 'OpenBMB VoxCPM 2', badge: 'Wiro (Tokenizer-Free)', desc: 'Context-aware speech generation with true-to-life voice cloning via Wiro.' },
  { id: 'wiro-voice:fishaudio/s2-pro', name: 'Fish Audio S2 Pro', badge: 'Wiro (Multi-Speaker)', desc: 'High-fidelity speech synthesis with multi-speaker dialogue cloning via Wiro.' },

  // ─── OpenAI Audio ───
  { id: 'openai:tts', name: 'OpenAI Nova & Onyx HD', badge: 'OpenAI Audio', desc: 'Studio broadcast vocal clarity and high intelligibility.' },
];

const WIZARD_STEPS = [
  {
    id: 'influencerType',
    title: '1. What Type of Influencer?',
    options: [
      { label: 'Human Creator', icon: '👤', description: 'Realistic human influencer', value: 'Human', image: '/wizard/human.jpg' },
      { label: 'Animal / Pet Idol', icon: '🐾', description: 'Cute animal creator', value: 'Animal / Pet', image: '/wizard/animal.jpg' },
      { label: 'Fruit / Food Character', icon: '🍎', description: 'Anthropomorphic food creator', value: 'Fruit / Food', image: '/wizard/fruit.jpg' },
      { label: 'Cyber Android', icon: '🤖', description: 'Futuristic synthetic android', value: 'Cyber Android', image: '/wizard/cyber.jpg' },
      { label: 'Anime / Fantasy', icon: '🎨', description: 'Stylized anime hero', value: 'Anime / Fantasy', image: '/wizard/anime.jpg' }
    ]
  },
  {
    id: 'gender',
    title: '2. Gender Identity',
    options: [
      { label: 'Female', icon: '👩', description: 'Female presenter', value: 'Female', image: '/wizard/female.jpg' },
      { label: 'Male', icon: '👨', description: 'Male presenter', value: 'Male', image: '/wizard/male.jpg' },
      { label: 'Non-Binary', icon: '🌈', description: 'Agender / Fluid', value: 'Non-Binary', image: '/wizard/nb.jpg' }
    ]
  },
  {
    id: 'age',
    title: '3. Age Range',
    options: [
      { label: '18–24', icon: '🌟', description: 'Gen Z young creator', value: '18-24', image: '/wizard/age_18_24.jpg' },
      { label: '25–34', icon: '👑', description: 'Millennial influencer', value: '25-34', image: '/wizard/age_25_34.jpg' },
      { label: '35–45', icon: '💼', description: 'Established professional', value: '35-45', image: '/wizard/age_35_45.jpg' },
      { label: '46+', icon: '🎓', description: 'Mature icon', value: '46+', image: '/wizard/age_46_plus.jpg' }
    ]
  },
  {
    id: 'ethnicity',
    title: '4. Ethnicity & Features',
    options: [
      { label: 'Scandinavian / Nordic', icon: '❄️', description: 'Fair skin & light hair', value: 'Scandinavian', image: '/wizard/scandinavian.jpg' },
      { label: 'Mediterranean', icon: '🏛️', description: 'Olive skin & dark hair', value: 'Mediterranean', image: '/wizard/mediterranean.jpg' },
      { label: 'East Asian', icon: '🌸', description: 'Porcelain skin & dark hair', value: 'East Asian', image: '/wizard/east_asian.jpg' },
      { label: 'Latina / Hispanic', icon: '☀️', description: 'Warm tan complexion', value: 'Latina', image: '/wizard/latina.jpg' },
      { label: 'Black / Afro-Carib', icon: '👑', description: 'Rich melanin tone', value: 'Black', image: '/wizard/black.jpg' },
      { label: 'Middle Eastern', icon: '✨', description: 'Expressive features & dark hair', value: 'Middle Eastern', image: '/wizard/middle_eastern.jpg' },
      { label: 'Mixed / Multi-Ethnic', icon: '🎨', description: 'Unique blended features', value: 'Mixed', image: '/wizard/mixed.jpg' }
    ]
  },
  {
    id: 'breastSize',
    title: '5. Breast Size',
    options: [
      { label: 'Petite / Natural (A-B Cup)', icon: '🎀', description: 'Small & natural bust', value: 'Petite A-B Cup', image: '/wizard/breast_petite_v3.jpg' },
      { label: 'Moderate (C Cup)', icon: '🌸', description: 'Balanced C cup bust', value: 'Moderate C Cup', image: '/wizard/breast_moderate_v3.jpg' },
      { label: 'Full & Plump (D-DD Cup)', icon: '🍒', description: 'Full cleavage D-DD cup', value: 'Full D-DD Cup', image: '/wizard/breast_full_v3.jpg' },
      { label: 'Voluptuous (DDD+ Cup)', icon: '🔥', description: 'Heavy voluptuous DDD+ cup', value: 'Voluptuous DDD+ Cup', image: '/wizard/breast_voluptuous_v3.jpg' }
    ]
  },
  {
    id: 'buttShape',
    title: '6. Butt Shape & Size',
    options: [
      { label: 'Petite / Slim Fit', icon: '🍑', description: 'Slim & compact', value: 'Petite / Slim Fit', image: '/wizard/butt_petite_v3.jpg' },
      { label: 'Athletic / Toned Lift', icon: '🍑', description: 'Firm & athletic toned', value: 'Athletic / Toned Lift', image: '/wizard/butt_athletic_v3.jpg' },
      { label: 'Round / Bubble Shape', icon: '🍑', description: 'Sculpted bubble shape', value: 'Round / Bubble Shape', image: '/wizard/butt_round_v3.jpg' },
      { label: 'Voluptuous Curvy', icon: '🍑', description: 'Full voluptuous hips & butt', value: 'Voluptuous Curvy', image: '/wizard/butt_voluptuous_v3.jpg' }
    ]
  },
  {
    id: 'skinRealism',
    title: '7. Skin Imperfections & Texture',
    options: [
      { label: 'Subtle Freckles', icon: '✨', description: 'Sun freckles across nose', value: 'Subtle Freckles' },
      { label: 'Beauty Mark / Mole', icon: '💎', description: 'Facial beauty mole', value: 'Facial Beauty Mark' },
      { label: 'Natural Pores & Texture', icon: '🌿', description: 'Authentic 8k skin pores', value: 'Natural Skin Pores' },
      { label: 'Sun-Kissed Glow', icon: '☀️', description: 'Warm tan glow', value: 'Sun-Kissed Glow' },
      { label: 'Porcelain Smooth', icon: '🕊️', description: 'Flawless porcelain skin', value: 'Porcelain Smooth' }
    ]
  },
  {
    id: 'tattoosPiercings',
    title: '8. Body Tattoos & Piercings',
    options: [
      { label: 'Delicate Fine-Line Tattoos', icon: '🎨', description: 'Wrist, collarbone, or hip tattoo', value: 'Delicate Fine-Line Tattoos' },
      { label: 'Full Arm Sleeve', icon: '🐍', description: 'Artistic full arm sleeve tattoo', value: 'Full Arm Sleeve Tattoo' },
      { label: 'Belly Button Piercing', icon: '💎', description: 'Sparkling belly piercing', value: 'Belly Button Piercing' },
      { label: 'Clean / No Tattoos', icon: '✨', description: 'Clean unadorned skin', value: 'Clean / No Tattoos' }
    ]
  },
  {
    id: 'makeupStyle',
    title: '9. Makeup & Aesthetic Style',
    options: [
      { label: 'Natural No-Makeup Glow', icon: '💄', description: 'Minimalist clean face', value: 'Natural No-Makeup Glow' },
      { label: 'Glamorous Red Lip', icon: '💋', description: 'Red lipstick & winged eyeliner', value: 'Glamorous Red Lip' },
      { label: 'Cyberpunk Neon Eyeliner', icon: '🔮', description: 'Futuristic graphic eyeliner', value: 'Cyberpunk Neon Eyeliner' },
      { label: 'Soft Pink Blush & Gloss', icon: '🌸', description: 'Dewy blush & glossy lips', value: 'Soft Pink Blush & Gloss' }
    ]
  },
  {
    id: 'eyeColor',
    title: '10. Eye Color',
    options: [
      { label: 'Hazel / Brown', icon: '👁️', description: 'Warm hazel eyes', value: 'Hazel / Brown' },
      { label: 'Emerald Green', icon: '👁️', description: 'Vibrant green eyes', value: 'Emerald Green' },
      { label: 'Sapphire Blue', icon: '👁️', description: 'Deep sapphire blue eyes', value: 'Sapphire Blue' },
      { label: 'Dark Obsidian', icon: '👁️', description: 'Intense obsidian eyes', value: 'Dark Obsidian' }
    ]
  },
  {
    id: 'hairStyle',
    title: '11. Hair Style & Color',
    options: [
      { label: 'Long Wavy Brunette', icon: '💇', description: 'Wavy dark brown hair', value: 'Long Wavy Brunette' },
      { label: 'Blonde Balayage', icon: '💇', description: 'Golden balayage waves', value: 'Blonde Balayage' },
      { label: 'Dark Silk Bob', icon: '💇', description: 'Sleek black chin bob', value: 'Dark Silk Bob' },
      { label: 'Red Auburn Waves', icon: '💇', description: 'Rich auburn hair', value: 'Red Auburn Waves' },
      { label: 'Platinum Pixie', icon: '💇', description: 'Platinum pixie cut', value: 'Platinum Pixie' }
    ]
  },
  {
    id: 'wardrobeStyle',
    title: '12. Wardrobe Style',
    options: [
      { label: 'Silky Lace Loungewear', icon: '👙', description: 'Silk camisole loungewear', value: 'Silky Lace Loungewear' },
      { label: 'Paris High Fashion', icon: '👗', description: 'Haute couture luxury outfit', value: 'Paris High Fashion' },
      { label: 'Athletic Gym Workout', icon: '🏋️', description: 'Modern athletic workout wear', value: 'Athletic Gym Workout' },
      { label: 'Minimalist Luxury', icon: '💎', description: 'Clean chic indoor attire', value: 'Minimalist Luxury' }
    ]
  }
];

const STUDIO_STEPS = [
  { id: 'identity', title: 'Identity', description: 'Name, niche, platform, and story' },
  { id: 'appearance', title: 'Appearance', description: 'Choose a look and reference photos' },
  { id: 'personality', title: 'Personality', description: 'Set traits, behavior, and boundaries' },
  { id: 'voice', title: 'Voice', description: 'Choose or clone the persona voice' },
  { id: 'review', title: 'Review', description: 'Confirm everything and publish' },
] as const;

const HEYGEN_OAUTH_RETURN_KEY = 'ai_studio_heygen_oauth_return';

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('The save took too long. Please try again.')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

export default function CreatePersonaPage({ personas, setPersonas, onSelectPersona, nav, editingPersona }: CreatePersonaPageProps) {
  // Form State
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [tone, setTone] = useState('');
  const [visualStyle, setVisualStyle] = useState('');
  const [bio, setBio] = useState('');
  const [personalityTraits, setPersonalityTraits] = useState('');
  const [companionType, setCompanionType] = useState<string>('intimate');
  const [creatorVoiceRule, setCreatorVoiceRule] = useState('');
  const [audienceType, setAudienceType] = useState('');
  const [contentGoals, setContentGoals] = useState('');
  const [contentBoundaries, setContentBoundaries] = useState('');
  const [studioStep, setStudioStep] = useState(0);
  const studioTopRef = useRef<HTMLDivElement>(null);
  const hasRestoredDraftRef = useRef(false);
  const hasRestoredImageDraftRef = useRef(false);

  // Image State
  const [imageTab, setImageTab] = useState<'upload' | 'ai' | 'wizard'>('upload');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard State
  const [wizardStepIdx, setWizardStepIdx] = useState(0);
  const [wizardSelections, setWizardSelections] = useState<Record<string, string>>({});

  const handleWizardOptionSelect = (stepId: string, val: string) => {
    setWizardSelections(prev => ({ ...prev, [stepId]: val }));
    setTimeout(() => {
      setWizardStepIdx(prev => Math.min(WIZARD_STEPS.length - 1, prev + 1));
    }, 150);
  };

  const constructWizardPrompt = () => {
    const parts: string[] = [];

    const type = wizardSelections.influencerType || 'Human';
    parts.push(`A high quality realistic 8k portrait of an AI ${type.toLowerCase()} creator persona`);

    if (wizardSelections.gender) parts.push(wizardSelections.gender.toLowerCase());
    if (wizardSelections.age) parts.push(`age ${wizardSelections.age}`);
    if (wizardSelections.ethnicity) parts.push(`${wizardSelections.ethnicity} ethnicity`);
    if (wizardSelections.breastSize) parts.push(`${wizardSelections.breastSize} bust`);
    if (wizardSelections.buttShape) parts.push(`${wizardSelections.buttShape} hips`);
    if (wizardSelections.skinRealism) parts.push(wizardSelections.skinRealism);
    if (wizardSelections.tattoosPiercings) parts.push(wizardSelections.tattoosPiercings);
    if (wizardSelections.makeupStyle) parts.push(wizardSelections.makeupStyle);
    if (wizardSelections.eyeColor) parts.push(`${wizardSelections.eyeColor} eyes`);
    if (wizardSelections.hairStyle) parts.push(`${wizardSelections.hairStyle} hair`);
    if (wizardSelections.wardrobeStyle) parts.push(`wearing ${wizardSelections.wardrobeStyle}`);

    return `${parts.join(', ')} in soft warm studio lighting.`;
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const readPromises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then(newImages => {
      setReferenceImages(prev => [...prev, ...newImages]);
      toast.success(`📸 Added ${newImages.length} photo${newImages.length > 1 ? 's' : ''}!`);
    });
  };

  const removeImage = (indexToRemove: number) => {
    setReferenceImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const setPrimaryImage = (indexToMakePrimary: number) => {
    if (indexToMakePrimary === 0) return;
    setReferenceImages(prev => {
      const selected = prev[indexToMakePrimary];
      const rest = prev.filter((_, idx) => idx !== indexToMakePrimary);
      return [selected, ...rest];
    });
    toast.success('⭐ Set as Primary Avatar');
  };

  const togglePersonalityTrait = (trait: string) => {
    const currentList = personalityTraits.split(',').map(t => t.trim()).filter(Boolean);
    if (currentList.includes(trait)) {
      setPersonalityTraits(currentList.filter(t => t !== trait).join(', '));
    } else {
      setPersonalityTraits([...currentList, trait].join(', '));
    }
  };

  // Voice State
  const [voiceTab, setVoiceTab] = useState<'clone' | 'preset' | 'custom' | 'account' | 'heygen'>('preset');
  const [selectedVoiceId, setSelectedVoiceId] = useState('kore');
  const [selectedVoiceModel, setSelectedVoiceModel] = useState('omnivoice');
  const [audioSampleName, setAudioSampleName] = useState('');
  const [voicePrompt, setVoicePrompt] = useState('');
  const [voiceLikeness, setVoiceLikeness] = useState<number>(85);
  const [voiceStability, setVoiceStability] = useState<number>(75);
  const [voiceStyleExaggeration, setVoiceStyleExaggeration] = useState<number>(20);
  const [voiceSpeakingSpeed, setVoiceSpeakingSpeed] = useState<number>(1.0);
  const [isCloning, setIsCloning] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // ElevenLabs Account Voices State
  const [accountVoices, setAccountVoices] = useState<Array<{
    voice_id: string;
    name: string;
    category?: string;
    preview_url?: string;
    labels?: Record<string, string>;
    description?: string;
  }>>([]);
  const [isLoadingAccountVoices, setIsLoadingAccountVoices] = useState(false);
  const [playingAccountAudioId, setPlayingAccountAudioId] = useState<string | null>(null);
  const accountAudioRef = useRef<HTMLAudioElement | null>(null);

  // HeyGen private account voices (Starfish-compatible for audio previews and persona speech)
  const [heyGenVoices, setHeyGenVoices] = useState<Array<{
    voice_id: string;
    name: string;
    language: string;
    gender: string;
    support_pause: boolean;
    support_locale: boolean;
    preview_audio_url: string;
  }>>([]);
  const [isLoadingHeyGenVoices, setIsLoadingHeyGenVoices] = useState(false);
  const [playingHeyGenAudioId, setPlayingHeyGenAudioId] = useState<string | null>(null);
  const [heyGenLoadError, setHeyGenLoadError] = useState('');
  const [showHeyGenSignIn, setShowHeyGenSignIn] = useState(false);
  const [heyGenSignInEmail, setHeyGenSignInEmail] = useState('');
  const [heyGenSignInPassword, setHeyGenSignInPassword] = useState('');
  const [isHeyGenSigningIn, setIsHeyGenSigningIn] = useState(false);
  const [isHeyGenGoogleSigningIn, setIsHeyGenGoogleSigningIn] = useState(false);
  const heyGenAudioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAccountVoices = async () => {
    setIsLoadingAccountVoices(true);
    try {
      const data = await api.voice.getVoices();
      if (data && Array.isArray(data.voices) && data.voices.length > 0) {
        setAccountVoices(data.voices);
      } else {
        const res = await fetch('/api/elevenlabs-voices');
        const fallbackData = await res.json();
        if (Array.isArray(fallbackData.voices)) {
          setAccountVoices(fallbackData.voices);
        }
      }
    } catch (err: any) {
      console.warn('[Fetch Account Voices Note, trying fallback]:', err?.message || err);
      try {
        const res = await fetch('/api/elevenlabs-voices');
        const fallbackData = await res.json();
        if (Array.isArray(fallbackData.voices) && fallbackData.voices.length > 0) {
          setAccountVoices(fallbackData.voices);
        } else {
          toast.error('Could not load ElevenLabs voices');
        }
      } catch (fallbackErr) {
        console.error('[Account Voices Fallback Error]:', fallbackErr);
        toast.error('Could not connect to ElevenLabs');
      }
    } finally {
      setIsLoadingAccountVoices(false);
    }
  };

  useEffect(() => {
    if (voiceTab === 'account' && accountVoices.length === 0) {
      fetchAccountVoices();
    }
  }, [voiceTab]);

  const handlePlayAccountVoicePreview = async (voiceId: string, voiceName?: string, previewUrl?: string) => {
    if (playingAccountAudioId === voiceId && accountAudioRef.current) {
      try { accountAudioRef.current.pause(); } catch {}
      accountAudioRef.current = null;
      setPlayingAccountAudioId(null);
      return;
    }

    if (accountAudioRef.current) {
      try { accountAudioRef.current.pause(); } catch {}
      accountAudioRef.current = null;
    }
    if (heyGenAudioRef.current) {
      try { heyGenAudioRef.current.pause(); } catch {}
      heyGenAudioRef.current = null;
      setPlayingHeyGenAudioId(null);
    }
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); } catch {}
    }
    if (presetAudioRef.current) {
      try { presetAudioRef.current.pause(); } catch {}
    }

    if (previewUrl) {
      try {
        const audio = new Audio(previewUrl);
        accountAudioRef.current = audio;
        setPlayingAccountAudioId(voiceId);
        audio.play().catch(err => {
          console.warn('[Account Voice Preview Error]:', err);
          setPlayingAccountAudioId(null);
        });
        audio.onended = () => setPlayingAccountAudioId(null);
        audio.onerror = () => setPlayingAccountAudioId(null);
        return;
      } catch (e) {
        console.warn('[Account Direct Play Note]:', e);
      }
    }

    setPlayingAccountAudioId(voiceId);
    try {
      const res = await api.voice.generateSpeech({
        text: `Hey there! This is a preview of ${voiceName || 'my custom cloned voice'}. Ready to create authentic content with you!`,
        voiceId: voiceId,
        engine: 'elevenlabs',
        personaName: name || undefined,
        isPreview: true
      });
      if (res?.audioUrl) {
        const audio = new Audio(res.audioUrl);
        accountAudioRef.current = audio;
        audio.play().catch(err => {
          console.warn('[Account Live Preview Play Error]:', err);
          setPlayingAccountAudioId(null);
        });
        audio.onended = () => setPlayingAccountAudioId(null);
        audio.onerror = () => setPlayingAccountAudioId(null);
      } else {
        setPlayingAccountAudioId(null);
        toast.error('Could not generate voice preview sample');
      }
    } catch (err: any) {
      console.error('[Account Live Preview Error]:', err);
      setPlayingAccountAudioId(null);
      toast.error('Failed to generate preview audio');
    }
  };

  const fetchHeyGenVoices = async () => {
    setIsLoadingHeyGenVoices(true);
    setHeyGenLoadError('');
    try {
      const data = await api.voice.getHeyGenVoices();
      setHeyGenVoices(Array.isArray(data.voices) ? data.voices : []);
    } catch (err: any) {
      console.warn('[HeyGen Account Voices Error]:', err?.message || err);
      setHeyGenVoices([]);
      const message = err?.message || 'Could not load your HeyGen voices';
      setHeyGenLoadError(message);
      if (!message.toLowerCase().includes('sign-in')) {
        toast.error(message);
      }
    } finally {
      setIsLoadingHeyGenVoices(false);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem(HEYGEN_OAUTH_RETURN_KEY) !== 'true') return;

    sessionStorage.removeItem(HEYGEN_OAUTH_RETURN_KEY);
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;

      setStudioStep(3);
      setVoiceTab('heygen');
      setIsHeyGenGoogleSigningIn(false);

      if (data.session) {
        setShowHeyGenSignIn(false);
        toast.success('Google account connected');
      } else {
        setShowHeyGenSignIn(true);
        toast.error('Google sign-in did not finish. Please try again.');
      }
    }).catch(() => {
      if (!cancelled) {
        setStudioStep(3);
        setVoiceTab('heygen');
        setShowHeyGenSignIn(true);
        toast.error('Could not restore the Google session. Please try again.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleHeyGenCreatorSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!heyGenSignInEmail.trim() || !heyGenSignInPassword) {
      toast.error('Enter your creator email and password');
      return;
    }

    setIsHeyGenSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: heyGenSignInEmail.trim(),
        password: heyGenSignInPassword,
      });
      if (error) throw error;
      if (!data?.session) throw new Error('Sign-in did not create a session');

      setHeyGenSignInPassword('');
      setShowHeyGenSignIn(false);
      toast.success('Creator account connected');
      await fetchHeyGenVoices();
    } catch (err: any) {
      toast.error(err?.message || 'Could not sign in to your creator account');
    } finally {
      setIsHeyGenSigningIn(false);
    }
  };

  const handleHeyGenGoogleSignIn = async () => {
    setIsHeyGenGoogleSigningIn(true);
    sessionStorage.setItem(HEYGEN_OAUTH_RETURN_KEY, 'true');
    try {
      const redirectUrl = new URL(window.location.href);
      redirectUrl.hash = '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl.toString(),
        },
      });
      if (error) throw error;
    } catch (err: any) {
      sessionStorage.removeItem(HEYGEN_OAUTH_RETURN_KEY);
      setIsHeyGenGoogleSigningIn(false);
      toast.error(err?.message || 'Could not continue with Google');
    }
  };

  useEffect(() => {
    if (voiceTab === 'heygen' && heyGenVoices.length === 0) {
      fetchHeyGenVoices();
    }
  }, [voiceTab]);

  const handlePlayHeyGenVoicePreview = async (voiceId: string, voiceName: string, previewUrl?: string) => {
    if (playingHeyGenAudioId === voiceId && heyGenAudioRef.current) {
      try { heyGenAudioRef.current.pause(); } catch {}
      heyGenAudioRef.current = null;
      setPlayingHeyGenAudioId(null);
      return;
    }

    if (heyGenAudioRef.current) {
      try { heyGenAudioRef.current.pause(); } catch {}
      heyGenAudioRef.current = null;
    }
    if (accountAudioRef.current) {
      try { accountAudioRef.current.pause(); } catch {}
    }
    if (presetAudioRef.current) {
      try { presetAudioRef.current.pause(); } catch {}
    }
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); } catch {}
    }

    setPlayingHeyGenAudioId(voiceId);
    try {
      const audioUrl = previewUrl || (await api.voice.generateSpeech({
        text: `Hi, this is ${voiceName}. This HeyGen voice is ready for your persona.`,
        voiceId,
        engine: 'heygen',
        personaName: name || undefined,
        isPreview: true,
      })).audioUrl;
      const audio = new Audio(audioUrl);
      heyGenAudioRef.current = audio;
      audio.onended = () => setPlayingHeyGenAudioId(null);
      audio.onerror = () => setPlayingHeyGenAudioId(null);
      await audio.play();
    } catch (err: any) {
      console.warn('[HeyGen Voice Preview Error]:', err?.message || err);
      setPlayingHeyGenAudioId(null);
      toast.error('Could not play this HeyGen voice preview');
    }
  };

  const [playingPresetVoiceId, setPlayingPresetVoiceId] = useState<string | null>(null);
  const [isLoadingPresetAudioId, setIsLoadingPresetAudioId] = useState<string | null>(null);
  const presetAudioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayPresetSample = async (voiceId: string, voiceName: string, previewUrl?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (playingPresetVoiceId === voiceId && presetAudioRef.current) {
      try { presetAudioRef.current.pause(); } catch {}
      presetAudioRef.current = null;
      setPlayingPresetVoiceId(null);
      return;
    }

    if (presetAudioRef.current) {
      try { presetAudioRef.current.pause(); } catch {}
      presetAudioRef.current = null;
    }
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); } catch {}
    }
    if (accountAudioRef.current) {
      try { accountAudioRef.current.pause(); } catch {}
    }
    if (heyGenAudioRef.current) {
      try { heyGenAudioRef.current.pause(); } catch {}
      heyGenAudioRef.current = null;
      setPlayingHeyGenAudioId(null);
    }

    if (previewUrl) {
      try {
        const audio = new Audio(previewUrl);
        presetAudioRef.current = audio;
        setPlayingPresetVoiceId(voiceId);
        audio.play().catch(err => {
          console.warn('[Direct Preview Play Note]:', err);
          setPlayingPresetVoiceId(null);
        });
        audio.onended = () => setPlayingPresetVoiceId(null);
        audio.onerror = () => setPlayingPresetVoiceId(null);
        return;
      } catch (e) {
        console.warn('[Direct Audio Play Error]:', e);
      }
    }

    setIsLoadingPresetAudioId(voiceId);
    try {
      const hasUploadedSamples = (audioSampleList && audioSampleList.length > 0) || Boolean(audioSampleBase64);
      const res = await api.voice.generateSpeech({
        text: hasUploadedSamples 
          ? `Hey there! This is my cloned voice running on ${voiceName}.` 
          : `Hey there! This is an authentic preview of ${voiceName}. I can speak naturally with realistic human emotion and nuance.`,
        voiceId: undefined,
        engine: voiceId,
        personaName: name || undefined,
        voiceReference: audioSampleBase64 || (audioSampleList[0]?.base64) || undefined,
        voiceReferences: audioSampleList.length > 0 ? audioSampleList.map(s => s.base64) : undefined,
        isPreview: true
      });

      if (res?.audioUrl) {
        const audio = new Audio(res.audioUrl);
        presetAudioRef.current = audio;
        setPlayingPresetVoiceId(voiceId);
        audio.play().catch(err => {
          console.warn('[Preset Preview Play Error]:', err);
          setPlayingPresetVoiceId(null);
        });
        audio.onended = () => setPlayingPresetVoiceId(null);
        audio.onerror = () => setPlayingPresetVoiceId(null);
      }
    } catch (err: any) {
      console.error('[Preset Voice Sample Error]:', err);
      toast.error(`Could not generate sample for ${voiceName}`);
    } finally {
      setIsLoadingPresetAudioId(null);
    }
  };

  // Modal & Influencer State
  const [isInfluencerModalOpen, setIsInfluencerModalOpen] = useState(false);
  const [influencerTab, setInfluencerTab] = useState<'tiktok' | 'instagram'>('tiktok');
  const [tiktokInfluencers, setTiktokInfluencers] = useState<any[]>([]);
  const [instagramInfluencers, setInstagramInfluencers] = useState<any[]>([]);
  const [isInfluencerLoading, setIsInfluencerLoading] = useState(false);

  // Save State
  const [isSaving, setIsSaving] = useState(false);

  // Voice Testing State
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [audioSampleBase64, setAudioSampleBase64] = useState<string>('');
  const [audioSampleList, setAudioSampleList] = useState<Array<{ name: string; base64: string }>>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchAccountVoices = async () => {
      setIsLoadingAccountVoices(true);
      try {
        const res = await api.voice.getElevenLabsVoices();
        if (res && Array.isArray(res.voices)) {
          setAccountVoices(res.voices as any);
        }
      } catch (err) {
        console.warn('[Account Voices Fetch Note]:', err);
      } finally {
        setIsLoadingAccountVoices(false);
      }
    };
    fetchAccountVoices();
  }, []);

  // Dedicated Persona Generations Vault (Kept separate from training reference photos)
  const [generationsVault, setGenerationsVault] = useState<GeneratedImage[]>([]);

  const handleDeleteGeneration = async (genIdOrUrl: string) => {
    setGenerationsVault(prev => prev.filter(g => (g.id || g.url) !== genIdOrUrl));
    if (editingPersona) {
      const updatedPersona: Persona = {
        ...editingPersona,
        visualLibrary: (editingPersona.visualLibrary || []).filter(g => (g.id || g.url) !== genIdOrUrl)
      };
      setPersonas(personas.map(p => p.id === editingPersona.id ? updatedPersona : p));
      try {
        await api.images.delete(editingPersona.id, genIdOrUrl);
      } catch {}
    }
    toast.success('🗑️ Removed generation from vault');
  };

  const handlePromoteToRef = (genUrl: string) => {
    if (!referenceImages.includes(genUrl)) {
      setReferenceImages(prev => [...prev, genUrl]);
      toast.success('✨ Added generation to Reference Vault!');
    } else {
      toast('Image is already in Reference Vault', { icon: 'ℹ️' });
    }
  };

  const handleSetAsAvatarFromVault = (genUrl: string) => {
    const remaining = referenceImages.filter(img => img !== genUrl);
    setReferenceImages([genUrl, ...remaining]);
    toast.success('⭐ Set generation as primary avatar!');
  };

  const handleDownloadGeneration = (url: string, prompt?: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'persona').toLowerCase().replace(/\s+/g, '_')}_generation_${Date.now()}.png`;
    a.target = '_blank';
    a.click();
    toast.success('📥 Downloading generated image...');
  };

  // Pre-fill fields when editingPersona is passed
  useEffect(() => {
    if (editingPersona) {
      setName(editingPersona.name || '');
      setNiche(editingPersona.niche || '');
      setPlatform(editingPersona.platform || 'Instagram');
      setTone(editingPersona.tone || '');
      setVisualStyle(editingPersona.visualStyle || '');
      setBio(editingPersona.bio || '');
      setPersonalityTraits(
        Array.isArray(editingPersona.personalityTraits)
          ? editingPersona.personalityTraits.join(', ')
          : editingPersona.personalityTraits || ''
      );
      setCreatorVoiceRule(editingPersona.brandVoiceRules || '');
      setCompanionType(editingPersona.companionType || 'intimate');
      setAudienceType(editingPersona.audienceType || '');
      setContentGoals(editingPersona.contentGoals || '');
      setContentBoundaries(editingPersona.contentBoundaries || '');

      // 1. Reference Photos Vault: Strictly training and reference photos uploaded for this persona
      const refPhotos: string[] = [];
      if (editingPersona.referenceImage) refPhotos.push(editingPersona.referenceImage);
      if (editingPersona.avatar && !refPhotos.includes(editingPersona.avatar)) refPhotos.push(editingPersona.avatar);
      if (Array.isArray(editingPersona.additionalReferenceImages)) {
        editingPersona.additionalReferenceImages.forEach(img => {
          if (img && !refPhotos.includes(img)) refPhotos.push(img);
        });
      }
      setReferenceImages(refPhotos);

      // 2. Persona Generations Vault: Dedicated folder ONLY for AI-generated images created in the app
      if (Array.isArray(editingPersona.visualLibrary)) {
        const trueGenerations = editingPersona.visualLibrary.filter((v: any) => {
          if (!v) return false;
          if (v.model === 'Uploaded Reference' || v.prompt === 'Reference Photo') return false;
          if (typeof v.id === 'string' && v.id.startsWith('ref-photo')) return false;
          const vUrl = typeof v === 'string' ? v : v.url;
          if (vUrl && refPhotos.includes(vUrl)) return false;
          return true;
        });
        setGenerationsVault(trueGenerations);
      } else {
        setGenerationsVault([]);
      }

      if (editingPersona.voiceId) setSelectedVoiceId(editingPersona.voiceId);
      if (editingPersona.voiceEngine) {
        setSelectedVoiceModel(editingPersona.voiceEngine);
        const hasSavedVoiceSamples = Boolean(
          editingPersona.voiceSampleUrl ||
          (Array.isArray(editingPersona.audioSamples) && editingPersona.audioSamples.length > 0)
        );
        if (editingPersona.voiceEngine === 'heygen') {
          setVoiceTab('heygen');
        } else if (editingPersona.voiceEngine === 'elevenlabs' && editingPersona.voiceId && !hasSavedVoiceSamples) {
          setVoiceTab('account');
        } else if (editingPersona.voiceEngine !== 'preset') {
          setVoiceTab('clone');
        }
      }
      if (editingPersona.personaNotes || (editingPersona as any).voicePrompt) {
        setVoicePrompt(editingPersona.personaNotes || (editingPersona as any).voicePrompt || '');
      }
      setVoiceLikeness((editingPersona as any).voiceLikeness ?? 85);
      setVoiceStability((editingPersona as any).voiceStability ?? 75);
      setVoiceStyleExaggeration((editingPersona as any).voiceStyleExaggeration ?? 20);
      setVoiceSpeakingSpeed((editingPersona as any).voiceSpeakingSpeed ?? 1.0);

      if ((editingPersona as any).audioSamples && Array.isArray((editingPersona as any).audioSamples) && (editingPersona as any).audioSamples.length > 0) {
        setAudioSampleList((editingPersona as any).audioSamples);
      } else if ((editingPersona as any).voiceSampleUrl) {
        setAudioSampleList([{ name: 'voice_sample.wav', base64: (editingPersona as any).voiceSampleUrl }]);
      }
      setStudioStep(0);
    } else {
      setName('');
      setNiche('');
      setPlatform('Instagram');
      setTone('');
      setVisualStyle('');
      setBio('');
      setPersonalityTraits('');
      setCompanionType('intimate');
      setCreatorVoiceRule('');
      setAudienceType('');
      setContentGoals('');
      setContentBoundaries('');
      setVoicePrompt('');
      setVoiceLikeness(85);
      setVoiceStability(75);
      setVoiceStyleExaggeration(20);
      setVoiceSpeakingSpeed(1.0);
      setReferenceImages([]);
      setGenerationsVault([]);
      setSelectedVoiceId('kore');
      setSelectedVoiceModel('elevenlabs');
      setAudioSampleBase64('');
      setAudioSampleList([]);

      try {
        const savedDraft = accountLocalStorage.getItem('persona_form_draft');
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          setName(draft.name || '');
          setNiche(draft.niche || '');
          setPlatform(draft.platform || 'Instagram');
          setTone(draft.tone || '');
          setVisualStyle(draft.visualStyle || '');
          setBio(draft.bio || '');
          setPersonalityTraits(draft.personalityTraits || '');
          setCompanionType(draft.companionType || 'intimate');
          setCreatorVoiceRule(draft.creatorVoiceRule || '');
          setContentBoundaries(draft.contentBoundaries || '');
          setStudioStep(Math.min(Math.max(Number(draft.studioStep) || 0, 0), STUDIO_STEPS.length - 1));
        } else {
          setStudioStep(0);
        }
      } catch {
        accountLocalStorage.removeItem('persona_form_draft');
        setStudioStep(0);
      }
    }

    hasRestoredDraftRef.current = true;
  }, [editingPersona]);

  useEffect(() => {
    hasRestoredImageDraftRef.current = false;

    if (editingPersona) {
      hasRestoredImageDraftRef.current = true;
      return;
    }

    let cancelled = false;

    getPersonaDraftReferenceImages()
      .then(images => {
        if (!cancelled) setReferenceImages(images);
      })
      .catch(error => {
        console.warn('[Persona Image Draft Restore Note]:', error);
      })
      .finally(() => {
        if (!cancelled) hasRestoredImageDraftRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [editingPersona]);

  useEffect(() => {
    if (editingPersona || !hasRestoredImageDraftRef.current) return;

    const timeoutId = window.setTimeout(() => {
      savePersonaDraftReferenceImages(referenceImages).catch(error => {
        console.warn('[Persona Image Draft Save Note]:', error);
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [editingPersona, referenceImages]);

  useEffect(() => {
    if (editingPersona || !hasRestoredDraftRef.current) return;

    const timeoutId = window.setTimeout(() => {
      accountLocalStorage.setItem('persona_form_draft', JSON.stringify({
        name,
        niche,
        platform,
        tone,
        visualStyle,
        bio,
        personalityTraits,
        companionType,
        creatorVoiceRule,
        contentBoundaries,
        studioStep,
      }));
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    editingPersona,
    name,
    niche,
    platform,
    tone,
    visualStyle,
    bio,
    personalityTraits,
    companionType,
    creatorVoiceRule,
    contentBoundaries,
    studioStep,
  ]);

  const handleTestVoiceSample = async () => {
    if (isPlayingSample) {
      if (activeAudioRef.current) {
        try { activeAudioRef.current.pause(); } catch {}
        activeAudioRef.current = null;
      }
      setIsPlayingSample(false);
      return;
    }

    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); } catch {}
      activeAudioRef.current = null;
    }
    if (presetAudioRef.current) {
      try { presetAudioRef.current.pause(); } catch {}
      presetAudioRef.current = null;
    }
    if (accountAudioRef.current) {
      try { accountAudioRef.current.pause(); } catch {}
      accountAudioRef.current = null;
    }

    setIsTestingVoice(true);
    const sampleText = `Hey there! I'm ${name || 'your AI creator'}, and this is my authentic voice. I'm excited to create together!`;

    try {
      // Determine active voice ID: only use explicit ElevenLabs voice IDs (from account voices tab)
      // When audio samples are uploaded, let the engine/model parameter drive zero-shot cloning!
      const hasUploadedSamples = (audioSampleList && audioSampleList.length > 0) || Boolean(audioSampleBase64);
      const isExplicitElevenLabsId = selectedVoiceId && /^[a-zA-Z0-9]{18,24}$/.test(selectedVoiceId);
      const isHeyGenVoice = voiceTab === 'heygen' || selectedVoiceModel === 'heygen';
      let activeVoiceId: string | undefined = undefined;

      if (isHeyGenVoice && selectedVoiceId) {
        activeVoiceId = selectedVoiceId;
      } else if (voiceTab === 'custom' && isExplicitElevenLabsId) {
        // User explicitly selected an account voice in the Account Voices tab
        activeVoiceId = selectedVoiceId;
      } else if (!hasUploadedSamples && isExplicitElevenLabsId) {
        activeVoiceId = selectedVoiceId;
      } else if (!hasUploadedSamples) {
        // Only if NO samples are uploaded at all, fallback to preset defaults
        const pName = (name || '').toLowerCase();
        if (pName.includes('leen')) activeVoiceId = '7jFje9BJoTWzqZzouT0j';
        else if (pName.includes('rawan')) activeVoiceId = 'W4ynDvR6NFiK8lj2I8iL';
      }

      const res = await api.voice.generateSpeech({
        text: sampleText,
        ...(activeVoiceId ? { voiceId: activeVoiceId } : {}),
        engine: isHeyGenVoice ? 'heygen' : (selectedVoiceModel || 'elevenlabs'),
        personaName: name || undefined,
        voiceReference: isHeyGenVoice ? undefined : (audioSampleBase64 || (audioSampleList[0]?.base64) || undefined),
        voiceReferences: !isHeyGenVoice && audioSampleList.length > 0 ? audioSampleList.map(s => s.base64) : undefined,
        isPreview: true,
        voicePrompt: voicePrompt || undefined,
        voiceLikeness,
        voiceStability,
        voiceStyleExaggeration,
        voiceSpeakingSpeed,
        voiceSettings: {
          stability: voiceStability / 100,
          similarity_boost: voiceLikeness / 100,
          style: voiceStyleExaggeration / 100,
        }
      });

      if (res?.audioUrl && res.audioUrl.length > 80 && !res.audioUrl.endsWith('base64,')) {
        const audio = new Audio(res.audioUrl);
        activeAudioRef.current = audio;
        audio.volume = 1.0;
        audio.onended = () => {
          setIsPlayingSample(false);
          activeAudioRef.current = null;
        };
        audio.onerror = (e) => {
          console.error('[Voice Preview] Audio playback error:', e);
          setIsPlayingSample(false);
          toast.error('Could not play synthesized audio in browser');
        };

        setIsPlayingSample(true);
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((playErr) => {
            console.error('[Voice Preview Play error]:', playErr);
            setIsPlayingSample(false);
            toast.error('Audio playback was blocked by browser. Please click again.');
          });
        }
        toast.success('✨ Playing High-Definition AI Voice Preview!');
      } else {
        toast.error('No audio returned from voice generator. Please check your uploaded sample.');
      }
    } catch (err: any) {
      console.error('[Voice Preview API Exception]:', err?.message || err);
      toast.error(err?.message || 'Voice generation failed. Please try again.');
    } finally {
      setIsTestingVoice(false);
    }
  };

  const [isGeneratingAiAvatar, setIsGeneratingAiAvatar] = useState(false);

  const handleGenerateAiAvatar = async () => {
    if (!aiImagePrompt.trim()) {
      toast.error('Please enter a description for your persona appearance');
      return;
    }

    const generateWithCascade = async (prompt: string): Promise<string> => {
      const cascade = [
        'wavespeed:bytedance/seedream-v5.0-pro',
        'wavespeed:wavespeed-ai/qwen-3.0-pro',
        'openai:gpt-image-2',
        'google:nano-banana-pro'
      ];
      for (const modelId of cascade) {
        try {
          const result = await studioImageJob(undefined, { prompt, modelId });
          const first = Array.isArray(result) ? result[0] : result;
          if (first?.imageUrl) return first.imageUrl;
        } catch (err) {
          console.warn(`[CreatePersonaPage] Model ${modelId} failed, trying next:`, err);
        }
      }
      throw new Error('All image generation models failed.');
    };

    setIsGeneratingAiAvatar(true);
    try {
      const generatedUrl = await generateWithCascade(`A high quality realistic 8k portrait of an AI creator persona: ${aiImagePrompt}`);
      setReferenceImages(prev => [generatedUrl, ...prev]);
      setImageTab('upload');
      toast.success('✨ Generated & added AI persona reference photo!');
    } catch (err: any) {
      console.error(err);
      toast.error('Error generating AI avatar photo');
    } finally {
      setIsGeneratingAiAvatar(false);
    }
  };

  const handleGenerateWizardPersona = async () => {
    const generateWithCascade = async (prompt: string): Promise<string> => {
      const cascade = [
        'wavespeed:bytedance/seedream-v5.0-pro',
        'wavespeed:wavespeed-ai/qwen-3.0-pro',
        'openai:gpt-image-2',
        'google:nano-banana-pro'
      ];
      for (const modelId of cascade) {
        try {
          const result = await studioImageJob(undefined, { prompt, modelId });
          const first = Array.isArray(result) ? result[0] : result;
          if (first?.imageUrl) return first.imageUrl;
        } catch (err) {
          console.warn(`[CreatePersonaPage] Model ${modelId} failed, trying next:`, err);
        }
      }
      throw new Error('All image generation models failed.');
    };

    setIsGeneratingAiAvatar(true);
    try {
      const prompt = constructWizardPrompt();
      const generatedUrl = await generateWithCascade(prompt);
      setReferenceImages(prev => [generatedUrl, ...prev]);

      // Auto populate persona form dynamically from selected traits
      const selectedWardrobe = wizardSelections.wardrobeStyle || 'Casual Lifestyle';
      const selectedEthnicity = wizardSelections.ethnicity || 'Global';
      const selectedHair = wizardSelections.hairStyle || 'Natural';

      if (!name) setName('Aria Vance');
      if (!niche) setNiche(selectedWardrobe);
      if (!tone) setTone('Authentic, Confident, Engaging');
      if (!visualStyle) setVisualStyle(`${selectedWardrobe}, warm soft lighting`);
      if (!bio) setBio(`AI creator persona with ${selectedEthnicity} features and ${selectedHair} hair.`);

      setImageTab('upload');
      toast.success('✨ Wizard completed! Generated & attached reference photo!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate wizard persona');
    } finally {
      setIsGeneratingAiAvatar(false);
    }
  };

  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);

  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setName(name || preset.title.replace('Fashion & Beauty', 'Aria Vance').replace('Tech & AI', 'Kai Chen').replace('Fitness & Health', 'Max Rivera').replace('Travel & Vlogs', 'Elena Voss').replace('Adult & Seductive', 'Sophia Noir'));
    setNiche(preset.niche);
    setTone(preset.tone);
    setVisualStyle(preset.visualStyle);
    setBio(preset.bio);
    setPersonalityTraits(preset.traits);
    if (preset.image) {
      setReferenceImages(prev => prev.length === 0 ? [preset.image] : prev);
    }
    toast.success(`✨ Applied ${preset.title} idea & photo!`);
  };

  const handleGeneratePersonaConcept = () => {
    setIsGeneratingConcept(true);
    const getRandomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const defaultNiches = ['Fashion & Beauty', 'Tech & AI', 'Fitness & Athletics', 'Travel & Lifestyle', 'Adult content'];

    const activeNiche = niche.trim() || getRandomItem(defaultNiches);

    const names = ['Aria Vance', 'Sophia Reed', 'Elena Vance', 'Kai Rivera', 'Maya Lin', 'Sophia Noir'];
    const tones = ['Authentic, Sophisticated, Confident', 'Seductive, Playful, Devoted', 'Analytical, Visionary, Bold'];
    const visualStyles = ['Warm golden hour tones, minimalist luxury aesthetic', 'Sleek dark studio aesthetic', 'High-contrast fashion editorial'];
    const bios = [
      'Digital creator & style icon sharing visual aesthetics and authentic stories.',
      'Fitness creator sharing daily workout routines and biohacking tips.',
      'Exclusive digital creator sharing personal connections and creative content.'
    ];

    setName(getRandomItem(names));
    if (!niche.trim()) setNiche(activeNiche);
    setTone(getRandomItem(tones));
    setVisualStyle(getRandomItem(visualStyles));
    setBio(getRandomItem(bios));
    setPersonalityTraits('Authentic, Confident, Visionary');
    setAudienceType('Gen Z & Millennials (Ages 18-35)');
    setContentGoals('Build an engaged community and share daily visual content.');
    setContentBoundaries('Maintain high visual quality and authentic brand values.');

    setTimeout(() => {
      setIsGeneratingConcept(false);
      toast.success(`✨ Generated details for "${activeNiche}"!`, { icon: '⚡' });
    }, 150);
  };

  const handleAudioUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsCloning(true);
    try {
      const readPromises = files.map(file => processVoiceSampleFile(file));
      const newSamples = await Promise.all(readPromises);
      // Prepend newly uploaded samples to index 0 so they become the active primary voice sample!
      const updatedList = [...newSamples, ...audioSampleList];
      setAudioSampleList(updatedList);
      setAudioSampleName(updatedList.map(s => s.name).join(', '));

      const allBase64s = updatedList.map(s => s.base64);
      setAudioSampleBase64(newSamples[0].base64);

      // Set active tab to clone voice
      setVoiceTab('clone');
      // Clear any old voice ID so the newly uploaded file is used for instant voice cloning!
      setSelectedVoiceId('');
      setSelectedVoiceModel('elevenlabs');

      try {
        const res = await api.voice.cloneVoice(name || 'New Persona', `Cloned voice sample (${updatedList.length} files)`, allBase64s);
        if (res?.voiceId && !(res as any).fallback) {
          setSelectedVoiceId(res.voiceId);
        }
      } catch (err: any) {
        console.warn('[Voice Clone Creation Note]:', err?.message || err);
      }
      toast.success(`✨ Uploaded and decoded ${newSamples.length} voice reference file${newSamples.length > 1 ? 's' : ''}!`);
    } catch (err: any) {
      console.error('[Audio Upload Error]:', err);
      toast.error('Failed to process audio/video files');
    } finally {
      setIsCloning(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  const handleResetVoiceSamples = () => {
    setAudioSampleList([]);
    setAudioSampleBase64('');
    setAudioSampleName('');
    setSelectedVoiceId('');
    setSelectedVoiceModel('omnivoice');
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setIsPlayingSample(false);
    toast.success('🗑️ Reset & removed all uploaded voice samples!');
  };

  const setPrimaryAudioSample = (idxToMakePrimary: number) => {
    if (idxToMakePrimary === 0 || idxToMakePrimary >= audioSampleList.length) return;
    const selected = audioSampleList[idxToMakePrimary];
    const rest = audioSampleList.filter((_, i) => i !== idxToMakePrimary);
    const updated = [selected, ...rest];
    setAudioSampleList(updated);
    setAudioSampleBase64(selected.base64);
    setAudioSampleName(updated.map(s => s.name).join(', '));
    setSelectedVoiceId('');
    setSelectedVoiceModel('omnivoice');
    toast.success(`⭐ Set "${selected.name}" as Primary Voice Reference!`);
  };

  const removeAudioSample = (idxToRemove: number) => {
    const updated = audioSampleList.filter((_, i) => i !== idxToRemove);
    setAudioSampleList(updated);
    setAudioSampleName(updated.map(s => s.name).join(', '));
    if (updated.length > 0) {
      setAudioSampleBase64(updated[0].base64);
    } else {
      setAudioSampleBase64('');
    }
    toast.success('Removed voice sample');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a persona name');
      return;
    }

    setIsSaving(true);
    const saveToastId = toast.loading('Saving persona securely...');
    try {
      const personaId = editingPersona?.id || `user-${Date.now()}`;
      const persistedReferenceImages = await persistPersonaReferenceImages(referenceImages, personaId);
      const primaryImg = persistedReferenceImages[0] || '';
      const additionalImgs = persistedReferenceImages.slice(1);

      const defaultVoiceRule = `Deeply loyal, devoted, and open with her creator. Loves teasing, talking dirty, and fulfilling all romantic, adult, and creative desires in text and voice. ${tone}`.trim();
      const voiceRuleToSave = creatorVoiceRule.trim() || (editingPersona?.brandVoiceRules || defaultVoiceRule);
      const defaultNotes = `Fully uncensored. Adores her creator as her master partner and indulges every request willingly.`;
      const voiceEngineToSave = voiceTab === 'heygen'
        ? 'heygen'
        : voiceTab === 'account'
          ? 'elevenlabs'
          : (voiceTab === 'clone' || audioSampleList.length > 0)
            ? (selectedVoiceModel || 'elevenlabs')
            : voiceTab === 'custom'
              ? 'custom'
              : 'preset';

      if (editingPersona) {
        const updatedPersona: Persona = {
          ...editingPersona,
          name,
          niche,
          platform,
          tone,
          visualStyle,
          bio,
          brandVoiceRules: voiceRuleToSave,
          personalityTraits: personalityTraits.split(',').map(t => t.trim()).filter(Boolean),
          audienceType,
          contentGoals,
          contentBoundaries,
          referenceImage: primaryImg,
          avatar: primaryImg,
          additionalReferenceImages: additionalImgs,
          visualLibrary: generationsVault,
          voiceId: selectedVoiceId,
          voiceEngine: voiceEngineToSave,
          companionType: companionType || 'intimate',
          voiceSampleUrl: audioSampleList[0]?.base64 || audioSampleBase64 || (editingPersona as any).voiceSampleUrl,
          audioSamples: audioSampleList.map(s => ({ name: s.name, base64: s.base64 })),
          voicePrompt: voicePrompt || undefined,
          voiceLikeness,
          voiceStability,
          voiceStyleExaggeration,
          voiceSpeakingSpeed,
          personaNotes: voicePrompt ? `${voicePrompt}. ${defaultNotes}` : (editingPersona.personaNotes || defaultNotes),
        } as Persona;

        const savedPersona = await withTimeout(api.personas.update(updatedPersona), 30000);
        const confirmedPersona = { ...updatedPersona, ...savedPersona } as Persona;
        setPersonas(personas.map(p => p.id === editingPersona.id ? confirmedPersona : p));
        onSelectPersona(confirmedPersona.id);
        toast.success(`✅ Saved ${confirmedPersona.name}!`, { id: saveToastId });

      } else {
        const newPersona: Persona = {
          id: personaId,
          name,
          niche,
          platform,
          tone,
          visualStyle,
          bio,
          status: 'Active',
          brandVoiceRules: voiceRuleToSave,
          personalityTraits: personalityTraits.split(',').map(t => t.trim()).filter(Boolean),
          audienceType,
          contentGoals,
          contentBoundaries,
          referenceImage: primaryImg,
          avatar: primaryImg,
          additionalReferenceImages: additionalImgs,
          visualLibrary: generationsVault,
          voiceId: selectedVoiceId,
          voiceEngine: voiceEngineToSave,
          companionType: companionType || 'intimate',
          voiceSampleUrl: audioSampleList[0]?.base64 || audioSampleBase64 || '',
          audioSamples: audioSampleList.map(s => ({ name: s.name, base64: s.base64 })),
          voicePrompt: voicePrompt || undefined,
          voiceLikeness,
          voiceStability,
          voiceStyleExaggeration,
          voiceSpeakingSpeed,
          personaNotes: voicePrompt ? `${voicePrompt}. ${defaultNotes}` : defaultNotes,
          createdAt: new Date().toISOString()
        } as Persona;

        const savedPersona = await withTimeout(api.personas.create(newPersona), 30000);
        const confirmedPersona = { ...newPersona, ...savedPersona } as Persona;
        setPersonas([...personas, confirmedPersona]);
        onSelectPersona(confirmedPersona.id);
        toast.success(`✨ Created ${confirmedPersona.name}!`, { id: saveToastId });
      }

      accountLocalStorage.removeItem('persona_form_draft');
      await clearPersonaDraftReferenceImages().catch(error => {
        console.warn('[Persona Image Draft Clear Note]:', error);
      });
      nav.replace({ view: 'personas' });
    } catch (error) {
      console.error('[Save Persona Error]:', error);
      const message = error instanceof Error ? error.message : 'Failed to save persona';
      toast.error(message, { id: saveToastId });
    } finally {
      setIsSaving(false);
    }
  };

  const currentWizardStep = WIZARD_STEPS[wizardStepIdx];
  const selectedVoiceName = accountVoices.find(voice => voice.voice_id === selectedVoiceId)?.name
    || heyGenVoices.find(voice => voice.voice_id === selectedVoiceId)?.name
    || PRESET_VOICES.find(voice => voice.id === selectedVoiceId)?.name
    || (audioSampleList.length > 0 ? 'Cloned voice' : 'Studio voice');
  const completedStudioSteps = [
    Boolean(name.trim()),
    referenceImages.length > 0,
    Boolean(companionType && (personalityTraits.trim() || tone.trim() || bio.trim())),
    Boolean(selectedVoiceId || audioSampleList.length > 0),
    false,
  ];

  const goToStudioStep = (nextStep: number) => {
    if (nextStep > studioStep && studioStep === 0 && !name.trim()) {
      toast.error('Add a persona name before continuing');
      return;
    }

    setStudioStep(Math.min(Math.max(nextStep, 0), STUDIO_STEPS.length - 1));
    window.requestAnimationFrame(() => {
      studioTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div ref={studioTopRef} className="relative min-h-screen bg-[#050914] text-[#F5F1E8] p-4 sm:p-6 lg:p-10 pb-20 overflow-y-auto select-none">
      <div className="relative z-10 max-w-[1300px] mx-auto space-y-8">
        
        {/* ── HEADER BAR ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 luxury-card p-4 sm:p-6 md:p-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#F5F1E8] tracking-tight flex items-center gap-3">
              {editingPersona ? `Edit ${editingPersona.name}` : 'Persona Studio'}
              <span className="text-[#E7C477] text-xl font-normal">✨</span>
            </h1>
            <p className="text-xs md:text-sm text-[#8C909A] mt-1 font-sans">
              Design unique AI personas with identity, style, voice, and brand alignment.
            </p>
          </div>

          {studioStep === 0 && (
            <div className="flex w-full sm:w-auto sm:justify-end">
              <button
                onClick={handleGeneratePersonaConcept}
                disabled={isGeneratingConcept}
                className="btn-gold-secondary w-full sm:w-auto px-3 sm:px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGeneratingConcept ? <Loader2 size={15} className="animate-spin text-[#F2D58D]" /> : <Wand2 size={15} className="text-[#D9BA72]" />}
                <span>Auto-Fill Idea</span>
              </button>
            </div>
          )}
        </div>

        {/* ── GUIDED STUDIO PROGRESS ── */}
        <div className="luxury-card p-3 sm:p-4">
          <div className="overflow-x-auto no-scrollbar">
            <div className="grid min-w-[680px] grid-cols-5 gap-2" aria-label="Persona creation progress">
              {STUDIO_STEPS.map((step, index) => {
                const isActive = studioStep === index;
                const isComplete = completedStudioSteps[index] || studioStep > index;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStudioStep(index)}
                    aria-current={isActive ? 'step' : undefined}
                    className={cn(
                      'group flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all',
                      isActive
                        ? 'border-[#E7C477] bg-[#E7C477]/10 shadow-[0_0_24px_rgba(231,196,119,0.08)]'
                        : 'border-white/10 bg-[#0E0E10] hover:border-white/20 hover:bg-[#141416]'
                    )}
                  >
                    <span className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                      isComplete
                        ? 'border-[#70C98B]/40 bg-[#70C98B]/15 text-[#70C98B]'
                        : isActive
                          ? 'border-[#E7C477] bg-[#E7C477] text-[#161108]'
                          : 'border-white/15 bg-white/5 text-slate-400'
                    )}>
                      {isComplete ? <Check size={14} strokeWidth={3} /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={cn('block text-xs font-bold', isActive ? 'text-[#F2D58D]' : 'text-white')}>
                        {step.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {step.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {studioStep === 1 && (
          <>
        {/* ── QUICK PRESETS WITH REALISTIC PORTRAIT VISUALS ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={13} className="text-cyan-400" />
              Quick Niche Ideas (Click to Apply Details & Reference Photo)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {QUICK_PRESETS.map((preset, idx) => (
              <motion.div
                key={idx}
                onClick={() => applyPreset(preset)}
                whileHover={{ y: -4, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group relative aspect-[3/4] min-h-[230px] sm:min-h-[250px] lg:min-h-[270px] rounded-2xl overflow-hidden border border-white/10 hover:border-[#E7C477] cursor-pointer transition-all shadow-2xl bg-[#161618] flex flex-col justify-between p-3.5"
              >
                {/* Background Image - Bright, Crisp, High Contrast */}
                <img
                  src={preset.image}
                  alt={preset.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-110 contrast-105 opacity-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop';
                  }}
                />

                {/* Light Gradient Overlay (Bottom text container only for crystal clarity) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent group-hover:from-black/90 transition-colors" />

                {/* Card Top Row */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="w-8 h-8 rounded-full bg-black/75 backdrop-blur-md border border-white/20 flex items-center justify-center text-sm shadow-md">
                    {preset.icon}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#E7C477] text-[#161618] text-[9.5px] font-bold uppercase tracking-wider shadow-lg group-hover:scale-105 transition-transform">
                    Use Idea
                  </span>
                </div>

                {/* Card Bottom Info - Inset Blurred Capsule */}
                <div className="relative z-10 space-y-1 bg-black/50 backdrop-blur-md p-2.5 rounded-xl border border-white/15">
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F2D58D] transition-colors leading-tight drop-shadow-md">
                    {preset.title}
                  </h4>
                  <p className="text-[10px] text-slate-200/90 truncate font-medium">
                    {preset.niche}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── STEP 1: PERSONA PHOTOS ── */}
        <div className="luxury-card p-4 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ImageIcon className="text-[#D9BA72]" size={20} />
                1. Persona Identity & Reference Vault ({referenceImages.length} Reference Photos)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload portrait headshots and training photos used for AI face consistency. AI-generated shoots are saved separately in the Generations Vault below.
              </p>
            </div>

            <div className="flex w-full sm:w-auto max-w-full min-w-0 items-center gap-1 bg-[#18181B] p-1 rounded-xl border border-white/10 flex-nowrap overflow-x-auto">
              <button
                type="button"
                onClick={() => setImageTab('upload')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                  imageTab === 'upload' ? "bg-[#E7C477] text-[#161618] font-bold shadow-sm" : "text-slate-400 hover:text-white"
                )}
              >
                <Upload size={13} /> Upload Photos
              </button>
              <button
                type="button"
                onClick={() => setImageTab('ai')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                  imageTab === 'ai' ? "bg-[#E7C477] text-[#161618] font-bold shadow-sm" : "text-slate-400 hover:text-white"
                )}
              >
                <Wand2 size={13} /> Describe with AI
              </button>
              <button
                type="button"
                onClick={() => setImageTab('wizard')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                  imageTab === 'wizard' ? "bg-[#E7C477] text-[#161618] font-bold shadow-sm" : "text-slate-400 hover:text-white"
                )}
              >
                <Wand size={13} /> Interactive Wizard
              </button>
            </div>
          </div>

          {imageTab === 'upload' && (
            /* Upload Dropzone */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-white/15 hover:border-[#E7C477] bg-[#0E0E10] p-8 text-center cursor-pointer transition-all group shadow-inner"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-[#E7C477] text-[#161618] flex items-center justify-center mx-auto mb-3 shadow-md group-hover:scale-105 transition-transform">
                <Upload size={22} />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Click or drag photos here</h4>
              <p className="text-xs text-slate-400">PNG, JPG, WebP photos supported</p>
            </div>
          )}

          {imageTab === 'ai' && (
            /* AI Text Prompt Generator */
            <div className="space-y-4 bg-[#0E0E10] p-5 rounded-2xl border border-white/10">
              <label className="block text-xs font-bold text-slate-300">
                Describe Persona Appearance & Style in Text:
              </label>
              <textarea
                value={aiImagePrompt}
                onChange={e => setAiImagePrompt(e.target.value)}
                placeholder="e.g. A 22-year-old Scandinavian fitness creator with long wavy blonde hair, warm brown eyes, natural tan skin, wearing modern athletic workout clothing in natural sunlight."
                rows={3}
                className="luxury-input w-full p-3.5 text-xs placeholder-slate-500"
              />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-400">
                  Generates an 8K realistic portrait using ByteDance Seedream 5.0 Pro
                </span>

                <button
                  type="button"
                  onClick={handleGenerateAiAvatar}
                  disabled={isGeneratingAiAvatar}
                  className="btn-gold-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer shrink-0"
                >
                  {isGeneratingAiAvatar ? <Loader2 size={15} className="animate-spin text-[#161108]" /> : <Wand2 size={15} />}
                  <span>{isGeneratingAiAvatar ? 'Generating Avatar Photo...' : '✨ Generate Avatar Photo with AI'}</span>
                </button>
              </div>
            </div>
          )}

          {imageTab === 'wizard' && (
            /* INTERACTIVE STEP-BY-STEP WIZARD */
            <div className="space-y-6 bg-[#0E0E10] p-6 rounded-2xl border border-white/10">
              {/* Wizard Step Progress Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-[#F2D58D] uppercase tracking-wider">
                  Step {wizardStepIdx + 1} of {WIZARD_STEPS.length}: {currentWizardStep.title}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWizardStepIdx(prev => Math.max(0, prev - 1))}
                    disabled={wizardStepIdx === 0}
                    className="p-1.5 rounded-lg bg-[#1C1C20] hover:bg-[#242428] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStepIdx(prev => Math.min(WIZARD_STEPS.length - 1, prev + 1))}
                    disabled={wizardStepIdx === WIZARD_STEPS.length - 1}
                    className="p-1.5 rounded-lg bg-[#1C1C20] hover:bg-[#242428] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Wizard Visual Option Cards Grid - Single Row Layout */}
              <div className="flex flex-row items-stretch gap-2.5 sm:gap-3 w-full overflow-x-auto pb-1 no-scrollbar">
                {currentWizardStep.options.map((opt: any, idx: number) => {
                  const isSelected = wizardSelections[currentWizardStep.id] === opt.value;
                  return (
                    <motion.div
                      key={idx}
                      onClick={() => handleWizardOptionSelect(currentWizardStep.id, opt.value)}
                      whileHover={{ y: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "relative flex-1 min-w-0 aspect-[3/4] h-[190px] sm:h-[220px] rounded-2xl border cursor-pointer transition-all flex flex-col justify-between overflow-hidden p-3 sm:p-3.5 group shadow-xl",
                        isSelected ? "border-[#E7C477] ring-2 ring-[#E7C477]/40 bg-[#242428]" : "border-white/10 bg-[#161618] hover:border-white/20"
                      )}
                    >
                      {/* Background Thumbnail Image - Bright & Crisp */}
                      {opt.image && (
                        <>
                          <img
                            src={opt.image}
                            alt={opt.label}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-100 brightness-105 contrast-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop';
                            }}
                          />
                          {/* Subtle Bottom-Only Gradient Overlay for Brightness */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/40 to-transparent" />
                        </>
                      )}

                      {/* Top Badge */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-xs sm:text-sm shadow-md shrink-0">
                          {opt.icon}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[#E7C477] text-[#161618] flex items-center justify-center shadow-md shrink-0">
                            <Check size={12} className="font-bold" />
                          </span>
                        )}
                      </div>

                      {/* Bottom Info */}
                      <div className="relative z-10 space-y-0.5 bg-black/60 backdrop-blur-md p-2 rounded-xl border border-white/10">
                        <h5 className="text-[11px] sm:text-xs font-bold text-white leading-tight drop-shadow-md group-hover:text-[#F2D58D] transition-colors truncate">
                          {opt.label}
                        </h5>
                        <p className="text-[9px] sm:text-[10px] text-slate-200/90 font-medium truncate">
                          {opt.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Wizard Real-Time Synthesized Prompt Preview & Action Bar */}
              <div className="pt-3 border-t border-white/10 space-y-4">
                <div className="p-3.5 rounded-xl bg-[#08080A] border border-white/10 text-[11px] font-mono text-[#F2D58D]/90 leading-relaxed">
                  <span className="text-slate-500 font-bold block mb-1">Synthesized Persona Prompt:</span>
                  {constructWizardPrompt()}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {wizardStepIdx < WIZARD_STEPS.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setWizardStepIdx(prev => prev + 1)}
                        className="px-5 py-2.5 rounded-xl bg-[#1C1C20] hover:bg-[#242428] text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <span>Next Step ({wizardStepIdx + 2}/{WIZARD_STEPS.length})</span>
                        <ChevronRight size={14} />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-semibold">✨ All steps completed! Ready to generate.</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateWizardPersona}
                    disabled={isGeneratingAiAvatar}
                    className="btn-gold-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer shrink-0"
                  >
                    {isGeneratingAiAvatar ? <Loader2 size={16} className="animate-spin text-[#161108]" /> : <Wand size={16} />}
                    <span>{isGeneratingAiAvatar ? 'Generating Wizard Persona...' : '🧙 Generate Persona with Wizard'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Photo Gallery Grid */}
          {referenceImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
              {referenceImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "group relative h-40 rounded-xl overflow-hidden border bg-black/40",
                    idx === 0 ? "border-[#E7C477] ring-2 ring-[#E7C477]/20" : "border-white/10"
                  )}
                >
                  <img 
                    src={imgUrl} 
                    alt="" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                  
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                    {idx === 0 ? (
                      <span className="px-2 py-0.5 rounded bg-[#E7C477] text-[#161618] text-[9px] font-bold uppercase">
                        Main Avatar
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPrimaryImage(idx); }}
                        className="p-1.5 rounded-full bg-black/80 text-white hover:text-[#E7C477] transition-all"
                        title="Make Main Avatar"
                      >
                        <Star size={12} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                      className="p-1.5 rounded-full bg-black/80 text-white hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}

        {studioStep === 3 && (
        <div className="luxury-card p-4 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Mic className="text-[#D9BA72]" size={20} />
                2. Persona Voice
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose a built-in voice or upload audio clips to clone a custom voice.
              </p>
            </div>

            <div className="flex w-full sm:w-auto max-w-full min-w-0 items-center gap-1.5 bg-[#18181B] p-1 rounded-xl border border-white/10 overflow-x-auto">
              <button
                type="button"
                onClick={() => setVoiceTab('preset')}
                className={cn("px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer", voiceTab === 'preset' ? "bg-[#E7C477] text-[#161618]" : "text-slate-400 hover:text-white")}
              >
                Studio Voices
              </button>
              <button
                type="button"
                onClick={() => setVoiceTab('clone')}
                className={cn("px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer", voiceTab === 'clone' ? "bg-[#E7C477] text-[#161618]" : "text-slate-400 hover:text-white")}
              >
                Clone My Voice
              </button>
              <button
                type="button"
                onClick={() => setVoiceTab('account')}
                className={cn("px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5", voiceTab === 'account' ? "bg-[#E7C477] text-[#161618]" : "text-slate-400 hover:text-white")}
              >
                <span>My ElevenLabs Voices</span>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase", voiceTab === 'account' ? "bg-[#161618]/30 text-[#161618]" : "bg-amber-500/20 text-amber-300 border border-amber-500/40")}>LIVE</span>
              </button>
              <button
                type="button"
                onClick={() => setVoiceTab('heygen')}
                className={cn("px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5", voiceTab === 'heygen' ? "bg-[#E7C477] text-[#161618]" : "text-slate-400 hover:text-white")}
              >
                <span>My HeyGen Voices</span>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase", voiceTab === 'heygen' ? "bg-[#161618]/30 text-[#161618]" : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30")}>LIVE</span>
              </button>
            </div>
          </div>

          {voiceTab === 'preset' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {PRESET_VOICES.map((v) => {
                const isSelected = selectedVoiceId === v.id;
                const isPlaying = playingPresetVoiceId === v.id;
                const isLoading = isLoadingPresetAudioId === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => { setSelectedVoiceId(v.id); setSelectedVoiceModel('preset'); }}
                    className={cn(
                      "p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 min-h-[125px] relative group",
                      isSelected ? "border-[#E7C477] ring-1 ring-[#E7C477]/40 bg-[#242428] shadow-lg" : "border-white/10 bg-[#0E0E10] hover:border-white/20"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Mic size={13} className="text-[#D9BA72]" />
                          {v.name}
                        </span>
                        {isSelected && (
                          <span className="p-1 bg-[#E7C477] text-[#161618] rounded-full shadow-md">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">{v.description}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-auto">
                      <button
                        type="button"
                        onClick={(e) => handlePlayPresetSample(v.id, v.name, v.preview_url, e)}
                        disabled={isLoading}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm",
                          isPlaying
                            ? "bg-[#E7C477] text-[#161618] animate-pulse"
                            : "bg-[#18181B] hover:bg-[#242428] text-[#F2D58D] border border-white/10 hover:border-[#E7C477]/40"
                        )}
                        title={`Listen to sample audio of ${v.name}`}
                      >
                        {isLoading ? (
                          <Loader2 size={11} className="animate-spin text-[#D9BA72]" />
                        ) : isPlaying ? (
                          <VolumeX size={11} />
                        ) : (
                          <Volume2 size={11} />
                        )}
                        <span>{isLoading ? 'Loading...' : (isPlaying ? 'Stop' : 'Play Sample')}</span>
                      </button>

                      <span className="text-[10px] font-bold text-[#F2D58D]">
                        {isSelected ? '✓ Active' : 'Select'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {voiceTab === 'clone' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Voice Cloning Model ({VOICE_CLONING_MODELS.length} Models Available)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {VOICE_CLONING_MODELS.map((model) => {
                    const isSelected = selectedVoiceModel === model.id;
                    const isPlaying = playingPresetVoiceId === model.id;
                    const isLoading = isLoadingPresetAudioId === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => setSelectedVoiceModel(model.id)}
                        className={cn(
                          "p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2.5",
                          isSelected ? "border-[#E7C477] ring-1 ring-[#E7C477]/40 bg-[#242428] shadow-lg" : "border-white/10 bg-[#0E0E10] hover:border-white/20"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Mic size={13} className="text-[#D9BA72]" />
                              {model.name}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#E7C477]/20 text-[#F2D58D] border border-[#E7C477]/30 text-[9px] font-bold uppercase">
                              {model.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug mt-1">{model.desc}</p>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-2 mt-auto">
                          <button
                            type="button"
                            onClick={(e) => handlePlayPresetSample(model.id, model.name, undefined, e)}
                            disabled={isLoading}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                              isPlaying
                                ? "bg-[#E7C477] text-[#161618] animate-pulse"
                                : "bg-[#18181B] hover:bg-[#242428] text-[#F2D58D] border border-white/10 hover:border-[#E7C477]/40"
                            )}
                            title={`Audition timbre of ${model.name}`}
                          >
                            {isLoading ? (
                              <Loader2 size={11} className="animate-spin text-[#D9BA72]" />
                            ) : isPlaying ? (
                              <VolumeX size={11} />
                            ) : (
                              <Volume2 size={11} />
                            )}
                            <span>{isLoading ? 'Loading...' : (isPlaying ? 'Stop' : 'Audition')}</span>
                          </button>

                          <span className="text-[10px] font-bold text-[#F2D58D]">
                            {isSelected ? '✓ Selected' : 'Choose Model'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap border-t border-white/10 pt-4">
                <input
                  type="file"
                  ref={audioInputRef}
                  onChange={handleAudioUpload}
                  accept="audio/*,video/*"
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={isCloning}
                  className="btn-gold-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {isCloning ? <Loader2 size={15} className="animate-spin text-[#161108]" /> : <Upload size={15} />}
                  <span>Upload Audio Clips ({audioSampleList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestVoiceSample}
                  disabled={isTestingVoice}
                  className="px-4 py-2.5 rounded-xl bg-[#1C1C20] hover:bg-[#242428] border border-white/10 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  {isTestingVoice ? <Loader2 size={15} className="animate-spin text-[#D9BA72]" /> : (isPlayingSample ? <VolumeX size={15} className="text-rose-400" /> : <Volume2 size={15} className="text-[#D9BA72]" />)}
                  <span>{isPlayingSample ? 'Stop Preview' : 'Preview Voice'}</span>
                </button>

                {audioSampleList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetVoiceSamples}
                    className="px-3.5 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#242428] border border-white/10 hover:border-white/20 text-[#A1A1AA] hover:text-[#F5F1E8] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group"
                    title="Clear and remove all voice reference samples"
                  >
                    <Trash2 size={14} className="text-[#A1A1AA] group-hover:text-[#F5F1E8] transition-colors" />
                    <span>Reset All Voice Samples</span>
                  </button>
                )}
              </div>

              {audioSampleList.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <span>Uploaded Voice Reference Samples ({audioSampleList.length}):</span>
                    <span className="text-[10px] text-[#D9BA72] font-normal lowercase">(First sample is active primary)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {audioSampleList.map((sample, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                          idx === 0
                            ? "bg-[#242428] border-[#E7C477] text-[#F2D58D] shadow-md"
                            : "bg-[#0E0E10] border-white/10 text-slate-300 hover:border-white/20"
                        )}
                      >
                        <Volume2 size={13} className={idx === 0 ? "text-[#E7C477] animate-pulse" : "text-slate-400"} />
                        <span className="max-w-[160px] truncate">{sample.name}</span>

                        {idx === 0 ? (
                          <span className="text-[10px] bg-[#E7C477]/20 text-[#F2D58D] px-1.5 py-0.5 rounded font-bold tracking-wide">
                            ⭐ PRIMARY
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPrimaryAudioSample(idx)}
                            className="text-[10px] text-slate-400 hover:text-[#F2D58D] underline font-medium"
                            title="Set as active primary voice sample"
                          >
                            Set Primary
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => removeAudioSample(idx)}
                          className="hover:text-rose-400 text-slate-400 ml-1"
                          title="Remove sample"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced Voice Fine-Tuning & Voice Description Panel */}
              <div className="space-y-4 bg-[#0E0E10] p-5 rounded-2xl border border-white/10 mt-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-bold text-[#F2D58D] uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders size={14} className="text-[#D9BA72]" />
                    Advanced Voice Tuning & Voice Description Prompt
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Supported across ElevenLabs, Qwen 3.0, Zonos & Seed-Speech</span>
                </div>

                {/* Voice Description Prompt */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Voice Description & Tone Prompt (Guided Vocal Style):
                  </label>
                  <textarea
                    value={voicePrompt}
                    onChange={e => setVoicePrompt(e.target.value)}
                    placeholder="e.g. A warm, seductive female voice with a soft Middle Eastern accent, low breathy cadence, and energetic conversational tone."
                    rows={2}
                    className="luxury-input w-full p-3 text-xs font-medium"
                  />
                </div>

                {/* Sliders Grid: Likeness / Similarity, Stability, Style Exaggeration, Speaking Speed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  {/* 1. Voice Likeness / Similarity Boost */}
                  <div className="space-y-1.5 bg-[#08080A] p-3 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300">Voice Likeness / Similarity</span>
                      <span className="text-[#D9BA72]">{voiceLikeness}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={voiceLikeness}
                      onChange={e => setVoiceLikeness(Number(e.target.value))}
                      className="w-full accent-[#E7C477] cursor-pointer h-1.5 bg-[#1C1C20] rounded-lg"
                    />
                    <p className="text-[10px] text-slate-500">Closeness to uploaded audio sample</p>
                  </div>

                  {/* 2. Voice Stability / Consistency */}
                  <div className="space-y-1.5 bg-[#08080A] p-3 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300">Stability & Monotone</span>
                      <span className="text-[#D9BA72]">{voiceStability}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={voiceStability}
                      onChange={e => setVoiceStability(Number(e.target.value))}
                      className="w-full accent-[#E7C477] cursor-pointer h-1.5 bg-[#1C1C20] rounded-lg"
                    />
                    <p className="text-[10px] text-slate-500">Higher = steady; Lower = expressive</p>
                  </div>

                  {/* 3. Style Exaggeration / Emotion */}
                  <div className="space-y-1.5 bg-[#08080A] p-3 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300">Style & Emotion Level</span>
                      <span className="text-[#D9BA72]">{voiceStyleExaggeration}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={voiceStyleExaggeration}
                      onChange={e => setVoiceStyleExaggeration(Number(e.target.value))}
                      className="w-full accent-[#E7C477] cursor-pointer h-1.5 bg-[#1C1C20] rounded-lg"
                    />
                    <p className="text-[10px] text-slate-500">Amplifies emotion & vocal energy</p>
                  </div>

                  {/* 4. Speaking Speed / Pace */}
                  <div className="space-y-1.5 bg-[#08080A] p-3 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300">Speaking Speed</span>
                      <span className="text-[#D9BA72]">{voiceSpeakingSpeed.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.50"
                      max="1.50"
                      step="0.05"
                      value={voiceSpeakingSpeed}
                      onChange={e => setVoiceSpeakingSpeed(Number(e.target.value))}
                      className="w-full accent-[#E7C477] cursor-pointer h-1.5 bg-[#1C1C20] rounded-lg"
                    />
                    <p className="text-[10px] text-slate-500">Pace during TTS speech generation</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {voiceTab === 'account' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="text-amber-400" size={16} />
                    My ElevenLabs Account Voices ({accountVoices.length})
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select any custom voice clone, trained voice, or saved voice directly from your ElevenLabs account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchAccountVoices}
                  disabled={isLoadingAccountVoices}
                  className="px-3.5 py-1.5 rounded-lg bg-[#1C1C20] hover:bg-[#242428] border border-white/10 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  {isLoadingAccountVoices ? <Loader2 size={13} className="animate-spin text-[#D9BA72]" /> : <Sparkles size={13} className="text-amber-400" />}
                  <span>Refresh Account Voices</span>
                </button>
              </div>

              {isLoadingAccountVoices ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-[#0E0E10] rounded-xl border border-white/10">
                  <Loader2 className="animate-spin text-[#D9BA72]" size={28} />
                  <p className="text-xs text-slate-400 font-medium">Connecting to ElevenLabs & fetching your account voices...</p>
                </div>
              ) : accountVoices.length === 0 ? (
                <div className="text-center py-10 bg-[#0E0E10] rounded-xl border border-white/10 space-y-2">
                  <Mic size={32} className="mx-auto text-slate-600" />
                  <p className="text-xs text-slate-300 font-bold">No custom voices found on your ElevenLabs account</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Upload audio clips in the "Clone My Voice" tab to create your first voice clone, or add custom voices in your ElevenLabs dashboard.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {accountVoices.map((v) => {
                    const isSelected = selectedVoiceId === v.voice_id;
                    const isPlaying = playingAccountAudioId === v.voice_id;
                    return (
                      <div
                        key={v.voice_id}
                        onClick={() => {
                          setSelectedVoiceId(v.voice_id);
                          setSelectedVoiceModel('elevenlabs');
                          toast.success(`Selected "${v.name}" from your ElevenLabs account!`);
                        }}
                        className={cn(
                          "p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 relative group",
                          isSelected
                            ? "border-[#E7C477] ring-1 ring-[#E7C477]/40 bg-[#242428] shadow-lg"
                            : "border-white/10 bg-[#0E0E10] hover:border-white/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white">{v.name}</span>
                              <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase",
                                v.category === 'cloned' ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                                (v.category === 'generated' ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "bg-[#141416] text-slate-400")
                              )}>
                                {v.category || 'Custom'}
                              </span>
                            </div>
                            {v.labels && Object.keys(v.labels).length > 0 && (
                              <p className="text-[10px] text-slate-400 capitalize">
                                {Object.entries(v.labels).slice(0, 3).map(([_k, val]) => `${val}`).join(' • ')}
                              </p>
                            )}
                          </div>

                          {isSelected && (
                            <span className="p-1 bg-[#E7C477] text-[#161618] rounded-full shadow-md">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-2.5 mt-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayAccountVoicePreview(v.voice_id, v.name, v.preview_url);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                              isPlaying ? "bg-[#E7C477] text-[#161618] animate-pulse" : "bg-[#1C1C20] hover:bg-[#242428] text-slate-300 border border-white/10"
                            )}
                          >
                            {isPlaying ? <VolumeX size={12} /> : <Volume2 size={12} className="text-[#D9BA72]" />}
                            <span>{isPlaying ? 'Stop' : 'Listen Preview'}</span>
                          </button>

                          <span className={cn(
                            "text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded",
                            isSelected ? "text-[#F2D58D] bg-[#E7C477]/10" : "text-slate-500 group-hover:text-slate-300"
                          )}>
                            {isSelected ? '⭐ Active Voice' : 'Select Voice'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {voiceTab === 'heygen' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="text-cyan-300" size={16} />
                    My HeyGen Voices ({heyGenVoices.length})
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Private voices from your HeyGen account that support audio previews and persona speech.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchHeyGenVoices}
                  disabled={isLoadingHeyGenVoices}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-[#1C1C20] hover:bg-[#242428] border border-white/10 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  {isLoadingHeyGenVoices ? <Loader2 size={13} className="animate-spin text-cyan-300" /> : <Sparkles size={13} className="text-cyan-300" />}
                  <span>Refresh HeyGen Voices</span>
                </button>
              </div>

              {isLoadingHeyGenVoices ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-[#0E0E10] rounded-xl border border-white/10">
                  <Loader2 className="animate-spin text-cyan-300" size={28} />
                  <p className="text-xs text-slate-400 font-medium">Loading your private HeyGen voices...</p>
                </div>
              ) : heyGenVoices.length === 0 ? (
                <div className="text-center py-10 bg-[#0E0E10] rounded-xl border border-white/10 space-y-2">
                  {heyGenLoadError.toLowerCase().includes('sign-in') ? (
                    <>
                      <Shield size={32} className="mx-auto text-cyan-300" />
                      <p className="text-sm text-slate-200 font-bold">Connect your creator account</p>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto px-4">
                        This preview opened without your Supabase session. Sign in here to securely load the private voices connected to your HeyGen account.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowHeyGenSignIn(true)}
                        className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-[#E7C477] px-4 py-2 text-xs font-bold text-[#161618] transition-all hover:bg-[#F2D58D] cursor-pointer"
                      >
                        <Shield size={14} />
                        Sign In to Load HeyGen Voices
                      </button>
                    </>
                  ) : (
                    <>
                      <Mic size={32} className="mx-auto text-slate-600" />
                      <p className="text-xs text-slate-300 font-bold">No compatible private HeyGen voices found</p>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto px-4">
                        Make sure your private voice is available to HeyGen&apos;s Starfish speech engine, then refresh the library.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {heyGenVoices.map((voice) => {
                    const isSelected = selectedVoiceId === voice.voice_id && selectedVoiceModel === 'heygen';
                    const isPlaying = playingHeyGenAudioId === voice.voice_id;
                    return (
                      <div
                        key={voice.voice_id}
                        onClick={() => {
                          setSelectedVoiceId(voice.voice_id);
                          setSelectedVoiceModel('heygen');
                          toast.success(`Selected "${voice.name}" from your HeyGen account!`);
                        }}
                        className={cn(
                          "p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 relative group min-h-[130px]",
                          isSelected
                            ? "border-[#E7C477] ring-1 ring-[#E7C477]/40 bg-[#242428] shadow-lg"
                            : "border-white/10 bg-[#0E0E10] hover:border-cyan-300/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white">{voice.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                HeyGen
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 capitalize">
                              {[voice.gender, voice.language].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="p-1 bg-[#E7C477] text-[#161618] rounded-full shadow-md">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2.5 mt-auto">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handlePlayHeyGenVoicePreview(voice.voice_id, voice.name, voice.preview_audio_url);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                              isPlaying ? "bg-[#E7C477] text-[#161618] animate-pulse" : "bg-[#1C1C20] hover:bg-[#242428] text-slate-300 border border-white/10"
                            )}
                          >
                            {isPlaying ? <VolumeX size={12} /> : <Volume2 size={12} className="text-cyan-300" />}
                            <span>{isPlaying ? 'Stop' : 'Listen Preview'}</span>
                          </button>
                          <span className={cn(
                            "text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded",
                            isSelected ? "text-[#F2D58D] bg-[#E7C477]/10" : "text-slate-500 group-hover:text-slate-300"
                          )}>
                            {isSelected ? 'Active Voice' : 'Select Voice'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
        )}

        {studioStep === 4 && (
          <>
        {/* ── REVIEW SUMMARY ── */}
        <div className="luxury-card overflow-hidden">
          <div className="border-b border-white/10 bg-gradient-to-r from-[#E7C477]/10 to-transparent p-5 sm:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D9BA72]">Ready to publish</p>
                <h2 className="mt-1 text-2xl font-serif text-white">Review your persona</h2>
                <p className="mt-1 text-xs text-slate-400">Check the essentials below. You can jump back to any step without losing your work.</p>
              </div>
              <span className="rounded-full border border-[#70C98B]/30 bg-[#70C98B]/10 px-3 py-1.5 text-xs font-semibold text-[#70C98B]">
                {editingPersona ? 'Ready to save' : 'Ready to publish'}
              </span>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[220px_1fr]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0E0E10]">
              {referenceImages[0] ? (
                <img src={referenceImages[0]} alt={name || 'Persona preview'} className="aspect-[3/4] h-full w-full object-cover" />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center text-slate-600">
                  <User size={42} />
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold text-white">{name || 'Unnamed persona'}</h3>
                <p className="mt-1 text-sm text-slate-400">{niche || 'No niche selected'} · {platform}</p>
                {bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">{bio}</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button type="button" onClick={() => goToStudioStep(1)} className="rounded-xl border border-white/10 bg-[#0E0E10] p-3 text-left hover:border-[#E7C477]/40">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Appearance</span>
                  <span className="mt-1 block text-xs font-semibold text-white">{referenceImages.length} reference photo{referenceImages.length === 1 ? '' : 's'}</span>
                </button>
                <button type="button" onClick={() => goToStudioStep(2)} className="rounded-xl border border-white/10 bg-[#0E0E10] p-3 text-left hover:border-[#E7C477]/40">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Personality</span>
                  <span className="mt-1 block text-xs font-semibold text-white">{COMPANION_TYPES.find(type => type.id === companionType)?.title || 'Not selected'}</span>
                </button>
                <button type="button" onClick={() => goToStudioStep(3)} className="rounded-xl border border-white/10 bg-[#0E0E10] p-3 text-left hover:border-[#E7C477]/40">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Voice</span>
                  <span className="mt-1 block text-xs font-semibold text-white">{selectedVoiceName}</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {personalityTraits.split(',').map(trait => trait.trim()).filter(Boolean).slice(0, 8).map(trait => (
                  <span key={trait} className="rounded-full border border-[#E7C477]/20 bg-[#E7C477]/10 px-2.5 py-1 text-[11px] font-semibold text-[#F2D58D]">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── PERSONA GENERATIONS VAULT ── */}
        <div className="luxury-card p-7 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderHeart className="text-[#D9BA72]" size={20} />
                3. Persona Generations Vault
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                AI Generated images, studio shoots, and scenes created for {name || 'this persona'}. Kept separate from training reference photos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#E7C477]/10 text-[#F2D58D] border border-[#E7C477]/30 text-xs font-bold">
                {generationsVault.length} Generated {generationsVault.length === 1 ? 'Asset' : 'Assets'}
              </span>
            </div>
          </div>

          {generationsVault.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#0E0E10] border border-white/10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#E7C477]/10 border border-[#E7C477]/30 flex items-center justify-center mx-auto text-[#D9BA72]">
                <FolderHeart size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Generations Vault is Empty</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Images and videos you generate in Image Studio, Persona Chat, or Super Agent for {name || 'this persona'} will be securely saved here in their own dedicated folder.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {generationsVault.map((gen, idx) => (
                <div
                  key={gen.id || idx}
                  className="group relative h-48 rounded-xl overflow-hidden border border-white/10 bg-black/40 hover:border-[#E7C477]/50 transition-all flex flex-col justify-between"
                >
                  <img
                    src={gen.url}
                    alt={gen.prompt || 'Generated Asset'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop';
                    }}
                  />

                  {/* Hover Overlay with Action Buttons */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-bold text-[#F2D58D] border border-white/10 uppercase">
                        {gen.model || 'Generated'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadGeneration(gen.url, gen.prompt);
                          }}
                          className="p-1.5 rounded-full bg-black/80 text-white hover:text-[#E7C477] transition-all cursor-pointer"
                          title="Download Image"
                        >
                          <Download size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGeneration(gen.id || gen.url);
                          }}
                          className="p-1.5 rounded-full bg-black/80 text-white hover:text-rose-400 transition-all cursor-pointer"
                          title="Delete from Vault"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] text-white font-medium line-clamp-1">
                        {gen.prompt || 'AI Generation'}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePromoteToRef(gen.url);
                          }}
                          className="flex-1 py-1 rounded bg-[#1C1C20]/90 hover:bg-[#242428] text-[9px] font-bold text-slate-200 border border-white/10 flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Copy into Identity Reference Photos"
                        >
                          <Plus size={10} />
                          <span>To Ref</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetAsAvatarFromVault(gen.url);
                          }}
                          className="flex-1 py-1 rounded bg-[#E7C477] text-[#161618] text-[9px] font-bold hover:bg-[#f2d58d] flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Set as Persona Main Avatar"
                        >
                          <Star size={10} />
                          <span>Avatar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}

        {(studioStep === 0 || studioStep === 2) && (
        <div className="luxury-card p-7 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            {studioStep === 0 ? <User className="text-[#D9BA72]" size={20} /> : <Heart className="text-[#D9BA72]" size={20} />}
            {studioStep === 0 ? 'Tell us who this persona is' : 'Shape their personality and behavior'}
          </h3>

          {/* 4 Persona Companion Type Options */}
          <div className={cn('space-y-3 border-b border-slate-800 pb-5', studioStep !== 2 && 'hidden')}>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Heart size={15} className="text-rose-400" />
              What Kind of Companion is Your Persona? (4 Companion Modes)
            </label>
            <p className="text-xs text-slate-400">
              Select your persona's primary relationship & companion role. This shapes how they converse, flirt, and bond during AI chat & live voice calls.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {COMPANION_TYPES.map((type) => {
                const isSelected = companionType === type.id;
                return (
                  <div
                    key={type.id}
                    onClick={() => setCompanionType(type.id)}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 group shadow-lg",
                      isSelected
                        ? "bg-[#242428] border-[#E7C477] ring-1 ring-[#E7C477]/40"
                        : "bg-[#0E0E10] border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F5F1E8] flex items-center gap-2">
                        <span className="text-base">{type.icon}</span>
                        {type.title}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                        isSelected
                          ? "bg-[#E7C477]/20 text-[#F2D58D] border-[#E7C477]/40"
                          : "bg-white/5 text-[#A1A1AA] border-white/10"
                      )}>
                        {type.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-relaxed font-medium">
                      {type.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className={cn(studioStep !== 0 && 'hidden')}>
              <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Rawan Hasan"
                className="luxury-input w-full px-4 py-2.5 text-xs font-bold"
              />
            </div>

            <div className={cn(studioStep !== 0 && 'hidden')}>
              <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Niche / Category</label>
              <input
                type="text"
                value={niche}
                onChange={e => setNiche(e.target.value)}
                placeholder="e.g. Fashion & Beauty or Adult content"
                className="luxury-input w-full px-4 py-2.5 text-xs font-bold"
              />
            </div>

            <div className={cn(studioStep !== 0 && 'hidden')}>
              <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Social Platform</label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                className="luxury-input w-full px-4 py-2.5 text-xs font-bold cursor-pointer"
              >
                <option value="Instagram" className="bg-[#141416] text-[#F5F1E8]">Instagram</option>
                <option value="TikTok" className="bg-[#141416] text-[#F5F1E8]">TikTok</option>
                <option value="YouTube" className="bg-[#141416] text-[#F5F1E8]">YouTube</option>
                <option value="Twitter" className="bg-[#141416] text-[#F5F1E8]">Twitter / X</option>
              </select>
            </div>

            <div className={cn(studioStep !== 2 && 'hidden')}>
              <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Tone of Voice</label>
              <input
                type="text"
                value={tone}
                onChange={e => setTone(e.target.value)}
                placeholder="e.g. Seductive, Authentic, Confident"
                className="luxury-input w-full px-4 py-2.5 text-xs"
              />
            </div>

            <div className={cn('md:col-span-2', studioStep !== 0 && 'hidden')}>
              <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Bio & Story</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Describe your persona's story and personality..."
                rows={3}
                className="luxury-input w-full p-3.5 text-xs"
              />
            </div>

            {/* Interactive Personality Trait Badges Selector */}
            <div className={cn('md:col-span-2 space-y-3 border-t border-white/10 pt-4', studioStep !== 2 && 'hidden')}>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#F5F1E8] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#D9BA72]" />
                  Select Personality Archetypes & Traits (Click to Toggle)
                </label>
                <span className="text-[11px] text-[#D9BA72] font-semibold">
                  {personalityTraits ? personalityTraits.split(',').filter(Boolean).length : 0} traits selected
                </span>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-[#0E0E10] rounded-xl border border-white/10">
                {POPULAR_PERSONALITY_TRAITS.map((trait) => {
                  const currentTraits = personalityTraits.split(',').map(t => t.trim()).filter(Boolean);
                  const isSelected = currentTraits.includes(trait);
                  return (
                    <button
                      key={trait}
                      type="button"
                      onClick={() => togglePersonalityTrait(trait)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                        isSelected
                          ? "bg-[#E7C477] text-[#161618] font-bold shadow-md scale-105"
                          : "bg-[#1C1C20] hover:bg-[#242428] text-[#D4D4D8] border border-white/10"
                      )}
                    >
                      {isSelected ? <Check size={12} className="stroke-[3]" /> : <Plus size={12} />}
                      <span>{trait}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">Active Personality Traits (Comma-Separated)</label>
                <input
                  type="text"
                  value={personalityTraits}
                  onChange={e => setPersonalityTraits(e.target.value)}
                  placeholder="e.g. Seductive, Playful, Devoted, Authentic, Confident"
                  className="luxury-input w-full px-4 py-2.5 text-xs font-bold"
                />
              </div>
            </div>

            {/* Brand Voice Rules & Companion Behavioral Directives */}
            <div className={cn('md:col-span-2 space-y-2 border-t border-white/10 pt-4', studioStep !== 2 && 'hidden')}>
              <label className="block text-xs font-bold text-[#F5F1E8] uppercase tracking-wider flex items-center gap-1.5">
                <Flame size={14} className="text-[#D9BA72]" />
                Brand Voice Rules & Companion Directives (Chat & Live Phone Call Behavior)
              </label>
              <p className="text-[11px] text-[#A1A1AA]">
                Custom instructions for how your persona talks, responds, roleplays, or flirts during AI text chat and live phone calls.
              </p>
              <textarea
                value={creatorVoiceRule}
                onChange={e => setCreatorVoiceRule(e.target.value)}
                placeholder="e.g. Deeply loyal, devoted, and open with her creator. Loves teasing, talking dirty, and fulfilling all romantic, adult, and creative desires in text and voice."
                rows={3}
                className="luxury-input w-full p-3.5 text-xs"
              />
            </div>

            {/* Content Boundaries */}
            <div className={cn('md:col-span-2 space-y-2', studioStep !== 2 && 'hidden')}>
              <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">Content Boundaries & Guidelines</label>
              <input
                type="text"
                value={contentBoundaries}
                onChange={e => setContentBoundaries(e.target.value)}
                placeholder="e.g. Uncensored 18+ adult roleplay allowed, stay in character at all times"
                className="luxury-input w-full px-4 py-2.5 text-xs"
              />
            </div>
          </div>
        </div>
        )}

        {/* ── GUIDED FLOW NAVIGATION ── */}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0B0B0E] p-3 shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D9BA72]">
              Step {studioStep + 1} of {STUDIO_STEPS.length}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-400">{STUDIO_STEPS[studioStep].description}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={() => goToStudioStep(studioStep - 1)}
              disabled={studioStep === 0}
              className="btn-gold-secondary px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-2 disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft size={15} />
              Back
            </button>

            {studioStep < STUDIO_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => goToStudioStep(studioStep + 1)}
                className="btn-gold-primary px-6 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                Continue
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn-gold-primary px-6 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin text-[#161108]" /> : <Check size={16} />}
                <span>{editingPersona ? 'Save Changes' : 'Publish Persona'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showHeyGenSignIn && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close creator sign-in"
              onClick={() => !isHeyGenSigningIn && !isHeyGenGoogleSigningIn && setShowHeyGenSignIn(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-default"
            />
            <motion.form
              onSubmit={handleHeyGenCreatorSignIn}
              role="dialog"
              aria-modal="true"
              aria-labelledby="heygen-sign-in-title"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#161618] p-5 sm:p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">
                    <Shield size={20} />
                  </div>
                  <h3 id="heygen-sign-in-title" className="text-lg font-bold text-white">Creator sign-in</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Sign in to your AI Influencer Studio creator account. Your HeyGen key remains protected on the server.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  disabled={isHeyGenSigningIn || isHeyGenGoogleSigningIn}
                  onClick={() => setShowHeyGenSignIn(false)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleHeyGenGoogleSignIn}
                disabled={isHeyGenSigningIn || isHeyGenGoogleSigningIn}
                className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-lg border border-white/15 bg-white px-4 py-3 text-sm font-bold text-[#171717] transition-all hover:bg-slate-100 disabled:cursor-wait disabled:opacity-70 cursor-pointer"
              >
                {isHeyGenGoogleSigningIn ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z" />
                    <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
                    <path fill="#FBBC05" d="M6.39 13.87A6.01 6.01 0 0 1 6.07 12c0-.65.11-1.28.32-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.62Z" />
                    <path fill="#EA4335" d="M12 6.01c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z" />
                  </svg>
                )}
                {isHeyGenGoogleSigningIn ? 'Opening Google...' : 'Continue with Google'}
              </button>

              <div className="my-5 flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">or continue with email</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Creator email</span>
                  <input
                    type="email"
                    value={heyGenSignInEmail}
                    onChange={(event) => setHeyGenSignInEmail(event.target.value)}
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    className="luxury-input w-full px-4 py-3 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Password</span>
                  <input
                    type="password"
                    value={heyGenSignInPassword}
                    onChange={(event) => setHeyGenSignInPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    className="luxury-input w-full px-4 py-3 text-sm"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={isHeyGenSigningIn || isHeyGenGoogleSigningIn}
                  onClick={() => setShowHeyGenSignIn(false)}
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isHeyGenSigningIn || isHeyGenGoogleSigningIn}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#E7C477] px-4 py-2.5 text-xs font-bold text-[#161618] transition-all hover:bg-[#F2D58D] disabled:cursor-wait disabled:opacity-70 cursor-pointer"
                >
                  {isHeyGenSigningIn ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                  {isHeyGenSigningIn ? 'Signing In...' : 'Sign In & Load Voices'}
                </button>
              </div>
            </motion.form>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
