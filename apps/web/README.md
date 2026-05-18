# ZenNine Web App

React + TypeScript + Vite frontend for the ZenNine Sudoku workbench.

## Current Milestone

Implemented playable board loop MVP:

- Givens are loaded from the default SPN example file (`public/examples/sample-classic-9x9.spn`).
- Event-backed board state replayed from an append-only event timeline.
- Input modes:
  - Digit mode (set/replace value)
  - Candidate mode (toggle candidate marks)
- Undo/redo via timeline cursor.
- Conflict highlighting toggle (row/column/box duplicates).
- Keyboard controls:
  - Arrow keys: move selection
  - Shift + Arrow keys: expand selection range
  - Space: toggle digit/candidate mode
  - 1-9: input digit/candidate
  - Backspace/Delete: clear selected cell
  - Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+Shift+Z: undo/redo
- Drag controls:
  - Drag across cells to create multi-selection
  - Keypad/keyboard digit applies to selected cells

## Scripts

From repo root:

- npm run web:dev
- npm run web:build

From apps/web:

- npm run dev
- npm run build
- npm run lint
- npm run preview

## Current Gaps

- Full SPN import flows are not wired yet (paste/upload/drag-drop). Current load path is default sample SPN only.
- Backend integration is limited to a ping check.
- Replay scrubber UI is not implemented yet.
