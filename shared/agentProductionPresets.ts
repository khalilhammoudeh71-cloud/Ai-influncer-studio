import type { CustomShotPreset } from './agentCreatorProfile';

export const productionPresets = {
  clinical: {
    name: 'Clinical scene',
    rules: 'Use the active persona as Dr. H’s identity reference. Default to navy scrubs and loupes on his face. During treatment, show Dr. H wearing a mask. When a patient is being treated, show them reclined with a dental bib. Generate one image per shot, with no collage or grid.',
  },
  talking: {
    name: 'Talking head',
    rules: 'Use the active persona as Dr. H’s identity reference. Face the camera with direct eye contact and keep the loupes around his neck. Generate one image per shot, with no collage or grid.',
  },
} as const;

export const legacyDrHPresets: CustomShotPreset[] = Object.entries(productionPresets).map(([id, preset]) => ({
  id, ...preset, aspectRatio: '9:16',
}));
type Shot = { type: string; params: Record<string, any> };

export function isProductionShot(step: Shot) {
  return ['generate_image', 'generate_video', 'generate_talking_head'].includes(step.type)
    || (step.type === 'edit_image' && !['bg-remover', 'face-swap', 'virtual-tryon'].includes(step.params.editType));
}

export function setProductionPreset<T extends Shot>(step: T, id: string, presets: CustomShotPreset[] = legacyDrHPresets): T {
  const params = { ...step.params };
  const preset = presets.find(choice => choice.id === id);
  if (preset) {
    params.productionPreset = {
      id, name: preset.name, rules: preset.rules,
      aspectRatio: params.aspectRatio || preset.aspectRatio || '',
    };
  } else {
    delete params.productionPreset;
  }
  return { ...step, params };
}

export function suggestProductionPresets<T extends Shot>(steps: T[], presets: CustomShotPreset[] = legacyDrHPresets): T[] {
  return steps.map(step => {
    if (!isProductionShot(step)) return step;
    const prompt = String(step.params.prompt || '');
    const hint = step.params.productionPresetHint;
    const explicitPreset = presets.find(preset => preset.id === hint);
    if (explicitPreset && (step.params.usePersona !== false || !['clinical', 'talking'].includes(explicitPreset.id)))
      return setProductionPreset(step, explicitPreset.id, presets);
    if (step.params.usePersona === false) return step;
    if (presets.some(preset => preset.id === 'talking') && (step.type === 'generate_talking_head' || /\b(talking[ -]head|direct[ -]to[ -]camera|speaks directly to the camera)\b/i.test(prompt)))
      return setProductionPreset(step, 'talking', presets);
    if (presets.some(preset => preset.id === 'clinical') && /\b(dental (chair|operatory|treatment|procedure)|reclined patient|chairside)\b/i.test(prompt))
      return setProductionPreset(step, 'clinical', presets);
    return step;
  });
}

export function productionStepsForExecution<T extends Shot>(steps: T[], selectedVoice?: string | null): T[] {
  return steps.map(step => {
    if (!step.params.productionPreset || !isProductionShot(step)) return step;
    const { productionPreset, productionPresetHint: _hint, ...params } = step.params;
    if (step.type === 'generate_talking_head') {
      params.voiceId = (typeof params.voiceId === 'string' ? params.voiceId.trim() : '') || selectedVoice || undefined;
    } else {
      if (productionPreset.aspectRatio) params.aspectRatio = productionPreset.aspectRatio;
      const rules = typeof productionPreset.rules === 'string' ? productionPreset.rules.trim() : '';
      if (typeof params.prompt === 'string' && params.prompt.trim() && rules)
        params.prompt = `${params.prompt}\n\nProduction defaults (explicit shot instructions above take priority): ${rules}`;
      if (step.type === 'generate_image' && ['clinical', 'talking'].includes(productionPreset.id) && params.usePersona === undefined) params.usePersona = true;
    }
    return { ...step, params };
  });
}
