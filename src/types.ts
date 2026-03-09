export interface Player {
  id: string
  name: string
  score: number
  eliminated: boolean
}

export interface RoundPlayerScore {
  playerId: string
  /** Points added this round (after Asaf penalty applied) */
  points: number
  /** Whether this player called Yaniv */
  calledYaniv: boolean
  /** Whether this player called Yaniv and got Asaf'd (received the +25 penalty) */
  gotAsafed: boolean
  /** Whether this player was the one who performed the Asaf (scored 0 as a result) */
  didAsaf: boolean
  /** Score before this round */
  scoreBefore: number
  /** Score after this round (before halving) */
  scoreRaw: number
  /** Score after halving (may equal scoreRaw if no halving) */
  scoreAfter: number
  halved: boolean
  eliminated: boolean
}

export interface Round {
  id: number
  playerScores: RoundPlayerScore[]
}

export type GamePhase = 'setup' | 'game' | 'gameover'

export interface SavedGame {
  id: string
  completedAt: string // ISO timestamp
  state: GameState
}

export interface GameState {
  maxPoints: number
  players: Player[]
  rounds: Round[]
  phase: GamePhase
  winnerId: string | null
}
