"""Authentication service: registration, login, token refresh, logout."""

import hashlib
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    TOKEN_TYPE_REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.auth import RefreshToken
from app.models.progress import StudentProgress
from app.models.student import Student
from app.utils.enums import UserRole


def _hash_token(token: str) -> str:
    """SHA-256 hash of a refresh token for DB storage (high-entropy tokens)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def register_student(db: AsyncSession, email: str, username: str, password: str,
                           full_name: str, grade_level: str | None = None) -> Student:
    email = email.lower().strip()
    username = username.strip()

    existing = await db.execute(
        select(Student).where((Student.email == email) | (Student.username == username))
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError("A student with this email or username already exists")

    student = Student(
        email=email,
        username=username,
        full_name=full_name,
        grade_level=grade_level,
        hashed_password=hash_password(password),
        role=UserRole.STUDENT.value,
    )
    db.add(student)
    await db.flush()

    # Initialise an empty progress row so the dashboard always has data.
    db.add(StudentProgress(student_id=student.id))
    await db.commit()
    await db.refresh(student)
    return student


async def authenticate(db: AsyncSession, email: str, password: str) -> tuple[Student, str, str]:
    """Validate credentials and return (student, access_token, refresh_token)."""
    email = email.lower().strip()
    result = await db.execute(select(Student).where(Student.email == email))
    student = result.scalar_one_or_none()
    if student is None or not verify_password(password, student.hashed_password):
        raise UnauthorizedError("Invalid email or password")
    if not student.is_active:
        raise UnauthorizedError("Account is deactivated")

    access_token = create_access_token(subject=str(student.id),
                                       extra_claims={"role": student.role})
    refresh_token = create_refresh_token(subject=str(student.id))

    # Persist the refresh token (hashed) for revocation support.
    db.add(RefreshToken(
        student_id=student.id,
        token_hash=_hash_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    student.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    return student, access_token, refresh_token


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> tuple[str, str]:
    """Issue a new access token from a valid refresh token. Returns (student_id, access_token)."""
    try:
        payload = decode_token(refresh_token)
    except Exception as exc:
        raise UnauthorizedError("Invalid refresh token") from exc

    if payload.get("type") != TOKEN_TYPE_REFRESH:
        raise UnauthorizedError("Invalid token type")

    token_hash = _hash_token(refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored = result.scalar_one_or_none()
    if stored is None or stored.revoked:
        raise UnauthorizedError("Refresh token not recognized or revoked")
    if stored.expires_at < datetime.now(timezone.utc):
        raise UnauthorizedError("Refresh token expired")

    student_id = payload.get("sub")
    access_token = create_access_token(subject=student_id)
    return student_id, access_token


async def logout(db: AsyncSession, refresh_token: str) -> None:
    """Revoke a refresh token."""
    try:
        decode_token(refresh_token)
    except Exception:
        return  # already invalid; nothing to revoke

    token_hash = _hash_token(refresh_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    stored = result.scalar_one_or_none()
    if stored is not None:
        stored.revoked = True
        await db.commit()


async def change_password(db: AsyncSession, student: Student, current_password: str,
                          new_password: str) -> None:
    if not verify_password(current_password, student.hashed_password):
        raise UnauthorizedError("Current password is incorrect")
    student.hashed_password = hash_password(new_password)
    await db.commit()
