import type { GameState, Round } from '../types'

interface Props {
  gameState: GameState
  latestRound: Round | null
}

export default function Scoreboard({ gameState, latestRound }: Props) {
  const { players, maxPoints } = gameState

  // Sort: active players by score asc, eliminated last
  const sorted = [...players].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1
    return a.score - b.score
  })

  function getLastRoundStatus(playerId: string) {
    if (!latestRound) return null
    return latestRound.playerScores.find((ps) => ps.playerId === playerId) ?? null
  }

  return (
    <div className="card">
      <h2>Scoreboard</h2>
      <table className="scoreboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th style={{ textAlign: 'right' }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((player, idx) => {
            const ps = getLastRoundStatus(player.id)
            const pct = Math.min((player.score / maxPoints) * 100, 100)
            const isWarn = pct >= 70

            let statusPill: React.ReactNode = null
            if (player.eliminated) {
              statusPill = <span className="status-pill eliminated">Out</span>
            } else if (ps?.halved) {
              statusPill = <span className="status-pill halved">Halved!</span>
            } else {
              statusPill = <span className="status-pill active">Active</span>
            }

            return (
              <tr key={player.id} className={player.eliminated ? 'eliminated' : ''}>
                <td>
                  <span className={`rank-badge ${idx === 0 && !player.eliminated ? 'first' : ''}`}>
                    {idx + 1}
                  </span>
                </td>
                <td>
                  <div className="player-name-cell">
                    <span>{player.name}</span>
                    {statusPill}
                  </div>
                </td>
                <td>
                  <div style={{ textAlign: 'right' }}>
                    <div className="score-cell">
                      {ps?.halved ? (
                        <>
                          <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', fontSize: '0.85rem', marginRight: 4 }}>
                            {ps.scoreRaw}
                          </span>
                          <span style={{ color: 'var(--halved)' }}>{player.score}</span>
                        </>
                      ) : (
                        player.score
                      )}
                    </div>
                    {!player.eliminated && (
                      <div className="score-bar-wrap">
                        <div
                          className={`score-bar ${isWarn ? 'danger' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
