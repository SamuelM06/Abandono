# Correo automatico 17:20 + vista previa

## Firma
Fuente: `context/Firma/FirmaSamuel.pdf` (SAMUEL DAVID MENA G. — Especialista de Datos | Experiencia al Cliente). El template HTML la replica con colores de marca (`context/manual_marca/`). Los datos viven en `EMAIL_SIGNATURE_*` del `.env` local.

## Destinatarias
Se configuran SOLO en el `.env` local (no versionado):
- `EMAIL_TO_JEFA` → jefa (To)
- `EMAIL_TO_COORD` → supervisora (Cc)

## Contenido
- Asunto: `Reporte Diario Abandono Xuma - DD/MM/AAAA`.
- Cuerpo bonito en HTML con tabla de KPIs del dia, skill y fecha.
- Adjunto: `Reporte Abandono AAAA-MM-DD.xlsx` (hoja Resumen KPIs + Detalle por hora + Detalle llamadas).
- Firma tipo Outlook configurable con `EMAIL_SIGNATURE_NOMBRE/CARGO/EMAIL/TELEFONO/WEB` (pegar la firma real de Outlook en el `.env` local).

## Vista previa (sin enviar)
- Endpoint: `GET /api/email/preview?fecha=AAAA-MM-DD`.
- Devuelve asunto, To/Cc, nombre de adjunto, KPIs y `body_html` SIN enviar ni generar el Excel.
- En el Dashboard hay boton **"Vista previa correo"** que muestra el modal con el cuerpo renderizado.
- Flujo recomendado: revisar preview ~17:10 → si todo ok, dejar que el scheduler envie a las 17:20 (o `POST /api/email/send-daily?fecha=...` para envio manual).

## Scheduler
`APScheduler` con `CronTrigger(hour=17, minute=20)` en zona `America/Bogota`. La fecha se calcula al momento del disparo.

## Envio por Outlook (cuenta corporativa)
El sistema envia por SMTP. Si la cuenta remitente es corporativa de Outlook/Exchange, configurar en el `.env` local:
- `SMTP_HOST=smtp.office365.com`, `SMTP_PORT=587`
- `SMTP_USER` = correo corporativo, `SMTP_PASSWORD` = contrasena de aplicacion de esa cuenta
- `EMAIL_FROM` = mismo correo corporativo
