from datetime import datetime, date, time
from typing import List, Tuple, Optional
from app.database import get_db_cursor
from app.schemas import CallDetail, TimeRange, TIME_RANGES


SKILL_CONTINGENCIA = "In_Contingencias"
ABANDONED_RESULTCALL = "10164"
ANSWERED_RESULTCALL = "16"
QUEUE_TIMEOUT_RESULTCALL = "10163"
IN_CALL_TYPE = "InCall"
CALL_MANUAL_TYPE = "CallManual"

# Skill -> tipo de llamada con el que se reporta.
# Un mismo nombre de skill puede existir en la BD como InCall y como CallManual
# (campana manual); aqui se declara con cual entra al reporte para no mezclar.
# "en_filtro": False deja la linea fuera de los chips del front (sigue mapeada
# para que, si algun dia se vuelve a mostrar, use su typecall correcto).
SKILL_REGISTRY = {
    "In_Contingencias": {"typecall": IN_CALL_TYPE, "label": "Contingencia", "en_filtro": True},
    "INBOUD_CARIBE": {"typecall": IN_CALL_TYPE, "label": "Caribe", "en_filtro": True},
    "INBOUN_SURTIGAS": {"typecall": IN_CALL_TYPE, "label": "Surtigas", "en_filtro": True},
    "INBOUND_GDO": {"typecall": IN_CALL_TYPE, "label": "GDO", "en_filtro": True},
    "INBOUD_CEO": {"typecall": IN_CALL_TYPE, "label": "CEO", "en_filtro": True},
    # Outbound: el que marca llama, no hay abandono que devolver. Por eso no se ofrece.
    "MANUAL_COMPETENCIA": {"typecall": CALL_MANUAL_TYPE, "label": "Manual competencia", "en_filtro": False},
}

# "Sin atencion" = le llamaron y nadie le contesto, hay que devolver la llamada.
# Ojo: resultcall 400 tambien es "Skill in pause" (no es abandono), por eso
# "Out of Time IN" se busca por resultdesc y no por el codigo.
# Aplica SOLO a llamadas entrantes: en una campana manual (outbound) que no
# contesten es un resultado normal, no hay llamada que devolver.
NO_ATENDIDA_RESULTCALL_IN = [ABANDONED_RESULTCALL, QUEUE_TIMEOUT_RESULTCALL]  # Abandoned + Queue time out
NO_ATENDIDA_RESULTDESC_IN = ["Out of Time IN"]                                  # llamada fuera de horario


def get_schema() -> str:
    from app.database import get_settings
    return get_settings().db_schema


def normalize_skills(skills) -> List[str]:
    """Acepta un skill suelto o una lista y devuelve la lista limpia (sin vacios ni repetidos)."""
    if isinstance(skills, str):
        skills = [skills]
    clean = [s.strip() for s in (skills or []) if s and s.strip()]
    return list(dict.fromkeys(clean)) or [SKILL_CONTINGENCIA]


def skills_typecalls(skills: List[str]) -> List[str]:
    """Tipos de llamada implicitos en la seleccion de skills."""
    types = {
        SKILL_REGISTRY[s]["typecall"]
        for s in skills
        if s in SKILL_REGISTRY
    }
    return sorted(types) or [IN_CALL_TYPE]


def build_skill_filter(skills, prefix: str = "") -> Tuple[str, list]:
    """Filtro por varias lineas a la vez. El tipo de llamada se deduce del skill.

    Sin seleccion explicita se cae en la contingencia (comportamiento anterior).
    """
    lista = normalize_skills(skills)
    p = f"{prefix}." if prefix else ""
    return (
        f" AND {p}skill = ANY(%s) AND {p}typecall = ANY(%s)",
        [lista, skills_typecalls(lista)],
    )


def build_time_filter(time_range: Optional[TimeRange], prefix: str = "") -> Tuple[str, list]:
    """Devuelve (fragmento SQL, params) segun el rango seleccionado.

    - medio_dia:     fecha::time entre 08:00 y 12:00
    - dia_completo:  fecha::time entre 08:00 y 17:30
    - fuera_horario: fecha::time >= 17:30 OR fecha::time < 08:00
    - todo_dia:      sin filtro horario (se usa la fecha completa seleccionada)
    - None:          sin filtro horario (se usa fecha completa seleccionada)
    """
    if not time_range or time_range not in TIME_RANGES:
        return "", []
    p = f"{prefix}." if prefix else ""
    if time_range == TimeRange.TODO_DIA:
        return "", []
    if time_range == TimeRange.FUERA_HORARIO:
        return f" AND ({p}fecha::time >= %s OR {p}fecha::time < %s)", [time(17, 30), time(8, 0)]
    start_time, end_time = TIME_RANGES[time_range]
    return f" AND {p}fecha::time >= %s AND {p}fecha::time <= %s", [start_time, end_time]


