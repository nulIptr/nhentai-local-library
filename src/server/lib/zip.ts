import yauzl from 'yauzl'
import { extname } from 'path'

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'])

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif'
}

interface ZipPageResult {
  buffer: Buffer
  entryName: string
  mime: string
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

function isImage(name: string): boolean {
  return IMAGE_EXTS.has(extname(name).toLowerCase())
}

export function openZipForPage(filepath: string, index: number): Promise<ZipPageResult> {
  return new Promise((resolve, reject) => {
    yauzl.open(filepath, { lazyEntries: false, autoClose: false }, (err, zipfile) => {
      if (err || !zipfile) {
        return reject(err || new Error(`Failed to open zip: ${filepath}`))
      }

      const entries: yauzl.Entry[] = []

      zipfile.on('entry', (entry: yauzl.Entry) => {
        if (!entry.fileName.includes('__MACOSX') && !entry.fileName.startsWith('.') && isImage(entry.fileName)) {
          entries.push(entry)
        }
      })

      zipfile.on('end', () => {
        entries.sort((a, b) => naturalCompare(a.fileName, b.fileName))
        const target = entries[index]
        if (!target) {
          zipfile.close()
          return reject(new Error(`Page index ${index} not found in zip`))
        }

        zipfile.openReadStream(target, (streamErr, readStream) => {
          if (streamErr || !readStream) {
            zipfile.close()
            return reject(streamErr || new Error('Failed to open zip entry stream'))
          }

          const chunks: Buffer[] = []
          readStream.on('data', (chunk: Buffer) => chunks.push(chunk))
          readStream.on('end', () => {
            zipfile.close()
            const buffer = Buffer.concat(chunks)
            const ext = extname(target.fileName).toLowerCase()
            resolve({ buffer, entryName: target.fileName, mime: MIME_TYPES[ext] || 'application/octet-stream' })
          })
          readStream.on('error', (e: Error) => {
            zipfile.close()
            reject(e)
          })
        })
      })

      zipfile.on('error', (e: Error) => {
        zipfile.close()
        reject(e)
      })
    })
  })
}

export async function listZipImageNames(filepath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    yauzl.open(filepath, { lazyEntries: false, autoClose: false }, (err, zipfile) => {
      if (err || !zipfile) {
        return reject(err || new Error(`Failed to open zip: ${filepath}`))
      }

      const names: string[] = []
      zipfile.on('entry', (entry: yauzl.Entry) => {
        if (!entry.fileName.includes('__MACOSX') && !entry.fileName.startsWith('.') && isImage(entry.fileName)) {
          names.push(entry.fileName)
        }
      })
      zipfile.on('end', () => {
        zipfile.close()
        names.sort(naturalCompare)
        resolve(names)
      })
      zipfile.on('error', (e: Error) => {
        zipfile.close()
        reject(e)
      })
    })
  })
}
