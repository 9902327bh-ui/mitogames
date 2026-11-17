"""Quiz schemas."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QuizGenerateRequest(BaseModel):
    video_submission_id: Optional[UUID] = None
    topic_id: Optional[UUID] = None
    num_questions: int = Field(default=5, ge=1, le=20)
    difficulty: str = Field(default="beginner")


class QuizQuestion(BaseModel):
    """A single quiz question — used for AI generation output validation."""

    question: str
    choices: list[str]
    correct_index: int
    explanation: Optional[str] = None


class QuizRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: Optional[UUID] = None
    video_submission_id: Optional[UUID] = None
    topic_id: UUID
    title: str
    description: Optional[str] = None
    questions: list  # JSONB: list of question objects (correct answers hidden until attempted)
    quiz_type: str
    difficulty_level: str
    is_active: bool
    created_at: datetime


class QuizListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    topic_id: UUID
    title: str
    quiz_type: str
    difficulty_level: str
    is_active: bool
    created_at: datetime
