# Operacion diaria

## Manana
1. Abrir el Dashboard (modo en vivo, auto-actualiza cada 1 min).
2. Revisar KPIs del dia con filtro **Dia completo**.
3. A mitad del dia, cambiar a **Medio dia (8:00–12:00)** y exportar el Excel si lo piden.

## Tarde
1. ~17:10: abrir **Vista previa correo** y validar asunto, destinatarias, KPIs y adjunto.
2. 17:20: el sistema envia el correo automaticamente con el Excel del dia.
3. Si algo falla, envio manual: `POST /api/email/send-daily?fecha=AAAA-MM-DD`.

## Fuera de horario
- Usar el filtro **Fuera de horario** para ver llamadas antes de 8:00 o desde 17:30.
- La tabla Detalle permite filtrar por agente/resultado y paginar.

## Si no entran llamadas
- Verificar indicador de conexion en el header ("Conectado en vivo").
- Verificar `/api/health` y logs del backend.
