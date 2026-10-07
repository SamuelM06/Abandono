from datetime import datetime, date, time
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.schemas import (
    KPIDashboard, CallsResponse, TimeRange, ExportRequest, TIME_RANGE_LABELS, FilterOptions, SkillCatalog
)
from app.services import (
    get_kpis_for_date, get_kpis_for_datetime_range,
    get_calls_detail, get_calls_for_export, get_hourly_stats as svc_get_hourly_stats,
    get_filter_options, get_skills_disponibles, kpis_from_calls, normalize_skills
)
from app.database import get_settings
from app.excel_export import generate_excel_report
from app.email_service import (
    send_daily_report_email, test_email_connection, build_daily_report_context,
    preview_body_html
)

router = APIRouter(prefix="/api", tags=["abandono"])


@router.get("/skills", response_model=SkillCatalog)
async def get_skills(dias: int = Query(30, ge=1, le=365, description="Ventana para saber que skills tienen movimiento")):
    """Catalogo de lineas para el filtro multi-seleccion del front."""
    return SkillCatalog(skills=get_skills_disponibles(dias))


@router.get("/kpis", response_model=KPIDashboard)
async def get_kpis(
    fecha: Optional[str] = Query(None, description="Fecha en formato YYYY-MM-DD (seleccionada en el front)"),
    skill: str = Query("In_Contingencias", description="Skill unico (compatibilidad)"),
    skills: Optional[List[str]] = Query(None, description="Varias lineas a la vez"),
    time_range: Optional[TimeRange] = Query(None, description="todo_dia, medio_dia, dia_completo, fuera_horario"),
):
    # La fecha SIEMPRE viene del front (nunca hardcodeada en consultas).
    target_date = datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else date.today()
    seleccion = normalize_skills(skills or [skill])
    kpis = get_kpis_for_date(target_date, seleccion, time_range)
    etiqueta = TIME_RANGE_LABELS.get(time_range, "rango seleccionado") if time_range else "dia"
    return KPIDashboard(
        **kpis,
        fecha=f"{target_date.strftime('%Y-%m-%d')} ({etiqueta})",
        hora_actualizacion=datetime.now().strftime("%H:%M:%S"),
        skill=", ".join(seleccion),
        skills=seleccion,
    )


