import { useEffect, useMemo, useState } from 'react'
import { fetchPing } from './lib/api'
import './App.css'

type ApiStatus = 'idle' | 'loading' | 'ok' | 'error'

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('idle')
  const [apiMessage, setApiMessage] = useState('Not checked yet')

  const sampleDigits = useMemo(
    () =>
      new Map<number, string>([
        [0, '9'],
        [4, '3'],
        [11, '5'],
        [14, '2'],
        [16, '3'],
        [20, '4'],
        [23, '1'],
        [26, '6'],
      ]),
    [],
  )

  const runPing = async () => {
    setApiStatus('loading')

    try {
      const data = await fetchPing()
      setApiStatus('ok')
      setApiMessage(data.message)
    } catch (error) {
      setApiStatus('error')
      setApiMessage(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  useEffect(() => {
    void runPing()
  }, [])

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
          <div className="board-grid">
            {Array.from({ length: 81 }, (_, index) => {
              const value = sampleDigits.get(index)
              const col = index % 9
              const row = Math.floor(index / 9)
              const classes = ['cell']

              if (value) classes.push('given')
              if ((col + 1) % 3 === 0 && col !== 8) classes.push('thick-right')
              if ((row + 1) % 3 === 0 && row !== 8) classes.push('thick-bottom')

              return (
                <div key={index} className={classes.join(' ')}>
                  {value ?? ''}
                </div>
              )
            })}
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
            <h2>Next Build Targets</h2>
            <ul>
              <li>Event-backed board state</li>
              <li>Digit and candidate input modes</li>
              <li>Undo/redo event timeline</li>
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
