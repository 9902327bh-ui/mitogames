"""FastAPI dependencies: DB session, current student, current admin."""

from typing import Optional

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import TOKEN_TYPE_ACCESS, decode_token
from app.models.student import Student
from app.utils.enums import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")


async def get_current_student(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Student:
    """Resolve the bearer access token to an active Student."""
    try:
        payload = decode_token(token)
    except Exception as exc:  # jwt.InvalidTokenError or similar
        raise UnauthorizedError("Invalid or expired token") from exc

    if payload.get("type") != TOKEN_TYPE_ACCESS:
        raise UnauthorizedError("Invalid token type")

    student_id = payload.get("sub")
    if not student_id:
        raise UnauthorizedError("Malformed token")

    result = await db.execute(select(Student).where(Student.id == student_id))
    student: Optional[Student] = result.scalar_one_or_none()
    if student is None or not student.is_active:
        raise UnauthorizedError("User not found or inactive")

    return student


async def get_current_admin(student: Student = Depends(get_current_student)) -> Student:
    """Require the current student to be an admin."""
    if student.role != UserRole.ADMIN.value:
        raise ForbiddenError("Admin access required")
    return student
