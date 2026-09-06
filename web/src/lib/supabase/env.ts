/** Supabase is optional in development: with no credentials the data layer
 *  serves fixtures, so a fresh clone runs without a project. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)
