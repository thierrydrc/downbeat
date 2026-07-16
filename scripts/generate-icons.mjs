import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sourceDir = join(__dirname, 'icon-sources')
const outputDir = join(__dirname, '..', 'public', 'icons')

const jobs = [
  { source: 'source-icon.svg', output: 'icon-192.png', size: 192 },
  { source: 'source-icon.svg', output: 'icon-512.png', size: 512 },
  { source: 'source-icon.svg', output: 'apple-touch-icon.png', size: 180 },
  { source: 'source-icon-maskable.svg', output: 'maskable-icon-512.png', size: 512 },
]

for (const job of jobs) {
  const svg = readFileSync(join(sourceDir, job.source))
  await sharp(svg, { density: 384 })
    .resize(job.size, job.size)
    .png()
    .toFile(join(outputDir, job.output))
  console.log(`✓ ${job.output} (${job.size}x${job.size})`)
}
