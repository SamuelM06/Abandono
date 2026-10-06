from datetime import datetime, date
from typing import List
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
from openpyxl.utils import get_column_letter
from io import BytesIO
from app.schemas import CallDetail
from app.services import get_kpis_for_datetime_range, get_hourly_stats


XUMA_BLUE = "120180"
XUMA_GREEN_DARK = "00CD93"
XUMA_GREEN_LIGHT = "5AE280"
XUMA_GRAY = "333333"
WHITE = "FFFFFF"
LIGHT_GRAY = "F2F2F2"
LIGHT_BLUE = "E8EAF6"
LIGHT_GREEN = "E8F5E9"


def create_kpi_sheet(wb: Workbook, kpis: dict, fecha: date, skill: str):
    ws = wb.active
    ws.title = "Resumen KPIs"

    header_font = Font(name="Raleway", bold=True, size=14, color=WHITE)
    header_fill = PatternFill(start_color=XUMA_BLUE, end_color=XUMA_BLUE, fill_type="solid")
    title_font = Font(name="Raleway", bold=True, size=18, color=XUMA_BLUE)
    subtitle_font = Font(name="Raleway", size=11, color=XUMA_GRAY)
    kpi_font = Font(name="Raleway", bold=True, size=24, color=XUMA_BLUE)
    kpi_label_font = Font(name="Raleway", size=11, color=XUMA_GRAY)
    normal_font = Font(name="Raleway", size=11)

    thin_border = Border(
        left=Side(style="thin", color="DDDDDD"),
        right=Side(style="thin", color="DDDDDD"),
        top=Side(style="thin", color="DDDDDD"),
        bottom=Side(style="thin", color="DDDDDD"),
    )

    ws.merge_cells("A1:F1")
    ws["A1"] = "REPORTE ABANDONO XUMA - CONTINGENCIA"
    ws["A1"].font = title_font
    ws["A1"].alignment = Alignment(horizontal="center")

    ws.merge_cells("A2:F2")
    ws["A2"] = f"Fecha: {fecha.strftime('%d/%m/%Y')} | Skill: {skill} | Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    ws["A2"].font = subtitle_font
    ws["A2"].alignment = Alignment(horizontal="center")

    row = 4
    kpi_data = [
        ("TOTAL LLAMADAS INGRESADAS", kpis["total_ingresadas"], XUMA_BLUE),
        ("TOTAL LLAMADAS ABANDONO", kpis["total_abandono"], "C62828"),
        ("TOTAL LLAMADAS ATENDIDAS", kpis["total_atendidas"], XUMA_GREEN_DARK),
    ]

    for i, (label, value, color) in enumerate(kpi_data):
        col = i * 2 + 1
        ws.merge_cells(start_row=row, start_column=col, end_row=row, end_column=col + 1)
        cell = ws.cell(row=row, column=col, value=value)
        cell.font = Font(name="Raleway", bold=True, size=28, color=color)
        cell.alignment = Alignment(horizontal="center")

        ws.merge_cells(start_row=row + 1, start_column=col, end_row=row + 1, end_column=col + 1)
        label_cell = ws.cell(row=row + 1, column=col, value=label)
        label_cell.font = kpi_label_font
        label_cell.alignment = Alignment(horizontal="center")

        for r in range(row, row + 2):
            for c in range(col, col + 2):
                ws.cell(row=r, column=c).border = thin_border
                ws.cell(row=r, column=c).fill = PatternFill(start_color=LIGHT_GRAY, end_color=LIGHT_GRAY, fill_type="solid")

    row = 8
    ws.merge_cells("A8:F8")
    ws["A8"] = "DETALLE POR HORA"
    ws["A8"].font = Font(name="Raleway", bold=True, size=14, color=XUMA_BLUE)

    headers = ["HORA", "TOTAL INGRESADAS", "ABANDONO", "ATENDIDAS", "% ABANDONO", "% ATENDIDAS"]
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=9, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", wrap_text=True)
        cell.border = thin_border

    hourly = get_hourly_stats(fecha, skill)
    for row_idx, h in enumerate(hourly, 10):
        ws.cell(row=row_idx, column=1, value=h["hora"]).font = normal_font
        ws.cell(row=row_idx, column=2, value=h["total"]).font = normal_font
        ws.cell(row=row_idx, column=3, value=h["abandono"]).font = Font(name="Raleway", size=11, color="C62828")
        ws.cell(row=row_idx, column=4, value=h["atendidas"]).font = Font(name="Raleway", size=11, color=XUMA_GREEN_DARK)

        total = h["total"] or 1
        abandono_pct = h["abandono"] / total
        atendidas_pct = h["atendidas"] / total

        c5 = ws.cell(row=row_idx, column=5, value=abandono_pct)
        c5.font = normal_font
        c5.number_format = "0.0%"
        c5.alignment = Alignment(horizontal="center")

        c6 = ws.cell(row=row_idx, column=6, value=atendidas_pct)
        c6.font = normal_font
        c6.number_format = "0.0%"
        c6.alignment = Alignment(horizontal="center")

        for col_idx in range(1, 7):
            ws.cell(row=row_idx, column=col_idx).border = thin_border
            if row_idx % 2 == 0:
                ws.cell(row=row_idx, column=col_idx).fill = PatternFill(start_color=LIGHT_BLUE, end_color=LIGHT_BLUE, fill_type="solid")

    totals_row = 10 + len(hourly)
    ws.cell(row=totals_row, column=1, value="TOTAL").font = Font(name="Raleway", bold=True, size=11, color=WHITE)
    ws.cell(row=totals_row, column=1).fill = PatternFill(start_color=XUMA_GRAY, end_color=XUMA_GRAY, fill_type="solid")
    for col_idx in range(2, 7):
        ws.cell(row=totals_row, column=col_idx).font = Font(name="Raleway", bold=True, size=11, color=WHITE)
        ws.cell(row=totals_row, column=col_idx).fill = PatternFill(start_color=XUMA_GRAY, end_color=XUMA_GRAY, fill_type="solid")
        ws.cell(row=totals_row, column=col_idx).border = thin_border

    ws.cell(row=totals_row, column=2).value = sum(h["total"] for h in hourly)
    ws.cell(row=totals_row, column=3).value = sum(h["abandono"] for h in hourly)
    ws.cell(row=totals_row, column=4).value = sum(h["atendidas"] for h in hourly)

    for col_idx in range(1, 7):
        ws.column_dimensions[get_column_letter(col_idx)].width = 18


