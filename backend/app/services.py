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
                COUNT(*) FILTER (WHERE resultcall = %s) as total_atendidas
            FROM {get_schema()}.log_calls
            WHERE fecha::date = %s
            AND skill = %s
            AND typecall = %s
            {time_filter}
        """
        cur.execute(query, (ABANDONED_RESULTCALL, ANSWERED_RESULTCALL, target_date, skill, IN_CALL_TYPE, *time_params))
        row = cur.fetchone()
        return {
            "total_ingresadas": row[0] or 0,
            "total_abandono": row[1] or 0,
            "total_atendidas": row[2] or 0,
        }


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
                COUNT(*) FILTER (WHERE resultcall = %s) as total_atendidas
            FROM {get_schema()}.log_calls
            WHERE fecha >= %s AND fecha <= %s
            AND skill = %s
            AND typecall = %s
        """
        cur.execute(query, (ABANDONED_RESULTCALL, ANSWERED_RESULTCALL, fecha_inicio, fecha_fin, skill, IN_CALL_TYPE))
        row = cur.fetchone()
        return {
            "total_ingresadas": row[0] or 0,
            "total_abandono": row[1] or 0,
            "total_atendidas": row[2] or 0,
        }


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
                idlog_calls, fecha, extension, agent, skill, typecall,
                resultcall, resultcalldesc, resultdesc,
                timecall, timequeue, numbercall, localani
            FROM {get_schema()}.log_calls
            WHERE skill = %s AND typecall = %s
            AND fecha >= %s AND fecha <= %s
            {time_filter}
            ORDER BY fecha DESC
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
                skill=row[4],
                typecall=row[5],
                resultcall=row[6],
                resultcalldesc=row[7],
                resultdesc=row[8],
                timecall=row[9],
                timequeue=row[10],
                numbercall=row[11],
                localani=row[12],
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
