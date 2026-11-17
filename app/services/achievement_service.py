"""Achievement definitions and award evaluation."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import Achievement, StudentAchievement
from app.models.student import Student
from app.services.progress_service import get_or_create_progress


# Maps criteria.metric -> function returning the value from a StudentProgress.
def _metric_value(progress, metric: str):
    return {
        "games_completed": progress.games_completed,
        "total_games_played": progress.total_games_played,
        "total_simulations_played": progress.total_simulations_played,
        "total_quizzes_taken": progress.total_quizzes_taken,
        "best_single_score": progress.best_single_score,
        "current_streak": progress.current_streak,
        "longest_streak": progress.longest_streak,
        "subjects_explored": progress.subjects_explored,
        "topics_explored": progress.topics_explored,
        "average_score": float(progress.average_score),
        "total_score": progress.total_score,
    }.get(metric, 0)


def _meets_criteria(value, criteria: dict) -> bool:
    threshold = criteria.get("threshold", 0)
    op = criteria.get("operator", ">=")
    if op == ">":
        return value > threshold
    if op == "==":
        return value == threshold
    if op == ">=":
        return value >= threshold
    return False


async def list_achievements(db: AsyncSession, active_only: bool = True) -> list[Achievement]:
    stmt = select(Achievement).order_by(Achievement.name)
    if active_only:
        stmt = stmt.where(Achievement.is_active.is_(True))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def list_student_achievements(db: AsyncSession, student_id: UUID) -> list[StudentAchievement]:
    result = await db.execute(
        select(StudentAchievement).where(StudentAchievement.student_id == student_id).order_by(
            StudentAchievement.earned_at.desc()
        )
    )
    return list(result.scalars().all())


async def evaluate_and_award(db: AsyncSession, student: Student) -> list[StudentAchievement]:
    """Check all unearned active achievements against current progress and award any met."""
    progress = await get_or_create_progress(db, student.id)
    await db.refresh(progress)

    earned_rows = await db.execute(
        select(StudentAchievement.achievement_id).where(StudentAchievement.student_id == student.id)
    )
    earned_ids = {r[0] for r in earned_rows.all()}

    active = await list_achievements(db, active_only=True)
    newly_awarded: list[StudentAchievement] = []
    for ach in active:
        if ach.id in earned_ids:
            continue
        criteria = ach.criteria or {}
        metric = criteria.get("metric")
        if not metric:
            continue
        value = _metric_value(progress, metric)
        if _meets_criteria(value, criteria):
            sa = StudentAchievement(student_id=student.id, achievement_id=ach.id)
            db.add(sa)
            newly_awarded.append(sa)
    if newly_awarded:
        await db.flush()
    return newly_awarded


def serialize_student_achievement(sa: StudentAchievement) -> dict:
    a = sa.achievement
    return {
        "achievement_id": str(a.id),
        "name": a.name,
        "description": a.description,
        "achievement_type": a.achievement_type,
        "icon_url": a.icon_url,
        "points_reward": a.points_reward,
        "earned_at": sa.earned_at.isoformat() if sa.earned_at else None,
    }
