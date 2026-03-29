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
import { addTeam, bulkImportTeams, deleteTeam, updateTeamScores, updateRoundNames, setLeaderboardFrozen, triggerCelebration, renameRound, updateTeamTrack } from '../lib/teams.js'

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
  const { teams, roundNamesSoftware, roundNamesHardware, isFrozen } = useTeamsRealtime()

  const [activeTab, setActiveTab] = useState('scores')
  const [roundManageTrack, setRoundManageTrack] = useState('software')
  const [addForm, setAddForm] = useState({ name: '', track: 'software' })
  const [newRoundName, setNewRoundName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [manageTeamSearchQuery, setManageTeamSearchQuery] = useState('')
  const [scoreFilterTrack, setScoreFilterTrack] = useState('all')
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

  const handleAdd = wrapAsync(async (e) => {
    e.preventDefault()
    if (!addForm.name.trim()) return
    await addTeam({ name: addForm.name, track: addForm.track, scores: {} })
    setAddForm({ name: '', track: 'software' })
    setToast({ type: 'success', message: 'Team added' })
  })

  const handleUpdateTrack = wrapAsync(async (teamId, track) => {
    await updateTeamTrack(teamId, track)
    setToast({ type: 'success', message: 'Track updated' })
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

  const activeRoundNames = roundManageTrack === 'hardware' ? roundNamesHardware : roundNamesSoftware

  const handleAddRound = wrapAsync(async (e) => {
    e.preventDefault()
    if (!newRoundName.trim() || activeRoundNames.includes(newRoundName.trim())) return
    await updateRoundNames(roundManageTrack, [...activeRoundNames, newRoundName.trim()])
    setNewRoundName('')
    setToast({ type: 'success', message: 'Round column added' })
  })

  const handleDeleteRound = wrapAsync(async (rname) => {
    if (!window.confirm(`Delete round column "${rname}" from ${roundManageTrack.toUpperCase()}? (Scores will remain in DB but be hidden)`)) return
    await updateRoundNames(roundManageTrack, activeRoundNames.filter(r => r !== rname))
    setToast({ type: 'success', message: 'Round deleted' })
  })

  const handleRenameRound = wrapAsync(async (oldName) => {
    const newName = window.prompt(`Rename "${oldName}" to:`, oldName)
    if (!newName || newName.trim() === '' || newName === oldName) return
    if (activeRoundNames.includes(newName.trim())) {
       setToast({ type: 'error', message: 'A round with that name already exists' })
       return
    }
    await renameRound(roundManageTrack, oldName, newName.trim(), activeRoundNames)
    setToast({ type: 'success', message: 'Round renamed successfully' })
  })

  const handleMoveRound = wrapAsync(async (index, direction) => {
    const newRounds = [...activeRoundNames]
    if (direction === 'up' && index > 0) {
      ;[newRounds[index - 1], newRounds[index]] = [newRounds[index], newRounds[index - 1]]
      await updateRoundNames(roundManageTrack, newRounds)
    } else if (direction === 'down' && index < newRounds.length - 1) {
      ;[newRounds[index + 1], newRounds[index]] = [newRounds[index], newRounds[index + 1]]
      await updateRoundNames(roundManageTrack, newRounds)
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
        {/* Event Controls */}
        {canUseAdmin && (
          <div className="mt-8 flex flex-col md:flex-row gap-6 border-4 border-gwen-pink bg-zinc-900/90 backdrop-blur-md p-6 shadow-comic-pink md:items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gwen-pink/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
              <div className="flex flex-col">
                <div className="font-hero text-3xl text-zinc-100 uppercase tracking-widest text-gwen-cyan drop-shadow-[2px_2px_0_#111]">Event Controls</div>
                <div className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Production Desk</div>
              </div>
              <button 
                onClick={handleToggleFreeze}
                disabled={busy}
                className={`font-hero text-xl px-8 py-3 border-2 transition-all hover:-translate-y-1 hover:-translate-x-1 uppercase tracking-widest ${isFrozen ? 'border-spidey-blue bg-spidey-blue text-white shadow-comic-cyan scale-105' : 'border-zinc-600 bg-zinc-800 text-zinc-300 shadow-[4px_4px_0_#333]'}`}
              >
                {isFrozen ? '❄️ Suspense Mode: ON (Frozen)' : 'Freeze Leaderboard'}
              </button>
            </div>
            <button 
              onClick={handleCelebrate}
              disabled={busy}
              className="font-hero text-2xl tracking-widest uppercase px-10 py-3 border-4 border-gwen-pink bg-gwen-pink text-zinc-900 shadow-[6px_6px_0_#FF00A0] transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0_#FF00A0] relative z-10"
            >
              🎉 REVEAL & CELEBRATE
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        {canUseAdmin && (
          <div className="mt-12">
             <div className="flex flex-wrap gap-4 mb-8 border-b-4 border-zinc-800 pb-4">
              {[
                { id: 'scores', label: 'EDIT SCORES', color: 'spidey-blue' },
                { id: 'teams', label: 'MANAGE TEAMS', color: 'gwen-pink' },
                { id: 'rounds', label: 'MANAGE ROUNDS', color: '2099-orange' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`font-hero text-2xl px-8 py-3 transition-all tracking-widest uppercase border-4 ${
                    activeTab === tab.id
                      ? `bg-${tab.color} border-${tab.color} text-zinc-900 shadow-comic scale-105 -translate-y-2`
                      : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
             </div>

            {/* MANAGE TEAMS TAB */}
            {activeTab === 'teams' && (
              <div className="space-y-8">
                <div className="grid gap-8 lg:grid-cols-2">
                  {/* ADD TEAM CARD */}
                  <div className="border-4 border-gwen-pink bg-zinc-900/90 backdrop-blur-md p-6 lg:p-8 shadow-comic-pink flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gwen-pink/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10">
                      <h2 className="font-hero text-5xl uppercase text-white drop-shadow-[3px_3px_0_#111] mb-2">Add Team</h2>
                      <p className="text-gwen-pink font-bold tracking-widest uppercase text-sm mb-6">Manually register a new team</p>
                      
                      <form onSubmit={handleAdd} className="flex flex-col gap-5">
                        <div className="flex flex-col md:flex-row gap-4">
                          <input 
                            type="text" 
                            placeholder="Team Name" 
                            value={addForm.name} 
                            onChange={e => setAddForm({ ...addForm, name: e.target.value })} 
                            className="flex-1 border-4 border-zinc-700 bg-zinc-950 p-4 font-hero text-2xl text-zinc-100 outline-none focus:border-gwen-cyan transition-colors"
                          />
                          <select 
                            value={addForm.track} 
                            onChange={e => setAddForm({ ...addForm, track: e.target.value })} 
                            className="border-4 border-zinc-700 bg-zinc-950 p-4 font-hero text-2xl text-zinc-100 outline-none focus:border-gwen-cyan transition-colors tracking-widest uppercase cursor-pointer"
                          >
                            <option value="software">SOFTWARE</option>
                            <option value="hardware">HARDWARE</option>
                          </select>
                        </div>
                        <button disabled={busy} className="bg-gwen-cyan px-8 py-4 font-hero text-3xl uppercase tracking-widest text-zinc-900 shadow-[6px_6px_0_#111] hover:-translate-y-1 hover:shadow-[8px_8px_0_#111] transition-all">
                          CREATE TEAM
                        </button>
                      </form>
                    </div>
                  </div>
                  
                  {/* IMPORT CSV CARD */}
                  <div className="border-4 border-spidey-blue bg-zinc-900/90 backdrop-blur-md p-6 lg:p-8 shadow-comic-cyan relative overflow-hidden">
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-spidey-blue/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10">
                      <h2 className="font-hero text-5xl uppercase text-white drop-shadow-[3px_3px_0_#111] mb-2">Import CSV</h2>
                      <p className="text-spidey-blue font-bold tracking-widest uppercase text-sm mb-2">Upload a spreadsheet of teams</p>
                      <p className="text-sm font-medium text-zinc-400 mb-6 bg-zinc-950/50 p-3 border-l-2 border-spidey-blue">
                        Columns required: <span className="font-bold text-white">name</span>.<br />
                        Optional columns: <span className="font-bold text-white">track</span> (hardware/software), plus any round names exactly matching the track columns (e.g. <span className="font-bold text-white">Round 1</span>).
                      </p>
                      <input type="file" accept=".csv" onChange={e => handleCsvFile(e.target.files?.[0])} className="w-full border-4 border-zinc-700 bg-zinc-950 p-3 font-medium text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-sm file:font-semibold file:bg-spidey-blue file:text-white hover:file:bg-spidey-red transition-all cursor-pointer" />
                      <button disabled={busy || !csvState.parsedRows.length} onClick={handleImportCsv} className="mt-6 w-full bg-spidey-red px-8 py-4 font-hero text-3xl uppercase tracking-widest text-white shadow-[6px_6px_0_#111] hover:-translate-y-1 hover:shadow-[8px_8px_0_#111] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {csvState.parsedRows.length ? `Import ${csvState.parsedRows.length} Teams` : 'Upload File First'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* CURRENT TEAMS LIST */}
                <div className="border-4 border-zinc-800 bg-zinc-900/90 backdrop-blur-md p-6 lg:p-8 shadow-[8px_8px_0_#111]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <h3 className="font-hero text-5xl uppercase text-white drop-shadow-[3px_3px_0_#111]">Team Roster</h3>
                    <input
                      type="text"
                      placeholder="Search teams..."
                      value={manageTeamSearchQuery}
                      onChange={(e) => setManageTeamSearchQuery(e.target.value)}
                      className="border-2 border-zinc-600 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gwen-cyan transition-all w-full md:w-64 font-hero text-2xl placeholder:text-zinc-600 shadow-comic"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...teams]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .filter(t => t.name.toLowerCase().includes(manageTeamSearchQuery.toLowerCase()))
                      .map(t => (
                      <div key={t.id} className="flex flex-col border-4 border-zinc-700 bg-zinc-950 shadow-[4px_4px_0_#000] overflow-hidden group hover:border-gwen-cyan transition-colors">
                        <div className="p-4 bg-zinc-900/50 border-b-2 border-zinc-800 font-hero text-2xl truncate text-white">
                          {t.name}
                        </div>
                        <div className="flex p-4 gap-4 items-center justify-between bg-zinc-950">
                          <select 
                            value={t.track} 
                            onChange={(e) => handleUpdateTrack(t.id, e.target.value)} 
                            disabled={busy}
                            className={`font-hero text-xl px-3 py-2 border-2 transition-colors outline-none cursor-pointer uppercase ${t.track === 'hardware' ? 'border-2099-orange text-2099-orange bg-2099-orange/10' : 'border-gwen-cyan text-gwen-cyan bg-gwen-cyan/10'}`}
                          >
                            <option value="software" className="bg-zinc-900">SOFTWARE</option>
                            <option value="hardware" className="bg-zinc-900">HARDWARE</option>
                          </select>
                          <button disabled={busy} onClick={() => handleDelete(t.id, t.name)} className="font-hero text-xl text-spidey-red underline underline-offset-4 hover:text-white transition-colors">REMOVE</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MANAGE ROUNDS TAB */}
            {activeTab === 'rounds' && (
              <div className="border-4 border-2099-orange bg-zinc-900/90 backdrop-blur-md p-6 lg:p-8 shadow-comic-orange max-w-4xl mx-auto overflow-hidden relative">
                <div className="absolute top-0 -left-10 w-40 h-40 bg-2099-orange/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b-4 border-zinc-800 pb-6 mb-8">
                    <div>
                      <h2 className="font-hero text-5xl uppercase text-white drop-shadow-[3px_3px_0_#111]">Column Structure</h2>
                      <p className="text-2099-orange font-bold tracking-widest uppercase text-sm mt-2">Manage scoring factors</p>
                    </div>
                    <select 
                      value={roundManageTrack} 
                      onChange={e => setRoundManageTrack(e.target.value)} 
                      className="border-4 border-2099-orange bg-zinc-950 px-6 py-3 font-hero text-2xl text-zinc-100 outline-none focus:border-white transition-colors cursor-pointer shadow-[4px_4px_0_#111]"
                    >
                      <option value="software">SOFTWARE ROUNDS</option>
                      <option value="hardware">HARDWARE ROUNDS</option>
                    </select>
                  </div>

                  <form onSubmit={handleAddRound} className="flex flex-col sm:flex-row gap-4 mb-10 bg-zinc-950 p-6 border-4 border-zinc-700 shadow-comic relative">
                    <div className="absolute -top-4 left-4 bg-zinc-900 px-2 font-black uppercase text-zinc-500 tracking-widest text-xs">Add New Column</div>
                    <input value={newRoundName} onChange={e => setNewRoundName(e.target.value)} className="flex-1 border-b-4 border-zinc-700 bg-transparent p-3 font-hero text-3xl outline-none focus:border-2099-orange text-zinc-100" placeholder="e.g., UI/UX Design" />
                    <button disabled={busy} className="bg-2099-orange px-8 py-3 font-hero text-3xl uppercase tracking-widest text-zinc-900 shadow-[4px_4px_0_#111] hover:-translate-y-1 hover:shadow-[6px_6px_0_#111] transition-all disabled:opacity-50">Create</button>
                  </form>

                  <div>
                    <h3 className="font-hero text-zinc-400 text-xl uppercase tracking-widest mb-4 flex items-center">
                      <span className="bg-zinc-800 w-full h-1 mr-4"></span>
                      Active Configuration
                      <span className="bg-zinc-800 w-full h-1 ml-4"></span>
                    </h3>
                    
                    <div className="space-y-4">
                      {activeRoundNames.map((r, idx) => (
                        <div key={r} className="flex flex-col sm:flex-row items-center justify-between p-4 border-4 border-zinc-700 bg-zinc-950 shadow-comic gap-4 group hover:border-2099-orange transition-colors">
                          <span className="text-white font-hero text-3xl truncate flex-1 uppercase tracking-wider"><span className="text-zinc-600 mr-3">{idx + 1}.</span>{r}</span>
                          <div className="flex gap-3">
                            <button disabled={busy} onClick={() => handleRenameRound(r)} className="px-4 py-2 border-2 border-zinc-600 text-zinc-300 font-hero text-xl uppercase tracking-widest hover:border-gwen-cyan hover:text-gwen-cyan transition-colors">RENAME</button>
                            <button disabled={busy || idx === 0} onClick={() => handleMoveRound(idx, 'up')} className="px-4 py-2 bg-zinc-800 text-white font-hero text-xl uppercase hover:bg-zinc-700 disabled:opacity-30 transition-colors">UP</button>
                            <button disabled={busy || idx === activeRoundNames.length - 1} onClick={() => handleMoveRound(idx, 'down')} className="px-4 py-2 bg-zinc-800 text-white font-hero text-xl uppercase hover:bg-zinc-700 disabled:opacity-30 transition-colors">DN</button>
                            <button disabled={busy} onClick={() => handleDeleteRound(r)} className="px-4 py-2 border-2 border-spidey-red text-spidey-red font-hero text-xl uppercase tracking-widest hover:bg-spidey-red hover:text-white transition-colors">REMOVE</button>
                          </div>
                        </div>
                      ))}
                      {activeRoundNames.length === 0 && (
                        <div className="border-4 border-dashed border-zinc-800 p-12 text-center font-hero text-2xl text-zinc-600 uppercase tracking-widest">
                          No rounds active in this track.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EDIT SCORES TAB */}
            {activeTab === 'scores' && (
              <div className="border-4 border-spidey-blue bg-zinc-900/90 backdrop-blur-md p-6 lg:p-8 shadow-comic-cyan">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-zinc-800 pb-6">
                  <div>
                    <h2 className="font-hero text-5xl uppercase text-white drop-shadow-[3px_3px_0_#111]">Edit Scores</h2>
                    <p className="text-spidey-blue font-bold tracking-widest uppercase text-sm mt-2">Adjust team points instantly</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <select
                      value={scoreFilterTrack}
                      onChange={(e) => setScoreFilterTrack(e.target.value)}
                      className="border-2 border-spidey-blue bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gwen-pink transition-all font-hero text-2xl tracking-widest uppercase cursor-pointer"
                    >
                      <option value="all">ALL TRACKS</option>
                      <option value="software">SOFTWARE</option>
                      <option value="hardware">HARDWARE</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search teams..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-2 border-zinc-600 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-spidey-blue transition-all w-full sm:w-64 font-hero text-2xl placeholder:text-zinc-600"
                    />
                    <button
                      disabled={busy}
                      onClick={handleSaveAll}
                      className="whitespace-nowrap border-4 border-gwen-cyan bg-gwen-cyan px-8 py-3 font-hero text-2xl tracking-widest uppercase text-zinc-900 transition hover:-translate-y-1 shadow-[4px_4px_0_#111] hover:shadow-[6px_6px_0_#00F0FF] disabled:opacity-50"
                      type="button"
                    >
                      SAVE ALL SCORES
                    </button>
                  </div>
                </div>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...teams]
                    .filter(t => scoreFilterTrack === 'all' || t.track === scoreFilterTrack)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(t => {
                    const values = editById.get(t.id) || { scores: {...t.scores} }
                    return (
                      <div key={t.id} className="border-4 border-zinc-700 bg-zinc-950 flex flex-col justify-between shadow-[4px_4px_0_#111] hover:border-spidey-blue hover:-translate-y-1 hover:shadow-comic-cyan transition-all overflow-hidden group">
                        <div className="p-5 border-b-2 border-zinc-800 bg-zinc-900/50">
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="font-hero text-3xl text-white truncate">{t.name}</h3>
                            <span className={`px-2 py-1 text-xs font-black uppercase tracking-widest border-2 ${t.track === 'hardware' ? 'border-2099-orange text-2099-orange' : 'border-gwen-cyan text-gwen-cyan'}`}>
                              {t.track}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 p-5 bg-zinc-950">
                          <div className="grid grid-cols-2 gap-4">
                            {(t.track === 'hardware' ? roundNamesHardware : roundNamesSoftware).map(rname => (
                              <label key={rname} className="flex flex-col gap-2">
                                <div className="text-xs uppercase text-zinc-400 font-bold tracking-widest">{rname}</div>
                                <input 
                                  type="number" 
                                  value={values.scores[rname] ?? ''} 
                                  onChange={e => setEditById(m => new Map(m).set(t.id, { scores: { ...values.scores, [rname]: num(e.target.value) } }))}
                                  className="border-b-4 border-zinc-700 bg-zinc-900 p-2 font-hero text-2xl w-full text-zinc-100 outline-none focus:border-gwen-pink focus:bg-zinc-800 transition-colors text-center"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="p-4 bg-zinc-900 border-t-2 border-zinc-800 flex gap-4">
                          <button onClick={()=>handleSave(t.id)} className="flex-1 bg-gwen-pink border-2 border-gwen-pink py-2 font-hero text-xl text-zinc-900 uppercase tracking-widest shadow-[3px_3px_0_#111] hover:bg-white hover:border-white transition-colors">Save</button>
                        </div>
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
