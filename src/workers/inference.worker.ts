import * as ort from 'onnxruntime-web'

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/'

const MODEL_URL = '/models/playing-cards.onnx'
const INPUT_SIZE = 640
const CONF_THRESHOLD = 0.25
const IOU_THRESHOLD = 0.45

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

function cardPoints(name: string): number {
  const rank = name.slice(0, -1)
  if (rank === 'A') return 1
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10
  const n = parseInt(rank, 10)
  return isNaN(n) ? 0 : n
}

interface Box { x1: number; y1: number; x2: number; y2: number; score: number; classIdx: number }

function iou(a: Box, b: Box): number {
  const ix1 = Math.max(a.x1, b.x1), iy1 = Math.max(a.y1, b.y1)
  const ix2 = Math.min(a.x2, b.x2), iy2 = Math.min(a.y2, b.y2)
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1)
  const ua = (a.x2-a.x1)*(a.y2-a.y1) + (b.x2-b.x1)*(b.y2-b.y1) - inter
  return ua > 0 ? inter / ua : 0
}

function nms(boxes: Box[]): Box[] {
  boxes.sort((a, b) => b.score - a.score)
  const kept: Box[] = []
  const sup = new Uint8Array(boxes.length)
  for (let i = 0; i < boxes.length; i++) {
    if (sup[i]) continue
    kept.push(boxes[i])
    for (let j = i + 1; j < boxes.length; j++) {
      if (!sup[j] && iou(boxes[i], boxes[j]) > IOU_THRESHOLD) sup[j] = 1
    }
  }
  return kept
}

let session: ort.InferenceSession | null = null
async function getSession() {
  if (!session) session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] })
  return session
}

let debugLogged = false

async function infer(rgba: Uint8ClampedArray) {
  const n = INPUT_SIZE * INPUT_SIZE
  const f32 = new Float32Array(3 * n)
  for (let i = 0; i < n; i++) {
    f32[i]         = rgba[i * 4]     / 255
    f32[n + i]     = rgba[i * 4 + 1] / 255
    f32[2 * n + i] = rgba[i * 4 + 2] / 255
  }
  const tensor = new ort.Tensor('float32', f32, [1, 3, INPUT_SIZE, INPUT_SIZE])

  const sess = await getSession()
  const result = await sess.run({ [sess.inputNames[0]]: tensor })
  const output = result[sess.outputNames[0]]
  const data = output.data as Float32Array
  const dims = output.dims as number[]

  const [d1, d2] = dims.length === 2 ? [dims[0], dims[1]] : [dims[1], dims[2]]
  const transposed = d1 > d2
  const numBoxes = transposed ? d1 : d2
  const numAttr  = transposed ? d2 : d1
  const numClasses = numAttr - 4

  if (!debugLogged) {
    debugLogged = true
    let max = 0
    for (let i = 0; i < data.length; i++) if (data[i] > max) max = data[i]
    console.log('[CardDetect] dims:', dims, '| transposed:', transposed, '| classes:', numClasses, '| maxScore:', max.toFixed(3))
  }

  const boxes: Box[] = []
  for (let b = 0; b < numBoxes; b++) {
    let bestClass = 0, bestScore = 0
    for (let c = 0; c < numClasses; c++) {
      const s = transposed ? data[b * numAttr + 4 + c] : data[(4 + c) * numBoxes + b]
      if (s > bestScore) { bestScore = s; bestClass = c }
    }
    if (bestScore < CONF_THRESHOLD) continue
    const cx = transposed ? data[b * numAttr + 0] : data[0 * numBoxes + b]
    const cy = transposed ? data[b * numAttr + 1] : data[1 * numBoxes + b]
    const w  = transposed ? data[b * numAttr + 2] : data[2 * numBoxes + b]
    const h  = transposed ? data[b * numAttr + 3] : data[3 * numBoxes + b]
    boxes.push({ x1: cx-w/2, y1: cy-h/2, x2: cx+w/2, y2: cy+h/2, score: bestScore, classIdx: bestClass })
  }

  const best = new Map<number, Box>()
  for (const box of nms(boxes)) {
    const prev = best.get(box.classIdx)
    if (!prev || box.score > prev.score) best.set(box.classIdx, box)
  }

  return Array.from(best.values()).map((box) => {
    const name = CLASS_NAMES[box.classIdx] ?? `?${box.classIdx}`
    return { name, points: cardPoints(name), confidence: box.score, box: { x1: box.x1, y1: box.y1, x2: box.x2, y2: box.y2 } }
  })
}

self.onmessage = async (e: MessageEvent<{ pixels: ArrayBuffer; id: number }>) => {
  const { pixels, id } = e.data
  try {
    const cards = await infer(new Uint8ClampedArray(pixels))
    self.postMessage({ id, ok: true, cards })
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) })
  }
}
