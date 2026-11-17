"""Achievement schemas."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AchievementCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str
    achievement_type: str
    criteria: dict
    icon_url: Optional[str] = None
    points_reward: int = 0


class AchievementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str
    achievement_type: str
    criteria: dict
    icon_url: Optional[str] = None
    points_reward: int
    is_active: bool


class StudentAchievementRead(BaseModel):
    """An earned achievement for a student, with earned_at."""

    model_config = ConfigDict(from_attributes=True)

    achievement_id: UUID
    name: str
    description: str
    achievement_type: str
    icon_url: Optional[str] = None
    points_reward: int
    earned_at: datetime
