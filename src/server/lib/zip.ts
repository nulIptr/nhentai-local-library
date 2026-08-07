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

export interface ZipPageResult {
  buffer: Buffer
  entryName: string
  mime: string
}

export interface ArchiveMetadata {
  title?: string
  titleJpn?: string
  category?: string
  url?: string
  tags?: Record<string, string[]>
}

export interface ZipContents {
  imageNames: string[]
  metadata?: ArchiveMetadata
  cover?: ZipPageResult
}

export interface ReadZipContentsOptions {
  pageIndex?: number
  readMetadata?: boolean
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

function isImage(name: string): boolean {
  return IMAGE_EXTS.has(extname(name).toLowerCase())
}

function isInfoJson(name: string): boolean {
  const parts = name.split('/')
  return parts[parts.length - 1]?.toLowerCase() === 'info.json'
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizeTags(value: unknown, translated: boolean): Record<string, string[]> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined

  const tags: Record<string, string[]> = {}
  for (const [rawNamespace, rawValues] of Object.entries(value)) {
    const namespace = rawNamespace.trim()
    if (!namespace) continue
    if (!Array.isArray(rawValues)) continue
    const values = [...new Set(rawValues.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean))]
    if (values.length > 0) tags[namespace] = values
  }

  if (translated) {
    const languages = tags.language ? [...tags.language] : []
    if (!languages.includes('translated')) languages.push('translated')
    tags.language = languages
  }

  return Object.keys(tags).length > 0 ? tags : undefined
}

export function parseArchiveMetadata(value: unknown): ArchiveMetadata | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined

  const root = value as Record<string, unknown>
  const source =
    typeof root.gallery_info === 'object' && root.gallery_info !== null && !Array.isArray(root.gallery_info)
      ? (root.gallery_info as Record<string, unknown>)
      : root

  const metadata: ArchiveMetadata = {
    title: nonEmptyString(source.title),
    titleJpn: nonEmptyString(source.title_title_original) ?? nonEmptyString(source.title_jpn),
    category: nonEmptyString(source.category),
    url: nonEmptyString(source.link) ?? nonEmptyString(source.url),
    tags: normalizeTags(source.tags, source.translated === true)
  }

  return Object.values(metadata).some(Boolean) ? metadata : undefined
}

function readEntry(zipfile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err || !stream) return reject(err || new Error(`Failed to read zip entry: ${entry.fileName}`))
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => resolve(Buffer.concat(chunks)))
      stream.on('error', reject)
    })
  })
}

export function openZipForPage(filepath: string, index: number): Promise<ZipPageResult> {
  return readZipContents(filepath, { pageIndex: index }).then((contents) => {
    if (!contents.cover) throw new Error(`Page index ${index} not found in zip`)
    return contents.cover
  })
}

export function readZipContents(filepath: string, options: ReadZipContentsOptions = {}): Promise<ZipContents> {
  return new Promise((resolve, reject) => {
    yauzl.open(filepath, { lazyEntries: false, autoClose: false }, (err, zipfile) => {
      if (err || !zipfile) {
        return reject(err || new Error(`Failed to open zip: ${filepath}`))
      }

      const entries: yauzl.Entry[] = []
      let infoEntry: yauzl.Entry | undefined
      zipfile.on('entry', (entry: yauzl.Entry) => {
        if (!entry.fileName.includes('__MACOSX') && !entry.fileName.startsWith('.') && isImage(entry.fileName)) {
          entries.push(entry)
        }
        if (options.readMetadata && !infoEntry && isInfoJson(entry.fileName)) infoEntry = entry
      })
      zipfile.on('end', async () => {
        entries.sort((a, b) => naturalCompare(a.fileName, b.fileName))
        let metadata: ArchiveMetadata | undefined
        try {
          if (infoEntry) metadata = parseArchiveMetadata(JSON.parse((await readEntry(zipfile, infoEntry)).toString('utf8')))
        } catch {
          // An invalid metadata entry must not make an otherwise readable comic fail to scan.
        }

        try {
          const target = options.pageIndex === undefined ? undefined : entries[options.pageIndex]
          const buffer = target ? await readEntry(zipfile, target) : undefined
          zipfile.close()
          resolve({
            imageNames: entries.map((entry) => entry.fileName),
            metadata,
            cover: target && buffer
              ? { buffer, entryName: target.fileName, mime: MIME_TYPES[extname(target.fileName).toLowerCase()] || 'application/octet-stream' }
              : undefined
          })
        } catch (readError) {
          zipfile.close()
          reject(readError)
        }
      })
      zipfile.on('error', (e: Error) => {
        zipfile.close()
        reject(e)
      })
    })
  })
}

export async function listZipImageNames(filepath: string): Promise<string[]> {
  return (await readZipContents(filepath)).imageNames
}
