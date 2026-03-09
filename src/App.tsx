import { useState } from 'react'
import type { GameState } from './types'
import { createInitialState, processRound } from './gameLogic'
import type { RoundInput } from './gameLogic'
import { loadCurrentGame, saveCurrentGame, appendToHistory } from './storage'
import SetupScreen from './components/SetupScreen'
import GameScreen from './components/GameScreen'
import GameOverScreen from './components/GameOverScreen'
import HistoryScreen from './components/HistoryScreen'

type View = 'play' | 'history'

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(loadCurrentGame)
  const [view, setView] = useState<View>('play')

  function update(next: GameState | null) {
    saveCurrentGame(next)
    setGameState(next)
  }

  function handleStartGame(maxPoints: number, playerNames: string[]) {
    update(createInitialState(maxPoints, playerNames))
    setView('play')
  }

  function handleRoundSubmit(input: RoundInput) {
    if (!gameState) return
    const next = processRound(gameState, input)
    if (next.phase === 'gameover') {
      appendToHistory(next)
    }
    update(next)
  }

  function handleNewGame() {
    update(null)
    setView('play')
  }

  if (view === 'history') {
    return <HistoryScreen onBack={() => setView('play')} />
  }
  if (!gameState) {
    return <SetupScreen onStart={handleStartGame} onViewHistory={() => setView('history')} />
  }
  if (gameState.phase === 'gameover') {
    return (
      <GameOverScreen
        gameState={gameState}
        onNewGame={handleNewGame}
        onViewHistory={() => setView('history')}
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
