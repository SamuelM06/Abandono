# Abandono Xuma

Dashboard en tiempo real para el seguimiento de la contingencia del call center: total de llamadas ingresadas, abandono y atendidas del skill de contingencia, con vista detalle, exportacion a Excel y reporte automatico por correo.

> **Seguridad:** este repositorio NO contiene credenciales, hosts, usuarios, contrasenas ni correos reales. Todo lo sensible vive en variables de entorno / `backend/.env` local (no versionado). Ver `backend/.env.example`.

## Estructura

```
abandono_xuma/
├── backend/               # API FastAPI + scheduler + Excel + correo
│   ├── app/               # main, routes, services, excel_export, email_service, scheduler, database
│   ├── Dockerfile
│   └── .env.example       # PLANTILLA (sin datos reales)
├── frontend/              # React + Vite + Tailwind (Dashboard, Detalle, Export, Preview correo)
│   ├── src/components/
│   └── .env.example
├── context/
│   ├── manual_marca/      # Manual de marca Xuma
│   ├── Firma/             # Firma institucional (PDF fuente de la firma del correo)
│   └── docs/              # Documentacion de procesos (arquitectura, filtros, correo, operacion, despliegue)
├── scripts/               # Modo en vivo oculto en Windows (sin ventanas PowerShell)
├── docker-compose.yml
├── DEPLOYMENT.md
└── README.md
```

## KPIs y filtros

- **Ingresadas / Abandono (`Abandoned`) / Atendidas (`Normal Clearing`)** del skill de contingencia.
- Filtros por **fecha seleccionada** (nunca hardcodeada) y ventana: **Medio dia (8–12)**, **Dia completo (8–17:30)**, **Fuera de horario**.
- Detalle en `context/docs/filtros_y_kpis.md`.

## Puesta en marcha (local)

```bash
# 1. Backend
cp backend/.env.example backend/.env   # completar valores reales (local)
cd backend && pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 2. Frontend (otra terminal)
cd frontend && npm install
cp .env.example .env                   # VITE_API_BASE=http://localhost:8000/api
npm run dev                            # http://localhost:5173
```

## Modo en vivo sin ventanas (Windows)

- Doble clic en `scripts\en_vivo_oculto.vbs` (backend `pythonw` + front en preview, todo oculto; logs en `scripts\logs\`).
- Detener: `scripts\detener.bat`.
- Detalle en `context/docs/despliegue_acceso.md`.

## Correo automatico 17:00 + vista previa

- Scheduler diario 17:00 (America/Bogota) con Excel adjunto `Reporte Abandono AAAA-MM-DD.xlsx`.
- Destinatarias y firma de Outlook se configuran en el `.env` local (`EMAIL_TO_JEFA`, `EMAIL_TO_COORD`, `EMAIL_SIGNATURE_*`).
- **Vista previa sin enviar:** boton "Vista previa correo" en el Dashboard o `GET /api/email/preview?fecha=AAAA-MM-DD`.
- Detalle en `context/docs/correo_automatico.md` y operacion en `context/docs/operacion_diaria.md`.

## Acceso remoto para la jefa

Tailscale (recomendado), Cloudflare Tunnel o VPN corporativa. Ver `DEPLOYMENT.md` y `context/docs/despliegue_acceso.md`.

## Verificacion

- Backend: `python -m py_compile` OK · `GET /api/health` OK.
- Frontend: `npm run build` OK.
- Datos reales: filtros `medio_dia` vs `dia_completo` devuelven totales distintos (filtro aplicado en SQL).
