"""Video submission schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class VideoSubmitRequest(BaseModel):
    youtube_url: str = Field(min_length=10, max_length=500)
    topic_id: UUID


class VideoSubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: UUID
    topic_id: UUID
    youtube_url: str
    youtube_video_id: str
    video_title: Optional[str] = None
    channel_name: Optional[str] = None
    duration_seconds: Optional[int] = None
    thumbnail_url: Optional[str] = None
    validation_status: str
    validation_message: Optional[str] = None
    subject_verification_status: str
    verification_message: Optional[str] = None
    verification_confidence: Optional[float] = None
    processing_status: str
    processing_message: Optional[str] = None
    created_at: datetime


class VideoStatusResponse(BaseModel):
    """Lightweight status poll payload for the frontend."""

    id: UUID
    validation_status: str
    subject_verification_status: str
    processing_status: str
    game_id: Optional[UUID] = None
    message: Optional[str] = None
