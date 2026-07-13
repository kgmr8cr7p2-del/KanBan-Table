Add-Type -AssemblyName System.Windows.Forms

$target = Get-Date -Hour 16 -Minute 50 -Second 0
if ((Get-Date) -gt $target) {
    $target = $target.AddDays(1)
}

$wait = ($target - (Get-Date)).TotalSeconds
Write-Host "Жду до $($target.ToString('HH:mm:ss')). Нажму Enter через $([math]::Round($wait)) сек..."
Start-Sleep -Seconds $wait

[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Write-Host "Enter нажат в $(Get-Date -Format 'HH:mm:ss')"
