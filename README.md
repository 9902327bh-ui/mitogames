# MITOGAMES Backend

Educational gaming platform backend. Students submit YouTube videos; the backend validates them, verifies the subject via AI, generates AI-powered educational games, and tracks scores, achievements, and progress. Includes curated prebuilt simulations and optional quizzes.

## Tech Stack
- Python 3.11+ · FastAPI · async SQLAlchemy 2.0 · asyncpg · PostgreSQL 15+ · Alembic · Pydantic v2 · JWT/bcrypt

## Setup

### 1. Prerequisites
- Python 3.11+
- PostgreSQL 15+ (running locally on `localhost:5432`)
- (Optional) pgAdmin for DB GUI, or use `psql`

### 2. Create the database
```bash
psql -U postgres -c "CREATE DATABASE mitogames;"
```

### 3. Install dependencies
```bash
python -m venv venv
venv\Scripts\activate            # Windows
pip install -r requirements.txt
```

### 4. Configure environment
```bash
cp .env.example .env             # then edit .env with real DB password + API keys
```

### 5. Run migrations
```bash
alembic upgrade head
```

### 6. Seed initial data (subjects, topics, sample simulations, achievements)
```bash
python scripts/init_db.py
```

### 7. Run the server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 8. Explore the API
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure
See `app/` — layered: `api/` (routers) → `services/` (business logic) → `clients/` + `models/` + `schemas/`. Core cross-cutting concerns in `app/core/`.

## Testing
```bash
pytest
```

## Notes
- The backend is frontend-agnostic: it emits structured JSON the frontend renders.
- Scoring is server-authoritative: clients submit answers, the server computes scores.

## React app and Chemistry video labs

The MitoGames React 18/Vite app runs with the Verbatim lab API in development:

```bash
npm install
npm run dev
```

Set `GEMINI_API_KEY` in `.env` to enable YouTube transcription/classification and generated labs. The API returns a clear configuration error when the key is missing. The Vite dev server proxies `/api/health`, `/api/experiments`, `/api/summarize`, and `/api/quiz` to the lab service on port 3000. The existing FastAPI routes remain under `/api/v1`.

The ready-made experiment list is served by `/api/experiments/ready-made?classLevel=8`; run the API alone with `npm run dev:api` if needed. In production, configure the web host or reverse proxy to route these four API paths to the Verbatim service.
