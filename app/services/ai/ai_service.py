"""High-level AI service: subject verification, game generation, quiz generation.

Provider-agnostic: picks the configured AIProvider and validates every LLM
response against a Pydantic schema before handing it back to business logic.
"""

from typing import Any, Optional

from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings
from app.services.ai import prompts
from app.services.ai.providers.base import AIProvider
from app.services.ai.providers.openai_provider import OpenAIProvider
from app.services.ai.providers.stub_provider import StubProvider

# Singleton provider (lazily built).
_provider: Optional[AIProvider] = None


def get_provider() -> AIProvider:
    """Return the configured LLM provider singleton."""
    global _provider
    if _provider is None:
        provider_name = settings.AI_PROVIDER.lower()
        if provider_name == "stub":
            _provider = StubProvider()
        elif provider_name == "openai":
            # Fall back to the stub provider when no key is configured (offline/dev).
            _provider = OpenAIProvider() if settings.OPENAI_API_KEY else StubProvider()
        else:
            _provider = OpenAIProvider() if settings.OPENAI_API_KEY else StubProvider()
    return _provider


def reset_provider() -> None:
    """Reset the cached provider (used by tests to swap providers)."""
    global _provider
    _provider = None


# --- Output schemas ----------------------------------------------------------
class SubjectVerificationResult(BaseModel):
    matches: bool
    confidence: float = Field(ge=0.0, le=1.0)
    detected_subjects: list[str] = []
    reasoning: str = ""


class GameItem(BaseModel):
    id: str
    prompt: str
    choices: list[str]
    correct_index: int
    explanation: str = ""
    points: int = 1


class GameContent(BaseModel):
    game_type: str = "quiz_game"
    title: str
    description: str = ""
    pass_threshold_percent: int = Field(default=60, ge=0, le=100)
    items: list[GameItem]


class QuizContent(BaseModel):
    title: str
    questions: list[dict]  # each {question, choices, correct_index, explanation}


# --- Helpers -----------------------------------------------------------------
def _truncate(text: str, limit: int) -> str:
    if not text:
        return ""
    return text if len(text) <= limit else text[:limit] + "..."


async def _complete_validated(system: str, user: str) -> dict[str, Any]:
    """Call the provider with a limited retry on parse failure."""
    provider = get_provider()
    last_exc: Optional[Exception] = None
    for _ in range(max(1, settings.AI_MAX_RETRIES + 1)):
        try:
            return await provider.complete_json(system, user)
        except Exception as exc:  # provider raised ExternalServiceError
            last_exc = exc
            continue
    raise last_exc  # type: ignore[misc]


# --- Public AI tasks ---------------------------------------------------------
async def verify_subject(
    transcript: str, video_title: str, topic_name: str, topic_description: str
) -> SubjectVerificationResult:
    """Ask the LLM whether the video content matches the selected topic."""
    user = prompts.SUBJECT_VERIFICATION_USER.format(
        topic_name=topic_name,
        topic_description=topic_description or "(no description provided)",
        video_title=video_title or "(unknown title)",
        transcript=_truncate(transcript, settings.AI_MAX_TRANSCRIPT_CHARS),
    )
    raw = await _complete_validated(prompts.SUBJECT_VERIFICATION_SYSTEM, user)
    try:
        return SubjectVerificationResult.model_validate(raw)
    except ValidationError:
        # Be conservative on parse failure.
        return SubjectVerificationResult(
            matches=False, confidence=0.0, detected_subjects=[], reasoning="Unparseable verification"
        )


async def generate_game(
    transcript: str, topic_name: str, difficulty: str
) -> dict[str, Any]:
    """Generate an educational game's full content from the transcript."""
    user = prompts.GAME_GENERATION_USER.format(
        topic_name=topic_name, difficulty=difficulty, transcript=_truncate(transcript, settings.AI_MAX_TRANSCRIPT_CHARS)
    )
    raw = await _complete_validated(prompts.GAME_GENERATION_SYSTEM, user)
    # Validate structure; return as plain dict for JSONB storage.
    game = GameContent.model_validate(raw)
    return game.model_dump()


async def generate_quiz(
    transcript: str, topic_name: str, num_questions: int, difficulty: str
) -> dict[str, Any]:
    """Generate an optional quiz from the transcript."""
    system = prompts.QUIZ_GENERATION_SYSTEM.format(num_questions=num_questions, difficulty=difficulty)
    user = prompts.QUIZ_GENERATION_USER.format(
        topic_name=topic_name,
        difficulty=difficulty,
        transcript=_truncate(transcript, settings.AI_MAX_TRANSCRIPT_CHARS),
    )
    raw = await _complete_validated(system, user)
    quiz = QuizContent.model_validate(raw)
    return quiz.model_dump()
