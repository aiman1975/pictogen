// Offline text-to-speech to a .wav file using the voice engine that ships with the OS:
//   Windows: System.Speech via PowerShell (prefers Microsoft Zira, then David)
//   macOS:   `say`
//   Linux:   `espeak-ng` or `espeak` (e.g. `sudo apt install espeak-ng`)
import { spawnSync } from 'node:child_process';

const PS_SPEAK = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
foreach ($v in @("Microsoft Zira Desktop", "Microsoft David Desktop")) {
  if ($voices -contains $v) { $synth.SelectVoice($v); break }
}
$synth.SetOutputToWaveFile($env:PG_TTS_OUT)
$synth.Speak($env:PG_TTS_TEXT)
$synth.Dispose()
`;

const found = (cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).error?.code !== 'ENOENT';

/** Name of the TTS engine available on this machine, or null. */
export function ttsEngine() {
  if (process.platform === 'win32') return 'powershell';
  if (process.platform === 'darwin') return 'say';
  return ['espeak-ng', 'espeak'].find(found) ?? null;
}

/** Speaks `text` into the .wav file `outPath`. Throws if no engine is available or it fails. */
export function speakToWav(text, outPath) {
  const engine = ttsEngine();
  let r;
  if (engine === 'powershell') {
    // Text and path travel in environment variables, so quotes in the narration can't break the script.
    r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', PS_SPEAK], {
      env: { ...process.env, PG_TTS_TEXT: text, PG_TTS_OUT: outPath },
    });
  } else if (engine === 'say') {
    r = spawnSync('say', ['-o', outPath, '--file-format=WAVE', '--data-format=LEI16@22050', text]);
  } else if (engine) {
    r = spawnSync(engine, ['-w', outPath, '--stdin'], { input: text });
  } else {
    throw new Error('No text-to-speech engine found. On Linux install espeak-ng (e.g. `sudo apt install espeak-ng`).');
  }
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${engine} exited with ${r.status}: ${String(r.stderr || '').trim()}`);
}