@router.get("/kpis/range", response_model=KPIDashboard)
async def get_kpis_range(
    fecha_inicio: str = Query(..., description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: str = Query(..., description="Fecha fin YYYY-MM-DD"),
    skill: str = Query("In_Contingencias"),
    skills: Optional[List[str]] = Query(None, description="Varias lineas a la vez")
):
    inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d")
    fin = datetime.strptime(fecha_fin, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    seleccion = normalize_skills(skills or [skill])
    kpis = get_kpis_for_datetime_range(inicio, fin, seleccion)
    return KPIDashboard(
        **kpis,
        fecha=f"{fecha_inicio} a {fecha_fin}",
        hora_actualizacion=datetime.now().strftime("%H:%M:%S"),
        skill=", ".join(seleccion),
        skills=seleccion,
    )


@router.get("/calls", response_model=CallsResponse)
async def get_calls(
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD"),
    fecha_inicio: Optional[str] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: Optional[str] = Query(None, description="Fecha fin YYYY-MM-DD"),
    time_range: Optional[TimeRange] = Query(None, description="todo_dia, medio_dia, dia_completo, fuera_horario"),
    skill: str = Query("In_Contingencias"),
    skills: Optional[List[str]] = Query(None, description="Varias lineas a la vez"),
    resultcall: Optional[str] = Query(None, description="Filtra por codigo de resultado"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200)
):
    if fecha:
        target_date = datetime.strptime(fecha, "%Y-%m-%d").date()
        inicio = datetime.combine(target_date, time.min)
        fin = datetime.combine(target_date, time.max)
    elif fecha_inicio and fecha_fin:
        inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d")
        fin = datetime.strptime(fecha_fin, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    else:
        target_date = date.today()
        inicio = datetime.combine(target_date, time.min)
        fin = datetime.combine(target_date, time.max)

    seleccion = normalize_skills(skills or [skill])
    calls, total = get_calls_detail(inicio, fin, seleccion, time_range, page, page_size, resultcall)

    return CallsResponse(
        calls=calls,
        total=total,
        page=page,
        page_size=page_size,
        filters={
            "fecha_inicio": inicio.isoformat(),
            "fecha_fin": fin.isoformat(),
            "skills": seleccion,
            "time_range": time_range.value if time_range else None,
            "resultcall": resultcall
        }
    )


@router.get("/hourly-stats")
async def get_hourly_stats_route(
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD"),
    skill: str = Query("In_Contingencias"),
    skills: Optional[List[str]] = Query(None, description="Varias lineas a la vez"),
    time_range: Optional[TimeRange] = Query(None, description="todo_dia, medio_dia, dia_completo, fuera_horario"),
):
    target_date = datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else date.today()
    seleccion = normalize_skills(skills or [skill])
    stats = svc_get_hourly_stats(target_date, seleccion, time_range)
    return {
        "fecha": target_date.strftime("%Y-%m-%d"),
        "skills": seleccion,
        "time_range": time_range.value if time_range else None,
        "data": stats,
    }


@router.post("/export")
async def export_excel(request: ExportRequest):
    seleccion = normalize_skills(request.skills or [request.skill])

    calls = get_calls_for_export(
        request.fecha_inicio,
        request.fecha_fin,
        seleccion,
        request.time_range,
        request.resultcall,
        request.solo_abandono,
    )

    fecha_str = request.fecha_inicio.strftime("%Y-%m-%d")
    time_range_str = request.time_range.value if request.time_range else "personalizado"
    skill_str = "-".join(seleccion) if len(seleccion) == 1 else "MULTI"

    if request.solo_abandono:
        # Reporte de "sin atencion": los KPIs salen de las filas exportadas para
        # que la hoja "Resumen KPIs" cuadre con la hoja de detalle.
        kpis = kpis_from_calls(calls)
        excel_bytes = generate_excel_report(
            kpis, calls, request.fecha_inicio.date(), seleccion, time_range_str,
            report_title="REPORTE ABANDONO XUMA - NUMEROS SIN ATENCION (A DEVOLVER)",
            detail_sheet_title="Detalle Abandono",
            no_atendida=True,
        )
        filename = f"Solo_Abandono_{fecha_str}_{time_range_str}_{skill_str}.xlsx"
    else:
        kpis = get_kpis_for_datetime_range(request.fecha_inicio, request.fecha_fin, seleccion)
        excel_bytes = generate_excel_report(
            kpis, calls, request.fecha_inicio.date(), seleccion, time_range_str
        )
        filename = f"Reporte_Abandono_{fecha_str}_{time_range_str}_{skill_str}.xlsx"

    return StreamingResponse(
        excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Total-Filas": str(len(calls)),
        }
    )


@router.get("/export/daily")
async def export_daily(
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD"),
    skill: str = Query("In_Contingencias"),
    skills: Optional[List[str]] = Query(None, description="Varias lineas a la vez"),
    time_range: Optional[TimeRange] = Query(None, description="todo_dia, medio_dia, dia_completo, fuera_horario"),
):
    target_date = datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else date.today()
    inicio = datetime.combine(target_date, time.min)
    fin = datetime.combine(target_date, time.max)
    seleccion = normalize_skills(skills or [skill])
    calls = get_calls_for_export(inicio, fin, seleccion, time_range)
    kpis = get_kpis_for_date(target_date, seleccion, time_range)
    tr = time_range.value if time_range else "dia_completo"
    excel_bytes = generate_excel_report(kpis, calls, target_date, seleccion, tr)
    filename = f"Reporte Abandono {target_date.strftime('%Y-%m-%d')}.xlsx"
    return StreamingResponse(
        excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/email/preview")
async def preview_daily_email(
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD"),
    skill: str = Query("In_Contingencias"),
    skills: Optional[List[str]] = Query(None, description="Varias lineas a la vez")
):
    """Vista previa del correo automatico SIN enviar ni generar adjunto.

    Sirve para revisar asunto, destinatarios, cuerpo y KPIs antes del envio de las 17:00.
    """
    target_date = datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else date.today()
    ctx = build_daily_report_context(target_date, normalize_skills(skills or [skill]))
    ctx["body_html"] = preview_body_html(ctx["body_html"])
    return ctx


@router.post("/email/send-daily")
async def send_daily_email(
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD"),
    skill: str = Query("In_Contingencias"),
    skills: Optional[List[str]] = Query(None, description="Varias lineas a la vez")
):
    target_date = datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else date.today()
    success = send_daily_report_email(target_date, normalize_skills(skills or [skill]))
    if success:
        return {"success": True, "message": f"Email enviado para {target_date}"}
    raise HTTPException(status_code=500, detail="Error enviando email")


@router.get("/email/test")
async def test_email():
    success = test_email_connection()
    return {"success": success}


@router.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@router.get("/ui-config")
async def ui_config(request: Request):
    """Dice al front si este visitante es el owner (ve acciones de correo) o invitado (solo lectura).

    Compara la IP del visitante con OWNER_IPS del .env local.
    """
    owners = [ip.strip() for ip in (get_settings().owner_ips or "").split(",") if ip.strip()]
    client_ip = (request.client.host if request.client else "") or ""
    is_owner = any(client_ip == o or client_ip.startswith(o) for o in owners) if owners else True
    return {"is_owner": is_owner}


@router.get("/filtros", response_model=FilterOptions)
async def get_filtros(
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD"),
    skill: str = Query("In_Contingencias"),
    skills: Optional[List[str]] = Query(None, description="Varias lineas a la vez"),
    time_range: Optional[TimeRange] = Query(None, description="todo_dia, medio_dia, dia_completo, fuera_horario"),
):
    target_date = datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else date.today()
    return get_filter_options(target_date, normalize_skills(skills or [skill]), time_range)
