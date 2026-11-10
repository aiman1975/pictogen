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
  // A quiz card: answers one by one, time to think (a clock ticking), then the right one and "Correct!"
  const q = readOutline('## Quiz: Which grows faster?\n- [ ] Money under the mattress\n- [x] Money earning interest').cards[0];
  assert(q.kind === 'quiz' && q.headline === 'Which grows faster?' && q.points[1].right && !q.points[0].right && q.points[0].text === 'Money under the mattress', 'a quiz: its question, its answers, the right one');
  const qs = composeStory('# Quiz time\n## Quiz: Which grows faster?\n- [ ] Money under the mattress\n- [x] Money earning interest', { style: 'flat' }).scenes[1];
  const qc = JSON.parse(qs.svg.match(/<metadata class="pg-sound">([^<]*)</)[1].replace(/&quot;/g, '"')).cues;
  const tick = qc.find((c) => c.s === 'tick'), correct = qc.find((c) => c.s === 'correct');
  assert(tick && correct && correct.t - tick.t === 3 && qs.duration > correct.t + 2 && /#10b981/.test(qs.svg), `time to think (${tick?.t}s), then "Correct!" (${correct?.t}s) and the right answer in green`);
  // Cards back as an outline (the studio's card editor): read, written, read again - the same
  const { writeOutline } = await import('../src/slides.js');
  const again = readOutline(writeOutline(o.cards));
  assert(JSON.stringify(again.cards.map((c) => [c.kind, c.headline ?? c.quote ?? c.prompt, c.points.length])) === JSON.stringify(o.cards.map((c) => [c.kind, c.headline ?? c.quote ?? c.prompt, c.points.length])), 'cards written back as an outline read the same');
  assert(/^- \[x\] Money earning interest$/m.test(writeOutline([q])) && /^## Quiz: Which grows faster\?$/m.test(writeOutline([q])), 'a quiz written back keeps its marker and its right answer');
}

// The writer (src/writer.js): notes or an article -> an explainer's outline, from the writer's own sentences
{
  const { outlineFromNotes, shorten } = await import('../src/writer.js');
  const { readOutline: read } = await import('../src/slides.js');
  const article = `Phishing emails are fake messages that try to trick you into giving away passwords or money. They often look like they come from a bank, a delivery company or your own IT team. In 2023, about 90% of data breaches started with a phishing email, according to industry reports.

The first warning sign is urgency. Scammers want you to act before you think, so they write things like "Your account will be closed today". Another sign is a sender address that is almost right, such as support@paypa1.com instead of paypal.com. Links can also be disguised: the text says one thing, but the real address is somewhere else.

So what should you do? First, stop and do not click anything. Then, hover over the link to see where it really goes. Next, check the sender's address carefully. Finally, report the email to your IT team and delete it.

"Security is everyone's job, not just the IT department's," says Maria Lopez, head of security at Acme Corp. A few seconds of care can save a company millions.`;
  const a = outlineFromNotes(article);
  const kinds = read(a.text).cards.map((c) => c.kind);
  assert(a.title === 'Phishing emails' && kinds.join() === 'title,number,bullets,steps,quote,recap', `an article -> a title, a big number, points, steps, a quote, a recap (${a.title}: ${kinds})`);
  assert(/^## 90% of data breaches started with a phishing email$/m.test(a.text) && /^## The first warning sign is urgency$/m.test(a.text), 'a number the part rests on is its headline; a paragraph\'s first sentence heads it');
  assert(/^1\. Stop and do not click anything$/m.test(a.text) && /^4\. Report the email to your IT team and delete it$/m.test(a.text), 'first, then, next, finally -> steps');
  assert(/^> Security is everyone's job, not just the IT department's\. — Maria Lopez$/m.test(a.text), 'someone quoted -> a quote card, with who said it');
  const sentencesIn = (t) => article.replace(/\s+/g, ' ').includes(t.replace(/\.$/, ''));
  assert(read(a.text).cards.filter((c) => c.kind === 'bullets').every((c) => c.points.every((pt) => sentencesIn(pt.text) || article.includes(pt.text.slice(0, 30)))), 'its points are the writer\'s own words (nothing made up)');
  const notes = 'Sleep better tonight\n\nWhy sleep matters\n- adults need 7-9 hours of sleep\n- poor sleep hurts memory, mood and focus\n\nScreens vs books\n- blue light keeps you awake | paper doesn\'t glow\n\nEvening routine:\n1. dim the lights an hour before bed\n2. put the phone in another room\n3. go to bed at the same time\n\nSummary\n- a steady routine trains your body clock\n- light matters more than you think';
  const n = read(outlineFromNotes(notes).text);
  assert(n.title === 'Sleep better tonight' && n.cards.map((c) => c.kind).join() === 'title,bullets,compare,steps,recap' && n.cards.at(-1).points[0].text === 'A steady routine trains your body clock',
    `notes with headings and lists keep them; their own summary is the recap (${n.cards.map((c) => c.kind)})`);
  assert(shorten('However, links can also be disguised: the text says one thing, but the real address is somewhere else entirely today.') === 'Links can also be disguised: the text says one thing', `a point made short at a clause, filler at the start gone ("${shorten('However, links can also be disguised: the text says one thing, but the real address is somewhere else entirely today.')}")`);
  const st = composeStory(a.text, { style: 'flat' });
  assert(st.slides && st.scenes.length === 6 && st.title === 'Phishing emails', 'and the outline makes the clip');
}

// German (src/lang.js): outlines in German words, notes in German turned into one
{
  const { outlineFromNotes } = await import('../src/writer.js');
  const { readOutline: read, picturesFor } = await import('../src/slides.js');
  const { detectLanguage } = await import('../src/lang.js');
  const { readFileSync } = await import('node:fs');
  assert(detectLanguage('Der Hund läuft in den Park, so wie immer.') === 'de' && detectLanguage('I will also go in so we can talk.') === 'en', 'the language of some text: German or English');
  const de = read('# Sparen leicht gemacht\n## 20 % deines Einkommens\n- Ein übliches Ziel\n## Bedürfnisse gegen Wünsche\n- Miete | Neues Handy\n## So geht\'s\n1. Ein Sparkonto eröffnen\n2. Einen Dauerauftrag einrichten\n## Frage: Was wächst schneller?\n- [ ] Geld unter der Matratze\n- [x] Geld mit Zinsen\n## Zusammenfassung\n- Zuerst sparen\n- Geduld haben\nBild: Münzen');
  assert(de.cards.map((c) => c.kind).join() === 'title,number,compare,steps,quiz,recap' && de.cards[1].number === '20 %' && de.cards[2].left === 'Bedürfnisse',
    `an outline in German words: ${de.cards.map((c) => c.kind)}`);
  assert(picturesFor('Passwörter schützen')[0] === 'locked' && picturesFor('Geld sparen')[0] === 'money_bag' && picturesFor('Achtung, Phishing!')[0] === 'warning', 'pictures for German words');
  const a = outlineFromNotes(readFileSync(new URL('./fixtures/phishing-de.txt', import.meta.url), 'utf8'));
  const kinds = read(a.text).cards.map((c) => c.kind);
  assert(a.title === 'Phishing-Mails' && kinds.join() === 'title,number,bullets,steps,quote,recap', `a German article -> ${a.title}: ${kinds}`);
  assert(/^## 90 % aller Datenlecks mit einer Phishing-Mail$/m.test(a.text) && /^## Zusammenfassung$/m.test(a.text) && /^- Links können getarnt sein: Der Text sagt das eine$/m.test(a.text),
    'a big number in German (90 %), the recap as "Zusammenfassung", a point cut at a whole clause');
  assert(/^1\. Halte inne und klicke nichts an$/m.test(a.text) && /^4\. Melde die Mail deiner IT-Abteilung und lösche sie$/m.test(a.text), 'zuerst, dann, danach, zum Schluss -> steps, said as steps ("Melde ... und lösche")');
  assert(/^> Sicherheit ist die Aufgabe aller, nicht nur der IT-Abteilung\. — Maria Lopez$/m.test(a.text), 'a German quote („…“, sagt …) with who said it');
}

// Arabic (src/lang.js): outlines in Arabic words, cards laid out right to left, Arabic notes
{
  const { outlineFromNotes } = await import('../src/writer.js');
  const { readOutline: read, picturesFor, renderSlide } = await import('../src/slides.js');
  const { detectLanguage } = await import('../src/lang.js');
  const { readFileSync } = await import('node:fs');
  assert(detectLanguage('الادخار يساعدك على بناء مستقبل آمن') === 'ar' && detectLanguage('Geld sparen ist wichtig für die Zukunft') === 'de', 'the language of some text: Arabic by its letters');
  const ar = read('# الادخار للمستقبل\n## ٧٪ سنويًا\n- متوسط العائد\n## الادخار مقابل الإنفاق\n- ينمو مع الوقت | يختفي غدًا\n## كيف تبدأ\n1. افتح حسابًا\n2. ادخر كل شهر\n## سؤال: متى تبدأ؟\n- [ ] غدًا\n- [x] اليوم\n## الخلاصة\n- ابدأ مبكرًا\n- اصبر\nصورة: عملات');
  assert(ar.cards.map((c) => c.kind).join() === 'title,number,compare,steps,quiz,recap' && ar.cards[1].number === '٧٪' && ar.cards[2].left === 'الادخار' && ar.cards[5].show === 'عملات',
    `an outline in Arabic words (مقابل, كيف, سؤال:, الخلاصة, صورة:, ٧٪): ${ar.cards.map((c) => c.kind)}`);
  assert(picturesFor('كلمة المرور')[0] === 'locked' && picturesFor('المال ينمو')[0] === 'money_bag' && picturesFor('احذر الاحتيال')[0] === 'warning' && picturesFor('نمو الاستثمار')[0] === 'chart_increasing', 'pictures for Arabic words');
  const card = renderSlide(ar.cards[4], { style: 'flat', lang: 'ar' }).svg, en = renderSlide({ kind: 'quiz', headline: 'When?', points: [{ text: 'Now', right: true }, { text: 'Later' }] }, { style: 'flat' }).svg;
  assert(/matrix\(-1 0 0 1 \d+ 0\)/.test(card) && /direction="rtl"/.test(card) && />أ<\/text>/.test(card) && />ب<\/text>/.test(card) && !/direction="rtl"/.test(en) && />A<\/text>/.test(en),
    'an Arabic card is laid out right to left, its answers أ ب (an English one left to right, A B)');
  const a = outlineFromNotes(readFileSync(new URL('./fixtures/phishing-ar.txt', import.meta.url), 'utf8'));
  const kinds = read(a.text).cards.map((c) => c.kind);
  assert(a.title === 'رسائل التصيد الاحتيالي' && kinds.join() === 'title,bullets,number,bullets,quote,steps,recap', `an Arabic article -> ${a.title}: ${kinds}`);
  assert(/^## ٩٠٪ من الاختراقات برسالة تصيد واحدة$/m.test(a.text) && /^## ماذا تفعل؟$/m.test(a.text) && /^1\. لا تضغط على أي رابط في الرسالة$/m.test(a.text) && /^4\. احذف الرسالة من صندوق الوارد$/m.test(a.text),
    'a big number in Arabic (٩٠٪), a question as a heading, أولًا، ثم، بعد ذلك، أخيرًا -> steps');
  assert(/^> الأمان مسؤولية الجميع، وليس قسم تقنية المعلومات فقط\. — سارة أحمد$/m.test(a.text) && /^## الخلاصة$/m.test(a.text), 'an Arabic quote («…»، قالت …) with who said it, and the recap as "الخلاصة"');
}

// Arabic scenes (src/lang-ar.js): an Arabic prompt drawn from its Arabic words
{
  const { generate: gen } = await import('../src/index.js');
  const { bridgeArabic, isArabicPrompt } = await import('../src/lang-ar.js');
  const seen = (t, o = {}) => gen(t, { style: 'flat', ...o }).matches.map((m) => m.id + (m.color ? `:${m.color}` : '') + (m.count > 1 ? `x${m.count}` : '') + (m.animation ? ` ${m.animation}` : '')).join(', ');
  assert(isArabicPrompt('فتاة تمشي في الحديقة') && !isArabicPrompt('a girl says "مرحبا"') && !isArabicPrompt('ein Hund läuft'), 'an Arabic prompt is told by its letters (what is said aside)');
  for (const [t, want] of [
    ['فتاة صغيرة تحمل بالونًا أحمر في الحديقة', 'girl hold, balloon:red'],
    ['تمشي الفتاة مع كلبها في الحديقة', 'girl walk, dog'],
    ['كلبان يركضان على الشاطئ', 'dogx2 run'],
    ['ثلاثة قطط تنام تحت شجرة كبيرة', 'catx3 sleep, tree'],
    ['بطل خارق يطير فوق المدينة ليلا', 'man_superhero fly'],
    ['ذهبت سارة إلى الحديقة', 'girl walk'],
  ]) assert(seen(t) === want, `Arabic: "${t}" -> ${seen(t)}`);
  assert(bridgeArabic('فتاة صغيرة تمشي في الحديقة').text === 'small girl walks in the park' && bridgeArabic('تمشي الفتاة مع كلبها في الحديقة').text === 'the girl walks with dog in the park',
    'describing words before their noun ("فتاة صغيرة"), a verb at the front after who does it ("تمشي الفتاة")');
  assert(bridgeArabic('الجدة والجد يقرآن الكتب في المطبخ').text === 'the grandma and the grandpa reads the books in the kitchen' && bridgeArabic('وبالبالون').text === 'and with the balloon',
    'small words on the front of a word ("والجد", "وبالبالون"), the two of them reading ("يقرآن"), "الكتب" books not "كتب" wrote');
  const said = gen('ولد يقول «انظر، قوس قزح!» لكلبه', { style: 'flat' });
  assert(said.svg.includes('انظر، قوس قزح!') && gen('قالت سارة «مرحبا يا قطة!»', { style: 'flat' }).svg.includes('مرحبا يا قطة!'), 'what is said stays Arabic, in the bubble');
  for (const [t, topic] of [['دورة الماء', 'water_cycle'], ['أجزاء النبات', 'plant'], ['جسم الإنسان', 'body'], ['المجموعة الشمسية', 'solar_system'], ['البركان', 'volcano']]) {
    assert(gen(t, { mode: 'diagram' }).diagram?.topic === topic, `a diagram named in Arabic: "${t}" -> ${topic}`);
  }
  const ph = gen('ب مثل بطة', { mode: 'alphabet' });
  const count = gen('عد إلى ٥', { mode: 'alphabet' });
  assert(ph.matches.map((m) => m.id).join() === 'letter_ar_ba,duck' && /ب مثل بطة/.test(ph.svg) && [...count.svg.matchAll(/>(\d)</g)].map((m) => m[1]).join('') === '12345',
    'letters in Arabic: "ب مثل بطة" (its Arabic word on the banner), "عد إلى ٥"');
  const st = composeStory('ذهبت سارة إلى الحديقة.\nهناك رأت قطة صغيرة تحت شجرة.', { style: 'flat' });
  assert(st.scenes.length === 2 && st.scenes[0].caption === 'ذهبت سارة إلى الحديقة.' && st.scenes[1].matches.some((m) => m.id === 'cat'), 'an Arabic story: a scene per line, its caption as written');
  // Arabic stories (src/lang-ar.js arabicStory): one cast from scene to scene, names, dropped subjects
  const sara = composeStory('سارة والقطة\n\nكان هناك فتاة صغيرة اسمها سارة.\n\nذهبت سارة إلى الحديقة مع كلبها.\n\nهناك رأت قطة صغيرة تحت شجرة.\n\nقالت «مرحبا يا قطة!»\n\nلعبت مع القطة والكلب.\n\nفي المساء عادت إلى البيت ونامت.', { style: 'flat' });
  const girls = new Set(sara.scenes.flatMap((sc) => sc.matches.filter((m) => m.id.startsWith('girl')).map((m) => m.id)));
  assert(sara.title === 'سارة والقطة' && sara.scenes.length === 6 && girls.size === 1 && sara.scenes.every((sc) => sc.matches.some((m) => m.id.startsWith('girl~'))),
    `an Arabic story keeps one girl in every scene ("ذهبت"، "رأت"، "لعبت"، "نامت": she, without her name): ${[...girls]}`);
  assert(sara.cast.some((c) => c.name === 'سارة' && c.id === 'girl') && sara.scenes[3].matches.some((m) => m.id === 'cat') && sara.scenes[2].matches.some((m) => m.id === 'cat'),
    'her name shown in Arabic ("سارة"), the cat she saw in the scenes after');
  const moon = composeStory('القمر الصغير والنجمة الضائعة\nقصة قصيرة للأطفال من ٣ إلى ٦ سنوات.\n\nكان هناك قمر صغير يعيش في السماء.\n\nفي إحدى الليالي لاحظ أن نجمة صغيرة مفقودة.\n\n«يا إلهي!» صاح القمر. «أين نجمتي الصغيرة؟»\n\nتحت شجرة كبيرة جلست نجمة صغيرة تبكي.\n\nقال القمر: «لا تخافي، سأساعدك!»\n\nجاءت بومة صغيرة وقالت: «اتبعيني!»\n\nطارت النجمة والبومة معًا في الليل.', { style: 'flat' });
  const ids = moon.scenes.map((sc) => sc.matches.map((m) => m.id.split('~')[0]).sort().join());
  assert(moon.title === 'القمر الصغير والنجمة الضائعة' && moon.scenes.length === 7 && ids[0] === 'moon_friend' && ids[1] === 'moon_friend' && /star_friend/.test(ids[3]) && /owl/.test(ids[5]) && /owl/.test(ids[6]) && /star_friend/.test(ids[6]),
    `an Arabic story with friends in the sky: the subtitle left out, the missing star not drawn, "جاءت بومة" the owl coming: ${ids.join(' | ')}`);
  assert(moon.scenes.every((sc) => new Set(sc.matches.filter((m) => /^moon_friend/.test(m.id)).map((m) => m.id)).size <= 1) && !/the moon says the moon/.test(moon.scenes.map((sc) => sc.prompt ?? '').join(' ')), 'the moon is one moon, "قال القمر:" said once');
  assert(moon.scenes[2].caption === '«يا إلهي!» صاح القمر. «أين نجمتي الصغيرة؟»' && composeStory('„Hallo!“, rief Mia.\nMia lacht.', { style: 'flat' }).scenes[0].caption === '„Hallo!“, rief Mia.',
    'a caption keeps its own quote marks («…», „…“)');
  const { layoutBubbles } = await import('../src/bubble.js');
  const view = { x: 300, y: 0, w: 260, h: 180 };
  const [vb] = layoutBubbles([{ x: 520, top: 40, text: 'أين نجمتي الصغيرة؟', room: 60 }], { W: 640, H: 360, view });
  assert(vb.box.x >= view.x && vb.box.x + vb.box.w <= view.x + view.w && vb.box.y >= view.y && vb.box.y + vb.box.h <= view.y + view.h, `a bubble stays inside a camera close-up's view: ${JSON.stringify(vb.box)}`);
}

// German scenes (src/lang-de.js): a German prompt drawn from its German words
{
  const { generate: gen } = await import('../src/index.js');
  const { bridgeGerman, isGermanPrompt } = await import('../src/lang-de.js');
  const seen = (t) => gen(t, { style: 'flat' }).matches.map((m) => m.id + (m.color ? `:${m.color}` : '') + (m.count > 1 ? `x${m.count}` : '') + (m.animation ? ` ${m.animation}` : '') + (m.expression ? ` ${m.expression}` : '')).join(', ');
  assert(isGermanPrompt('ein roter Hund läuft im Park') && isGermanPrompt('Mia winkt') && !isGermanPrompt('a red dog runs in the park') && !isGermanPrompt('a ball in the park'), 'a German prompt is told from an English one');
  for (const [t, want] of [
    ['ein roter Hund läuft im Park', 'dog:red walk'],
    ['Zwei Katzen schlafen unter einem Baum', 'catx2 sleep, tree'],
    ['Eine traurige Lehrerin steht im Klassenzimmer', 'teacher sad'],
    ['Der Junge sagt „Hallo, Mia!“ und winkt', 'boy wave'],
    ['Nachts fliegt eine Rakete in den Weltraum', 'rocket fly'],
    ['Im Park spielt ein kleiner Hund mit einem Ball', 'dog, ball'],
    ['Ein Mädchen fährt Fahrrad im Park', 'girl sit, bike'],
    ['Ein gelbes Auto fährt durch die Stadt', 'car:yellow walk-across'],
  ]) assert(seen(t) === want, `German: "${t}" -> ${seen(t)}`);
  assert(/"Hallo, Mia!"/.test(bridgeGerman('Der Junge sagt „Hallo, Mia!“').text) && gen('Der Junge sagt „Hallo, Mia!“', { style: 'flat' }).svg.includes('Hallo, Mia!'), 'what is said stays German, in the bubble');
  assert(bridgeGerman('Ein Kinderfahrrad im Garten').text === 'a bike in the garden', 'a compound word read by its last part (Kinderfahrrad -> bike)');
  assert(bridgeGerman('Nachts fliegt eine Rakete').text === 'night a rocket flies', 'the verb back after who does it ("Nachts fliegt eine Rakete")');
  const env = gen('Ein Mädchen und ein Junge tanzen am Strand bei Sonnenuntergang', { style: 'flat' }).svg;
  assert(/pg-place|#ff/.test(env) && seen('Ein Mädchen und ein Junge tanzen am Strand bei Sonnenuntergang') === 'girl dance, boy dance', 'German places and times (am Strand, bei Sonnenuntergang)');
  const st = composeStory('Ein roter Buchstabe A geht in den Park.\nDann kommt eine blaue Zahl 7.\nDer Buchstabe A und die Zahl 7 tanzen zusammen.', { style: 'flat' });
  assert(st.scenes.length === 3 && st.scenes[0].caption === 'Ein roter Buchstabe A geht in den Park.' && st.scenes[2].matches.map((m) => m.id).join() === 'letter_a,number_7',
    'a German story: a scene per line, its caption as written, "Buchstabe A" and "Zahl 7" as figures');
  // More than one, a verb's split-off part, sayings, lists of things
  assert(seen('drei Hunde laufen im Park') === 'dogx3 walk' && bridgeGerman('die Kinder spielen').text === 'the children plays' && bridgeGerman('er sieht den Jungen').text === 'he looks the boy'
    && bridgeGerman('mit den Kindern').text === 'with the children', 'German plurals: Hunde -> dogs, Kinder/Kindern -> children; "den Jungen" stays one boy');
  assert(bridgeGerman('eine Lehrerin liest den Kindern ein Buch vor').text === 'a teacher reads the children a book', 'a verb\'s part at the end of the clause ("liest … vor") is no word of its own');
  assert(bridgeGerman('ein Junge kommt herein, dann geht er in die Ferne davon').text === 'a boy walks in, then he walks into the distance'
    && bridgeGerman('7 von 10 Kindern gehen zu Fuß zur Schule').text === '7 out of 10 children walks to the school', 'sayings: "kommt herein", "in die Ferne", "zu Fuß", "7 von 10"');
  assert(isGermanPrompt('Apfel, Fahrrad, Baum, Sonne, Kaffee, Buch') && !isGermanPrompt('Apple, Bike, Tree') && seen('Apfel, Fahrrad, Baum, Sonne, Kaffee, Buch') === 'apple, bike, tree, sun, hot_beverage, book',
    'a list of German nouns (with their capitals) is German');
  for (const [t, topic] of [['der Wasserkreislauf', 'water_cycle'], ['die Teile einer Pflanze', 'plant'], ['der menschliche Körper', 'body'], ['das Sonnensystem', 'solar_system'], ['Schichten der Erde', 'earth'], ['der Lebenszyklus eines Schmetterlings', 'butterfly_cycle']]) {
    assert(gen(t, { mode: 'diagram' }).diagram?.topic === topic && gen(t).diagram?.topic === topic, `a diagram named in German: "${t}" -> ${topic}`);
  }
  const phon = gen('K wie Katze', { mode: 'alphabet' });
  const count = gen('zähle bis 5', { mode: 'alphabet' });
  assert(phon.matches[0]?.id === 'cat' && />WIE</.test(phon.svg) && /K wie KATZE/.test(phon.svg) && [...count.svg.matchAll(/>(\d)</g)].map((m) => m[1]).join('') === '12345',
    'letters in German: "K wie Katze" (its German word on the banner), "zähle bis 5"');
  // German stories, read as a whole (src/lang-de.js germanStory + src/story-reader.js): a cast kept,
  // names, "er"/"sie"/"ihn" for the right one, places, times and the weather carried on
  {
    const mia = composeStory('Es war einmal ein kleines Mädchen namens Mia. Sie wohnte in der Nähe von einem großen Wald.\nEines Morgens fand sie einen kleinen Welpen unter einem Baum.\n„Hallo, kleiner Hund!“, sagte Mia. Der Welpe wedelte mit dem Schwanz.\nSie nahm ihn mit nach Hause und gab ihm etwas Milch.\nDann fing es an zu regnen. Mia und der Welpe liefen schnell ins Haus.\nIn der Nacht schliefen sie zusammen ein. Sie waren jetzt beste Freunde.', { style: 'flat' });
    const ids = (sc) => sc.matches.map((m) => m.id.split('~')[0] + (m.animation ? `:${m.animation}` : '')).join(', ');
    const girlKey = mia.scenes[0].matches[0].id;
    assert(mia.title === 'Meine Geschichte' && mia.scenes.length === 6 && /^girl~pgc\d+$/.test(girlKey) && mia.scenes.every((sc, i) => i === 0 || sc.matches.some((m) => m.id === girlKey)),
      `a German story keeps its girl, Mia, in every scene (${mia.scenes.map(ids).join(' | ')})`);
    assert(mia.scenes[0].caption.startsWith('Es war einmal ein kleines Mädchen namens Mia.') && /Hallo, kleiner Hund!/.test(mia.scenes[2].caption) && /Hallo, kleiner Hund!/.test(mia.scenes[2].svg),
      'its captions are the German as written, and what is said is said in German');
    assert(/looks at/.test(mia.scenes[1].prompt) && ids(mia.scenes[1]).includes('dog') && ids(mia.scenes[3]).split(', ').filter((x) => x === 'glass_of_milk').length === 1 && ids(mia.scenes[3]).includes('dog'),
      `"fand sie einen kleinen Welpen" looks at the puppy, "nahm ihn … gab ihm etwas Milch" (${mia.scenes[1].prompt}; ${mia.scenes[3].prompt})`);
    assert(/\brain\b/.test(mia.scenes[4].prompt) && /\bnight\b/.test(mia.scenes[5].prompt) && /smile at each other/.test(mia.scenes[5].prompt) && /\bforest\b/.test(mia.scenes[1].prompt),
      'the forest, the rain and the night carried on; "Sie waren beste Freunde" smile at each other');
    const tom = composeStory('Tom ist ein mutiger Junge. Er hat einen Hund, der Rex heißt.\nEines Tages gehen Tom und Rex in den Park.\nDort treffen sie Oma Rose. „Guten Morgen, Tom!“, ruft Oma Rose.\nRex bellt und springt. Tom lacht.', { style: 'flat' });
    const cast = tom.scenes.flatMap((sc) => sc.matches.map((m) => m.id));
    assert(cast.includes(tom.scenes[0].matches[0].id) && /^boy~/.test(tom.scenes[0].matches[0].id) && tom.scenes[0].matches.some((m) => /^dog~pgc/.test(m.id)) && tom.scenes[2].matches.some((m) => /^old_woman~pgc/.test(m.id))
      && /Tom and Rex walks? in the park/.test(tom.scenes[1].prompt) && /Grandma Rose says “Guten Morgen, Tom!”/.test(tom.scenes[2].prompt),
      `names: "einen Hund, der Rex heißt", "Oma Rose", "gehen Tom und Rex", "ruft Oma Rose" (${tom.scenes.map((sc) => sc.prompt).join(' | ')})`);
    const braun = composeStory('Herr Braun war ein netter Lehrer.\nIm Klassenzimmer schrieb er „2 + 2 = 4“ an die Tafel.\nDie Kinder klatschten.', { style: 'flat' });
    assert(/^man_teacher~/.test(braun.scenes[0].matches[0].id) && /Mr Braun writes/.test(braun.scenes[1].prompt) && braun.scenes[1].svg.includes('2 + 2 = 4') && braun.scenes[2].matches.some((m) => m.animation === 'cheer'),
      '"Herr Braun" is a man teacher (not brown), "er" is him, the board says what he wrote, the children cheer');
  }
  // A story with the moon and a little star as its characters, a title line and what it is under it;
  // German "er", "es", "sie" by the noun's gender (der Mond, das Sternchen, die Eule)
  {
    const moon = composeStory('Der kleine Mond und das verlorene Sternchen ⭐\nEine kurze Kindergeschichte für Kinder von 3–6 Jahren.\n\nEs war einmal ein kleiner Mond, der hoch oben am Himmel wohnte.\n\nEr schaute hinter die Wolken. Nichts.\n\nUnter einem großen Baum saß ein kleines Sternchen.\n\n„Ich habe mich verirrt“, schluchzte es.\n\nEine kleine Eule flog herbei und sagte: „Folge mir!“\n\nDas Sternchen hüpfte auf den Rücken der Eule. Gemeinsam flogen sie durch die Nacht.\n\nDer Mond lächelte.', { style: 'flat' });
    const ids = (sc) => sc.matches.map((m) => m.id.split('~')[0] + (m.animation ? `:${m.animation}` : '') + (m.expression ? ` ${m.expression}` : ''));
    const moonKey = moon.scenes[0].matches.find((m) => /^moon_friend~/.test(m.id))?.id;
    assert(moon.title === 'Der kleine Mond und das verlorene Sternchen' && moon.scenes.length === 7 && !moon.scenes.some((sc) => /Kindergeschichte/.test(sc.caption)),
      `the title line is the title, the line under it no scene (${moon.title}; ${moon.scenes.length} scenes)`);
    assert(moonKey && moon.scenes[1].matches.some((m) => m.id === moonKey) && moon.scenes[6].matches.some((m) => m.id === moonKey && m.expression === 'happy'),
      `the moon is a character, the same one all along: "Er schaute…", "Der Mond lächelte" (${moon.scenes.map((sc) => ids(sc).join(' ')).join(' | ')})`);
    assert(ids(moon.scenes[2]).includes('star_friend:sit') && ids(moon.scenes[3]).some((x) => /^star_friend.* sad$/.test(x)) && ids(moon.scenes[4]).includes('owl:fly') && /the star rides the owl up in the sky/.test(moon.scenes[5].prompt) && ids(moon.scenes[5]).includes('star_friend:sit'),
      `the little star sits under the tree, "schluchzte es" is the star crying, the owl flies; "hüpfte auf den Rücken der Eule. Gemeinsam flogen sie" rides the owl up in the sky (${moon.scenes[5].prompt})`);
    assert(/pg-place-sky/.test(moon.scenes[0].svg) && /pg-place-sky/.test(moon.scenes[5].svg) && !/pg-place-sky/.test(moon.scenes[2].svg) && /<g class="pg-rider"/.test(moon.scenes[5].svg),
      'up in the sky: the moon\'s home and the flight are on the clouds; under a tree is the ground again; the star drawn on the owl\'s back');
    // Missing, looked at, heard: none of them is where someone is or what they feel
    const lost = composeStory('Es war einmal ein kleiner Mond am Himmel.\n\nEin kleines Sternchen fehlte!\n\n„Oh nein!“, rief der Mond. „Wo ist mein Sternchen?“\n\nEr schaute über die Berge. Nichts.\n\nDa hörte er ein leises Weinen.\n\n„Da bist du ja!“, riefen die anderen Sterne glücklich.', { style: 'flat' });
    const lids = lost.scenes.map(ids);
    assert(!lids[1].some((x) => /^star/.test(x)) && !lids[2].some((x) => /^star/.test(x)) && !/mountain/.test(lost.scenes[4].prompt) && !/pg-place-mountains/.test(lost.scenes[4].svg) && !lids[4].some((x) => / sad$/.test(x)),
      `a missing star is not drawn (nor brought in to listen), looking over the mountains doesn't go there, hearing crying doesn't make the moon sad (${lids.map((x) => x.join(' ')).join(' | ')})`);
    assert(lost.scenes[5].matches.some((m) => m.id === 'star_friend' && m.count === 2), `"die anderen Sterne" are two more star friends (${lids[5]})`);
    const over = composeStory('Es war einmal ein kleiner Mond am Himmel.\n\nJede Nacht leuchtete er über den kleinen Häusern.\n\nDoch eines Abends bemerkte er etwas Seltsames.\n\nDer Mond lächelte.', { style: 'flat' });
    assert(!over.scenes.some((sc) => /at home|pg-place-room/.test(sc.prompt + sc.svg)), `shining over the houses is not being at home (${over.scenes.map((sc) => sc.prompt).join(' | ')})`);
    const animals = gen('the sleeping animals at night', { style: 'flat' }).matches;
    assert(animals.map((m) => m.id).join() === 'cat,dog,rabbit' && animals.every((m) => m.animation === 'sleep'), 'sleeping animals are a cat, a dog and a rabbit asleep');
    const fromThen = composeStory('Es war einmal ein kleiner Mond am Himmel.\n\nDer Mond lächelte.\n\nUnd von diesem Abend an leuchtete das kleine Sternchen jede Nacht besonders hell.', { style: 'flat' });
    assert(!/sunset|evening/.test(fromThen.scenes.at(-1).prompt), `"von diesem Abend an" is from then on, not a sunset (${fromThen.scenes.at(-1).prompt})`);
    const front = gen('a moon friend shines over small houses and big trees at night', { style: 'flat' }).svg;
    assert(front.lastIndexOf('data-id="moon_friend"') > front.lastIndexOf('data-id="tree"'), 'the moon is drawn in front of the trees, not behind them');
    const plain = gen('a girl looks at the moon at night', { style: 'flat' });
    assert(plain.matches.some((m) => m.id === 'moon') && !plain.matches.some((m) => /_friend/.test(m.id)), 'a moon that only shines stays the sky\'s moon');
  }
  // (and in English: "says … and waves" waves; "a boat and waves" stays the sea)
  assert(seen('a boy says "Hi!" and waves') === 'boy wave' && seen('a boat and waves') === 'boat, water_wavex3' && seen('a boy and a girl dance and jump') === 'boy dance, girl dance', '"and waves" after doing something is waving; after a thing, the sea');
}

// ---- First feedback from a visitor: "ein mädchen ruft ihre mama und sagt schau ein Schaukel" ----
{
  const { generate: g, renderIcon } = await import('../src/index.js');
  const { quoteSpeech } = await import('../src/said.js');
  const ids = (t) => g(t, { style: 'flat' }).matches.map((m) => m.id);
  // The playground: a swing and a seesaw to sit on (and swinging with them), the rest to play on
  const swing = g('a girl on a swing', { style: 'flat' });
  assert(swing.matches.find((m) => m.id === 'swing')?.carries?.by?.includes('girl') && /pg-swinging[^>]*>[\s\S]*pg-sitter/.test(swing.svg), 'a girl on a swing sits on it, and swings with its seat');
  const saw = g('a boy and a girl on a seesaw', { style: 'flat' });
  assert(saw.matches.find((m) => m.id === 'seesaw')?.carries?.by?.length === 2 && (saw.svg.match(/class="pg-sitter"/g) ?? []).length === 2, 'a boy and a girl sit at the two ends of a seesaw');
  assert(ids('a girl swings in the park').join() === 'girl,swing', 'a girl who swings is on a swing');
  assert(ids('children in the playground').includes('swing') && ids('children in the playground').includes('playground_slide'), 'a playground has a swing and a slide');
  for (const [lang, t, want] of [['de', 'Ein Junge schaukelt auf dem Spielplatz', 'swing'], ['de', 'Zwei Kinder auf der Wippe', 'seesaw'], ['ar', 'بنت على الأرجوحة', 'swing'], ['ar', 'طفلان على السي سو', 'seesaw'],
    ['de', 'ein Sandkasten, ein Klettergerüst, ein Karussell, ein Trampolin und eine Hängematte', 'sandbox,climbing_frame,roundabout,trampoline,hammock']]) {
    assert(want.split(',').every((w) => ids(t).includes(w)), `${lang}: "${t}" draws ${want} (${ids(t)})`);
  }
  // Everyday things, in three languages
  const everyday = { fence: ['a fence', 'ein Zaun', 'سياج'], lamp: ['a lamp', 'eine Lampe', 'مصباح'], stairs: ['the stairs', 'eine Treppe', 'درج'], wardrobe: ['a wardrobe', 'ein Schrank', 'خزانة'],
    spade: ['a spade', 'eine Schaufel', 'مجرفة'], watering_can: ['a watering can', 'eine Gießkanne', 'مرشة'], digger: ['a digger', 'ein Bagger', 'حفارة'], crane: ['a crane', 'ein Kran', 'رافعة'],
    doll: ['a doll', 'eine Puppe', 'دمية'], treasure_chest: ['a treasure chest', 'ein Schatz', 'كنز'], cave: ['a cave', 'eine Höhle', 'كهف'], bridge: ['a bridge', 'eine Brücke', 'جسر'], stroller: ['a pram', 'ein Kinderwagen', 'عربة أطفال'] };
  for (const [id, words] of Object.entries(everyday)) assert(words.every((w) => ids(w).includes(id)), `${id}: ${words.join(' / ')} (${words.map((w) => ids(w).join('+')).join(' / ')})`);
  assert(ids('a sheep and a squirrel').join() === 'ewe,chipmunk' && ids('ein Topf').join() === 'pot_of_food', 'a sheep, a squirrel and a pot are drawn by the nearest picture (not a honey pot)');
  // (thick bars are filled shapes: a bike's frame shows in the flat look too)
  assert(/<path[^>]*fill="#e53935"/.test(renderIcon('bike', { style: 'flat' })), 'the bike\'s frame shows in the flat look');
  // What is said without quote marks
  assert(quoteSpeech('ein mädchen ruft ihre mama und sagt schau ein Schaukel', 'de').replace(/\u2060/g, '') === 'ein mädchen ruft ihre mama und sagt „Mama! Schau ein Schaukel“', 'calling her mum and saying something: one bubble, "Mama! Schau ein Schaukel"');
  for (const [lang, t, want] of [['en', 'a boy says hello to his grandma', 'a boy says to his grandma “Hello”'], ['en', 'she says that she is tired', 'she says that she is tired'], ['en', 'a man calls a taxi', 'a man calls a taxi'],
    ['en', 'Tom says "Hi"', 'Tom says "Hi"'], ['de', 'Dann sagt Mia schau mal', 'Dann sagt Mia „Schau mal“'], ['de', 'Er sagt hallo und sie sagt tschüss', 'Er sagt „Hallo“ und sie sagt „Tschüss“'],
    ['de', 'Der Junge ruft seinen Hund und sagt komm her', 'Der Junge ruft seinen Hund und sagt „Komm her“'], ['ar', 'نادت البنت أمها وقالت انظري أرجوحة', 'نادت البنت أمها وقالت «ماما! انظري أرجوحة»'], ['ar', 'صرخ الولد النجدة', 'صرخ الولد «النجدة»']]) {
    const got = quoteSpeech(t, lang).replace(/\u2060/g, '');
    assert(got === want, `${lang}: "${t}" -> ${got}`);
  }
  // (a second visitor: a lighthouse, and a boat that "answered with a golden light" says nothing)
  const light = g('Every night, the old lighthouse blinked across an empty sea. One evening, a small boat answered with a golden light. The', { style: 'flat' });
  assert(light.matches.map((m) => m.id).join() === 'lighthouse,boat' && !/<g class="pg-bubbles"/.test(light.svg) && !/golden light/i.test(light.svg.replace(/<style[\s\S]*?<\/style>/g, '')) && /pg-beam/.test(light.svg) && !Object.keys(light.suggestions).length,
    `the lighthouse blinks over the sea with the boat; "answered with a golden light" is no speech bubble; no odd suggestions (${light.matches.map((m) => m.id)}; ${JSON.stringify(light.suggestions)})`);
  assert(['ein Leuchtturm', 'منارة'].every((w) => ids(w).includes('lighthouse')), 'a lighthouse in German and Arabic');
  for (const [lang, t] of [['en', 'she replied with a smile'], ['de', 'Er antwortete mit einem Lächeln']]) assert(quoteSpeech(t, lang) === t, `${lang}: "${t}" is no speech`);
  const friend = g('ein mädchen ruft ihre mama und sagt schau ein Schaukel', { style: 'flat' });
  assert(friend.matches.map((m) => m.id).join() === 'girl,woman,swing' && !friend.unknown.length && /Mama! Schau ein Schaukel/.test(friend.svg.replace(/<[^>]+>/g, ' ').replace(/[\s\u2060]+/g, ' ')),
    `the visitor's sentence: a girl, her mum and a swing, "Mama! Schau ein Schaukel" in a bubble (${friend.matches.map((m) => m.id)}; ${friend.unknown})`);
  const arFriend = g('نادت البنت أمها وقالت انظري أرجوحة', { style: 'flat' });
  assert(arFriend.matches.map((m) => m.id).join() === 'girl,woman,swing' && arFriend.svg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').includes('انظري أرجوحة'), 'and in Arabic');
  const told = composeStory('Mia geht auf den Spielplatz. Sie ruft ihre Mama und sagt schau eine Schaukel! Dann schaukelt Mia.', { style: 'flat' });
  assert(told.scenes[1].matches.some((m) => m.id === 'swing') && told.scenes[1].svg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').includes('Schau eine Schaukel!') && !told.scenes[1].caption.includes('\u2060') && told.scenes[2].matches.find((m) => m.id === 'swing')?.carries,
    `in a story: what Mia says is in a bubble, the swing she sees is there, and then she swings (${told.scenes.map((sc) => sc.prompt).join(' | ')})`);
}

console.log(`\nStory Engine test suite: ${fails === 0 ? 'ALL PASSED!' : `${fails} FAILS`}`);
process.exit(fails === 0 ? 0 : 1);
