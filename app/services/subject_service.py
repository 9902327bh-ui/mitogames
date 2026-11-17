"""Subject and topic catalog (read for students, CRUD for admins)."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.subject import Subject
from app.models.topic import Topic
from app.schemas.subject import SubjectCreate, TopicCreate


async def list_subjects(db: AsyncSession, active_only: bool = True) -> list[Subject]:
    stmt = select(Subject).order_by(Subject.display_order, Subject.name)
    if active_only:
        stmt = stmt.where(Subject.is_active.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_subject(db: AsyncSession, subject_id: UUID) -> Subject:
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if subject is None:
        raise NotFoundError("Subject not found")
    return subject


async def list_topics(db: AsyncSession, subject_id: UUID, active_only: bool = True) -> list[Topic]:
    stmt = select(Topic).where(Topic.subject_id == subject_id).order_by(
        Topic.display_order, Topic.name
    )
    if active_only:
        stmt = stmt.where(Topic.is_active.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_topic(db: AsyncSession, topic_id: UUID) -> Topic:
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()
    if topic is None:
        raise NotFoundError("Topic not found")
    return topic


# --- Admin CRUD -------------------------------------------------------------
async def create_subject(db: AsyncSession, data: SubjectCreate) -> Subject:
    subject = Subject(**data.model_dump())
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject


async def create_topic(db: AsyncSession, data: TopicCreate) -> Topic:
    topic = Topic(**data.model_dump())
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic
