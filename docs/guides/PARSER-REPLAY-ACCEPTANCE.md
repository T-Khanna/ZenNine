# Parser and Replay Acceptance Criteria

Purpose: define release gates for SPN parser/import and replay/event systems.

## A. Parser Acceptance Criteria

### A1. Core Parse Coverage
- Parse valid SPN v1 files with header, @PUZZLE, and optional @MOVES/@NOTES.
- Parse classic and mixed-constraint examples from docs/examples.
- Parse candidate actions with lane parameter (center or side).

### A2. Validation Behavior
- Reject out-of-bounds cell coordinates.
- Reject inconsistent grid dimensions relative to SIZE.
- Reject duplicate conflicting givens for a single cell.
- Reject malformed constraint lines for CAGE, ARROW, THERMO.
- Reject candidate actions missing lane for set_candidates/toggle_candidate.

### A3. Error Quality
- Parser errors include line number and reason.
- Validation errors include actionable message and failing token/field.
- Unknown tags/actions are preserved when allowed by spec.

### A4. Round-Trip Guarantees
- SPN -> canonical JSON -> SPN keeps semantic equivalence.
- Canonical JSON -> SPN -> canonical JSON is stable for core fields.
- Move list ordering is preserved exactly.

### A5. Performance Baseline
- Parse and validate a standard 9x9 SPN file in under 50 ms on developer machine baseline.
- Parse and validate a long move log session (>= 5,000 events) in under 300 ms baseline.

## B. Replay Acceptance Criteria

### B1. Determinism
- Reapplying the same ordered event list always reconstructs identical board state.
- Undo followed by redo returns to identical board hash/state.
- A targetCells-scoped edit is reversed as one undo unit.

### B2. Event Contract Compliance
- Every replayed event is schema-valid before apply.
- targetCells-scoped edit actions always include a non-empty targetCells list.
- Candidate actions require lane and respect lane-specific storage across all target cells.
- Unknown optional metadata does not break replay.

### B3. Timeline Controls
- Scrubbing to event index N reproduces state after event N.
- Step forward/backward applies exactly one event transition.
- Playback speed (1x/2x/4x) changes timing only, never state.

### B4. Stats Consistency
- Derived metrics (candidate churn, pauses, pace) are identical whether computed live or from replay.
- Session completion time equals final event timestamp minus paused segments policy.

### B5. Resilience
- Corrupt single event is reported with index and reason.
- Replay can continue in diagnostic mode (skip bad event) for analysis tooling.
- Strict mode fails fast on first invalid event.

## C. Suggested Test Matrix

- Unit tests: parser tokens, validators, event applier branches.
- Property tests: event stream idempotence and replay invariants.
- Golden tests: known SPN samples and expected canonical JSON snapshots.
- Integration tests: import -> solve events -> replay -> export.

## D. Exit Criteria for First Implementation Milestone

- All A1-A4 and B1-B3 pass in CI.
- At least one long-session performance test passes A5 baseline.
- One end-to-end golden test passes import -> replay -> export stability.
