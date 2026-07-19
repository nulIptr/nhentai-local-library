import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { isValidMetadata, refreshMetadata } from '../metadata-refresh.ts'
import { setMetadataPath, resetMetadataPath, clearTagCache } from '../tags.ts'

const validMetadata = {
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
          name: '水手服',
          intro: '',
          links: ''
        }
      }
    }
  ]
}

describe('isValidMetadata', () => {
  it('accepts valid metadata', () => {
    expect(isValidMetadata(validMetadata)).toBe(true)
  })

  it('rejects missing version', () => {
    expect(isValidMetadata({ ...validMetadata, version: undefined })).toBe(false)
  })

  it('rejects missing head sha', () => {
    expect(isValidMetadata({ ...validMetadata, head: { ...validMetadata.head, sha: '' } })).toBe(false)
  })

  it('rejects malformed entry', () => {
    const invalid = JSON.parse(JSON.stringify(validMetadata))
    invalid.data[0].data.schoolgirl.name = 123
    expect(isValidMetadata(invalid)).toBe(false)
  })
})

describe('refreshMetadata', () => {
  let tempDir: string
  let originalFetch: typeof fetch

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'emm-refresh-test-'))
    setMetadataPath(join(tempDir, 'db.html.json'))
    clearTagCache()
    originalFetch = global.fetch
  })

  afterEach(() => {
    resetMetadataPath()
    clearTagCache()
    rmSync(tempDir, { recursive: true, force: true })
    global.fetch = originalFetch
  })

  it('downloads and replaces metadata file', async () => {
    global.fetch = (() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-length': String(JSON.stringify(validMetadata).length) }),
        blob: async () => new Blob([JSON.stringify(validMetadata)], { type: 'application/json' }),
        text: async () => JSON.stringify(validMetadata)
      } as Response)) as unknown as typeof fetch

    process.env.TAG_METADATA_URL = 'https://example.com/db.html.json'
    const result = await refreshMetadata()
    expect(result.started).toBe(true)
    expect(existsSync(join(tempDir, 'db.html.json'))).toBe(true)
  })

  it('does not overwrite file on invalid download', async () => {
    const existingPath = join(tempDir, 'db.html.json')
    writeFileSync(existingPath, JSON.stringify(validMetadata), 'utf8')

    global.fetch = (() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        blob: async () => new Blob(['not json'], { type: 'text/plain' }),
        text: async () => 'not json'
      } as Response)) as unknown as typeof fetch

    const result = await refreshMetadata()
    expect(result.started).toBe(true)
    expect(result.message).toContain('失败')
    const content = await Bun.file(existingPath).text()
    expect(JSON.parse(content).version).toBe(7)
  })

  it('returns 409 when refresh is already in progress', async () => {
    let resolveFetch: (value: Response) => void
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })

    global.fetch = (() => fetchPromise) as unknown as typeof fetch

    const first = refreshMetadata()
    const second = refreshMetadata()

    resolveFetch!({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      blob: async () => new Blob([JSON.stringify(validMetadata)], { type: 'application/json' }),
      text: async () => JSON.stringify(validMetadata)
    } as Response)

    const [r1, r2] = await Promise.all([first, second])
    expect(r1.started).toBe(true)
    expect(r2.started).toBe(false)
    expect(r2.message).toContain('已有刷新任务')
  })
})
