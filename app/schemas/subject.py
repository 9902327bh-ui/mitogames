"""Subject and topic schemas."""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SubjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    icon_url: Optional[str] = None
    display_order: int = 0


class SubjectCreate(SubjectBase):
    pass


class SubjectRead(SubjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool


class TopicBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: Optional[str] = None
    difficulty_level: str = Field(default="beginner")
    display_order: int = 0


class TopicCreate(TopicBase):
    subject_id: UUID


class TopicRead(TopicBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    subject_id: UUID
    is_active: bool


class SubjectWithTopics(SubjectRead):
    topics: list[TopicRead] = []
