/** An explicit short "say this" request is an audition, not scene acting. */
export function requestedArabicPracticePhrase(value: string): string | undefined {
 const match=value.trim().match(/^(?:احكي|قولي|قول|قُل|كرري|كرر|عيدي|عيد|رددي|ردد)\s+(.+)$/u);
 if(!match) return undefined;
 const phrase=match[1].trim();
 if(/^(?:عن|شو|ايش|كيف|ليش|ماذا|لي|إلي|الي|معي)(?:\s|$)/u.test(phrase) || /(?:مش|مو|بدل|يعني)\s/u.test(phrase) || phrase.split(/\s+/).length>12) return undefined;
 return phrase;
}
