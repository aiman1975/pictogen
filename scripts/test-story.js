import { composeStory, parseStoryText, generateStoryHtml, STORY_TEMPLATES } from '../src/index.js';

let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ FAIL: ${msg}`);
    fails++;
  } else {
    console.log(`✓ PASS: ${msg}`);
  }
}

// 1. Templates inspection
assert(STORY_TEMPLATES.length >= 3, `Has ${STORY_TEMPLATES.length} story presets`);
assert(STORY_TEMPLATES[0].scenes.length === 4, 'Puppy story has 4 scenes');

// 2. Story composition
const story1 = composeStory('puppy-friend', { style: 'flat', seed: 42 });
assert(story1.scenes.length === 4, `Composed 4 scenes (got ${story1.scenes.length})`);
assert(story1.scenes[0].svg.includes('<svg'), 'Scene 1 has valid SVG');
assert(story1.scenes[0].svg.includes('pgWalkLegL') || story1.scenes[0].svg.includes('pg-anim-walk'), 'Scene 1 has animation styles');
assert(story1.scenes[0].caption.length > 5, 'Scene 1 has narration caption');

// 3. Custom user multi-line story parsing
const customInput = `
Scene 1: a boy walking under the sun | A boy went for a walk on a sunny day.
Scene 2: a sad puppy near a tree | He met a lonely puppy.
Scene 3: a smiling boy with an apple | The boy shared his apple.
`;
const parsedScenes = parseStoryText(customInput);
assert(parsedScenes.length === 3, `Parsed 3 custom scenes (got ${parsedScenes.length})`);
assert(parsedScenes[0].caption === 'A boy went for a walk on a sunny day.', 'Parsed custom caption');

const customStory = composeStory(parsedScenes, { style: 'cartoon' });
assert(customStory.scenes.length === 3, 'Composed custom story');
assert(!/NaN|undefined|\[object/.test(customStory.scenes[0].svg), 'Custom story has clean SVG');

// 4. Standalone HTML Player generation
const html = generateStoryHtml(story1);
assert(html.includes('<!doctype html>'), 'Generated valid HTML player');
assert(html.includes('AudioContext'), 'HTML player has Web Audio sound generator');
assert(html.includes(STORY_TEMPLATES[0].scenes[0].caption), 'HTML player contains story captions');

// 5. User captions cannot break out of the exported player's <script> block
const hostile = composeStory('a boy | TAG | Head | hi </script><script>alert(1)</script>', {});
const hostileHtml = generateStoryHtml(hostile);
assert(!hostileHtml.includes('</script><script>alert(1)'), 'Exported HTML escapes "</script>" in captions');

console.log(`\nStory Engine test suite: ${fails === 0 ? 'ALL PASSED!' : `${fails} FAILS`}`);
process.exit(fails === 0 ? 0 : 1);
