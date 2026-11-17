"""ORM models package. Importing this module registers all models on the
declarative Base metadata so Alembic autodetect works."""

from app.models.achievement import Achievement, StudentAchievement
from app.models.attempt import GameAttempt, QuizAttempt
from app.models.auth import RefreshToken
from app.models.game import Game
from app.models.progress import StudentProgress, TopicProgress
from app.models.quiz import Quiz
from app.models.simulation import PrebuiltSimulation
from app.models.student import Student
from app.models.subject import Subject
from app.models.topic import Topic
from app.models.video import VideoSubmission, VideoTranscript

__all__ = [
    "Student",
    "Subject",
    "Topic",
    "VideoSubmission",
    "VideoTranscript",
    "Game",
    "PrebuiltSimulation",
    "GameAttempt",
    "QuizAttempt",
    "Quiz",
    "Achievement",
    "StudentAchievement",
    "StudentProgress",
    "TopicProgress",
    "RefreshToken",
]
