import type { GameState, Round } from './types'

export function announceRound(round: Round, state: GameState) {
  if (!('speechSynthesis' in window)) return

  const parts: string[] = []

  for (const ps of round.playerScores) {
    const player = state.players.find((p) => p.id === ps.playerId)
    if (!player) continue

    let line = player.name + ': '

    if (ps.calledYaniv && !ps.gotAsafed) {
      line += `Yaniv, zero points, total ${ps.scoreAfter}`
    } else if (ps.didAsaf) {
      line += `Asaf, zero points, total ${ps.scoreAfter}`
    } else if (ps.gotAsafed) {
      line += `Asafed, plus 25, total ${ps.scoreAfter}`
    } else {
      line += `${ps.points} point${ps.points !== 1 ? 's' : ''}, total ${ps.scoreAfter}`
    }

    if (ps.halved) line += ', halved'
    if (ps.eliminated) line += ', eliminated'

    parts.push(line)
  }

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(parts.join('. '))
  utterance.lang = 'en-US'
  utterance.rate = 1.05
  window.speechSynthesis.speak(utterance)
}
