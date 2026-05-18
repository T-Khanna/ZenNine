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

### DL-0005: Default Puzzle Bootstraps from SPN Sample
- Date: 2026-05-18
- Status: Accepted
- Owners: ZenNine Web
- Context: Hardcoded fallback givens in UI code drift from the SPN-first architecture and do not validate import wiring.
- Decision: Load initial givens from a default SPN sample (`apps/web/public/examples/sample-classic-9x9.spn`) at app startup.
- Alternatives Considered:
  - Keep hardcoded givens map in frontend state.
  - Load default puzzle from JSON instead of SPN.
- Consequences:
  - Verifies SPN parsing path in the normal app boot flow.
  - Requires explicit UI handling for SPN load failures.
- Follow-ups:
  - Add user-facing SPN import paths (paste/upload/drag-drop).
  - Derive board dimensions from SPN metadata instead of fixed constants.

### DL-0006: Multi-Selection Is Ephemeral After Apply
- Date: 2026-05-18
- Status: Accepted
- Owners: ZenNine Web
- Context: Persistent multi-selection after a batch action caused accidental repeated edits and felt unlike the intended ZenNine interaction model.
- Decision: Keep drag multi-select transient and collapse selection to active cell after apply/clear actions.
- Alternatives Considered:
  - Keep multi-selection active after batch apply.
  - Add a toggle for sticky selection mode.
- Consequences:
  - Lower risk of accidental repeated operations.
  - Faster action loop for iterative solve input.
- Follow-ups:
  - Revisit sticky selection as an advanced optional setting if requested.

### DL-0007: Cell Edits Use TargetCells as the Scope Dimension
- Date: 2026-05-18
- Status: Accepted
- Owners: ZenNine Web
- Context: Separate single-cell and multi-cell event variants added duplication without improving the event model.
- Decision: Keep operation names simple and encode single vs multi behavior through targetCells in the payload.
- Alternatives Considered:
  - Maintain separate single-cell and multi-cell event types.
  - Introduce a wrapper action that only exists to distinguish selection scope.
- Consequences:
  - One reducer path for all board edits.
  - Cleaner schema and simpler examples.
  - Slightly more reliance on payload structure for scope semantics.
- Follow-ups:
  - Keep parser/replay docs aligned with targetCells-scoped action examples.

### DL-0008: Backend Uses One-Command Bootstrap Runner
- Date: 2026-05-18
- Status: Accepted
- Owners: ZenNine API
- Context: Windows path/activation friction for uvicorn in virtual environments caused repeated startup failures and inconsistent operator workflows.
- Decision: Use `apps/api/run.py` as the canonical backend entrypoint. The runner ensures `.venv` exists, installs requirements on first run, and then execs uvicorn in-place.
- Alternatives Considered:
  - Keep direct uvicorn invocation in npm scripts.
  - Require manual venv activation for each shell session.
  - Migrate immediately to a different package manager/runtime wrapper.
- Consequences:
  - Single, predictable startup command from repo root (`npm run api:run`).
  - Lower onboarding/setup friction on Windows.
  - Slightly more custom bootstrap logic to maintain.
- Follow-ups:
  - Add optional explicit dev mode flag if reload behavior is needed later.

### DL-0009: Frontend Uses Per-Load Session IDs for Event Sync
- Date: 2026-05-18
- Status: Accepted
- Owners: ZenNine Web
- Context: A fixed backend session id (`local-web`) caused accumulated server indexes across runs, making UI sync messages appear inconsistent with local timeline counts.
- Decision: Generate a fresh client session id on app load and use it for all append/list calls in that page session.
- Alternatives Considered:
  - Keep a single static session id for all local runs.
  - Manually clear backend in-memory sessions between runs.
  - Reset server-side index counters independently of session history.
- Consequences:
  - UI event counts and backend sync indices remain intuitive per run.
  - Historical local sessions are separated instead of co-mingled.
  - Session ids are ephemeral and not currently user-addressable.
- Follow-ups:
  - Add optional session picker/history view if cross-run inspection becomes a requirement.
