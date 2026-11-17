"""Prebuilt simulation model (curated, admin-managed, YouTube-independent)."""

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PKMixin, TimestampMixin
from app.utils.enums import DifficultyLevel

if TYPE_CHECKING:
    from app.models.attempt import GameAttempt
    from app.models.topic import Topic


class PrebuiltSimulation(Base, PKMixin, TimestampMixin):
    __tablename__ = "prebuilt_simulations"

    topic_id: Mapped[str] = mapped_column(ForeignKey("topics.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    difficulty_level: Mapped[str] = mapped_column(
        String(20),
        default=DifficultyLevel.BEGINNER.value,
        server_default="beginner",
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )

    topic: Mapped["Topic"] = relationship(back_populates="simulations", lazy="selectin")
    attempts: Mapped[List["GameAttempt"]] = relationship(
        back_populates="simulation", lazy="selectin"
    )

    __table_args__ = (
        CheckConstraint(
            "difficulty_level IN ('beginner','intermediate','advanced')",
            name="ck_simulations_difficulty",
        ),
        Index("ix_simulations_topic", "topic_id"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<PrebuiltSimulation {self.title}>"
