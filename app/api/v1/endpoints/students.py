"""Student profile endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_student
from app.models.student import Student
from app.schemas.student import StudentProfile, StudentUpdate
from app.schemas.auth import PasswordChange
from app.services import auth_service, student_service

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/me", response_model=StudentProfile)
async def get_me(student: Student = Depends(get_current_student)):
    return student


@router.patch("/me", response_model=StudentProfile)
async def update_me(
    payload: StudentUpdate,
    student: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    return await student_service.update_profile(db, student, payload)


@router.put("/me/password")
async def change_password(
    payload: PasswordChange,
    student: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.change_password(db, student, payload.current_password, payload.new_password)
    return {"success": True}


@router.delete("/me")
async def deactivate_me(
    student: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    await student_service.deactivate_account(db, student)
    return {"success": True}
