// Writes minimal valid SVG placeholder files named boxes-01.svg .. boxes-18.svg
// The game code uses these until replaced with real PNGs.
const fs = require('fs')
const path = require('path')

const entries = [
  { count: 21, label: 'large scattered towers' },
  { count: 11, label: 'two asymmetric columns' },
  { count: 3,  label: 'three single cubes' },
  { count: 25, label: 'large solid block' },
  { count: 7,  label: 'scattered cubes' },
  { count: 9,  label: 'medium solid block' },
  { count: 8,  label: 'U-shaped line' },
  { count: 8,  label: 'scattered tall columns' },
  { count: 2,  label: 'two cubes' },
  { count: 11, label: 'cross shape' },
  { count: 4,  label: 'small 2×2 block' },
  { count: 8,  label: 'scattered cubes' },
  { count: 16, label: 'ring shape' },
  { count: 4,  label: 'four corner cubes' },
  { count: 16, label: 'C-shaped frame' },
  { count: 5,  label: 'single tall tower' },
  { count: 3,  label: 'three corner cubes' },
  { count: 6,  label: 'single tall column' },
]

const dir = path.join(__dirname, '..', 'public', 'boxes')
fs.mkdirSync(dir, { recursive: true })

entries.forEach(({ count, label }, i) => {
  const n = String(i + 1).padStart(2, '0')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 640" width="1024" height="640">
  <rect width="1024" height="640" fill="#aed4f0"/>
  <rect x="0" y="460" width="1024" height="180" rx="0" fill="#c8b89a"/>
  <rect x="112" y="300" width="800" height="180" rx="16" fill="#e8e8d8" stroke="#888" stroke-width="3"/>
  <text x="512" y="200" text-anchor="middle" font-family="sans-serif" font-size="100" font-weight="bold" fill="#334c66">${count}</text>
  <text x="512" y="290" text-anchor="middle" font-family="sans-serif" font-size="36" fill="#556">boxes</text>
  <text x="512" y="400" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#999">${label} · placeholder</text>
</svg>`
  // Write as .svg for correct MIME type
  const dest = path.join(dir, `boxes-${n}.svg`)
  fs.writeFileSync(dest, svg, 'utf8')
  // Remove old .png placeholder if it exists
  const oldPng = path.join(dir, `boxes-${n}.png`)
  if (fs.existsSync(oldPng)) fs.unlinkSync(oldPng)
  console.log(`Written ${dest}`)
})

console.log('\nDone. Replace each .svg with the real PNG and update BOX_BANK in Games.tsx to use .png extensions.')
