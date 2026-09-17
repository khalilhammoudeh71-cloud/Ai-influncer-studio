import { normalizeCallPreferences, type CallPreferences } from './voiceCallPreferences';

const languages: [RegExp, CallPreferences['mode']][] = [
  [/(?:arabic|العربي(?:ة)?|عربي)/iu,'arabic'], [/(?:english|الانجليزي(?:ة)?|الإنجليزي(?:ة)?|انجليزي)/iu,'english'],
  [/(?:french|الفرنسي(?:ة)?|فرنسي)/iu,'fr'], [/(?:spanish|الإسباني(?:ة)?|الاسباني(?:ة)?|اسباني)/iu,'es'],
  [/(?:german|الألماني(?:ة)?|الالماني(?:ة)?|الماني)/iu,'de'], [/(?:turkish|التركي(?:ة)?|تركي)/iu,'tr'],
  [/(?:italian|الإيطالي(?:ة)?|الايطالي(?:ة)?|ايطالي)/iu,'it'], [/(?:portuguese|البرتغالي(?:ة)?)/iu,'pt'],
  [/(?:hindi|الهندي(?:ة)?)/iu,'hi'], [/(?:japanese|الياباني(?:ة)?)/iu,'ja'], [/(?:korean|الكوري(?:ة)?)/iu,'ko'],
];
const dialects: [RegExp, CallPreferences['dialect']][] = [
  [/(?:jordanian.{0,12}syrian|أردني.{0,12}سوري|اردني.{0,12}سوري|levantine|شامي)/iu,'levantine'], [/(?:jordanian|أردني|اردني)/iu,'jordanian'], [/(?:syrian|سوري)/iu,'syrian'], [/(?:lebanese|لبناني)/iu,'lebanese'],
  [/(?:egyptian|مصري)/iu,'egyptian'], [/(?:saudi|gulf|سعودي|خليجي)/iu,'gulf'], [/(?:standard arabic|فصحى)/iu,'msa'],
];
/** Explicit requests change this call's delivery; casual mentions never change defaults. */
export function requestedCallLanguage(text:string,current:CallPreferences):CallPreferences|undefined {
  if(!current.allowLanguageSwitching)return;
  const request=text.trim().replace(/[.!؟?]+$/u,'');
  if(!/^(?:(?:please|can you|could you|would you|i want you to|can we|let[’']s)\s+)?(?:speak|talk|switch|use)\b|^(?:(?:ممكن|لو سمحتي?|بدي إياكي?|بدي اياكي?)\s+)?(?:احكي|إحكي|تحكي|تكلمي|اتكلمي|تتكلمي|تحدثي|احكِ|غيري|غيّري)/iu.test(request))return;
  // Avoid changing state from quoted examples or reported speech.
  if(/["“”«»]/u.test(request)||request.length>180)return;
  const mode=languages.find(([pattern])=>pattern.test(request))?.[1];
  const dialect=dialects.find(([pattern])=>pattern.test(request))?.[1];
  const englishAccent=/british/iu.test(request)?'british':/american/iu.test(request)?'american':/australian/iu.test(request)?'australian':undefined;
  if(!mode&&!dialect&&!englishAccent)return;
  return normalizeCallPreferences({...current,...(englishAccent?{englishAccent}:{}),mode:mode||(dialect?'arabic':englishAccent?'english':current.mode),dialect:dialect||current.dialect});
}
