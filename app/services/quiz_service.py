"""Optional quizzes: AI generation, retrieval, and attempt evaluation."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.models.attempt import QuizAttempt
from app.models.quiz import Quiz
from app.models.student import Student
from app.models.video import VideoSubmission, VideoTranscript
from app.services import achievement_service, progress_service, scoring_service
from app.services.ai import ai_service
from app.utils.enums import QuizType


async def _resolve_context(db: AsyncSession, video_submission_id: UUID | None,
                          topic_id: UUID | None) -> tuple[str, UUID, str]:
    """Return (transcript_text, topic_id, topic_name) for generation."""
    from app.models.topic import Topic

    if video_submission_id is not None:
        vs = (await db.execute(
            select(VideoSubmission).where(VideoSubmission.id == video_submission_id)
        )).scalar_one_or_none()
        if vs is None:
            raise NotFoundError("Video submission not found")
        # ownership check is done by the endpoint; here we just resolve context.
        tr = (await db.execute(
            select(VideoTranscript).where(VideoTranscript.video_submission_id == vs.id)
        )).scalar_one_or_none()
        text = (tr.transcript_text if tr and tr.transcript_text else f"{vs.video_title or ''}")
        topic = (await db.execute(select(Topic).where(Topic.id == vs.topic_id))).scalar_one()
        return text, vs.topic_id, topic.name

    if topic_id is not None:
        topic = (await db.execute(select(Topic).where(Topic.id == topic_id))).scalar_one_or_none()
        if topic is None:
            raise NotFoundError("Topic not found")
        return topic.name, topic.id, topic.name

    raise ValidationError("Provide either video_submission_id or topic_id.")


async def generate_quiz(db: AsyncSession, student: Student, video_submission_id: UUID | None,
                        topic_id: UUID | None, num_questions: int, difficulty: str) -> Quiz:
    # If a video submission is given, ensure it belongs to the student.
    if video_submission_id is not None:
        vs = (await db.execute(
            select(VideoSubmission).where(
                VideoSubmission.id == video_submission_id,
                VideoSubmission.student_id == student.id,
            )
        )).scalar_one_or_none()
        if vs is None:
            raise NotFoundError("Video submission not found")

    text, resolved_topic_id, topic_name = await _resolve_context(db, video_submission_id, topic_id)
    result = await ai_service.generate_quiz(text, topic_name, num_questions, difficulty)

    quiz = Quiz(
        student_id=student.id,
        video_submission_id=video_submission_id,
        topic_id=resolved_topic_id,
        title=result.get("title", f"Quiz: {topic_name}"),
        questions=result.get("questions", []),
        quiz_type=QuizType.AI_GENERATED.value,
        difficulty_level=difficulty,
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return quiz


async def list_quizzes(db: AsyncSession, student_id: UUID, topic_id: UUID | None = None,
                      quiz_type: str | None = None) -> list[Quiz]:
    """Return quizzes the student may access: their own AI quizzes + active prebuilt ones."""
    stmt = select(Quiz).where(Quiz.is_active.is_(True)).order_by(Quiz.created_at.desc())
    if topic_id:
        stmt = stmt.where(Quiz.topic_id == topic_id)
    if quiz_type:
        stmt = stmt.where(Quiz.quiz_type == quiz_type)
    else:
        # own AI quizzes OR any prebuilt
        stmt = stmt.where((Quiz.student_id == student_id) | (Quiz.quiz_type == QuizType.PREBUILT.value))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_quiz(db: AsyncSession, student_id: UUID, quiz_id: UUID) -> Quiz:
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if quiz is None or not quiz.is_active:
        raise NotFoundError("Quiz not found")
    # Access control: prebuilt quizzes are shared; AI quizzes only by owner.
    if quiz.quiz_type == QuizType.AI_GENERATED.value and quiz.student_id != student_id:
        raise NotFoundError("Quiz not found")
    return quiz


def public_questions(quiz: Quiz) -> list[dict]:
    """Strip answers/explanations for the pre-attempt view returned to clients."""
    stripped = []
    for q in (quiz.questions or []):
        stripped.append({
            "question": q.get("question"),
            "choices": q.get("choices", []),
        })
    return stripped


async def submit_attempt(db: AsyncSession, student: Student, quiz_id: UUID,
                         responses: dict) -> dict:
    quiz = await get_quiz(db, student.id, quiz_id)
    scored = scoring_service.score_quiz(quiz.questions, responses)

    attempt = QuizAttempt(
        student_id=student.id,
        quiz_id=quiz.id,
        score=scored["score"],
        max_score=scored["max_score"],
        percentage=scored["percentage"],
        responses=responses,
        feedback=scored["feedback"],
        completed_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    await db.flush()

    await progress_service.recompute_progress(db, student.id)
    await progress_service.recompute_topic_progress(db, student.id, quiz.topic_id)
    new_achievements = await achievement_service.evaluate_and_award(db, student)
    await db.commit()
    await db.refresh(attempt)

    return {
        "attempt_id": str(attempt.id),
        "score": attempt.score,
        "max_score": attempt.max_score,
        "percentage": float(attempt.percentage),
        "is_passed": float(attempt.percentage) >= 60,
        "feedback": scored["feedback"],
        "new_achievements": [achievement_service.serialize_student_achievement(sa) for sa in new_achievements],
    }


async def list_attempts(db: AsyncSession, student_id: UUID, quiz_id: UUID) -> list[QuizAttempt]:
    result = await db.execute(
        select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.student_id == student_id).order_by(
            QuizAttempt.created_at.desc()
        )
    )
    return list(result.scalars().all())
