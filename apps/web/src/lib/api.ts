export type PingResponse = {
  message: string
}

export type BoardEvent =
  | { type: 'set_digit'; targetCells: number[]; digit: number }
  | { type: 'clear_cell'; targetCells: number[] }
  | { type: 'toggle_candidate'; targetCells: number[]; digit: number }

type ApiAction =
  | {
      actionType: 'set_digit'
      payload: {
        targetCells: string[]
        value: string
        selectionSource: 'manual' | 'drag' | 'keyboard'
      }
    }
  | {
      actionType: 'clear_digit'
      payload: {
        targetCells: string[]
        selectionSource: 'manual' | 'drag' | 'keyboard'
      }
    }
  | {
      actionType: 'toggle_candidate'
      payload: {
        targetCells: string[]
        lane: 'center'
        value: string
        selectionSource: 'manual' | 'drag' | 'keyboard'
      }
    }

type AppendEventResponse = {
  sessionId: string
  index: number
  timestampMs: number
}

function indexToCellId(index: number): string {
  const row = Math.floor(index / 9) + 1
  const col = (index % 9) + 1
  return `r${row}c${col}`
}

export function toApiAction(event: BoardEvent): ApiAction {
  const targetCells = event.targetCells.map(indexToCellId)

  if (event.type === 'set_digit') {
    return {
      actionType: 'set_digit',
      payload: {
        targetCells,
        value: String(event.digit),
        selectionSource: targetCells.length > 1 ? 'drag' : 'manual',
      },
    }
  }

  if (event.type === 'clear_cell') {
    return {
      actionType: 'clear_digit',
      payload: {
        targetCells,
        selectionSource: targetCells.length > 1 ? 'drag' : 'manual',
      },
    }
  }

  return {
    actionType: 'toggle_candidate',
    payload: {
      targetCells,
      lane: 'center',
      value: String(event.digit),
      selectionSource: targetCells.length > 1 ? 'drag' : 'manual',
    },
  }
}

export async function fetchPing(signal?: AbortSignal): Promise<PingResponse> {
  const response = await fetch('/api/v1/ping', { signal })

  if (!response.ok) {
    throw new Error(`Ping failed with status ${response.status}`)
  }

  return (await response.json()) as PingResponse
}

export async function appendSessionEvent(
  sessionId: string,
  action: ApiAction,
  signal?: AbortSignal,
): Promise<AppendEventResponse> {
  const response = await fetch(`/api/v1/sessions/${sessionId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(action),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Append event failed with status ${response.status}`)
  }

  return (await response.json()) as AppendEventResponse
}
