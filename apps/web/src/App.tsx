import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchPing } from './lib/api'
import { extractGivensFromSpn } from './lib/spn'
import './App.css'

type ApiStatus = 'idle' | 'loading' | 'ok' | 'error'
type InputMode = 'digit' | 'candidate'

type BoardEvent =
  | { type: 'set_digit'; cell: number; digit: number }
  | { type: 'clear_cell'; cell: number }
  | { type: 'toggle_candidate'; cell: number; digit: number }
  | { type: 'set_digit_multi'; cells: number[]; digit: number }
  | { type: 'clear_cell_multi'; cells: number[] }
  | { type: 'toggle_candidate_multi'; cells: number[]; digit: number }

type CellState = {
  digit: number | null
  given: boolean
  candidates: Set<number>
}

// TODO: Replace these fixed dimensions by deriving rows/cols from SPN metadata.
const BOARD_SIZE = 9
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE

function createInitialBoard(givens: Map<number, number>): CellState[] {
  return Array.from({ length: CELL_COUNT }, (_, index) => {
    const given = givens.get(index)

    return {
      digit: given ?? null,
      given: given !== undefined,
      candidates: new Set<number>(),
    }
  })
}

function replayBoard(givens: Map<number, number>, events: BoardEvent[]): CellState[] {
  const board = createInitialBoard(givens)

  const applySingleEvent = (event: { type: 'set_digit' | 'clear_cell' | 'toggle_candidate'; cell: number; digit?: number }) => {
    const cell = board[event.cell]

    if (!cell || cell.given) return

    if (event.type === 'set_digit' && event.digit !== undefined) {
      cell.digit = event.digit
      cell.candidates.clear()
      return
    }

    if (event.type === 'clear_cell') {
      cell.digit = null
      cell.candidates.clear()
      return
    }

    if (event.type === 'toggle_candidate' && event.digit !== undefined) {
      if (cell.digit !== null) return

      if (cell.candidates.has(event.digit)) {
        cell.candidates.delete(event.digit)
      } else {
        cell.candidates.add(event.digit)
      }
    }
  }

  for (const event of events) {
    if (event.type === 'set_digit_multi') {
      for (const cell of event.cells) {
        applySingleEvent({ type: 'set_digit', cell, digit: event.digit })
      }
      continue
    }

    if (event.type === 'clear_cell_multi') {
      for (const cell of event.cells) {
        applySingleEvent({ type: 'clear_cell', cell })
      }
      continue
    }

    if (event.type === 'toggle_candidate_multi') {
      for (const cell of event.cells) {
        applySingleEvent({ type: 'toggle_candidate', cell, digit: event.digit })
      }
      continue
    }

    applySingleEvent(event)
  }

  return board
}

function collectUnitConflicts(indices: number[], board: CellState[], conflicts: Set<number>): void {
  const bucket = new Map<number, number[]>()

  for (const index of indices) {
    const digit = board[index]?.digit
    if (digit === null || digit === undefined) continue

    const list = bucket.get(digit)
    if (list) {
      list.push(index)
    } else {
      bucket.set(digit, [index])
    }
  }

  for (const indicesWithDigit of bucket.values()) {
    if (indicesWithDigit.length < 2) continue
    for (const index of indicesWithDigit) {
      conflicts.add(index)
    }
  }
}

function getConflictCells(board: CellState[]): Set<number> {
  const conflicts = new Set<number>()

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const indices = Array.from({ length: BOARD_SIZE }, (_, col) => row * BOARD_SIZE + col)
    collectUnitConflicts(indices, board, conflicts)
  }

  for (let col = 0; col < BOARD_SIZE; col += 1) {
    const indices = Array.from({ length: BOARD_SIZE }, (_, row) => row * BOARD_SIZE + col)
    collectUnitConflicts(indices, board, conflicts)
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const indices: number[] = []

      for (let rowOffset = 0; rowOffset < 3; rowOffset += 1) {
        for (let colOffset = 0; colOffset < 3; colOffset += 1) {
          const row = boxRow * 3 + rowOffset
          const col = boxCol * 3 + colOffset
          indices.push(row * BOARD_SIZE + col)
        }
      }

      collectUnitConflicts(indices, board, conflicts)
    }
  }

  return conflicts
}

function moveSelection(currentCell: number | null, rowDelta: number, colDelta: number): number {
  if (currentCell === null) return 0

  const currentRow = Math.floor(currentCell / BOARD_SIZE)
  const currentCol = currentCell % BOARD_SIZE
  const nextRow = (currentRow + rowDelta + BOARD_SIZE) % BOARD_SIZE
  const nextCol = (currentCol + colDelta + BOARD_SIZE) % BOARD_SIZE

  return nextRow * BOARD_SIZE + nextCol
}

function getRectSelection(anchor: number, focus: number): Set<number> {
  const anchorRow = Math.floor(anchor / BOARD_SIZE)
  const anchorCol = anchor % BOARD_SIZE
  const focusRow = Math.floor(focus / BOARD_SIZE)
  const focusCol = focus % BOARD_SIZE

  const startRow = Math.min(anchorRow, focusRow)
  const endRow = Math.max(anchorRow, focusRow)
  const startCol = Math.min(anchorCol, focusCol)
  const endCol = Math.max(anchorCol, focusCol)

  const selected = new Set<number>()

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      selected.add(row * BOARD_SIZE + col)
    }
  }

  return selected
}

function getCellIndexFromPointerTarget(target: EventTarget | null): number | null {
  if (!(target instanceof HTMLElement)) return null

  const source = target.closest<HTMLElement>('[data-cell-index]')
  if (!source) return null

  const parsed = Number(source.dataset.cellIndex)
  if (!Number.isInteger(parsed)) return null

  if (parsed < 0 || parsed >= CELL_COUNT) return null
  return parsed
}

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('idle')
  const [apiMessage, setApiMessage] = useState('Not checked yet')
  const [events, setEvents] = useState<BoardEvent[]>([])
  const [cursor, setCursor] = useState(0)
  const [selectedCell, setSelectedCell] = useState<number | null>(0)
  const [selectedCells, setSelectedCells] = useState<Set<number>>(() => new Set([0]))
  const [keyboardAnchorCell, setKeyboardAnchorCell] = useState<number | null>(0)
  const [inputMode, setInputMode] = useState<InputMode>('digit')
  const [showConflicts, setShowConflicts] = useState(true)
  const [givenDigits, setGivenDigits] = useState<Map<number, number>>(() => new Map())
  const [puzzleSource, setPuzzleSource] = useState('Loading default SPN...')

  const isPointerActiveRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const loadSampleSpn = async () => {
      try {
        const response = await fetch('/examples/sample-classic-9x9.spn')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const spnText = await response.text()
        const parsedGivens = extractGivensFromSpn(spnText)

        if (cancelled) return

        setGivenDigits(parsedGivens)
        setEvents([])
        setCursor(0)
        setSelectedCell(0)
        setSelectedCells(new Set([0]))
        setPuzzleSource('Sample SPN: sample-classic-9x9.spn')
      } catch (error) {
        if (cancelled) return

        setGivenDigits(new Map())
        setPuzzleSource(
          `Default SPN failed to load: ${error instanceof Error ? error.message : 'unknown error'}`,
        )
      }
    }

    void loadSampleSpn()

    return () => {
      cancelled = true
    }
  }, [])

  const activeEvents = useMemo(() => events.slice(0, cursor), [events, cursor])
  const board = useMemo(() => replayBoard(givenDigits, activeEvents), [activeEvents, givenDigits])
  const conflictCells = useMemo(
    () => (showConflicts ? getConflictCells(board) : new Set<number>()),
    [board, showConflicts],
  )

  const selectedRow = selectedCell === null ? -1 : Math.floor(selectedCell / BOARD_SIZE)
  const selectedCol = selectedCell === null ? -1 : selectedCell % BOARD_SIZE
  const selectedBox =
    selectedCell === null
      ? -1
      : Math.floor(selectedRow / 3) * 3 + Math.floor(selectedCol / 3)

  const checkPing = useCallback(async () => {
    try {
      const data = await fetchPing()
      setApiStatus('ok')
      setApiMessage(data.message)
    } catch (error) {
      setApiStatus('error')
      setApiMessage(error instanceof Error ? error.message : 'Unknown error')
    }
  }, [])

  const runPing = useCallback(() => {
    setApiStatus('loading')
    setApiMessage('Checking API...')
    void checkPing()
  }, [checkPing])

  const appendEvent = useCallback((event: BoardEvent) => {
    const nextCursor = cursor + 1
    setEvents((previous) => [...previous.slice(0, cursor), event])
    setCursor(nextCursor)
  }, [cursor])

  const getSelectionTargets = useCallback((): number[] => {
    const fromSet = Array.from(selectedCells)
    if (fromSet.length > 0) return fromSet
    return selectedCell === null ? [] : [selectedCell]
  }, [selectedCell, selectedCells])

  const collapseSelectionToActiveCell = useCallback(() => {
    setKeyboardAnchorCell(selectedCell)
    setSelectedCells((previous) => {
      if (selectedCell === null) return previous.size === 0 ? previous : new Set<number>()
      if (previous.size === 1 && previous.has(selectedCell)) return previous
      return new Set([selectedCell])
    })
  }, [selectedCell])

  const handleDigitInput = useCallback((digit: number) => {
    const targets = getSelectionTargets()
    if (targets.length === 0) return

    if (inputMode === 'candidate') {
      if (targets.length === 1) {
        appendEvent({ type: 'toggle_candidate', cell: targets[0], digit })
      } else {
        appendEvent({ type: 'toggle_candidate_multi', cells: targets, digit })
      }
      collapseSelectionToActiveCell()
      return
    }

    if (targets.length === 1) {
      const target = board[targets[0]]
      if (!target || target.given) return

      if (target.digit === digit) {
        appendEvent({ type: 'clear_cell', cell: targets[0] })
        collapseSelectionToActiveCell()
        return
      }

      appendEvent({ type: 'set_digit', cell: targets[0], digit })
      collapseSelectionToActiveCell()
      return
    }

    appendEvent({ type: 'set_digit_multi', cells: targets, digit })
    collapseSelectionToActiveCell()
  }, [appendEvent, board, collapseSelectionToActiveCell, getSelectionTargets, inputMode])

  const clearSelectedCell = useCallback(() => {
    const targets = getSelectionTargets()
    if (targets.length === 0) return

    if (targets.length === 1) {
      const target = board[targets[0]]

      if (!target || target.given) return
      if (target.digit === null && target.candidates.size === 0) return

      appendEvent({ type: 'clear_cell', cell: targets[0] })
      collapseSelectionToActiveCell()
      return
    }

    appendEvent({ type: 'clear_cell_multi', cells: targets })
    collapseSelectionToActiveCell()
  }, [appendEvent, board, collapseSelectionToActiveCell, getSelectionTargets])

  const undo = useCallback(() => {
    if (cursor === 0) return
    setCursor((value) => value - 1)
  }, [cursor])

  const redo = useCallback(() => {
    if (cursor >= events.length) return
    setCursor((value) => value + 1)
  }, [cursor, events.length])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }

      if (event.key >= '1' && event.key <= '9') {
        event.preventDefault()
        handleDigitInput(Number(event.key))
        return
      }

      if (event.code === 'Space' || event.key === ' ') {
        if (event.repeat) return
        event.preventDefault()
        setInputMode((value) => (value === 'digit' ? 'candidate' : 'digit'))
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
        event.preventDefault()
        clearSelectedCell()
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedCell((value) => {
          const next = moveSelection(value, -1, 0)

          if (event.shiftKey) {
            const anchor = keyboardAnchorCell ?? value ?? next
            setSelectedCells(getRectSelection(anchor, next))
          } else {
            setSelectedCells(new Set([next]))
            setKeyboardAnchorCell(next)
          }

          return next
        })
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedCell((value) => {
          const next = moveSelection(value, 1, 0)

          if (event.shiftKey) {
            const anchor = keyboardAnchorCell ?? value ?? next
            setSelectedCells(getRectSelection(anchor, next))
          } else {
            setSelectedCells(new Set([next]))
            setKeyboardAnchorCell(next)
          }

          return next
        })
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setSelectedCell((value) => {
          const next = moveSelection(value, 0, -1)

          if (event.shiftKey) {
            const anchor = keyboardAnchorCell ?? value ?? next
            setSelectedCells(getRectSelection(anchor, next))
          } else {
            setSelectedCells(new Set([next]))
            setKeyboardAnchorCell(next)
          }

          return next
        })
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setSelectedCell((value) => {
          const next = moveSelection(value, 0, 1)

          if (event.shiftKey) {
            const anchor = keyboardAnchorCell ?? value ?? next
            setSelectedCells(getRectSelection(anchor, next))
          } else {
            setSelectedCells(new Set([next]))
            setKeyboardAnchorCell(next)
          }

          return next
        })
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clearSelectedCell, handleDigitInput, keyboardAnchorCell, redo, undo])

  useEffect(() => {
    const stopInteraction = () => {
      isPointerActiveRef.current = false
    }

    window.addEventListener('pointerup', stopInteraction)
    return () => window.removeEventListener('pointerup', stopInteraction)
  }, [])

  const canUndo = cursor > 0
  const canRedo = cursor < events.length

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ZenNine</p>
          <h1>Sudoku Workbench</h1>
        </div>
        <p className="subtle">Scaffold milestone: board shell + API handshake</p>
      </header>

      <main className="workspace">
        <section className="board-panel" aria-label="Sudoku board preview">
          <div className="board-toolbar" aria-label="Board controls">
            <div className="mode-group" role="group" aria-label="Input mode">
              <button
                type="button"
                className={`mode-pill ${inputMode === 'digit' ? 'active' : ''}`}
                onClick={() => setInputMode('digit')}
              >
                Digit
              </button>
              <button
                type="button"
                className={`mode-pill ${inputMode === 'candidate' ? 'active' : ''}`}
                onClick={() => setInputMode('candidate')}
              >
                Candidate
              </button>
            </div>

            <div className="history-group" role="group" aria-label="History controls">
              <button type="button" onClick={undo} disabled={!canUndo}>
                Undo
              </button>
              <button type="button" onClick={redo} disabled={!canRedo}>
                Redo
              </button>
            </div>
          </div>

          <div
            className="board-grid"
            onPointerDown={(event) => {
              if (event.button !== 0) return

              const cellIndex = getCellIndexFromPointerTarget(event.target)
              if (cellIndex === null) return

              setSelectedCell(cellIndex)
              isPointerActiveRef.current = true
              setKeyboardAnchorCell(cellIndex)
              setSelectedCells(new Set([cellIndex]))
            }}
            onPointerMove={(event) => {
              if (!isPointerActiveRef.current) return

              const cellIndex = getCellIndexFromPointerTarget(event.target)
              if (cellIndex === null) return

              setSelectedCell(cellIndex)
              setSelectedCells((previous) => {
                if (previous.has(cellIndex)) return previous
                const next = new Set(previous)
                next.add(cellIndex)
                return next
              })
            }}
            onPointerUp={() => {
              isPointerActiveRef.current = false
            }}
          >
            {Array.from({ length: CELL_COUNT }, (_, index) => {
              const cell = board[index]
              const col = index % 9
              const row = Math.floor(index / 9)
              const classes = ['cell']
              const inSameRow = row === selectedRow
              const inSameCol = col === selectedCol
              const cellBox = Math.floor(row / 3) * 3 + Math.floor(col / 3)
              const inSameBox = cellBox === selectedBox

              if (inSameRow || inSameCol || inSameBox) classes.push('peer')
              if (selectedCell === index) classes.push('selected')
              if (selectedCells.has(index)) classes.push('multi-selected')
              if (cell.given) classes.push('given')
              if (!cell.given) classes.push('editable')
              if (conflictCells.has(index)) classes.push('conflict')

              if ((col + 1) % 3 === 0 && col !== 8) classes.push('thick-right')
              if ((row + 1) % 3 === 0 && row !== 8) classes.push('thick-bottom')

              return (
                <div
                  key={index}
                  data-cell-index={index}
                  className={classes.join(' ')}
                  onClick={() => {
                    setSelectedCell(index)
                    setKeyboardAnchorCell(index)
                    setSelectedCells(new Set([index]))
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Cell r${row + 1} c${col + 1}`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      setSelectedCell(index)
                      setKeyboardAnchorCell(index)
                    }
                  }}
                >
                  {cell.digit !== null ? (
                    String(cell.digit)
                  ) : (
                    <div className="candidate-grid" aria-hidden="true">
                      {Array.from({ length: BOARD_SIZE }, (_, digitIndex) => {
                        const digit = digitIndex + 1
                        const active = cell.candidates.has(digit)

                        return (
                          <span key={digit} className={active ? 'active' : ''}>
                            {active ? digit : ''}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="keypad" role="group" aria-label="Digit input keypad">
            {Array.from({ length: BOARD_SIZE }, (_, index) => {
              const digit = index + 1

              return (
                <button key={digit} type="button" onClick={() => handleDigitInput(digit)}>
                  {digit}
                </button>
              )
            })}
            <button type="button" className="clear" onClick={clearSelectedCell}>
              Clear
            </button>
          </div>
        </section>

        <aside className="rail" aria-label="Control rail">
          <article className="card">
            <h2>Backend Status</h2>
            <p className={`status ${apiStatus}`}>Status: {apiStatus}</p>
            <p className="mono">{apiMessage}</p>
            <button type="button" onClick={runPing} disabled={apiStatus === 'loading'}>
              {apiStatus === 'loading' ? 'Checking...' : 'Re-check API'}
            </button>
          </article>

          <article className="card">
            <h2>Board State</h2>
            <ul>
              <li>Puzzle source: {puzzleSource}</li>
              <li>Events recorded: {events.length}</li>
              <li>Timeline position: {cursor}</li>
              <li>Input mode: {inputMode}</li>
            </ul>
          </article>

          <article className="card">
            <h2>Tools</h2>
            <ul>
              <li>
                <label className="toggle-line">
                  <input
                    type="checkbox"
                    checked={showConflicts}
                    onChange={(event) => setShowConflicts(event.target.checked)}
                  />
                  Highlight conflicts
                </label>
              </li>
              <li>Arrow keys move selection</li>
              <li>Space toggles digit/candidate mode</li>
              <li>Drag to select multiple cells</li>
              <li>1-9 applies value/candidate to selected cells</li>
              <li>Backspace/Delete clears cell</li>
            </ul>
          </article>

          <article className="card">
            <h2>Run Commands</h2>
            <p className="mono">npm run web:dev</p>
            <p className="mono">npm run api:run</p>
          </article>
        </aside>
      </main>
    </div>
  )
}

export default App
