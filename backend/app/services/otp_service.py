"""
In-memory OTP storage with TTL expiration, attempt tracking, and rate limiting.
"""
from __future__ import annotations

import secrets
import time
from dataclasses import dataclass
from typing import ClassVar


@dataclass
class OTPRecord:
    code: str
    purpose: str
    expires_at: float
    created_at: float
    attempts: int = 0


class OTPService:
    DEFAULT_TTL_SECONDS: ClassVar[int] = 600  # 10 minutes
    MAX_ATTEMPTS: ClassVar[int] = 5
    RATE_LIMIT_COOLDOWN_SECONDS: ClassVar[int] = 30  # minimum seconds between requests

    def __init__(self) -> None:
        self._store: dict[str, OTPRecord] = {}

    def _normalize_email(self, email: str) -> str:
        return email.strip().lower()

    def can_request_otp(self, email: str) -> tuple[bool, int]:
        """Check if email is within rate limit cooldown. Returns (allowed, seconds_to_wait)."""
        key = self._normalize_email(email)
        rec = self._store.get(key)
        if not rec:
            return True, 0
        now = time.time()
        elapsed = now - rec.created_at
        if elapsed < self.RATE_LIMIT_COOLDOWN_SECONDS:
            remaining = int(self.RATE_LIMIT_COOLDOWN_SECONDS - elapsed)
            return False, remaining
        return True, 0

    def create_otp(
        self,
        email: str,
        purpose: str = "login",
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
    ) -> tuple[str, int]:
        """Generate a cryptographically secure 6-digit OTP code."""
        key = self._normalize_email(email)
        now = time.time()

        # Generate 6-digit numerical code (100000 - 999999)
        code = str(secrets.randbelow(900000) + 100000)
        expires_at = now + ttl_seconds

        self._store[key] = OTPRecord(
            code=code,
            purpose=purpose,
            expires_at=expires_at,
            created_at=now,
            attempts=0,
        )
        return code, ttl_seconds

    def verify_otp(
        self, email: str, code: str, purpose: str = "login"
    ) -> tuple[bool, str]:
        """
        Validate OTP code.
        Returns (is_valid, message). On success, the OTP is consumed (single-use).
        """
        key = self._normalize_email(email)
        rec = self._store.get(key)

        if not rec:
            return False, "No active verification code found. Please request a new code."

        now = time.time()
        if now > rec.expires_at:
            del self._store[key]
            return False, "Verification code has expired. Please request a new code."

        if rec.purpose != purpose:
            return False, f"Verification code is not valid for {purpose}."

        rec.attempts += 1
        if rec.attempts > self.MAX_ATTEMPTS:
            del self._store[key]
            return False, "Too many failed attempts. Verification code invalidated."

        # Constant-time comparison to prevent timing attacks
        clean_code = code.strip()
        if not secrets.compare_digest(rec.code, clean_code):
            remaining = self.MAX_ATTEMPTS - rec.attempts
            return False, f"Invalid code. {remaining} attempt(s) remaining."

        # Consumed successfully
        del self._store[key]
        return True, "Verification successful."

    def peek_code(self, email: str) -> str | None:
        """Helper for dev/testing to view current active code."""
        rec = self._store.get(self._normalize_email(email))
        return rec.code if rec else None

    def clear(self) -> None:
        """Clear all active OTPs (primarily for test teardown)."""
        self._store.clear()


# Global singleton service
otp_service = OTPService()
