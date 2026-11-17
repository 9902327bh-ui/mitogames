"""Provider interface for LLM integrations."""

from abc import ABC, abstractmethod
from typing import Any


class AIProvider(ABC):
    """Abstract LLM provider. Implementations return parsed JSON."""

    @abstractmethod
    async def complete_json(self, system: str, user: str) -> dict[str, Any]:
        """Send a system + user prompt and return the parsed JSON response."""
        raise NotImplementedError
