import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(__dirname, 'icon-sources', 'source-icon.png')
const iconsDir = join(__dirname, '..', 'public', 'icons')
const publicDir = join(__dirname, '..', 'public')

const BACKGROUND = '#0b0c0e'

function renderSource(size) {
  return sharp(sourcePath).resize(size, size)
}

const jobs = [
  { output: 'icon-192.png', size: 192 },
  { output: 'icon-512.png', size: 512 },
  { output: 'apple-touch-icon.png', size: 180 },
  { output: 'favicon-48.png', size: 48 },
  { output: 'favicon-32.png', size: 32 },
  { output: 'favicon-16.png', size: 16 },
]

for (const job of jobs) {
  await renderSource(job.size).png().toFile(join(iconsDir, job.output))
  console.log(`✓ ${job.output} (${job.size}x${job.size})`)
}

// favicon.ico à la racine de public/ (donc de dist/) : convention de
// fallback historique des navigateurs (/favicon.ico), en plus des <link
// rel="icon"> PNG déjà déclarés dans index.html. Contient les 3 résolutions
// classiques dans un seul fichier multi-image.
const icoBuffer = await pngToIco([
  join(iconsDir, 'favicon-16.png'),
  join(iconsDir, 'favicon-32.png'),
  join(iconsDir, 'favicon-48.png'),
])
await writeFile(join(publicDir, 'favicon.ico'), icoBuffer)
console.log('✓ favicon.ico (16/32/48)')

// Maskable : le motif dans source-icon.png va presque jusqu'aux bords du
// canevas, ce qui serait rogné par les masques (cercle, squircle...) que les
// OS appliquent aux icônes maskable. On réduit le motif et on le recentre
// sur un fond plein pour rester dans la "safe zone" (~40% de rayon autour du
// centre) recommandée par la spec.
const MASKABLE_SCALE = 0.85
const innerSize = Math.round(512 * MASKABLE_SCALE)
const inner = await renderSource(innerSize).toBuffer()
await sharp({
  create: { width: 512, height: 512, channels: 3, background: BACKGROUND },
})
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(join(iconsDir, 'maskable-icon-512.png'))
console.log('✓ maskable-icon-512.png (512x512)')
