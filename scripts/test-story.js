import { composeStory, parseStoryText, generateStoryHtml, STORY_TEMPLATES, readStory } from '../src/index.js';

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

// 6. The story reader: a story in the writer's own words, read as a whole
{
  const MIA = `Once upon a time, there was a little girl called Mia who lived near a big forest.
One morning, she found a small puppy crying under a tree.
She gave him some milk and he wagged his tail.
They became best friends and played in the park every day.
At night, Mia hugged the puppy and fell asleep.`;
  const r = readStory(MIA);
  const mia = r.cast.find((c) => c.name === 'Mia');
  assert(r.scenes.length === 5 && r.scenes.every((sc, i) => sc.caption === MIA.split('\n')[i]), 'one scene per line, each keeping the writer\'s words as its caption');
  assert(mia?.id === 'girl' && r.individuals.some((ind) => ind.key === mia.key && ind.base === 'girl' && ind.look?.seed), '"a little girl called Mia": a character with a look of her own');
  const p = r.scenes.map((sc) => sc.prompt);
  assert(p[1].startsWith(`${mia.key} looks at a small puppy`) && p[2].startsWith(`${mia.key} holds milk and looks at the puppy and the puppy wags`),
    `"she found a puppy", "she gave him some milk and he wagged": she is Mia, he is the puppy (${p[2]})`);
  assert(p[3].startsWith(`${mia.key} and the puppy smile at each other and jump`), `"they became best friends and played": Mia and the puppy (${p[3]})`);
  assert(/in the forest$/.test(p[1]) && /in the park$/.test(p[4]) && /^At night/.test(p[4]), 'where it happens carries on (the forest, then the park) and night comes when the story says');
  const clip = composeStory(MIA, { style: 'cartoon' });
  assert(clip.title === 'My Story' && clip.scenes.length === 5 && clip.scenes.every((sc) => sc.svg.includes(`data-who="${mia.key}"`)) && clip.scenes[0].prompt.startsWith('Mia'),
    'as a clip: Mia is the same figure in every scene; prompts shown with her name');
  assert(clip.scenes.slice(1, 4).every((sc) => /data-id="dog"/.test(sc.svg)), 'the puppy is in the scenes it is part of');

  const rex = readStory('Tom had a dog called Rex. Every morning they went to the park together. One day it started to rain. "Look, a rainbow!" said Tom.');
  const [tom, dog] = ['Tom', 'Rex'].map((n) => rex.cast.find((c) => c.name === n));
  assert(rex.scenes.length === 4 && tom.id === 'boy' && dog.id === 'dog', 'without lines: one scene per sentence; Tom is a boy, Rex a dog');
  assert(rex.scenes[1].prompt.startsWith(`${tom.key} and ${dog.key} walks to the park`) && !/together/.test(rex.scenes[1].prompt), '"they went to the park": Tom and Rex walk there');
  assert(rex.scenes[2].prompt === `${tom.key} and ${dog.key} in the park in the rain`,
    `"it started to rain": whoever was there, in the rain (${rex.scenes[2].prompt})`);
  assert(/says “Look, a rainbow!”/.test(rex.scenes[3].prompt) && rex.scenes[3].prompt.startsWith(tom.key), '"“Look, a rainbow!” said Tom": Tom says it');

  const more = readStory(`Lily visited Grandma Rose.
Grandma sat on the sofa and read a book.
Lily sat next to her and listened.
Mrs Brown was a kind teacher. Their dog Max jumped. Zoe was an astronaut. She smiled.`);
  const by = (n) => more.cast.find((c) => c.name === n);
  assert(by('Lily')?.id === 'girl' && by('Grandma Rose')?.id === 'old_woman' && more.scenes[1].prompt.startsWith(by('Grandma Rose').key),
    '"Lily" is a girl (not the flower); "Grandma" later is Grandma Rose');
  assert(more.scenes[2].prompt.includes(`next to ${by('Grandma Rose').key}`), '"Lily sat next to her": her is Grandma, not Lily');
  assert(by('Mrs Brown')?.id === 'teacher' && by('Max')?.id === 'dog' && by('Zoe')?.id === 'astronaut' && !more.cast.some((c) => /^(Their|Her)$/.test(c.name ?? '')),
    '"Mrs Brown was a kind teacher", "their dog Max", "Zoe was an astronaut" ("Their" is not a name)');
  assert(more.scenes[more.scenes.length - 1].prompt.includes(`${by('Zoe').key} smiles`), '"Zoe was an astronaut. She smiled.": she is still Zoe');
  const opening = readStory('It was a cold winter day. Sam built a snowman in the garden.');
  assert(opening.scenes.length === 1 && opening.scenes[0].caption.startsWith('It was a cold winter day.') && / in the snow$/.test(opening.scenes[0].prompt),
    'an opening with nobody in it goes with the first scene; winter is snowy');
  const saved = readStory('pgc1 walked into the forest. She saw a fox.', { individuals: [{ key: 'pgc1', base: 'girl' }] });
  assert(saved.scenes[1].prompt.startsWith('pgc1 looks at a fox') && saved.individuals.length === 0, 'the studio\'s own characters (keys) are part of the cast');
  assert(composeStory('a boy waves | Hello!', {}).scenes[0].caption === 'Hello!' && composeStory('puppy-friend', {}).scenes.length === STORY_TEMPLATES.find((t) => t.id === 'puppy-friend').scenes.length,
    'scripts with "prompt | caption" and the story templates work as before');
}

// 7. Scenes the writer changed ("How I read your story"): kept with their sentence, names as in the story
{
  const t = 'A little girl called Mia found a puppy.\nMia hugged the puppy.';
  const st = composeStory(t, { edits: { 'Mia hugged the puppy.': 'Mia and the puppy sit on a bench at night' } });
  assert(st.scenes[1].edited && st.scenes[1].prompt === 'Mia and the puppy sit on a bench at night' && /pg-sitter/.test(st.scenes[1].svg)
    && /data-who="pgc21"/.test(st.scenes[1].svg) && !st.scenes[0].edited, 'a scene changed by the writer draws what they wrote, Mia still Mia');
  assert(Array.isArray(st.scenes[0].unknown) && st.cast.some((c) => c.name === 'Mia'), 'each scene says what it could not draw; the clip has its cast');
}

console.log(`\nStory Engine test suite: ${fails === 0 ? 'ALL PASSED!' : `${fails} FAILS`}`);
process.exit(fails === 0 ? 0 : 1);
