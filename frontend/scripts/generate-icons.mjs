/**
 * generate-icons.mjs
 * Pure-Node (no external deps) PNG generator for the CREDIFY.ai PWA icons.
 * Writes 192×192 and 512×512 icon-<size>.png to public/icons/.
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { createDeflateRaw } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { promisify } from 'node:util'

const deflate = promisify(createDeflateRaw)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

// ---------------------------------------------------------------------------
// Minimal PNG encoder
// ---------------------------------------------------------------------------
function crc32(buf) {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  let c = 0xffffffff
  for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  const crcData = Buffer.concat([typeBuf, data])
  crcBuf.writeUInt32BE(crc32(crcData))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

async function encodePNG(width, height, pixels /* Uint8Array RGBA */) {
  // Build raw scanlines: each row starts with a filter byte (0 = None).
  const rowBytes = width * 4
  const raw = Buffer.alloc((rowBytes + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (rowBytes + 1)] = 0 // filter byte
    pixels.copy(raw, y * (rowBytes + 1) + 1, y * rowBytes, (y + 1) * rowBytes)
  }
  const compressed = await deflatePromise(raw)
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // colour type: RGB  — we'll use RGBA so set to 6
  ihdr[9] = 6  // RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// promisify deflate correctly
function deflatePromise(input) {
  return new Promise((resolve, reject) => {
    const zlib = createDeflateRaw({ level: 6 })
    const chunks = []
    zlib.on('data', (c) => chunks.push(c))
    zlib.on('end', () => resolve(Buffer.concat(chunks)))
    zlib.on('error', reject)
    zlib.end(input)
  })
}

// ---------------------------------------------------------------------------
// Drawing helpers (integer-only, RGBA Uint8Array)
// ---------------------------------------------------------------------------
function setPixel(buf, w, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= w || y >= w) return
  const i = (y * w + x) * 4
  // Alpha-blend over existing pixel
  const sa = a / 255
  const da = buf[i + 3] / 255
  const oa = sa + da * (1 - sa)
  if (oa < 0.001) return
  buf[i]     = Math.round((r * sa + buf[i]     * da * (1 - sa)) / oa)
  buf[i + 1] = Math.round((g * sa + buf[i + 1] * da * (1 - sa)) / oa)
  buf[i + 2] = Math.round((b * sa + buf[i + 2] * da * (1 - sa)) / oa)
  buf[i + 3] = Math.round(oa * 255)
}

function fillRect(buf, w, x0, y0, x1, y1, r, g, b, a = 255) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      setPixel(buf, w, x, y, r, g, b, a)
}

// Rounded-rect mask: set pixels inside the rounded rect
function roundedRectMask(buf, w, rx) {
  const c = [0x0b, 0x12, 0x20] // #0B1220
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      let inside = true
      // Check corners
      if (x < rx && y < rx) inside = dist(x, y, rx, rx) <= rx
      else if (x > w - rx - 1 && y < rx) inside = dist(x, y, w - rx - 1, rx) <= rx
      else if (x < rx && y > w - rx - 1) inside = dist(x, y, rx, w - rx - 1) <= rx
      else if (x > w - rx - 1 && y > w - rx - 1) inside = dist(x, y, w - rx - 1, w - rx - 1) <= rx
      if (inside) setPixel(buf, w, x, y, c[0], c[1], c[2])
    }
  }
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

// Draw filled polygon (convex) via scan-line
function fillPoly(buf, w, pts, r, g, b, a = 255) {
  const minY = Math.max(0, Math.floor(Math.min(...pts.map(p => p[1]))))
  const maxY = Math.min(w - 1, Math.ceil(Math.max(...pts.map(p => p[1]))))
  for (let y = minY; y <= maxY; y++) {
    const xs = []
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[(i + 1) % pts.length]
      if ((y0 <= y && y < y1) || (y1 <= y && y < y0)) {
        xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0))
      }
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i < xs.length - 1; i += 2) {
      const x0 = Math.max(0, Math.ceil(xs[i]))
      const x1 = Math.min(w - 1, Math.floor(xs[i + 1]))
      for (let x = x0; x <= x1; x++) setPixel(buf, w, x, y, r, g, b, a)
    }
  }
}

