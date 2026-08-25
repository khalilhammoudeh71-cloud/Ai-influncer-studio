export type CreationKind =
  | 'image'
  | 'video'
  | 'talking-avatar'
  | 'enhance'
  | 'toolbox'
  | 'planner'
  | 'persona';

export type CreationOutcome =
  | 'quality'
  | 'realistic'
  | 'artistic'
  | 'fast'
  | 'social'
  | 'identity'
  | 'adult'
  | 'cinematic';

export interface CreationBrief {
  kind: CreationKind;
  prompt: string;
  outcome?: CreationOutcome;
  aspectRatio?: string;
  requestedModel?: string;
  initialTool?: string;
  title: string;
  description: string;
}
