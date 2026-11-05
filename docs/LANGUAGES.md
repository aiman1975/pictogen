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
| Scenes from a prompt | ✅ | ✅ (word bridge) | planned | planned |
| Stories (a cast kept across lines) | ✅ | a scene per line | planned | planned |
| The studio's own words | ✅ | planned | planned | planned |

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

## The German nouns

`src/lang-de-nouns.js` (3,600 word forms for about 930 pictures) was drafted with Gemini
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
4. Tests in `scripts/test-story.js`, as for German.
