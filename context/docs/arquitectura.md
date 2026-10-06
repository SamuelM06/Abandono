# Arquitectura — Abandono Xuma

## Objetivo
Dashboard en tiempo real para la contingencia: total ingresadas, abandono y atendidas del skill `In_Contingencias`, con vista detalle y exportacion a Excel.

## Componentes
- `backend/` (FastAPI): API REST + scheduler 17:00 + generacion Excel + envio de correo.
- `frontend/` (React + Vite + Tailwind): Dashboard, Detalle, Exportar, Vista previa del correo.
- Base de datos PostgreSQL corporativa (esquema `ocm_retencion`, tabla `log_calls`). Conexion SOLO por variables de entorno (ver `backend/.env.example`).

## Flujo de datos
1. El front pide `/api/kpis?fecha=<seleccionada>&time_range=<rango>` (la fecha siempre la elige el usuario).
2. El backend filtra por `skill`, `typecall='InCall'` y ventana horaria.
3. `/api/hourly-stats` alimenta el grafico por hora; `/api/calls` la tabla paginada.
4. `POST /api/export` genera el Excel con el mismo filtro aplicado.
5. Todos los dias 17:00 (America/Bogota) el scheduler genera el Excel del dia y lo envia por correo.

## Reglas clave
- Nunca hardcodear fechas en SQL: toda consulta usa la fecha seleccionada en el front.
- Nunca versionar secretos: `backend/.env` esta en `.gitignore`.
- Skill fijo de contingencia: `In_Contingencias` (parametrizable por query `skill`).
