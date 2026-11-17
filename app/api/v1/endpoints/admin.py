"""Admin catalog management endpoints (admin role required)."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.achievement import Achievement
from app.models.student import Student
from app.schemas.achievement import AchievementCreate, AchievementRead
from app.schemas.simulation import SimulationCreate, SimulationRead
from app.schemas.subject import SubjectCreate, SubjectRead, TopicCreate, TopicRead
from app.services import simulation_service, subject_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/subjects", response_model=SubjectRead, status_code=201)
async def create_subject(payload: SubjectCreate, admin: Student = Depends(get_current_admin),
                          db: AsyncSession = Depends(get_db)):
    return await subject_service.create_subject(db, payload)


@router.post("/topics", response_model=TopicRead, status_code=201)
async def create_topic(payload: TopicCreate, admin: Student = Depends(get_current_admin),
                       db: AsyncSession = Depends(get_db)):
    return await subject_service.create_topic(db, payload)


@router.post("/simulations", response_model=SimulationRead, status_code=201)
async def create_simulation(payload: SimulationCreate, admin: Student = Depends(get_current_admin),
                             db: AsyncSession = Depends(get_db)):
    return await simulation_service.create_simulation(db, payload)


@router.post("/achievements", response_model=AchievementRead, status_code=201)
async def create_achievement(payload: AchievementCreate, admin: Student = Depends(get_current_admin),
                              db: AsyncSession = Depends(get_db)):
    ach = Achievement(**payload.model_dump())
    db.add(ach)
    await db.commit()
    await db.refresh(ach)
    return ach
