"""Auth schemas: registration, login, token responses."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# --- Requests ----------------------------------------------------------------
class StudentRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=150)
    grade_level: Optional[str] = Field(default=None, max_length=50)


class StudentLogin(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


# --- Responses ---------------------------------------------------------------
class StudentBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    username: str
    full_name: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    student: StudentBrief


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthMeResponse(StudentBrief):
    model_config = ConfigDict(from_attributes=True)

    grade_level: Optional[str] = None
    avatar_url: Optional[str] = None
    is_email_verified: bool = False
    created_at: datetime


# Password strength: require at least one letter and one digit.
class _PasswordStrength(StudentRegister):
    @field_validator("password")
    @classmethod
    def _strength(cls, v: str) -> str:
        if not any(c.isalpha() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one letter and one digit")
        return v


# Re-export the validated register schema (with strength check).
StudentRegister = _PasswordStrength
