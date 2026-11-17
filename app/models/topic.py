"""Topic model (belongs to a subject)."""

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PKMixin, TimestampMixin
from app.utils.enums import DifficultyLevel

if TYPE_CHECKING:
    from app.models.game import Game
    from app.models.progress import TopicProgress
    from app.models.quiz import Quiz
    from app.models.simulation import PrebuiltSimulation
    from app.models.subject import Subject
    from app.models.video import VideoSubmission


class Topic(Base, PKMixin, TimestampMixin):
    __tablename__ = "topics"

    subject_id: Mapped[str] = mapped_column(
        ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    difficulty_level: Mapped[str] = mapped_column(
        String(20),
        default=DifficultyLevel.BEGINNER.value,
        server_default="beginner",
        nullable=False,
    )
    display_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )

    subject: Mapped["Subject"] = relationship(back_populates="topics", lazy="selectin")
    video_submissions: Mapped[List["VideoSubmission"]] = relationship(
        back_populates="topic", lazy="selectin"
    )
    games: Mapped[List["Game"]] = relationship(back_populates="topic", lazy="selectin")
    simulations: Mapped[List["PrebuiltSimulation"]] = relationship(
        back_populates="topic", lazy="selectin"
    )
    quizzes: Mapped[List["Quiz"]] = relationship(back_populates="topic", lazy="selectin")
    topic_progress: Mapped[List["TopicProgress"]] = relationship(
        back_populates="topic", lazy="selectin"
    )

    __table_args__ = (
        CheckConstraint(
            "difficulty_level IN ('beginner','intermediate','advanced')",
            name="ck_topics_difficulty",
        ),
        Index("ix_topics_subject_order", "subject_id", "display_order"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Topic {self.name}>"
