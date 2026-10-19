import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { characters, getCharacter } from '../data/characters'
import { skillTrees } from '../data/skillTrees'

const JOB_LABELS = ['1st job', '2nd job', '3rd job', '4th job']

export function Characters() {
  return (
    <div className="grid-4">
      {characters.map((c) => (
        <Link key={c.id} to={`/characters/${c.id}`} className="card char-card">
          <Avatar id={c.id} name={c.name} />
          <strong>{c.name}</strong>
          <span className="muted">{c.role}</span>
        </Link>
      ))}
    </div>
  )
}

export function CharacterDetail() {
  const { id = '' } = useParams()
  const c = getCharacter(id)
  if (!c) return <p>Character not found. <Link to="/characters">Back</Link></p>
  const trees = skillTrees.filter((t) => t.characterId === c.id)

  return (
    <div className="card detail">
      <Link to="/characters" className="muted">← All characters</Link>
      <header className="detail-head">
        <Avatar id={c.id} name={c.name} size={128} />
        <div>
          <h2>
            {c.name} {!c.verified && <span className="badge">needs review</span>}
          </h2>
          <p className="muted">{c.role}</p>
          {c.description && <p>{c.description}</p>}
        </div>
      </header>
      <h3>Jobs</h3>
      {c.jobs.length ? (
        <ol className="jobs">
          {c.jobs.map((job, i) => (
            <li key={job}>
              <span className="muted">{JOB_LABELS[i]}</span> {job}
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">Not filled in yet.</p>
      )}
      <h3>Skill trees</h3>
      {trees.length ? (
        <ul>
          {trees.map((t) => (
            <li key={t.id}>
              <Link to={`/planner?tree=${t.id}`}>{t.name}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No skill tree data yet.</p>
      )}
    </div>
  )
}
