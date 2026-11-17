"""Progress + dashboard schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class StudentProgressRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_games_played: int
    total_simulations_played: int
    total_quizzes_taken: int
    total_score: int
    average_score: float
    games_completed: int
    best_single_score: int
    subjects_explored: int
    topics_explored: int
    current_streak: int
    longest_streak: int
    last_activity_at: Optional[datetime] = None


class TopicProgressRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    topic_id: UUID
    topic_name: Optional[str] = None
    subject_name: Optional[str] = None
    games_played: int
    simulations_played: int
    best_game_score: int
    quizzes_taken: int
    best_quiz_percentage: float
    is_completed: bool
    last_activity_at: Optional[datetime] = None


class DashboardResponse(BaseModel):
    progress: StudentProgressRead
    recent_activity: list[dict] = []
    recent_achievements: list[dict] = []
