"""AI game endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_student
from app.models.student import Student
from app.schemas.attempt import AttemptResult, GameAttemptRead, GameAttemptRequest
from app.schemas.game import GameListItem, GameRead
from app.services import game_service

router = APIRouter(prefix="/games", tags=["games"])


@router.get("", response_model=list[GameListItem])
async def list_games(topic_id: UUID | None = None, student: Student = Depends(get_current_student),
                     db: AsyncSession = Depends(get_db)):
    return await game_service.list_games(db, student.id, topic_id)


@router.get("/{game_id}", response_model=GameRead)
async def get_game(game_id: UUID, student: Student = Depends(get_current_student),
                   db: AsyncSession = Depends(get_db)):
    return await game_service.get_game(db, student.id, game_id)


@router.post("/{game_id}/attempts", response_model=AttemptResult)
async def submit_game_attempt(
    game_id: UUID,
    payload: GameAttemptRequest,
    student: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    return await game_service.submit_attempt(
        db, student, game_id, payload.responses, payload.duration_seconds, payload.started_at
    )


@router.get("/{game_id}/attempts", response_model=list[GameAttemptRead])
async def list_game_attempts(game_id: UUID, student: Student = Depends(get_current_student),
                             db: AsyncSession = Depends(get_db)):
    return await game_service.list_attempts(db, student.id, game_id)
