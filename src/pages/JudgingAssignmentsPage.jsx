import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, Navigate } from 'react-router-dom'
import { signOut, updatePassword } from 'firebase/auth'
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore'
import { auth, db, firebaseEnabled } from '../lib/firebase.js'
import { useAuthState } from './AdminPage.jsx'
import SoundToggleButton from '../components/SoundToggleButton.jsx'
import { playSuccessChime, playErrorSound } from '../lib/sounds.js'
import { updateUserHandle, ensureUserProfile } from '../lib/users.js'

export default function JudgingAssignmentsPage() {
  const user = useAuthState()
  const [hackathons, setHackathons] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newHandleInput, setNewHandleInput] = useState('')
  const [isUpdatingHandle, setIsUpdatingHandle] = useState(false)

  useEffect(() => {
    if (!firebaseEnabled || !db || !user?.uid) return
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data())
      } else {
        // Auto-Heal: This legacy or pre-logged-in user lacks a profile. Boot it instantly!
        ensureUserProfile(user.uid, user.email || '', user.displayName || '')
          .catch(err => console.error("Auto-heal handle creation failed:", err))
      }
    })
    return () => unsub()
  }, [user?.uid, user?.email, user?.displayName])

  // Automatically clear toast messages after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  useEffect(() => {
    if (!firebaseEnabled || !db || !user?.uid) {
      setLoading(false)
      return undefined
    }

    const q = query(collection(db, 'hackathons'), where('judges', 'array-contains', user.uid))
    const unsub = onSnapshot(q, (snap) => {
      const data = []
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() })
      })
      data.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      setHackathons(data)
      setLoading(false)
    })

    return () => unsub()
  }, [user?.uid])

  const handleChangeHandle = () => {
    setNewHandleInput(profile?.handle || '')
    setIsModalOpen(true)
  }

  const submitNewHandle = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const currentHandle = profile?.handle || 'name#1234'
    const clean = newHandleInput.trim().replace(/\s/g, '')
    
    if (!clean || clean === currentHandle) {
      setIsModalOpen(false)
      return
    }
    
    if (!/^[a-zA-Z0-9_-]+#[0-9]{4}$/.test(clean)) {
      playErrorSound()
      setToast({ type: 'error', message: "Format invalid! Must contain username + '#' + exactly 4 numeric digits (e.g., dev_isha#9080)" })
      return
    }

    setIsUpdatingHandle(true)
    try {
      setToast({ type: 'success', message: "Securing unique handle namespace..." })
      await updateUserHandle(user.uid, clean)
      playSuccessChime()
      setToast({ type: 'success', message: "User handle successfully updated!" })
      setIsModalOpen(false)
    } catch (err) {
      playErrorSound()
      setToast({ type: 'error', message: err.message })
    } finally {
      setIsUpdatingHandle(false)
    }
  }

  if (!firebaseEnabled) {
    return <div className="p-10 text-neo-black font-hero text-3xl bg-neo-white min-h-screen">Firebase not configured.</div>
  }

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-neo-white flex items-center justify-center">
        <div className="font-hero text-5xl uppercase animate-pulse text-neo-black">LOADING...</div>
      </div>
    )
  }

  if (user === null) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-neo-white text-neo-black font-base relative overflow-x-hidden flex flex-col">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px] pointer-events-none"></div>

      <nav className="w-full flex flex-col sm:flex-row items-center justify-between px-3 sm:px-6 py-4 border-b-4 border-neo-black bg-neo-white relative z-20 gap-4 sm:gap-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-neo-yellow/10 rounded-full blur-3xl pointer-events-none"></div>
        <Link to="/" className="font-hero text-2xl lg:text-3xl font-black tracking-widest flex items-center gap-2 hover:scale-105 transition-transform">
            <img src="/Lead-X.png" alt="LeadX Logo" className="h-12 lg:h-16 drop-shadow-[2px_2px_0_#111]" />
        </Link>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link to="/dashboard" className="font-black text-xs sm:text-sm uppercase tracking-wide sm:tracking-widest border-4 border-neo-black bg-white px-3 sm:px-6 py-3 shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            &larr; ORGANIZER DASH
          </Link>
          <span className="font-black uppercase text-xs tracking-[0.2em] bg-neo-yellow border-4 border-neo-black px-4 py-2 shadow-[4px_4px_0_#111] hidden sm:inline-block">
            {user.email}
          </span>
          <span className="font-black uppercase text-xs tracking-[0.2em] bg-white border-4 border-neo-black px-4 py-2 shadow-[4px_4px_0_#111] hidden md:flex items-center gap-2">
            {profile?.handle || 'LOADING PROFILE...'}
            <button onClick={() => { if (profile?.handle) { navigator.clipboard.writeText(profile.handle); playSuccessChime(); setToast({ type: 'success', message: 'Social Handle copied!' }) } }} title="Copy Social Handle" className="hover:text-zinc-500 transition-colors active:scale-95">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </span>
          <button onClick={handleChangeHandle} className="font-black text-xs sm:text-sm uppercase tracking-wide sm:tracking-widest border-4 border-neo-black bg-white text-neo-black px-3 sm:px-6 py-3 shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            CHANGE HANDLE
          </button>
          <SoundToggleButton className="hidden sm:flex" />
          <button onClick={() => signOut(auth)} className="font-black text-xs sm:text-sm uppercase tracking-wide sm:tracking-widest border-4 border-neo-black bg-neo-black text-white px-3 sm:px-6 py-3 shadow-[4px_4px_0_#FFD600] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            SIGN OUT
          </button>
        </div>
      </nav>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-auto max-w-7xl px-4 py-12 lg:py-20 relative z-10 w-full flex-1">
        
        <div className="flex flex-col gap-4 mb-16">
          <div className="border-4 border-neo-black px-4 py-1.5 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] inline-flex items-center gap-3 bg-neo-black text-white shadow-[4px_4px_0_#FFD600] w-max">
            <span className="w-3 h-3 rounded-full border-4 border-white bg-neo-yellow"></span>
            EVALUATOR DASHBOARD
          </div>
          <h1 className="font-hero text-[2.8rem] sm:text-[6rem] lg:text-[8rem] tracking-tight text-neo-black uppercase leading-[0.9] sm:leading-[0.85] flex flex-col items-start mt-4">
            <span className="block">JUDGING</span>
            <span className="inline-block bg-neo-yellow border-[4px] sm:border-[6px] border-neo-black px-4 sm:px-8 my-2 sm:my-4 shadow-[8px_8px_0_#111] lg:shadow-[12px_12px_0_#111] -rotate-1">
              ASSIGNMENTS
            </span>
          </h1>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
           {loading ? (
             <div className="p-12 border-4 border-neo-black bg-white flex items-center justify-center font-hero text-3xl text-neo-black uppercase tracking-widest animate-pulse min-h-[300px] shadow-[8px_8px_0_#111]">LOADING...</div>
           ) : hackathons.length === 0 ? (
             <div className="col-span-full border-4 border-dashed border-neo-black p-16 text-center bg-white/50 shadow-[12px_12px_0_#111]">
               <div className="w-20 h-20 mx-auto bg-neo-lightgray border-4 border-neo-black rounded-full flex items-center justify-center mb-6">
                 <span className="text-3xl">📋</span>
               </div>
               <h3 className="font-hero text-4xl mb-2 uppercase text-neo-black">NO ASSIGNMENTS YET</h3>
               <p className="font-black text-xs uppercase tracking-widest text-gray-500 max-w-md mx-auto">
                 You haven't been appointed as a judge to any events. Provide your unique Social Handle to an event organizer to be granted access.
               </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="p-4 bg-neo-black border-4 border-neo-black font-mono text-xl text-neo-yellow break-all select-all cursor-text shadow-[4px_4px_0_#111]">
                    {profile?.handle || 'LOADING HANDLE...'}
                  </div>
                  <button 
                    onClick={() => { if (profile?.handle) { navigator.clipboard.writeText(profile.handle); playSuccessChime(); setToast({ type: 'success', message: 'Social Handle copied to clipboard!' }) } }} 
                    className="h-full bg-neo-yellow text-neo-black font-black text-sm border-4 border-neo-black px-6 py-4 uppercase tracking-widest hover:-translate-y-1 shadow-[4px_4px_0_#111] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    COPY
                  </button>
                </div>
               <div className="text-xs uppercase text-gray-500 font-bold tracking-widest mt-2">YOUR UNIQUE SOCIAL HANDLE (COPY THIS)</div>
             </div>
           ) : (
             hackathons.map(h => (
               <div key={h.id} className="border-4 border-neo-black bg-white p-6 sm:p-8 flex flex-col justify-between shadow-[8px_8px_0_#111] hover:shadow-[12px_12px_0_#FFD600] hover:-translate-y-2 transition-all min-h-[300px] relative group">
                 
                 <div>
                   <h3 className="font-hero text-4xl sm:text-5xl text-neo-black uppercase tracking-tight mb-4 break-words leading-none">{h.name}</h3>
                   <div className="inline-block bg-neo-black border-4 border-neo-black px-3 py-1 text-neo-yellow font-black text-[10px] font-mono uppercase tracking-[0.2em] shadow-brutal-sm">
                     EVALUATOR CLEARANCE
                   </div>
                   <div className="text-gray-500 font-black text-xs uppercase tracking-[0.2em] block mt-6">
                     Created: {h.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                   </div>
                 </div>
                 
                 <div className="flex flex-col gap-4 mt-8">
                   <Link to={`/${h.id}/judge`} className="w-full text-center bg-neo-black text-neo-white py-4 border-4 border-neo-black font-hero text-2xl uppercase tracking-[0.2em] hover:bg-neo-yellow hover:text-neo-black transition-colors shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                     JUDGE PORTAL
                   </Link>
                 </div>
               </div>
             ))
           )}
        </div>
        {toast && (
          <div className={`fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 border-4 px-4 sm:px-6 py-3 sm:py-4 font-bold shadow-brutal break-words ${toast.type==='error'?'bg-neo-red':'bg-neo-yellow text-neo-white'}`}>
            {toast.message}
          </div>
        )}

        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsModalOpen(false)}
              ></motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white border-4 border-neo-black p-8 w-full max-w-lg shadow-[12px_12px_0_#111] z-10"
              >
                <div className="border-4 border-neo-black px-4 py-1.5 font-black text-xs uppercase tracking-[0.2em] inline-flex items-center gap-3 bg-neo-yellow shadow-[4px_4px_0_#111] mb-6">
                  <span className="w-2.5 h-2.5 rounded-full border-4 border-white bg-neo-black"></span>
                  HANDLE CONFIGURATION
                </div>
                <h3 className="font-hero text-4xl mb-2 uppercase text-neo-black tracking-tight leading-none">CHANGE YOUR IDENTITY.</h3>
                <p className="text-gray-600 font-bold mb-6 uppercase text-sm">🚨 IMPORTANT: You can only change your unique handle <span className="bg-neo-yellow px-1 border border-neo-black text-neo-black">ONCE EVERY 30 DAYS!</span></p>
                
                <form onSubmit={submitNewHandle} className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="font-black uppercase tracking-[0.2em] text-xs text-gray-500">NEW HANDLE</label>
                    <input
                      value={newHandleInput}
                      onChange={(e) => setNewHandleInput(e.target.value)}
                      placeholder="e.g. ashish#8930"
                      className="w-full bg-neo-white border-4 border-neo-black px-4 py-4 font-black text-xl uppercase outline-none focus:bg-white focus:shadow-[4px_4px_0_#111] transition-all"
                      disabled={isUpdatingHandle}
                    />
                    <p className="text-xs font-bold text-gray-400 mt-1 uppercase">Format: alphanumeric + '#' + exactly 4 numeric digits</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 mt-2">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isUpdatingHandle}
                      className="flex-1 bg-gray-200 border-4 border-neo-black px-6 py-4 font-black text-xl uppercase text-neo-black hover:-translate-y-1 hover:shadow-[4px_4px_0_#111] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
                    >
                      CANCEL
                    </button>
                    <button 
                      type="submit"
                      disabled={isUpdatingHandle}
                      className="flex-1 bg-neo-black border-4 border-neo-black px-6 py-4 font-black text-xl uppercase text-white hover:-translate-y-1 hover:shadow-[4px_4px_0_#FFD600] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isUpdatingHandle ? 'SAVING...' : 'CONFIRM'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  )
}
