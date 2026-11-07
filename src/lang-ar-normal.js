// How Arabic words are written for looking them up (src/lang-ar.js, src/lang-ar-nouns.js): without
// vowel marks or the stretching line, أ إ آ ٱ as ا, ة as ه and ى as ي (people type them either way),
// Arabic-Indic digits as 0-9.
export const normalArabic = (s) => String(s ?? '')
  .replace(/[ً-ٰٟـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/ى/g, 'ي')
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .trim();
