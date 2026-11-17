"""Attempt (game/simulation/quiz) submission + result schemas."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GameAttemptRequest(BaseModel):
    """Client submits answers (responses) for a game or simulation."""

    responses: dict
    duration_seconds: Optional[int] = Field(default=None, ge=0)
    started_at: Optional[datetime] = None


class AttemptResult(BaseModel):
    """Server-computed result returned after a game/simulation attempt."""

    attempt_id: UUID
    score: int
    max_score: int
    percentage: float
    is_passed: bool = False
    feedback: Optional[dict] = None
    new_achievements: list[dict] = []
    progress: Optional[dict] = None


class GameAttemptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    content_type: str
    game_id: Optional[UUID] = None
    simulation_id: Optional[UUID] = None
    score: int
    max_score: int
    percentage: float
    is_passed: bool
    duration_seconds: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime


class QuizAttemptRequest(BaseModel):
    """Client submits quiz answers: {question_index: chosen_index}."""

    responses: dict


class QuizAttemptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    quiz_id: UUID
    score: int
    max_score: int
    percentage: float
    feedback: Optional[dict] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
