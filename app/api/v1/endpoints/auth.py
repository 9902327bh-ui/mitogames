"""Authentication endpoints."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_student
from app.core.ratelimit import limiter
from app.models.student import Student
from app.schemas.auth import (
    AccessTokenResponse,
    AuthMeResponse,
    LogoutRequest,
    RefreshRequest,
    StudentBrief,
    StudentLogin,
    StudentRegister,
    TokenResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=StudentBrief, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, payload: StudentRegister, db: AsyncSession = Depends(get_db)):
    student = await auth_service.register_student(
        db, payload.email, payload.username, payload.password,
        payload.full_name, payload.grade_level,
    )
    return student


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: StudentLogin, db: AsyncSession = Depends(get_db)):
    student, access_token, refresh_token = await auth_service.authenticate(
        db, payload.email, payload.password
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        student=StudentBrief.model_validate(student),
    )


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    _, access_token = await auth_service.refresh_access_token(db, payload.refresh_token)
    return AccessTokenResponse(
        access_token=access_token, expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout")
async def logout(payload: LogoutRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.logout(db, payload.refresh_token)
    return {"success": True}


@router.get("/me", response_model=AuthMeResponse)
async def me(student: Student = Depends(get_current_student)):
    return student
