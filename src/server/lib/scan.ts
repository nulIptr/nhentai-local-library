import { readdirSync, statSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import type { Dirent } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../db.ts'
import { mangas } from '../schema.ts'
import { readZipContents } from './zip.ts'
import type { ArchiveMetadata, ZipPageResult } from './zip.ts'

const ZIP_EXTS = new Set(['.zip', '.cbz'])
const COVER_DIR = join(process.cwd(), 'data', 'covers')

function isZipFile(name: string): boolean {
  return ZIP_EXTS.has(extname(name).toLowerCase())
}

function discoverZipFiles(dir: string): string[] {
  const results: string[] = []
  const queue: string[] = [resolve(dir)]

  while (queue.length > 0) {
    const current = queue.shift()!
    let entries: Dirent[]
    try {
      entries = readdirSync(current, { withFileTypes: true }) as unknown as Dirent[]
    } catch {
      continue
    }
    for (const entry of entries) {
      const fullPath = join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(fullPath)
      } else if (entry.isFile() && isZipFile(entry.name)) {
        results.push(fullPath)
      }
    }
  }

  return results
}

function ensureCoverDir() {
  if (!existsSync(COVER_DIR)) {
    mkdirSync(COVER_DIR, { recursive: true })
  }
}

function saveCover(page: ZipPageResult): { coverPath: string } {
  ensureCoverDir()
  const ext = extname(page.entryName).toLowerCase() || '.jpg'
  const id = randomUUID()
  const coverPath = join(COVER_DIR, `${id}${ext}`)
  writeFileSync(coverPath, page.buffer)
  return { coverPath }
}

async function runWithConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  let index = 0
  const workers: Promise<void>[] = []

  async function worker() {
    while (index < items.length) {
      const i = index++
      await fn(items[i])
    }
  }

  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(worker())
  }
  await Promise.all(workers)
}

function cleanupOrphanCovers(existingCoverPaths: Set<string>) {
  try {
    if (!existsSync(COVER_DIR)) return
    const entries = readdirSync(COVER_DIR, { withFileTypes: true }) as unknown as Dirent[]
    for (const entry of entries) {
      if (!entry.isFile()) continue
      const fullPath = join(COVER_DIR, entry.name)
      if (!existingCoverPaths.has(fullPath)) {
        try {
          rmSync(fullPath)
        } catch {
          // ignore cleanup errors
        }
      }
    }
  } catch {
    // ignore cleanup errors
  }
}

export interface ScanSummary {
  total: number
  added: number
  updated: number
  removed: number
  errors: string[]
}

export interface ScanOptions {
  forceFull?: boolean
}

function archiveMetadataValues(metadata: ArchiveMetadata | undefined): Partial<typeof mangas.$inferInsert> {
  if (!metadata) return {}
  return {
    ...(metadata.title ? { title: metadata.title } : {}),
    ...(metadata.titleJpn ? { titleJpn: metadata.titleJpn } : {}),
    ...(metadata.category ? { category: metadata.category } : {}),
    ...(metadata.url ? { url: metadata.url } : {}),
    ...(metadata.tags ? { tags: metadata.tags } : {}),
    status: 'tagged'
  }
}

export async function scanLibrary(libraryPath: string, options: ScanOptions = {}): Promise<ScanSummary> {
  const { forceFull = false } = options
  const resolvedLibrary = resolve(libraryPath)
  if (!existsSync(resolvedLibrary)) {
    throw new Error(`Library path does not exist: ${libraryPath}`)
  }

  const allFiles = discoverZipFiles(resolvedLibrary)

  const existingRows = await db
    .select({ id: mangas.id, filepath: mangas.filepath, coverPath: mangas.coverPath, bundleSize: mangas.bundleSize, mtime: mangas.mtime })
    .from(mangas)

  const existingByPath = new Map(existingRows.map((r) => [r.filepath!, r]))

  // 默认排除已在数据库中的文件；强制全量扫描时处理所有文件
  const files = forceFull ? allFiles : allFiles.filter((filepath) => !existingByPath.has(filepath))
  const summary: ScanSummary = { total: files.length, added: 0, updated: 0, removed: 0, errors: [] }
  const discoveredPaths = new Set(files)

  await runWithConcurrency(files, 2, async (filepath) => {
    try {
      const stat = statSync(filepath)
      const existing = existingByPath.get(filepath)
      const needsCover = !existing || !existing.coverPath || !existsSync(existing.coverPath)
      const { imageNames: names, metadata, cover } = await readZipContents(filepath, {
        pageIndex: needsCover ? 0 : undefined,
        readMetadata: true
      })
      const pageCount = names.length
      if (pageCount === 0) {
        summary.errors.push(`No images in ${filepath}`)
        return
      }

      if (existing && forceFull) {
        let coverPath = existing.coverPath
        if (needsCover) {
          coverPath = cover ? saveCover(cover).coverPath : null
        }
        await db
          .update(mangas)
          .set({
            pageCount,
            bundleSize: Number(stat.size),
            mtime: stat.mtime.toISOString(),
            coverPath,
            exist: true,
            updatedAt: new Date().toISOString(),
            ...archiveMetadataValues(metadata)
          })
          .where(eq(mangas.id, existing.id))
        summary.updated++
      } else if (!existing) {
        if (!cover) {
          summary.errors.push(`Failed to extract cover for ${filepath}`)
          return
        }
        const coverPath = saveCover(cover).coverPath
        const now = new Date().toISOString()
        await db.insert(mangas).values({
          id: randomUUID(),
          title: basename(filepath, extname(filepath)),
          filepath,
          coverPath,
          type: 'zip',
          pageCount,
          bundleSize: Number(stat.size),
          mtime: stat.mtime.toISOString(),
          status: 'non-tag',
          exist: true,
          readCount: 0,
          currentPage: 0,
          hiddenBook: false,
          mark: false,
          ...archiveMetadataValues(metadata),
          createdAt: now,
          updatedAt: now
        })
        summary.added++
      }
    } catch (err) {
      summary.errors.push(`${filepath}: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  if (forceFull) {
    const removedIds = existingRows
      .filter((r) => {
        if (!r.filepath) return false
        // 仅当记录在本次扫描目录范围内且未被发现时，才标记为不存在
        if (!r.filepath.startsWith(resolvedLibrary)) return false
        return !discoveredPaths.has(r.filepath)
      })
      .map((r) => r.id)

    if (removedIds.length > 0) {
      await db.update(mangas).set({ exist: false }).where(inArray(mangas.id, removedIds))
      summary.removed = removedIds.length
    }

    // 清理未再被任何漫画记录引用的封面缓存文件
    const referencedCoverPaths = new Set(
      (await db.select({ coverPath: mangas.coverPath }).from(mangas))
        .map((r) => r.coverPath)
        .filter(Boolean) as string[]
    )
    cleanupOrphanCovers(referencedCoverPaths)
  }

  return summary
}

let isScanning = false

export function runScanOnce(
  libraryPath: string,
  options: ScanOptions = {},
  onComplete?: (summary: ScanSummary) => void
): Promise<{ started: boolean; message?: string }> {
  if (isScanning) {
    return Promise.resolve({ started: false, message: '已有扫描任务正在进行中' })
  }
  isScanning = true
  scanLibrary(libraryPath, options)
    .then((summary) => {
      onComplete?.(summary)
    })
    .catch((err) => {
      console.error('[scan] Failed:', err instanceof Error ? err.message : String(err))
    })
    .finally(() => {
      isScanning = false
    })
  return Promise.resolve({ started: true, message: '扫描已在后台开始' })
}
