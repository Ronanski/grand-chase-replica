import type { AppState, Collection, SyncMeta } from './types'

const COLLECTIONS: Collection[] = ['tasks', 'events', 'builds']

function mergeList<T extends SyncMeta>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>()
  for (const item of [...a, ...b]) {
    const existing = byId.get(item.id)
    if (!existing || item.updatedAt > existing.updatedAt) byId.set(item.id, item)
  }
  return [...byId.values()]
}

export function mergeStates(local: AppState, remote: AppState): AppState {
  const merged = { ...local }
  for (const key of COLLECTIONS) {
    // Each collection holds a different record type; mergeList is generic over SyncMeta.
    ;(merged as Record<Collection, SyncMeta[]>)[key] = mergeList<SyncMeta>(local[key] ?? [], remote[key] ?? [])
  }
  merged.settings =
    remote.settings && remote.settings.updatedAt > local.settings.updatedAt ? remote.settings : local.settings
  return merged
}

export function sameState(a: AppState, b: AppState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
