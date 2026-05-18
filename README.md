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
- Event model uses targetCells-scoped, selection-shaped actions with lane-aware candidate semantics.
- Example SPN files and event payload examples are included.
- Frontend and backend scaffolding are in place.
- Web app now includes a playable board loop with:
  - default puzzle givens loaded from sample SPN (`apps/web/public/examples/sample-classic-9x9.spn`),
  - event-backed board updates,
  - initial backend event append/validate contract wiring,
  - digit and candidate input modes,
  - undo/redo timeline cursor,
  - conflict highlighting toggle,
  - drag multi-select with targetCells-scoped apply,
  - keyboard controls (arrows, shift+arrows to expand selection, 1-9, space mode toggle, delete/backspace).

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
python run.py

Alternative (manual environment setup):
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

## Top Priorities

1. Implement SPN import/export parser with round-trip tests.
2. Implement event model validation and replay-safe event append flow.
3. Wire frontend and backend via initial API contracts beyond ping.
4. Add timeline playback MVP (scrub and step controls).
5. Implement parser + replay integration into the live board.

## Notes

- Keep file paths stable when possible to reduce cross-reference churn.
- Add new diagrams under docs/architecture/.
- Add parser/import/replay implementation guides under docs/guides/.
