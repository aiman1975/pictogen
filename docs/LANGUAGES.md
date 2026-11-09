# Languages

Toonaro draws from words. Its pictures, colours, counts, feelings, actions, places and times are
known by English words; other languages are read into those words, and what people say or write on
a board stays in their own language.

| Part | English | German | Arabic | Spanish |
|---|---|---|---|---|
| Words in any alphabet (no word split at "ß" or "ü") | ✅ | ✅ | ✅ | ✅ |
| Letter figures | A-Z, 0-9 | + Ä Ö Ü ß | ✅ 28 letters, ة ى ء أ إ آ ؤ ئ, ٠-٩; words right to left | planned (Ñ) |
| Explainers: outline words, card pictures | ✅ | ✅ | ✅ cards right to left | planned |
| Notes → explainer | ✅ | ✅ | ✅ | planned |
| Scenes from a prompt | ✅ | ✅ (word bridge, plurals) | ✅ (word bridge, duals) | planned |
| Diagram topics, letter modes ("K wie Katze", "zähle bis 5") | ✅ | ✅ | ✅ ("ب مثل بطة", "عد إلى ٥") | planned |
| Stories (a cast kept across lines, names, pronouns) | ✅ | ✅ | ✅ | planned |
| The studio, landing page and help page in the language | ✅ | ✅ (EN / DE switch) | ✅ right to left (AR) | planned |

## Where each language lives

- `src/lang.js`: a **pack** per language for reading text - filler words, step words, quote verbs,
  number units, abbreviations, picture words for explainer cards - and `detectLanguage`.
- `src/slides.js`: the outline's own words (`## Recap` / `## Zusammenfassung`, `Show:` / `Bild:`…),
  read in every language at once.
