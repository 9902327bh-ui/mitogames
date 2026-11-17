"""Progress and dashboard endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_student
from app.models.student import Student
from app.schemas.progress import DashboardResponse, StudentProgressRead, TopicProgressRead
from app.services import achievement_service, progress_service

router = APIRouter(tags=["progress"])


@router.get("/students/me/progress", response_model=StudentProgressRead)
async def get_progress(student: Student = Depends(get_current_student),
                       db: AsyncSession = Depends(get_db)):
    return await progress_service.get_progress(db, student.id)


@router.get("/students/me/progress/topics", response_model=list[TopicProgressRead])
async def get_topic_progress(student: Student = Depends(get_current_student),
                             db: AsyncSession = Depends(get_db)):
    return await progress_service.list_topic_progress(db, student.id)


@router.get("/students/me/progress/activity")
async def get_recent_activity(student: Student = Depends(get_current_student),
                              db: AsyncSession = Depends(get_db)):
    return await progress_service.recent_activity(db, student.id)


@router.get("/students/me/dashboard", response_model=DashboardResponse)
async def get_dashboard(student: Student = Depends(get_current_student),
                        db: AsyncSession = Depends(get_db)):
    progress = await progress_service.get_progress(db, student.id)
    activity = await progress_service.recent_activity(db, student.id)
    sas = await achievement_service.list_student_achievements(db, student.id)
    recent_achievements = [
        achievement_service.serialize_student_achievement(sa) for sa in sas[:5]
    ]
    return DashboardResponse(progress=progress, recent_activity=activity, recent_achievements=recent_achievements)
