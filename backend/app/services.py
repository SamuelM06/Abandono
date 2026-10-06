from datetime import datetime, date, time
from typing import List, Tuple, Optional
from app.database import get_db_cursor
from app.schemas import CallDetail, TimeRange, TIME_RANGES


SKILL_CONTINGENCIA = "In_Contingencias"
ABANDONED_RESULTCALL = "10164"
ANSWERED_RESULTCALL = "16"
IN_CALL_TYPE = "InCall"


def get_schema() -> str:
    from app.database import get_settings
    return get_settings().db_schema


def build_time_filter(time_range: Optional[TimeRange]) -> Tuple[str, list]:
    """Devuelve (fragmento SQL, params) segun el rango seleccionado.

    - medio_dia:     fecha::time entre 08:00 y 12:00
    - dia_completo:  fecha::time entre 08:00 y 17:30
    - fuera_horario: fecha::time >= 17:30 OR fecha::time < 08:00
    - None:          sin filtro horario (se usa fecha completa seleccionada)
    """
    if not time_range or time_range not in TIME_RANGES:
        return "", []
    if time_range == TimeRange.FUERA_HORARIO:
        return " AND (fecha::time >= %s OR fecha::time < %s)", [time(17, 30), time(8, 0)]
    start_time, end_time = TIME_RANGES[time_range]
    return " AND fecha::time >= %s AND fecha::time <= %s", [start_time, end_time]


def _with_dedup(base: dict) -> dict:
    # Unicos = numeros distintos (no vacios) + filas sin numero (no se pueden deduplicar).
    # Duplicados = resto: llamadas repetidas del mismo numero (solo cuenta el primer registro).
    base["total_duplicados"] = max(0, (base["total_ingresadas"] or 0) - (base["total_unicos"] or 0))
    return base


DEDUP_SELECT = """
    COUNT(DISTINCT NULLIF(TRIM(numbercall), '')) as numeros_distintos,
    COUNT(*) FILTER (WHERE NULLIF(TRIM(numbercall), '') IS NULL) as sin_numero
"""


def get_kpis_for_date(
    target_date: date,
    skill: str = SKILL_CONTINGENCIA,
    time_range: Optional[TimeRange] = None,
) -> dict:
    time_filter, time_params = build_time_filter(time_range)
    with get_db_cursor() as cur:
        query = f"""
            SELECT
                COUNT(*) as total_ingresadas,
                COUNT(*) FILTER (WHERE resultcall = %s) as total_abandono,
                COUNT(*) FILTER (WHERE resultcall = %s) as total_atendidas,
                {DEDUP_SELECT}
            FROM {get_schema()}.log_calls
            WHERE fecha::date = %s
            AND skill = %s
            AND typecall = %s
            {time_filter}
        """
        cur.execute(query, (ABANDONED_RESULTCALL, ANSWERED_RESULTCALL, target_date, skill, IN_CALL_TYPE, *time_params))
        row = cur.fetchone()
        return _with_dedup({
            "total_ingresadas": row[0] or 0,
            "total_abandono": row[1] or 0,
            "total_atendidas": row[2] or 0,
            "total_unicos": (row[3] or 0) + (row[4] or 0),
        })


def get_kpis_for_datetime_range(
    fecha_inicio: datetime,
    fecha_fin: datetime,
    skill: str = SKILL_CONTINGENCIA
) -> dict:
    with get_db_cursor() as cur:
        query = f"""
            SELECT
                COUNT(*) as total_ingresadas,
                COUNT(*) FILTER (WHERE resultcall = %s) as total_abandono,
                COUNT(*) FILTER (WHERE resultcall = %s) as total_atendidas,
                {DEDUP_SELECT}
            FROM {get_schema()}.log_calls
            WHERE fecha >= %s AND fecha <= %s
            AND skill = %s
            AND typecall = %s
        """
        cur.execute(query, (ABANDONED_RESULTCALL, ANSWERED_RESULTCALL, fecha_inicio, fecha_fin, skill, IN_CALL_TYPE))
        row = cur.fetchone()
        return _with_dedup({
            "total_ingresadas": row[0] or 0,
            "total_abandono": row[1] or 0,
            "total_atendidas": row[2] or 0,
            "total_unicos": (row[3] or 0) + (row[4] or 0),
        })


