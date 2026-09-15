export interface RepairProposal {
  action: 'revise' | 'retry' | 'review';
  reason: string;
  proposedPrompt: string | null;
  model?: string;
  provider?: string;
  remainingPrompts?:{index:number;prompt:string}[];
}

export interface RecoveryDetail {
  index: number;
  error: string | null;
  advice: { kind: string; retry: boolean; message: string };
  prompt: string;
  version: string;
  quality?:{status:string;summary?:string};
  resultUrl?:string;
  remainingSteps?:{index:number;prompt:string;type:string}[];
}
