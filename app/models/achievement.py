"""Achievement definition + earned achievements (student_achievements)."""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, PKMixin, TimestampMixin
from app.utils.enums import AchievementType

if TYPE_CHECKING:
    from app.models.student import Student


class Achievement(Base, PKMixin, TimestampMixin):
    __tablename__ = "achievements"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    achievement_type: Mapped[str] = mapped_column(String(30), nullable=False)
    criteria: Mapped[dict] = mapped_column(JSONB, nullable=False)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    points_reward: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )

    student_achievements: Mapped[List["StudentAchievement"]] = relationship(
        back_populates="achievement", lazy="selectin", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "achievement_type IN "
            "('score_based','attempt_based','streak_based','completion_based','subject_based')",
            name="ck_achievements_type",
        ),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Achievement {self.name}>"


class StudentAchievement(Base, PKMixin, CreatedAtMixin):
    __tablename__ = "student_achievements"

    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    achievement_id: Mapped[str] = mapped_column(
        ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False
    )
    earned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    student: Mapped["Student"] = relationship(back_populates="achievements", lazy="selectin")
    achievement: Mapped["Achievement"] = relationship(
        back_populates="student_achievements", lazy="selectin"
    )

    __table_args__ = (
        UniqueConstraint("student_id", "achievement_id", name="uq_student_achievement"),
        Index("ix_student_achievements_student", "student_id"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<StudentAchievement student={self.student_id} achievement={self.achievement_id}>"
