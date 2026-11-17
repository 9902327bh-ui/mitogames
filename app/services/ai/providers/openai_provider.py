"""OpenAI provider using the async client and JSON mode."""

import json
from typing import Any

from app.core.config import settings
from app.core.exceptions import ExternalServiceError
from app.services.ai.providers.base import AIProvider


class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        api_key = api_key or settings.OPENAI_API_KEY
        if not api_key:
            raise ExternalServiceError("OPENAI_API_KEY is not configured")
        # Imported lazily so the app boots without the SDK installed.
        from openai import AsyncOpenAI

        self.client = AsyncOpenAI(
            api_key=api_key, timeout=settings.AI_REQUEST_TIMEOUT_SECONDS
        )
        self.model = model or settings.OPENAI_MODEL

    async def complete_json(self, system: str, user: str) -> dict[str, Any]:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
            content = response.choices[0].message.content or "{}"
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise ExternalServiceError(f"LLM returned invalid JSON: {exc}") from exc
        except Exception as exc:
            raise ExternalServiceError(f"LLM request failed: {exc}") from exc
