# ZenNine Product and Technical Spec (v0.1)

## 1. Product Goals

ZenNine is a Sudoku web app focused on serious solvers, variant support, and analysis depth.

Core goals:
- Fast, uncluttered solving UX with desktop/mobile support.
- Strong import pipeline (text, file, drag-drop, paste, screenshot).
- Extensible puzzle model for classic and variants.
- Replay-ready action tracking for undo/redo, analytics, and future coaching.

Future goals:
- Drill modes (find naked single, hidden triple, etc.).
- Engine-assisted post-game review and alternate human-like lines.

## 2. Scope by Phase

### Phase 1 (MVP)
- 9x9 classic solve board.
- Conflict checker toggle (off, soft, strict).
- Candidate entry and basic notes.
- SPN v1 import/export.
- JSON import/export.
- Session timing and baseline stats.
- Light/dark mode.

### Phase 2 (Variants and Input Power)
- Cages, arrows, thermos rendering and editing.
- Cell grouping and marking tools.
- Color and letter notation layers.
- Snyder candidate mode.
- Screenshot import pipeline (OCR-assisted draft + correction UI).

### Phase 3 (Replay and Analytics)
- Full timeline replay from action log.
- Undo/redo over all action types.
- Timeline slider with scrub, step, and jump-to-breakpoint controls.
- Segmented analytics (opening, midgame, endgame).

### Phase 4 (Coaching and Drills)
- Technique drills and timed runs.
- Solution-path analysis with practical recommendations.

## 3. Recommended Tech Stack

### Frontend
- React + TypeScript + Vite
- Zustand (local interaction state)
- TanStack Query (server state)
- Tailwind + CSS variables for theming
- SVG overlay for constraints and annotations
- IndexedDB via Dexie for offline cache and local sessions

### Backend
- FastAPI (Python)
- PostgreSQL (JSONB for flexible constraints)
- Redis + worker queue for OCR and heavy analysis jobs

## 4. Canonical Data Model

Use three entities: Puzzle, Session, Event.

### Puzzle
- id: UUID
- title: string
- size: { rows: number, cols: number }
- symbols: string[]
- givens: array of { cell: string, value: string }
- regions: array of { id: string, cells: string[] }
- constraints: array of Constraint
- metadata: source, tags, difficulty, createdAt

Constraint shape:
- id: string
- type: string (killer_cage, arrow, thermo, etc.)
- cells: string[]
- aux: object (type-specific fields)
- style: object (color, label, lineStyle)

### Session
- id: UUID
- puzzleId: UUID
- userId: nullable UUID
- startedAt: timestamp
- completedAt: nullable timestamp
- settings: { conflictMode, notationMode, theme }
- statsSnapshot: object

### Event (append-only)
- id: UUID
- sessionId: UUID
- tMs: integer (milliseconds since session start)
- actionType: string
- payload: object
- boardHash: nullable string

Board state note:
- Distinguish solved values from annotation layers.
- Candidate annotations are split into two lanes per cell:
	- centerCandidates: set of symbols (strong candidates).
	- sideCandidates: set of symbols (weak/pointing candidates).

Validation philosophy:
- Keep the schema strict about core fields and cell/value shapes.
- Allow extra properties where future variants, importers, or analytics metadata may need room to grow.

## 5. Event Types (Minimum Set)

- set_digit
- clear_digit
- set_candidates
- toggle_candidate
- set_color
- set_letter
- set_mode
- conflict_mode_change
- undo
- redo
- checkpoint

### Multi-select action semantics

- Cell-editing events are selection-shaped: the payload carries targetCells plus the operation parameters.
- targetCells is the canonical scope dimension for digit, candidate, color, and letter edits.
- selectionSource documents how the target set was formed (drag, row, column, box, manual, keyboard).
- Undo must reverse one targetCells-scoped event as a single unit.

Candidate action semantics:
- set_candidates sets the full candidate set for every target cell in either the center or side lane.
- toggle_candidate toggles one symbol in a chosen lane for every target cell.
- Candidate mode should default to Snyder-style workflows, where lane choice is explicit but the action name stays generic.

## 6. API Draft

### Puzzle APIs
- POST /api/puzzles/import
- POST /api/puzzles
- GET /api/puzzles/{id}
- GET /api/puzzles/{id}/export?format=spn|json

### Session APIs
- POST /api/sessions
- GET /api/sessions/{id}
- POST /api/sessions/{id}/events
- GET /api/sessions/{id}/events
- POST /api/sessions/{id}/complete

### Stats APIs
- GET /api/stats/summary
- GET /api/stats/by-variant
- GET /api/stats/timeline/{sessionId}

### Import APIs
- POST /api/import/text
- POST /api/import/file
- POST /api/import/screenshot

### Schema References
- Event/action JSON Schema: docs/schemas/event-action.schema.json
- Event/action examples: docs/schemas/event-action.examples.json
- SPN grammar: docs/specs/SPN-v1.md

### Planning Diagrams
- UX and architecture flows: docs/architecture/UX-ARCHITECTURE-FLOWS.md

## 7. Import Pipeline

1) Ingest
- Source types: SPN text, JSON, image.

2) Parse
- Build canonical Puzzle JSON.

3) Validate
- Validate symbols, coordinates, regions, constraints, and duplicates.

4) Confidence layer (for screenshot)
- Mark uncertain detections with confidence score.

5) Correction UI
- User confirms and fixes uncertain cells/constraints.

6) Persist
- Save canonical Puzzle.

## 8. Stats Model

Track raw and derived metrics:
- solve time
- pause windows (inactivity thresholds)
- candidate churn
- undo/redo frequency
- conflict incidents
- digit placement pace

Opening/midgame/endgame segmentation (heuristic for now):
- Opening: low candidate density + high direct placements.
- Midgame: higher candidate churn and longer deliberation.
- Endgame: solved-cell ratio increases and pace accelerates.

Replay timeline controls:
- Timeline slider supports scrub to any event index.
- Breakpoint markers: long deliberation windows, first error, first major candidate wipe.
- Playback controls: play/pause, 1x/2x/4x, step forward/backward.

## 9. UX Requirements

- One-tap mode switching (digit, candidate, color, letter).
- Fast keyboard flow with no modal friction.
- Dark mode and clean default visual language.
- Mobile-safe interactions for drag/pinch/selection.
- Accessibility: high-contrast option, focus indicators, keyboard-first support.

Candidate UX requirements:
- Candidate mode defaults to Snyder workflow.
- Input supports both center candidates and side candidates.
- Quick toggle between center and side lane while staying in candidate mode.
- Optional visual emphasis difference (center larger, side corner/edge aligned).

Layout direction (from reference screenshot):
- Desktop: board-dominant left pane with compact right control rail.
- Right rail order: puzzle metadata card, mode toggles, keypad, utility actions (undo/redo/check).
- Mobile: controls collapse under board with sticky mode/keypad row.

## 10. Non-Functional Requirements

- Deterministic import/export for SPN and JSON.
- Replay determinism: event stream must reconstruct board exactly.
- Low latency input handling (target < 16 ms local interaction updates).
- Backward-compatible SPN parsing across minor versions.
