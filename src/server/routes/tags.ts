import { Elysia, t } from 'elysia'
import { analyzeTags } from '../lib/tag-analysis.ts'
import { refreshMetadata, getRefreshStatus } from '../lib/metadata-refresh.ts'

export const tagRoutes = new Elysia({ prefix: '/api/tags' })
  .get(
    '/analysis',
    async ({ query }) => {
      const namespace = query.namespace?.trim() || undefined
      const limit = Number(query.limit) || 50
      const includeHidden = query.includeHidden === 'true'
      return analyzeTags({ namespace, limit, includeHidden })
    },
    {
      query: t.Object({
        namespace: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        includeHidden: t.Optional(t.String())
      })
    }
  )
  .get('/metadata/status', async () => getRefreshStatus())
  .post(
    '/metadata/refresh',
    async ({ set }) => {
      const result = await refreshMetadata()
      if (!result.started) {
        set.status = 409
        return { error: result.message || 'Refresh already in progress' }
      }
      return { started: true, message: result.message }
    },
    {
      response: t.Object({
        started: t.Optional(t.Boolean()),
        message: t.Optional(t.String()),
        error: t.Optional(t.String())
      })
    }
  )
