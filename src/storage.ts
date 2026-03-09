import type { GameState, SavedGame } from './types'

const CURRENT_KEY = 'yaniv-current-game'
const HISTORY_KEY = 'yaniv-game-history'

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — silently skip
  }
}

// ── Current game ──────────────────────────────────

export function loadCurrentGame(): GameState | null {
  return safeGet<GameState>(CURRENT_KEY)
}

export function saveCurrentGame(state: GameState | null) {
  if (state === null) {
    localStorage.removeItem(CURRENT_KEY)
  } else {
    safeSet(CURRENT_KEY, state)
  }
}

// ── Game history ──────────────────────────────────

export function loadHistory(): SavedGame[] {
  return safeGet<SavedGame[]>(HISTORY_KEY) ?? []
}

export function appendToHistory(state: GameState) {
  const history = loadHistory()
  const entry: SavedGame = {
    id: `game-${Date.now()}`,
    completedAt: new Date().toISOString(),
    state,
  }
  safeSet(HISTORY_KEY, [entry, ...history])
}
