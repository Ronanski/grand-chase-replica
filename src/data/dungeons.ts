import type { Dungeon } from '../lib/types'

// Community-maintained skeleton: levels, drops and tips are intentionally left
// blank until checked in-game. Set `verified: true` once an entry is confirmed.
const blank = { recommendedLevel: null, notableDrops: [], tips: '', verified: false }

export const dungeons: Dungeon[] = [
  { id: 'trial-forest', name: 'Trial Forest', continent: 'Bermesiah', bosses: [], ...blank },
  { id: 'trial-tower', name: 'Trial Tower', continent: 'Bermesiah', bosses: [], ...blank },
  { id: 'orc-temple', name: 'Orc Temple', continent: 'Bermesiah', bosses: [], ...blank },
  { id: 'gorgos-dungeon', name: "Gorgos' Dungeon", continent: 'Bermesiah', bosses: ['Gorgos'], ...blank },
  { id: 'elven-forest', name: 'Elven Forest', continent: 'Bermesiah', bosses: [], ...blank },
  { id: 'marsh-of-oblivion', name: 'Marsh of Oblivion', continent: 'Bermesiah', bosses: [], ...blank },
  { id: 'forgotten-city', name: 'Forgotten City', continent: 'Bermesiah', bosses: [], ...blank },
  { id: 'gaikoz-castle', name: "Gaikoz's Castle", continent: 'Bermesiah', bosses: ['Gaikoz'], ...blank },
  { id: 'kazeaze-castle', name: "Kaze'aze's Castle", continent: 'Bermesiah', bosses: ["Kaze'aze"], ...blank },
]
