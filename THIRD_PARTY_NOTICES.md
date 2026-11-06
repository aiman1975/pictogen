# Third-Party Notices

PictoGen itself is MIT-licensed (see `LICENSE`). It bundles the following third-party material.

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
