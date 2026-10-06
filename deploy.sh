#!/bin/bash
# Script de despliegue rápido para Abandono Xuma

set -e

echo "🚀 Desplegando Abandono Xuma..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Instálalo primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado."
    exit 1
fi

# Verificar .env
if [ ! -f .env.production ]; then
    echo "⚠️  No existe .env.production, copiando desde .env.example..."
    cp .env.example .env.production
    echo "✏️  EDITA .env.production con tus credenciales de email ANTES de continuar"
    echo "   Especialmente: SMTP_USER, SMTP_PASSWORD, EMAIL_TO_JEFA, EMAIL_TO_COORD"
    read -p "Presiona Enter cuando hayas editado .env.production..."
fi

# Cargar variables de entorno
export $(cat .env.production | grep -v '^#' | xargs)

# Construir y levantar
echo "🔨 Construyendo imágenes..."
docker-compose build

echo "🚀 Levantando servicios..."
docker-compose up -d

# Esperar a que estén listos
echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# Health checks
echo "🔍 Verificando health checks..."
for i in {1..30}; do
    if curl -sf http://localhost:8000/api/health > /dev/null; then
        echo "✅ Backend OK"
        break
    fi
    sleep 2
done

if curl -sf http://localhost/ > /dev/null; then
    echo "✅ Frontend OK"
else
    echo "⚠️  Frontend podría no estar listo aún"
fi

# Obtener IP de Tailscale si está instalado
if command -v tailscale &> /dev/null; then
    TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "No disponible")
    echo ""
    echo "🌐 Tailscale IP: $TAILSCALE_IP"
fi

echo ""
echo "✅ ¡Despliegue completado!"
echo ""
echo "📊 Dashboard: http://localhost"
echo "🔧 API Docs:  http://localhost:8000/docs"
echo "💚 Health:    http://localhost:8000/api/health"
echo ""
if [ "$TAILSCALE_IP" != "No disponible" ]; then
    echo "🔗 Para la jefa (via Tailscale): http://$TAILSCALE_IP"
fi
echo ""
echo "📧 Para probar email: curl -X POST http://localhost:8000/api/email/test"
echo "📧 Para envío manual: curl -X POST \"http://localhost:8000/api/email/send-daily?fecha=$(date +%Y-%m-%d)\""