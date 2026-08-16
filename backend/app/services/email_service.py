import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.core.config import settings

def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Sends a verification OTP code to the user.
    If SMTP settings are not provided, it prints the OTP to the console.
    """
    subject = "Verify your Luminary Analytics Account"
    body = f"""
    Hello,

    Thank you for signing up for Luminary Analytics!
    Your 6-digit email verification code is:

    --> {otp} <--

    This OTP will expire in 5 minutes.
    If you did not sign up for Luminary, please ignore this email.

    Thanks,
    The Luminary Team
    """

    if not settings.smtp_host or not settings.smtp_user:
        # Development / Sandbox Mode: Print to terminal
        print("\n" + "="*80)
        print(f"  [EMAIL SIMULATION] OTP VERIFICATION EMAIL SENT TO: {to_email}")
        print(f"  VERIFICATION CODE: {otp}")
        print("="*80 + "\n")
        return True

    # Real SMTP delivery
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.smtp_sender
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_sender, to_email, msg.as_string())
        server.close()
        logging.info(f"Successfully sent OTP email to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send OTP email to {to_email}: {e}")
        # Even on SMTP error, fallback to printing to console so development isn't blocked
        print("\n" + "="*80)
        print(f"  [SMTP FAILED - FALLBACK] OTP VERIFICATION FOR: {to_email}")
        print(f"  VERIFICATION CODE: {otp}")
        print(f"  ERROR: {e}")
        print("="*80 + "\n")
        return False
