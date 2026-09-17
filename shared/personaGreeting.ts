import { normalizeLanguage, type LanguageProfile } from './personaLanguage';
import { callLanguageCode } from './voiceCallPreferences';
function greetingLanguage(profile: LanguageProfile): string {
 return profile.callPreferences ? callLanguageCode(profile.callPreferences) : normalizeLanguage(profile).language;
}
export function greetingFallback(profile: LanguageProfile, continuation = false): string {
 const language = greetingLanguage(profile);
 if (language === 'ar') return continuation ? 'أهلاً، رجعنا. وين كنا؟' : 'أهلاً، كيفك؟';
 const greetings: Record<string,string> = {fr:'Salut, comment ça va ?',es:'Hola, ¿cómo estás?',de:'Hallo, wie geht es dir?',tr:'Merhaba, nasılsın?',it:'Ciao, come stai?',pt:'Olá, como você está?',hi:'नमस्ते, कैसे हो?',ja:'こんにちは、元気ですか？',ko:'안녕하세요, 잘 지내세요?'};
 return greetings[language] || (continuation ? 'Hey—where were we?' : 'Hey, how are you?');
}
/** Never speak an English provider opening when the selected call starts in Arabic. */
export function enforceGreetingLanguage(value: unknown, profile: LanguageProfile, continuation = false): string {
 const text = typeof value === 'string' ? value.trim() : '';
 if (!text || (greetingLanguage(profile) === 'ar' && !/[\u0621-\u064a]/u.test(text))) return greetingFallback(profile,continuation);
 return text;
}
