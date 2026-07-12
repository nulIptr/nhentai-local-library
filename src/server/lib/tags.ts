import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TagMap } from '../../types.ts'

let tagNames: Record<string, Record<string, string>> | null = null
let flatTagNames: Record<string, string> | null = null

function loadTagNames(): Record<string, Record<string, string>> {
  if (tagNames) return tagNames
  try {
    const text = readFileSync(join(process.cwd(), 'src', 'server', 'metadata', 'tags.json'), 'utf8')
    tagNames = JSON.parse(text) as Record<string, Record<string, string>>
  } catch {
    tagNames = {}
  }
  return tagNames ?? {}
}

function loadFlatTagNames(): Record<string, string> {
  if (flatTagNames) return flatTagNames
  const ns = loadTagNames()
  const flat: Record<string, string> = {}
  for (const entries of Object.values(ns)) {
    for (const [key, name] of Object.entries(entries)) {
      const lower = key.toLowerCase()
      if (!(lower in flat)) flat[lower] = name
    }
  }
  flatTagNames = flat
  return flat
}

// 漫画数据库中的分类名与 metadata 命名空间的对照
const NAMESPACE_ALIASES: Record<string, string> = {
  category: 'reclass'
}

export function getTagName(namespace: string, key: string): string | undefined {
  const all = loadTagNames()
  const lookupKey = key.toLowerCase()

  // 1. 直接匹配命名空间
  const direct = all[namespace]?.[key] ?? all[namespace]?.[lookupKey]
  if (direct) return direct

  // 2. 别名命名空间
  const alias = NAMESPACE_ALIASES[namespace]
  if (alias) {
    const aliased = all[alias]?.[key] ?? all[alias]?.[lookupKey]
    if (aliased) return aliased
  }

  // 3. 在所有命名空间中回退查找（用于扁平化的 'tag' 等分类）
  return loadFlatTagNames()[lookupKey]
}

export function buildTagMeta(tags: TagMap | null): Record<string, Record<string, { name?: string }>> {
  const meta: Record<string, Record<string, { name?: string }>> = {}
  if (!tags) return meta
  for (const [namespace, list] of Object.entries(tags)) {
    const items = Array.isArray(list) ? list : typeof list === 'string' ? list.split(/\s+/) : []
    const nsMeta: Record<string, { name?: string }> = {}
    for (const tag of items.filter(Boolean)) {
      const translated = getTagName(namespace, tag)
      if (translated) {
        nsMeta[tag] = { name: translated }
      }
    }
    if (Object.keys(nsMeta).length > 0) {
      meta[namespace] = nsMeta
    }
  }
  return meta
}
