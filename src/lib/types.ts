// Every user-owned record carries id/updatedAt/deleted so that two devices can
// edit offline and be merged later (last write wins, per record).
export interface SyncMeta {
  id: string
  updatedAt: number
  deleted?: boolean
}

export type Period = 'daily' | 'weekly'

export interface Task extends SyncMeta {
  name: string
  period: Period
  lastDoneAt?: number
}

export interface GameEvent extends SyncMeta {
  name: string
  endsAt: number
  notes?: string
}

export interface Build extends SyncMeta {
  name: string
  treeId: string
  allocation: Record<string, number>
}

export interface Settings extends SyncMeta {
  /** Hour (0-23, UTC) when dailies reset. */
  resetHourUtc: number
  /** Day of week (0 = Sunday) when weeklies reset. */
  weeklyResetDay: number
}

export interface AppState {
  tasks: Task[]
  events: GameEvent[]
  builds: Build[]
  settings: Settings
}

export type Collection = 'tasks' | 'events' | 'builds'

// ---- Static game data ----

export interface Character {
  id: string
  name: string
  role: string
  /** Job names in order: 1st job through 4th job. Empty when not yet filled in. */
  jobs: string[]
  description: string
  verified: boolean
}

export interface Dungeon {
  id: string
  name: string
  continent: string
  recommendedLevel: number | null
  bosses: string[]
  notableDrops: string[]
  tips: string
  verified: boolean
}

export interface SkillNode {
  id: string
  name: string
  description: string
  /** SP cost per rank. */
  cost: number
  maxRank: number
  requires: string[]
  row: number
  col: number
}

export interface SkillTree {
  id: string
  characterId: string
  name: string
  maxSp: number
  nodes: SkillNode[]
  sample?: boolean
}
