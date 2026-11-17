"""Optional quiz endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_student
from app.models.student import Student
from app.schemas.attempt import AttemptResult, QuizAttemptRead, QuizAttemptRequest
from app.schemas.quiz import QuizGenerateRequest, QuizListItem, QuizRead
from app.services import quiz_service

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


@router.post("/generate", response_model=QuizRead, status_code=201)
async def generate_quiz(payload: QuizGenerateRequest, student: Student = Depends(get_current_student),
                        db: AsyncSession = Depends(get_db)):
    quiz = await quiz_service.generate_quiz(
        db, student, payload.video_submission_id, payload.topic_id,
        payload.num_questions, payload.difficulty,
    )
    return _public_quiz(quiz)


@router.get("", response_model=list[QuizListItem])
async def list_quizzes(topic_id: UUID | None = None, quiz_type: str | None = None,
                       student: Student = Depends(get_current_student),
                       db: AsyncSession = Depends(get_db)):
    return await quiz_service.list_quizzes(db, student.id, topic_id, quiz_type)


@router.get("/{quiz_id}", response_model=QuizRead)
async def get_quiz(quiz_id: UUID, student: Student = Depends(get_current_student),
                   db: AsyncSession = Depends(get_db)):
    quiz = await quiz_service.get_quiz(db, student.id, quiz_id)
    return _public_quiz(quiz)


@router.post("/{quiz_id}/attempts", response_model=AttemptResult)
async def submit_quiz_attempt(quiz_id: UUID, payload: QuizAttemptRequest,
                              student: Student = Depends(get_current_student),
                              db: AsyncSession = Depends(get_db)):
    return await quiz_service.submit_attempt(db, student, quiz_id, payload.responses)


@router.get("/{quiz_id}/attempts", response_model=list[QuizAttemptRead])
async def list_quiz_attempts(quiz_id: UUID, student: Student = Depends(get_current_student),
                             db: AsyncSession = Depends(get_db)):
    return await quiz_service.list_attempts(db, student.id, quiz_id)


def _public_quiz(quiz) -> QuizRead:
    """Return a QuizRead copy with answers stripped from questions."""
    data = QuizRead.model_validate(quiz)
    data.questions = quiz_service.public_questions(quiz)
    return data
