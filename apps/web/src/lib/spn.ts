const DEFAULT_SYMBOLS = '123456789'

export type SpnGrid = {
  rows: number
  cols: number
  symbols: string
  grid: string
}

function parseSizeLine(line: string): { rows: number; cols: number } | null {
  const match = /^SIZE\s+(\d+)x(\d+)$/i.exec(line.trim())
  if (!match) return null

  const rows = Number(match[1])
  const cols = Number(match[2])

  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
    return null
  }

  return { rows, cols }
}

export function parseSpnGrid(input: string): SpnGrid {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))

  let rows = 9
  let cols = 9
  let symbols = DEFAULT_SYMBOLS
  let grid = ''
  let inPuzzleSection = false

  for (const line of lines) {
    if (line.toUpperCase() === '@PUZZLE') {
      inPuzzleSection = true
      continue
    }

    if (line.startsWith('@')) {
      inPuzzleSection = false
      continue
    }

    if (!inPuzzleSection) continue

    const size = parseSizeLine(line)
    if (size) {
      rows = size.rows
      cols = size.cols
      continue
    }

    if (/^SYMBOLS\s+/i.test(line)) {
      const value = line.replace(/^SYMBOLS\s+/i, '').trim()
      if (value.length > 0) {
        symbols = value
      }
      continue
    }

    if (/^GRID\s+/i.test(line)) {
      grid = line.replace(/^GRID\s+/i, '').trim()
    }
  }

  if (!grid) {
    throw new Error('SPN parse failed: missing GRID line in @PUZZLE section')
  }

  return { rows, cols, symbols, grid }
}

export function extractGivensFromSpn(input: string): Map<number, number> {
  const parsed = parseSpnGrid(input)

  if (parsed.rows !== 9 || parsed.cols !== 9) {
    throw new Error(`Only 9x9 puzzles are supported right now (got ${parsed.rows}x${parsed.cols})`)
  }

  const rows = parsed.grid.split('|')
  if (rows.length !== parsed.rows) {
    throw new Error(`SPN parse failed: expected ${parsed.rows} rows in GRID, got ${rows.length}`)
  }

  const symbols = parsed.symbols
  const symbolToDigit = new Map<string, number>()
  for (let i = 0; i < symbols.length; i += 1) {
    symbolToDigit.set(symbols[i], i + 1)
  }

  const givens = new Map<number, number>()

  for (let row = 0; row < parsed.rows; row += 1) {
    const rowText = rows[row]

    if (rowText.length !== parsed.cols) {
      throw new Error(`SPN parse failed: row ${row + 1} has length ${rowText.length}, expected ${parsed.cols}`)
    }

    for (let col = 0; col < parsed.cols; col += 1) {
      const ch = rowText[col]
      if (ch === '.') continue

      const digit = symbolToDigit.get(ch)
      if (digit === undefined) {
        throw new Error(`SPN parse failed: unknown symbol '${ch}' at row ${row + 1}, col ${col + 1}`)
      }

      givens.set(row * parsed.cols + col, digit)
    }
  }

  return givens
}