// Thick line (square caps)
function thickLine(buf, w, x0, y0, x1, y1, thick, r, g, b) {
  const dx = x1 - x0, dy = y1 - y0
  const len = Math.sqrt(dx * dx + dy * dy)
  const nx = -dy / len * thick / 2, ny = dx / len * thick / 2
  fillPoly(buf, w, [
    [x0 + nx, y0 + ny], [x1 + nx, y1 + ny],
    [x1 - nx, y1 - ny], [x0 - nx, y0 - ny],
  ], r, g, b)
}

// Filled circle (anti-aliased edge)
function fillCircle(buf, w, cx, cy, rad, r, g, b) {
  const x0 = Math.max(0, Math.floor(cx - rad - 1))
  const x1 = Math.min(w - 1, Math.ceil(cx + rad + 1))
  const y0 = Math.max(0, Math.floor(cy - rad - 1))
  const y1 = Math.min(w - 1, Math.ceil(cy + rad + 1))
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = dist(x + 0.5, y + 0.5, cx, cy)
      if (d < rad) setPixel(buf, w, x, y, r, g, b)
      else if (d < rad + 1) setPixel(buf, w, x, y, r, g, b, Math.round(255 * (rad + 1 - d)))
    }
  }
}

// Gradient fill for the shield polygon
function gradientPoly(buf, w, pts, minY, maxY) {
  // Top colour: #2ecfe4   Bottom: #0e8fa3
  const r0 = 0x2e, g0 = 0xcf, b0 = 0xe4
  const r1 = 0x0e, g1 = 0x8f, b1 = 0xa3
  const span = maxY - minY || 1
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(w - 1, Math.ceil(maxY)); y++) {
    const t = (y - minY) / span
    const r = Math.round(r0 + (r1 - r0) * t)
    const g = Math.round(g0 + (g1 - g0) * t)
    const b = Math.round(b0 + (b1 - b0) * t)
    const xs = []
    for (let i = 0; i < pts.length; i++) {
      const [x0, py0] = pts[i]
      const [x1, py1] = pts[(i + 1) % pts.length]
      if ((py0 <= y && y < py1) || (py1 <= y && y < py0)) {
        xs.push(x0 + ((y - py0) / (py1 - py0)) * (x1 - x0))
      }
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i < xs.length - 1; i += 2) {
      const xa = Math.max(0, Math.ceil(xs[i]))
      const xb = Math.min(w - 1, Math.floor(xs[i + 1]))
      for (let x = xa; x <= xb; x++) setPixel(buf, w, x, y, r, g, b)
    }
  }
}

// ---------------------------------------------------------------------------
// Render the CREDIFY.ai icon at a given size
// ---------------------------------------------------------------------------
async function renderIcon(S) {
  const buf = Buffer.alloc(S * S * 4, 0)

  // 1. Rounded rect background
  const rx = Math.round(S * 0.208)
  roundedRectMask(buf, S, rx)

  // 2. Shield polygon  (scaled from 192-px design)
  const sc = S / 192
  const shield = [
    [96, 18], [36, 42], [36, 96],
    // approximate the curve at bottom with extra points
    [40, 120], [55, 148], [75, 163], [96, 169],
    [117, 163], [137, 148], [152, 120],
    [156, 96], [156, 42],
  ].map(([x, y]) => [x * sc, y * sc])
  const shieldMinY = Math.min(...shield.map(p => p[1]))
  const shieldMaxY = Math.max(...shield.map(p => p[1]))
  gradientPoly(buf, S, shield, shieldMinY, shieldMaxY)

  // 3. Check-mark
  const lw = Math.round(10 * sc)
  thickLine(buf, S, 72 * sc, 99 * sc, 93 * sc, 120 * sc, lw, 255, 255, 255)
  thickLine(buf, S, 93 * sc, 120 * sc, 120 * sc, 84 * sc, lw, 255, 255, 255)

  // 4. End-point circles
  const cr = 7 * sc
  fillCircle(buf, S, 72 * sc, 99 * sc, cr, 255, 255, 255)
  fillCircle(buf, S, 120 * sc, 84 * sc, cr, 255, 255, 255)

  return encodePNG(S, S, buf)
}

for (const size of [192, 512]) {
  const png = await renderIcon(size)
  const out = path.join(outDir, `icon-${size}.png`)
  writeFileSync(out, png)
  console.log(`✓  ${out}  (${png.length} bytes)`)
}
