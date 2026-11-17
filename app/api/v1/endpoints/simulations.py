"""Prebuilt simulation endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_student
from app.models.student import Student
from app.schemas.attempt import AttemptResult, GameAttemptRead, GameAttemptRequest
from app.schemas.simulation import SimulationListItem, SimulationRead
from app.services import simulation_service

router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.get("", response_model=list[SimulationListItem])
async def list_simulations(topic_id: UUID | None = None, _: Student = Depends(get_current_student),
                           db: AsyncSession = Depends(get_db)):
    return await simulation_service.list_simulations(db, topic_id)


@router.get("/{simulation_id}", response_model=SimulationRead)
async def get_simulation(simulation_id: UUID, _: Student = Depends(get_current_student),
                         db: AsyncSession = Depends(get_db)):
    return await simulation_service.get_simulation(db, simulation_id)


@router.post("/{simulation_id}/attempts", response_model=AttemptResult)
async def submit_simulation_attempt(
    simulation_id: UUID,
    payload: GameAttemptRequest,
    student: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    return await simulation_service.submit_attempt(
        db, student, simulation_id, payload.responses, payload.duration_seconds, payload.started_at
    )


@router.get("/{simulation_id}/attempts", response_model=list[GameAttemptRead])
async def list_simulation_attempts(simulation_id: UUID, student: Student = Depends(get_current_student),
                                    db: AsyncSession = Depends(get_db)):
    return await simulation_service.list_attempts(db, student.id, simulation_id)
