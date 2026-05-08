import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import { auth, firebaseEnabled } from '../lib/firebase.js'
import { useAuthState } from './AdminPage.jsx'

export default function AuthPage() {
  const user = useAuthState()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  const canSubmit = useMemo(() => email.trim() && password, [email, password])

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])

  async function handleForgotPassword() {
    if (!email.trim()) {
      setStatus({ type: 'error', message: 'PLEASE ENTER YOUR EMAIL ADDRESS FIRST' })
      return
    }
    setStatus({ type: 'loading', message: 'SENDING RESET LINK...' })
    try {
      if (!auth) throw new Error('Firebase Auth not configured')
      await sendPasswordResetEmail(auth, email.trim())
      setStatus({ type: 'success', message: 'PASSWORD RESET LINK SENT TO YOUR EMAIL' })
    } catch (err) {
      setStatus({ type: 'error', message: err?.message || 'FAILED TO SEND RESET LINK' })
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setStatus({ type: 'loading', message: isSignUp ? 'CREATING ACCOUNT...' : 'LOGGING IN...' })
    try {
      if (!auth) throw new Error('Firebase Auth not configured')
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password)
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (err) {
      setStatus({ type: 'error', message: err?.message || 'AUTHENTICATION FAILED' })
    }
  }

  if (!firebaseEnabled) {
    return <div className="min-h-screen bg-neo-white flex items-center justify-center p-8 text-neo-black font-hero text-3xl">FIREBASE NOT CONFIGURED</div>
  }

  return (
    <div className="min-h-screen bg-neo-white flex items-center justify-center p-4 sm:p-8 text-neo-black font-base relative overflow-hidden">
      
      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px] pointer-events-none"></div>

      <Link to="/" className="absolute top-6 left-6 font-hero text-2xl font-black tracking-widest flex items-center gap-2 z-20 hover:scale-105 transition-transform">
        <img src="/Lead-X.png" alt="LeadX Logo" className="h-12 drop-shadow-[2px_2px_0_#111]" />
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-white border-4 border-neo-black shadow-[12px_12px_0_#111] p-8 sm:p-12 relative z-10"
      >
        <div className="border-4 border-neo-black px-4 py-1.5 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] mb-8 inline-flex items-center gap-3 bg-neo-yellow shadow-[4px_4px_0_#111]">
          <span className="w-2.5 h-2.5 rounded-full border-4 border-neo-black bg-white"></span>
          {isSignUp ? 'NEW ORGANIZER' : 'SECURE LOGIN'}
        </div>

        <h2 className="font-hero text-5xl sm:text-6xl tracking-tight mb-8 uppercase leading-none">
          {isSignUp ? 'START' : 'WELCOME'} <br /> 
          <span className={isSignUp ? 'bg-neo-yellow px-2 border-4 border-neo-black inline-block mt-2 shadow-[6px_6px_0_#111] -rotate-2' : 'inline-block mt-2'}>{isSignUp ? 'HERE.' : 'BACK.'}</span>
        </h2>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="font-black uppercase tracking-[0.2em] text-xs text-gray-500">EMAIL ADDRESS</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="w-full border-4 border-neo-black bg-neo-white px-4 py-4 font-black text-xl outline-none focus:bg-white focus:-translate-y-1 focus:shadow-brutal transition-all placeholder:text-gray-300"
              placeholder="organizer@university.edu"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <label className="font-black uppercase tracking-[0.2em] text-xs text-gray-500">PASSWORD</label>
              {!isSignUp && (
                <button type="button" onClick={handleForgotPassword} className="text-[10px] font-black uppercase tracking-widest text-neo-blue hover:text-neo-black transition-colors underline underline-offset-4">
                  FORGOT PASSWORD?
                </button>
              )}
            </div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full border-4 border-neo-black bg-neo-white px-4 py-4 font-black text-xl outline-none focus:bg-white focus:-translate-y-1 focus:shadow-brutal transition-all placeholder:text-gray-300"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit || status.type === 'loading'}
            className="w-full mt-6 bg-neo-black border-4 border-neo-black px-6 py-5 font-hero text-3xl tracking-[0.2em] uppercase text-neo-white transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[6px_6px_0_#FFD600] disabled:opacity-50 disabled:hover:-translate-x-0 disabled:hover:-translate-y-0 disabled:hover:shadow-[6px_6px_0_#FFD600] group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-neo-yellow translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
            <span className="relative z-10 group-hover:text-neo-black transition-colors">{status.type === 'loading' ? 'PROCESSING...' : (isSignUp ? 'CREATE ACCOUNT' : 'LOG IN')}</span>
          </button>
        </form>

        <AnimatePresence>
          {status.type !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-6 border-4 border-neo-black px-4 py-4 font-black uppercase tracking-widest text-sm shadow-brutal-sm ${
                status.type === 'error'
                  ? 'bg-neo-red text-white'
                  : 'bg-green-400 text-neo-black'
              }`}
            >
              {status.message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10 pt-6 border-t-4 border-neo-black text-center">
          <button 
            type="button" 
            onClick={() => { setIsSignUp(!isSignUp); setStatus({ type: 'idle', message: '' }); }}
            className="text-sm font-black uppercase tracking-[0.1em] text-gray-500 hover:text-neo-black hover:underline underline-offset-8 transition-all"
          >
            {isSignUp ? "ALREADY HAVE AN ACCOUNT? LOG IN" : "NEED AN ACCOUNT? SIGN UP"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

