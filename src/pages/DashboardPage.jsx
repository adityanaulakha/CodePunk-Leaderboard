import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { signOut, updatePassword } from 'firebase/auth'
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, setDoc, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore'
import { auth, db, firebaseEnabled } from '../lib/firebase.js'
import { useAuthState } from './AdminPage.jsx' // reusing the auth hook
import { CONFIG_DOC } from '../lib/teams.js'

export default function DashboardPage() {
  const user = useAuthState()
  const navigate = useNavigate()
  const [hackathons, setHackathons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newHackathonName, setNewHackathonName] = useState('')
  const [newHackathonSlug, setNewHackathonSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseEnabled || !db || !user?.uid) {
      setLoading(false)
      return undefined
    }

    const q = query(collection(db, 'hackathons'), where('ownerId', '==', user.uid))
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

  const handleCreateHackathon = async (e) => {
    e.preventDefault()
    if (!newHackathonName.trim()) return
    const slug = newHackathonSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    if (!slug) {
      setError('PLEASE SPECIFY A CUSTOM EVENT CODE / SLUG')
      return
    }
    setBusy(true)
    setError('')
    try {
      const existingDoc = await getDoc(doc(db, 'hackathons', slug))
      if (existingDoc.exists()) {
        setError('THIS EVENT CODE IS ALREADY TAKEN. PLEASE CHOOSE ANOTHER.')
        setBusy(false)
        return
      }

      await setDoc(doc(db, 'hackathons', slug), {
        name: newHackathonName.trim(),
        ownerId: user.uid,
        createdAt: serverTimestamp()
      })
      
      await setDoc(doc(db, 'hackathons', slug, 'settings', CONFIG_DOC), {
        tracks: [],
        rounds: {},
        bonuses: {},
        activeJudges: [],
        lockedRounds: [],
        rubrics: {},
        isFrozen: false,
        updatedAt: serverTimestamp()
      })

      setShowCreate(false)
      setNewHackathonName('')
      setNewHackathonSlug('')
      navigate(`/${slug}/admin`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteHackathon = (id, name) => {
    setModal({
      title: "PERMANENTLY DELETE EVENT?",
      message: `🚨 DANGER: PERMANENTLY DELETE EVENT "${name.toUpperCase()}"?\n\nThis will instantly delete the event document, judge registries, team details, and all scores from the database. This is completely irreversible.`,
      type: "prompt",
      defaultValue: "",
      onConfirm: async (val) => {
        if (val !== name) {
          setModal({
            title: "VERIFICATION FAILED",
            message: "The entered event name did not match. Deletion cancelled.",
            type: "alert",
            onConfirm: () => {}
          });
          return;
        }
        setBusy(true);
        try {
          await deleteDoc(doc(db, 'hackathons', id));
          setModal({
            title: "EVENT DELETED",
            message: `Successfully deleted "${name}" from your workspace.`,
            type: "alert",
            onConfirm: () => {}
          });
        } catch (err) {
          setModal({
            title: "ERROR",
            message: "Failed to delete event: " + err.message,
            type: "alert",
            onConfirm: () => {}
          });
        } finally {
          setBusy(false);
        }
      }
    });
  }

  const handleEditHackathon = (id, currentName) => {
    setModal({
      title: "RENAME EVENT",
      message: "Enter new event designation:",
      type: "prompt",
      defaultValue: currentName,
      onConfirm: async (newName) => {
        if (newName && newName.trim() && newName.trim() !== currentName) {
          try {
            await updateDoc(doc(db, 'hackathons', id), {
              name: newName.trim()
            });
          } catch (err) {
            setModal({
              title: "ERROR",
              message: "Failed to update name: " + err.message,
              type: "alert",
              onConfirm: () => {}
            });
          }
        }
      }
    });
  }

  const handleChangePassword = () => {
    setModal({
      title: "CHANGE PASSWORD",
      message: "Enter your new password (minimum 6 characters):",
      type: "prompt",
      defaultValue: "",
      onConfirm: async (newPassword) => {
        if (!newPassword) return;
        if (newPassword.length < 6) {
          setModal({
            title: "PASSWORD TOO SHORT",
            message: "Password must be at least 6 characters.",
            type: "alert",
            onConfirm: () => {}
          });
          return;
        }
        try {
          await updatePassword(auth.currentUser, newPassword);
          setModal({
            title: "PASSWORD UPDATED",
            message: "Password updated successfully!",
            type: "alert",
            onConfirm: () => {}
          });
        } catch (err) {
          if (err.code === 'auth/requires-recent-login') {
            setModal({
              title: "RE-AUTHENTICATION REQUIRED",
              message: "For security reasons, please log out and log back in to change your password.",
              type: "alert",
              onConfirm: () => {}
            });
          } else {
            setModal({
              title: "ERROR",
              message: "Failed to update password: " + err.message,
              type: "alert",
              onConfirm: () => {}
            });
          }
        }
      }
    });
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
    <div className="min-h-screen bg-neo-white text-neo-black font-base relative overflow-hidden">
      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px] pointer-events-none"></div>

      {/* Nav */}
      <nav className="w-full flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b-4 border-neo-black bg-neo-white relative z-20 gap-4 sm:gap-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-neo-yellow/10 rounded-full blur-3xl pointer-events-none"></div>
        <Link to="/" className="font-hero text-2xl lg:text-3xl font-black tracking-widest flex items-center gap-2 hover:scale-105 transition-transform">
          <img src="/Lead-X.png" alt="LeadX Logo" className="h-12 lg:h-16 drop-shadow-[2px_2px_0_#111]" />
        </Link>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link to="/assignments" className="font-black text-sm uppercase tracking-widest border-4 border-neo-black bg-white px-6 py-3 shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            JUDGE PORTAL
          </Link>
          <span className="font-black uppercase text-xs tracking-[0.2em] bg-neo-yellow border-4 border-neo-black px-4 py-2 shadow-[4px_4px_0_#111] hidden sm:inline-block">
            {user.email}
          </span>
          <button onClick={handleChangePassword} className="font-black text-sm uppercase tracking-widest border-4 border-neo-black bg-white text-neo-black px-6 py-3 shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            CHANGE PWD
          </button>
          <button onClick={() => signOut(auth)} className="font-black text-sm uppercase tracking-widest border-4 border-neo-black bg-neo-black text-white px-6 py-3 shadow-[4px_4px_0_#FFD600] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
            SIGN OUT
          </button>
        </div>
      </nav>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-auto max-w-7xl px-4 py-12 lg:py-20 relative z-10">
        
        <div className="flex flex-col gap-4 mb-16">
          <div className="border-4 border-neo-black px-4 py-1.5 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] inline-flex items-center gap-3 bg-white shadow-[4px_4px_0_#111] w-max">
            <span className="w-3 h-3 rounded-full border-4 border-neo-black bg-neo-yellow"></span>
            ORGANIZER DASHBOARD
          </div>
          <h1 className="font-hero text-[4rem] sm:text-[6rem] lg:text-[8rem] tracking-tight text-neo-black uppercase leading-[0.85] flex flex-col items-start mt-4">
            <span className="block">COMMAND</span>
            <span className="inline-block bg-neo-yellow border-[4px] sm:border-[6px] border-neo-black px-4 sm:px-8 my-2 sm:my-4 shadow-[8px_8px_0_#111] lg:shadow-[12px_12px_0_#111] rotate-1">
              CENTER
            </span>
          </h1>
        </div>

        {/* Create Modal overlay */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="border-4 border-neo-black bg-white p-8 sm:p-12 shadow-[16px_16px_0_#FFD600] w-full max-w-xl relative">
              <button onClick={() => setShowCreate(false)} className="absolute -top-6 -right-6 w-14 h-14 bg-white border-4 border-neo-black text-neo-black font-black text-2xl flex items-center justify-center hover:bg-neo-yellow transition-colors shadow-[4px_4px_0_#111]">
                X
              </button>
              
              <div className="border-4 border-neo-black px-4 py-1.5 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] mb-6 inline-flex items-center gap-3 bg-neo-yellow">
                <span className="w-2 h-2 rounded-full border-2 border-neo-black bg-white"></span>
                INITIALIZE
              </div>
              <h2 className="font-hero text-5xl sm:text-6xl uppercase tracking-tight mb-8 text-neo-black leading-none">NEW EVENT</h2>
              
              <form onSubmit={handleCreateHackathon} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-black uppercase tracking-[0.2em] text-xs text-gray-500">EVENT DESIGNATION</label>
                  <input 
                    autoFocus
                    value={newHackathonName} 
                    onChange={e => setNewHackathonName(e.target.value)} 
                    className="w-full border-4 border-neo-black bg-neo-white px-4 py-5 font-black text-xl outline-none focus:bg-white focus:-translate-y-1 focus:shadow-brutal transition-all placeholder:text-gray-300" 
                    placeholder="E.g., Hacktoberfest 2024" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-black uppercase tracking-[0.2em] text-xs text-gray-500">CUSTOM EVENT CODE / SLUG (URL)</label>
                  <input 
                    value={newHackathonSlug} 
                    onChange={e => setNewHackathonSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))} 
                    className="w-full border-4 border-neo-black bg-neo-white px-4 py-5 font-black text-xl outline-none focus:bg-white focus:-translate-y-1 focus:shadow-brutal transition-all placeholder:text-gray-300" 
                    placeholder="E.g., build-sprint" 
                  />
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">
                    Your public link will be: leadx.app/{newHackathonSlug || 'your-code'}
                  </span>
                </div>
                {error && <div className="text-white font-black text-xs uppercase tracking-widest border-4 border-neo-black bg-neo-red p-4 shadow-[4px_4px_0_#111]">{error}</div>}
                <button disabled={busy} className="w-full mt-4 bg-neo-black border-4 border-neo-black px-6 py-5 font-hero text-3xl uppercase tracking-[0.2em] text-neo-white shadow-[6px_6px_0_#FFD600] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50">
                  {busy ? 'PROCESSING...' : 'CREATE & ENTER'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
           {/* Create New Card */}
           <button onClick={() => setShowCreate(true)} className="flex flex-col items-center justify-center p-12 border-4 border-dashed border-neo-black bg-neo-white hover:bg-neo-yellow hover:border-solid group transition-all min-h-[300px] shadow-[8px_8px_0_#111] hover:-translate-y-2 hover:shadow-[12px_12px_0_#111]">
              <div className="w-20 h-20 rounded-full border-4 border-neo-black bg-white flex items-center justify-center font-black text-5xl text-neo-black group-hover:scale-110 transition-transform mb-6 shadow-[4px_4px_0_#111]">+</div>
              <span className="font-hero text-3xl sm:text-4xl uppercase tracking-widest text-neo-black">CREATE EVENT</span>
           </button>

           {/* Event List */}
           {loading ? (
             <div className="p-12 border-4 border-neo-black bg-white flex items-center justify-center font-hero text-3xl text-neo-black uppercase tracking-widest animate-pulse min-h-[300px] shadow-[8px_8px_0_#111]">LOADING...</div>
           ) : (
             hackathons.map(h => (
               <div key={h.id} className="border-4 border-neo-black bg-white p-6 sm:p-8 flex flex-col justify-between shadow-[8px_8px_0_#111] hover:shadow-[12px_12px_0_#FFD600] hover:-translate-y-2 transition-all min-h-[300px] relative group">
                 
                 <div>
                   <div className="flex justify-between items-start mb-4 gap-4">
                     <h3 className="font-hero text-4xl sm:text-5xl text-neo-black uppercase tracking-tight break-words leading-none flex-1">{h.name}</h3>
                     <button onClick={() => handleEditHackathon(h.id, h.name)} className="bg-neo-white border-2 border-neo-black p-2 shadow-brutal-sm hover:bg-neo-yellow transition-colors shrink-0" title="Edit Event Name">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                     </button>
                   </div>
                   <div className="inline-block bg-white border-4 border-neo-black px-3 py-1 text-neo-black font-black text-[10px] font-mono uppercase tracking-[0.2em] shadow-brutal-sm">
                     ID: {h.id}
                   </div>
                   <div className="text-gray-500 font-black text-xs uppercase tracking-[0.2em] block mt-6">
                     Created: {h.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                   </div>
                 </div>
                 
                 <div className="flex flex-col gap-4 mt-8">
                   <Link to={`/${h.id}/admin`} className="w-full text-center bg-neo-black text-neo-white py-4 border-4 border-neo-black font-hero text-2xl uppercase tracking-[0.2em] hover:bg-neo-yellow hover:text-neo-black transition-colors shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                     ADMIN PANEL
                   </Link>
                   <div className="flex gap-4">
                     <Link to={`/${h.id}`} className="flex-1 text-center bg-white text-neo-black py-3 border-4 border-neo-black font-hero text-xl uppercase tracking-[0.2em] hover:bg-neo-lightgray transition-colors shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                       PUBLIC
                     </Link>
                     <Link to={`/${h.id}/judge`} className="flex-1 text-center bg-neo-yellow text-neo-black py-3 border-4 border-neo-black font-hero text-xl uppercase tracking-[0.2em] hover:bg-white transition-colors shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                       JUDGE
                     </Link>
                   </div>
                   <button 
                     onClick={() => handleDeleteHackathon(h.id, h.name)}
                     className="w-full text-center bg-neo-red text-white py-3 border-4 border-neo-black font-hero text-xl uppercase tracking-[0.2em] hover:bg-white hover:text-neo-red transition-colors shadow-[4px_4px_0_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none cursor-pointer mt-4"
                   >
                     DELETE EVENT 🗑️
                   </button>
                 </div>
               </div>
             ))
           )}
        </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="border-4 border-neo-black bg-white p-8 shadow-[12px_12px_0_#FFD600] w-full max-w-lg relative">
            <h3 className="font-hero text-4xl uppercase text-neo-black mb-4">{modal.title}</h3>
            <p className="text-gray-600 font-bold mb-6 uppercase tracking-wider text-sm whitespace-pre-line">{modal.message}</p>
            
            {modal.type === 'prompt' && (
              <div className="flex flex-col gap-2 mb-6">
                <input 
                  type="text"
                  id="modalInput"
                  defaultValue={modal.defaultValue || ''}
                  className="w-full border-4 border-neo-black bg-neo-white px-4 py-3 font-black text-lg outline-none focus:bg-white"
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  const val = document.getElementById('modalInput')?.value;
                  modal.onConfirm(val);
                  setModal(null);
                }}
                className="flex-1 bg-neo-black text-white border-4 border-neo-black py-3 font-hero text-xl uppercase tracking-widest hover:bg-neo-yellow hover:text-neo-black transition-colors cursor-pointer"
              >
                CONFIRM ⚡
              </button>
              {modal.type !== 'alert' && (
                <button 
                  onClick={() => setModal(null)}
                  className="flex-1 bg-white text-neo-black border-4 border-neo-black py-3 font-hero text-xl uppercase tracking-widest hover:bg-neo-lightgray transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
      </motion.div>
    </div>
  )
}

