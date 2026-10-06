# Script de despliegue rápido para Abandono Xuma (PowerShell)

Write-Host "🚀 Desplegando Abandono Xuma..." -ForegroundColor Green

# Verificar Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker no está instalado. Instálalo primero." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose no está instalado." -ForegroundColor Red
    exit 1
}

# Verificar .env
if (-not (Test-Path ".env.production")) {
    Write-Host "⚠️  No existe .env.production, copiando desde .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env.production"
    Write-Host "✏️  EDITA .env.production con tus credenciales de email ANTES de continuar" -ForegroundColor Yellow
    Write-Host "   Especialmente: SMTP_USER, SMTP_PASSWORD, EMAIL_TO_JEFA, EMAIL_TO_COORD" -ForegroundColor Yellow
    Read-Host "Presiona Enter cuando hayas editado .env.production..."
}

# Cargar variables de entorno
$envContent = Get-Content ".env.production" | Where-Object { $_ -notmatch '^#' -and $_ -match '=' }
foreach ($line in $envContent) {
    $parts = $line.Split('=', 2)
    if ($parts.Length -eq 2) {
        $env:$parts[0] = $parts[1]
    }
}

# Construir y levantar
Write-Host "🔨 Construyendo imágenes..." -ForegroundColor Cyan
docker-compose build

Write-Host "🚀 Levantando servicios..." -ForegroundColor Cyan
docker-compose up -d

# Esperar a que estén listos
Write-Host "⏳ Esperando a que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Health checks
Write-Host "🔍 Verificando health checks..." -ForegroundColor Cyan
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Backend OK" -ForegroundColor Green
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost/" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend OK" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Frontend podría no estar listo aún" -ForegroundColor Yellow
}

# Obtener IP de Tailscale si está instalado
$tailscaleIp = "No disponible"
if (Get-Command tailscale -ErrorAction SilentlyContinue) {
    $tailscaleIp = tailscale ip -4 2>$null
    if (-not $tailscaleIp) { $tailscaleIp = "No disponible" }
}

Write-Host ""
Write-Host "✅ ¡Despliegue completado!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Dashboard: http://localhost" -ForegroundColor Cyan
Write-Host "🔧 API Docs:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "💚 Health:    http://localhost:8000/api/health" -ForegroundColor Cyan
Write-Host ""
if ($tailscaleIp -ne "No disponible") {
    Write-Host "🔗 Para la jefa (via Tailscale): http://$tailscaleIp" -ForegroundColor Magenta
}
Write-Host ""
Write-Host "📧 Para probar email: curl -X POST http://localhost:8000/api/email/test" -ForegroundColor Gray
Write-Host "📧 Para envío manual: curl -X POST `"http://localhost:8000/api/email/send-daily?fecha=$(Get-Date -Format 'yyyy-MM-dd')`"" -ForegroundColor Gray