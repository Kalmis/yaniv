import { useState } from 'react'

interface Props {
  onStart: (maxPoints: number, playerNames: string[]) => void
}

export default function SetupScreen({ onStart }: Props) {
  const [maxPoints, setMaxPoints] = useState(200)
  const [players, setPlayers] = useState(['', ''])

  function addPlayer() {
    if (players.length < 8) setPlayers([...players, ''])
  }

  function removePlayer(i: number) {
    setPlayers(players.filter((_, idx) => idx !== i))
  }

  function updatePlayer(i: number, val: string) {
    const next = [...players]
    next[i] = val
    setPlayers(next)
  }

  const filledNames = players.map((p) => p.trim()).filter(Boolean)
  const canStart = filledNames.length >= 2 && maxPoints >= 10

  function handleStart() {
    if (!canStart) return
    onStart(maxPoints, filledNames)
  }

  function handleKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key === 'Enter') {
      if (i === players.length - 1) addPlayer()
    }
  }

  return (
    <div className="container">
      <div className="setup-header">
        <h1>Yaniv</h1>
        <p className="subtitle">Score Tracker</p>
      </div>

      <div className="card">
        <h2>Game Settings</h2>
        <div className="field">
          <label htmlFor="max-points">Max points (elimination threshold)</label>
          <input
            id="max-points"
            type="number"
            min={10}
            max={1000}
            value={maxPoints}
            onChange={(e) => setMaxPoints(Number(e.target.value))}
          />
          {maxPoints >= 10 && (
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
              Halving at every multiple of 50 &nbsp;&middot;&nbsp; Eliminated at ≥ {maxPoints} pts
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Players ({players.length} / 8)</h2>
        <div className="player-list">
          {players.map((name, i) => (
            <div key={i} className="player-row">
              <input
                type="text"
                placeholder={`Player ${i + 1}`}
                value={name}
                onChange={(e) => updatePlayer(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                autoFocus={i === 0}
              />
              {players.length > 2 && (
                <button
                  className="btn-danger"
                  onClick={() => removePlayer(i)}
                  aria-label="Remove player"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {players.length < 8 && (
          <button className="btn-secondary mt-2" onClick={addPlayer}>
            + Add player
          </button>
        )}
      </div>

      <div className="setup-footer">
        <button
          className="btn-primary"
          onClick={handleStart}
          disabled={!canStart}
          style={{ padding: '12px 40px', fontSize: '1rem' }}
        >
          Start game
        </button>
      </div>
    </div>
  )
}
