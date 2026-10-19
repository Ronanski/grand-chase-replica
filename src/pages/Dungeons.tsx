import { useState } from 'react'
import { dungeons } from '../data/dungeons'

export function Dungeons() {
  const [query, setQuery] = useState('')
  const q = query.toLowerCase()
  const filtered = dungeons.filter(
    (d) => d.name.toLowerCase().includes(q) || d.bosses.some((b) => b.toLowerCase().includes(q)),
  )
  const continents = [...new Set(filtered.map((d) => d.continent))]

  return (
    <div>
      <input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dungeon or boss…" />
      {continents.map((continent) => (
        <section key={continent}>
          <h2>{continent}</h2>
          <div className="grid-3">
            {filtered
              .filter((d) => d.continent === continent)
              .map((d) => (
                <article key={d.id} className="card">
                  <header className="card-head">
                    <h3>{d.name}</h3>
                    {!d.verified && <span className="badge">needs review</span>}
                  </header>
                  <dl className="facts">
                    <dt>Level</dt>
                    <dd>{d.recommendedLevel ?? '—'}</dd>
                    <dt>Bosses</dt>
                    <dd>{d.bosses.join(', ') || '—'}</dd>
                    <dt>Drops</dt>
                    <dd>{d.notableDrops.join(', ') || '—'}</dd>
                  </dl>
                  {d.tips && <p>{d.tips}</p>}
                </article>
              ))}
          </div>
        </section>
      ))}
      {filtered.length === 0 && <p className="muted">No dungeons match “{query}”.</p>}
    </div>
  )
}
