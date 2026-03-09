import * as ort from 'onnxruntime-web'

// Load WASM binaries from CDN to avoid local bundler/serving issues
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/'

const MODEL_URL = '/models/playing-cards.onnx'
const INPUT_SIZE = 640
const CONF_THRESHOLD = 0.25
const IOU_THRESHOLD = 0.45

// Standard 52-card class names as used by Roboflow/Augmented Startups dataset (alphabetical)
const CLASS_NAMES = [
  '10C', '10D', '10H', '10S',
  '2C',  '2D',  '2H',  '2S',
  '3C',  '3D',  '3H',  '3S',
  '4C',  '4D',  '4H',  '4S',
  '5C',  '5D',  '5H',  '5S',
  '6C',  '6D',  '6H',  '6S',
  '7C',  '7D',  '7H',  '7S',
  '8C',  '8D',  '8H',  '8S',
  '9C',  '9D',  '9H',  '9S',
  'AC',  'AD',  'AH',  'AS',
  'JC',  'JD',  'JH',  'JS',
  'KC',  'KD',  'KH',  'KS',
  'QC',  'QD',  'QH',  'QS',
]

export function cardPoints(className: string): number {
  const rank = className.slice(0, -1) // strip suit letter
  if (rank === 'A') return 1
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10
  if (rank === 'Joker') return 0
  const n = parseInt(rank, 10)
  return isNaN(n) ? 0 : n
}

let session: ort.InferenceSession | null = null

async function getSession(): Promise<ort.InferenceSession> {
  if (!session) {
    session = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
    })
  }
  return session
}

type ImageSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement

function sourceSize(src: ImageSource): { w: number; h: number } {
  if (src instanceof HTMLVideoElement) return { w: src.videoWidth, h: src.videoHeight }
  return { w: src.width, h: src.height }
}

function preprocessSource(src: ImageSource): ort.Tensor | null {
  const { w, h } = sourceSize(src)
  if (w === 0 || h === 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = INPUT_SIZE
  canvas.height = INPUT_SIZE
  const ctx = canvas.getContext('2d')!

  // Letterbox: preserve aspect ratio, pad with grey
  const scale = Math.min(INPUT_SIZE / w, INPUT_SIZE / h)
  const sw = Math.round(w * scale)
  const sh = Math.round(h * scale)
  const px = Math.floor((INPUT_SIZE - sw) / 2)
  const py = Math.floor((INPUT_SIZE - sh) / 2)

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE)
  ctx.drawImage(src as CanvasImageSource, px, py, sw, sh)

  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE)
  const n = INPUT_SIZE * INPUT_SIZE
  const f32 = new Float32Array(3 * n)
  for (let i = 0; i < n; i++) {
    f32[i]         = data[i * 4]     / 255 // R
    f32[n + i]     = data[i * 4 + 1] / 255 // G
    f32[2 * n + i] = data[i * 4 + 2] / 255 // B
  }
  return new ort.Tensor('float32', f32, [1, 3, INPUT_SIZE, INPUT_SIZE])
}

interface Box {
  x1: number; y1: number; x2: number; y2: number
  score: number
  classIdx: number
}

function iou(a: Box, b: Box): number {
  const ix1 = Math.max(a.x1, b.x1)
  const iy1 = Math.max(a.y1, b.y1)
  const ix2 = Math.min(a.x2, b.x2)
  const iy2 = Math.min(a.y2, b.y2)
  const iw = Math.max(0, ix2 - ix1)
  const ih = Math.max(0, iy2 - iy1)
  const inter = iw * ih
  const ua = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter
  return ua > 0 ? inter / ua : 0
}

function nms(boxes: Box[]): Box[] {
  boxes.sort((a, b) => b.score - a.score)
  const kept: Box[] = []
  const suppressed = new Uint8Array(boxes.length)
  for (let i = 0; i < boxes.length; i++) {
    if (suppressed[i]) continue
    kept.push(boxes[i])
    for (let j = i + 1; j < boxes.length; j++) {
      if (!suppressed[j] && iou(boxes[i], boxes[j]) > IOU_THRESHOLD) {
        suppressed[j] = 1
      }
    }
  }
  return kept
}

export interface DetectedCard {
  name: string
  points: number
  confidence: number
  box?: { x1: number; y1: number; x2: number; y2: number }
}

let debugLogged = false

async function runInference(src: ImageSource): Promise<DetectedCard[]> {
  const sess = await getSession()
  const tensor = preprocessSource(src)
  if (!tensor) return []

  const result = await sess.run({ [sess.inputNames[0]]: tensor })
  const output = result[sess.outputNames[0]]

  const data = output.data as Float32Array
  const dims = output.dims as number[]

  // Normalise to 3-D: some exports squeeze the batch dim → [nc+4, 8400]
  let d0: number, d1: number, d2: number
  if (dims.length === 2) {
    d0 = 1; d1 = dims[0]; d2 = dims[1]
  } else {
    d0 = dims[0]; d1 = dims[1]; d2 = dims[2]
  }
  void d0

  // Detect layout: [1, nc+4, 8400] vs transposed [1, 8400, nc+4]
  // nc+4 will be small (≤56 for 52 classes), numBoxes will be large (8400)
  const transposed = d1 > d2           // [1, 8400, nc+4]
  const numBoxes   = transposed ? d1 : d2
  const numAttr    = transposed ? d2 : d1
  const numClasses = numAttr - 4

  if (!debugLogged) {
    debugLogged = true
    let maxScore = 0
    for (let i = 0; i < data.length; i++) if (data[i] > maxScore) maxScore = data[i]
    console.log('[CardDetect] output dims:', dims, '→ transposed:', transposed,
      '| boxes:', numBoxes, '| classes:', numClasses, '| maxScore:', maxScore.toFixed(3))
  }

  const boxes: Box[] = []
  for (let b = 0; b < numBoxes; b++) {
    let bestClass = 0
    let bestScore = 0
    for (let c = 0; c < numClasses; c++) {
      const score = transposed
        ? data[b * numAttr + 4 + c]
        : data[(4 + c) * numBoxes + b]
      if (score > bestScore) { bestScore = score; bestClass = c }
    }
    if (bestScore < CONF_THRESHOLD) continue

    const cx = transposed ? data[b * numAttr + 0] : data[0 * numBoxes + b]
    const cy = transposed ? data[b * numAttr + 1] : data[1 * numBoxes + b]
    const w  = transposed ? data[b * numAttr + 2] : data[2 * numBoxes + b]
    const h  = transposed ? data[b * numAttr + 3] : data[3 * numBoxes + b]
    boxes.push({ x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2, score: bestScore, classIdx: bestClass })
  }

  // Deduplicate by class: each card is unique in a deck, so keep only the
  // highest-confidence detection per class (eliminates corner-pip duplicates)
  const best = new Map<number, Box>()
  for (const box of nms(boxes)) {
    const prev = best.get(box.classIdx)
    if (!prev || box.score > prev.score) best.set(box.classIdx, box)
  }

  return Array.from(best.values()).map((box) => {
    const name = CLASS_NAMES[box.classIdx] ?? `?${box.classIdx}`
    return { name, points: cardPoints(name), confidence: box.score }
  })
}

export async function detectCards(src: ImageSource): Promise<DetectedCard[]> {
  return runInference(src)
}

export function totalPoints(cards: DetectedCard[]): number {
  return cards.reduce((sum, c) => sum + c.points, 0)
}
