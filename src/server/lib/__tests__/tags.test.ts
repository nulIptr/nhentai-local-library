import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { decodeHtmlEntities, extractLinks, sanitizeHtml } from '../html.ts'
import {
  buildTagMeta,
  clearTagCache,
  getTagMetadata,
  getTagName,
  resetMetadataPath,
  setMetadataPath
} from '../tags.ts'

const sampleMetadata = {
  repo: 'https://github.com/EhTagTranslation/Database',
  head: {
    sha: 'abc123',
    message: 'test',
    author: { name: 'a', email: 'a@b.com', when: '2026-01-01T00:00:00.000Z' },
    committer: { name: 'a', email: 'a@b.com', when: '2026-01-01T00:00:00.000Z' }
  },
  version: 7,
  data: [
    {
      namespace: 'female',
      frontMatters: { name: '女性', description: '', key: 'female', rules: [] },
      count: 1,
      data: {
        schoolgirl: {
          name: '<p>水手服</p>',
          intro: '<p>说明文字</p>',
          links: '<p><a href="https://example.com">示例</a></p>'
        }
      }
    },
    {
      namespace: 'reclass',
      frontMatters: { name: '分类', description: '', key: 'reclass', rules: [] },
      count: 1,
      data: {
        doujinshi: {
          name: '<p>同人志</p>',
          intro: '',
          links: ''
        }
      }
    }
  ]
}

describe('html sanitizer', () => {
  it('decodes html entities', () => {
    expect(decodeHtmlEntities('&amp; &lt; &gt; &quot; &#39; &nbsp;')).toBe(`& < > " ' \u00a0`)
  })

  it('sanitizes disallowed tags', () => {
    expect(sanitizeHtml('<script>alert(1)</script><p>safe</p>')).toBe('<p>safe</p>')
  })

  it('keeps allowed tags', () => {
    expect(sanitizeHtml('<p><b>bold</b> <a href="https://example.com">link</a></p>')).toContain('<b>bold</b>')
  })

  it('filters non-http links', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('')
    expect(sanitizeHtml('<a href="https://example.com">x</a>')).toContain('https://example.com')
  })

  it('removes event attributes', () => {
    expect(sanitizeHtml('<p onclick="alert(1)">x</p>')).toBe('<p>x</p>')
  })

  it('extracts safe links', () => {
    const links = extractLinks('<a href="https://a.com">A</a><a href="javascript:bad">B</a>')
    expect(links).toEqual([{ label: 'A', url: 'https://a.com' }])
  })
})

describe('tags service', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'emm-tags-test-'))
    const path = join(tempDir, 'db.html.json')
    writeFileSync(path, JSON.stringify(sampleMetadata), 'utf8')
    clearTagCache()
    setMetadataPath(path)
  })

  afterEach(() => {
    resetMetadataPath()
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns translated name by namespace', () => {
    expect(getTagName('female', 'schoolgirl')).toBe('水手服')
  })

  it('uses namespace alias', () => {
    expect(getTagName('category', 'doujinshi')).toBe('同人志')
  })

  it('falls back to flat index', () => {
    expect(getTagName('unknown', 'schoolgirl')).toBe('水手服')
  })

  it('returns metadata with intro and links', () => {
    const meta = getTagMetadata('female', 'schoolgirl')
    expect(meta?.name).toBe('水手服')
    expect(meta?.intro).toBe('<p>说明文字</p>')
    expect(meta?.links).toEqual([{ label: '示例', url: 'https://example.com' }])
  })

  it('builds tag meta with detail switch', () => {
    const tags = { female: ['schoolgirl'] }
    const brief = buildTagMeta(tags)
    expect(brief.female?.schoolgirl?.name).toBe('水手服')
    expect(brief.female?.schoolgirl?.intro).toBe('')

    const detail = buildTagMeta(tags, { detail: true })
    expect(detail.female?.schoolgirl?.intro).toBe('<p>说明文字</p>')
  })
})
