# Modo en vivo SIN ventanas: backend (pythonw) + frontend (preview) ocultos.
# Uso: doble clic en en_vivo_oculto.vbs (este .ps1 se ejecuta oculto desde el .vbs).
$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$logDir = Join-Path $root 'scripts\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Detener instancias previas por puerto (8000 backend, 5173 front)
foreach ($port in @(8000, 5173)) {
  $conns = netstat -ano | Select-String ":$port\s" | Select-String 'LISTENING'
  foreach ($c in $conns) {
    $pid = ($c.ToString() -split '\s+')[-1]
    if ($pid -match '^\d+$') { Stop-Process -Id $pid -Force }
  }
}

$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

# Backend oculto con pythonw (sin consola)
$pythonw = Join-Path (Split-Path (Get-Command python).Source) 'pythonw.exe'
if (-not (Test-Path $pythonw)) { $pythonw = 'pythonw' }
Start-Process -FilePath $pythonw -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000' -WorkingDirectory $backend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'backend.log') -RedirectStandardError (Join-Path $logDir 'backend.err.log')

# Frontend: build ya hecho -> servir dist en modo preview oculto
# OJO: usar npm.cmd (el shim .cmd); Start-Process con 'npm' a secas no arranca.
$npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npmCmd) { $npmCmd = 'C:\Program Files\nodejs\npm.cmd' }
if (Test-Path $npmCmd) {
  $frontLog = Join-Path $logDir 'front.log'
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "`"$npmCmd`" run preview -- --host 0.0.0.0 --port 5173 >> `"$frontLog`" 2>&1" -WorkingDirectory $frontend -WindowStyle Hidden
}

"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] en vivo iniciado (backend :8000, front :5173)" | Out-File (Join-Path $logDir 'vivo.log') -Append
