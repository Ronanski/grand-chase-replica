import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type { AppState } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Null when sync isn't configured; the app then runs local-only. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export async function pullState(userId: string): Promise<AppState | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('user_state').select('data').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return (data?.data as AppState | undefined) ?? null
}

export async function pushState(userId: string, state: AppState): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('user_state')
    .upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() })
  if (error) throw error
}

/** Calls onChange whenever another device writes this user's state. */
export function subscribeState(userId: string, onChange: () => void): () => void {
  if (!supabase) return () => {}
  const channel = supabase
    .channel(`user_state:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_state', filter: `user_id=eq.${userId}` }, onChange)
    .subscribe()
  return () => {
    void supabase?.removeChannel(channel)
  }
}

// Email one-time code rather than magic links: links can't redirect back
// into the desktop app (file://), but a typed code works everywhere.
export async function sendLoginCode(email: string): Promise<void> {
  if (!supabase) throw new Error('Sync is not configured')
  const { error } = await supabase.auth.signInWithOtp({ email })
  if (error) throw error
}

export async function verifyLoginCode(email: string, token: string): Promise<void> {
  if (!supabase) throw new Error('Sync is not configured')
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
}

export function onSessionChange(cb: (session: Session | null) => void): () => void {
  if (!supabase) return () => {}
  void supabase.auth.getSession().then(({ data }) => cb(data.session))
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}
