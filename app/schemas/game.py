"""Game schemas."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GameRead(BaseModel):
    """Full game payload including the generated content (JSONB)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: UUID
    video_submission_id: Optional[UUID] = None
    topic_id: UUID
    game_type: str
    title: str
    description: Optional[str] = None
    content: dict
    difficulty_level: str
    generation_status: str
    generation_message: Optional[str] = None
    is_active: bool
    created_at: datetime


class GameListItem(BaseModel):
    """Lighter item used in list responses (no full content)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    topic_id: UUID
    game_type: str
    title: str
    description: Optional[str] = None
    difficulty_level: str
    generation_status: str
    created_at: datetime