def get_calls_detail(
    fecha_inicio: datetime,
    fecha_fin: datetime,
    skill: str = SKILL_CONTINGENCIA,
    time_range: Optional[TimeRange] = None,
    page: int = 1,
    page_size: int = 50
) -> Tuple[List[CallDetail], int]:
    time_filter, time_params = build_time_filter(time_range)
    params = [skill, IN_CALL_TYPE, fecha_inicio, fecha_fin, *time_params]

    with get_db_cursor() as cur:
        count_query = f"""
            SELECT COUNT(*)
            FROM {get_schema()}.log_calls
            WHERE skill = %s AND typecall = %s
            AND fecha >= %s AND fecha <= %s
            {time_filter}
        """
        cur.execute(count_query, tuple(params))
        total = cur.fetchone()[0]

        offset = (page - 1) * page_size
        detail_query = f"""
            SELECT
                lc.idlog_calls, lc.fecha, lc.extension, lc.agent, a.nombre as asesor,
                lc.skill, lc.typecall,
                lc.resultcall, lc.resultcalldesc, lc.resultdesc,
                lc.timecall, lc.timequeue, lc.numbercall, lc.localani
            FROM {get_schema()}.log_calls lc
            LEFT JOIN {get_schema()}.agent a ON a."user" = lc.agent
            WHERE lc.skill = %s AND lc.typecall = %s
            AND lc.fecha >= %s AND lc.fecha <= %s
            {time_filter.replace('fecha::', 'lc.fecha::')}
            ORDER BY lc.fecha DESC
            LIMIT %s OFFSET %s
        """
        cur.execute(detail_query, tuple([*params, page_size, offset]))

        calls = []
        for row in cur.fetchall():
            calls.append(CallDetail(
                idlog_calls=row[0],
                fecha=row[1],
                extension=row[2],
                agent=row[3],
                asesor=(row[4] or "").strip() or None,
                skill=row[5],
                typecall=row[6],
                resultcall=row[7],
                resultcalldesc=row[8],
                resultdesc=row[9],
                timecall=row[10],
                timequeue=row[11],
                numbercall=row[12],
                localani=row[13],
            ))

        return calls, total


def get_calls_for_export(
    fecha_inicio: datetime,
    fecha_fin: datetime,
    skill: str = SKILL_CONTINGENCIA,
    time_range: Optional[TimeRange] = None
) -> List[CallDetail]:
    calls, _ = get_calls_detail(fecha_inicio, fecha_fin, skill, time_range, 1, 100000)
    return calls


def get_filter_options(
    target_date: date,
    skill: str = SKILL_CONTINGENCIA,
    time_range: Optional[TimeRange] = None,
) -> dict:
    """Items reales desde BD para los selects de Detalle (asesores y resultados)."""
    time_filter, time_params = build_time_filter(time_range)
    with get_db_cursor() as cur:
        cur.execute(
            f"""
            SELECT DISTINCT lc.agent, COALESCE(NULLIF(TRIM(a.nombre), ''), lc.agent) as asesor
            FROM {get_schema()}.log_calls lc
            LEFT JOIN {get_schema()}.agent a ON a."user" = lc.agent
            WHERE lc.fecha::date = %s AND lc.skill = %s AND lc.typecall = %s
            AND NULLIF(TRIM(lc.agent), '') IS NOT NULL
            {time_filter.replace('fecha::', 'lc.fecha::')}
            ORDER BY asesor
            """,
            (target_date, skill, IN_CALL_TYPE, *time_params),
        )
        asesores = [{"agent": r[0], "asesor": (r[1] or "").strip()} for r in cur.fetchall()]

        cur.execute(
            f"""
            SELECT DISTINCT resultdesc
            FROM {get_schema()}.log_calls
            WHERE fecha::date = %s AND skill = %s AND typecall = %s
            AND NULLIF(TRIM(resultdesc), '') IS NOT NULL
            {time_filter}
            ORDER BY resultdesc
            """,
            (target_date, skill, IN_CALL_TYPE, *time_params),
        )
        resultados = [r[0] for r in cur.fetchall()]
        return {"asesores": asesores, "resultados": resultados}


def get_hourly_stats(
    target_date: date,
    skill: str = SKILL_CONTINGENCIA,
    time_range: Optional[TimeRange] = None,
) -> List[dict]:
    time_filter, time_params = build_time_filter(time_range)
    with get_db_cursor() as cur:
        query = f"""
            SELECT
                EXTRACT(HOUR FROM fecha)::int as hora,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE resultcall = %s) as abandono,
                COUNT(*) FILTER (WHERE resultcall = %s) as atendidas
            FROM {get_schema()}.log_calls
            WHERE fecha::date = %s
            AND skill = %s
            AND typecall = %s
            {time_filter}
            GROUP BY EXTRACT(HOUR FROM fecha)
            ORDER BY hora
        """
        cur.execute(query, (ABANDONED_RESULTCALL, ANSWERED_RESULTCALL, target_date, skill, IN_CALL_TYPE, *time_params))
        return [
            {"hora": f"{row[0]:02d}:00", "total": row[1], "abandono": row[2], "atendidas": row[3]}
            for row in cur.fetchall()
        ]
