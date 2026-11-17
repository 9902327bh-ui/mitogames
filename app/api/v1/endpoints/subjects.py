"""Subject and topic catalog endpoints (student-facing reads)."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_student
from app.models.student import Student
from app.schemas.subject import SubjectRead, TopicRead
from app.services import subject_service

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("", response_model=list[SubjectRead])
async def list_subjects(db: AsyncSession = Depends(get_db), _: Student = Depends(get_current_student)):
    return await subject_service.list_subjects(db)


@router.get("/{subject_id}", response_model=SubjectRead)
async def get_subject(subject_id: UUID, db: AsyncSession = Depends(get_db),
                       _: Student = Depends(get_current_student)):
    return await subject_service.get_subject(db, subject_id)


@router.get("/{subject_id}/topics", response_model=list[TopicRead])
async def list_topics(subject_id: UUID, db: AsyncSession = Depends(get_db),
                      _: Student = Depends(get_current_student)):
    return await subject_service.list_topics(db, subject_id)


# Separate router for /topics (no subject prefix).
topic_router = APIRouter(prefix="/topics", tags=["subjects"])


@topic_router.get("/{topic_id}", response_model=TopicRead)
async def get_topic(topic_id: UUID, db: AsyncSession = Depends(get_db),
                    _: Student = Depends(get_current_student)):
    return await subject_service.get_topic(db, topic_id)
