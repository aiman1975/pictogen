# Languages

PictoGen draws from words. Its pictures, colours, counts, feelings, actions, places and times are
known by English words; other languages are read into those words, and what people say or write on
a board stays in their own language.

| Part | English | German | Arabic | Spanish |
|---|---|---|---|---|
| Words in any alphabet (no word split at "ß" or "ü") | ✅ | ✅ | ✅ | ✅ |
| Letter figures | A-Z, 0-9 | + Ä Ö Ü ß | planned | planned (Ñ) |
| Explainers: outline words, card pictures | ✅ | ✅ | planned | planned |
| Notes → explainer | ✅ | ✅ | planned | planned |
| Scenes from a prompt | ✅ | ✅ (word bridge, plurals) | planned | planned |
| Diagram topics, letter modes ("K wie Katze", "zähle bis 5") | ✅ | ✅ | planned | planned |
| Stories (a cast kept across lines, names, pronouns) | ✅ | ✅ | planned | planned |
| The studio, landing page and help page in the language | ✅ | ✅ (EN / DE switch) | planned | planned |

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
  two spoken of, and a name is "er" or "sie" by the first name.

## The pages in German

`public/js/i18n-de.js` (about 1,150 texts of the studio, landing and help pages, plus 2,081 picture
names from the nouns' draft) was drafted with Gemini (`gemini-3.5-flash`, 2026-11-05) from the texts
the pages show (collected in a browser with `pictogenI18n.keysOf`), informal "du", tags kept; the
help page's example links open the same prompts in German, each checked to draw what the English
one draws. A native speaker should read it before a release: to change a word, change it in that
file. A text added to a page later shows in English until it is added there.

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
