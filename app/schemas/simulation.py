"""Prebuilt simulation schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SimulationCreate(BaseModel):
    topic_id: UUID
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    content: dict
    difficulty_level: str = Field(default="beginner")
    is_active: bool = True


class SimulationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    topic_id: UUID
    title: str
    description: Optional[str] = None
    content: dict
    difficulty_level: str
    is_active: bool
    created_at: datetime


class SimulationListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    topic_id: UUID
    title: str
    description: Optional[str] = None
    difficulty_level: str
    created_at: datetime
