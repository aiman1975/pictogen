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

  const trip = readStory('Mia flew her rocket into space.\nShe waved at the planets.\nThen she landed in the desert.\nA camel came by.\nAt night she swam under the sea.');
  const tp = trip.scenes.map((sc) => sc.prompt);
  assert(/in space$/.test(tp[1]) && /in the desert$/.test(tp[3]) && /under the sea/.test(tp[4]), `the new places carry on from scene to scene too (space, the desert, under the sea): ${tp.join(' / ')}`);

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

// What a long story taught the reader ("The Glowing Sea", read as one clip)
{
  const r = readStory(`One stormy night, a little girl called Mia stood on the beach with her grandpa Leo.
Grandpa Leo smiled. "Tomorrow we will dive and find out why."
The next morning, Mia and Grandpa Leo put on their diving masks and flippers.
A sea turtle and a seahorse swam past them.
Mia and Grandpa Leo swam back to their boat.
That night, Mia sat on the beach with Grandpa Leo and looked at the stars.
A shooting star flew across the sky. Mia thought about the reef for a long time.
The next day, Mia went to school.
She pointed at the board that says "Save our reef!"
The teacher explained to the children why rubbish makes the coral sick.
On Saturday, the whole class cleaned the beach together.`);
  const p = r.scenes.map((s) => s.prompt);
  const named = r.cast.filter((c) => c.name).map((c) => c.name);
  assert(named.length === 2 && named.includes('Mia') && !named.includes('Saturday'), `"Grandpa Leo" and "her grandpa Leo" are one person; Saturday is no one (${named})`);
  assert(/in the rain/.test(p[1]) && !/rain/.test(p[2]), 'the rain stops when a new day starts');
  assert(/pgc21 with a diving mask and flippers/.test(p[2]) && /pgc22 with a diving mask and flippers/.test(p[2]), 'things put on are worn by those who put them on');
  assert(/with a diving mask/.test(p[3]) && /with a diving mask/.test(p[4]) && !/mask/.test(p[5]), '...until that night');
  const turtle = readStory('Mia played in the garden. A sea turtle walked past her.').scenes[1].prompt;
  assert(!/by the sea/.test(turtle), `a sea turtle is not the seaside (${turtle})`);
  assert(!/reef|under the sea/.test(p[6].replace(/thinks about the reef/, '')), 'a place only thought about is not where they are');
  assert(/in the classroom/.test(p[8]) && /“Save our reef!”/.test(p[8]), 'the board says what the story says');
  assert(/the board says “Save our reef!”/.test(p[9]), 'the board keeps its words while the story stays in the classroom');
  assert(/the children clean the beach/.test(p[10]) && !/board/.test(p[10]), 'the whole class is the children; the board stays at school');
}

