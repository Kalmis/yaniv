import type { GameState } from '../types'
import Scoreboard from './Scoreboard'

interface Props {
  gameState: GameState
  onNewGame: () => void
  onViewHistory: () => void
}

export default function GameOverScreen({ gameState, onNewGame, onViewHistory }: Props) {
  const winner = gameState.players.find((p) => p.id === gameState.winnerId)

  return (
    <div className="container">
      <div className="card gameover-center">
        <div className="trophy">🏆</div>
        <h1>{winner?.name ?? 'Unknown'} wins!</h1>
        <p className="subtitle">
          Final score: {winner?.score} pts &nbsp;·&nbsp; {gameState.rounds.length} rounds played
        </p>
      </div>

      <div className="final-scores">
        <Scoreboard gameState={gameState} latestRound={null} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
        <button className="btn-secondary" onClick={onViewHistory} style={{ padding: '12px 24px' }}>
          Past games
        </button>
        <button
          className="btn-primary"
          onClick={onNewGame}
          style={{ padding: '12px 40px', fontSize: '1rem' }}
        >
          Play again
        </button>
      </div>
    </div>
  )
}
