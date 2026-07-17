import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sourcePath = join(__dirname, 'icon-sources', 'source-icon.svg')
const outputDir = join(__dirname, '..', 'public', 'icons')

const BACKGROUND = '#0b0c0e'
const SVG_DENSITY = 384

function renderSource(size) {
  return sharp(sourcePath, { density: SVG_DENSITY }).resize(size, size)
}

const jobs = [
  { output: 'icon-192.png', size: 192 },
  { output: 'icon-512.png', size: 512 },
  { output: 'apple-touch-icon.png', size: 180 },
]

for (const job of jobs) {
  await renderSource(job.size).png().toFile(join(outputDir, job.output))
  console.log(`✓ ${job.output} (${job.size}x${job.size})`)
}

// Maskable : le motif dans source-icon.svg va presque jusqu'aux bords du
// canevas 512x512, ce qui serait rogné par les masques (cercle, squircle...)
// que les OS appliquent aux icônes maskable. On réduit le motif et on le
// recentre sur un fond plein pour rester dans la "safe zone" (~40% de rayon
// autour du centre) recommandée par la spec.
const MASKABLE_SCALE = 0.85
const innerSize = Math.round(512 * MASKABLE_SCALE)
const inner = await renderSource(innerSize).toBuffer()
await sharp({
  create: { width: 512, height: 512, channels: 3, background: BACKGROUND },
})
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(join(outputDir, 'maskable-icon-512.png'))
console.log('✓ maskable-icon-512.png (512x512)')
