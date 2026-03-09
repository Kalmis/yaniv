import { useEffect, useRef, useState } from 'react'
import { totalPoints } from '../cardDetection'
import type { DetectedCard } from '../cardDetection'

interface Props {
  onUseTotal: (total: number) => void
}

const INPUT_SIZE = 640

function captureFrame(video: HTMLVideoElement): ArrayBuffer | null {
  const { videoWidth: vw, videoHeight: vh } = video
  if (!vw || !vh) return null
  const canvas = document.createElement('canvas')
  canvas.width = INPUT_SIZE
  canvas.height = INPUT_SIZE
  const ctx = canvas.getContext('2d')!
  const scale = Math.min(INPUT_SIZE / vw, INPUT_SIZE / vh)
  const sw = Math.round(vw * scale), sh = Math.round(vh * scale)
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE)
  ctx.drawImage(video, Math.floor((INPUT_SIZE - sw) / 2), Math.floor((INPUT_SIZE - sh) / 2), sw, sh)
  return ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data.buffer
}

function drawBoxes(
  ctx: CanvasRenderingContext2D,
  cards: DetectedCard[],
  combinedScale: number,
  offX: number,
  offY: number,
) {
  ctx.lineWidth = 2
  ctx.font = 'bold 13px sans-serif'
  for (const card of cards) {
    if (!card.box) continue
    const x1 = offX + card.box.x1 * combinedScale
    const y1 = offY + card.box.y1 * combinedScale
    const x2 = offX + card.box.x2 * combinedScale
    const y2 = offY + card.box.y2 * combinedScale
    ctx.strokeStyle = '#00ff88'
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
    const label = `${card.name} ${Math.round(card.confidence * 100)}%`
    const tw = ctx.measureText(label).width
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(x1, y1 - 18, tw + 8, 18)
    ctx.fillStyle = '#00ff88'
    ctx.fillText(label, x1 + 4, y1 - 4)
  }
}

export default function CardScanner({ onUseTotal }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [cards, setCards] = useState<DetectedCard[]>([])
  const [error, setError] = useState('')
  const [showOverlay, setShowOverlay] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const latestCardsRef = useRef<DetectedCard[]>([])
  const activeRef = useRef(false)
  const readyRef = useRef(false)
  const busyRef = useRef(false)
  const rafRef = useRef(0)
  const nextId = useRef(0)
  const callbacks = useRef(new Map<number, (cards: DetectedCard[]) => void>())

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/inference.worker.ts', import.meta.url),
      { type: 'module' },
    )
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; cards: DetectedCard[] }>) => {
      const { id, ok, cards } = e.data
      const cb = callbacks.current.get(id)
      if (cb) { callbacks.current.delete(id); if (ok) cb(cards) }
    }
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  // rAF loop — redraws box overlay each frame to match live video
  useEffect(() => {
    if (!isOpen) return
    function draw() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState >= 2) {
        const cw = video.clientWidth
        const ch = video.clientHeight
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw
          canvas.height = ch
        }
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, cw, ch)

        const { videoWidth: vw, videoHeight: vh } = video
        // Model letterbox params
        const modelScale = Math.min(INPUT_SIZE / vw, INPUT_SIZE / vh)
        const padX = Math.floor((INPUT_SIZE - vw * modelScale) / 2)
        const padY = Math.floor((INPUT_SIZE - vh * modelScale) / 2)
        // object-fit: contain display params
        const dispScale = Math.min(cw / vw, ch / vh)
        const dx = (cw - vw * dispScale) / 2
        const dy = (ch - vh * dispScale) / 2
        // Combined transform: model px → display px
        const cs = dispScale / modelScale
        drawBoxes(ctx, latestCardsRef.current, cs, dx - padX * cs, dy - padY * cs)
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isOpen])

  // Inference loop
  useEffect(() => {
    if (!isOpen) return

    activeRef.current = true
    readyRef.current = false
    busyRef.current = false
    latestCardsRef.current = []
    setShowOverlay(true)
    setCards([])
    setError('')

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        loop()
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Camera access denied'))

    async function loop() {
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        if (activeRef.current) setTimeout(loop, 200)
        return
      }
      if (!readyRef.current) { readyRef.current = true; setShowOverlay(false) }

      if (!busyRef.current) {
        busyRef.current = true
        const pixels = captureFrame(video)
        if (pixels && workerRef.current) {
          const id = nextId.current++
          const detected = await new Promise<DetectedCard[]>((resolve) => {
            callbacks.current.set(id, resolve)
            workerRef.current!.postMessage({ pixels, id }, [pixels])
          })
          if (activeRef.current) {
            latestCardsRef.current = detected
            setCards(detected)
            if (detected.length > 0) onUseTotal(totalPoints(detected))
          }
        }
        busyRef.current = false
      }
      if (activeRef.current) setTimeout(loop, 800)
    }

    return () => {
      activeRef.current = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  function close() { setIsOpen(false) }
  const total = totalPoints(cards)

  if (!isOpen) {
    return (
      <div className="card-scanner">
        <button className="scanner-btn" onClick={() => setIsOpen(true)}>
          📷 Scan cards
        </button>
      </div>
    )
  }

  return (
    <div className="card-scanner card-scanner--live">
      {error ? (
        <div className="scanner-live-error">
          <p>{error}</p>
          <button className="scanner-rescan-btn" onClick={close}>Close</button>
        </div>
      ) : (
        <>
          <div className="scanner-video-wrap">
            <video ref={videoRef} autoPlay playsInline muted className="scanner-video" />
            <canvas ref={canvasRef} className="scanner-overlay" />
            {showOverlay && <div className="scanner-loading-overlay">Starting camera…</div>}
          </div>

          <div className="scanner-live-panel">
            {cards.length > 0 ? (
              <>
                <div className="scanner-cards">
                  {cards.map((c, i) => (
                    <span key={i} className="scanner-card-chip">
                      {c.name}<span className="chip-pts">{c.points}pt</span>
                    </span>
                  ))}
                </div>
                <div className="scanner-total">{total} pts</div>
              </>
            ) : (
              <div className="scanner-no-cards">
                {!showOverlay ? 'Point camera at cards…' : ''}
              </div>
            )}
            <button className="scanner-close-btn" onClick={close}>✕ Close</button>
          </div>
        </>
      )}
    </div>
  )
}
