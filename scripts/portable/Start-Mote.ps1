$ErrorActionPreference = "Stop"

$rootDir = $PSScriptRoot
$appDir = Join-Path $rootDir "app"
$nodePath = Join-Path $rootDir "runtime\node.exe"
$pidFile = Join-Path $rootDir ".mote.pid"
$logFile = Join-Path $rootDir "mote.log"
$errorLogFile = Join-Path $rootDir "mote-error.log"
$port = if ($env:MOTE_PORT) { $env:MOTE_PORT } else { "3000" }
$url = "http://127.0.0.1:$port"

if (Test-Path $pidFile) {
  $savedPid = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($savedPid -and (Get-Process -Id $savedPid -ErrorAction SilentlyContinue)) {
    Start-Process $url
    exit 0
  }
  Remove-Item $pidFile -Force
}

Write-Host "Starting Mote..."
$env:MOTE_STORAGE_ROOT = $rootDir
$env:HOSTNAME = "127.0.0.1"
$env:PORT = $port
$process = Start-Process -FilePath $nodePath `
  -ArgumentList "server.js" `
  -WorkingDirectory $appDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput $logFile `
  -RedirectStandardError $errorLogFile `
  -PassThru
Set-Content -Path $pidFile -Value $process.Id

for ($attempt = 0; $attempt -lt 60; $attempt++) {
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1 | Out-Null
    Write-Host "Mote is ready: $url"
    Start-Process $url
    exit 0
  } catch {
    if ($process.HasExited) { break }
    Start-Sleep -Milliseconds 500
  }
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Error "Mote failed to start. See mote.log and mote-error.log."
