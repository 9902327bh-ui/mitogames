"""Student progress: recomputes cached aggregate metrics after each attempt."""

from collections import defaultdict
from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import GameAttempt, QuizAttempt
from app.models.progress import StudentProgress, TopicProgress
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.video import VideoSubmission


async def get_or_create_progress(db: AsyncSession, student_id: UUID) -> StudentProgress:
    result = await db.execute(
        select(StudentProgress).where(StudentProgress.student_id == student_id)
    )
    progress = result.scalar_one_or_none()
    if progress is None:
        progress = StudentProgress(student_id=student_id)
        db.add(progress)
        await db.flush()
    return progress


def _streak(dates: set[date]) -> tuple[int, int]:
    """Return (current_streak, longest_streak) from a set of activity dates."""
    if not dates:
        return 0, 0
    ordered = sorted(dates, reverse=True)
    longest = 1
    current = 1
    today = date.today()
    # current streak: from today backward
    current_streak = 0
    cursor = today
    sorted_desc = sorted(dates, reverse=True)
    # If the most recent activity isn't today or yesterday, current streak may be 0.
    # Count consecutive days ending at the latest activity date.
    latest = max(dates)
    run = 0
    cur = latest
    while cur in dates:
        run += 1
        from datetime import timedelta
        cur = cur - timedelta(days=1)
    current_streak = run

    # longest streak
    asc = sorted(dates)
    best = 1
    seq = 1
    from datetime import timedelta
    for i in range(1, len(asc)):
        if asc[i] == asc[i - 1] + timedelta(days=1):
            seq += 1
            best = max(best, seq)
        else:
            seq = 1
    longest_streak = best
    return current_streak, longest_streak


async def recompute_progress(db: AsyncSession, student_id: UUID) -> StudentProgress:
    """Recompute every field of student_progress from attempts + submissions."""
    student_id = UUID(str(student_id))

    # Game/simulation attempts.
    ga = (await db.execute(
        select(GameAttempt).where(GameAttempt.student_id == student_id)
    )).scalars().all()
    qa = (await db.execute(
        select(QuizAttempt).where(QuizAttempt.student_id == student_id)
    )).scalars().all()
    vs = (await db.execute(
        select(VideoSubmission).where(VideoSubmission.student_id == student_id)
    )).scalars().all()

    total_games_played = sum(1 for a in ga if a.content_type == "game")
    total_simulations_played = sum(1 for a in ga if a.content_type == "simulation")
    total_quizzes_taken = len(qa)

    best_single_score = max((a.score for a in ga), default=0)
    best_per_content: dict[tuple, int] = {}
    for a in ga:
        key = ("game", a.game_id) if a.content_type == "game" else ("sim", a.simulation_id)
        if key[1] is None:
            continue
        best_per_content[key] = max(best_per_content.get(key, 0), a.score)
    total_score = sum(best_per_content.values())

    passed_game = {a.game_id for a in ga if a.content_type == "game" and a.is_passed and a.game_id}
    passed_sim = {a.simulation_id for a in ga if a.content_type == "simulation" and a.is_passed and a.simulation_id}
    games_completed = len(passed_game) + len(passed_sim)

    # average percentage across all attempts (games/sims + quizzes)
    percentages = [float(a.percentage) for a in ga] + [float(a.percentage) for a in qa]
    average_score = round(sum(percentages) / len(percentages), 2) if percentages else 0.0

    # topics explored: from attempts + video submissions
    topic_ids: set[UUID] = set()
    for a in ga:
        tid = getattr(a, "topic_id", None)  # not directly on attempt; resolved below
    # Attempts don't carry topic_id; resolve via the played content.
    content_topic_ids: set[UUID] = set()
    # Load topic ids for games/sims attempted.
    game_ids = [a.game_id for a in ga if a.game_id]
    sim_ids = [a.simulation_id for a in ga if a.simulation_id]
    if game_ids:
        from app.models.game import Game
        rows = (await db.execute(select(Game.topic_id).where(Game.id.in_(game_ids)))).all()
        content_topic_ids.update(r[0] for r in rows)
    if sim_ids:
        from app.models.simulation import PrebuiltSimulation
        rows = (await db.execute(select(PrebuiltSimulation.topic_id).where(PrebuiltSimulation.id.in_(sim_ids)))).all()
        content_topic_ids.update(r[0] for r in rows)
    quiz_ids = [a.quiz_id for a in qa]
    if quiz_ids:
        from app.models.quiz import Quiz
        rows = (await db.execute(select(Quiz.topic_id).where(Quiz.id.in_(quiz_ids)))).all()
        content_topic_ids.update(r[0] for r in rows)
    content_topic_ids.update(v.topic_id for v in vs)
    topics_explored = len(content_topic_ids)

    subjects_explored = 0
    if content_topic_ids:
        rows = (await db.execute(
            select(Topic.subject_id).where(Topic.id.in_(list(content_topic_ids)))
        )).all()
        subjects_explored = len({r[0] for r in rows})

    # Streaks from all activity dates.
    activity_dates: set[date] = set()
    for a in list(ga) + list(qa):
        if a.created_at:
            activity_dates.add(a.created_at.astimezone(timezone.utc).date())
    for v in vs:
        if v.created_at:
            activity_dates.add(v.created_at.astimezone(timezone.utc).date())
    current_streak, longest_streak = _streak(activity_dates)

    last_activity_at = max(
        (a.created_at for a in list(ga) + list(qa) + list(vs) if a.created_at),
        default=None,
    )

    progress = await get_or_create_progress(db, student_id)
    progress.total_games_played = total_games_played
    progress.total_simulations_played = total_simulations_played
    progress.total_quizzes_taken = total_quizzes_taken
    progress.total_score = total_score
    progress.average_score = average_score
    progress.games_completed = games_completed
    progress.best_single_score = best_single_score
    progress.subjects_explored = subjects_explored
    progress.topics_explored = topics_explored
    progress.current_streak = current_streak
    progress.longest_streak = longest_streak
    progress.last_activity_at = last_activity_at
    await db.commit()
    return progress


