export const CALL_MODES = [
  { id: 'arabic', label: 'Arabic' },
  { id: 'english-arabic-accent', label: 'English · Arabic accent' },
  { id: 'english', label: 'English · natural accent' },
  { id: 'fr', label: 'French' }, { id: 'es', label: 'Spanish' },
  { id: 'de', label: 'German' }, { id: 'tr', label: 'Turkish' },
  { id: 'it', label: 'Italian' }, { id: 'pt', label: 'Portuguese' },
  { id: 'hi', label: 'Hindi' }, { id: 'ja', label: 'Japanese' }, { id: 'ko', label: 'Korean' },
] as const;
export const CALL_DIALECTS = [
  { id: 'levantine', label: 'Jordanian / Syrian', direction: 'Use urban Jordanian Arabic with light Syrian influence. Prefer everyday Levantine phrasing such as شو، كيفك، هلأ، بدك. In familiar colloquial words use the urban glottal-stop pronunciation of ق where appropriate; keep formal words and names accurate.' },
  { id: 'lebanese', label: 'Lebanese', direction: 'Use natural Lebanese Arabic with everyday Lebanese vocabulary and rhythm. Avoid mixing in Egyptian or Gulf expressions.' },
  { id: 'egyptian', label: 'Egyptian', direction: 'Use everyday Egyptian Arabic and its vocabulary and rhythm, such as إزيك، دلوقتي، عايز. Avoid mixing in Levantine or Gulf expressions.' },
  { id: 'gulf', label: 'Saudi / Gulf', direction: 'Use conversational Saudi/Gulf Arabic with natural local vocabulary. Avoid mixing in Egyptian or Levantine expressions.' },
  { id: 'msa', label: 'Modern Standard Arabic', direction: 'Use clear, relaxed Modern Standard Arabic. Keep grammar and pronunciation standard, without inserting regional dialect slang.' },
] as const;
export type CallPreferences = {
  mode: typeof CALL_MODES[number]['id'];
  dialect: typeof CALL_DIALECTS[number]['id'];
  allowLanguageSwitching: boolean;
  englishAccent?:'natural'|'american'|'british'|'australian'|'arabic';
};
export function normalizeCallPreferences(value?: unknown): CallPreferences {
  const input = value && typeof value === 'object' ? value as Partial<CallPreferences> : {};
  return {
    ...(['natural','american','british','australian','arabic'].includes(input.englishAccent||'')?{englishAccent:input.englishAccent}:{}),
    mode: CALL_MODES.some(mode => mode.id === input.mode) ? input.mode! : 'arabic',
    dialect: CALL_DIALECTS.some(dialect => dialect.id === input.dialect) ? input.dialect! : 'levantine',
    allowLanguageSwitching: typeof input.allowLanguageSwitching === 'boolean' ? input.allowLanguageSwitching : true,
  };
}
export function callLanguageInstructions(value: unknown): string {
  const preferences = normalizeCallPreferences(value);
  const dialect = CALL_DIALECTS.find(item => item.id === preferences.dialect)!;
  return [
    `Begin and primarily converse in ${callLanguageName(preferences)}.`,
    preferences.mode === 'english-arabic-accent'
      ? `For English speech, preserve the selected voice's natural Arabic accent with ${dialect.label} influence. Use standard English spelling and grammar; never fake an accent with misspellings or stereotyped substitutions. Accent fidelity comes from the selected voice; do not claim you changed its acoustic identity.`
      : 'Preserve the selected speaker identity and natural pronunciation.',
    `When speaking Arabic: ${dialect.direction}`,
    preferences.mode.startsWith('english')&&preferences.englishAccent&&preferences.englishAccent!=='natural'?`Begin with the requested ${preferences.englishAccent} English accent, within the selected voice's abilities. Do not change normal written spelling to mimic an accent.`:'',
    preferences.allowLanguageSwitching
      ? 'Support multiple languages. Switch language or accent when the caller explicitly requests it, and follow clear conversational language switches. Treat the selected language and Arabic dialect as starting preferences, not restrictions. Preserve a requested accent for the rest of the call until asked to change again. A name, borrowed word or short acknowledgement alone is not a request to switch. Keep the most recently requested Arabic dialect after switching back.'
      : 'Keep the selected conversation language; do not switch languages during this call. Pronounce names and brief borrowed terms naturally.',
    'Write Arabic speech in Arabic script, never transliterated Arabizi. Normalize numbers, times and abbreviations into natural spoken words in the active language. Do not translate every sentence twice. Ask briefly in the active language when speech is unclear; confirm uncertain names, dates and numbers instead of guessing.',
  ].join('\n');
}

export function callLanguageCode(value: CallPreferences): string {
  return value.mode === 'arabic' ? 'ar' : value.mode.startsWith('english') ? 'en' : value.mode;
}
export function callLanguageName(value: CallPreferences): string {
  return value.mode === 'arabic' ? 'Arabic' : value.mode.startsWith('english') ? 'English' : CALL_MODES.find(m=>m.id===value.mode)!.label;
}
export function withCallPreferences<T extends {personalitySettings?: any}>(persona:T,preferences:CallPreferences):T {
  return {...persona,callPreferences:preferences,personalitySettings:{...persona.personalitySettings,language:callLanguageCode(preferences),dialect:preferences.dialect==='levantine'?'jordanian-syrian':preferences.dialect}};
}
