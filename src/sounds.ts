type AudioContextCtor = typeof AudioContext

function getAudioContext(): AudioContext | null {
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  if (!Ctor) return null
  return new Ctor()
}

function playNote(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startTime: number,
  duration: number,
  gain = 0.35,
) {
  const osc = ctx.createOscillator()
  const env = ctx.createGain()

  osc.type = 'sawtooth'
  osc.frequency.value = freq
  osc.connect(env)
  env.connect(dest)

  // ADSR envelope — fast attack, short decay, mild release
  env.gain.setValueAtTime(0, startTime)
  env.gain.linearRampToValueAtTime(gain, startTime + 0.018)
  env.gain.linearRampToValueAtTime(gain * 0.75, startTime + 0.06)
  env.gain.setValueAtTime(gain * 0.75, startTime + duration - 0.04)
  env.gain.linearRampToValueAtTime(0, startTime + duration)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

/** Plays a short triumphant trumpet fanfare. Returns a promise that resolves when done. */
export function playFanfare(): Promise<void> {
  return new Promise((resolve) => {
    const ctx = getAudioContext()
    if (!ctx) { resolve(); return }

    const compressor = ctx.createDynamicsCompressor()
    compressor.connect(ctx.destination)

    // G4 → C5 → E5 → G5 ascending arpeggio then held G5
    const score: [freq: number, start: number, dur: number][] = [
      [392.00, 0.00, 0.13],  // G4
      [523.25, 0.16, 0.13],  // C5
      [659.25, 0.32, 0.16],  // E5
      [392.00, 0.50, 0.10],  // G4 (grace note down)
      [783.99, 0.62, 0.60],  // G5 (triumphant long)
    ]

    const totalDuration = 1.3

    for (const [freq, start, dur] of score) {
      playNote(ctx, compressor, freq, ctx.currentTime + start, dur)
    }

    setTimeout(() => {
      ctx.close().catch(() => {})
      resolve()
    }, totalDuration * 1000)
  })
}
