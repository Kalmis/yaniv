import type { GameState } from '../types'
import type { RoundInput } from '../gameLogic'
import Scoreboard from './Scoreboard'
import RoundEntry from './RoundEntry'
import RoundHistory from './RoundHistory'

interface Props {
  gameState: GameState
  onRoundSubmit: (input: RoundInput) => void
  onNewGame: () => void
}

export default function GameScreen({ gameState, onRoundSubmit, onNewGame }: Props) {
  const { players, rounds, maxPoints } = gameState
  const activePlayers = players.filter((p) => !p.eliminated)
  const latestRound = rounds.length > 0 ? rounds[rounds.length - 1] : null

  return (
    <div className="container">
      <div className="game-header">
        <h1>Yaniv</h1>
        <div style={{ textAlign: 'right' }}>
          <div className="game-meta">Max: {maxPoints} pts &nbsp;·&nbsp; Round {rounds.length + 1}</div>
          <button
            className="btn-secondary"
            style={{ marginTop: 6, fontSize: '0.75rem', padding: '4px 10px' }}
            onClick={onNewGame}
          >
            New game
          </button>
        </div>
      </div>

      <Scoreboard gameState={gameState} latestRound={latestRound} />

      <RoundEntry
        roundNumber={rounds.length + 1}
        activePlayers={activePlayers}
        onSubmit={onRoundSubmit}
      />

      <RoundHistory gameState={gameState} />
    </div>
  )
}
