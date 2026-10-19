import { useState } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './lib/store'
import { Account } from './pages/Account'
import { CharacterDetail, Characters } from './pages/Characters'
import { Dungeons } from './pages/Dungeons'
import { SkillPlanner } from './pages/SkillPlanner'
import { Tracker } from './pages/Tracker'

declare global {
  interface Window {
    /** Exposed by desktop/preload.cjs when running inside the Electron app. */
    gcDesktop?: { setAlwaysOnTop(on: boolean): void }
  }
}

const STATUS_LABEL = {
  'local-only': 'Offline mode',
  'signed-out': 'Not synced',
  syncing: 'Syncing…',
  synced: 'Synced',
  error: 'Sync error',
} as const

function SyncPill() {
  const { syncStatus } = useStore()
  return (
    <NavLink to="/account" className={`pill pill-${syncStatus}`}>
      {STATUS_LABEL[syncStatus]}
    </NavLink>
  )
}

function PinToggle() {
  const [pinned, setPinned] = useState(false)
  if (!window.gcDesktop) return null
  return (
    <button
      className={`pill ${pinned ? 'pill-synced' : ''}`}
      title="Keep this window above the game"
      onClick={() => {
        window.gcDesktop?.setAlwaysOnTop(!pinned)
        setPinned(!pinned)
      }}
    >
      {pinned ? 'Pinned' : 'Pin on top'}
    </button>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <header className="topbar">
          <span className="brand">GC Companion</span>
          <nav>
            <NavLink to="/tracker">Tracker</NavLink>
            <NavLink to="/dungeons">Dungeons</NavLink>
            <NavLink to="/characters">Characters</NavLink>
            <NavLink to="/planner">Skill planner</NavLink>
          </nav>
          <div className="topbar-right">
            <PinToggle />
            <SyncPill />
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/tracker" replace />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/dungeons" element={<Dungeons />} />
            <Route path="/characters" element={<Characters />} />
            <Route path="/characters/:id" element={<CharacterDetail />} />
            <Route path="/planner" element={<SkillPlanner />} />
            <Route path="/account" element={<Account />} />
          </Routes>
        </main>
        <footer className="muted">
          Unofficial fan-made app. Not affiliated with KOG or any Grand Chase publisher. Game art © its owners.
        </footer>
      </HashRouter>
    </StoreProvider>
  )
}
