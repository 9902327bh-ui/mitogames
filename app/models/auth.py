"""Refresh token model (revocable, stored hashed)."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, PKMixin

if TYPE_CHECKING:
    from app.models.student import Student


class RefreshToken(Base, PKMixin, CreatedAtMixin):
    __tablename__ = "refresh_tokens"

    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)

    student: Mapped["Student"] = relationship(back_populates="refresh_tokens", lazy="selectin")

    __table_args__ = (Index("ix_refresh_tokens_student", "student_id"),)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<RefreshToken student={self.student_id} revoked={self.revoked}>"
