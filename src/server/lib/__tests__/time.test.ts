import { describe, expect, it } from 'bun:test'
import { resolveFileTime } from '../time.ts'

describe('resolveFileTime', () => {
  const scannedAt = '2026-08-15T12:00:00.000Z'

  it('prefers file creation time', () => {
    expect(resolveFileTime(Date.UTC(2023, 0, 1), Date.UTC(2024, 0, 1), scannedAt)).toBe('2023-01-01T00:00:00.000Z')
  })

  it('falls back to file modification time', () => {
    expect(resolveFileTime(0, Date.UTC(2024, 0, 1), scannedAt)).toBe('2024-01-01T00:00:00.000Z')
  })

  it('falls back to scan time', () => {
    expect(resolveFileTime(0, Number.NaN, scannedAt)).toBe(scannedAt)
  })
})
