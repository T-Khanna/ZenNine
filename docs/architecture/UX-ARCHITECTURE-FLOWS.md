# ZenNine UX Flow and Architecture Diagrams

This document provides visual flows for core user journeys and a reference architecture for implementation.

## 1) End-to-End UX Flow (Import to Analysis)

```mermaid
flowchart TD
    A[Start / Open App] --> B{Create or Import Puzzle?}
    B -->|Create| C[Puzzle Editor]
    B -->|Import| D[Import Source]

    D --> D1[Paste SPN / JSON]
    D --> D2[Drag Drop File]
    D --> D3[Screenshot Upload]

    D1 --> E[Parser]
    D2 --> E
    D3 --> F[OCR + Grid Detection]
    F --> E

    E --> G{Validation Pass?}
    G -->|No| H[Correction UI]
    H --> E
    G -->|Yes| I[Canonical Puzzle Saved]

    C --> I
    I --> J[Start Solve Session]

    J --> K[Interaction Loop]
    K --> K1[Digit Entry]
    K --> K2[Candidate Entry]
    K --> K3[Color / Letter Notes]
    K --> K4[Multi-Select Actions]
    K --> K5[Undo / Redo]

    K1 --> L[Append Event]
    K2 --> L
    K3 --> L
    K4 --> L
    K5 --> L

    L --> M[Update Derived Board State]
    M --> N{Solved?}
    N -->|No| K
    N -->|Yes| O[Complete Session]

    O --> P[Stats + Timeline Replay]
    P --> Q[Export SPN / JSON]
```

## 2) Candidate Interaction Flow (Snyder-Oriented)

```mermaid
flowchart LR
    A[Candidate Mode Active] --> B{Lane}
    B -->|Center| C[Strong Candidates]
    B -->|Side| D[Weak/Pointing Candidates]

    C --> E{Action Type}
    D --> E

    E -->|toggle_candidate| F[Flip One Symbol]
    E -->|set_candidates| G[Replace Entire Lane Set]

    F --> H[Record Event with lane]
    G --> H
    H --> I[Recompute Candidate Layer]
    I --> J[Render Board]
```

## 3) Runtime Architecture (Web App)

```mermaid
flowchart TD
    subgraph Client[Frontend - React + TypeScript]
      UI[Board UI + Right Rail]
      ST[Local State - Zustand]
      Q[TanStack Query]
      IDX[IndexedDB Cache]
      IMP[Import UI]
      REP[Replay + Timeline Slider]
    end

    subgraph API[Backend - FastAPI]
      PZ[Puzzle Service]
      SS[Session/Event Service]
      STS[Stats Service]
      IM[Import Service]
    end

    subgraph Infra[Data + Jobs]
      PG[(PostgreSQL)]
      RD[(Redis Queue)]
      WK[Worker: OCR/Analysis]
      OBJ[(Object Storage)]
    end

    UI --> ST
    ST --> Q
    IMP --> Q
    REP --> Q
    Q <--> API

    PZ <--> PG
    SS <--> PG
    STS <--> PG
    IM --> RD
    RD --> WK
    WK --> PG
    WK <--> OBJ

    IDX <--> ST
    IDX <--> Q
```

## 4) Event Pipeline and Replay Determinism

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant EV as Event Validator
    participant AP as Event Applier
    participant DB as Session Store
    participant RP as Replay Engine

    U->>FE: Input (digit/candidate/color/multi-select)
    FE->>EV: Validate action payload
    EV-->>FE: Valid action
    FE->>AP: Apply action to current state
    AP-->>FE: New derived board state
    FE->>DB: Persist append-only event
    DB-->>FE: Ack

    U->>RP: Open timeline slider
    RP->>DB: Fetch events
    DB-->>RP: Ordered event stream
    RP->>AP: Reapply from checkpoint / index
    AP-->>RP: Reconstructed board at t
```

## 5) Suggested Implementation Order

1. Build end-to-end happy path: import SPN -> solve -> event append -> replay to end.
2. Add screenshot import and correction UI.
3. Add segmented stats and timeline breakpoint markers.
4. Add advanced drills and coaching features.

## 6) Right-Rail UI State Machine

```mermaid
stateDiagram-v2
  [*] --> Idle

  Idle --> ModeDigit: tap digit mode
  Idle --> ModeCandidateCenter: tap candidate mode (center lane default)
  Idle --> ModeColor: tap color mode
  Idle --> ModeLetter: tap letter mode

  ModeDigit --> ModeCandidateCenter: switch mode
  ModeDigit --> ModeColor: switch mode
  ModeDigit --> ModeLetter: switch mode

  ModeCandidateCenter --> ModeCandidateSide: lane toggle
  ModeCandidateSide --> ModeCandidateCenter: lane toggle

  ModeCandidateCenter --> ModeDigit: switch mode
  ModeCandidateCenter --> ModeColor: switch mode
  ModeCandidateCenter --> ModeLetter: switch mode
  ModeCandidateSide --> ModeDigit: switch mode
  ModeCandidateSide --> ModeColor: switch mode
  ModeCandidateSide --> ModeLetter: switch mode

  ModeColor --> ModeDigit: switch mode
  ModeColor --> ModeCandidateCenter: switch mode
  ModeColor --> ModeLetter: switch mode

  ModeLetter --> ModeDigit: switch mode
  ModeLetter --> ModeCandidateCenter: switch mode
  ModeLetter --> ModeColor: switch mode

  ModeDigit --> MultiSelectActive: drag or keyboard extend
  ModeCandidateCenter --> MultiSelectActive: drag or keyboard extend
  ModeCandidateSide --> MultiSelectActive: drag or keyboard extend
  ModeColor --> MultiSelectActive: drag or keyboard extend
  ModeLetter --> MultiSelectActive: drag or keyboard extend

  MultiSelectActive --> BatchApply: keypad/action tap
  BatchApply --> MultiSelectActive: keep selection
  BatchApply --> Idle: clear selection

  MultiSelectActive --> Idle: clear selection

  Idle --> TimelineOpen: open replay panel
  TimelineOpen --> Idle: close replay panel
  TimelineOpen --> Scrubbing: drag slider
  Scrubbing --> TimelineOpen: release slider
```
