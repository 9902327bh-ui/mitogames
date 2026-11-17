"""Student (user) model."""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PKMixin, TimestampMixin
from app.utils.enums import UserRole

if TYPE_CHECKING:
    from app.models.achievement import StudentAchievement
    from app.models.attempt import GameAttempt, QuizAttempt
    from app.models.game import Game
    from app.models.progress import StudentProgress, TopicProgress
    from app.models.video import VideoSubmission
    from app.models.auth import RefreshToken


class Student(Base, PKMixin, TimestampMixin):
    __tablename__ = "students"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    grade_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default=UserRole.STUDENT.value, server_default="student"
    )
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true", nullable=False)
    is_email_verified: Mapped[bool] = mapped_column(
        default=False, server_default="false", nullable=False
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships (lazy by default; loaded explicitly in services when needed).
    video_submissions: Mapped[List["VideoSubmission"]] = relationship(
        back_populates="student", lazy="selectin"
    )
    games: Mapped[List["Game"]] = relationship(back_populates="student", lazy="selectin")
    game_attempts: Mapped[List["GameAttempt"]] = relationship(
        back_populates="student", lazy="selectin"
    )
    quiz_attempts: Mapped[List["QuizAttempt"]] = relationship(
        back_populates="student", lazy="selectin"
    )
    achievements: Mapped[List["StudentAchievement"]] = relationship(
        back_populates="student", lazy="selectin"
    )
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        back_populates="student", lazy="selectin"
    )
    progress: Mapped[Optional["StudentProgress"]] = relationship(
        back_populates="student", uselist=False, lazy="selectin"
    )
    topic_progress: Mapped[List["TopicProgress"]] = relationship(
        back_populates="student", lazy="selectin"
    )

    __table_args__ = (CheckConstraint("role IN ('student','admin')", name="ck_students_role"),)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Student {self.username} ({self.email})>"
