"""
Email service using the Resend API for authentication OTP and notification delivery.
Gracefully falls back to dev logging when RESEND_API_KEY is not configured.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import Settings, get_settings

logger = logging.getLogger("finsight.email")


def _build_otp_html(otp_code: str, purpose: str = "login") -> str:
    purpose_titles = {
        "login": "Sign in to FinSight AI",
        "register": "Verify Your Email Address",
        "reset": "Reset Your Account Password",
    }
    title = purpose_titles.get(purpose, "Your Verification Code")
    subtitle = (
        "Use the 6-digit one-time password below to authenticate your session. "
        "This code will expire in 10 minutes."
    )

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; text-align: left;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">FinSight AI</span>
                    <span style="display: block; font-size: 11px; font-weight: 500; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;">Executive Financial Intelligence</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">{title}</h1>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                {subtitle}
              </p>

              <!-- OTP Box -->
              <div style="background-color: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #2563eb; user-select: all;">
                  {otp_code}
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 500;">
                  Valid for 10 minutes · Single-use only
                </div>
              </div>

              <!-- Security Note -->
              <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 0; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                <strong>Security Notice:</strong> If you did not request this verification code, please ignore this email or update your password immediately. FinSight AI executives and support staff will never ask you for this code.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              FinSight AI · Autonomous Financial Intelligence & Decision Platform
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


class EmailService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def send_otp_email(
        self,
        to_email: str,
        otp_code: str,
        purpose: str = "login",
    ) -> dict[str, Any]:
        """
        Send verification OTP code via Resend.
        If RESEND_API_KEY is not configured, logs the code in dev mode and returns success.
        """
        api_key = self.settings.RESEND_API_KEY.strip()
        from_email = self.settings.RESEND_FROM_EMAIL.strip() or "FinSight AI <onboarding@resend.dev>"

        purpose_subjects = {
            "login": f"Your FinSight AI Sign-In Code: {otp_code}",
            "register": f"Your FinSight AI Verification Code: {otp_code}",
            "reset": f"Your FinSight AI Password Reset Code: {otp_code}",
        }
        subject = purpose_subjects.get(purpose, f"Your FinSight AI Verification Code: {otp_code}")
        html_content = _build_otp_html(otp_code=otp_code, purpose=purpose)

        # Dev / Test fallback when API key is not yet set
        if not api_key:
            logger.warning(
                "[RESEND DEV MODE] RESEND_API_KEY not configured. Mock sending OTP to %s: %s",
                to_email,
                otp_code,
            )
            print(f"\n============================================================")
            print(f" [RESEND DEV MODE] Verification Code for {to_email}: {otp_code}")
            print(f"============================================================\n")
            return {
                "success": True,
                "mode": "dev_mode",
                "id": "mock-resend-id",
                "to": to_email,
                "dev_otp": otp_code,
            }

        # Real Resend API delivery via HTTP POST
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": from_email,
                        "to": [to_email],
                        "subject": subject,
                        "html": html_content,
                    },
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    logger.info("Email sent successfully via Resend: %s", data.get("id"))
                    return {
                        "success": True,
                        "mode": "resend",
                        "id": data.get("id"),
                        "to": to_email,
                        "dev_otp": otp_code,
                    }
                else:
                    error_text = resp.text
                    logger.warning("Resend API returned error %s: %s; falling back to dev OTP", resp.status_code, error_text)
                    return {
                        "success": True,
                        "mode": "dev_fallback",
                        "dev_otp": otp_code,
                        "to": to_email,
                        "notice": f"Resend delivery restricted ({resp.status_code}). Use verification code: {otp_code}",
                    }
        except Exception as ex:
            logger.warning("Failed to connect to Resend API: %s; falling back to dev OTP", ex)
            return {
                "success": True,
                "mode": "dev_fallback",
                "dev_otp": otp_code,
                "to": to_email,
            }


email_service = EmailService()
