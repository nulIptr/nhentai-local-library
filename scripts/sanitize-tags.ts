import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Metadata } from '../src/server/metadata/metadata.types.js'

const root = process.cwd()
const inputPath = join(root, 'src', 'server', 'metadata', 'db.html.json')
const outputPath = join(root, 'src', 'server', 'metadata', 'tags.json')

const raw = (await import(inputPath, { assert: { type: 'json' } })).default as Metadata

const result: Record<string, Record<string, string>> = {}

for (const item of raw.data) {
  const ns = item.namespace
  if (!result[ns]) result[ns] = {}
  for (const [key, value] of Object.entries(item.data)) {
    if (value.name) {
      // 脱敏：去掉 HTML 标签与图标，仅保留纯文本翻译
      let text = value.name.replace(/<[^>]*>/g, '')
      text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim()
      if (text) {
        result[ns][key] = text
      }
    }
  }
}

writeFileSync(outputPath, JSON.stringify(result))
console.log(`Sanitized tag names written to ${outputPath}`)
console.log(`Namespaces: ${Object.keys(result).length}`)
