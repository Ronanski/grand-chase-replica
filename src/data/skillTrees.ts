import type { SkillTree } from '../lib/types'

// The planner is data-driven: add real trees here as they are transcribed from
// the game. The tree below is a SAMPLE to demonstrate the planner and does not
// reflect any real character's skills.
export const skillTrees: SkillTree[] = [
  {
    id: 'sample',
    characterId: 'elesis',
    name: 'Sample tree (not real game data)',
    maxSp: 10,
    sample: true,
    nodes: [
      { id: 'a', name: 'Basic Combo+', description: 'Extends the basic combo.', cost: 1, maxRank: 1, requires: [], row: 0, col: 1 },
      { id: 'b', name: 'Dash Attack', description: 'Unlocks an attack while dashing.', cost: 1, maxRank: 2, requires: ['a'], row: 1, col: 0 },
      { id: 'c', name: 'Guard', description: 'Block incoming attacks.', cost: 2, maxRank: 1, requires: ['a'], row: 1, col: 2 },
      { id: 'd', name: 'Skill 1', description: 'First MP skill.', cost: 2, maxRank: 3, requires: ['b'], row: 2, col: 0 },
      { id: 'e', name: 'Counter', description: 'Counterattack after guarding.', cost: 2, maxRank: 1, requires: ['c'], row: 2, col: 2 },
      { id: 'f', name: 'Ultimate', description: 'Strong finisher.', cost: 3, maxRank: 1, requires: ['d', 'e'], row: 3, col: 1 },
    ],
  },
]

export function getTree(id: string): SkillTree | undefined {
  return skillTrees.find((t) => t.id === id)
}
