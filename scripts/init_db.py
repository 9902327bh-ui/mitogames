"""Initialize the database: run Alembic migrations to head, then seed sample data.

Usage: python scripts/init_db.py
Requires a running PostgreSQL instance and a configured .env (DATABASE_URL).
"""

import asyncio
import logging
import sys
from pathlib import Path

# Ensure the project root is on sys.path when run as a script.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from alembic import command
from alembic.config import Config

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("init_db")


def run_migrations() -> None:
    alembic_cfg = Config(str(Path(__file__).resolve().parent.parent / "alembic.ini"))
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    logger.info("Running Alembic migrations to head...")
    command.upgrade(alembic_cfg, "head")
    logger.info("Migrations complete.")


async def seed_data() -> None:
    from scripts.seed import main as seed_main
    logger.info("Seeding sample data...")
    await seed_main()


if __name__ == "__main__":
    run_migrations()
    asyncio.run(seed_data())
