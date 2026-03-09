import { useState } from 'react'
import type { GameState } from './types'
import { createInitialState, processRound } from './gameLogic'
import type { RoundInput } from './gameLogic'
import { loadCurrentGame, saveCurrentGame, appendToHistory } from './storage'
import { announceRound, announceWinner } from './speech'
import SetupScreen from './components/SetupScreen'
import GameScreen from './components/GameScreen'
import GameOverScreen from './components/GameOverScreen'
import HistoryScreen from './components/HistoryScreen'

type View = 'play' | 'history'

function loadSound(): boolean {
  return localStorage.getItem('yaniv-sound') !== 'off'
}

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(loadCurrentGame)
  const [view, setView] = useState<View>('play')
  const [soundOn, setSoundOn] = useState(loadSound)

  function toggleSound() {
    setSoundOn((prev) => {
      const next = !prev
      localStorage.setItem('yaniv-sound', next ? 'on' : 'off')
      if (!next) window.speechSynthesis?.cancel()
      return next
    })
  }

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
      if (soundOn) {
        const winner = next.players.find((p) => p.id === next.winnerId)
        announceRound(next.rounds[next.rounds.length - 1], next, () => {
          if (winner) announceWinner(winner.name, winner.score)
        })
      }
    } else {
      if (soundOn) announceRound(next.rounds[next.rounds.length - 1], next)
    }
    update(next)
  }

  function handleUpdateMaxPoints(maxPoints: number) {
    if (!gameState) return
    update({ ...gameState, maxPoints })
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
      onUpdateMaxPoints={handleUpdateMaxPoints}
      onNewGame={handleNewGame}
      soundOn={soundOn}
      onToggleSound={toggleSound}
    />
  )
}
