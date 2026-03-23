import Papa from 'papaparse'
import { motion } from 'framer-motion'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLogin from '../components/AdminLogin.jsx'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import useTeamsRealtime from '../hooks/useTeamsRealtime.js'
import { auth, db, firebaseEnabled } from '../lib/firebase.js'
import { addTeam, bulkImportTeams, deleteTeam, updateTeamScores, updateRoundNames, setLeaderboardFrozen, triggerCelebration } from '../lib/teams.js'

const MotionDiv = motion.div

function useAuthState() {
  const [user, setUser] = useState(() => auth?.currentUser ?? null)
  useEffect(() => {
    if (!auth) return undefined
    const unsub = auth.onAuthStateChanged((u) => setUser(u))
    return () => unsub()
  }, [])
  return user
}

function useIsAdmin(user) {
  const [snapState, setSnapState] = useState({ uid: null, status: 'idle', isAdmin: false })
  useEffect(() => {
    if (!firebaseEnabled || !db || !user?.uid) return undefined
    const uid = user.uid
    const ref = doc(db, 'admins', uid)
    const unsub = onSnapshot(ref,
      (snap) => setSnapState({ uid, status: 'ready', isAdmin: snap.exists() }),
      async () => {
        try {
          const once = await getDoc(ref)
          setSnapState({ uid, status: 'ready', isAdmin: once.exists() })
        } catch {
          setSnapState({ uid, status: 'ready', isAdmin: false })
        }
      }
    )
    return () => unsub()
  }, [user?.uid])

  if (!user?.uid) return { status: 'idle', isAdmin: false }
  if (snapState.uid !== user.uid) return { status: 'loading', isAdmin: false }
  return { status: snapState.status, isAdmin: snapState.isAdmin }
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function AdminPage() {
  const user = useAuthState()
  const { status: adminStatus, isAdmin } = useIsAdmin(user)
  const { teams, roundNames, isFrozen } = useTeamsRealtime()

  const [activeTab, setActiveTab] = useState('scores')
  const [addForm, setAddForm] = useState({ name: '' })
  const [newRoundName, setNewRoundName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [editById, setEditById] = useState(() => new Map())
  const [csvState, setCsvState] = useState({ fileName: '', parsedRows: [], error: '', added: null })

  useEffect(() => {
    setEditById((current) => {
      const next = new Map(current)
      for (const t of teams) {
        if (!next.has(t.id)) next.set(t.id, { scores: { ...t.scores } })
      }
      return next
    })
  }, [teams])

  const canUseAdmin = firebaseEnabled && user && adminStatus === 'ready' && isAdmin

  const wrapAsync = (fn) => async (...args) => {
    setBusy(true); setToast(null)
    try { await fn(...args) }
    catch (err) { setToast({ type: 'error', message: err?.message || 'Action failed' }) }
    finally { setBusy(false) }
  }

  const handleAddTeam = wrapAsync(async (e) => {
    e.preventDefault()
    await addTeam({ name: addForm.name, scores: {} })
    setAddForm({ name: '' })
    setToast({ type: 'success', message: 'Team added' })
  })

  const handleSave = wrapAsync(async (teamId) => {
    const values = editById.get(teamId)
    if (!values) return
    await updateTeamScores(teamId, values.scores)
    setToast({ type: 'success', message: 'Scores updated' })
  })

  const handleSaveAll = wrapAsync(async () => {
    const promises = []
    for (const t of teams) {
      const values = editById.get(t.id)
      if (values) {
        promises.push(updateTeamScores(t.id, values.scores))
      }
    }
    await Promise.all(promises)
    setToast({ type: 'success', message: 'All teams saved successfully!' })
  })

  const handleDelete = wrapAsync(async (teamId, name) => {
    if (!window.confirm(`Delete team "${name}"?`)) return
    await deleteTeam(teamId)
    setToast({ type: 'success', message: 'Team deleted' })
  })

  const handleAddRound = wrapAsync(async (e) => {
    e.preventDefault()
    const name = newRoundName.trim()
    if (!name) return
    if (roundNames.includes(name)) throw new Error('Round already exists')
    await updateRoundNames([...roundNames, name])
    setNewRoundName('')
    setToast({ type: 'success', message: 'Round added' })
  })

  const handleDeleteRound = wrapAsync(async (rname) => {
    if (!window.confirm(`Delete round column "${rname}"?`)) return
    await updateRoundNames(roundNames.filter(r => r !== rname))
    setToast({ type: 'success', message: 'Round deleted' })
  })

  const handleMoveRound = wrapAsync(async (index, direction) => {
    const newRounds = [...roundNames]
    if (direction === 'up' && index > 0) {
      ;[newRounds[index - 1], newRounds[index]] = [newRounds[index], newRounds[index - 1]]
      await updateRoundNames(newRounds)
    } else if (direction === 'down' && index < newRounds.length - 1) {
      ;[newRounds[index + 1], newRounds[index]] = [newRounds[index], newRounds[index + 1]]
      await updateRoundNames(newRounds)
    }
  })

  const handleToggleFreeze = wrapAsync(async () => {
    await setLeaderboardFrozen(!isFrozen)
    setToast({ type: 'success', message: !isFrozen ? 'Leaderboard is now FROZEN' : 'Leaderboard is now LIVE' })
  })

  const handleCelebrate = wrapAsync(async () => {
    if (!window.confirm("Trigger celebration on all public screens? This will also unfreeze the board.")) return
    await triggerCelebration()
    setToast({ type: 'success', message: 'Celebration Triggered!' })
  })

  function handleCsvFile(file) {
    if (!file) return
    setCsvState({ fileName: file.name, parsedRows: [], error: '', added: null })
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const raw = Array.isArray(res.data) ? res.data : []
        const rows = raw.map(r => {
           const name = r.name ?? r.team ?? r.teamName ?? r['Team Name'] ?? ''
           const scores = {}
           for (const [k, v] of Object.entries(r)) {
             if (!['name', 'team', 'teamName', 'Team Name'].includes(k)) scores[k] = num(v)
           }
           return { name, scores }
        }).filter(r => String(r.name).trim())
        setCsvState(s => ({ ...s, parsedRows: rows, error: '' }))
      },
      error: (err) => setCsvState(s => ({ ...s, error: err?.message || 'Failed to parse' })),
    })
  }

  const handleImportCsv = wrapAsync(async () => {
    const result = await bulkImportTeams(csvState.parsedRows)
    setCsvState((s) => ({ ...s, added: result.added }))
    setToast({ type: 'success', message: `Imported ${result.added} teams` })
  })

  return (
    <div className="min-h-screen relative overflow-hidden text-zinc-100">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-spidey-blue/20 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>
      <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-auto max-w-6xl px-4 py-10 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
          <div className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-gwen-cyan shadow-comic-cyan"></div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-gwen-cyan">Organizer Dashboard</div>
            <h1 className="mt-2 font-hero text-5xl tracking-widest text-zinc-100 uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">Admin Panel</h1>
          </div>
          <div className="flex gap-4">
            <Link to="/" className="font-hero text-lg border-2 border-zinc-900 bg-gwen-pink px-5 py-2 uppercase tracking-widest text-zinc-900 shadow-comic hover:-translate-y-1 hover:-translate-x-1">Public Leaderboard</Link>
            {user && <button onClick={() => signOut(auth)} className="font-hero text-lg border-2 border-zinc-900 bg-zinc-200 px-5 py-2 uppercase tracking-widest text-zinc-900 shadow-comic hover:-translate-y-1">Sign out</button>}
          </div>
        </div>

        {/* Notices */}
        {!firebaseEnabled && <div className="mt-8 border-4 border-spidey-red bg-zinc-900 p-6 text-sm font-bold text-white shadow-comic-red">Firebase not configured.</div>}
        {firebaseEnabled && !user && <div className="mt-12 max-w-md mx-auto"><AdminLogin /></div>}
        {firebaseEnabled && user && adminStatus === 'loading' && <div className="mt-8 font-hero text-2xl border-4 text-zinc-100 shadow-comic">Checking permissions…</div>}
        {firebaseEnabled && user && adminStatus === 'ready' && !isAdmin && <div className="mt-8 border-4 border-spidey-red bg-zinc-900 p-6 font-bold text-white shadow-comic-red">Not authorized.</div>}

        {canUseAdmin && (
          <div className="mt-8 flex flex-col md:flex-row gap-4 border-4 border-zinc-800 bg-zinc-900 p-4 shadow-comic md:items-center justify-between">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="font-hero text-2xl text-zinc-100 px-2 uppercase tracking-wider text-gwen-cyan">Event Controls</div>
              <button 
                onClick={handleToggleFreeze}
                disabled={busy}
                className={`font-hero text-lg px-6 py-2 border-2 transition-all shadow-comic hover:-translate-y-1 hover:-translate-x-1 uppercase ${isFrozen ? 'border-spidey-blue bg-spidey-blue text-white shadow-comic-cyan' : 'border-zinc-700 bg-zinc-800 text-zinc-300'}`}
              >
                {isFrozen ? 'Suspense Mode: ON (Frozen)' : 'Freeze Leaderboard'}
              </button>
            </div>
            <button 
              onClick={handleCelebrate}
              disabled={busy}
              className="font-hero text-xl px-8 py-2 border-2 border-gwen-pink bg-gwen-pink text-zinc-900 shadow-comic-pink transition-all hover:-translate-y-1 hover:-translate-x-1"
            >
              🎉 REVEAL & CELEBRATE!
            </button>
          </div>
        )}

        {/* Tab Content */}
        {canUseAdmin && (
          <div className="mt-8">
             <div className="flex gap-4 mb-8">
              <button onClick={() => setActiveTab('scores')} className={`font-hero text-2xl px-6 py-2 border-4 shadow-comic ${activeTab === 'scores' ? 'bg-2099-orange text-white' : 'bg-zinc-800'}`}>Edit Scores</button>
              <button onClick={() => setActiveTab('teams')} className={`font-hero text-2xl px-6 py-2 border-4 shadow-comic ${activeTab === 'teams' ? 'bg-gwen-pink text-zinc-900' : 'bg-zinc-800'}`}>Manage Teams</button>
              <button onClick={() => setActiveTab('rounds')} className={`font-hero text-2xl px-6 py-2 border-4 shadow-comic ${activeTab === 'rounds' ? 'bg-gwen-cyan text-zinc-900' : 'bg-zinc-800'}`}>Manage Rounds</button>
            </div>

            {activeTab === 'teams' && (
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="border-4 border-zinc-800 bg-zinc-900 p-6 shadow-comic">
                  <h2 className="font-hero text-3xl uppercase">Add Team</h2>
                  <form onSubmit={handleAddTeam} className="mt-6 flex flex-col gap-4">
                    <input value={addForm.name} onChange={e => setAddForm({name: e.target.value})} className="border-2 bg-zinc-950 p-3 outline-none focus:border-gwen-pink" placeholder="Team Name" />
                    <button disabled={busy} className="bg-gwen-pink p-3 font-hero text-2xl text-zinc-900 shadow-[4px_4px_0_#111]">Add Team</button>
                  </form>
                </div>
                <div className="border-4 border-zinc-800 bg-zinc-900 p-6 shadow-comic">
                  <h2 className="font-hero text-3xl uppercase">CSV Import</h2>
                  <input type="file" accept=".csv" onChange={e => handleCsvFile(e.target.files?.[0])} className="mt-4 border-2 bg-zinc-950 p-3" />
                  <button disabled={busy || !csvState.parsedRows.length} onClick={handleImportCsv} className="mt-4 bg-spidey-blue w-full p-3 font-hero text-2xl">Import Teams</button>
                </div>
              </div>
            )}

            {activeTab === 'rounds' && (
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="border-4 border-zinc-800 bg-zinc-900 p-6 shadow-comic">
                  <h2 className="font-hero text-3xl uppercase">Add Round</h2>
                  <form onSubmit={handleAddRound} className="mt-6 flex flex-col gap-4">
                    <input value={newRoundName} onChange={e => setNewRoundName(e.target.value)} className="border-2 bg-zinc-950 p-3 outline-none focus:border-gwen-cyan" placeholder="Round Name" />
                    <button disabled={busy} className="bg-gwen-cyan p-3 font-hero text-2xl text-zinc-900 shadow-[4px_4px_0_#111]">Add Round</button>
                  </form>
                </div>
                <div className="border-4 border-zinc-800 bg-zinc-900 p-6 shadow-comic">
                  <h2 className="font-hero text-3xl uppercase">Current Rounds</h2>
                  <div className="mt-4 space-y-3">
                    {roundNames.map((r, idx) => (
                      <div key={r} className="flex items-center justify-between p-3 border-2 border-zinc-700 bg-zinc-950 font-hero text-2xl shadow-comic">
                        <span className="text-zinc-100 flex-1 truncate"><span className="text-zinc-500 mr-2">{idx + 1}.</span>{r}</span>
                        <div className="flex gap-2">
                          <button disabled={busy || idx === 0} onClick={() => handleMoveRound(idx, 'up')} className="px-3 bg-spidey-blue/20 text-spidey-blue border-2 border-spidey-blue hover:bg-spidey-blue hover:text-white disabled:opacity-40 transition-colors">UP</button>
                          <button disabled={busy || idx === roundNames.length - 1} onClick={() => handleMoveRound(idx, 'down')} className="px-3 bg-spidey-blue/20 text-spidey-blue border-2 border-spidey-blue hover:bg-spidey-blue hover:text-white disabled:opacity-40 transition-colors">DN</button>
                          <button disabled={busy} onClick={() => handleDeleteRound(r)} className="px-3 bg-spidey-red/20 text-spidey-red border-2 border-spidey-red hover:bg-spidey-red hover:text-white transition-colors">DEL</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scores' && (
              <div className="border-4 border-zinc-800 bg-zinc-900 p-6 shadow-comic">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="font-hero text-3xl uppercase">Edit Scores</h2>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <input
                      type="text"
                      placeholder="Search teams..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-2 border-zinc-700 bg-zinc-950 px-4 py-2 text-zinc-100 outline-none focus:border-2099-orange transition-all w-full sm:w-64 font-hero text-xl"
                    />
                    <button
                      disabled={busy}
                      onClick={handleSaveAll}
                      className="whitespace-nowrap rounded-none border-2 border-spidey-blue bg-spidey-blue px-6 py-2 font-hero text-xl tracking-wider text-white transition hover:-translate-y-1 hover:shadow-comic-cyan disabled:opacity-50"
                      type="button"
                    >
                      SAVE ALL SCORES
                    </button>
                  </div>
                </div>
                <div className="mt-6 space-y-6">
                  {[...teams].sort((a, b) => a.name.localeCompare(b.name)).filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map(t => {
                    const values = editById.get(t.id) || { scores: {...t.scores} }
                    return (
                      <div key={t.id} className="border-2 p-5 bg-zinc-950 flex flex-col gap-4 shadow-comic">
                        <div className="flex justify-between items-center">
                          <h3 className="font-hero text-2xl">{t.name}</h3>
                          <button onClick={()=>handleDelete(t.id, t.name)} className="text-spidey-red uppercase font-bold">Delete Team</button>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          {roundNames.map(rname => (
                             <label key={rname}>
                               <div className="text-xs uppercase">{rname}</div>
                               <input type="number" value={values.scores[rname] ?? ''} onChange={e => setEditById(m => new Map(m).set(t.id, {scores:{...values.scores, [rname]:num(e.target.value)}}))} className="border-2 bg-zinc-900 p-2 font-hero text-xl w-24"/>
                             </label>
                          ))}
                        </div>
                        <button onClick={()=>handleSave(t.id)} className="bg-2099-orange p-2 font-hero text-xl text-zinc-900 w-40 shadow-comic hover:bg-white text-center">Save Scores</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 border-4 px-6 py-4 font-bold shadow-comic ${toast.type==='error'?'bg-spidey-red':'bg-gwen-cyan text-zinc-900'}`}>
            {toast.message}
          </div>
        )}
      </MotionDiv>
    </div>
  )
}
