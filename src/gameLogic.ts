import type { GameState, Player, Round, RoundPlayerScore } from './types'

/** If score hits any positive multiple of 50, halve it. */
function applyHalving(score: number): { score: number; halved: boolean } {
  if (score > 0 && score % 50 === 0) {
    return { score: score / 2, halved: true }
  }
  return { score, halved: false }
}

export interface RoundInput {
  /** Map of playerId -> hand total for this round */
  handTotals: Record<string, number>
  /** Which player called Yaniv (null if no one called) */
  yanivCallerId: string | null
  /** Whether Asaf was triggered */
  asaf: boolean
  /** The player who performed the Asaf — they score 0 (null if no Asaf) */
  asaferId: string | null
}

export function processRound(
  state: GameState,
  input: RoundInput,
): GameState {
  const { yanivCallerId, asaf, asaferId, handTotals } = input
  const newRoundId = state.rounds.length + 1

  const playerScores: RoundPlayerScore[] = state.players
    .filter((p) => !p.eliminated)
    .map((player) => {
      const handTotal = handTotals[player.id] ?? 0
      const calledYaniv = player.id === yanivCallerId
      const gotAsafed = calledYaniv && asaf
      const didAsaf = player.id === asaferId

      // Points added this round
      let roundPoints: number
      if (didAsaf) {
        roundPoints = 0                      // Asafer wins the round
      } else if (calledYaniv && !asaf) {
        roundPoints = 0                      // Yaniv success
      } else if (calledYaniv && asaf) {
        roundPoints = 25                     // Yaniv caller penalised (flat +25)
      } else {
        roundPoints = handTotal
      }

      const scoreBefore = player.score
      const scoreRaw = scoreBefore + roundPoints
      const { score: scoreAfter, halved } = applyHalving(scoreRaw)
      const eliminated = scoreAfter >= state.maxPoints

      return {
        playerId: player.id,
        points: roundPoints,
        calledYaniv,
        gotAsafed,
        didAsaf,
        scoreBefore,
        scoreRaw,
        scoreAfter,
        halved,
        eliminated,
      }
    })

  // Update players
  const updatedPlayers: Player[] = state.players.map((player) => {
    const ps = playerScores.find((s) => s.playerId === player.id)
    if (!ps || player.eliminated) return player
    return {
      ...player,
      score: ps.scoreAfter,
      eliminated: ps.eliminated,
    }
  })

  const round: Round = { id: newRoundId, playerScores }
  const newRounds = [...state.rounds, round]

  // Check win condition: last player standing
  const activePlayers = updatedPlayers.filter((p) => !p.eliminated)
  let winnerId: string | null = null
  let phase = state.phase

  if (activePlayers.length === 1) {
    winnerId = activePlayers[0].id
    phase = 'gameover'
  } else if (activePlayers.length === 0) {
    // Edge case: everyone eliminated in same round — lowest score wins
    const lowestScore = Math.min(...updatedPlayers.map((p) => p.score))
    const candidates = updatedPlayers.filter((p) => p.score === lowestScore)
    winnerId = candidates[0].id
    phase = 'gameover'
  }

  return {
    ...state,
    players: updatedPlayers,
    rounds: newRounds,
    phase,
    winnerId,
  }
}

export function createInitialState(
  maxPoints: number,
  playerNames: string[],
): GameState {
  const players: Player[] = playerNames.map((name, i) => ({
    id: `player-${i}`,
    name,
    score: 0,
    eliminated: false,
  }))
  return {
    maxPoints,
    players,
    rounds: [],
    phase: 'game',
    winnerId: null,
  }
}
