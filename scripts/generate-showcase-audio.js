import { execFileSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { resolve } from 'path';

if (!existsSync('public/audio')) {
  mkdirSync('public/audio', { recursive: true });
}

export const SHOWCASE_SCENES = [
  {
    num: 1,
    title: 'Welcome to PictoGen',
    tag: 'OFFLINE VECTOR ENGINE',
    mode: 'scene',
    style: 'cartoon',
    prompt: 'a happy boy walking across the slide with a blue bike under the sun and tree',
    narration: 'Welcome to PictoGen, a zero-dependency vector engine that creates illustrations and animated clips completely offline.',
    duration: 5.5,
  },
  {
    num: 2,
    title: 'Technical Callouts & Blueprint Schematics',
    tag: 'PRECISION ENGINEERING',
    mode: 'callout',
    style: 'blueprint',
    prompt: 'a blue bicycle with gears and handlebars',
    narration: 'Create precision technical schematics and anatomy diagrams with leader lines, part badges, and exact dimension brackets.',
    duration: 5.5,
  },
  {
    num: 3,
    title: 'Meticulous Studio Knolling',
    tag: 'FLAT-LAY DESIGN',
    mode: 'knolling',
    style: 'flat',
    prompt: 'apple, bike, tree, sun, coffee, book',
    narration: 'Organize your items into immaculate studio knolling flat-lays, aligned orthogonally on metric workshop cutting mats.',
    duration: 5.5,
  },
  {
    num: 4,
    title: 'Before vs After Comparison',
    tag: 'VERSUS SPLIT-SCREEN',
    mode: 'split',
    style: 'cartoon',
    prompt: 'sad boy and laughing boy',
    narration: 'Highlight transformations and contrasts with dynamic split-screens, comparing before and after states side by side.',
    duration: 5.5,
  },
  {
    num: 5,
    title: '2.5D Isometric Dioramas',
    tag: 'MINIATURE DEPTH',
    mode: 'isometric',
    style: 'flat',
    prompt: 'tree, house and car on a sunny day',
    narration: 'Bring objects into three dimensions with floating isometric dioramas, featuring grounded contact shadows and miniature depth.',
    duration: 5.5,
  },
  {
    num: 6,
    title: 'Pictorial Waffle Infographics',
    tag: 'ISOTYPE DATA GRAPHICS',
    mode: 'waffle',
    style: 'flat',
    prompt: '80% clean bicycles in city transit',
    narration: 'Transform statistical numbers into intuitive pictorial waffle charts, making data visual, human, and engaging.',
    duration: 5.5,
  },
  {
    num: 7,
    title: 'Animated Broadcast Clips & Coloring Pages',
    tag: 'UNLIMITED CREATIVITY',
    mode: 'scene',
    style: 'flat',
    genre: 'news',
    prompt: 'renewable-boom',
    narration: 'From animated documentaries and news bulletins with lower thirds, to interactive coloring books, PictoGen creates it all offline. 100% open source and commercial friendly.',
    duration: 7.2,
  },
];

console.log('Generating Natural Voice Audio for all 7 Showcase Scenes...');

const psCommands = SHOWCASE_SCENES.map((sc) => {
  const wavPath = resolve(`public/audio/showcase-${sc.num}.wav`).replace(/\\/g, '/');
  const safeText = sc.narration.replace(/'/g, "''").replace(/"/g, '`"');
  return `
$synth.SetOutputToWaveFile("${wavPath}")
$synth.Speak("${safeText}")
`;
}).join('\n');

const fullPsScript = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
if ($voices -contains "Microsoft Zira Desktop") {
    $synth.SelectVoice("Microsoft Zira Desktop")
} elseif ($voices -contains "Microsoft David Desktop") {
    $synth.SelectVoice("Microsoft David Desktop")
}
$synth.Rate = 0
$synth.Volume = 100
${psCommands}
$synth.Dispose()
`;

const psFile = 'scripts/build-audio.ps1';
writeFileSync(psFile, fullPsScript, 'utf8');

try {
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile]);
  console.log('✓ SUCCESS: All 7 voice narration audio files generated successfully:');
  SHOWCASE_SCENES.forEach((sc) => {
    const file = `public/audio/showcase-${sc.num}.wav`;
    const sz = statSync(file).size;
    console.log(`  - Scene ${sc.num}: ${file} (${Math.round(sz / 1024)} KB)`);
  });
} catch (err) {
  console.error('Error generating showcase audio:', err.message);
  process.exit(1);
}
