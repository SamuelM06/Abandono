import psycopg2
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Base de datos (SIN valores reales: configurar via variables de entorno o backend/.env local, no versionado)
    db_host: str = ""
    db_port: int = 5432
    db_name: str = ""
    db_user: str = ""
    db_password: str = ""
    db_schema: str = "ocm_retencion"

    # Email (plantilla: configurar valores reales solo en .env local, no versionado)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = ""
    email_to_jefa: str = ""
    email_to_coord: str = ""

    # Firma tipo Outlook para el correo automatico (configurable en .env local)
    email_signature_nombre: str = ""
    email_signature_cargo: str = ""
    email_signature_email: str = ""
    email_signature_telefono: str = ""
    email_signature_direccion: str = ""
    email_signature_web: str = ""

    # IPs del equipo owner (separadas por coma): solo estas ven acciones de correo en el front.
    # El resto (jefa/otros con el link) ve el dashboard en vivo pero sin boton de correo.
    owner_ips: str = ""

    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


_pool: Optional[SimpleConnectionPool] = None


def _require_db_settings(s: Settings) -> None:
    missing = [k for k in ("db_host", "db_name", "db_user", "db_password") if not getattr(s, k)]
    if missing:
        raise RuntimeError(
            "Faltan variables de entorno de BD: "
            + ", ".join(missing)
            + ". Configure backend/.env (local, no versionado) siguiendo backend/.env.example."
        )


def init_pool():
    global _pool
    s = get_settings()
    _require_db_settings(s)
    _pool = SimpleConnectionPool(
        minconn=1,
        maxconn=10,
        host=s.db_host,
        port=s.db_port,
        database=s.db_name,
        user=s.db_user,
        password=s.db_password,
    )
    conn = _pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(f"SET search_path TO {s.db_schema}")
        conn.commit()
    finally:
        _pool.putconn(conn)
    return _pool


def get_pool() -> SimpleConnectionPool:
    if _pool is None:
        init_pool()
    return _pool


@contextmanager
def get_db_connection():
    pool = get_pool()
    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(f"SET search_path TO {get_settings().db_schema}")
        yield conn
    finally:
        pool.putconn(conn)


@contextmanager
def get_db_cursor(commit: bool = False):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            try:
                yield cur
                if commit:
                    conn.commit()
            except Exception:
                conn.rollback()
                raise
