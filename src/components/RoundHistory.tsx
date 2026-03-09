import { useState } from 'react'
import type { GameState, Round } from '../types'

interface Props {
  gameState: GameState
  defaultOpen?: boolean
}

export default function RoundHistory({ gameState, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const { rounds, players } = gameState

  if (rounds.length === 0) return null

  function playerName(id: string) {
    return players.find((p) => p.id === id)?.name ?? id
  }

  return (
    <div className="card">
      <button className="history-toggle" onClick={() => setOpen((o) => !o)}>
        <span>{open ? '▾' : '▸'}</span>
        Round history ({rounds.length})
      </button>

      {open && (
        <div className="history-list">
          {[...rounds].reverse().map((round) => (
            <RoundHistoryItem
              key={round.id}
              round={round}
              playerName={playerName}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RoundHistoryItem({
  round,
  playerName,
}: {
  round: Round
  playerName: (id: string) => string
}) {
  return (
    <div className="history-round">
      <div className="history-round-header">Round {round.id}</div>
      <div className="history-round-rows">
        {round.playerScores.map((ps) => (
          <div key={ps.playerId} className="history-row">
            <span className="history-name">{playerName(ps.playerId)}</span>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {ps.calledYaniv && !ps.gotAsafed && <span className="tag yaniv">Yaniv</span>}
              {ps.gotAsafed && <span className="tag asaf">Asaf'd</span>}
              {ps.didAsaf && <span className="tag yaniv">Asaf!</span>}
              {ps.halved && <span className="tag halved">Halved</span>}
              {ps.eliminated && <span className="tag out">Out</span>}
            </div>

            <span className={`history-delta ${ps.points === 0 ? 'zero' : ps.gotAsafed ? 'asaf' : ''}`}>
              {ps.points === 0 ? '0' : `+${ps.points}`}
            </span>

            <span className="history-score-change">
              {ps.scoreBefore} → {ps.scoreAfter}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
