export const creatorProfileFields = [
  { key: 'brief', label: 'Creator brief', placeholder: 'I make beginner fitness reels for busy parents. I film alone and want people to save them.' },
  { key: 'audience', label: 'Audience', placeholder: 'Who is this for?' },
  { key: 'goal', label: 'Goal', placeholder: 'Shares, saves, leads, or another outcome' },
  { key: 'tone', label: 'Tone', placeholder: 'Warm, deadpan, practical…' },
  { key: 'examples', label: 'Examples', placeholder: 'Formats, posts, or ideas that fit' },
  { key: 'limits', label: 'Production limits', placeholder: 'Time, budget, setup, or tools you can use' },
] as const;

export type CreatorProfile = Partial<Record<typeof creatorProfileFields[number]['key'], string>>;

export type CustomShotPreset = { id: string; name: string; rules: string; aspectRatio?: string };
export const shotAspectRatios = ['9:16', '1:1', '16:9', '4:5', '3:4', '2:3', '3:2'] as const;
export const maxShotPresets = 12;

export function readCreatorProfile(value: unknown): CreatorProfile {
  if (!value || typeof value !== 'object') return {};
  const input = value as Record<string, unknown>;
  return Object.fromEntries(creatorProfileFields.flatMap(({ key }) => {
    const text = typeof input[key] === 'string' ? input[key].trim().slice(0, 1200) : '';
    return text ? [[key, text]] : [];
  }));
}

export function readShotPresets(value: unknown): CustomShotPreset[] {
  if (!Array.isArray(value)) return [];
  const presets: CustomShotPreset[] = [];
  for (const item of value.slice(0, maxShotPresets)) {
    const id = typeof item?.id === 'string' ? item.id : '';
    const name = typeof item?.name === 'string' ? item.name.trim().slice(0, 64) : '';
    const rules = typeof item?.rules === 'string' ? item.rules.trim().slice(0, 2000) : '';
    if (!/^[a-z0-9_-]{1,60}$/.test(id) || !name || !rules || presets.some(preset => preset.id === id)) continue;
    const aspectRatio = shotAspectRatios.find(ratio => ratio === item.aspectRatio);
    presets.push({ id, name, rules, ...(aspectRatio ? { aspectRatio } : {}) });
  }
  return presets;
}

export function readSavedCreatorProject(raw: string | null) {
  try {
    const data = JSON.parse(raw || '{}');
    return { profile: readCreatorProfile(data?.profile), presets: readShotPresets(data?.presets) };
  } catch {
    return { profile: {}, presets: [] };
  }
}
