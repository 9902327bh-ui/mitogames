"""YouTube URL parsing and validation utilities."""

import re
from urllib.parse import parse_qs, urlparse

# A valid YouTube video ID is exactly 11 chars from [A-Za-z0-9_-].
VIDEO_ID_REGEX = re.compile(r"^[A-Za-z0-9_-]{11}$")

# Hosts we accept.
_YOUTUBE_HOSTS = {
    "www.youtube.com",
    "youtube.com",
    "m.youtube.com",
    "youtu.be",
    "www.youtu.be",
}


class InvalidYouTubeURL(Exception):
    """Raised when a URL cannot be resolved to a valid YouTube video ID."""


def extract_video_id(url: str) -> str:
    """Extract the 11-character video ID from a YouTube URL.

    Supports: watch?v=, youtu.be/<id>, /embed/<id>, /shorts/<id>, /live/<id>.
    Raises InvalidYouTubeURL if the URL is malformed or not a YouTube URL.
    """
    if not url or not isinstance(url, str):
        raise InvalidYouTubeURL("URL is required")

    url = url.strip()
    if not url:
        raise InvalidYouTubeURL("URL is required")

    # Bare 11-char ID is also accepted.
    if VIDEO_ID_REGEX.match(url):
        return url

    parsed = urlparse(url if "://" in url else f"https://{url}")
    host = (parsed.netloc or "").lower()
    path = parsed.path or ""
    query = parse_qs(parsed.query or "")

    if host not in _YOUTUBE_HOSTS:
        raise InvalidYouTubeURL("Not a YouTube URL")

    # youtu.be/<id>
    if host == "youtu.be" or host == "www.youtu.be":
        vid = path.strip("/").split("/")[0] if path else ""
        if VIDEO_ID_REGEX.match(vid):
            return vid
        raise InvalidYouTubeURL("Could not extract video ID from youtu.be URL")

    # watch?v=<id>
    v_param = query.get("v", [None])[0]
    if v_param and VIDEO_ID_REGEX.match(v_param):
        return v_param

    # /embed/<id>, /shorts/<id>, /live/<id>
    segments = [s for s in path.split("/") if s]
    if len(segments) >= 2 and segments[0] in {"embed", "shorts", "live", "v"}:
        if VIDEO_ID_REGEX.match(segments[1]):
            return segments[1]

    raise InvalidYouTubeURL(
        "Unsupported YouTube URL format. Use watch?v=, youtu.be/, /embed/, /shorts/, or /live/."
    )


def is_valid_video_id(video_id: str) -> bool:
    """True if the string looks like a valid 11-char YouTube video ID."""
    return bool(VIDEO_ID_REGEX.match(video_id or ""))


def thumbnail_url(video_id: str) -> str:
    """Return the default thumbnail URL for a video ID."""
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"


def parse_duration_iso(duration: str) -> int:
    """Parse an ISO 8601 PT#H#M#S duration (from YouTube API) into seconds."""
    import re

    pattern = re.compile(
        r"^PT(?:(?P<h>\d+)H)?(?:(?P<m>\d+)M)?(?:(?P<s>\d+)S)?$"
    )
    match = pattern.match(duration or "")
    if not match:
        return 0
    h = int(match.group("h") or 0)
    m = int(match.group("m") or 0)
    s = int(match.group("s") or 0)
    return h * 3600 + m * 60 + s
