# License Audit

Status of everything PictoGen ships, as of October 2026. Re-check this list whenever an asset,
font, data file or dependency is added.

| Component | Where | License | Commercial use | Obligations | Status |
|---|---|---|---|---|---|
| PictoGen code and hand-drawn concepts | `src/`, `cli.js`, `serve.js`, `public/*.html` | MIT (`LICENSE`) | Yes | Keep the copyright notice | ✅ |
| npm dependencies | `package.json` | none: zero dependencies | n/a | n/a | ✅ |
| Fluent Emoji Flat (~3,170 icons) | `src/data/fluent-emoji-flat.json` | MIT, © Microsoft | Yes | Ship the MIT notice with the product (`THIRD_PARTY_NOTICES.md`) | ✅ notice added |
| Nunito font | `public/fonts/`, embedded in exported clips | SIL OFL 1.1 | Yes | Ship `OFL-Nunito.txt`; can't sell the font on its own | ✅ self-hosted |
| JetBrains Mono font | `public/fonts/`, embedded in exported clips | SIL OFL 1.1 | Yes | Ship `OFL-JetBrainsMono.txt` | ✅ self-hosted |
| Scene sound: voices and effects | `src/sound.js`, `src/sound-synth.js` | MIT (`LICENSE`): synthesized in code, no recordings or samples | Yes | none beyond PictoGen's own | ✅ |
| Kenney Interface Sounds 1.0 (23 effects: pop, jingle, ding, twinkle, blip, whoosh, whirl, plop, boing, bubble, blub) | `public/audio/pack/effects/` | CC0 1.0 (`public/audio/pack/licenses/kenney-interface-sounds.txt`) | Yes | None (credited in `THIRD_PARTY_NOTICES.md` as a courtesy) | ✅ |
| Sound pack (recorded / generated audio) | `public/audio/pack/` | Per file, recorded in `manifest.json` (source, license, date) | Only files whose license allows it | Keep the generator's terms and the prompt for each file | ✅ checked by `npm run sound-pack -- check` and `npm test`; ten tunes made with Lyria 3 (see 8) |
| Sea animals (octopus, sea turtle, seahorse, crab, whale, starfish) | `src/concepts/sea.js` | MIT (`LICENSE`): drawn in code | Yes | none beyond PictoGen's own | ✅ see below (7) |
| Fantasy friends (unicorn, monster, ghost; knight, mermaid, genie costumes) | `src/concepts/fantasy.js`, `src/concepts/characters.js` | MIT (`LICENSE`): drawn in code | Yes | none beyond PictoGen's own | ✅ see below (7) |
| Showcase narration audio | `public/audio/showcase-*.wav` | Recorded with the Windows "Microsoft Zira" desktop voice | **Unclear** | See below | ⚠️ decide before release |

## Findings and what was done

1. **No LICENSE file.** `package.json` declared MIT, but the repository had no license text,
   which leaves reuse rights legally unclear. Added `LICENSE` (MIT).
2. **Fluent Emoji notice missing.** The emoji are MIT, which allows commercial use, but the
   license requires its copyright notice to travel with "all copies or substantial portions".
   Added `THIRD_PARTY_NOTICES.md`. A product should show it on an About/Licenses screen
   too, and exported icon packs (`cli.js --export-all`) should include it.
3. **Fonts loaded from Google's CDN.** The studio, the showcase and every exported clip pulled
   Nunito and JetBrains Mono from `fonts.googleapis.com`. That broke the "100% offline" claim,
   and in the EU it sends each visitor's IP address to Google without consent (LG München,
   3 O 17493/20, January 2022). Both fonts are OFL-1.1, which allows bundling, so they are now
   self-hosted in `public/fonts/` and inlined into exported clips.
