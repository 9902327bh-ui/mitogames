"""AI game retrieval and attempt submission (server-authoritative scoring)."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.attempt import GameAttempt
from app.models.game import Game
from app.models.student import Student
from app.services import achievement_service, progress_service, scoring_service
from app.utils.enums import ContentType


async def list_games(db: AsyncSession, student_id: UUID, topic_id: UUID | None = None) -> list[Game]:
    stmt = select(Game).where(Game.student_id == student_id, Game.is_active.is_(True)).order_by(
        Game.created_at.desc()
    )
    if topic_id:
        stmt = stmt.where(Game.topic_id == topic_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_game(db: AsyncSession, student_id: UUID, game_id: UUID) -> Game:
    result = await db.execute(
        select(Game).where(Game.id == game_id, Game.student_id == student_id)
    )
    game = result.scalar_one_or_none()
    if game is None:
        raise NotFoundError("Game not found")
    return game


async def submit_attempt(
    db: AsyncSession, student: Student, game_id: UUID, responses: dict,
    duration_seconds: int | None = None, started_at: datetime | None = None,
) -> dict:
    game = await get_game(db, student.id, game_id)
    scored = scoring_service.score_game(game.content, responses)

    attempt = GameAttempt(
        student_id=student.id,
        content_type=ContentType.GAME.value,
        game_id=game.id,
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

    # Update progress (cached) then evaluate achievements.
    await progress_service.recompute_progress(db, student.id)
    await progress_service.recompute_topic_progress(db, student.id, game.topic_id)
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
        "progress": _progress_dict(progress),
    }


async def list_attempts(db: AsyncSession, student_id: UUID, game_id: UUID) -> list[GameAttempt]:
    result = await db.execute(
        select(GameAttempt).where(GameAttempt.game_id == game_id, GameAttempt.student_id == student_id).order_by(
            GameAttempt.created_at.desc()
        )
    )
    return list(result.scalars().all())


def _progress_dict(progress) -> dict:
    return {
        "total_games_played": progress.total_games_played,
        "total_simulations_played": progress.total_simulations_played,
        "total_quizzes_taken": progress.total_quizzes_taken,
        "total_score": progress.total_score,
        "average_score": float(progress.average_score),
        "games_completed": progress.games_completed,
        "best_single_score": progress.best_single_score,
        "subjects_explored": progress.subjects_explored,
        "topics_explored": progress.topics_explored,
        "current_streak": progress.current_streak,
        "longest_streak": progress.longest_streak,
    }
