from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import date
from app.email_service import send_daily_report_email
import logging

logging.basicConfig()
logging.getLogger("apscheduler").setLevel(logging.INFO)

scheduler = BackgroundScheduler(timezone="America/Bogota")


def _send_today():
    # Se calcula la fecha al momento del disparo (no al arrancar el servidor).
    from datetime import date as _date
    send_daily_report_email(_date.today(), "In_Contingencias")


def setup_scheduler():
    scheduler.add_job(
        _send_today,
        CronTrigger(hour=17, minute=20),
        id="daily_abandono_report",
        name="Envio reporte diario abandono 17:20",
        replace_existing=True,
    )
    print("[OK] Scheduler configurado: reporte diario a las 17:20")


def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        print("[OK] Scheduler iniciado")


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("[OK] Scheduler detenido")