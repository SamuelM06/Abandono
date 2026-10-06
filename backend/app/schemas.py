from pydantic import BaseModel, Field
from datetime import datetime, time
from typing import Optional, List, Literal
from enum import Enum


class TimeRange(str, Enum):
    MEDIO_DIA = "medio_dia"
    DIA_COMPLETO = "dia_completo"
    FUERA_HORARIO = "fuera_horario"


class KPIDashboard(BaseModel):
    total_ingresadas: int
    total_abandono: int
    total_atendidas: int
    total_unicos: int = 0
    total_duplicados: int = 0
    fecha: str
    hora_actualizacion: str
    skill: str = "In_Contingencias"


class AsesorOption(BaseModel):
    agent: str
    asesor: str


class FilterOptions(BaseModel):
    asesores: List[AsesorOption]
    resultados: List[str]


class CallDetail(BaseModel):
    idlog_calls: int
    fecha: datetime
    extension: Optional[str]
    agent: Optional[str]
    asesor: Optional[str] = None
    skill: str
    typecall: Optional[str]
    resultcall: Optional[str]
    resultcalldesc: Optional[str]
    resultdesc: Optional[str]
    timecall: Optional[float]
    timequeue: Optional[float]
    numbercall: Optional[str]
    localani: Optional[str]


class CallsResponse(BaseModel):
    calls: List[CallDetail]
    total: int
    page: int
    page_size: int
    filters: dict


class ExportRequest(BaseModel):
    fecha_inicio: datetime
    fecha_fin: datetime
    skill: str = "In_Contingencias"
    time_range: Optional[TimeRange] = None


class EmailConfig(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    email_from: str
    email_to_jefa: str
    email_to_coord: str


TIME_RANGES = {
    TimeRange.MEDIO_DIA: (time(8, 0), time(12, 0)),
    TimeRange.DIA_COMPLETO: (time(8, 0), time(17, 30)),
    # Fuera de horario = antes de 8:00 o desde las 17:30 (se maneja con OR en services.build_time_filter)
    TimeRange.FUERA_HORARIO: (time(17, 30), time(8, 0)),
}

TIME_RANGE_LABELS = {
    TimeRange.MEDIO_DIA: "Medio dia (8:00 - 12:00)",
    TimeRange.DIA_COMPLETO: "Dia completo (8:00 - 17:30)",
    TimeRange.FUERA_HORARIO: "Fuera de horario (antes 8:00 / desde 17:30)",
}