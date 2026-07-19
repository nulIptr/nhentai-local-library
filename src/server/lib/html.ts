import type { TagLink } from '../../types.ts'

const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'strong',
  'i',
  'em',
  'u',
  'p',
  'br',
  'ul',
  'ol',
  'li',
  'code',
  'span'
])

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base'])

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0'
}

export function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (_, name) => HTML_ENTITY_MAP[name] ?? `&${name};`)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function parseTag(tag: string): { tagName: string; output: string; skipContent: boolean } {
  const match = tag.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)\s*(.*)\/?>$/s)
  if (!match) {
    return { tagName: '', output: '', skipContent: false }
  }

  const tagName = match[1].toLowerCase()
  const isClosing = tag.startsWith('</')
  const isVoid = VOID_TAGS.has(tagName)
  const selfClosing = tag.endsWith('/>') || isVoid

  if (!ALLOWED_TAGS.has(tagName)) {
    return { tagName, output: '', skipContent: !isClosing }
  }

  if (isClosing) return { tagName, output: `</${tagName}>`, skipContent: false }
  if (selfClosing) return { tagName, output: `<${tagName} />`, skipContent: false }

  if (tagName === 'a') {
    const hrefMatch = match[2].match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/i)
    if (hrefMatch) {
      const rawHref = hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? ''
      const href = decodeHtmlEntities(rawHref).trim()
      if (/^https?:\/\//i.test(href)) {
        return {
          tagName,
          output: `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">`,
          skipContent: false
        }
      }
    }
    return { tagName, output: '', skipContent: true }
  }

  return { tagName, output: `<${tagName}>`, skipContent: false }
}

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  const decoded = decodeHtmlEntities(html)
  const tagRe = /<[^>]+>/g
  let result = ''
  let lastIndex = 0
  let skipUntilClose: string | null = null

  for (const match of decoded.matchAll(tagRe)) {
    const textSlice = decoded.slice(lastIndex, match.index)
    const tag = match[0]
    lastIndex = (match.index ?? 0) + tag.length

    const parsed = parseTag(tag)

    if (skipUntilClose) {
      if (parsed.tagName === skipUntilClose && tag.toLowerCase().startsWith(`</${skipUntilClose}`)) {
        skipUntilClose = null
      }
      continue
    }

    result += textSlice

    if (parsed.skipContent) {
      skipUntilClose = parsed.tagName
      continue
    }

    result += parsed.output
  }

  result += decoded.slice(lastIndex)
  return result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '').trim()
}

export function extractLinks(html: string): TagLink[] {
  const links: TagLink[] = []
  const re = /<a[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  while ((match = re.exec(html)) !== null) {
    const rawUrl = match[1] ?? match[2] ?? match[3] ?? ''
    const url = decodeHtmlEntities(rawUrl).trim()
    if (!/^https?:\/\//i.test(url)) continue

    const rawLabel = match[4].replace(/<[^>]+>/g, '')
    const label = decodeHtmlEntities(rawLabel).trim() || url
    links.push({ label, url })
  }

  return links
}

export function plainText(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}
