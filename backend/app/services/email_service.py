import requests
import logging
from app.core.config import settings

def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Sends a verification OTP code to the user using Resend.
    If RESEND_API_KEY is not provided, it prints the OTP to the console.
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

    if not settings.resend_api_key:
        # Development / Sandbox Mode: Print to terminal
        print("\n" + "="*80)
        print(f"  [EMAIL SIMULATION] OTP VERIFICATION EMAIL SENT TO: {to_email}")
        print(f"  VERIFICATION CODE: {otp}")
        print("="*80 + "\n")
        return True

    # Real Email delivery via Resend
    try:
        headers = {
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json"
        }
        
        # Resend testing domain requires sending from "onboarding@resend.dev"
        # and only allows sending TO the verified email address.
        payload = {
            "from": "Luminary Analytics <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "text": body,
        }
        
        response = requests.post("https://api.resend.com/emails", json=payload, headers=headers)
        
        if response.status_code in [200, 201]:
            logging.info(f"Successfully sent OTP email to {to_email}")
            return True
        else:
            logging.error(f"Resend API failed: {response.text}")
            raise Exception(f"API Error {response.status_code}")
            
    except Exception as e:
        logging.error(f"Failed to send OTP email to {to_email}: {e}")
        # Even on error, fallback to printing to console so development isn't blocked
        print("\n" + "="*80)
        print(f"  [RESEND FAILED - FALLBACK] OTP VERIFICATION FOR: {to_email}")
        print(f"  VERIFICATION CODE: {otp}")
        print(f"  ERROR: {e}")
        print("="*80 + "\n")
        return False
