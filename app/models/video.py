"""Video submission and transcript models (YouTube content)."""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, PKMixin, TimestampMixin
from app.utils.enums import (
    ProcessingStatus,
    SubjectVerificationStatus,
    VideoValidationStatus,
)

if TYPE_CHECKING:
    from app.models.game import Game
    from app.models.quiz import Quiz
    from app.models.student import Student
    from app.models.topic import Topic


class VideoSubmission(Base, PKMixin, TimestampMixin):
    __tablename__ = "video_submissions"

    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False
    )
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id"), nullable=False)
    youtube_url: Mapped[str] = mapped_column(String(500), nullable=False)
    youtube_video_id: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    video_title: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    channel_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    validation_status: Mapped[str] = mapped_column(
        String(20),
        default=VideoValidationStatus.PENDING.value,
        server_default="pending",
        nullable=False,
    )
    validation_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    subject_verification_status: Mapped[str] = mapped_column(
        String(20),
        default=SubjectVerificationStatus.PENDING.value,
        server_default="pending",
        nullable=False,
    )
    verification_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verification_confidence: Mapped[Optional[float]] = mapped_column(
        Numeric(4, 3), nullable=True
    )

    processing_status: Mapped[str] = mapped_column(
        String(20),
        default=ProcessingStatus.PENDING.value,
        server_default="pending",
        nullable=False,
    )
    processing_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    student: Mapped["Student"] = relationship(back_populates="video_submissions", lazy="selectin")
    topic: Mapped["Topic"] = relationship(back_populates="video_submissions", lazy="selectin")
    transcript: Mapped[Optional["VideoTranscript"]] = relationship(
        back_populates="video_submission", uselist=False, lazy="joined", cascade="all, delete-orphan"
    )
    games: Mapped[List["Game"]] = relationship(
        back_populates="video_submission", lazy="selectin"
    )
    quizzes: Mapped[List["Quiz"]] = relationship(
        back_populates="video_submission", lazy="selectin"
    )

    __table_args__ = (
        CheckConstraint(
            "validation_status IN ('pending','valid','invalid','failed')",
            name="ck_video_submissions_validation",
        ),
        CheckConstraint(
            "subject_verification_status IN "
            "('pending','verified','mismatched','uncertain','failed')",
            name="ck_video_submissions_verification",
        ),
        CheckConstraint(
            "processing_status IN ('pending','processing','ready','failed')",
            name="ck_video_submissions_processing",
        ),
        Index("ix_video_submissions_student_created", "student_id", "created_at"),
    )


class VideoTranscript(Base, PKMixin, CreatedAtMixin):
    __tablename__ = "video_transcripts"

    video_submission_id: Mapped[str] = mapped_column(
        ForeignKey("video_submissions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    language: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    is_auto_generated: Mapped[bool] = mapped_column(
        default=False, server_default="false", nullable=False
    )
    transcript_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    video_submission: Mapped["VideoSubmission"] = relationship(
        back_populates="transcript", lazy="selectin"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<VideoTranscript for {self.video_submission_id}>"
