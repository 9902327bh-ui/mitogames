"""Quiz model (AI-generated or prebuilt)."""

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PKMixin, TimestampMixin
from app.utils.enums import DifficultyLevel, QuizType

if TYPE_CHECKING:
    from app.models.attempt import QuizAttempt
    from app.models.student import Student
    from app.models.topic import Topic
    from app.models.video import VideoSubmission


class Quiz(Base, PKMixin, TimestampMixin):
    __tablename__ = "quizzes"

    student_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("students.id"), index=True, nullable=True
    )  # NULL for prebuilt/shared quizzes
    video_submission_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("video_submissions.id", ondelete="SET NULL"), nullable=True
    )
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id"), index=True, nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    questions: Mapped[list] = mapped_column(JSONB, nullable=False)
    quiz_type: Mapped[str] = mapped_column(String(20), nullable=False)
    difficulty_level: Mapped[str] = mapped_column(
        String(20),
        default=DifficultyLevel.BEGINNER.value,
        server_default="beginner",
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )

    student: Mapped[Optional["Student"]] = relationship(lazy="selectin")
    video_submission: Mapped[Optional["VideoSubmission"]] = relationship(
        back_populates="quizzes", lazy="selectin"
    )
    topic: Mapped["Topic"] = relationship(back_populates="quizzes", lazy="selectin")
    attempts: Mapped[List["QuizAttempt"]] = relationship(
        back_populates="quiz", lazy="selectin"
    )

    __table_args__ = (
        CheckConstraint("quiz_type IN ('ai_generated','prebuilt')", name="ck_quizzes_type"),
        CheckConstraint(
            "difficulty_level IN ('beginner','intermediate','advanced')",
            name="ck_quizzes_difficulty",
        ),
        Index("ix_quizzes_topic", "topic_id"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Quiz {self.title} ({self.quiz_type})>"
