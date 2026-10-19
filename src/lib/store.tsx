import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { mergeStates, sameState } from './merge'
import { onSessionChange, pullState, pushState, subscribeState, supabase } from './sync'
import type { AppState, Build, Collection, GameEvent, Settings, Task } from './types'

const STORAGE_KEY = 'gc-companion:state:v1'

const DEFAULT_STATE: AppState = {
  // Fixed ids so fresh installs on two devices don't duplicate these after syncing.
  tasks: [
    { id: 'default-login', name: 'Claim daily login reward', period: 'daily', updatedAt: 0 },
    { id: 'default-missions', name: 'Clear daily missions', period: 'daily', updatedAt: 0 },
    { id: 'default-weekly', name: 'Clear weekly missions', period: 'weekly', updatedAt: 0 },
  ],
  events: [],
  builds: [],
  settings: { id: 'settings', resetHourUtc: 0, weeklyResetDay: 1, updatedAt: 0 },
}

type Item = { tasks: Task; events: GameEvent; builds: Build }

export type SyncStatus = 'local-only' | 'signed-out' | 'syncing' | 'synced' | 'error'

interface Store {
  state: AppState
  upsert<C extends Collection>(collection: C, item: Item[C]): void
  remove(collection: Collection, id: string): void
  updateSettings(patch: Partial<Omit<Settings, 'id' | 'updatedAt'>>): void
  session: Session | null
  syncStatus: SyncStatus
  syncError: string | null
  syncNow(): void
}

const StoreContext = createContext<Store | null>(null)

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return mergeStates(DEFAULT_STATE, JSON.parse(raw) as AppState)
  } catch {
    // Corrupt or unavailable storage: start fresh.
  }
  return DEFAULT_STATE
}

export function newId(): string {
  return crypto.randomUUID()
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const [session, setSession] = useState<Session | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(supabase ? 'signed-out' : 'local-only')
  const [syncError, setSyncError] = useState<string | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage full or blocked; the in-memory state still works.
    }
  }, [state])

  useEffect(() => onSessionChange(setSession), [])

  const userId = session?.user.id
  const syncing = useRef(false)

  const sync = useCallback(async () => {
    if (!userId || syncing.current) return
    syncing.current = true
    setSyncStatus('syncing')
    try {
      const remote = await pullState(userId)
      const merged = remote ? mergeStates(stateRef.current, remote) : stateRef.current
      if (!sameState(merged, stateRef.current)) setState(merged)
      if (!remote || !sameState(merged, remote)) await pushState(userId, merged)
      setSyncStatus('synced')
      setSyncError(null)
    } catch (err) {
      setSyncStatus('error')
      setSyncError(err instanceof Error ? err.message : String(err))
    } finally {
      syncing.current = false
    }
  }, [userId])

  // Initial sync, realtime updates from other devices, and re-sync on focus.
  useEffect(() => {
    if (!userId) {
      setSyncStatus(supabase ? 'signed-out' : 'local-only')
      return
    }
    void sync()
    const unsubscribe = subscribeState(userId, () => void sync())
    const onFocus = () => void sync()
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onFocus)
    return () => {
      unsubscribe()
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onFocus)
    }
  }, [userId, sync])

  // Push local edits shortly after they happen.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!userId) return
    const t = setTimeout(() => void sync(), 1500)
    return () => clearTimeout(t)
  }, [state, userId, sync])

  const upsert = useCallback(<C extends Collection>(collection: C, item: Item[C]) => {
    setState((s) => {
      const stamped = { ...item, updatedAt: Date.now() }
      const list = s[collection] as Item[C][]
      const exists = list.some((x) => x.id === item.id)
      return { ...s, [collection]: exists ? list.map((x) => (x.id === item.id ? stamped : x)) : [...list, stamped] }
    })
  }, [])

  // Soft delete (tombstone) so the deletion propagates to other devices.
  const remove = useCallback((collection: Collection, id: string) => {
    setState((s) => ({
      ...s,
      [collection]: s[collection].map((x) => (x.id === id ? { ...x, deleted: true, updatedAt: Date.now() } : x)),
    }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Omit<Settings, 'id' | 'updatedAt'>>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch, updatedAt: Date.now() } }))
  }, [])

  const value: Store = {
    state,
    upsert,
    remove,
    updateSettings,
    session,
    syncStatus,
    syncError,
    syncNow: () => void sync(),
  }
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside StoreProvider')
  return store
}

/** Live (non-deleted) items of a collection. */
export function useCollection<C extends Collection>(collection: C): Item[C][] {
  const { state } = useStore()
  return (state[collection] as Item[C][]).filter((x) => !x.deleted)
}
