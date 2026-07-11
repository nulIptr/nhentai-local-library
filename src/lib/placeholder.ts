function hashToHue(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}

export function getPlaceholderTitle(manga: { id: string; title?: string | null }) {
  // 开发阶段使用占位标题，避免敏感内容被 AI 工具读取
  if (import.meta.env.VITE_PLACEHOLDER_PAGES === 'false') {
    return manga.title || `漫画 #${manga.id.slice(0, 8).toUpperCase()}`
  }
  return `漫画 #${manga.id.slice(0, 8).toUpperCase()}`
}

export function getPlaceholderCover(id: string): string {
  if (import.meta.env.VITE_PLACEHOLDER_PAGES === 'false') {
    return `/api/mangas/${id}/cover`
  }
  const hue = hashToHue(id)
  const hue2 = (hue + 40) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="311" viewBox="0 0 220 311">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(${hue}, 60%, 45%)" />
        <stop offset="100%" stop-color="hsl(${hue2}, 60%, 25%)" />
      </linearGradient>
    </defs>
    <rect width="220" height="311" fill="url(#g)" />
    <rect x="20" y="20" width="180" height="271" rx="6" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="sans-serif" font-size="16">
      COVER
    </text>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export function getPlaceholderPage(id: string, page: number): string {
  const hue = hashToHue(id)
  const hue2 = (hue + 60) % 360
  const pageNumber = page + 1
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
    <defs>
      <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(${hue}, 35%, 25%)" />
        <stop offset="100%" stop-color="hsl(${hue2}, 35%, 15%)" />
      </linearGradient>
    </defs>
    <rect width="800" height="1200" fill="url(#pg)" />
    <rect x="40" y="40" width="720" height="1120" rx="12" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4" />
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="sans-serif" font-size="72" font-weight="bold">
      PAGE
    </text>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="sans-serif" font-size="120" font-weight="bold">
      ${pageNumber}
    </text>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export function getPageSrc(mangaId: string, page: number): string {
  // 开发阶段默认使用占位页，避免敏感内容被 AI 工具读取
  // 如需显示真实漫画页，可在 .env 中设置 VITE_PLACEHOLDER_PAGES=false
  if (import.meta.env.VITE_PLACEHOLDER_PAGES === 'false') {
    return `/api/mangas/${mangaId}/page/${page}`
  }
  return getPlaceholderPage(mangaId, page)
}
