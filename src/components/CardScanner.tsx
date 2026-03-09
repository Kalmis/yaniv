import { useCallback, useEffect, useRef, useState } from 'react'
import { detectCards, totalPoints } from '../cardDetection'
import type { DetectedCard } from '../cardDetection'

interface Props {
  onUseTotal: (total: number) => void
}

export default function CardScanner({ onUseTotal }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [cards, setCards] = useState<DetectedCard[]>([])
  const [error, setError] = useState('')
  const [showOverlay, setShowOverlay] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const activeRef = useRef(false)
  const busyRef = useRef(false)
  const readyRef = useRef(false)

  const runLoop = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) {
      if (activeRef.current) setTimeout(runLoop, 200)
      return
    }
    if (!readyRef.current) {
      readyRef.current = true
      setShowOverlay(false)
    }

    if (!busyRef.current) {
      busyRef.current = true
      try {
        const detected = await detectCards(video)
        if (activeRef.current) setCards(detected)
      } catch {
        // ignore individual frame errors
      } finally {
        busyRef.current = false
      }
    }

    if (activeRef.current) setTimeout(runLoop, 800)
  }, []) // no state deps — uses only refs

  useEffect(() => {
    if (!isOpen) return

    activeRef.current = true
    readyRef.current = false
    setShowOverlay(true)
    setCards([])
    setError('')

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        runLoop()
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Camera access denied')
      })

    return () => {
      activeRef.current = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [isOpen, runLoop])

  function close() {
    setIsOpen(false)
  }

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
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="scanner-video"
            />
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
                <button
                  className="scanner-use-btn"
                  onClick={() => { onUseTotal(total); close() }}
                >
                  Use {total}
                </button>
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
