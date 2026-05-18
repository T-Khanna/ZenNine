# API (FastAPI)

## Setup

Recommended (from repo root):

python apps/api/run.py

or from apps/api:

python run.py

This bootstraps .venv on first run and installs requirements automatically.

Manual setup:

python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt

## Run

python run.py

## Endpoints

- GET /health
- GET /api/v1/ping
- POST /api/v1/events/validate
- POST /api/v1/sessions/{session_id}/events
- GET /api/v1/sessions/{session_id}/events
