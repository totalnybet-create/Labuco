$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Has-Command($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

$repoUrl = 'https://github.com/totalnybet-create/Labuco.git'
$root = Join-Path $env:USERPROFILE 'Labuco'
$operatorDir = Join-Path $root 'operator'

Write-Step 'Sprawdzam wymagania systemowe'
if (-not (Has-Command 'winget')) {
  throw 'Brak winget. Zainstaluj/zaaktualizuj App Installer ze sklepu Microsoft Store, a potem uruchom ten bootstrap ponownie.'
}

if (-not (Has-Command 'git')) {
  Write-Step 'Instaluję Git'
  winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements --silent
  $env:Path += ';C:\Program Files\Git\cmd'
}

$dockerCli = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCli) {
  Write-Step 'Instaluję Docker Desktop'
  winget install --id Docker.DockerDesktop -e --accept-package-agreements --accept-source-agreements
  $dockerExe = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
  if (Test-Path $dockerExe) { $env:Path += ';C:\Program Files\Docker\Docker\resources\bin' }
}

if (-not (Test-Path $root)) {
  Write-Step 'Pobieram repozytorium Labuco'
  git clone $repoUrl $root
} else {
  Write-Step 'Aktualizuję repozytorium Labuco'
  git -C $root fetch origin
  git -C $root checkout main
  git -C $root pull --ff-only origin main
}

Write-Step 'Przygotowuję konfigurację Operatora'
$envFile = Join-Path $operatorDir '.env'
if (-not (Test-Path $envFile)) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  $apiToken = [Convert]::ToHexString($bytes).ToLowerInvariant()
  @"
OPERATOR_API_TOKEN=$apiToken
GITHUB_OPERATOR_TOKEN=
BROWSER_HEADLESS=1
BROWSER_CDP_URL=
"@ | Set-Content -Path $envFile -Encoding UTF8
}

$desktopExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
if (Test-Path $desktopExe) {
  if (-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue)) {
    Write-Step 'Uruchamiam Docker Desktop'
    Start-Process $desktopExe
  }
}

Write-Step 'Czekam aż Docker Engine będzie gotowy'
$ready = $false
for ($i=0; $i -lt 90; $i++) {
  try {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  } catch {}
  Start-Sleep -Seconds 2
}
if (-not $ready) {
  throw 'Docker Desktop nie uruchomił jeszcze silnika. Otwórz Docker Desktop, dokończ ewentualną konfigurację/WSL lub restart Windows i uruchom bootstrap ponownie.'
}

Write-Step 'Buduję i uruchamiam Operatora'
Push-Location $operatorDir
try {
  docker compose up --build -d
} finally {
  Pop-Location
}

Write-Step 'Sprawdzam stan Operatora'
Start-Sleep -Seconds 3
$health = Invoke-RestMethod -Uri 'http://localhost:8080/health' -TimeoutSec 10
if (-not $health.ok) { throw 'Operator wystartował, ale healthcheck nie zwrócił OK.' }

Write-Host "`nGOTOWE: Operator działa na tym komputerze." -ForegroundColor Green
Write-Host 'Panel lokalny: http://localhost:8080'
Write-Host "Konfiguracja: $envFile"
Write-Host 'Nie wysyłaj zawartości pliku .env w czacie.'
