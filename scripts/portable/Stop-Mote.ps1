$ErrorActionPreference = "Stop"

$pidFile = Join-Path $PSScriptRoot ".mote.pid"
if (-not (Test-Path $pidFile)) {
  Write-Host "Mote is not running."
  exit 0
}

$savedPid = Get-Content $pidFile -ErrorAction SilentlyContinue
$process = if ($savedPid) { Get-Process -Id $savedPid -ErrorAction SilentlyContinue } else { $null }
if ($process) {
  Stop-Process -Id $savedPid
  Write-Host "Mote stopped."
} else {
  Write-Host "Mote is not running."
}
Remove-Item $pidFile -Force