def no_atendida_codes(typecalls: List[str]) -> Tuple[List[str], List[str]]:
    """Codigos y detalles que cuentan como 'sin atencion' segun el tipo de llamada.

    Solo el entrante genera 'sin atencion'. Si la seleccion es una campana manual
    (CallManual/outbound) devuelve listas vacias: no hay nada que devolver.
    """
    resultcalls: List[str] = []
    resultdescs: List[str] = []
    if IN_CALL_TYPE in typecalls:
        resultcalls += NO_ATENDIDA_RESULTCALL_IN
        resultdescs += NO_ATENDIDA_RESULTDESC_IN
    return resultcalls, resultdescs


def build_result_filter(
    typecalls: List[str],
    resultcall: Optional[str] = None,
    no_atendida: bool = False,
    prefix: str = ""
) -> Tuple[str, list]:
    """Filtro por resultado: 'sin atencion' (codigos + Out of Time IN) o un codigo puntual."""
    p = f"{prefix}." if prefix else ""
    if no_atendida:
        resultcalls, resultdescs = no_atendida_codes(typecalls)
        if not resultcalls and not resultdescs:
            # Sin 'sin atencion' aplicable (campana manual outbound): cero filas.
            return " AND FALSE", []
        return (
            f" AND ({p}resultcall = ANY(%s) OR {p}resultdesc = ANY(%s))",
            [resultcalls, resultdescs],
        )
    if resultcall:
        return f" AND {p}resultcall = %s", [resultcall]
    return "", []


def get_skills_disponibles(dias: int = 30) -> List[dict]:
    """Skills del catalogo con movimiento reciente, para pintar los chips del front."""
    with get_db_cursor() as cur:
        cur.execute(
            f"""
            SELECT skill, typecall, COUNT(*) as total
            FROM {get_schema()}.log_calls
            WHERE fecha >= CURRENT_DATE - %s
            GROUP BY skill, typecall
            """,
            (dias,),
        )
        _rows = {(r[0], r[1]): r[2] for r in cur.fetchall()}

    disponibles = []
    for nombre, meta in SKILL_REGISTRY.items():
        if not meta.get("en_filtro", True):
            continue
        total = _rows.get((nombre, meta["typecall"]), 0)
        if not total:
            continue
        disponibles.append({
            "skill": nombre,
            "label": meta["label"],
            "typecall": meta["typecall"],
            "total_30d": total,
        })
    return disponibles


def _with_dedup(base: dict) -> dict:
    # Unicos = numeros distintos (no vacios) + filas sin numero (no se pueden deduplicar).
    # Duplicados = resto: llamadas repetidas del mismo numero (solo cuenta el primer registro).
    base["total_duplicados"] = max(0, (base["total_ingresadas"] or 0) - (base["total_unicos"] or 0))
    return base


DEDUP_SELECT = """
    COUNT(DISTINCT NULLIF(TRIM(numbercall), '')) as numeros_distintos,
    COUNT(*) FILTER (WHERE NULLIF(TRIM(numbercall), '') IS NULL) as sin_numero
"""


