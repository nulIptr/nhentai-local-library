import { edenTreaty } from '@elysiajs/eden'
import type { App } from './server'

const baseUrl = import.meta.env.VITE_API_URL || ''

export const client = edenTreaty<App>(baseUrl)
