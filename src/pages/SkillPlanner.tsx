import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCharacter } from '../data/characters'
import { getTree, skillTrees } from '../data/skillTrees'
import { newId, useCollection, useStore } from '../lib/store'
import type { SkillNode, SkillTree } from '../lib/types'

type Allocation = Record<string, number>

function encode(a: Allocation): string {
  return btoa(JSON.stringify(a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decode(s: string | null): Allocation {
  if (!s) return {}
  try {
    return JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/'))) as Allocation
  } catch {
    return {}
  }
}

function spent(tree: SkillTree, a: Allocation): number {
  return tree.nodes.reduce((sum, n) => sum + (a[n.id] ?? 0) * n.cost, 0)
}

function canAdd(tree: SkillTree, a: Allocation, node: SkillNode): boolean {
  return (
    (a[node.id] ?? 0) < node.maxRank &&
    node.requires.every((r) => (a[r] ?? 0) > 0) &&
    spent(tree, a) + node.cost <= tree.maxSp
  )
}

function canRemove(tree: SkillTree, a: Allocation, node: SkillNode): boolean {
  const rank = a[node.id] ?? 0
  if (rank === 0) return false
  if (rank > 1) return true
  return !tree.nodes.some((n) => n.requires.includes(node.id) && (a[n.id] ?? 0) > 0)
}

export function SkillPlanner() {
  const [params, setParams] = useSearchParams()
  const tree = getTree(params.get('tree') ?? '') ?? skillTrees[0]
  const allocation = useMemo(() => decode(params.get('b')), [params])
  const { upsert, remove } = useStore()
  const builds = useCollection('builds').filter((b) => b.treeId === tree.id)
  const [buildName, setBuildName] = useState('')
  const [copied, setCopied] = useState(false)
  // Touch screens have no right-click, so removal also has an explicit mode.
  const [removeMode, setRemoveMode] = useState(false)

  function setAllocation(a: Allocation) {
    const clean = Object.fromEntries(Object.entries(a).filter(([, v]) => v > 0))
    setParams({ tree: tree.id, ...(Object.keys(clean).length ? { b: encode(clean) } : {}) }, { replace: true })
  }

  function change(node: SkillNode, delta: 1 | -1) {
    if (delta === 1 ? !canAdd(tree, allocation, node) : !canRemove(tree, allocation, node)) return
    setAllocation({ ...allocation, [node.id]: (allocation[node.id] ?? 0) + delta })
  }

  async function share() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function save() {
    if (!buildName.trim()) return
    upsert('builds', { id: newId(), name: buildName.trim(), treeId: tree.id, allocation, updatedAt: 0 })
    setBuildName('')
  }

  const used = spent(tree, allocation)
  const rows = Math.max(...tree.nodes.map((n) => n.row)) + 1
  const cols = Math.max(...tree.nodes.map((n) => n.col)) + 1

  return (
    <div className="grid-planner">
      <section className="card">
        <header className="card-head">
          <select value={tree.id} onChange={(e) => setParams({ tree: e.target.value })}>
            {skillTrees.map((t) => (
              <option key={t.id} value={t.id}>
                {getCharacter(t.characterId)?.name ?? t.characterId} — {t.name}
              </option>
            ))}
          </select>
          <span className={used === tree.maxSp ? 'badge' : 'muted'}>
            SP {used}/{tree.maxSp}
          </span>
        </header>
        {tree.sample && <p className="notice">This is a sample tree for testing the planner, not real game data.</p>}
        <p className="muted">
          {removeMode ? 'Tap a skill to remove a rank.' : 'Click to add a rank, right-click to remove.'}
        </p>
        <div className="skill-grid" style={{ gridTemplateRows: `repeat(${rows}, auto)`, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {tree.nodes.map((n) => {
            const rank = allocation[n.id] ?? 0
            const state = rank > 0 ? 'learned' : canAdd(tree, allocation, n) ? 'available' : 'locked'
            return (
              <button
                key={n.id}
                className={`skill ${state}`}
                style={{ gridRow: n.row + 1, gridColumn: n.col + 1 }}
                title={`${n.description}\nCost: ${n.cost} SP per rank`}
                onClick={() => change(n, removeMode ? -1 : 1)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  change(n, -1)
                }}
              >
                <strong>{n.name}</strong>
                <span>
                  {rank}/{n.maxRank} · {n.cost} SP
                </span>
              </button>
            )
          })}
        </div>
        <div className="inline-form">
          <button onClick={share}>{copied ? 'Link copied!' : 'Copy share link'}</button>
          <button onClick={() => setRemoveMode(!removeMode)}>{removeMode ? 'Done removing' : 'Remove mode'}</button>
          <button onClick={() => setAllocation({})}>Reset</button>
        </div>
      </section>
      <section className="card">
        <header className="card-head">
          <h2>Saved builds</h2>
        </header>
        {builds.length === 0 && <p className="muted">No saved builds for this tree.</p>}
        <ul className="checklist">
          {builds.map((b) => (
            <li key={b.id}>
              <button className="link-btn" onClick={() => setAllocation(b.allocation)}>
                {b.name}
              </button>
              <button className="icon-btn" aria-label={`Delete ${b.name}`} onClick={() => remove('builds', b.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="inline-form">
          <input value={buildName} onChange={(e) => setBuildName(e.target.value)} placeholder="Build name…" />
          <button onClick={save}>Save</button>
        </div>
      </section>
    </div>
  )
}
