import { renameSync, existsSync, statSync, mkdirSync, rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Metadata } from '../metadata/metadata.types.ts'
import { clearTagCache, getMetadataPath, getMetadataSummary } from './tags.ts'

const DEFAULT_URL = 'https://github.com/EhTagTranslation/DatabaseReleases/raw/master/db.html.json'
const MAX_SIZE_BYTES = 50 * 1024 * 1024
const DOWNLOAD_TIMEOUT_MS = 60000

interface RefreshStatus {
  isRefreshing: boolean
  lastRefreshSuccessAt: string | null
  lastRefreshError: string | null
}

const status: RefreshStatus = {
  isRefreshing: false,
  lastRefreshSuccessAt: null,
  lastRefreshError: null
}

let refreshTimer: ReturnType<typeof setInterval> | null = null

function getMetadataDir(): string {
  return dirname(getMetadataPath())
}

function getTempPath(): string {
  return `${getMetadataPath()}.tmp`
}

function ensureDir() {
  const dir = getMetadataDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function isValidMetadata(data: unknown): data is Metadata {
  if (typeof data !== 'object' || data === null) return false
  const meta = data as Partial<Metadata>
  if (typeof meta.version !== 'number') return false
  if (!meta.head || typeof meta.head.sha !== 'string' || !meta.head.sha) return false
  if (!Array.isArray(meta.data)) return false

  for (const item of meta.data) {
    if (typeof item.namespace !== 'string') return false
    if (typeof item.data !== 'object' || item.data === null) return false
    for (const entry of Object.values(item.data)) {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        typeof (entry as Record<string, unknown>).name !== 'string' ||
        typeof (entry as Record<string, unknown>).intro !== 'string' ||
        typeof (entry as Record<string, unknown>).links !== 'string'
      ) {
        return false
      }
    }
  }

  return true
}

export function isMetadataStale(hours: number): boolean {
  const path = getMetadataPath()
  if (!existsSync(path)) return true
  try {
    const stat = statSync(path)
    const ageMs = Date.now() - stat.mtime.getTime()
    return ageMs > hours * 60 * 60 * 1000
  } catch {
    return true
  }
}

export async function refreshMetadata(): Promise<{ started: boolean; message?: string }> {
  if (status.isRefreshing) {
    return { started: false, message: '已有刷新任务正在进行' }
  }

  status.isRefreshing = true
  status.lastRefreshError = null

  try {
    ensureDir()
    const url = process.env.TAG_METADATA_URL || DEFAULT_URL
    const targetPath = getMetadataPath()
    const tempPath = getTempPath()

    const response = await fetch(url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`)
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && Number(contentLength) > MAX_SIZE_BYTES) {
      throw new Error(`Metadata file too large: ${contentLength} bytes`)
    }

    const blob = await response.blob()
    if (blob.size > MAX_SIZE_BYTES) {
      throw new Error(`Metadata file too large: ${blob.size} bytes`)
    }

    const text = await blob.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('Downloaded metadata is not valid JSON')
    }

    if (!isValidMetadata(data)) {
      throw new Error('Downloaded metadata failed validation')
    }

    await writeFile(tempPath, text, 'utf8')
    renameSync(tempPath, targetPath)
    clearTagCache()

    const now = new Date().toISOString()
    status.lastRefreshSuccessAt = now
    status.lastRefreshError = null

    return { started: true, message: '刷新成功' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    status.lastRefreshError = message
    return { started: true, message: `刷新失败: ${message}` }
  } finally {
    status.isRefreshing = false
    try {
      const tempPath = getTempPath()
      if (existsSync(tempPath)) rmSync(tempPath)
    } catch {
      // ignore cleanup errors
    }
  }
}

export function getRefreshStatus() {
  const summary = getMetadataSummary()
  return {
    ...summary,
    lastRefreshSuccessAt: status.lastRefreshSuccessAt,
    lastRefreshError: status.lastRefreshError,
    isRefreshing: status.isRefreshing
  }
}

export function startAutoRefresh(): void {
  if (refreshTimer) return

  const enabled = process.env.TAG_METADATA_AUTO_REFRESH === 'true'
  if (!enabled) return

  const hours = Math.max(1, Number(process.env.TAG_METADATA_REFRESH_HOURS) || 24)

  if (isMetadataStale(hours)) {
    refreshMetadata().catch(() => {})
  }

  refreshTimer = setInterval(() => {
    if (isMetadataStale(hours)) {
      refreshMetadata().catch(() => {})
    }
  }, 60 * 60 * 1000)
}
