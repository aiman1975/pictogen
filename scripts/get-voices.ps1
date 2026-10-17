
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices()
foreach ($v in $voices) {
    [Console]::WriteLine($v.VoiceInfo.Name + " (" + $v.VoiceInfo.Culture.Name + ")")
}
