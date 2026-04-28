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
  mediaType?: 'image' | 'video';
};

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
