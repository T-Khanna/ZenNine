# Decision Log

Purpose: capture architecture and product decisions with context, alternatives, and consequences.

## Status Legend

- Proposed
- Accepted
- Superseded
- Rejected

## Template

### DL-XXXX: Title
- Date: YYYY-MM-DD
- Status: Proposed | Accepted | Superseded | Rejected
- Owners: Names
- Context:
- Decision:
- Alternatives Considered:
- Consequences:
- Follow-ups:
- Supersedes: optional DL id

---

## Entries

### DL-0001: Event Model Uses Append-Only Action Stream
- Date: 2026-05-17
- Status: Accepted
- Owners: ZenNine Planning
- Context: Replay, undo/redo, and deep statistics require deterministic reconstruction of board state.
- Decision: Persist session actions as an append-only event stream, derive board state from event application.
- Alternatives Considered:
  - Store only latest board snapshots.
  - Store mixed snapshots + partial logs.
- Consequences:
  - Strong replay determinism and auditability.
  - Requires robust event validator and applier.
- Follow-ups:
  - Add checkpoint strategy for long sessions.
  - Define event versioning policy.

### DL-0002: Candidate Actions Use Lane Parameter
- Date: 2026-05-17
- Status: Accepted
- Owners: ZenNine Planning
- Context: Center and side candidate semantics are required for Snyder-like solving.
- Decision: Use generic actions set_candidates and toggle_candidate with lane=center|side parameter.
- Alternatives Considered:
  - Separate action names per lane (for example toggle_candidate_center).
- Consequences:
  - Smaller, cleaner action vocabulary.
  - Requires lane to be explicitly present in candidate payloads.
- Follow-ups:
  - Keep SPN and JSON schema aligned with lane-based model.

### DL-0003: SPN as Human-Readable Interchange Format
- Date: 2026-05-17
- Status: Accepted
- Owners: ZenNine Planning
- Context: Import/export is core, and puzzle + move logs must be shareable and diff-friendly.
- Decision: Define SPN v1 with required puzzle section and optional moves/notes.
- Alternatives Considered:
  - JSON-only interchange.
  - Existing third-party textual formats only.
- Consequences:
  - Better readability and manual editing.
  - Parser complexity increases slightly.
- Follow-ups:
  - Add round-trip tests SPN <-> canonical JSON.

### DL-0004: Documentation-First Start
- Date: 2026-05-17
- Status: Accepted
- Owners: ZenNine Planning
- Context: Early alignment on architecture and data contracts reduces implementation churn.
- Decision: Complete specs, schemas, examples, and flow diagrams before scaffolding app code.
- Alternatives Considered:
  - Start coding immediately and iterate specs later.
- Consequences:
  - Clear implementation direction.
  - Slight delay before first executable prototype.
- Follow-ups:
  - Create scaffolding tasks directly from acceptance criteria.
