# Run from PowerShell on the development PC with Node 24 and dependencies installed.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$picker = New-Object System.Windows.Forms.OpenFileDialog
$picker.Title = 'Select Google Desktop OAuth JSON'
$picker.Filter = 'OAuth JSON (*.json)|*.json'
if ($picker.ShowDialog() -ne 'OK') { return }
$config = Get-Content -LiteralPath $picker.FileName -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $config.installed.client_id -or -not $config.installed.client_secret) { throw 'Choose a Desktop app OAuth JSON.' }
$secret = Read-Host 'KMA serviceKey (data.go.kr)' -AsSecureString
$repo = Split-Path -Parent $PSScriptRoot
$privateDir = Join-Path $env:LOCALAPPDATA 'MikangMemoDev'
New-Item -ItemType Directory -Path $privateDir -Force | Out-Null
$server = $null
Push-Location $repo
try {
  $serverInfo = New-Object System.Diagnostics.ProcessStartInfo
  $serverInfo.FileName = (Get-Command node.exe).Source
  $serverInfo.Arguments = 'server/index.js'
  $serverInfo.WorkingDirectory = $repo
  $serverInfo.UseShellExecute = $false
  $serverInfo.CreateNoWindow = $true
  $serverInfo.EnvironmentVariables['GOOGLE_DESKTOP_OAUTH_FILE'] = $picker.FileName
  $serverInfo.EnvironmentVariables['KMA_SERVICE_KEY'] = (New-Object System.Net.NetworkCredential('', $secret)).Password
  $serverInfo.EnvironmentVariables['MEMO_DB'] = Join-Path $privateDir 'usage.sqlite'
  $serverInfo.EnvironmentVariables['HOST'] = '127.0.0.1'
  $serverInfo.EnvironmentVariables['PORT'] = '8787'
  $server = [System.Diagnostics.Process]::Start($serverInfo)
  $serverInfo.EnvironmentVariables.Remove('KMA_SERVICE_KEY')
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 200
    if ($server.HasExited) { throw 'Server could not start. Check Node 24, dependencies, and port 8787.' }
    try {
      $ready = (Invoke-RestMethod -Uri 'http://127.0.0.1:8787/calendar/client' -TimeoutSec 2).clientId -eq $config.installed.client_id
    } catch {}
    if ($ready) { break }
  }
  if (-not $ready) { throw 'Local server did not become ready.' }
  $previousOrigin = $env:MEMO_AI_ORIGIN
  try {
    $env:MEMO_AI_ORIGIN = 'http://127.0.0.1:8787'
    & npm.cmd start
  } finally { $env:MEMO_AI_ORIGIN = $previousOrigin }
} finally {
  if ($server -and -not $server.HasExited) { $server.Kill() }
  $secret.Dispose()
  $picker.Dispose()
  Pop-Location
}