def create_detail_sheet(wb: Workbook, calls: List[CallDetail], fecha: date, time_range: str):
    ws = wb.create_sheet(title="Detalle Llamadas")

    header_font = Font(name="Raleway", bold=True, size=11, color=WHITE)
    header_fill = PatternFill(start_color=XUMA_BLUE, end_color=XUMA_BLUE, fill_type="solid")
    normal_font = Font(name="Raleway", size=10)
    thin_border = Border(
        left=Side(style="thin", color="DDDDDD"),
        right=Side(style="thin", color="DDDDDD"),
        top=Side(style="thin", color="DDDDDD"),
        bottom=Side(style="thin", color="DDDDDD"),
    )

    headers = [
        "ID", "FECHA", "HORA", "EXTENSIÓN", "AGENTE", "NOMBRE ASESOR", "SKILL",
        "TIPO LLAMADA", "CÓDIGO RESULTADO", "RESULTADO", "DETALLE RESULTADO",
        "DURACIÓN (seg)", "TIEMPO COLA (seg)", "NÚMERO LLAMANTE", "ANI LOCAL"
    ]

    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", wrap_text=True)
        cell.border = thin_border

    for row_idx, call in enumerate(calls, 2):
        ws.cell(row=row_idx, column=1, value=call.idlog_calls).font = normal_font
        ws.cell(row=row_idx, column=2, value=call.fecha.strftime("%d/%m/%Y")).font = normal_font
        ws.cell(row=row_idx, column=3, value=call.fecha.strftime("%H:%M:%S")).font = normal_font
        ws.cell(row=row_idx, column=4, value=call.extension or "").font = normal_font
        ws.cell(row=row_idx, column=5, value=call.agent or "").font = normal_font
        ws.cell(row=row_idx, column=6, value=call.asesor or "").font = normal_font
        ws.cell(row=row_idx, column=7, value=call.skill).font = normal_font
        ws.cell(row=row_idx, column=8, value=call.typecall or "").font = normal_font
        ws.cell(row=row_idx, column=9, value=call.resultcall or "").font = normal_font
        ws.cell(row=row_idx, column=10, value=call.resultcalldesc or "").font = normal_font
        ws.cell(row=row_idx, column=11, value=call.resultdesc or "").font = normal_font
        ws.cell(row=row_idx, column=12, value=round(call.timecall, 2) if call.timecall else 0).font = normal_font
        ws.cell(row=row_idx, column=13, value=round(call.timequeue, 2) if call.timequeue else 0).font = normal_font
        ws.cell(row=row_idx, column=14, value=call.numbercall or "").font = normal_font
        ws.cell(row=row_idx, column=15, value=call.localani or "").font = normal_font

        for col_idx in range(1, 16):
            ws.cell(row=row_idx, column=col_idx).border = thin_border
            if row_idx % 2 == 0:
                ws.cell(row=row_idx, column=col_idx).fill = PatternFill(start_color=LIGHT_GRAY, end_color=LIGHT_GRAY, fill_type="solid")

            if col_idx in [10, 11]:
                ws.cell(row=row_idx, column=col_idx).alignment = Alignment(wrap_text=True)

            if col_idx == 10 and call.resultcall == "10164":
                ws.cell(row=row_idx, column=col_idx).font = Font(name="Raleway", size=10, bold=True, color="C62828")
            elif col_idx == 10 and call.resultcall == "16":
                ws.cell(row=row_idx, column=col_idx).font = Font(name="Raleway", size=10, color=XUMA_GREEN_DARK)

    column_widths = [8, 12, 10, 12, 14, 28, 20, 14, 14, 18, 30, 14, 14, 16, 16]
    for i, width in enumerate(column_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = width

    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{len(calls) + 1}"
    ws.freeze_panes = "A2"


def generate_excel_report(
    kpis: dict,
    calls: List[CallDetail],
    fecha: date,
    skill: str,
    time_range: str
) -> BytesIO:
    wb = Workbook()
    create_kpi_sheet(wb, kpis, fecha, skill)
    create_detail_sheet(wb, calls, fecha, time_range)

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def generate_daily_excel_report(target_date: date, skill: str = "In_Contingencias") -> BytesIO:
    from app.services import get_kpis_for_date, get_calls_for_export

    kpis = get_kpis_for_date(target_date, skill)
    calls = get_calls_for_export(
        datetime.combine(target_date, datetime.min.time()),
        datetime.combine(target_date, datetime.max.time()),
        skill
    )
    return generate_excel_report(kpis, calls, target_date, skill, "Día completo")