4. **Narration WAVs made with a Windows desktop voice.** Microsoft's Windows license doesn't
   clearly grant rights to redistribute speech recorded from the built-in SAPI voices in a
   commercial product; Microsoft licenses commercial text-to-speech through Azure AI Speech.
   Options: leave the WAVs out of a commercial build (the showcase already falls back to the
   browser's speech synthesis), re-record with a human voice or a voice whose license explicitly
   allows commercial output, or license Azure TTS. **Not changed. This is a product decision.**

5. **Scene sound needs no third-party audio.** Voices ("ooh", "a-ha!", "hmm", giggles, a babble
   that follows the lip-sync), animal calls and effects are generated at playback time from
   oscillators, noise and filters (`src/sound-synth.js`). No sample library, so nothing to
   license or credit.
6. **Sound pack for better quality.** Recorded or AI-generated files can replace any synthesized
   sound and give each clip genre its music (`public/audio/pack/`, `docs/SOUND_PACK.md`). Each
   file must be added with `npm run sound-pack -- add ... --source ... --license ...`; a file in
   the folder without a source and license on record fails `npm test`. For AI-generated audio:
   use only tools and plans that grant commercial use (free tiers usually don't; Meta's
   MusicGen/AudioGen weights are non-commercial), keep the terms of the day and the prompt, and
   note that purely AI-made sound is generally not protected by copyright in the US or EU (usable,
   but not exclusively ours). No imitation of real people's voices or of named artists. CC0
   files need no notice; anything else that requires attribution goes in `THIRD_PARTY_NOTICES.md`.

7. **Figures drawn from AI reference pictures.** The sea animals were drawn by hand in code
   (shapes, joints and motions written in `src/concepts/sea.js`) after looking at reference
   pictures made once with Gemini (`gemini-3.1-flash-image`, Gemini API paid tier, 2026-11-03;
   prompts: "a cute sea turtle / seahorse / red crab / blue whale / orange starfish / cartoon
   octopus ... flat vector style, plain white background"). The pictures themselves are not part
   of the product or the repository. Keep a copy of the Gemini API terms of that day with the
   product's records. The same was done for the fantasy friends (unicorn, friendly monster, ghost,
   knight, mermaid, genie; 2026-11-03). Where a reference looked like a well-known film character
   (a red-haired mermaid in a purple top, a blue genie), the drawing was given colours of its own.
8. **Music made with Lyria 3.** The ten tunes in `public/audio/pack/music/` were generated with
   `lyria-3-clip-preview` through the Gemini API on its paid tier (2026-11-03), from the prompts
   in `docs/SOUND_PACK.md`, instrumental only, no artist or song named. Each file is on record in
   `manifest.json` with its source and terms. Before selling: keep a copy of the Gemini API terms
   of that day, confirm they allow commercial use of the output, and remember that AI-made music
   is generally not protected by copyright (usable, but not exclusively ours).
9. **Voice reactions made with Gemini TTS.** "Ooh", "a-ha", "hmm", "hmph", "aww", a giggle, "yay"
   and "hey" in a child's, a woman's and a man's voice (36 clips in `public/audio/pack/voices/`) were
   generated with `gemini-3.8-flash-tts` and its prebuilt synthetic voices (2026-11-03, paid
   tier); the children's clips are a young voice raised in pitch. No real person's voice was
   imitated. Each clip was checked for length and by listening (`gemini-3.5-flash`) before it was
   added; source and terms are on record in `manifest.json`. Same caveats as (8).

## Rules for new material

- Prefer MIT, BSD, Apache-2.0, ISC, CC0, CC-BY, or OFL (for fonts). Add each one to
  `THIRD_PARTY_NOTICES.md` in the same change that adds it.
- Avoid GPL/AGPL code in anything that ships (copyleft would apply to PictoGen itself), and
  avoid CC-BY-NC / CC-BY-ND or "free for personal use" assets (no commercial use, or no edits).
- Don't use assets from a CDN at runtime. Bundle them so the product stays offline and doesn't
  share visitor data.
- Generated output (SVGs, clips) belongs to the user, but it contains Fluent Emoji artwork
  when library icons are used, so the MIT notice applies to redistributed icon packs.
