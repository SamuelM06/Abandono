# Correo automatico 17:00 + vista previa

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
- Flujo recomendado: revisar preview ~16:50 → si todo ok, dejar que el scheduler envie a las 17:00 (o `POST /api/email/send-daily?fecha=...` para envio manual).

## Scheduler
`APScheduler` con `CronTrigger(hour=17, minute=0)` en zona `America/Bogota`.
