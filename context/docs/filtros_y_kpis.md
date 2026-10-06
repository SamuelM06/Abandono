# Filtros y KPIs

## KPIs
- **Total llamadas ingresadas**: `COUNT(*)` con `skill + typecall='InCall'` en la fecha/ventana seleccionada.
- **Total abandono**: `resultcall='10164'` (`resultcalldesc='Abandoned'`).
- **Total atendidas**: `resultcall='16'` (`Normal Clearing`, con `resultdesc` como CONTACTO EXITOSO, DATOS INCOMPLETOS, CAIDA DE LLAMADA, etc.).

## Ventanas horarias (jornada 8:00–17:30)
| Filtro | Ventana SQL |
|---|---|
| Medio dia | `fecha::time` 08:00–12:00 |
| Dia completo | `fecha::time` 08:00–17:30 |
| Fuera de horario | `fecha::time >= 17:30 OR fecha::time < 08:00` |

## Donde se aplica
- `GET /api/kpis?fecha=&time_range=` → respeta fecha + ventana.
- `GET /api/hourly-stats?fecha=&time_range=` → respeta fecha + ventana.
- `GET /api/calls?fecha=&time_range=&page=` → tabla paginada con el mismo filtro.
- `POST /api/export` (`fecha_inicio`, `fecha_fin`, `time_range`) y `GET /api/export/daily?fecha=&time_range=` → Excel con el filtro aplicado.

## Nota
La fecha siempre viaja como parametro (`YYYY-MM-DD`) desde el front. No existe ninguna fecha quemada en el codigo.
