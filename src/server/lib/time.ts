export function toIsoTimestamp(timestamp: number): string | undefined {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return undefined
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export function resolveFileTime(birthtimeMs: number, mtimeMs: number, scannedAt: string): string {
  return toIsoTimestamp(birthtimeMs) ?? toIsoTimestamp(mtimeMs) ?? scannedAt
}
