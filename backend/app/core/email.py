"""
LATROCORE Email Service — Dispatches Verification OTPs and Security Notifications.
Supports SMTP when configured, with clean development console logging.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "LATROCORE Security <no-reply@latrocore.com>")


def _send_smtp(to_email: str, subject: str, html_content: str, text_content: str) -> bool:
    """Send an email using SMTP if configured."""
    if not SMTP_HOST:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email

        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        clean_password = (SMTP_PASSWORD or "").replace(" ", "").strip()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            if SMTP_PORT == 587:
                server.starttls()
            if SMTP_USER and clean_password:
                server.login(SMTP_USER, clean_password)
            server.sendmail(SMTP_FROM, [to_email], msg.as_string())
        print(f"[EMAIL SUCCESS] Dispatched email to {to_email} via {SMTP_HOST}:{SMTP_PORT}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] SMTP dispatch failed: {e}")
        return False


def _log_console(to_email: str, subject: str, otp: str, purpose: str):
    """Log formatted email dispatch to stdout for development visibility."""
    divider = "=" * 68
    print(f"\n{divider}")
    print(f"[LATROCORE EMAIL DISPATCH] -- {purpose.upper()}")
    print(f"To:       {to_email}")
    print(f"Subject:  {subject}")
    if otp:
        print(f"OTP Code: [ {otp} ]  (Valid for 5 minutes)")
    print(f"{divider}\n")


def send_email_otp(to_email: str, otp: str, purpose: str = "signup") -> bool:
    """
    Dispatch a 6-digit verification OTP.
    """
    if "signup" in purpose or purpose == "register":
        subject = f"{otp} is your LATROCORE Verification Code"
        title = "Verify Your Email Address"
        desc = "Thank you for creating an account with LATROCORE. Use the 6-digit verification code below to verify your email address:"
    else:
        subject = f"{otp} is your LATROCORE Password Reset Code"
        title = "Reset Your Password"
        desc = "A request was made to reset the password for your LATROCORE account. Use the 6-digit code below to proceed:"

    text_body = f"""
{title}

Hello,

{desc}

VERIFICATION CODE: {otp}

This code will expire in 5 minutes. It can only be used once.
If you did not request this code, please ignore this email or contact support.

— The LATROCORE Healthcare Team
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF6EF; padding: 30px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E8DCC8; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #046A38; font-size: 24px; font-weight: 800; margin: 0;">LATROCORE</h2>
      <p style="color: #64748B; font-size: 12px; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Enterprise Healthcare Security</p>
    </div>
    
    <h3 style="color: #0F172A; font-size: 18px; margin-bottom: 12px;">{title}</h3>
    <p style="color: #475569; font-size: 14px; line-height: 1.6;">{desc}</p>
    
    <div style="background: #E8F5EE; border: 2px dashed #046A38; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
      <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #046A38;">{otp}</span>
    </div>
    
    <p style="color: #64748B; font-size: 12px; line-height: 1.5;">
      • Valid for <strong>5 minutes</strong>.<br>
      • Maximum 5 verification attempts.<br>
      • Never share this code with anyone. LATROCORE staff will never ask for your code.
    </p>
    
    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
    
    <p style="color: #94A3B8; font-size: 11px; text-align: center; margin: 0;">
      © {settings.PROJECT_NAME} Clinical Diabetes System • Secure Authentication
    </p>
  </div>
</body>
</html>
"""
    _log_console(to_email, subject, otp, purpose)
    return _send_smtp(to_email, subject, html_body, text_body)


def send_password_reset_confirmation(to_email: str) -> bool:
    """Notify user that their password was successfully changed."""
    subject = "Your LATROCORE Password Has Been Changed"
    text_body = """
Password Successfully Reset

Hello,

The password for your LATROCORE account was recently changed. All existing active sessions have been securely terminated.

If you made this change, you can safely disregard this message.
If you did NOT authorize this change, please contact your clinic administrator immediately.

— The LATROCORE Healthcare Team
"""
    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #FAF6EF; padding: 30px;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E8DCC8; padding: 32px;">
    <h2 style="color: #046A38; margin-top: 0;">LATROCORE Security Alert</h2>
    <p style="color: #334155; font-size: 14px;">The password for your LATROCORE account was successfully reset. All active sessions have been terminated for security.</p>
    <p style="color: #E34222; font-size: 12px; font-weight: bold;">If you did not make this change, please contact system administration immediately.</p>
  </div>
</body>
</html>
"""
    _log_console(to_email, subject, "", "password_reset_confirmation")
    _send_smtp(to_email, subject, html_body, text_body)
    return True


def send_doctor_approval_notification(to_email: str, doctor_name: str, approved: bool, reason: str = "") -> bool:
    """Notify doctor when their credentials have been approved or rejected."""
    return send_approval_decision_notification(to_email, doctor_name, "doctor", approved, reason)


def send_approval_decision_notification(to_email: str, user_name: str, role: str, approved: bool, reason: str = "") -> bool:
    """Notify user (patient, doctor, pharmacist) when account has been approved or rejected."""
    role_label = "Medical Doctor" if role == "doctor" else ("Pharmacist" if role in ("pharmacist", "care_team") else "Patient")
    portal_label = "Doctor Clinical Station" if role == "doctor" else ("Pharmacist Workstation" if role in ("pharmacist", "care_team") else "Patient Health Portal")

    if approved:
        subject = f"{role_label} Account Approved — Welcome to LATROCORE"
        text = f"Dear {user_name},\n\nYour {role_label} registration has been reviewed and approved by our Medical Board Administration. You can now log in and access your {portal_label}."
    else:
        subject = f"LATROCORE {role_label} Registration Status Update"
        text = f"Dear {user_name},\n\nYour {role_label} registration was reviewed and could not be approved at this time.\nReason: {reason or 'Credentials could not be verified'}"

    _log_console(to_email, subject, "", f"{role}_approval_decision")
    _send_smtp(to_email, subject, text, text)
    return True


# Convenience aliases
def send_otp_email(to_email: str, otp: str, purpose: str = "signup") -> bool:
    return send_email_otp(to_email, otp, purpose)


def send_password_reset_email(to_email: str, otp: str) -> bool:
    return send_email_otp(to_email, otp, "reset_password")


def send_password_reset_confirmation_email(to_email: str, user_name: str = "") -> bool:
    return send_password_reset_confirmation(to_email)