async def recompute_topic_progress(db: AsyncSession, student_id: UUID, topic_id: UUID,
                                   quiz_percentage: float | None = None) -> TopicProgress:
    """Recompute a single topic's progress row."""
    result = await db.execute(
        select(TopicProgress).where(
            TopicProgress.student_id == student_id, TopicProgress.topic_id == topic_id
        )
    )
    tp = result.scalar_one_or_none()
    if tp is None:
        tp = TopicProgress(student_id=student_id, topic_id=topic_id)
        db.add(tp)
        await db.flush()

    from app.models.game import Game
    from app.models.simulation import PrebuiltSimulation

    # Game/sim attempts in this topic.
    game_ids = [r[0] for r in (await db.execute(select(Game.id).where(Game.topic_id == topic_id))).all()]
    sim_ids = [r[0] for r in (await db.execute(select(PrebuiltSimulation.id).where(PrebuiltSimulation.topic_id == topic_id))).all()]

    ga_rows = []
    if game_ids:
        ga_rows += (await db.execute(
            select(GameAttempt).where(GameAttempt.game_id.in_(game_ids), GameAttempt.student_id == student_id)
        )).scalars().all()
    if sim_ids:
        ga_rows += (await db.execute(
            select(GameAttempt).where(GameAttempt.simulation_id.in_(sim_ids), GameAttempt.student_id == student_id)
        )).scalars().all()

    tp.games_played = sum(1 for a in ga_rows if a.content_type == "game")
    tp.simulations_played = sum(1 for a in ga_rows if a.content_type == "simulation")
    tp.best_game_score = max((a.score for a in ga_rows), default=0)

    from app.models.quiz import Quiz
    quiz_ids = [r[0] for r in (await db.execute(select(Quiz.id).where(Quiz.topic_id == topic_id))).all()]
    qa_rows = []
    if quiz_ids:
        qa_rows = (await db.execute(
            select(QuizAttempt).where(QuizAttempt.quiz_id.in_(quiz_ids), QuizAttempt.student_id == student_id)
        )).scalars().all()
    tp.quizzes_taken = len(qa_rows)
    tp.best_quiz_percentage = max((float(a.percentage) for a in qa_rows), default=0.0)
    tp.is_completed = tp.games_played > 0 and tp.best_game_score > 0
    tp.last_activity_at = max(
        (a.created_at for a in list(ga_rows) + list(qa_rows) if a.created_at),
        default=None,
    )
    await db.commit()
    return tp


# --- Read helpers for the progress/dashboard endpoints ----------------------
async def get_progress(db: AsyncSession, student_id: UUID) -> StudentProgress:
    return await get_or_create_progress(db, student_id)


async def list_topic_progress(db: AsyncSession, student_id: UUID) -> list[dict]:
    rows = (await db.execute(
        select(TopicProgress, Topic.name, Topic.subject_id).join(
            Topic, TopicProgress.topic_id == Topic.id
        ).where(TopicProgress.student_id == student_id)
    )).all()
    results = []
    for tp, topic_name, subject_id in rows:
        # resolve subject name
        subj = (await db.execute(select(Subject.name).where(Subject.id == subject_id))).scalar_one_or_none()
        results.append({
            "topic_id": str(tp.topic_id),
            "topic_name": topic_name,
            "subject_name": subj,
            "games_played": tp.games_played,
            "simulations_played": tp.simulations_played,
            "best_game_score": tp.best_game_score,
            "quizzes_taken": tp.quizzes_taken,
            "best_quiz_percentage": float(tp.best_quiz_percentage),
            "is_completed": tp.is_completed,
            "last_activity_at": tp.last_activity_at.isoformat() if tp.last_activity_at else None,
        })
    return results


async def recent_activity(db: AsyncSession, student_id: UUID, limit: int = 10) -> list[dict]:
    ga = (await db.execute(
        select(GameAttempt).where(GameAttempt.student_id == student_id).order_by(
            GameAttempt.created_at.desc()
        ).limit(limit)
    )).scalars().all()
    qa = (await db.execute(
        select(QuizAttempt).where(QuizAttempt.student_id == student_id).order_by(
            QuizAttempt.created_at.desc()
        ).limit(limit)
    )).scalars().all()
    items = []
    for a in ga:
        items.append({
            "type": a.content_type,
            "score": a.score,
            "max_score": a.max_score,
            "percentage": float(a.percentage),
            "is_passed": a.is_passed,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    for a in qa:
        items.append({
            "type": "quiz",
            "score": a.score,
            "max_score": a.max_score,
            "percentage": float(a.percentage),
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return items[:limit]