def kpis_from_calls(calls: List[CallDetail]) -> dict:
    """KPIs calculados sobre las filas ya filtradas (para que el Excel no se contradiga).

    Se usa en los reportes de 'sin atencion', donde las consultas por rango no
    reflejan exactamente lo que se exporta.
    """
    numeros_vistos = set()
    unicos_atendidas = 0
    unicos_abandono = 0
    unicos_queue_timeout = 0
    sin_numero = 0
    sin_numero_atendidas = 0
    sin_numero_abandono = 0
    sin_numero_queue_timeout = 0
    descs = []
    for c in calls:
        numero = (c.numbercall or "").strip()
        if numero:
            if numero not in numeros_vistos:
                numeros_vistos.add(numero)
                if c.resultcall == ANSWERED_RESULTCALL:
                    unicos_atendidas += 1
                elif c.resultcall == ABANDONED_RESULTCALL:
                    unicos_abandono += 1
                elif c.resultcall == QUEUE_TIMEOUT_RESULTCALL:
                    unicos_queue_timeout += 1
        else:
            sin_numero += 1
            if c.resultcall == ANSWERED_RESULTCALL:
                sin_numero_atendidas += 1
            elif c.resultcall == ABANDONED_RESULTCALL:
                sin_numero_abandono += 1
            elif c.resultcall == QUEUE_TIMEOUT_RESULTCALL:
                sin_numero_queue_timeout += 1
        descs.append((c.resultdesc or "").strip())
    total_unicos = len(numeros_vistos) + sin_numero
    return _with_dedup({
        "total_ingresadas": len(calls),
        "total_abandono": unicos_abandono + sin_numero_abandono,
        "total_atendidas": unicos_atendidas + sin_numero_atendidas,
        "total_unicos": total_unicos,
        "total_fuera_horario": sum(1 for d in descs if d in NO_ATENDIDA_RESULTDESC_IN),
        "total_queue_timeout": unicos_queue_timeout + sin_numero_queue_timeout,
        "total_sin_numero": sin_numero,
    })


