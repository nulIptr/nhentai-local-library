import { openZipForPage } from './zip.js'

export async function readCover(coverPath: string | null | undefined, zipPath: string | null | undefined) {
  if (coverPath) {
    try {
      const file = Bun.file(coverPath)
      if (await file.exists()) {
        const buffer = Buffer.from(await file.arrayBuffer())
        const ext = coverPath.split('.').pop()?.toLowerCase()
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg'
        return { buffer, mime }
      }
    } catch {
      // fall through to zip fallback
    }
  }

  if (!zipPath) {
    throw new Error('No cover path and no zip path available')
  }

  const { buffer, mime } = await openZipForPage(zipPath, 0)
  return { buffer, mime }
}
