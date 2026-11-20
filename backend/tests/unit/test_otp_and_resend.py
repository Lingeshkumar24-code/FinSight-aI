"""
Unit & integration tests for Resend Email and OTP authentication.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.email_service import _build_otp_html, EmailService
from app.services.otp_service import OTPService, otp_service
from app.config import Settings


def test_otp_service_lifecycle():
    service = OTPService()
    email = "cfo@example.com"

    # 1. Request OTP
    code, ttl = service.create_otp(email, purpose="login")
    assert len(code) == 6
    assert code.isdigit()
    assert ttl == 600

    # 2. Rate limiting check within cooldown
    allowed, wait = service.can_request_otp(email)
    assert not allowed
    assert wait > 0

    # 3. Invalid code attempt
    ok, msg = service.verify_otp(email, "000000", purpose="login")
    assert not ok
    assert "Invalid code" in msg

    # 4. Correct code validation
    ok, msg = service.verify_otp(email, code, purpose="login")
    assert ok
    assert msg == "Verification successful."

    # 5. Single-use: cannot reuse already consumed OTP
    ok, msg = service.verify_otp(email, code, purpose="login")
    assert not ok
    assert "No active verification code found" in msg


def test_otp_expiry():
    service = OTPService()
    email = "exec@example.com"
    code, _ = service.create_otp(email, ttl_seconds=-1)  # expired immediately
    ok, msg = service.verify_otp(email, code)
    assert not ok
    assert "expired" in msg.lower()


def test_email_html_template():
    html = _build_otp_html("789123", purpose="login")
    assert "789123" in html
    assert "FinSight AI" in html
    assert "Security Notice" in html
    assert "10 minutes" in html


@pytest.mark.asyncio
async def test_email_service_dev_mode():
    settings = Settings(RESEND_API_KEY="")
    srv = EmailService(settings=settings)
    res = await srv.send_otp_email("test@acme.com", "654321", purpose="login")
    assert res["success"] is True
    assert res["mode"] == "dev_mode"
    assert res["dev_otp"] == "654321"


def test_api_otp_send_and_verify_flow():
    otp_service.clear()
    client = TestClient(app)
    test_email = "newcfo@fintechcorp.in"

    # Step 1: Send OTP
    send_resp = client.post("/api/v1/auth/otp/send", json={"email": test_email, "purpose": "login"})
    assert send_resp.status_code == 200, send_resp.text
    data = send_resp.json()
    assert data["status"] == "success"
    assert data["email"] == test_email
    otp = data.get("dev_otp") or otp_service.peek_code(test_email)
    assert otp is not None
    assert len(otp) == 6

    # Step 2: Rate limit check (requesting another OTP immediately should return 429)
    spam_resp = client.post("/api/v1/auth/otp/send", json={"email": test_email, "purpose": "login"})
    assert spam_resp.status_code == 429

    # Step 3: Verify with incorrect OTP
    bad_verify = client.post("/api/v1/auth/otp/verify", json={"email": test_email, "otp": "999999"})
    assert bad_verify.status_code == 400

    # Step 4: Verify with correct OTP -> Should provision workspace and return JWT token
    verify_resp = client.post(
        "/api/v1/auth/otp/verify",
        json={"email": test_email, "otp": otp, "full_name": "Chief Financial Officer"},
    )
    assert verify_resp.status_code == 200, verify_resp.text
    auth_data = verify_resp.json()
    assert "access_token" in auth_data
    assert auth_data["business_id"].startswith("biz-")
    assert auth_data["user_id"] != ""

    # Step 5: Test /auth/me with the newly issued token
    headers = {"Authorization": f"Bearer {auth_data['access_token']}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["user_id"] == auth_data["user_id"]
    assert me_resp.json()["business_id"] == auth_data["business_id"]


def test_api_reset_password_with_otp():
    otp_service.clear()
    client = TestClient(app)
    email = "reset_user@enterprise.com"

    # Register an account first
    reg = client.post("/api/v1/auth/register", json={"email": email, "password": "OldPassword123!"})
    assert reg.status_code == 200

    # Request reset OTP
    otp_service.clear()
    send_resp = client.post("/api/v1/auth/otp/send", json={"email": email, "purpose": "reset"})
    assert send_resp.status_code == 200
    otp = send_resp.json().get("dev_otp") or otp_service.peek_code(email)

    # Perform password reset
    reset_resp = client.post(
        "/api/v1/auth/reset-password",
        json={"email": email, "otp": otp, "new_password": "NewSecretPassword456!"},
    )
    assert reset_resp.status_code == 200
    assert reset_resp.json()["status"] == "success"

    # Verify old password fails
    fail_login = client.post("/api/v1/auth/login", json={"email": email, "password": "OldPassword123!"})
    assert fail_login.status_code == 401

    # Verify new password succeeds
    good_login = client.post("/api/v1/auth/login", json={"email": email, "password": "NewSecretPassword456!"})
    assert good_login.status_code == 200
    assert "access_token" in good_login.json()
