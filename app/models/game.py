"""AI-generated game model."""

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PKMixin, TimestampMixin
from app.utils.enums import DifficultyLevel, ProcessingStatus

if TYPE_CHECKING:
    from app.models.attempt import GameAttempt
    from app.models.student import Student
    from app.models.topic import Topic
    from app.models.video import VideoSubmission


class Game(Base, PKMixin, TimestampMixin):
    __tablename__ = "games"

    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id"), index=True, nullable=False
    )
    video_submission_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("video_submissions.id", ondelete="SET NULL"), nullable=True
    )
    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id"), index=True, nullable=False)

    game_type: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    difficulty_level: Mapped[str] = mapped_column(
        String(20),
        default=DifficultyLevel.BEGINNER.value,
        server_default="beginner",
        nullable=False,
    )

    generation_status: Mapped[str] = mapped_column(
        String(20),
        default=ProcessingStatus.PENDING.value,
        server_default="pending",
        nullable=False,
    )
    generation_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )

    student: Mapped["Student"] = relationship(back_populates="games", lazy="selectin")
    video_submission: Mapped[Optional["VideoSubmission"]] = relationship(
        back_populates="games", lazy="selectin"
    )
    topic: Mapped["Topic"] = relationship(back_populates="games", lazy="selectin")
    attempts: Mapped[List["GameAttempt"]] = relationship(
        back_populates="game", lazy="selectin"
    )

    __table_args__ = (
        CheckConstraint(
            "difficulty_level IN ('beginner','intermediate','advanced')",
            name="ck_games_difficulty",
        ),
        CheckConstraint(
            "generation_status IN ('pending','generating','ready','failed')",
            name="ck_games_generation_status",
        ),
        Index("ix_games_student_created", "student_id", "created_at"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Game {self.title}>"
