import { useState } from 'react'
import type { Player } from '../types'
import type { RoundInput } from '../gameLogic'

interface Props {
  roundNumber: number
  activePlayers: Player[]
  onSubmit: (input: RoundInput) => void
}

interface PlayerEntry {
  playerId: string
  value: string // raw input string
}

export default function RoundEntry({ roundNumber, activePlayers, onSubmit }: Props) {
  const [entries, setEntries] = useState<PlayerEntry[]>(
    activePlayers.map((p) => ({ playerId: p.id, value: '' })),
  )
  const [yanivCallerId, setYanivCallerId] = useState<string | null>(null)
  const [asaf, setAsaf] = useState(false)

  function setEntry(playerId: string, value: string) {
    setEntries((prev) =>
      prev.map((e) => (e.playerId === playerId ? { ...e, value } : e)),
    )
  }

  function toggleYaniv(playerId: string) {
    if (yanivCallerId === playerId) {
      // Deselect
      setYanivCallerId(null)
      setAsaf(false)
      setEntry(playerId, '')
    } else {
      setYanivCallerId(playerId)
      setAsaf(false)
      // Clear the caller's entry — they get 0 (or we'll use it if Asaf)
      setEntry(playerId, '')
    }
  }

  function handleAsafToggle(checked: boolean) {
    setAsaf(checked)
    if (!checked && yanivCallerId) {
      setEntry(yanivCallerId, '')
    }
  }

  const allFilled = activePlayers.every((p) => {
    const entry = entries.find((e) => e.playerId === p.id)
    if (p.id === yanivCallerId) {
      if (!asaf) return true // caller gets 0, no input needed
      return entry?.value !== '' && !isNaN(Number(entry?.value))
    }
    return entry?.value !== '' && !isNaN(Number(entry?.value))
  })

  function handleSubmit() {
    if (!allFilled) return

    const handTotals: Record<string, number> = {}
    for (const p of activePlayers) {
      const entry = entries.find((e) => e.playerId === p.id)
      if (p.id === yanivCallerId && !asaf) {
        handTotals[p.id] = 0
      } else {
        handTotals[p.id] = Number(entry?.value ?? 0)
      }
    }

    onSubmit({ handTotals, yanivCallerId, asaf })
  }

  return (
    <div className="card">
      <div className="round-entry-header">
        <span className="round-title">Round {roundNumber}</span>
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Enter hand totals</span>
      </div>

      <div className="round-player-rows">
        {activePlayers.map((player) => {
          const isCaller = yanivCallerId === player.id
          const entry = entries.find((e) => e.playerId === player.id)!
          const rowClass = isCaller && asaf ? 'asaf' : isCaller ? 'yaniv-caller' : ''

          return (
            <div key={player.id} className={`round-player-row ${rowClass}`}>
              <div>
                <div className="rpr-name">{player.name}</div>
                <div className="rpr-score-hint">{player.score} pts</div>
              </div>

              <div className="rpr-input-wrap">
                {isCaller && !asaf ? (
                  <span style={{ color: 'var(--yaniv)', fontWeight: 700, fontSize: '0.95rem', width: 70, textAlign: 'center' }}>
                    0
                  </span>
                ) : (
                  <input
                    type="number"
                    min={0}
                    placeholder="pts"
                    value={entry.value}
                    onChange={(e) => setEntry(player.id, e.target.value)}
                  />
                )}
              </div>

              <button
                className={`yaniv-btn ${isCaller ? 'active' : ''}`}
                onClick={() => toggleYaniv(player.id)}
              >
                Yaniv
              </button>
            </div>
          )
        })}
      </div>

      {yanivCallerId && (
        <div className="asaf-row">
          <label>
            <input
              type="checkbox"
              checked={asaf}
              onChange={(e) => handleAsafToggle(e.target.checked)}
            />
            Asaf! (someone had equal or fewer points)
          </label>
          {asaf && (
            <span className="asaf-penalty-note">
              +30 penalty for{' '}
              {activePlayers.find((p) => p.id === yanivCallerId)?.name}
            </span>
          )}
        </div>
      )}

      <div className="round-footer mt-3">
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!allFilled}
        >
          Confirm round
        </button>
      </div>
    </div>
  )
}
