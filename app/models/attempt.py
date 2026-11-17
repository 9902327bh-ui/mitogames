"""Attempt models.

GameAttempt covers both AI games and prebuilt simulations (identical attempt
structure) via a content_type discriminator + CHECK constraint. QuizAttempt is
separate because quiz evaluation has per-question feedback semantics.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, PKMixin
from app.utils.enums import ContentType

if TYPE_CHECKING:
    from app.models.game import Game
    from app.models.simulation import PrebuiltSimulation
    from app.models.student import Student


class GameAttempt(Base, PKMixin, CreatedAtMixin):
    """A single play-through of a game or a prebuilt simulation."""

    __tablename__ = "game_attempts"

    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id"), index=True, nullable=False
    )
    content_type: Mapped[str] = mapped_column(String(20), nullable=False)
    game_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("games.id", ondelete="CASCADE"), index=True, nullable=True
    )
    simulation_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("prebuilt_simulations.id", ondelete="CASCADE"), index=True, nullable=True
    )

    score: Mapped[int] = mapped_column(Integer, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False)
    percentage: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    is_passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    responses: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    student: Mapped["Student"] = relationship(back_populates="game_attempts", lazy="selectin")
    game: Mapped[Optional["Game"]] = relationship(back_populates="attempts", lazy="selectin")
    simulation: Mapped[Optional["PrebuiltSimulation"]] = relationship(
        back_populates="attempts", lazy="selectin"
    )

    __table_args__ = (
        CheckConstraint("content_type IN ('game','simulation')", name="ck_game_attempts_type"),
        CheckConstraint(
            "(content_type = 'game' AND game_id IS NOT NULL AND simulation_id IS NULL) OR "
            "(content_type = 'simulation' AND simulation_id IS NOT NULL AND game_id IS NULL)",
            name="ck_game_attempts_content",
        ),
        Index("ix_game_attempts_student_created", "student_id", "created_at"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<GameAttempt {self.content_type} score={self.score}/{self.max_score}>"


class QuizAttempt(Base, PKMixin, CreatedAtMixin):
    """A single attempt at a quiz with per-question feedback."""

    __tablename__ = "quiz_attempts"

    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id"), index=True, nullable=False
    )
    quiz_id: Mapped[str] = mapped_column(
        ForeignKey("quizzes.id", ondelete="CASCADE"), index=True, nullable=False
    )

    score: Mapped[int] = mapped_column(Integer, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False)
    percentage: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    responses: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    feedback: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    student: Mapped["Student"] = relationship(back_populates="quiz_attempts", lazy="selectin")
    quiz: Mapped["Quiz"] = relationship(back_populates="attempts", lazy="selectin")

    __table_args__ = (Index("ix_quiz_attempts_student_created", "student_id", "created_at"),)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<QuizAttempt score={self.score}/{self.max_score}>"
