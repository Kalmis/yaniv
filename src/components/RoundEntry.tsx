import { useEffect, useRef, useState } from 'react'
import type { Player } from '../types'
import type { RoundInput } from '../gameLogic'

interface Props {
  roundNumber: number
  activePlayers: Player[]
  maxPoints: number
  onSubmit: (input: RoundInput) => void
  onClose: () => void
}

type Step = 'yaniv-who' | 'asaf-who' | 'enter-points' | 'confirm'

export default function RoundEntry({
  roundNumber,
  activePlayers,
  maxPoints,
  onSubmit,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('yaniv-who')
  const [yanivCallerId, setYanivCallerId] = useState<string | null>(null)
  const [asaf, setAsaf] = useState(false)
  const [asaferId, setAsaferId] = useState<string | null>(null)
  const [playerIdx, setPlayerIdx] = useState(0)
  const [points, setPoints] = useState<Record<string, number>>({})
  const [inputVal, setInputVal] = useState('')
  const [celebrating, setCelebrating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentPlayer = activePlayers[playerIdx]

  // Auto-skip: Yaniv caller (either outcome) and the Asafer — points are already known
  const isAutoSkip =
    step === 'enter-points' &&
    currentPlayer != null &&
    (
      currentPlayer.id === yanivCallerId ||
      currentPlayer.id === asaferId
    )

  const autoSkipLabel =
    currentPlayer?.id === asaferId
      ? 'Asaf!'
      : asaf
      ? 'Asaf\'d!'
      : 'Yaniv!'

  const autoSkipPoints =
    currentPlayer?.id === asaferId
      ? '0 pts'
      : asaf
      ? '+25'
      : '0 pts'

  useEffect(() => {
    if (!isAutoSkip) return
    setCelebrating(true)
    const t = setTimeout(() => {
      setCelebrating(false)
      advanceToNext({ ...points, [currentPlayer.id]: 0 })
    }, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerIdx, step])

  useEffect(() => {
    if (step === 'enter-points' && !isAutoSkip) {
      inputRef.current?.focus()
    }
  }, [playerIdx, step, isAutoSkip])

  function advanceToNext(updatedPoints: Record<string, number>) {
    const nextIdx = playerIdx + 1
    if (nextIdx >= activePlayers.length) {
      setPoints(updatedPoints)
      setStep('confirm')
    } else {
      setPoints(updatedPoints)
      setPlayerIdx(nextIdx)
      setInputVal('')
    }
  }

  function handleNext() {
    const val = Number(inputVal)
    if (inputVal.trim() === '' || isNaN(val) || val < 0) return
    advanceToNext({ ...points, [currentPlayer.id]: val })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleNext()
  }

  function pickYanivCaller(id: string | null) {
    setYanivCallerId(id)
    if (id === null) {
      goToPoints()
    } else {
      setStep('asaf-who')
    }
  }

  function pickAsafer(id: string | null) {
    if (id === null) {
      setAsaf(false)
      setAsaferId(null)
    } else {
      setAsaf(true)
      setAsaferId(id)
    }
    goToPoints()
  }

  function goToPoints() {
    setStep('enter-points')
    setPlayerIdx(0)
    setPoints({})
    setInputVal('')
  }

  function goBack() {
    if (step === 'asaf-who') {
      setStep('yaniv-who')
    } else if (step === 'enter-points' && playerIdx === 0) {
      setStep(yanivCallerId ? 'asaf-who' : 'yaniv-who')
      setPoints({})
      setInputVal('')
    } else if (step === 'confirm') {
      const lastIdx = activePlayers.length - 1
      setPlayerIdx(lastIdx)
      setInputVal(String(points[activePlayers[lastIdx].id] ?? ''))
      setStep('enter-points')
    }
  }

  function handleConfirm() {
    const handTotals: Record<string, number> = {}
    for (const p of activePlayers) {
      handTotals[p.id] = points[p.id] ?? 0
    }
    onSubmit({ handTotals, yanivCallerId, asaf, asaferId })
  }

  function previewRoundPoints(player: Player): number {
    if (player.id === asaferId) return 0
    if (player.id === yanivCallerId && !asaf) return 0
    if (player.id === yanivCallerId && asaf) return 25
    return points[player.id] ?? 0
  }

  function previewNewScore(player: Player): number {
    const raw = player.score + previewRoundPoints(player)
    if (raw > 0 && raw % 50 === 0) return raw / 2
    return raw
  }

  const yanivCaller = activePlayers.find((p) => p.id === yanivCallerId)
  const asaferPlayer = activePlayers.find((p) => p.id === asaferId)

  // Progress calculation
  const extraSteps = yanivCallerId ? 2 : 1
  const totalSteps = extraSteps + activePlayers.length
  const stepNum =
    step === 'yaniv-who' ? 1
    : step === 'asaf-who' ? 2
    : step === 'enter-points' ? extraSteps + playerIdx + 1
    : totalSteps

  return (
    <div className="wizard-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wizard-modal">
        <div className="wizard-header">
          <div className="wizard-round-label">Round {roundNumber}</div>
          <div className="wizard-progress">{stepNum} / {totalSteps}</div>
          <button className="wizard-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="wizard-progress-bar">
          <div
            className="wizard-progress-fill"
            style={{ width: `${(stepNum / totalSteps) * 100}%` }}
          />
        </div>

        {/* ── Step 1: Who called Yaniv? ── */}
        {step === 'yaniv-who' && (
          <div className="wizard-body">
            <div className="wizard-question">Who called Yaniv?</div>
            <div className="wizard-player-grid">
              {activePlayers.map((p) => (
                <button key={p.id} className="wizard-player-btn" onClick={() => pickYanivCaller(p.id)}>
                  <span className="wpb-name">{p.name}</span>
                  <span className="wpb-score">{p.score} pts</span>
                </button>
              ))}
            </div>
            <button className="wizard-nobody-btn" onClick={() => pickYanivCaller(null)}>
              Nobody called Yaniv
            </button>
          </div>
        )}

        {/* ── Step 2: By whom did Asaf happen? ── */}
        {step === 'asaf-who' && (
          <div className="wizard-body">
            <div className="wizard-question">By whom did Asaf happen?</div>
            <p className="wizard-sub">
              Select the player who had equal or fewer points than <strong>{yanivCaller?.name}</strong>, or No one.
            </p>
            <div className="wizard-player-grid">
              {activePlayers
                .filter((p) => p.id !== yanivCallerId)
                .map((p) => (
                  <button key={p.id} className="wizard-player-btn" onClick={() => pickAsafer(p.id)}>
                    <span className="wpb-name">{p.name}</span>
                    <span className="wpb-score">{p.score} pts</span>
                  </button>
                ))}
            </div>
            <button className="wizard-nobody-btn" onClick={() => pickAsafer(null)}>
              No one — Yaniv! ({yanivCaller?.name} scores 0)
            </button>
            <button className="wizard-back" onClick={goBack}>← Back</button>
          </div>
        )}

        {/* ── Enter points one by one ── */}
        {step === 'enter-points' && currentPlayer && (
          <div className="wizard-body">
            {isAutoSkip && celebrating ? (
              <div className="wizard-yaniv-celebrate">
                <div className="wizard-yaniv-badge">{autoSkipLabel}</div>
                <div className="wizard-player-big">{currentPlayer.name}</div>
                <div className="wizard-zero-pts">{autoSkipPoints}</div>
              </div>
            ) : !isAutoSkip ? (
              <>
                <div className="wizard-player-big">{currentPlayer.name}</div>
                <div className="wizard-player-sub">
                  Currently at {currentPlayer.score} pts
                </div>
                <input
                  ref={inputRef}
                  className="wizard-pts-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Hand total"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className="wizard-next-btn"
                  onClick={handleNext}
                  disabled={inputVal.trim() === '' || isNaN(Number(inputVal)) || Number(inputVal) < 0}
                >
                  {playerIdx + 1 < activePlayers.length ? 'Next →' : 'Preview →'}
                </button>
                {playerIdx === 0 && (
                  <button className="wizard-back" onClick={goBack}>← Back</button>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* ── Confirm / Preview ── */}
        {step === 'confirm' && (
          <div className="wizard-body">
            <div className="wizard-question">Confirm round {roundNumber}</div>
            {asaf && asaferPlayer && (
              <p className="wizard-sub">
                <strong>{asaferPlayer.name}</strong> Asafed &mdash; <strong>{yanivCaller?.name}</strong> gets +25
              </p>
            )}
            <div className="wizard-preview-list">
              {activePlayers.map((player) => {
                const roundPts = previewRoundPoints(player)
                const newScore = previewNewScore(player)
                const halved = newScore !== player.score + roundPts
                const eliminated = newScore >= maxPoints
                const isYanivWin = player.id === yanivCallerId && !asaf
                const isAsafed = player.id === yanivCallerId && asaf
                const isAsafer = player.id === asaferId

                return (
                  <div key={player.id} className={`wizard-preview-row ${eliminated ? 'preview-out' : ''}`}>
                    <div className="wpr-left">
                      <span className="wpr-name">{player.name}</span>
                      <div className="wpr-tags">
                        {isYanivWin && <span className="tag yaniv">Yaniv</span>}
                        {isAsafer && <span className="tag yaniv">Asaf!</span>}
                        {isAsafed && <span className="tag asaf">Asaf'd</span>}
                        {halved && <span className="tag halved">Halved!</span>}
                        {eliminated && <span className="tag out">Out</span>}
                      </div>
                    </div>
                    <div className="wpr-right">
                      <span className="wpr-delta">
                        {roundPts === 0
                          ? <span style={{ color: 'var(--success)' }}>+0</span>
                          : <span style={{ color: isAsafed ? 'var(--danger)' : 'var(--text-muted)' }}>+{roundPts}</span>
                        }
                      </span>
                      <span className="wpr-score">
                        {player.score}
                        <span className="wpr-arrow"> → </span>
                        <span style={{ color: halved ? 'var(--halved)' : eliminated ? 'var(--danger)' : 'var(--text)' }}>
                          {newScore}
                        </span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="wizard-confirm-footer">
              <button className="wizard-back" onClick={goBack}>← Back</button>
              <button className="wizard-confirm-btn" onClick={handleConfirm}>
                Confirm round
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
