"""Student profile management."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.student import Student
from app.schemas.student import StudentUpdate


async def get_profile(student: Student) -> Student:
    return student


async def update_profile(db: AsyncSession, student: Student, data: StudentUpdate) -> Student:
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(student, field, value)
    await db.commit()
    return student


async def deactivate_account(db: AsyncSession, student: Student) -> None:
    student.is_active = False
    await db.commit()
