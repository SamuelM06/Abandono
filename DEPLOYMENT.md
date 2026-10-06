# Guía de Despliegue - Abandono Xuma

## Opción 1: Tailscale (Recomendado - Más simple y seguro)

### En la máquina de la oficina (servidor):
```bash
# 1. Instalar Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# 2. Conectar a la red
sudo tailscale up

# 3. Obtener la IP de Tailscale (ej: 100.x.x.x)
tailscale ip -4

# 4. Ejecutar la app con Docker
docker-compose up -d
```

### En la máquina de la jefa (casa):
```bash
# 1. Instalar Tailscale
# Windows: https://tailscale.com/download/windows
# Mac: https://tailscale.com/download/mac

# 2. Conectar a la misma red (usar misma cuenta)
tailscale up

# 3. Acceder al dashboard
# http://100.x.x.x (la IP de Tailscale del servidor)
```

**Ventajas:**
- ✅ No requiere abrir puertos en el router
- ✅ Encriptación WireGuard automática
- ✅ Funciona detrás de CGNAT/firewalls corporativos
- ✅ Gratis para uso personal (hasta 100 dispositivos)
- ✅ La jefa accede como si estuviera en la LAN

---

## Opción 2: Cloudflare Tunnel (Gratis, sin instalar cliente en la jefa)

### En la máquina de la oficina:
```bash
# 1. Instalar cloudflared
# Windows: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# 2. Autenticar
cloudflared tunnel login

# 3. Crear túnel
cloudflared tunnel create abandono-xuma

# 4. Configurar DNS (ej: abandono.tudominio.com)
cloudflared tunnel route dns abandono-xuma abandono.tudominio.com

# 5. Crear config.yml
# Ver archivo cloudflared-config.yml abajo

# 6. Ejecutar
cloudflared tunnel run abandono-xuma
```

### cloudflared-config.yml:
```yaml
tunnel: abandono-xuma
credentials-file: /home/user/.cloudflared/xxx.json

ingress:
  - hostname: abandono.tudominio.com
    service: http://localhost:80
  - service: http_status:404
```

**Ventajas:**
- ✅ La jefa accede por URL normal (https://abandono.tudominio.com)
- ✅ No necesita instalar nada
- ✅ HTTPS automático con certificado válido
- ✅ Protección DDoS y WAF de Cloudflare gratis

---

## Opción 3: VPN Corporativa (Si ya tienen)

Si la empresa ya tiene VPN (Fortinet, Cisco, OpenVPN, etc.):
1. La jefa se conecta a la VPN corporativa
2. Accede a `http://IP_SERVIDOR:8000` o `http://localhost:80` si está en la misma red

---

## Variables de entorno requeridas (.env.production)

```bash
# Base de datos (valores reales SOLO en .env local, nunca en el repo)
DB_HOST=<DB_HOST>
DB_PORT=5432
DB_NAME=<DB_NAME>
DB_USER=<DB_USER>
DB_PASSWORD=<DB_PASSWORD>
DB_SCHEMA=<DB_SCHEMA>

# Email (CONFIGURAR ESTOS en .env local)
SMTP_HOST=<SMTP_HOST>
SMTP_PORT=587
SMTP_USER=<SMTP_USER>
SMTP_PASSWORD=<SMTP_APP_PASSWORD>  # No la contraseña normal, usa App Password
EMAIL_FROM=<EMAIL_FROM>
EMAIL_TO_JEFA=<EMAIL_JEFA>
EMAIL_TO_COORD=<EMAIL_SUPERVISORA>

# App
APP_HOST=0.0.0.0
APP_PORT=8000
FRONTEND_URL=http://localhost
```

### Para Gmail App Password:
1. Activar 2FA en la cuenta de Gmail
2. Ir a: https://myaccount.google.com/apppasswords
3. Crear nueva contraseña de aplicación "Abandono Xuma"
4. Usar esa contraseña en SMTP_PASSWORD

---

## Comandos útiles

```bash
# Construir y levantar
docker-compose up -d --build

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Detener
docker-compose down

# Reiniciar solo backend
docker-compose restart backend

# Backup manual de la BD (si necesitas; todo via variables de entorno, sin quemar credenciales)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -n $DB_SCHEMA > backup.sql
```

---

## Verificación post-despliegue

1. **Health check**: `curl http://localhost:8000/api/health`
2. **KPIs hoy**: `curl "http://localhost:8000/api/kpis?fecha=2026-10-06"`
3. **Frontend**: Abrir `http://localhost` en navegador
4. **Email test**: `curl -X POST "http://localhost:8000/api/email/test"`

---

## Estructura de carpetas en servidor

```
/opt/abandono-xuma/
├── docker-compose.yml
├── .env.production
├── backend/
│   └── (código backend)
├── frontend/
│   └── (código frontend)
└── logs/
    └── (logs de la app)
```

---

## Monitoreo y mantenimiento

- Los logs están en `docker-compose logs -f`
- El scheduler envía email automáticamente a las 17:20 (hora Colombia)
- Para ver emails enviados: revisar logs del backend
- La BD se conecta via variables de entorno al host corporativo (no se replica localmente)