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
  /** Which player called Yaniv (null if not applicable / no one called) */
  yanivCallerId: string | null
  /** Whether Asaf was triggered (only relevant when yanivCallerId is set) */
  asaf: boolean
}

export function processRound(
  state: GameState,
  input: RoundInput,
): GameState {
  const { yanivCallerId, asaf, handTotals } = input
  const newRoundId = state.rounds.length + 1

  const playerScores: RoundPlayerScore[] = state.players
    .filter((p) => !p.eliminated)
    .map((player) => {
      const handTotal = handTotals[player.id] ?? 0
      const calledYaniv = player.id === yanivCallerId
      const playerAsaf = calledYaniv && asaf

      // Points added this round
      let roundPoints: number
      if (calledYaniv && !asaf) {
        roundPoints = 0
      } else if (calledYaniv && asaf) {
        roundPoints = handTotal + 30
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
        asaf: playerAsaf,
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
