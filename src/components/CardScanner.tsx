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
  const sw = Math.round(vw * scale)
  const sh = Math.round(vh * scale)
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE)
  ctx.drawImage(video, Math.floor((INPUT_SIZE - sw) / 2), Math.floor((INPUT_SIZE - sh) / 2), sw, sh)

  return ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data.buffer
}

export default function CardScanner({ onUseTotal }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [cards, setCards] = useState<DetectedCard[]>([])
  const [error, setError] = useState('')
  const [showOverlay, setShowOverlay] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const activeRef = useRef(false)
  const readyRef = useRef(false)
  const busyRef = useRef(false)
  const nextId = useRef(0)
  const callbacks = useRef(new Map<number, (cards: DetectedCard[]) => void>())

  // Create worker once
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/inference.worker.ts', import.meta.url),
      { type: 'module' },
    )
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; cards: DetectedCard[]; error?: string }>) => {
      const { id, ok, cards } = e.data
      const cb = callbacks.current.get(id)
      if (cb) {
        callbacks.current.delete(id)
        if (ok) cb(cards)
      }
    }
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  function detectInWorker(video: HTMLVideoElement): Promise<DetectedCard[]> {
    return new Promise((resolve) => {
      const pixels = captureFrame(video)
      if (!pixels || !workerRef.current) { resolve([]); return }
      const id = nextId.current++
      callbacks.current.set(id, resolve)
      workerRef.current.postMessage({ pixels, id }, [pixels])
    })
  }

  useEffect(() => {
    if (!isOpen) return

    activeRef.current = true
    readyRef.current = false
    busyRef.current = false
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
      if (!readyRef.current) {
        readyRef.current = true
        setShowOverlay(false)
      }
      if (!busyRef.current) {
        busyRef.current = true
        const detected = await detectInWorker(video)
        busyRef.current = false
        if (activeRef.current) {
          setCards(detected)
          if (detected.length > 0) onUseTotal(totalPoints(detected))
        }
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
            <button className="scanner-close-btn" onClick={close}>✕ Close camera</button>
          </div>
        </>
      )}
    </div>
  )
}