// Explainers from an outline (src/slides.js): cards, each as long as it takes to read
{
  const { isOutline, readOutline, picturesFor, READ_WPS } = await import('../src/slides.js');
  const text = `# Compound Interest
Why starting early matters
## Money grows on money
- You earn interest on the money you put in
- Next year, you also earn interest on that interest
Show: coins
## 7% a year
- A long-run average for a broad stock index
## Saving vs Spending
- Grows over time | Gone tomorrow
- Works while you sleep | Needs you to work for it
## How to start
1. Open a savings account
2. Set up a monthly transfer
> Spend what is left after saving. — Warren Buffett
Scene: a teacher points at the board | Interest on interest
## Recap
- Start early
- Keep going`;
  assert(isOutline(text) && !isOutline('Mia went to school.\nShe met Tom.') && !isOutline('# just a title'), 'an outline is told from a story (headings and points)');
  const o = readOutline(text);
  assert(o.title === 'Compound Interest' && o.cards[0].subtitle === 'Why starting early matters', 'the title and its subtitle');
  assert(o.cards.map((c) => c.kind).join() === 'title,bullets,number,compare,steps,quote,scene,recap', `card kinds from the outline: ${o.cards.map((c) => c.kind)}`);
  assert(o.cards[1].show === 'coins' && o.cards[2].number === '7%' && o.cards[2].label === 'a year', 'what to show; a big number and its label');
  assert(o.cards[3].left === 'Saving' && o.cards[3].pairs[1][1] === 'Needs you to work for it', 'a comparison: its two sides, point by point');
  assert(o.cards[5].quote === 'Spend what is left after saving.' && o.cards[5].by === 'Warren Buffett', 'a quote and who said it');
  const halves = readOutline('## Cats vs Dogs\n- Quiet\n- Independent\n- Loud\n- Loyal').cards[0].pairs;
  assert(JSON.stringify(halves) === '[["Quiet","Loud"],["Independent","Loyal"]]', 'a comparison without "|": the points halved, left then right');
  assert(readOutline('## 3 ways to save\n- Cook at home\n- Walk\n- Wait a day before buying').cards[0].kind === 'bullets', '"3 ways to…" with its points is a list, not a big number');
  assert(picturesFor('Protect your password')[0] === 'locked' && picturesFor('Money grows')[0] === 'money_bag' && !picturesFor('money').includes('monkey'), `pictures for explainer words (password: ${picturesFor('Protect your password')}, money: ${picturesFor('money')})`);

  const st = composeStory(text, { style: 'flat', genre: 'howto' });
  assert(st.slides && st.title === 'Compound Interest' && st.scenes.length === 8, `a clip of cards (${st.scenes.length} scenes, slides: ${st.slides})`);
  const bullets = st.scenes[1];
  assert(bullets.caption === '' && /pg-slide-bullets/.test(bullets.svg) && /Next year, you also earn/.test(bullets.svg), 'a card carries its own words (no caption under it)');
  const wordsOn = 4 + 9 + 9;
  assert(bullets.duration >= wordsOn / READ_WPS && bullets.duration <= 20, `long enough to read (${bullets.duration}s for ${wordsOn} words)`);
  assert(st.scenes[2].duration < bullets.duration, 'a card with fewer words is on for less time');
  const reveals = (bullets.svg.match(/@keyframes pg\w+r\d+ /g) ?? []).length;
  assert(reveals >= 3, `its headline and points appear one by one (${reveals} reveals)`);
  const cues = JSON.parse(bullets.svg.match(/<metadata class="pg-sound">([^<]*)</)[1].replace(/&quot;/g, '"')).cues;
  assert(cues.filter((c) => c.s === 'pop').length === 2 && cues[0].t < cues[1].t, 'a soft pop as each point appears');
  assert(/scale\(1\) translate\(0px, 0px\)/.test(bullets.svg) || /scale\(1.045\)/.test(bullets.svg), 'a slow camera on the card');
  assert(st.scenes[6].caption === 'Interest on interest' && !st.scenes[6].slide && /Interest|board/i.test(st.scenes[6].svg), 'a "Scene:" line is an acted scene among the cards, with its caption');
  const dark = composeStory(text, { style: 'chalkboard' }).scenes[1].svg;
  assert(/#1f3a2e/.test(dark), 'the cards take the look of the clip\'s style (a chalkboard)');
  const tall = composeStory(text, { style: 'flat', aspect: '9:16' });
  assert(tall.height > tall.width && /viewBox="0 0 \d+ \d+"/.test(tall.scenes[1].svg) && !/NaN|undefined/.test(tall.scenes.map((s) => s.svg).join('')), 'a tall clip lays its cards out too');
  assert(!/NaN|undefined|\[object/.test(st.scenes.map((s) => s.svg).join('')), 'cards draw clean SVG');
}

console.log(`\nStory Engine test suite: ${fails === 0 ? 'ALL PASSED!' : `${fails} FAILS`}`);
process.exit(fails === 0 ? 0 : 1);
