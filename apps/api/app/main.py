import logging
import sys
import time
from typing import Annotated, Any, Literal, Union

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, TypeAdapter, ValidationError, constr

app = FastAPI(title="ZenNine API", version="0.1.0")
event_logger = logging.getLogger("zennine.events")
if not event_logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
    event_logger.addHandler(handler)
event_logger.setLevel(logging.INFO)
event_logger.propagate = False


def _extract_target_count(payload: dict[str, Any]) -> int:
    target_cells = payload.get("payload", {}).get("targetCells")
    if isinstance(target_cells, list):
        return len(target_cells)
    return 0

CellId = constr(pattern=r"^r[1-9][0-9]*c[1-9][0-9]*$")


class SetDigitPayload(BaseModel):
    targetCells: list[CellId] = Field(min_length=1)
    value: str
    selectionSource: Literal["drag", "row", "column", "box", "manual", "keyboard"] | None = None


class ClearDigitPayload(BaseModel):
    targetCells: list[CellId] = Field(min_length=1)
    selectionSource: Literal["drag", "row", "column", "box", "manual", "keyboard"] | None = None


class ToggleCandidatePayload(BaseModel):
    targetCells: list[CellId] = Field(min_length=1)
    lane: Literal["center", "side"]
    value: str
    selectionSource: Literal["drag", "row", "column", "box", "manual", "keyboard"] | None = None


class SetModePayload(BaseModel):
    value: Literal["digit", "candidate", "color", "letter"]


class CheckpointPayload(BaseModel):
    label: str | None = None


class GenericPayload(BaseModel):
    model_config = {"extra": "allow"}


class SetDigitEvent(BaseModel):
    actionType: Literal["set_digit"]
    payload: SetDigitPayload


class ClearDigitEvent(BaseModel):
    actionType: Literal["clear_digit"]
    payload: ClearDigitPayload


class ToggleCandidateEvent(BaseModel):
    actionType: Literal["toggle_candidate"]
    payload: ToggleCandidatePayload


class SetModeEvent(BaseModel):
    actionType: Literal["set_mode"]
    payload: SetModePayload


class UndoRedoEvent(BaseModel):
    actionType: Literal["undo", "redo"]
    payload: GenericPayload = Field(default_factory=GenericPayload)


class CheckpointEvent(BaseModel):
    actionType: Literal["checkpoint"]
    payload: CheckpointPayload = Field(default_factory=CheckpointPayload)


EventAction = Annotated[
    Union[
        SetDigitEvent,
        ClearDigitEvent,
        ToggleCandidateEvent,
        SetModeEvent,
        UndoRedoEvent,
        CheckpointEvent,
    ],
    Field(discriminator="actionType"),
]

event_adapter = TypeAdapter(EventAction)

# In-memory event store for initial contract wiring.
session_events: dict[str, list[dict[str, Any]]] = {}


def validate_action_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return event_adapter.validate_python(payload).model_dump()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/ping")
def ping() -> dict[str, str]:
    return {"message": "pong"}


@app.post("/api/v1/events/validate")
def validate_event_action(body: dict[str, Any]) -> dict[str, Any]:
    try:
        normalized = validate_action_payload(body)
        event_logger.info(
            "event.validate ok actionType=%s targetCount=%s",
            normalized.get("actionType"),
            _extract_target_count(normalized),
        )
        return {"valid": True, "normalized": normalized}
    except ValidationError as exc:
        event_logger.warning(
            "event.validate invalid errors=%s",
            len(exc.errors()),
        )
        return {"valid": False, "errors": exc.errors()}


@app.post("/api/v1/sessions/{session_id}/events")
def append_event_action(session_id: str, body: dict[str, Any]) -> dict[str, Any]:
    try:
        normalized = validate_action_payload(body)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    bucket = session_events.setdefault(session_id, [])
    index = len(bucket)
    timestamp_ms = int(time.time() * 1000)

    record = {
        "index": index,
        "timestampMs": timestamp_ms,
        "event": normalized,
    }
    bucket.append(record)

    event_logger.info(
        "event.append session=%s index=%s actionType=%s targetCount=%s",
        session_id,
        index,
        normalized.get("actionType"),
        _extract_target_count(normalized),
    )

    return {
        "sessionId": session_id,
        "index": index,
        "timestampMs": timestamp_ms,
        "event": normalized,
    }


@app.get("/api/v1/sessions/{session_id}/events")
def list_session_events(session_id: str) -> dict[str, Any]:
    count = len(session_events.get(session_id, []))
    event_logger.info("event.list session=%s count=%s", session_id, count)
    return {
        "sessionId": session_id,
        "count": count,
        "events": session_events.get(session_id, []),
    }
