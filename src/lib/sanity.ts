import {createClient} from '@sanity/client'

const env = (import.meta as any)?.env ?? {}

export const client = createClient({
  projectId: env.VITE_SANITY_PROJECT_ID || 'lgqos9pf',
  dataset: env.VITE_SANITY_DATASET || 'production',
  apiVersion: env.VITE_SANITY_API_VERSION || '2025-07-01',
  useCdn: false,
})

