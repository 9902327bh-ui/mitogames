"""Cached progress tables: student_progress (1:1) and topic_progress (per topic)."""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PKMixin

if TYPE_CHECKING:
    from app.models.student import Student
    from app.models.topic import Topic


class StudentProgress(Base, PKMixin):
    __tablename__ = "student_progress"

    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    total_games_played: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    total_simulations_played: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    total_quizzes_taken: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    total_score: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    average_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0, server_default="0", nullable=False)
    games_completed: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    best_single_score: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    subjects_explored: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    topics_explored: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    last_activity_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    student: Mapped["Student"] = relationship(back_populates="progress", lazy="selectin")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<StudentProgress for {self.student_id}>"


class TopicProgress(Base, PKMixin):
    __tablename__ = "topic_progress"

    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    topic_id: Mapped[str] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), nullable=False
    )
    games_played: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    simulations_played: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    best_game_score: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    quizzes_taken: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    best_quiz_percentage: Mapped[float] = mapped_column(Numeric(5, 2), default=0, server_default="0", nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    last_activity_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    student: Mapped["Student"] = relationship(back_populates="topic_progress", lazy="selectin")
    topic: Mapped["Topic"] = relationship(back_populates="topic_progress", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("student_id", "topic_id", name="uq_topic_progress_student_topic"),
        Index("ix_topic_progress_student", "student_id"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<TopicProgress student={self.student_id} topic={self.topic_id}>"
