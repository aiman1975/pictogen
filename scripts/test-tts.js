import { execFileSync } from 'child_process';
import { writeFileSync, existsSync, statSync, mkdirSync } from 'fs';

if (!existsSync('public/audio')) {
  mkdirSync('public/audio', { recursive: true });
}

const psScript = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Zira Desktop")
$synth.Rate = 0
$synth.Volume = 100
$synth.SetOutputToWaveFile("public/audio/test.wav")
$synth.Speak("Welcome to PictoGen. A zero-dependency vector engine running completely offline.")
$synth.Dispose()
`;

writeFileSync('scripts/generate-test-audio.ps1', psScript, 'utf8');

try {
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/generate-test-audio.ps1']);
  if (existsSync('public/audio/test.wav')) {
    const stats = statSync('public/audio/test.wav');
    console.log('✓ SUCCESS: Generated WAV file size:', stats.size, 'bytes');
  }
} catch (e) {
  console.error('Error generating audio:', e.message);
}
