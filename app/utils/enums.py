"""String-valued status enums shared across models and services.

Stored as VARCHAR in PostgreSQL with CHECK constraints applied at the model
level. Using plain str enums keeps migrations portable and JSON-serializable.
"""

from enum import Enum


class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"


class DifficultyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class VideoValidationStatus(str, Enum):
    PENDING = "pending"
    VALID = "valid"
    INVALID = "invalid"
    FAILED = "failed"


class SubjectVerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    MISMATCHED = "mismatched"
    UNCERTAIN = "uncertain"
    FAILED = "failed"


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class ContentType(str, Enum):
    GAME = "game"
    SIMULATION = "simulation"


class GameType(str, Enum):
    QUIZ_GAME = "quiz_game"
    SCENARIO_GAME = "scenario_game"
    MATCHING_GAME = "matching_game"
    SEQUENCE_GAME = "sequence_game"


class QuizType(str, Enum):
    AI_GENERATED = "ai_generated"
    PREBUILT = "prebuilt"


class AchievementType(str, Enum):
    SCORE_BASED = "score_based"
    ATTEMPT_BASED = "attempt_based"
    STREAK_BASED = "streak_based"
    COMPLETION_BASED = "completion_based"
    SUBJECT_BASED = "subject_based"
