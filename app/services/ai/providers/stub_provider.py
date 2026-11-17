"""Stub LLM provider returning deterministic canned JSON.

Used for offline development/testing when no real LLM API key is configured.
Activated by setting AI_PROVIDER=stub in the environment.
"""

import json
from typing import Any

from app.services.ai.providers.base import AIProvider


class StubProvider(AIProvider):
    async def complete_json(self, system: str, user: str) -> dict[str, Any]:
        if "subject reviewer" in system.lower() or "matches" in system:
            return {
                "matches": True,
                "confidence": 0.85,
                "detected_subjects": ["General Knowledge"],
                "reasoning": "Stub: assumed the video matches the selected topic.",
            }
        if "educational quiz author" in system.lower() or '"questions"' in system:
            return {
                "title": "Generated Quiz (stub)",
                "questions": [
                    {
                        "question": "Sample question 1?",
                        "choices": ["Option A", "Option B", "Option C", "Option D"],
                        "correct_index": 0,
                        "explanation": "Stub explanation.",
                    }
                    for _ in range(3)
                ],
            }
        # Default: game generation.
        return {
            "game_type": "quiz_game",
            "title": "Generated Game (stub)",
            "description": "Auto-generated stub game for offline testing.",
            "pass_threshold_percent": 60,
            "items": [
                {
                    "id": f"q{i}",
                    "prompt": f"Sample question {i}?",
                    "choices": ["A", "B", "C", "D"],
                    "correct_index": 0,
                    "explanation": "Stub explanation.",
                    "points": 20,
                }
                for i in range(1, 6)
            ],
        }
