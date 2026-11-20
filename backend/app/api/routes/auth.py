"""
Authentication routes supporting both registered accounts with isolated workspaces
and fallback demo credentials.
"""
from __future__ import annotations

import hashlib
import re
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.security import TokenPayload, create_access_token, get_current_user
from app.db.extensions import User
from app.db.models import Business
from app.db.session import get_session
from app.db.tenant import demo_business_id
from app.models.schemas import (
    LoginRequest,
    LoginResponse,
    MeResponse,
    RegisterRequest,
    ResetPasswordRequest,
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
)
from app.services.email_service import email_service
from app.services.otp_service import otp_service

router = APIRouter(prefix="/auth", tags=["auth"])

_DEMO_BUSINESS_ID = demo_business_id()


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}:{key.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, key_hex = stored_hash.split(":", 1)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False


@router.post("/register", response_model=LoginResponse)
async def register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LoginResponse:
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid email is required")
    if not payload.password or len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters"
        )

    # Check if user already exists
    existing = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please log in instead.",
        )

    # Generate isolated workspace business_id and user_id
    user_id = str(uuid.uuid4())
    prefix = re.sub(r"[^a-zA-Z0-9]", "", email.split("@")[0])[:12].lower() or "user"
    business_id = f"biz-{prefix}-{uuid.uuid4().hex[:6]}"

    # Create dedicated Business workspace
    biz_name = payload.business_name.strip() or f"{payload.full_name.strip() or prefix.capitalize()}'s Workspace"
    new_biz = Business(id=business_id, name=biz_name, currency="INR")
    session.add(new_biz)
    await session.flush()

    # Create User
    new_user = User(
        id=user_id,
        email=email,
        password_hash=_hash_password(payload.password),
        full_name=payload.full_name.strip(),
        business_id=business_id,
        role="owner",
    )
    session.add(new_user)
    await session.commit()

    token = create_access_token(
        user_id=user_id, business_id=business_id, role="owner", settings=settings
    )
    return LoginResponse(access_token=token, business_id=business_id, user_id=user_id)


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LoginResponse:
    email = payload.email.strip().lower()
    if not email or not payload.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing credentials")

    # Demo credentials handling
    if email == "owner@example.com":
        biz_id = _DEMO_BUSINESS_ID
        biz = (await session.execute(select(Business).where(Business.id == biz_id))).scalar_one_or_none()
        if not biz:
            session.add(Business(id=biz_id, name="Acme Global Holdings", currency="INR"))
            await session.commit()

        token = create_access_token(
            user_id="demo-owner", business_id=biz_id, role="owner", settings=settings
        )
        return LoginResponse(access_token=token, business_id=biz_id, user_id="demo-owner")

    # Look up existing user
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email. Please create an account first.",
        )

    # Enforce strict password verification against the PBKDF2 hash stored during account creation
    if not _verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please verify and try again.",
        )

    token = create_access_token(
        user_id=user.id, business_id=user.business_id, role=user.role, settings=settings
    )
    return LoginResponse(access_token=token, business_id=user.business_id, user_id=user.id)


@router.get("/me", response_model=MeResponse)
def me(current_user: TokenPayload = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        user_id=current_user.sub, business_id=current_user.business_id, role=current_user.role
    )


@router.post("/otp/send", response_model=SendOtpResponse)
async def send_otp(
    payload: SendOtpRequest,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> SendOtpResponse:
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="A valid email address is required"
        )

    # Rate limiting check
    can_request, wait_seconds = otp_service.can_request_otp(email)
    if not can_request:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {wait_seconds} seconds before requesting another verification code.",
        )

    # For password reset, confirm account exists
    if payload.purpose == "reset":
        user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if not user and email != "owner@example.com":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No registered account found with this email.",
            )

    code, ttl = otp_service.create_otp(email=email, purpose=payload.purpose)
    result = await email_service.send_otp_email(to_email=email, otp_code=code, purpose=payload.purpose)

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Failed to deliver verification email via Resend."),
        )

    return SendOtpResponse(
        status="success",
        message="Verification code sent to your email.",
        email=email,
        expires_in_seconds=ttl,
        mode=result.get("mode", "resend"),
        dev_otp=result.get("dev_otp"),
    )


@router.post("/otp/verify", response_model=LoginResponse)
async def verify_otp(
    payload: VerifyOtpRequest,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LoginResponse:
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid email is required")
    if not payload.otp or len(payload.otp.strip()) != 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A 6-digit code is required")

    # Verify code
    is_valid, msg = otp_service.verify_otp(email=email, code=payload.otp, purpose=payload.purpose)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # Demo account shortcut
    if email == "owner@example.com":
        biz_id = _DEMO_BUSINESS_ID
        biz = (await session.execute(select(Business).where(Business.id == biz_id))).scalar_one_or_none()
        if not biz:
            session.add(Business(id=biz_id, name="Acme Global Holdings", currency="INR"))
            await session.commit()
        token = create_access_token(
            user_id="demo-owner", business_id=biz_id, role="owner", settings=settings
        )
        return LoginResponse(access_token=token, business_id=biz_id, user_id="demo-owner")

    # Check if existing user
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user:
        token = create_access_token(
            user_id=user.id, business_id=user.business_id, role=user.role, settings=settings
        )
        return LoginResponse(access_token=token, business_id=user.business_id, user_id=user.id)

    # If new user authenticating via OTP, automatically provision their dedicated workspace
    user_id = str(uuid.uuid4())
    prefix = re.sub(r"[^a-zA-Z0-9]", "", email.split("@")[0])[:12].lower() or "user"
    business_id = f"biz-{prefix}-{uuid.uuid4().hex[:6]}"

    biz_name = payload.business_name.strip() or f"{payload.full_name.strip() or prefix.capitalize()}'s Workspace"
    new_biz = Business(id=business_id, name=biz_name, currency="INR")
    session.add(new_biz)
    await session.flush()

    new_user = User(
        id=user_id,
        email=email,
        password_hash=_hash_password(secrets.token_urlsafe(16)),
        full_name=payload.full_name.strip(),
        business_id=business_id,
        role="owner",
    )
    session.add(new_user)
    await session.commit()

    token = create_access_token(
        user_id=user_id, business_id=business_id, role="owner", settings=settings
    )
    return LoginResponse(access_token=token, business_id=business_id, user_id=user_id)


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid email is required")
    if not payload.new_password or len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters"
        )

    # Validate OTP code for password reset
    is_valid, msg = otp_service.verify_otp(email=email, code=payload.otp, purpose="reset")
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User account not found."
        )

    user.password_hash = _hash_password(payload.new_password)
    await session.commit()
    return {"status": "success", "message": "Password reset successfully. You can now log in."}
