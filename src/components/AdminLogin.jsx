import { useMemo, useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase.js'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  const canSubmit = useMemo(() => email.trim() && password, [email, password])

  async function onSubmit(e) {
    e.preventDefault()
    setStatus({ type: 'loading', message: 'Signing in…' })
    try {
      if (!auth) throw new Error('Firebase Auth not configured')
      await signInWithEmailAndPassword(auth, email.trim(), password)
      setStatus({ type: 'success', message: 'Signed in' })
    } catch (err) {
      setStatus({ type: 'error', message: err?.message || 'Sign in failed' })
    }
  }

  return (
    <div className="rounded-none border-4 border-spidey-blue bg-zinc-900 p-8 shadow-comic-cyan relative">
      <div className="absolute top-0 right-0 w-8 h-8 bg-gwen-pink"></div>
      <div className="text-sm font-bold uppercase tracking-[0.2em] text-gwen-cyan">Organizer Access</div>
      <h2 className="mt-2 font-hero text-4xl text-zinc-100 tracking-wide">Admin Login</h2>

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <label className="block">
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-300">Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            className="mt-2 w-full rounded-none border-2 border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-gwen-cyan focus:shadow-comic-cyan transition-all"
            placeholder="organizer@glau.ac.in"
          />
        </label>

        <label className="block">
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-300">Password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            className="mt-2 w-full rounded-none border-2 border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-gwen-cyan focus:shadow-comic-cyan transition-all"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit || status.type === 'loading'}
          className="w-full rounded-none border-4 border-zinc-900 bg-gwen-cyan px-6 py-3 font-hero text-2xl tracking-wider text-zinc-900 transition-all hover:-translate-y-1 hover:-translate-x-1 hover:bg-gwen-pink hover:shadow-comic shadow-[4px_4px_0px_#111] disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#111]"
        >
          {status.type === 'loading' ? 'Signing in…' : 'Sign in'}
        </button>

        {status.type !== 'idle' ? (
          <div
            className={[
              'rounded-none border-2 px-4 py-3 text-sm font-bold shadow-comic',
              status.type === 'error'
                ? 'border-spidey-red bg-spidey-red/20 text-spidey-red'
                : 'border-gwen-cyan bg-gwen-cyan/20 text-gwen-cyan',
            ].join(' ')}
          >
            {status.message}
          </div>
        ) : null}
      </form>
    </div>
  )
}
