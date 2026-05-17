# API (FastAPI)

## Setup

python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt

## Run

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

## Endpoints

- GET /health
- GET /api/v1/ping
