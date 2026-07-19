import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { mangaRoutes } from './routes/mangas.ts'
import { runScanOnce } from './lib/scan.ts'

const app = new Elysia()
  .use(cors())
  .use(mangaRoutes)
  .get('/*', async ({ params }) => {
    // 生产环境：托管 Vite 构建产物，未匹配文件回退到 index.html（SPA）
    const requested = params['*'] || 'index.html'
    const candidates = [`dist/${requested}`, 'dist/index.html']
    for (const path of candidates) {
      const file = Bun.file(path)
      if (await file.exists()) return file
    }
    return new Response('Not found', { status: 404 })
  })
  .listen(process.env.PORT || 3000)

export type App = typeof app

console.log(`Server running at ${app.server?.hostname}:${app.server?.port}`)

const libraryPath = process.env.LIBRARY_PATH
if (libraryPath) {
  console.log(`[auto-scan] Starting background scan of ${libraryPath}`)
  runScanOnce(libraryPath, (summary) => {
    console.log(
      `[auto-scan] Done: total=${summary.total}, added=${summary.added}, updated=${summary.updated}, removed=${summary.removed}`
    )
    if (summary.errors.length > 0) {
      console.error(`[auto-scan] Errors:`, summary.errors)
    }
  }).then((result) => {
    if (!result.started) {
      console.warn('[auto-scan] Skipped:', result.message)
    }
  })
} else {
  console.warn('[auto-scan] Skipped: LIBRARY_PATH environment variable is not configured')
}
