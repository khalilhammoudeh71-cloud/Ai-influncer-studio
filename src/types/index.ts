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