- `src/lang-de.js`: German scenes. `bridgeGerman` reads a German prompt word by word into the
  engine's English words ("ein roter Hund läuft im Park" → "a red dog walks in the park"): small
  words, verbs (with their forms), describing words (with their endings), numbers, places and times
  are written there by hand; nouns come from `src/lang-de-nouns.js`. A word with a capital is a noun
  first ("Junge" → boy, "junge" → young); a compound is read by its last part ("Kinderfahrrad" →
  bike); after a place or a time at the front, the verb goes back after who does it ("Nachts fliegt
  eine Rakete" → "night a rocket flies"); what is said („Hallo!“) is kept as it is.

- `public/js/i18n.js` and `public/js/i18n-de.js`: the pages in German. Every text a page shows -
  what it says, what panels add later, tooltips, placeholders, the example prompts - is looked up in
  the dictionary (`texts`: English as shown -> German; `patterns`: texts with names or numbers in
  them, "Szene 3"). A sentence with bold words or a link is looked up whole. What people write and
  the drawings are never translated. The language: the one picked with **EN / DE** in the header,
  else the browser's, remembered in this browser (`pictogen.lang.v1`). The first picture, the
  landing page's demo and the example chips are German prompts in German.

- German stories: `germanStory` (in `src/lang-de.js`) finds the story's names ("ein Mädchen namens
  Mia", "einen Hund, der Rex heißt", "Oma Rose", "Herr Braun", "rief Emma") and gives the story
  reader (`src/story-reader.js`, `translate`) each scene in the engine's English words, so a German
  story is read like an English one: a cast kept from scene to scene, "er", "sie" (she, they or her,
  by its verb) and "ihn" for the right one, places, times and the weather carried on, story openers
  ("Es war einmal", "Eines Morgens", "Am nächsten Tag"), the past tense and "hat … gefunden". The
  captions stay as written; "Not drawn" lists the German words left out. German "er", "sie" and
  "es" go by the noun's gender, as in German ("der Mond … er", "das Sternchen … es", "die Eule …
  sie"; the genders come with the drafted nouns), "sie" with a verb for more than one is the last
  two spoken of, and a name is "er" or "sie" by the first name. Also read: "fehlte" (missing: not
  drawn), "hüpfte auf den Rücken der Eule" (rides the owl), "ein leises Weinen" (a sound, not someone
  crying), "vorbei an …" (what goes by), and a German plural is the English plural only when that
  draws the same picture ("Häusern": house, not the "houses" icon).

## The pages in German

`public/js/i18n-de.js` (about 1,150 texts of the studio, landing and help pages, plus 2,081 picture
names from the nouns' draft) was drafted with Gemini (`gemini-3.5-flash`, 2026-11-05) from the texts
the pages show (collected in a browser with `pictogenI18n.keysOf`), informal "du", tags kept; the
help page's example links open the same prompts in German, each checked to draw what the English
one draws. A native speaker should read it before a release: to change a word, change it in that
file. A text added to a page later shows in English until it is added there.

## Arabic scenes

`bridgeArabic` (`src/lang-ar.js`) reads an Arabic prompt into the engine's English words ("فتاة
صغيرة تحمل بالونًا أحمر في الحديقة" → "small girl holds red balloon in the park"). A word is written
the way it is looked up (`src/lang-ar-normal.js`: no vowel marks, أ إ آ as ا, ة as ه, ى as ي, ٠-٩ as
0-9), looked up whole, then without the small words Arabic puts on its front (و، ف، ب، ل، ك، ال and
their pairs: "وبالبالون") and "his/her" on its end ("كلبها"; a word in ة takes ت: "قطتها"). Small
words, verbs (he/she, now and before, and the forms for two and more made from them), describing
words (with their feminine and plurals; colours listed: أحمر/حمراء), numbers, places and times, and
some first names (a girl or a boy) are written there by hand; nouns come from `src/lang-ar-nouns.js`
(about 4,250 forms for 920 pictures: singular, plural, the two of something - "كلبان" is two dogs -
drafted with Gemini by `scripts/lang/ar-nouns-draft.py`, built by `scripts/lang/ar-nouns-build.mjs`,
each English word checked to draw). Describing words come after their noun in Arabic and go before it;
a verb before who does it ("تمشي الفتاة") goes after them; a place is a place ("الشاطئ" is the beach,
not its picture); with "the" a word is a thing ("الكتب" are books, "كتب" he wrote). What is said
(«…») stays Arabic, in the bubble. Diagram topics in Arabic ("دورة الماء", "أجزاء النبات"…); in
letters mode "ب مثل بطة" (the letter on the right, the Arabic word on the banner) and "عد إلى ٥".
A native speaker should look over the words before a release.

## Arabic stories

`arabicStory` (`src/lang-ar.js`) gives the story reader each scene of an Arabic story in the engine's
English words, the way `germanStory` does for German, so its cast is kept from scene to scene. Names:
the first names the bridge knows, a word after "اسمها" / "اسمه" / "تدعى", or after "قالت" / "قال" when
it is no word the bridge knows; the reader gets them in Latin letters (سارة as Sara, so it knows her
for a girl) and the studio shows them in Arabic again. Arabic often leaves out who does something - the
verb says it: "ذهبت إلى الحديقة" (she went), "نام" (he slept) - so the one of that gender who last did
something is put back in (after "رأت قطة", "قالت" is still the girl, not the cat she saw); "هو", "هي"
stand for the last one of their gender (a noun's gender comes with the drafted nouns, or from its ة),
"هم" / "هما" for the last two spoken of. Someone right after the verb does it: "قال القمر:", "جاءت بومة
صغيرة" (with a verb that takes nobody, someone not named before too). Also read: "مفقودة" / "ضائعة"
(missing: not drawn), "لاحظ" / "رأى" (sees: not where the story goes), «…» quotes as speech, and a
subtitle line under the title ("قصة قصيرة للأطفال…") left out. The captions stay as written.

## Arabic explainers

The Arabic pack (`src/lang.js`, `ar`, marked `rtl`) has Arabic filler and step words (أولًا، ثم،
بعد ذلك، أخيرًا), quote verbs (قال، قالت، بحسب), number units (٪، مليون، سنوات…) with Arabic-Indic
digits, and picture words matched inside words (Arabic adds ال، و، ب، ل in front: "بالمال" is money).
Outline words: `## الخلاصة` (recap), `صورة:` (picture), `مشهد:` (scene), `## سؤال:` (quiz),
`## A مقابل B` (compare), `## كيف…` / `خطوات` (steps), `## ٧٪ سنويًا` (a big number). An Arabic
card is laid out right to left (`renderSlide`): the whole card mirrored - the headline and points from
the right, the picture on the left, steps numbered from the right, the bar filling from the right -
with every line of words turned back and set right to left, and the pictures keeping their own way
round (a chart going up still goes up); quiz answers are أ ب ج د. Notes → explainer reads Arabic notes
by these rules: sentences end at . ! ؟, clauses at ، and ؛, headings need no capitals (Arabic has
none), and a short question over some text ("ماذا تفعل؟") is a heading.

## The Arabic letters

The Arabic letter figures (`letter_ar_alif` … `letter_ar_ya`, the forms with a hamza, ta marbuta,
alif maqsura; `number_ar_0` … `number_ar_9`) take their shapes from the **Baloo Bhaijaan 2** font
(Ek Type, SIL OFL 1.1 - round and friendly, like Nunito): `scripts/lang/ar-letters-build.py` draws
each letter's isolated form at its boldest weight into a letter figure's body, stands its strokes on
the legs (dots under it hang between the feet) and puts the face where the letter is thickest, toward
its middle and never on a dot (`src/concepts/arabic-letters-data.js`). They have the Letterlings'
faces, arms, legs and moves; "the letter ba", "ب" or "the letter alif waves" draw them. An Arabic
word in letters mode is spelled right to left (its first letter on the right), its vowel marks left
out, and shown joined up as it is written; Arabic-Indic numbers go left to right, as they are read.
The font's Arabic part (`public/fonts/baloo-bhaijaan-arabic.woff2`) is the pages' font for Arabic
text, offline, and goes into videos, clips and worksheets with Nunito.

## The pages in Arabic

`public/js/i18n-ar.js` (the same 1,150 page texts, drafted with Gemini in Modern Standard Arabic with
Arabic example prompts - each checked to draw what the English one does - and 2,119 picture names
from the Arabic nouns) is chosen with **AR** in the switch or by an Arabic browser. An Arabic page is
laid out right to left (`dir="rtl"`, set before the page is first shown, so nothing jumps): the
studio's side panel on the right, rows and fields from the right, spacing written as logical
properties (`margin-inline-start`…). The drawings (every `svg`), the picture's own area and the
timeline stay left to right: the engine lays out their words itself, and the timeline runs by time.
The pages' Arabic font is Baloo Bhaijaan 2. On a phone "All pictures" is just its icon, so the three
languages fit.

## The German nouns

`src/lang-de-nouns.js` (3,600 word forms for about 930 pictures, and which forms are plural:
"Hunde" draws dogs, "den Kindern" children, "den Jungen" one boy) was drafted with Gemini
(`gemini-3.5-flash`, 2026-11-05) from each picture's English names - singular, plural and gender -
with `scripts/lang/de-nouns-draft.py`, then built with `scripts/lang/de-nouns-build.mjs`: plural
and case endings added, one picture chosen per word (the one drawn in the engine's own style, else
the plain one, not "man_…"/"woman_…"), and every English word checked to draw. A native speaker
should look over it before a release; to fix a word, change the hand-written lists in
`src/lang-de.js` (they come first) or the nouns file.

## Adding a language

1. Its letters, if it has letters of its own (`src/concepts/alphabet.js`).
2. A pack in `src/lang.js` (copy the German one) and its outline words in `src/slides.js`.
3. Its scene words: a `src/lang-xx.js` like the German one, its nouns drafted and checked the same way.
4. Its page texts: a `public/js/i18n-xx.js` like the German one, added to `LANGS` in
   `public/js/i18n.js`.
5. Tests in `scripts/test-story.js` and `scripts/test-studio.js`, as for German.
