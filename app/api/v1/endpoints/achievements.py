"""Achievement endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_student
from app.models.student import Student
from app.schemas.achievement import AchievementRead, StudentAchievementRead
from app.services import achievement_service

router = APIRouter(tags=["achievements"])


@router.get("/achievements", response_model=list[AchievementRead])
async def list_achievements(_: Student = Depends(get_current_student), db: AsyncSession = Depends(get_db)):
    return await achievement_service.list_achievements(db)


@router.get("/students/me/achievements", response_model=list[StudentAchievementRead])
async def my_achievements(student: Student = Depends(get_current_student),
                          db: AsyncSession = Depends(get_db)):
    sas = await achievement_service.list_student_achievements(db, student.id)
    return [
        StudentAchievementRead(
            achievement_id=sa.achievement.id,
            name=sa.achievement.name,
            description=sa.achievement.description,
            achievement_type=sa.achievement.achievement_type,
            icon_url=sa.achievement.icon_url,
            points_reward=sa.achievement.points_reward,
            earned_at=sa.earned_at,
        )
        for sa in sas
    ]
