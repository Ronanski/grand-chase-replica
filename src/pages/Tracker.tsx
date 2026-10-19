import { useState, type FormEvent } from 'react'
import { newId, useCollection, useStore } from '../lib/store'
import { formatCountdown, nextReset, periodStart } from '../lib/reset'
import type { Period } from '../lib/types'
import { useNow } from '../lib/useNow'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function TaskList({ period, now }: { period: Period; now: number }) {
  const { state, upsert, remove } = useStore()
  const tasks = useCollection('tasks').filter((t) => t.period === period)
  const [name, setName] = useState('')
  const start = periodStart(period, state.settings, now)
  const done = tasks.filter((t) => (t.lastDoneAt ?? 0) >= start).length

  function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    upsert('tasks', { id: newId(), name: name.trim(), period, updatedAt: 0 })
    setName('')
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>{period === 'daily' ? 'Dailies' : 'Weeklies'}</h2>
        <span className="muted">
          {done}/{tasks.length} · resets in {formatCountdown(nextReset(period, state.settings, now) - now)}
        </span>
      </header>
      <ul className="checklist">
        {tasks.map((t) => {
          const isDone = (t.lastDoneAt ?? 0) >= start
          return (
            <li key={t.id} className={isDone ? 'done' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => upsert('tasks', { ...t, lastDoneAt: isDone ? undefined : Date.now() })}
                />
                {t.name}
              </label>
              <button className="icon-btn" aria-label={`Delete ${t.name}`} onClick={() => remove('tasks', t.id)}>
                ×
              </button>
            </li>
          )
        })}
      </ul>
      <form className="inline-form" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Add ${period} task…`} />
        <button type="submit">Add</button>
      </form>
    </section>
  )
}

function Events({ now }: { now: number }) {
  const { upsert, remove } = useStore()
  const events = useCollection('events').sort((a, b) => a.endsAt - b.endsAt)
  const [name, setName] = useState('')
  const [endsAt, setEndsAt] = useState('')

  function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !endsAt) return
    upsert('events', { id: newId(), name: name.trim(), endsAt: new Date(endsAt).getTime(), updatedAt: 0 })
    setName('')
    setEndsAt('')
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>Events</h2>
      </header>
      {events.length === 0 && <p className="muted">No events yet. Add one with its end date.</p>}
      <ul className="checklist">
        {events.map((ev) => (
          <li key={ev.id} className={ev.endsAt < now ? 'done' : ''}>
            <span>
              {ev.name}
              <span className="muted"> · {ev.endsAt < now ? 'ended' : `ends in ${formatCountdown(ev.endsAt - now)}`}</span>
            </span>
            <button className="icon-btn" aria-label={`Delete ${ev.name}`} onClick={() => remove('events', ev.id)}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Event name…" />
        <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        <button type="submit">Add</button>
      </form>
    </section>
  )
}

function ResetSettings() {
  const { state, updateSettings } = useStore()
  const { resetHourUtc, weeklyResetDay } = state.settings
  return (
    <section className="card">
      <header className="card-head">
        <h2>Reset time</h2>
      </header>
      <p className="muted">Match these to the in-game server reset.</p>
      <div className="inline-form">
        <label>
          Daily reset (UTC hour){' '}
          <input
            type="number"
            min={0}
            max={23}
            value={resetHourUtc}
            onChange={(e) => updateSettings({ resetHourUtc: Math.min(23, Math.max(0, Number(e.target.value))) })}
          />
        </label>
        <label>
          Weekly reset{' '}
          <select value={weeklyResetDay} onChange={(e) => updateSettings({ weeklyResetDay: Number(e.target.value) })}>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}

export function Tracker() {
  const now = useNow()
  return (
    <div className="grid-2">
      <TaskList period="daily" now={now} />
      <TaskList period="weekly" now={now} />
      <Events now={now} />
      <ResetSettings />
    </div>
  )
}
