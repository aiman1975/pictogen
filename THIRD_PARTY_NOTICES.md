# Third-Party Notices

Toonaro itself is MIT-licensed (see `LICENSE`). It bundles the following third-party material.

## Fluent Emoji (Flat) — `src/data/fluent-emoji-flat.json`

The ~3,170 library icons are Microsoft's Fluent Emoji (flat style), packaged as JSON in the
[Iconify](https://github.com/iconify/icon-sets) format. Source: https://github.com/microsoft/fluentui-emoji

SVG files generated from these icons (icon sheets, scenes, exports) contain this artwork, so
products that redistribute the icons should carry this notice.

```
MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE
```

## Baloo Bhaijaan 2 — `public/fonts/baloo-bhaijaan-arabic.woff2`, the Arabic letter figures

Copyright 2019 The Baloo 2 Project Authors (https://github.com/EkType/Baloo2).
Licensed under the SIL Open Font License 1.1 — full text in `public/fonts/OFL-BalooBhaijaan2.txt`.
The studio's font for Arabic text (its Arabic subset, self-hosted), and the shapes of the Arabic
letter and digit figures, drawn from its outlines (`src/concepts/arabic-letters-data.js`, made by
`scripts/lang/ar-letters-build.py`). The font itself is not sold on its own.

## Nunito — `public/fonts/nunito-*.woff2`

Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito).
Licensed under the SIL Open Font License 1.1 — full text in `public/fonts/OFL-Nunito.txt`.
Also embedded (base64) in exported clip HTML files.

## JetBrains Mono — `public/fonts/jetbrains-mono-*.woff2`

Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono).
Licensed under the SIL Open Font License 1.1 — full text in `public/fonts/OFL-JetBrainsMono.txt`.
Also embedded (base64) in exported clip HTML files.

## Kenney Interface Sounds — `public/audio/pack/effects/`

Short interface sounds by Kenney (https://kenney.nl/assets/interface-sounds), version 1.0,
obtained from the Godot packaging at https://github.com/Calinou/kenney-interface-sounds. Trimmed,
levelled and converted to MP3 on import; each file's original name is in
`public/audio/pack/manifest.json`. License: Creative Commons Zero (CC0 1.0), public domain: no
attribution required; credited here as a courtesy. License text:
`public/audio/pack/licenses/kenney-interface-sounds.txt`.

## Kenney audio packs — `public/audio/pack/effects/`

Footsteps, impacts, doors, pages, coins, dice, clicks, ticks, chimes and short musical jingles from
Kenney's free audio packs (https://kenney.nl/assets), downloaded from kenney.nl on 2026-11-05:
**RPG Audio** (footsteps, a door, book pages, coins), **Impact Sounds** (footsteps on grass, concrete,
wood, carpet and snow; soft thuds; metal and glass crashes), **Sci-fi Sounds** (booms), **Casino
Audio** (dice), **Interface Sounds** (a tick, chimes), **UI Audio** (clicks) and **Music Jingles**
(triumphant, sad, tense and mysterious flourishes). Trimmed, levelled and converted to MP3 on import;
each file's pack is in `public/audio/pack/manifest.json`. License: Creative Commons Zero (CC0 1.0),
public domain: commercial use allowed, no attribution required; credited here as a courtesy. License
texts: `public/audio/pack/licenses/kenney-*.txt`.

## WordNet — `src/data/nearest-en.js` (and the German and Arabic lists built on it)

Which picture draws a noun Toonaro has no picture of (*a poodle* is a dog, *a schooner* a
sailboat) was worked out from WordNet's noun hierarchy by `scripts/lang/nearest-build.mjs`; the
result, a list of words per picture, is in the repository, WordNet itself is not. The German and
Arabic words for them (`src/data/nearest-de.js`, `src/data/nearest-ar.js`) are Toonaro's own.

WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved.

Permission to use, copy, modify and distribute this software and database and its documentation
for any purpose and without fee or royalty is hereby granted, provided that you agree to comply
with the following copyright notice and statements, including the disclaimer, and that the same
appear on ALL copies of the software, database and documentation, including modifications that you
make for internal use or for distribution.

THIS SOFTWARE AND DATABASE IS PROVIDED "AS IS" AND PRINCETON UNIVERSITY MAKES NO REPRESENTATIONS OR
WARRANTIES, EXPRESS OR IMPLIED. BY WAY OF EXAMPLE, BUT NOT LIMITATION, PRINCETON UNIVERSITY MAKES NO
REPRESENTATIONS OR WARRANTIES OF MERCHANTABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE
USE OF THE LICENSED SOFTWARE, DATABASE OR DOCUMENTATION WILL NOT INFRINGE ANY THIRD PARTY PATENTS,
COPYRIGHTS, TRADEMARKS OR OTHER RIGHTS.

The name of Princeton University or Princeton may not be used in advertising or publicity
pertaining to distribution of the software and/or database. Title to copyright in this software,
database and any associated documentation shall at all times remain with Princeton University and
LICENSEE agrees to preserve same. (From the copy in the npm package `wordnet-db` 3.1.14.)

