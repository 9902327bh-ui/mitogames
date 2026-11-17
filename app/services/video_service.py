"""Video submission + processing pipeline (YouTube validation -> subject
verification -> AI game generation). Runs as an async background task."""

import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.transcript_client import transcript_client
from app.clients.youtube_client import youtube_client
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.game import Game
from app.models.topic import Topic
from app.models.video import VideoSubmission, VideoTranscript
from app.services.ai import ai_service
from app.utils.enums import (
    ProcessingStatus,
    SubjectVerificationStatus,
    VideoValidationStatus,
)
from app.utils.youtube import InvalidYouTubeURL, extract_video_id

logger = logging.getLogger(__name__)


async def submit_video(db: AsyncSession, student_id: UUID, youtube_url: str,
                      topic_id: UUID) -> VideoSubmission:
    """Create a submission record (URL pre-validated by the schema layer).

    Raises NotFoundError (via subject_service) if the topic doesn't exist.
    """
    video_id = extract_video_id(youtube_url)  # raises InvalidYouTubeURL -> 400
    from app.services.subject_service import get_topic
    await get_topic(db, topic_id)  # ensures topic exists

    submission = VideoSubmission(
        student_id=student_id,
        topic_id=topic_id,
        youtube_url=youtube_url,
        youtube_video_id=video_id,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission


async def _set_status(submission: VideoSubmission, **fields) -> None:
    for k, v in fields.items():
        setattr(submission, k, v)


async def process_submission(submission_id: UUID) -> None:
    """Background pipeline. Runs in its own DB session (request session closed)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(VideoSubmission).where(VideoSubmission.id == submission_id)
        )
        submission = result.scalar_one_or_none()
        if submission is None:
            logger.warning("process_submission: submission %s not found", submission_id)
            return

        submission.processing_status = ProcessingStatus.PROCESSING.value
        await db.commit()

        try:
            await _run_pipeline(db, submission)
        except Exception as exc:  # never leave the record stuck in 'processing'
            logger.exception("Video processing failed for %s", submission_id)
            submission.processing_status = ProcessingStatus.FAILED.value
            submission.processing_message = f"Processing error: {exc}"
            await db.commit()


async def _run_pipeline(db: AsyncSession, submission: VideoSubmission) -> None:
    # Load topic for AI context.
    topic = (await db.execute(select(Topic).where(Topic.id == submission.topic_id))).scalar_one()
    topic_name = topic.name
    topic_description = topic.description or ""

    # 1) YouTube metadata validation (blocking -> thread).
    try:
        info = await asyncio.to_thread(youtube_client.get_video_info, submission.youtube_video_id)
    except Exception as exc:
        submission.validation_status = VideoValidationStatus.FAILED.value
        submission.validation_message = f"YouTube API error: {exc}"
        submission.processing_status = ProcessingStatus.READY.value
        await db.commit()
        return

    if info is None:
        submission.validation_status = VideoValidationStatus.INVALID.value
        submission.validation_message = "Video not found, private, or deleted."
        submission.processing_status = ProcessingStatus.READY.value
        await db.commit()
        return

    # Duration sanity check.
    duration = info.get("duration_seconds") or 0
    if duration and (
        duration < settings.YOUTUBE_MIN_DURATION_SECONDS
        or duration > settings.YOUTUBE_MAX_DURATION_SECONDS
    ):
        submission.validation_status = VideoValidationStatus.INVALID.value
        submission.validation_message = (
            f"Video duration {duration}s is outside the allowed range "
            f"({settings.YOUTUBE_MIN_DURATION_SECONDS}-{settings.YOUTUBE_MAX_DURATION_SECONDS}s)."
        )
        submission.processing_status = ProcessingStatus.READY.value
        await db.commit()
        return

    submission.validation_status = VideoValidationStatus.VALID.value
    submission.video_title = info.get("title")
    submission.channel_name = info.get("channel_name")
    submission.duration_seconds = duration
    submission.thumbnail_url = info.get("thumbnail_url")
    await db.commit()

    # 2) Transcript fetch (blocking -> thread).
    transcript_data = await asyncio.to_thread(
        transcript_client.get_transcript, submission.youtube_video_id
    )
    transcript_text = ""
    if transcript_data:
        transcript_text = transcript_data.get("text", "")
        db.add(VideoTranscript(
            video_submission_id=submission.id,
            language=transcript_data.get("language"),
            is_auto_generated=transcript_data.get("is_auto_generated", False),
            transcript_text=transcript_text,
        ))
        await db.commit()

    # Fallback text for AI if no transcript available.
    if not transcript_text:
        transcript_text = f"{submission.video_title or ''}. {info.get('description', '')}"

    # 3) AI subject verification.
    try:
        verification = await ai_service.verify_subject(
            transcript_text, submission.video_title or "", topic_name, topic_description
        )
    except Exception as exc:
        logger.exception("Subject verification failed: %s", exc)
        submission.subject_verification_status = SubjectVerificationStatus.FAILED.value
        submission.verification_message = f"Verification error: {exc}"
        await db.commit()
    else:
        if verification.matches and verification.confidence >= settings.AI_SUBJECT_CONFIDENCE_THRESHOLD:
            submission.subject_verification_status = SubjectVerificationStatus.VERIFIED.value
        elif verification.matches is False:
            submission.subject_verification_status = SubjectVerificationStatus.MISMATCHED.value
        else:
            submission.subject_verification_status = SubjectVerificationStatus.UNCERTAIN.value
        submission.verification_message = verification.reasoning
        submission.verification_confidence = verification.confidence
        await db.commit()

    # 4) Game generation (only if verified or uncertain; not on mismatch).
    status = submission.subject_verification_status
    if status in (SubjectVerificationStatus.VERIFIED.value, SubjectVerificationStatus.UNCERTAIN.value):
        try:
            game_content = await ai_service.generate_game(transcript_text, topic_name, topic.difficulty_level)
        except Exception as exc:
            logger.exception("Game generation failed: %s", exc)
            submission.processing_status = ProcessingStatus.FAILED.value
            submission.processing_message = f"Game generation error: {exc}"
            await db.commit()
            return

        game = Game(
            student_id=submission.student_id,
            video_submission_id=submission.id,
            topic_id=submission.topic_id,
            game_type=game_content.get("game_type", "quiz_game"),
            title=game_content.get("title", f"Game: {topic_name}"),
            description=game_content.get("description", ""),
            content=game_content,
            difficulty_level=topic.difficulty_level,
            generation_status=ProcessingStatus.READY.value,
        )
        db.add(game)
        await db.commit()
        await db.refresh(game)
        submission.processing_status = ProcessingStatus.READY.value
        submission.processing_message = None
        await db.commit()
    else:
        # Mismatched/failed verification: ready, but no game generated.
        submission.processing_status = ProcessingStatus.READY.value
        submission.processing_message = (
            "No game generated: video subject did not match the selected topic."
            if status == SubjectVerificationStatus.MISMATCHED.value
            else "No game generated: subject verification failed."
        )
        await db.commit()


async def list_submissions(db: AsyncSession, student_id: UUID, status: str | None = None,
                           topic_id: UUID | None = None) -> list[VideoSubmission]:
    stmt = select(VideoSubmission).where(VideoSubmission.student_id == student_id).order_by(
        VideoSubmission.created_at.desc()
    )
    if status:
        stmt = stmt.where(VideoSubmission.validation_status == status)
    if topic_id:
        stmt = stmt.where(VideoSubmission.topic_id == topic_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_submission(db: AsyncSession, student_id: UUID, submission_id: UUID) -> VideoSubmission:
    result = await db.execute(
        select(VideoSubmission).where(
            VideoSubmission.id == submission_id, VideoSubmission.student_id == student_id
        )
    )
    submission = result.scalar_one_or_none()
    if submission is None:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Video submission not found")
    return submission


async def retry_processing(submission_id: UUID) -> None:
    """Re-run the pipeline for a failed submission."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(VideoSubmission).where(VideoSubmission.id == submission_id)
        )
        submission = result.scalar_one_or_none()
        if submission is None:
            return
        submission.processing_status = ProcessingStatus.PENDING.value
        submission.processing_message = None
        await db.commit()
    await process_submission(submission_id)
