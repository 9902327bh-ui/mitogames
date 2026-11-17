"""Video submission + processing endpoints."""

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_student
from app.core.exceptions import NotFoundError, ValidationError
from app.models.game import Game
from app.models.student import Student
from app.schemas.video import VideoStatusResponse, VideoSubmissionRead, VideoSubmitRequest
from app.services import video_service
from app.utils.enums import ProcessingStatus
from app.utils.youtube import InvalidYouTubeURL

router = APIRouter(prefix="/videos", tags=["videos"])


@router.post("/submit", response_model=VideoSubmissionRead, status_code=status.HTTP_202_ACCEPTED)
async def submit_video(
    payload: VideoSubmitRequest,
    background_tasks: BackgroundTasks,
    student: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    try:
        submission = await video_service.submit_video(db, student.id, payload.youtube_url, payload.topic_id)
    except InvalidYouTubeURL as exc:
        raise ValidationError(str(exc)) from exc
    # Run the validation -> verification -> generation pipeline asynchronously.
    background_tasks.add_task(video_service.process_submission, submission.id)
    return submission


@router.get("", response_model=list[VideoSubmissionRead])
async def list_videos(
    status_filter: str | None = None,
    topic_id: UUID | None = None,
    student: Student = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    return await video_service.list_submissions(db, student.id, status_filter, topic_id)


@router.get("/{submission_id}", response_model=VideoSubmissionRead)
async def get_video(submission_id: UUID, student: Student = Depends(get_current_student),
                    db: AsyncSession = Depends(get_db)):
    return await video_service.get_submission(db, student.id, submission_id)


@router.get("/{submission_id}/status", response_model=VideoStatusResponse)
async def get_video_status(submission_id: UUID, student: Student = Depends(get_current_student),
                           db: AsyncSession = Depends(get_db)):
    submission = await video_service.get_submission(db, student.id, submission_id)
    # Find the generated game (if any).
    game = (await db.execute(
        select(Game).where(
            Game.video_submission_id == submission.id,
            Game.generation_status == ProcessingStatus.READY.value,
        )
    )).scalar_one_or_none()
    message = None
    if submission.processing_status == ProcessingStatus.READY.value:
        message = submission.processing_message
    return VideoStatusResponse(
        id=submission.id,
        validation_status=submission.validation_status,
        subject_verification_status=submission.subject_verification_status,
        processing_status=submission.processing_status,
        game_id=game.id if game else None,
        message=message,
    )


@router.post("/{submission_id}/retry")
async def retry_video(submission_id: UUID, background_tasks: BackgroundTasks,
                      student: Student = Depends(get_current_student),
                      db: AsyncSession = Depends(get_db)):
    # ensure ownership before retrying
    await video_service.get_submission(db, student.id, submission_id)
    background_tasks.add_task(video_service.retry_processing, submission_id)
    return {"success": True, "message": "Reprocessing started."}
