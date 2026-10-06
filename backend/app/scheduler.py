from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import date
from app.email_service import send_daily_report_email
import logging

logging.basicConfig()
logging.getLogger("apscheduler").setLevel(logging.INFO)

scheduler = BackgroundScheduler(timezone="America/Bogota")


def setup_scheduler():
    scheduler.add_job(
        send_daily_report_email,
        CronTrigger(hour=17, minute=0),
        args=[date.today(), "In_Contingencias"],
        id="daily_abandono_report",
        name="Envio reporte diario abandono 17:00",
        replace_existing=True,
    )
    print("[OK] Scheduler configurado: reporte diario a las 17:00")


def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        print("[OK] Scheduler iniciado")


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("[OK] Scheduler detenido")