export type GeneratedImage = {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  environment?: string;
  outfit?: string;
  framing?: string;
  isFavorite?: boolean;
  model?: string;
  mediaType?: 'image' | 'video' | '3d';
};

export type WardrobeCategory = 'haute_couture' | 'lingerie' | 'streetwear' | 'swimwear' | 'luxury_evening' | 'fitness' | 'casual';

export interface WardrobeItem {
  id: string;
  name: string;
  category: WardrobeCategory;
  promptDescription: string;
  thumbnail?: string;
  colorTheme?: string;
  tags?: string[];
  isCustom?: boolean;
}

export type RelationshipMood = 'playful' | 'seductive' | 'inspired' | 'teasing' | 'loving' | 'thoughtful';
export type RelationshipStage = 'acquaintance' | 'partner' | 'confidante' | 'soulmate';

export interface RelationshipState {
  affinityScore: number; // 0 to 100
  stage: RelationshipStage;
  currentMood: RelationshipMood;
  totalInteractions: number;
  unlockedPerks: string[];
  lastInteractionDate?: string;
}

export type Persona = {
  id: string;
  name: string;
  niche: string;
  tone: string;
  platform: string;
  status: string;
  avatar: string;
  referenceImage?: string; // Base64 or local blob URL
  additionalReferenceImages?: string[]; // Extra reference images uploaded alongside the primary
  alternateReferenceImage?: string; // Secondary reference (style, outfit, pose, etc.)
  personalityTraits: string[];
  visualStyle: string;
  audienceType: string;
  contentBoundaries: string;
  bio: string;
  brandVoiceRules: string;
  contentGoals: string;
  personaNotes: string;
  faceDescriptor?: string;
  naturalLook?: boolean;
  identityLock?: boolean;
  visualLibrary?: GeneratedImage[];
  voiceId?: string;
  voiceEngine?: string;
  companionType?: string;
  voiceSampleUrl?: string;
  heygenAvatarId?: string;
  clientId?: string;
  audioSamples?: any[];
  voicePrompt?: string;
  voiceLikeness?: number;
  voiceStability?: number;
  voiceStyleExaggeration?: number;
  voiceSpeakingSpeed?: number;
  wardrobe?: WardrobeItem[];
  activeOutfitId?: string;
  relationshipState?: RelationshipState;
};

export type PlannedPost = {
  day: number;
  type: string;
  hook: string;
  angle: string;
  cta: string;
};

export type RevenueEntry = {
  id: string;
  date: string;
  amount: number;
  source: string;
  platform: string;
  personaId: string;
  notes: string;
};

export type Tab = 'personas' | 'create' | 'create-persona' | 'gallery' | 'assistant' | 'settings' | 'intelligence' | 'revenue' | 'planner' | 'agent' | 'trends';

export interface NavEntry {
  view: Tab | 'persona-builder';
  subView?: string;
  params?: any;
  label?: string;
}

export interface NavActions {
  push: (entry: NavEntry) => void;
  pop: () => void;
  replace: (entry: NavEntry) => void;
}

export interface CreatorProfile {
  name: string;
  role: string;
  appearance: string;
  bio: string;
  gender?: string;
  photos: string[];
  primaryPhoto?: string;
  customDynamic?: string;
}
