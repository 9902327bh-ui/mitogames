"""Prebuilt simulation retrieval and attempt submission."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.attempt import GameAttempt
from app.models.simulation import PrebuiltSimulation
from app.models.student import Student
from app.schemas.simulation import SimulationCreate
from app.services import achievement_service, progress_service, scoring_service
from app.utils.enums import ContentType


async def list_simulations(db: AsyncSession, topic_id: UUID | None = None) -> list[PrebuiltSimulation]:
    stmt = select(PrebuiltSimulation).where(PrebuiltSimulation.is_active.is_(True)).order_by(
        PrebuiltSimulation.title
    )
    if topic_id:
        stmt = stmt.where(PrebuiltSimulation.topic_id == topic_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_simulation(db: AsyncSession, simulation_id: UUID) -> PrebuiltSimulation:
    result = await db.execute(
        select(PrebuiltSimulation).where(
            PrebuiltSimulation.id == simulation_id, PrebuiltSimulation.is_active.is_(True)
        )
    )
    sim = result.scalar_one_or_none()
    if sim is None:
        raise NotFoundError("Simulation not found")
    return sim


async def submit_attempt(
    db: AsyncSession, student: Student, simulation_id: UUID, responses: dict,
    duration_seconds: int | None = None, started_at: datetime | None = None,
) -> dict:
    sim = await get_simulation(db, simulation_id)
    scored = scoring_service.score_game(sim.content, responses)

    attempt = GameAttempt(
        student_id=student.id,
        content_type=ContentType.SIMULATION.value,
        simulation_id=sim.id,
        score=scored["score"],
        max_score=scored["max_score"],
        percentage=scored["percentage"],
        is_passed=scored["is_passed"],
        duration_seconds=duration_seconds,
        responses=responses,
        started_at=started_at,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    await db.flush()

    await progress_service.recompute_progress(db, student.id)
    await progress_service.recompute_topic_progress(db, student.id, sim.topic_id)
    new_achievements = await achievement_service.evaluate_and_award(db, student)
    await db.commit()
    await db.refresh(attempt)

    progress = await progress_service.get_or_create_progress(db, student.id)
    return {
        "attempt_id": str(attempt.id),
        "score": attempt.score,
        "max_score": attempt.max_score,
        "percentage": float(attempt.percentage),
        "is_passed": attempt.is_passed,
        "feedback": scored["feedback"],
        "new_achievements": [achievement_service.serialize_student_achievement(sa) for sa in new_achievements],
        "progress": {
            "total_simulations_played": progress.total_simulations_played,
            "games_completed": progress.games_completed,
            "total_score": progress.total_score,
            "current_streak": progress.current_streak,
        },
    }


async def list_attempts(db: AsyncSession, student_id: UUID, simulation_id: UUID) -> list[GameAttempt]:
    result = await db.execute(
        select(GameAttempt).where(
            GameAttempt.simulation_id == simulation_id, GameAttempt.student_id == student_id
        ).order_by(GameAttempt.created_at.desc())
    )
    return list(result.scalars().all())


# --- Admin CRUD -------------------------------------------------------------
async def create_simulation(db: AsyncSession, data: SimulationCreate) -> PrebuiltSimulation:
    sim = PrebuiltSimulation(**data.model_dump())
    db.add(sim)
    await db.commit()
    await db.refresh(sim)
    return sim
