from datetime import datetime, date, time
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.schemas import (
    KPIDashboard, CallsResponse, TimeRange, ExportRequest, TIME_RANGE_LABELS, FilterOptions
)
from app.services import (
    get_kpis_for_date, get_kpis_for_datetime_range,
    get_calls_detail, get_calls_for_export, get_hourly_stats as svc_get_hourly_stats,
    get_filter_options
)
from app.database import get_settings
from app.excel_export import generate_excel_report
from app.email_service import (
    send_daily_report_email, test_email_connection, build_daily_report_context,
    preview_body_html
)

router = APIRouter(prefix="/api", tags=["abandono"])


@router.get("/kpis", response_model=KPIDashboard)
async def get_kpis(
    fecha: Optional[str] = Query(None, description="Fecha en formato YYYY-MM-DD (seleccionada en el front)"),
    skill: str = Query("In_Contingencias", description="Skill a filtrar"),
    time_range: Optional[TimeRange] = Query(None, description="medio_dia, dia_completo, fuera_horario"),
):
    # La fecha SIEMPRE viene del front (nunca hardcodeada en consultas).
    target_date = datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else date.today()
    kpis = get_kpis_for_date(target_date, skill, time_range)
    etiqueta = TIME_RANGE_LABELS.get(time_range, "rango seleccionado") if time_range else "dia"
    return KPIDashboard(
        **kpis,
        fecha=f"{target_date.strftime('%Y-%m-%d')} ({etiqueta})",
        hora_actualizacion=datetime.now().strftime("%H:%M:%S"),
        skill=skill
    )


@router.get("/kpis/range", response_model=KPIDashboard)
async def get_kpis_range(
    fecha_inicio: str = Query(..., description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: str = Query(..., description="Fecha fin YYYY-MM-DD"),
    skill: str = Query("In_Contingencias")
):
    inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d")
    fin = datetime.strptime(fecha_fin, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    kpis = get_kpis_for_datetime_range(inicio, fin, skill)
    return KPIDashboard(
        **kpis,
        fecha=f"{fecha_inicio} a {fecha_fin}",
        hora_actualizacion=datetime.now().strftime("%H:%M:%S"),
        skill=skill
    )


@router.get("/calls", response_model=CallsResponse)
async def get_calls(
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD"),
    fecha_inicio: Optional[str] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    fecha_fin: Optional[str] = Query(None, description="Fecha fin YYYY-MM-DD"),
    time_range: Optional[TimeRange] = Query(None, description="medio_dia, dia_completo, fuera_horario"),
    skill: str = Query("In_Contingencias"),
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

    calls, total = get_calls_detail(inicio, fin, skill, time_range, page, page_size)

    return CallsResponse(
        calls=calls,
        total=total,
        page=page,
        page_size=page_size,
        filters={
            "fecha_inicio": inicio.isoformat(),
            "fecha_fin": fin.isoformat(),
            "skill": skill,
            "time_range": time_range.value if time_range else None
        }
    )


@router.get("/hourly-stats")
async def get_hourly_stats_route(
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD"),
    skill: str = Query("In_Contingencias"),
    time_range: Optional[TimeRange] = Query(None, description="medio_dia, dia_completo, fuera_horario"),
):
    target_date = datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else date.today()
    stats = svc_get_hourly_stats(target_date, skill, time_range)
    return {
        "fecha": target_date.strftime("%Y-%m-%d"),
        "skill": skill,
        "time_range": time_range.value if time_range else None,
        "data": stats,
    }


@router.post("/export")
async def export_excel(request: ExportRequest):
    calls = get_calls_for_export(
        request.fecha_inicio,
        request.fecha_fin,
        request.skill,
        request.time_range
    )
    kpis = get_kpis_for_datetime_range(request.fecha_inicio, request.fecha_fin, request.skill)

    fecha_str = request.fecha_inicio.strftime("%Y-%m-%d")
    time_range_str = request.time_range.value if request.time_range else "personalizado"

    excel_bytes = generate_excel_report(kpis, calls, request.fecha_inicio.date(), request.skill, time_range_str)

    filename = f"Reporte_Abandono_{fecha_str}_{time_range_str}.xlsx"

    return StreamingResponse(
        excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/daily")
async def export_daily(
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD"),
    skill: str = Query("In_Contingencias"),
    time_range: Optional[TimeRange] = Query(None, description="medio_dia, dia_completo, fuera_horario"),
):
    target_date = datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else date.today()
    inicio = datetime.combine(target_date, time.min)
    fin = datetime.combine(target_date, time.max)
    calls = get_calls_for_export(inicio, fin, skill, time_range)
    kpis = get_kpis_for_date(target_date, skill, time_range)
    tr = time_range.value if time_range else "dia_completo"
    excel_bytes = generate_excel_report(kpis, calls, target_date, skill, tr)
    filename = f"Reporte Abandono {target_date.strftime('%Y-%m-%d')}.xlsx"
    return StreamingResponse(
        excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/email/preview")
async def preview_daily_email(
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD"),
    skill: str = Query("In_Contingencias")
):
    """Vista previa del correo automatico SIN enviar ni generar adjunto.

    Sirve para revisar asunto, destinatarios, cuerpo y KPIs antes del envio de las 17:00.
    """
    target_date = datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else date.today()
    ctx = build_daily_report_context(target_date, skill)
    ctx["body_html"] = preview_body_html(ctx["body_html"])
    return ctx


@router.post("/email/send-daily")
async def send_daily_email(
    fecha: Optional[str] = Query(None, description="Fecha YYYY-MM-DD"),
    skill: str = Query("In_Contingencias")
):
    target_date = datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else date.today()
    success = send_daily_report_email(target_date, skill)
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
    time_range: Optional[TimeRange] = Query(None, description="medio_dia, dia_completo, fuera_horario"),
):
    target_date = datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else date.today()
    return get_filter_options(target_date, skill, time_range)
