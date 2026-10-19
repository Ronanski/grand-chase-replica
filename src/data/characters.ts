import type { Character } from '../lib/types'

// Community-maintained. Set `verified: true` once an entry has been checked
// against the live game. Art goes in public/art/characters/<id>.png.
export const characters: Character[] = [
  {
    id: 'elesis',
    name: 'Elesis',
    role: 'Melee / Swordswoman',
    jobs: ['Knight', 'Spearman', 'Sword Master', 'Savior'],
    description: 'Leader of the Grand Chase. A sturdy close-range fighter and a good first character.',
    verified: false,
  },
  {
    id: 'lire',
    name: 'Lire',
    role: 'Ranged / Archer',
    jobs: ['Archer', 'Crossbowman', 'Arch Ranger', 'Nova'],
    description: 'Elven archer who fights from range.',
    verified: false,
  },
  {
    id: 'arme',
    name: 'Arme',
    role: 'Magic / Mage',
    jobs: ['Magician', 'Alchemist', 'Warlock', 'Battle Mage'],
    description: 'Violet mage with strong area attacks and teleport.',
    verified: false,
  },
  {
    id: 'lass',
    name: 'Lass',
    role: 'Melee / Assassin',
    jobs: ['Thief', 'Assassin', 'Dark Assassin', 'Striker'],
    description: 'Fast half-demon assassin built around combos and mobility.',
    verified: false,
  },
  {
    id: 'ryan',
    name: 'Ryan',
    role: 'Melee / Druid',
    jobs: ['Druid', 'Sentinel', 'Viken', 'Vanguard'],
    description: 'Elf druid who fights with axes and nature magic.',
    verified: false,
  },
  {
    id: 'ronan',
    name: 'Ronan',
    role: 'Hybrid / Spell Knight',
    jobs: ['Spell Knight', 'Dragon Knight', 'Aegis Knight', 'Abyss Knight'],
    description: 'Royal knight who mixes swordplay with rune magic.',
    verified: false,
  },
  {
    id: 'amy',
    name: 'Amy',
    role: 'Hybrid / Support',
    jobs: [],
    description: 'Idol who switches between fighting and support modes.',
    verified: false,
  },
  {
    id: 'jin',
    name: 'Jin',
    role: 'Melee / Martial artist',
    jobs: ['Fighter', 'Shisa', 'Asura', 'Rama'],
    description: 'Martial artist who builds up Burning gauge for powerful attacks.',
    verified: false,
  },
  { id: 'sieghart', name: 'Sieghart', role: 'Melee', jobs: [], description: '', verified: false },
  { id: 'mari', name: 'Mari', role: 'Magic', jobs: [], description: '', verified: false },
  { id: 'dio', name: 'Dio', role: 'Melee', jobs: [], description: '', verified: false },
  { id: 'zero', name: 'Zero', role: 'Melee', jobs: [], description: '', verified: false },
  { id: 'ley', name: 'Ley', role: 'Magic / Summoner', jobs: [], description: '', verified: false },
  { id: 'rufus', name: 'Rufus', role: 'Ranged', jobs: [], description: '', verified: false },
  { id: 'rin', name: 'Rin', role: 'Magic', jobs: [], description: '', verified: false },
  { id: 'asin', name: 'Asin', role: 'Melee', jobs: [], description: '', verified: false },
  { id: 'lime', name: 'Lime', role: 'Melee / Support', jobs: [], description: '', verified: false },
  { id: 'edel', name: 'Edel', role: 'Melee', jobs: [], description: '', verified: false },
  { id: 'veigas', name: 'Veigas', role: 'Magic', jobs: [], description: '', verified: false },
]

export function getCharacter(id: string): Character | undefined {
  return characters.find((c) => c.id === id)
}
