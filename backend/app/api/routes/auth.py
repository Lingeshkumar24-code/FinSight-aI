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
from app.models.schemas import LoginRequest, LoginResponse, MeResponse, RegisterRequest

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