def get_kpis_for_date(
    target_date: date,
    skills=None,
    time_range: Optional[TimeRange] = None,
) -> dict:
    skill_filter, skill_params = build_skill_filter(skills)
    time_filter, time_params = build_time_filter(time_range)
    with get_db_cursor() as cur:
        query = f"""
            WITH ranked AS (
                SELECT
                    resultcall,
                    numbercall,
                    ROW_NUMBER() OVER (PARTITION BY NULLIF(TRIM(numbercall), '') ORDER BY fecha ASC) as rn
                FROM {get_schema()}.log_calls
                WHERE fecha::date = %s
                {skill_filter}
                {time_filter}
            )
            SELECT
                COUNT(*) as total_ingresadas,
                COUNT(*) FILTER (WHERE resultcall = %s AND rn = 1) as total_abandono,
                COUNT(*) FILTER (WHERE resultcall = %s AND rn = 1) as total_atendidas,
                COUNT(DISTINCT NULLIF(TRIM(numbercall), '')) as numeros_distintos,
                COUNT(*) FILTER (WHERE NULLIF(TRIM(numbercall), '') IS NULL) as sin_numero
            FROM ranked
            WHERE rn = 1
        """
        cur.execute(query, (ABANDONED_RESULTCALL, ANSWERED_RESULTCALL, target_date, *skill_params, *time_params))
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
    skills=None
) -> dict:
    skill_filter, skill_params = build_skill_filter(skills)
    with get_db_cursor() as cur:
        query = f"""
            WITH ranked AS (
                SELECT
                    resultcall,
                    numbercall,
                    ROW_NUMBER() OVER (PARTITION BY NULLIF(TRIM(numbercall), '') ORDER BY fecha ASC) as rn
                FROM {get_schema()}.log_calls
                WHERE fecha >= %s AND fecha <= %s
                {skill_filter}
            )
            SELECT
                COUNT(*) as total_ingresadas,
                COUNT(*) FILTER (WHERE resultcall = %s AND rn = 1) as total_abandono,
                COUNT(*) FILTER (WHERE resultcall = %s AND rn = 1) as total_atendidas,
                COUNT(DISTINCT NULLIF(TRIM(numbercall), '')) as numeros_distintos,
                COUNT(*) FILTER (WHERE NULLIF(TRIM(numbercall), '') IS NULL) as sin_numero
            FROM ranked
            WHERE rn = 1
        """
        cur.execute(query, (ABANDONED_RESULTCALL, ANSWERED_RESULTCALL, fecha_inicio, fecha_fin, *skill_params))
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
    skills=None,
    time_range: Optional[TimeRange] = None,
    page: int = 1,
    page_size: int = 50,
    resultcall: Optional[str] = None,
    no_atendida: bool = False,
) -> Tuple[List[CallDetail], int]:
    lista = normalize_skills(skills)
    typecalls = skills_typecalls(lista)
    skill_params = [lista, typecalls]
    time_filter, time_params = build_time_filter(time_range)
    result_filter, result_params = build_result_filter(typecalls, resultcall, no_atendida)
    params = [*skill_params, fecha_inicio, fecha_fin, *time_params, *result_params]

    with get_db_cursor() as cur:
        count_query = f"""
            SELECT COUNT(*)
            FROM {get_schema()}.log_calls
            WHERE skill = ANY(%s) AND typecall = ANY(%s)
            AND fecha >= %s AND fecha <= %s
            {time_filter}
            {result_filter}
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
            WHERE lc.skill = ANY(%s) AND lc.typecall = ANY(%s)
            AND lc.fecha >= %s AND lc.fecha <= %s
            {build_time_filter(time_range, prefix="lc")[0]}
            {build_result_filter(typecalls, resultcall, no_atendida, prefix="lc")[0]}
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
    skills=None,
    time_range: Optional[TimeRange] = None,
    resultcall: Optional[str] = None,
    no_atendida: bool = False,
) -> List[CallDetail]:
    calls, _ = get_calls_detail(fecha_inicio, fecha_fin, skills, time_range, 1, 100000, resultcall, no_atendida)
    return calls


def get_filter_options(
    target_date: date,
    skills=None,
    time_range: Optional[TimeRange] = None,
) -> dict:
    """Items reales desde BD para los selects de Detalle (asesores y resultados)."""
    lista = normalize_skills(skills)
    typecalls = skills_typecalls(lista)
    skill_params = [lista, typecalls]
    time_filter, time_params = build_time_filter(time_range)
    with get_db_cursor() as cur:
        cur.execute(
            f"""
            SELECT DISTINCT lc.agent, COALESCE(NULLIF(TRIM(a.nombre), ''), lc.agent) as asesor
            FROM {get_schema()}.log_calls lc
            LEFT JOIN {get_schema()}.agent a ON a."user" = lc.agent
            WHERE lc.fecha::date = %s AND lc.skill = ANY(%s) AND lc.typecall = ANY(%s)
            AND NULLIF(TRIM(lc.agent), '') IS NOT NULL
            {build_time_filter(time_range, prefix="lc")[0]}
            ORDER BY asesor
            """,
            (target_date, *skill_params, *time_params),
        )
        asesores = [{"agent": r[0], "asesor": (r[1] or "").strip()} for r in cur.fetchall()]

        cur.execute(
            f"""
            SELECT DISTINCT resultdesc
            FROM {get_schema()}.log_calls
            WHERE fecha::date = %s AND skill = ANY(%s) AND typecall = ANY(%s)
            AND NULLIF(TRIM(resultdesc), '') IS NOT NULL
            {time_filter}
            ORDER BY resultdesc
            """,
            (target_date, *skill_params, *time_params),
        )
        resultados = [r[0] for r in cur.fetchall()]
        return {"asesores": asesores, "resultados": resultados}


def get_hourly_stats(
    target_date: date,
    skills=None,
    time_range: Optional[TimeRange] = None,
    no_atendida: bool = False,
) -> List[dict]:
    lista = normalize_skills(skills)
    typecalls = skills_typecalls(lista)
    skill_params = [lista, typecalls]
    time_filter, time_params = build_time_filter(time_range)
    result_filter, result_params = build_result_filter(typecalls, no_atendida=no_atendida)
    with get_db_cursor() as cur:
        query = f"""
            SELECT
                EXTRACT(HOUR FROM fecha)::int as hora,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE resultcall = %s AND rn = 1) as abandono,
                COUNT(*) FILTER (WHERE resultcall = %s AND rn = 1) as atendidas,
                COUNT(*) FILTER (WHERE resultdesc = %s AND rn = 1) as fuera_horario,
                COUNT(*) FILTER (WHERE resultcall = %s AND rn = 1) as queue_timeout
            FROM (
                SELECT
                    resultcall,
                    resultdesc,
                    fecha,
                    numbercall,
                    ROW_NUMBER() OVER (PARTITION BY NULLIF(TRIM(numbercall), '') ORDER BY fecha ASC) as rn
                FROM {get_schema()}.log_calls
                WHERE fecha::date = %s
                AND skill = ANY(%s) AND typecall = ANY(%s)
                {time_filter}
                {result_filter}
            ) sub
            GROUP BY EXTRACT(HOUR FROM fecha)
            ORDER BY hora
        """
        cur.execute(query, (
            ABANDONED_RESULTCALL, ANSWERED_RESULTCALL, NO_ATENDIDA_RESULTDESC_IN[0],
            QUEUE_TIMEOUT_RESULTCALL, target_date, *skill_params, *time_params, *result_params,
        ))
        return [
            {
                "hora": f"{row[0]:02d}:00",
                "total": row[1],
                "abandono": row[2],
                "atendidas": row[3],
                "fuera_horario": row[4],
                "queue_timeout": row[5],
            }
            for row in cur.fetchall()
        ]
