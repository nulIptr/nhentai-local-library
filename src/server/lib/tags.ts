import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { TagMap, TagMetadata } from '../../types.ts'
import type { Metadata } from '../metadata/metadata.types.ts'
import { decodeHtmlEntities, extractLinks, sanitizeHtml } from './html.ts'

const DEFAULT_METADATA_PATH = join(process.cwd(), 'src', 'server', 'metadata', 'db.html.json')

let metadataPath = DEFAULT_METADATA_PATH
let parsedMetadata: Metadata | null = null
let namespaceIndex: Map<string, Map<string, TagMetadata>> | null = null
let flatIndex: Map<string, TagMetadata[]> | null = null
let fileMtime: string | null = null

// 漫画数据库中的分类名与 metadata 命名空间的对照
export const NAMESPACE_ALIASES: Record<string, string> = {
  category: 'reclass'
}

function parseTagEntry(name: string, intro: string, links: string): TagMetadata {
  const safeName = sanitizeHtml(name)
  const safeIntro = sanitizeHtml(intro)
  return {
    name: plainTextOrHtml(safeName) || plainTextOrHtml(name),
    intro: safeIntro,
    links: extractLinks(links)
  }
}

function plainTextOrHtml(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function loadMetadata(): Metadata | null {
  if (parsedMetadata) return parsedMetadata
  try {
    const text = readFileSync(metadataPath, 'utf8')
    const data = JSON.parse(text) as Metadata
    const stat = statSync(metadataPath)
    fileMtime = stat.mtime.toISOString()
    parsedMetadata = data
    buildIndexes(data)
    return data
  } catch {
    parsedMetadata = null
    namespaceIndex = null
    flatIndex = null
    return null
  }
}

export function setMetadataPath(path: string): void {
  metadataPath = path
  clearTagCache()
}

export function resetMetadataPath(): void {
  metadataPath = DEFAULT_METADATA_PATH
  clearTagCache()
}

export function getMetadataPath(): string {
  return metadataPath
}

function buildIndexes(data: Metadata): void {
  const nsMap = new Map<string, Map<string, TagMetadata>>()
  const flat = new Map<string, TagMetadata[]>()

  for (const item of data.data) {
    const ns = item.namespace
    const entryMap = new Map<string, TagMetadata>()

    for (const [key, value] of Object.entries(item.data)) {
      const meta = parseTagEntry(value.name, value.intro, value.links)
      entryMap.set(key, meta)

      const lower = key.toLowerCase()
      if (!flat.has(lower)) flat.set(lower, [])
      flat.get(lower)!.push(meta)
    }

    nsMap.set(ns, entryMap)
  }

  namespaceIndex = nsMap
  flatIndex = flat
}

export function clearTagCache(): void {
  parsedMetadata = null
  namespaceIndex = null
  flatIndex = null
  fileMtime = null
}

export function getMetadataFileMtime(): string | null {
  loadMetadata()
  return fileMtime
}

export function getTagName(namespace: string, key: string): string | undefined {
  return getTagMetadata(namespace, key)?.name
}

export function getTagMetadata(namespace: string, key: string): TagMetadata | undefined {
  loadMetadata()
  if (!namespaceIndex) return undefined

  const lookupKey = key.toLowerCase()

  // 1. 直接匹配命名空间
  const direct = namespaceIndex.get(namespace)?.get(key) ?? namespaceIndex.get(namespace)?.get(lookupKey)
  if (direct) return direct

  // 2. 别名命名空间
  const alias = NAMESPACE_ALIASES[namespace]
  if (alias) {
    const aliased = namespaceIndex.get(alias)?.get(key) ?? namespaceIndex.get(alias)?.get(lookupKey)
    if (aliased) return aliased
  }

  // 3. 在所有命名空间中回退查找（用于扁平化的 'tag' 等分类）
  return flatIndex?.get(lookupKey)?.[0]
}

export function getAllNamespaces(): string[] {
  loadMetadata()
  return namespaceIndex ? [...namespaceIndex.keys()] : []
}

export function getMetadataSummary(): {
  loaded: boolean
  version?: number
  repo?: string
  headSha?: string
  headMessage?: string
  updatedAt?: string
  fileMtime?: string | null
  namespaces: number
  totalEntries: number
} {
  const data = loadMetadata()
  if (!data) {
    return { loaded: false, namespaces: 0, totalEntries: 0, fileMtime: getMetadataFileMtime() }
  }
  const totalEntries = data.data.reduce((sum, item) => sum + Object.keys(item.data).length, 0)
  return {
    loaded: true,
    version: data.version,
    repo: data.repo,
    headSha: data.head.sha,
    headMessage: data.head.message,
    updatedAt: data.head.committer.when,
    fileMtime,
    namespaces: data.data.length,
    totalEntries
  }
}

export function buildTagMeta(
  tags: TagMap | null,
  options?: { detail?: boolean }
): Record<string, Record<string, TagMetadata>> {
  const meta: Record<string, Record<string, TagMetadata>> = {}
  if (!tags) return meta

  for (const [namespace, list] of Object.entries(tags)) {
    const items = Array.isArray(list) ? list : typeof list === 'string' ? list.split(/\s+/) : []
    const nsMeta: Record<string, TagMetadata> = {}
    for (const tag of items.filter(Boolean)) {
      const translated = getTagMetadata(namespace, tag)
      if (translated) {
        nsMeta[tag] = options?.detail
          ? translated
          : { name: translated.name, intro: '', links: [] }
      }
    }
    if (Object.keys(nsMeta).length > 0) {
      meta[namespace] = nsMeta
    }
  }
  return meta
}
