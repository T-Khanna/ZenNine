# ZenNine

ZenNine is a Sudoku platform focused on advanced solving workflows, variant support, rich import paths, and replay/statistics.

This repository is currently documentation-first. Use this README as the main entry point.

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

## Top Priorities

1. Create initial project scaffolding (frontend and backend workspaces).
2. Implement SPN import/export parser with round-trip tests.
3. Implement event model validation and replay-safe event append flow.
4. Build first playable board loop (digit, candidates, undo/redo, conflict toggle).
5. Add timeline playback MVP (scrub and step controls).

## Notes

- Keep file paths stable when possible to reduce cross-reference churn.
- Add new diagrams under docs/architecture/.
- Add parser/import/replay implementation guides under docs/guides/.
