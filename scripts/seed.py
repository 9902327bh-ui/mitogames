"""Seed the database with sample subjects, topics, prebuilt simulations, and
achievement definitions. Idempotent: skips items that already exist."""

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.achievement import Achievement
from app.models.simulation import PrebuiltSimulation
from app.models.subject import Subject
from app.models.topic import Topic
from app.schemas.achievement import AchievementCreate
from app.schemas.simulation import SimulationCreate
from app.schemas.subject import SubjectCreate, TopicCreate
from app.services import simulation_service, subject_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")


SUBJECTS = [
    {"name": "Mathematics", "description": "Numbers, algebra, geometry and more.", "order": 1},
    {"name": "Science", "description": "Physics, chemistry, and biology fundamentals.", "order": 2},
    {"name": "History", "description": "Events, eras, and historical figures.", "order": 3},
    {"name": "Geography", "description": "Places, environments, and human systems.", "order": 4},
]

TOPICS = {
    "Mathematics": [
        {"name": "Algebra Basics", "difficulty": "beginner"},
        {"name": "Quadratic Equations", "difficulty": "intermediate"},
        {"name": "Trigonometry", "difficulty": "advanced"},
    ],
    "Science": [
        {"name": "Photosynthesis", "difficulty": "beginner"},
        {"name": "Newton's Laws of Motion", "difficulty": "intermediate"},
        {"name": "The Periodic Table", "difficulty": "intermediate"},
    ],
    "History": [
        {"name": "Ancient Egypt", "difficulty": "beginner"},
        {"name": "World War II", "difficulty": "intermediate"},
    ],
    "Geography": [
        {"name": "Continents and Oceans", "difficulty": "beginner"},
        {"name": "Climate Zones", "difficulty": "intermediate"},
    ],
}

ACHIEVEMENTS = [
    {"name": "First Steps", "description": "Complete your first game.", "achievement_type": "attempt_based",
     "criteria": {"metric": "total_games_played", "threshold": 1}, "points_reward": 10},
    {"name": "Quiz Novice", "description": "Take your first quiz.", "achievement_type": "attempt_based",
     "criteria": {"metric": "total_quizzes_taken", "threshold": 1}, "points_reward": 10},
    {"name": "High Scorer", "description": "Score 80+ in a single attempt.", "achievement_type": "score_based",
     "criteria": {"metric": "best_single_score", "threshold": 80}, "points_reward": 20},
    {"name": "Game Master", "description": "Complete 10 distinct games.", "achievement_type": "completion_based",
     "criteria": {"metric": "games_completed", "threshold": 10}, "points_reward": 50},
    {"name": "Explorer", "description": "Explore 3 different subjects.", "achievement_type": "subject_based",
     "criteria": {"metric": "subjects_explored", "threshold": 3}, "points_reward": 30},
    {"name": "On Fire", "description": "Maintain a 3-day activity streak.", "achievement_type": "streak_based",
     "criteria": {"metric": "current_streak", "threshold": 3}, "points_reward": 25},
]


def _sample_simulation_content(title: str) -> dict:
    return {
        "game_type": "quiz_game",
        "pass_threshold_percent": 60,
        "items": [
            {"id": "q1", "prompt": f"{title} — Sample question 1?", "choices": ["A", "B", "C", "D"],
             "correct_index": 0, "explanation": "Sample explanation.", "points": 25},
            {"id": "q2", "prompt": f"{title} — Sample question 2?", "choices": ["A", "B", "C", "D"],
             "correct_index": 1, "explanation": "Sample explanation.", "points": 25},
            {"id": "q3", "prompt": f"{title} — Sample question 3?", "choices": ["A", "B", "C", "D"],
             "correct_index": 2, "explanation": "Sample explanation.", "points": 25},
            {"id": "q4", "prompt": f"{title} — Sample question 4?", "choices": ["A", "B", "C", "D"],
             "correct_index": 3, "explanation": "Sample explanation.", "points": 25},
        ],
    }


async def seed(db: AsyncSession) -> None:
    # Subjects + topics.
    for subj_def in SUBJECTS:
        existing = await db.execute(select(Subject).where(Subject.name == subj_def["name"]))
        if existing.scalar_one_or_none() is None:
            subject = await subject_service.create_subject(
                db, SubjectCreate(name=subj_def["name"], description=subj_def["description"],
                                   display_order=subj_def["order"])
            )
        else:
            subject = existing.scalar_one()
        for topo in TOPICS.get(subj_def["name"], []):
            tex = await db.execute(select(Topic).where(Topic.name == topo["name"]))
            if tex.scalar_one_or_none() is None:
                await subject_service.create_topic(
                    db, TopicCreate(subject_id=subject.id, name=topo["name"],
                                    difficulty_level=topo["difficulty"])
                )

    # Prebuilt simulations (one per first topic of each subject, if none exist).
    sim_count = (await db.execute(select(PrebuiltSimulation))).scalars().all()
    if not sim_count:
        subjects = (await db.execute(select(Subject))).scalars().all()
        for s in subjects:
            topics = (await db.execute(select(Topic).where(Topic.subject_id == s.id).order_by(Topic.display_order, Topic.name))).scalars().all()
            if not topics:
                continue
            t = topics[0]
            title = f"{t.name} — Practice Simulation"
            await simulation_service.create_simulation(
                db, SimulationCreate(topic_id=t.id, title=title, content=_sample_simulation_content(title))
            )

    # Achievements.
    for a in ACHIEVEMENTS:
        ex = await db.execute(select(Achievement).where(Achievement.name == a["name"]))
        if ex.scalar_one_or_none() is None:
            db.add(Achievement(**a))
    await db.commit()
    logger.info("Seed complete.")


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await seed(db)


if __name__ == "__main__":
    asyncio.run(main())
