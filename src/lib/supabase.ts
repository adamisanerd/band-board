import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// These come from .env.local (see .env.example). Vite only exposes variables prefixed VITE_.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.')
}

/** The one Supabase client the whole app shares. `Database` makes every query fully typed. */
export const supabase = createClient<Database>(url, key)

/** Shorthand for a table's row type, e.g. Row<'dates'>. */
export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
