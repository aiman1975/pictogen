
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

$synth.SetOutputToWaveFile("C:/Users/User/.gemini/antigravity/scratch/pictogen/public/audio/showcase-1.wav")
$synth.Speak("Welcome to PictoGen, a zero-dependency vector engine that creates illustrations and animated clips completely offline.")


$synth.SetOutputToWaveFile("C:/Users/User/.gemini/antigravity/scratch/pictogen/public/audio/showcase-2.wav")
$synth.Speak("Create precision technical schematics and anatomy diagrams with leader lines, part badges, and exact dimension brackets.")


$synth.SetOutputToWaveFile("C:/Users/User/.gemini/antigravity/scratch/pictogen/public/audio/showcase-3.wav")
$synth.Speak("Organize your items into immaculate studio knolling flat-lays, aligned orthogonally on metric workshop cutting mats.")


$synth.SetOutputToWaveFile("C:/Users/User/.gemini/antigravity/scratch/pictogen/public/audio/showcase-4.wav")
$synth.Speak("Highlight transformations and contrasts with dynamic split-screens, comparing before and after states side by side.")


$synth.SetOutputToWaveFile("C:/Users/User/.gemini/antigravity/scratch/pictogen/public/audio/showcase-5.wav")
$synth.Speak("Bring objects into three dimensions with floating isometric dioramas, featuring grounded contact shadows and miniature depth.")


$synth.SetOutputToWaveFile("C:/Users/User/.gemini/antigravity/scratch/pictogen/public/audio/showcase-6.wav")
$synth.Speak("Transform statistical numbers into intuitive pictorial waffle charts, making data visual, human, and engaging.")


$synth.SetOutputToWaveFile("C:/Users/User/.gemini/antigravity/scratch/pictogen/public/audio/showcase-7.wav")
$synth.Speak("From animated documentaries and news bulletins with lower thirds, to interactive coloring books, PictoGen creates it all offline. 100% open source and commercial friendly.")

$synth.Dispose()
