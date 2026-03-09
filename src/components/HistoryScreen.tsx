import { useState } from 'react'
import type { SavedGame } from '../types'
import { loadHistory } from '../storage'
import Scoreboard from './Scoreboard'
import RoundHistory from './RoundHistory'

interface Props {
  onBack: () => void
}

export default function HistoryScreen({ onBack }: Props) {
  const games = loadHistory()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="container">
      <div className="game-header">
        <h1>Past games</h1>
        <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={onBack}>
          ← Back
        </button>
      </div>

      {games.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🃏</div>
          <p className="text-muted">No completed games yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              expanded={expandedId === game.id}
              onToggle={() => toggle(game.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GameCard({
  game,
  expanded,
  onToggle,
}: {
  game: SavedGame
  expanded: boolean
  onToggle: () => void
}) {
  const { state } = game
  const winner = state.players.find((p) => p.id === state.winnerId)
  const date = new Date(game.completedAt)
  const dateLabel = date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const timeLabel = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Sort players for the summary: winner first, then by score
  const sorted = [...state.players].sort((a, b) => {
    if (a.id === state.winnerId) return -1
    if (b.id === state.winnerId) return 1
    return a.score - b.score
  })

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header row — always visible */}
      <button className="history-game-header" onClick={onToggle}>
        <div className="hgh-left">
          <span className="hgh-winner">🏆 {winner?.name ?? '?'}</span>
          <span className="hgh-meta">
            {state.rounds.length} rounds &nbsp;·&nbsp; max {state.maxPoints} pts
          </span>
          <div className="hgh-players">
            {sorted.map((p) => (
              <span key={p.id} className={`hgh-player-chip ${p.eliminated ? 'eliminated' : ''}`}>
                {p.name} {p.score}
              </span>
            ))}
          </div>
        </div>
        <div className="hgh-right">
          <div className="hgh-date">{dateLabel}</div>
          <div className="hgh-time">{timeLabel}</div>
          <div className="hgh-chevron">{expanded ? '▲' : '▼'}</div>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="history-game-details">
          <Scoreboard gameState={state} latestRound={null} />
          <RoundHistory gameState={state} defaultOpen />
        </div>
      )}
    </div>
  )
}
