
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Zira Desktop")
$synth.Rate = 0
$synth.Volume = 100
$synth.SetOutputToWaveFile("public/audio/test.wav")
$synth.Speak("Welcome to PictoGen. A zero-dependency vector engine running completely offline.")
$synth.Dispose()
