// Renders the PWA icon set from public/favicon.svg. Run with `npm run icons`.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const svg = await readFile(path.join(root, 'public/favicon.svg'))

const targets = [
  { file: 'pwa-192x192.png', size: 192, padding: 0 },
  { file: 'pwa-512x512.png', size: 512, padding: 0 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0 },
  // Maskable icons need the artwork inside the central 80 % safe zone.
  { file: 'pwa-maskable-512x512.png', size: 512, padding: 64 },
]

for (const { file, size, padding } of targets) {
  const inner = size - padding * 2
  const art = await sharp(svg).resize(inner, inner).png().toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: '#0f172a' },
  })
    .composite([{ input: art, left: padding, top: padding }])
    .png()
    .toFile(path.join(root, 'public', file))
  console.log(`wrote public/${file}`)
}
