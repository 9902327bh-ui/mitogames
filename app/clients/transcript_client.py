"""Transcript fetcher using youtube-transcript-api (no OAuth required)."""

from typing import Optional


class TranscriptClient:
    """Fetches a YouTube video transcript (manual or auto-generated).

    Methods are synchronous; callers wrap them with asyncio.to_thread.
    """

    def get_transcript(self, video_id: str, languages: Optional[list[str]] = None) -> Optional[dict]:
        """Return {text, language, is_auto_generated} or None if unavailable."""
        from youtube_transcript_api import (
            YouTubeTranscriptApi,
            NoTranscriptFound,
            TranscriptsDisabled,
            VideoUnavailable,
        )

        langs = languages or ["en", "en-US", "en-GB"]

        try:
            segments = YouTubeTranscriptApi.get_transcript(video_id, languages=langs)
        except (NoTranscriptFound, TranscriptsDisabled, VideoUnavailable):
            return None
        except Exception:
            # Any unexpected error means we treat the transcript as unavailable.
            return None

        if not segments:
            return None

        text = " ".join(seg.get("text", "") for seg in segments).strip()
        if not text:
            return None

        return {
            "text": text,
            "language": (segments[0].get("language") if segments else None) or "en",
            "is_auto_generated": False,
        }


transcript_client = TranscriptClient()
