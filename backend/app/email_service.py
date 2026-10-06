import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import date, datetime
from app.database import get_settings
from app.excel_export import generate_daily_excel_report
from app.services import get_kpis_for_date


def _signature_html(settings) -> str:
    nombre = settings.email_signature_nombre or "Su nombre"
    cargo = settings.email_signature_cargo or "Su cargo"
    email = settings.email_signature_email or settings.email_from or ""
    telefono = settings.email_signature_telefono or ""
    web = settings.email_signature_web or ""
    return f"""
    <table style="margin-top: 24px; font-family: 'Raleway', Arial, sans-serif; font-size: 13px; color: #333333;">
      <tr>
        <td style="padding-right: 12px; border-right: 3px solid #00CD93;">
          <strong style="font-size: 15px; color: #120180;">{nombre}</strong><br/>
          <span style="color: #666;">{cargo}</span><br/>
          <span>Email: {email}</span><br/>
          {f"<span>Telefono: {telefono}</span><br/>" if telefono else ""}
          {f"<span>Web: {web}</span>" if web else ""}
        </td>
      </tr>
    </table>
    <p style="font-size: 11px; color: #999;">Pegue aqui su firma de Outlook configurando EMAIL_SIGNATURE_* en el .env local.</p>
    """


def build_daily_report_context(target_date: date = None, skill: str = "In_Contingencias") -> dict:
    if target_date is None:
        target_date = date.today()
    settings = get_settings()
    kpis = get_kpis_for_date(target_date, skill)
    filename = f"Reporte Abandono {target_date.strftime('%Y-%m-%d')}.xlsx"
    subject = f"Reporte Diario Abandono Xuma - {target_date.strftime('%d/%m/%Y')}"
    total = kpis["total_ingresadas"] or 0
    pct_ab = (kpis["total_abandono"] / total * 100) if total else 0
    pct_ok = (kpis["total_atendidas"] / total * 100) if total else 0

    body_html = f"""
    <html>
    <body style="font-family: 'Raleway', Arial, sans-serif; color: #333333;">
      <div style="max-width: 640px; margin: 0 auto; padding: 20px;">
        <div style="background: #120180; color: white; padding: 22px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">Reporte diario de contingencia</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">Skill {skill} | {target_date.strftime('%d/%m/%Y')}</p>
        </div>
        <div style="background: #ffffff; padding: 22px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p>Hola, buen dia.</p>
          <p>Comparto el seguimiento del dia <strong>{target_date.strftime('%d/%m/%Y')}</strong> para la contingencia (skill <strong>{skill}</strong>), con corte de la tarde:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="background: #120180; color: white;">
              <th style="padding: 10px; text-align: left;">Indicador</th>
              <th style="padding: 10px; text-align: right;">Valor</th>
            </tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee;">Total llamadas ingresadas</td><td style="padding: 10px; text-align: right;"><strong>{kpis['total_ingresadas']}</strong></td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #eee;">Total llamadas abandono</td><td style="padding: 10px; text-align: right;"><strong>{kpis['total_abandono']}</strong> ({pct_ab:.1f}%)</td></tr>
            <tr><td style="padding: 10px;">Total llamadas atendidas</td><td style="padding: 10px; text-align: right;"><strong>{kpis['total_atendidas']}</strong> ({pct_ok:.1f}%)</td></tr>
          </table>
          <p>En el archivo Excel adjunto va el detalle por hora y el listado de llamadas del dia.</p>
          <p>Quedo atento a cualquier inquietud.</p>
          <p style="color: #666; font-size: 13px;">Generado automaticamente el {datetime.now().strftime('%d/%m/%Y a las %H:%M')}.</p>
          <hr style="margin: 20px 0; border-color: #e0e0e0;" />
          {_signature_html(settings)}
          <p style="font-size: 11px; color: #999;">Este es un correo automatico del sistema Abandono Xuma.</p>
        </div>
      </div>
    </body>
    </html>
    """
    return {
        "fecha": target_date.strftime("%Y-%m-%d"),
        "skill": skill,
        "subject": subject,
        "to": settings.email_to_jefa,
        "cc": settings.email_to_coord,
        "from": settings.email_from,
        "filename": filename,
        "kpis": kpis,
        "body_html": body_html,
        "generated_at": datetime.now().isoformat(),
    }


def send_daily_report_email(target_date: date = None, skill: str = "In_Contingencias") -> bool:
    if target_date is None:
        target_date = date.today()
    settings = get_settings()
    if not all([settings.smtp_host, settings.smtp_user, settings.smtp_password,
                settings.email_from, settings.email_to_jefa]):
        print("Configuracion de email incompleta, saltando envio")
        return False
    try:
        ctx = build_daily_report_context(target_date, skill)
        excel_bytes = generate_daily_excel_report(target_date, skill)

        msg = MIMEMultipart()
        msg["From"] = settings.email_from
        msg["To"] = settings.email_to_jefa
        if settings.email_to_coord:
            msg["Cc"] = settings.email_to_coord
        msg["Subject"] = ctx["subject"]

        recipients = [settings.email_to_jefa]
        if settings.email_to_coord:
            recipients.append(settings.email_to_coord)

        msg.attach(MIMEText(ctx["body_html"], "html"))

        part = MIMEBase("application", "octet-stream")
        part.set_payload(excel_bytes.read())
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f"attachment; filename={ctx['filename']}")
        msg.attach(part)

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.email_from, recipients, msg.as_string())

        print(f"[OK] Email enviado a {', '.join(recipients)}")
        return True
    except Exception as e:
        print(f"[ERROR] Enviando email: {e}")
        return False


def test_email_connection() -> bool:
    settings = get_settings()
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
        print("[OK] Conexion SMTP exitosa")
        return True
    except Exception as e:
        print(f"[ERROR] Conexion SMTP: {e}")
        return False
