import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../types'
import type { RoundInput } from '../gameLogic'
import Scoreboard from './Scoreboard'
import RoundEntry from './RoundEntry'
import RoundHistory from './RoundHistory'

interface Props {
  gameState: GameState
  onRoundSubmit: (input: RoundInput) => void
  onUpdateMaxPoints: (maxPoints: number) => void
  onNewGame: () => void
  soundOn: boolean
  onToggleSound: () => void
}

export default function GameScreen({ gameState, onRoundSubmit, onUpdateMaxPoints, onNewGame, soundOn, onToggleSound }: Props) {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingMax, setEditingMax] = useState(false)
  const [maxInput, setMaxInput] = useState('')
  const [eliminatedNames, setEliminatedNames] = useState<string[]>([])
  const maxInputRef = useRef<HTMLInputElement>(null)
  const prevRoundCount = useRef(gameState.rounds.length)

  const { players, rounds, maxPoints } = gameState
  const activePlayers = players.filter((p) => !p.eliminated)
  const latestRound = rounds.length > 0 ? rounds[rounds.length - 1] : null

  // Detect newly eliminated players after each round
  useEffect(() => {
    if (rounds.length === 0 || rounds.length === prevRoundCount.current) return
    prevRoundCount.current = rounds.length

    const latest = rounds[rounds.length - 1]
    const names = latest.playerScores
      .filter((ps) => ps.eliminated)
      .map((ps) => players.find((p) => p.id === ps.playerId)?.name ?? '')
      .filter(Boolean)

    if (names.length > 0) {
      setEliminatedNames(names)
      const t = setTimeout(() => setEliminatedNames([]), 2800)
      return () => clearTimeout(t)
    }
  }, [rounds.length, rounds, players])

  function handleRoundSubmit(input: RoundInput) {
    setWizardOpen(false)
    onRoundSubmit(input)
  }

  function startEditMax() {
    setMaxInput(String(maxPoints))
    setEditingMax(true)
    setTimeout(() => { maxInputRef.current?.select() }, 0)
  }

  function commitMax() {
    const val = Number(maxInput)
    if (!isNaN(val) && val >= 10) onUpdateMaxPoints(val)
    setEditingMax(false)
  }

  function handleMaxKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitMax()
    if (e.key === 'Escape') setEditingMax(false)
  }

  return (
    <div className="container">
      <div className="game-header">
        <h1>Yaniv</h1>
        <div style={{ textAlign: 'right' }}>
          <div className="game-meta">
            {'Max: '}
            {editingMax ? (
              <input
                ref={maxInputRef}
                className="max-pts-inline"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={handleMaxKeyDown}
                onBlur={commitMax}
              />
            ) : (
              <button className="max-pts-btn" onClick={startEditMax}>
                {maxPoints}
              </button>
            )}
            {' pts'}&nbsp;·&nbsp;Round {rounds.length + 1}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
            <button
              className="sound-toggle"
              onClick={onToggleSound}
              aria-label={soundOn ? 'Mute' : 'Unmute'}
              title={soundOn ? 'Mute' : 'Unmute'}
            >
              {soundOn ? '🔊' : '🔇'}
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
              onClick={onNewGame}
            >
              New game
            </button>
          </div>
        </div>
      </div>

      <Scoreboard gameState={gameState} latestRound={latestRound} />

      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
        <button
          className="btn-primary"
          style={{ padding: '14px 48px', fontSize: '1.05rem' }}
          onClick={() => setWizardOpen(true)}
        >
          Round done
        </button>
      </div>

      <RoundHistory gameState={gameState} />

      {wizardOpen && (
        <RoundEntry
          roundNumber={rounds.length + 1}
          activePlayers={activePlayers}
          maxPoints={maxPoints}
          onSubmit={handleRoundSubmit}
          onClose={() => setWizardOpen(false)}
        />
      )}

      {eliminatedNames.length > 0 && (
        <div className="elim-overlay" onClick={() => setEliminatedNames([])}>
          <div className="elim-card">
            <div className="elim-skull">💀</div>
            <div className="elim-names">
              {eliminatedNames.join(' & ')}
            </div>
            <div className="elim-label">is out!</div>
          </div>
        </div>
      )}
    </div>
  )
}
