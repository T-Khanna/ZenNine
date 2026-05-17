# ZenNine

ZenNine is a Sudoku platform focused on advanced solving workflows, variant support, rich import paths, and replay/statistics.

This repository now includes initial implementation scaffolding plus planning/specification docs.

## App Layout

- apps/web/
  - React + TypeScript + Vite frontend scaffold.
- apps/api/
  - FastAPI backend scaffold.

## Structure

- docs/specs/
  - PRODUCT-SPEC.md: primary product and technical specification.
  - SPN-v1.md: Sudoku Portable Notation format specification.
- docs/architecture/
  - UX-ARCHITECTURE-FLOWS.md: UX journeys, runtime architecture, replay pipeline, and right-rail UI state machine diagrams.
- docs/schemas/
  - event-action.schema.json: JSON Schema contract for session events/actions.
  - event-action.examples.json: positive examples for action payloads.
- docs/examples/
  - Sample SPN files for classic and mixed-constraint puzzles.
- docs/guides/
  - DECISION-LOG.md: architecture and product decisions with rationale.
  - PARSER-REPLAY-ACCEPTANCE.md: acceptance gates for parser/import and replay systems.

## Suggested Reading Order

1. docs/specs/PRODUCT-SPEC.md
2. docs/specs/SPN-v1.md
3. docs/architecture/UX-ARCHITECTURE-FLOWS.md
4. docs/schemas/event-action.schema.json
5. docs/schemas/event-action.examples.json

## Current Status

- Product, architecture, and format specs are drafted.
- Event model includes lane-aware candidate actions and multi-select batch actions.
- Example SPN files and event payload examples are included.
- Frontend and backend scaffolding are in place.

## Quick Start

### Run from repo root (recommended)

npm run web:dev

Optional:
- npm run web:build
- npm run api:run

### Frontend

cd apps/web
npm install
npm run dev

### Backend

cd apps/api
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

## Top Priorities

1. Implement SPN import/export parser with round-trip tests.
2. Implement event model validation and replay-safe event append flow.
3. Build first playable board loop (digit, candidates, undo/redo, conflict toggle).
4. Wire frontend and backend via initial API contracts.
5. Add timeline playback MVP (scrub and step controls).

## Notes

- Keep file paths stable when possible to reduce cross-reference churn.
- Add new diagrams under docs/architecture/.
- Add parser/import/replay implementation guides under docs/guides/.
