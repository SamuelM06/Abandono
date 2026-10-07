# Filtros y KPIs

## KPIs
- **Total llamadas ingresadas**: `COUNT(*)` con `skill + typecall` en la fecha/ventana seleccionada.
- **Total abandono**: `resultcall='10164'` (`resultcalldesc='Abandoned'`).
- **Total atendidas**: `resultcall='16'` (`Normal Clearing`, con `resultdesc` como CONTACTO EXITOSO, DATOS INCOMPLETOS, CAIDA DE LLAMADA, etc.).

## Lineas (skills) — filtro multi-seleccion
Una sola vista para todas las lineas: se eligen varias a la vez y se filtra por
`skill = ANY(...) AND typecall = ANY(...)`.

| Skill | Tipo | Etiqueta | En el filtro |
|---|---|---|---|
| In_Contingencias | InCall | Contingencia | Si |
| INBOUD_CARIBE | InCall | Caribe | Si |
| INBOUN_SURTIGAS | InCall | Surtigas | Si |
| INBOUND_GDO | InCall | GDO | Si |
| INBOUD_CEO | InCall | CEO | Si |
| MANUAL_COMPETENCIA | CallManual | Manual competencia | **No** (outbound: no hay abandono que devolver) |

El tipo de llamada se deduce del skill (ver `SKILL_REGISTRY` en `services.py`) porque un mismo
nombre puede existir en la BD como `InCall` y como `CallManual`. Por eso una campana manual como
`MANUAL_COMPETENCIA` no se mezcla con el entrante. `GET /api/skills` devuelve el catalogo con el
movimiento de los ultimos 30 dias.

## Ventanas horarias (jornada 8:00–17:30)
| Filtro | Ventana SQL |
|---|---|
| Todo el dia | sin filtro horario (la fecha ya limita al dia seleccionado) |
| Medio dia | `fecha::time` 08:00–12:00 |
| Dia completo | `fecha::time` 08:00–17:30 |
| Fuera de horario | `fecha::time >= 17:30 OR fecha::time < 08:00` |

La tabla **Detalle de llamadas** usa `todo_dia` por defecto, para que salgan todas las llamadas del dia
(incluidas las que quedaron en abandono antes de las 8:00 o desde las 17:30).

## Donde se aplica
- `GET /api/skills?dias=` → catalogo de lineas para el filtro del front.
- `GET /api/kpis?fecha=&skills=&time_range=` → respeta fecha + lineas + ventana.
- `GET /api/hourly-stats?fecha=&skills=&time_range=` → idem.
- `GET /api/calls?fecha=&skills=&time_range=&page=` → tabla paginada con el mismo filtro.
- `POST /api/export` (`fecha_inicio`, `fecha_fin`, `skills`, `time_range`, `solo_abandono`) y `GET /api/export/daily?fecha=&skills=` → Excel con el filtro aplicado.

## "Sin atencion" (a devolver la llamada)
`POST /api/export` con `solo_abandono=true` genera el reporte de los numeros a devolver:

| Tipo de llamada | Criterio |
|---|---|
| InCall (entrante) | `resultcall` 10164 (Abandoned) + 10163 (Queue time out) **o** `resultdesc='Out of Time IN'` |
| CallManual (outbound) | **Nada**: en una campana manual que no contesten (`19 No Answer`, `20 Subscriber absent`) es el resultado esperado de una llamada saliente, no una llamada que haya que devolver. El reporte sale vacio. |

Notas de criterio:
- `resultcall='400'` (Rejected) **no** significa abandono: tambien es `Skill in pause`, que se excluye
  a proposito. Por eso "Out of Time IN" se busca por `resultdesc` y no por el codigo.
- Abandono solo tiene sentido para quien **recibe** la llamada. El filtro "sin atencion" se arma segun
  el tipo de llamada de la linea elegida (`no_atendida_codes`); si es manual, el filtro SQL es `AND FALSE`.
- Los KPIs del reporte salen de las filas exportadas (`kpis_from_calls`), no de una consulta aparte:
  asi "Resumen KPIs" y "Detalle Abandono" siempre cuadran.
- El Excel responde `X-Total-Filas` para avisar en el front cuando el filtro no tiene nada que devolver.

## Exportaciones
- **Exportar Excel**: reporte completo del filtro (KPIs del rango + detalle de llamadas).
- **Exportar Abandono**: el reporte de "sin atencion" de la seccion anterior, con sus tiles
  (sin atencion / en abandono / fuera de horario / queue time out) y el detalle por hora.

## Nota
La fecha siempre viaja como parametro (`YYYY-MM-DD`) desde el front. No existe ninguna fecha quemada en el codigo.
