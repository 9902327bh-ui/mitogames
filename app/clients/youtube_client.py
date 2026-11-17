"""YouTube Data API v3 client — fetches video metadata for validation."""

from typing import Optional

from app.core.config import settings
from app.utils.youtube import parse_duration_iso, thumbnail_url


class YouTubeClient:
    """Thin wrapper around the YouTube Data API v3 videos.list endpoint.

    Methods are synchronous (blocking); callers wrap them with asyncio.to_thread.
    """

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or settings.YOUTUBE_API_KEY

    def get_video_info(self, video_id: str) -> Optional[dict]:
        """Return metadata for a video, or None if it doesn't exist / is unavailable.

        Raises RuntimeError if the API key is missing or the call fails irrecoverably.
        """
        if not self.api_key:
            raise RuntimeError("YOUTUBE_API_KEY is not configured")

        # Imported lazily so the app can boot without google-api-python-client.
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError

        try:
            youtube = build("youtube", "v3", developerKey=self.api_key, cache_discovery=False)
            request = youtube.videos().list(part="snippet,contentDetails", id=video_id)
            response = request.execute()
        except HttpError as exc:
            if exc.resp.status == 404 or "not found" in str(exc).lower():
                return None
            raise RuntimeError(f"YouTube API error: {exc}") from exc

        items = response.get("items", [])
        if not items:
            return None

        item = items[0]
        snippet = item.get("snippet", {})
        content = item.get("contentDetails", {})
        thumbnails = snippet.get("thumbnails", {})

        return {
            "title": snippet.get("title"),
            "channel_name": snippet.get("channelTitle"),
            "description": snippet.get("description", ""),
            "duration_seconds": parse_duration_iso(content.get("duration", "")),
            "thumbnail_url": (
                thumbnails.get("high", {}).get("url")
                or thumbnails.get("medium", {}).get("url")
                or thumbnail_url(video_id)
            ),
            "category_id": snippet.get("categoryId"),
        }


# Module-level singleton reused by services.
youtube_client = YouTubeClient()
