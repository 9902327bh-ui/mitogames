"""Aggregates all v1 endpoint routers into one APIRouter."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    achievements,
    admin,
    auth,
    games,
    progress,
    quizzes,
    simulations,
    students,
    subjects,
    videos,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(students.router)
api_router.include_router(subjects.router)
api_router.include_router(subjects.topic_router)
api_router.include_router(videos.router)
api_router.include_router(games.router)
api_router.include_router(simulations.router)
api_router.include_router(quizzes.router)
api_router.include_router(achievements.router)
api_router.include_router(progress.router)
api_router.include_router(admin.router)
