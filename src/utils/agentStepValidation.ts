const SUPPORTED_AGENT_STEP_TYPES = new Set([
  'create_persona',
  'generate_content_plan',
  'generate_image',
  'generate_video',
  'generate_3d',
  'generate_voice',
  'generate_talking_head',
  'stitch_video',
  'clone_voice',
  'storyboard_sequence',
  'edit_image',
  'log_revenue',
]);

export interface NormalizedAgentStep {
  type: string;
  params: Record<string, any>;
  status: 'pending';
}

export function normalizeAgentSteps(value: unknown): NormalizedAgentStep[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 20).flatMap((step): NormalizedAgentStep[] => {
    if (!step || typeof step !== 'object') return [];
    const candidate = step as Record<string, unknown>;
    const type = typeof candidate.type === 'string' ? candidate.type.trim() : '';
    if (!SUPPORTED_AGENT_STEP_TYPES.has(type)) return [];
    const params = candidate.params && typeof candidate.params === 'object' && !Array.isArray(candidate.params)
      ? candidate.params as Record<string, any>
      : {};
    return [{ type, params, status: 'pending' }];
  });
}

