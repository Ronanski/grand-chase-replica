import { useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import { sendLoginCode, signOut, verifyLoginCode } from '../lib/sync'

export function Account() {
  const { session, syncStatus, syncError, syncNow } = useStore()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (syncStatus === 'local-only') {
    return (
      <section className="card">
        <h2>Sync is off</h2>
        <p>
          Your data is saved on this device only. To sync between the web app and desktop app, set{' '}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> and rebuild. See the README.
        </p>
      </section>
    )
  }

  if (session) {
    return (
      <section className="card">
        <h2>Sync</h2>
        <p>
          Signed in as <strong>{session.user.email}</strong>. Status: <strong>{syncStatus}</strong>
        </p>
        {syncError && <p className="error">{syncError}</p>}
        <div className="inline-form">
          <button onClick={syncNow}>Sync now</button>
          <button onClick={() => void run(signOut)}>Sign out</button>
        </div>
      </section>
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!codeSent) void run(async () => {
      await sendLoginCode(email)
      setCodeSent(true)
    })
    else void run(() => verifyLoginCode(email, code.trim()))
  }

  return (
    <section className="card">
      <h2>Sign in to sync</h2>
      <p className="muted">Use the same email on your phone, browser and desktop app to keep them in sync.</p>
      <form className="inline-form" onSubmit={submit}>
        <input type="email" required value={email} disabled={codeSent} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        {codeSent && (
          <input inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code from email" />
        )}
        <button type="submit" disabled={busy}>
          {codeSent ? 'Verify' : 'Send code'}
        </button>
      </form>
      {codeSent && (
        <button className="link-btn" onClick={() => setCodeSent(false)}>
          Use a different email
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
