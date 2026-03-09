import { useState } from 'react'
import type { GameState } from './types'
import { createInitialState, processRound } from './gameLogic'
import type { RoundInput } from './gameLogic'
import SetupScreen from './components/SetupScreen'
import GameScreen from './components/GameScreen'
import GameOverScreen from './components/GameOverScreen'

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null)

  function handleStartGame(maxPoints: number, playerNames: string[]) {
    setGameState(createInitialState(maxPoints, playerNames))
  }

  function handleRoundSubmit(input: RoundInput) {
    if (!gameState) return
    setGameState(processRound(gameState, input))
  }

  function handleNewGame() {
    setGameState(null)
  }

  if (!gameState) {
    return <SetupScreen onStart={handleStartGame} />
  }
  if (gameState.phase === 'gameover') {
    return (
      <GameOverScreen
        gameState={gameState}
        onNewGame={handleNewGame}
      />
    )
  }
  return (
    <GameScreen
      gameState={gameState}
      onRoundSubmit={handleRoundSubmit}
      onNewGame={handleNewGame}
    />
  )
}
