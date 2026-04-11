import { motion } from 'framer-motion'
import { signOut } from 'firebase/auth'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import AdminLogin from '../components/AdminLogin.jsx'
import useTeamsRealtime from '../hooks/useTeamsRealtime.js'
import { auth, firebaseEnabled } from '../lib/firebase.js'
import { useAuthState, useRoles } from './AdminPage.jsx'
import { submitScoresBatch } from '../lib/judges.js'

const MotionDiv = motion.div

export default function JudgePage() {
  const user = useAuthState()
  const { status: authStateStatus, isJudge, isAdmin, judgeName } = useRoles(user)
  const { teams, roundNamesSoftware, roundNamesHardware, rubrics, lockedRounds } = useTeamsRealtime()

  const [trackFilter, setTrackFilter] = useState('software')
  const [roundFilter, setRoundFilter] = useState('all')
  const [evaluationFilter, setEvaluationFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)
  const [busyMap, setBusyMap] = useState(new Map())

  const canUseJudge = firebaseEnabled && user && authStateStatus === 'ready' && isJudge

  const uid = user?.uid
  const activeRoundNames = trackFilter === 'hardware' ? roundNamesHardware : roundNamesSoftware
  const displayedRounds = roundFilter === 'all' ? activeRoundNames : (activeRoundNames.includes(roundFilter) ? [roundFilter] : activeRoundNames)

  const [localDrafts, setLocalDrafts] = useState({})

  const handleSaveTeam = async (teamId) => {
    setBusyMap(m => new Map(m).set(teamId, true))
    try {
      const t = teams.find(x => x.id === teamId)
      if (!t) throw new Error('Team not found')
      
      const batchPayload = {}
      const activeRoundNamesForTeam = t.track === 'hardware' ? roundNamesHardware : roundNamesSoftware
      
      for (const rname of activeRoundNamesForTeam) {
        const currentRubricDef = rubrics?.[`${t.track}_${rname}`] || []
        const savedScoreObj = t.scores?.[rname]?.[uid]
        const isLegacyNumber = typeof savedScoreObj === 'number'
        
        if (currentRubricDef.length > 0) {
           const parameters = isLegacyNumber ? {} : { ...(savedScoreObj?.parameters || {}) }
           let changed = false
           let runningTotal = 0
           for (const cr of currentRubricDef) {
              const draft = localDrafts[`${teamId}_${rname}_${cr.id}`]
              if (draft !== undefined) {
                 const numVal = Number(draft) || 0
                 if (numVal > cr.max) {
                    throw new Error(`Score for "${cr.label}" in ${rname} exceeds max limit of ${cr.max}!`)
                 }
                 if (numVal < 0) {
                    throw new Error(`Score for "${cr.label}" in ${rname} cannot be negative!`)
                 }
                 parameters[cr.id] = numVal
                 changed = true
              } else {
                 if (parameters[cr.id] === undefined) parameters[cr.id] = 0
              }
              runningTotal += parameters[cr.id]
           }
           if (changed) {
              batchPayload[rname] = { total: runningTotal, parameters }
           }
        } else {
           const draft = localDrafts[`${teamId}_${rname}__legacy`]
           if (draft !== undefined) {
              batchPayload[rname] = Number(draft) || 0
           }
        }
      }
      
      if (Object.keys(batchPayload).length > 0) {
        await submitScoresBatch(teamId, batchPayload, uid)
        setToast({ type: 'success', message: 'Team Scores Saved!' })
      } else {
        setToast({ type: 'success', message: 'No changes to save.' })
      }
    } catch(err) {
      setToast({ type: 'error', message: err.message })
    } finally {
      setBusyMap(m => new Map(m).set(teamId, false))
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden text-zinc-100">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gwen-cyan/20 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>
      <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-auto max-w-6xl px-4 py-10 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
          <div className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-gwen-cyan shadow-comic-cyan"></div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-gwen-cyan">Evaluator Access</div>
            <h1 className="mt-2 font-hero text-5xl tracking-widest text-zinc-100 uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">Judge Portal</h1>
          </div>
          <div className="flex gap-4">
            <Link to="/" className="font-hero text-lg border-2 border-zinc-900 bg-gwen-pink px-5 py-2 uppercase tracking-widest text-zinc-900 shadow-comic hover:-translate-y-1 hover:-translate-x-1">Public Leaderboard</Link>
            {user && <button onClick={() => signOut(auth)} className="font-hero text-lg border-2 border-zinc-900 bg-zinc-200 px-5 py-2 uppercase tracking-widest text-zinc-900 shadow-comic hover:-translate-y-1">Sign out</button>}
          </div>
        </div>

        {/* Notices */}
        {!firebaseEnabled && <div className="mt-8 border-4 border-spidey-red bg-zinc-900 p-6 text-sm font-bold text-white shadow-comic-red">Firebase not configured.</div>}
        {firebaseEnabled && !user && <div className="mt-12 max-w-md mx-auto"><AdminLogin title="Judge Login" subtitle="Evaluator Access" /></div>}
        {firebaseEnabled && user && authStateStatus === 'loading' && <div className="mt-8 font-hero text-2xl border-4 text-zinc-100 shadow-comic">Authenticating Identity…</div>}
        
        {firebaseEnabled && user && authStateStatus === 'ready' && !isJudge && !isAdmin && (
          <div className="mt-8 border-4 border-spidey-red bg-zinc-900 p-6 font-bold text-white shadow-comic-red flex flex-col gap-4">
            <h2 className="font-hero text-3xl uppercase tracking-widest text-spidey-red drop-shadow-[2px_2px_0_#111]">Pending Authorization</h2>
            <p className="text-zinc-300">
              You are signed in, but your account has not been authorized as a Judge yet.
              Please copy your unique system ID below and securely send it to the Event Organizer.
            </p>
            <div className="p-4 bg-black border-2 border-zinc-700 font-mono text-xl text-gwen-cyan break-all inline-block select-all cursor-text shadow-[4px_4px_0_#111]">
              {user.uid}
            </div>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
              Refresh this page once the Organizer confirms your authorization.
            </p>
          </div>
        )}

        {firebaseEnabled && user && authStateStatus === 'ready' && !isJudge && isAdmin && (
          <div className="mt-8 border-4 border-2099-orange bg-zinc-900 p-6 font-bold text-white shadow-comic-orange flex flex-col gap-4">
            <h2 className="font-hero text-3xl uppercase tracking-widest text-2099-orange drop-shadow-[2px_2px_0_#111]">Wrong Portal</h2>
            <p className="text-zinc-300">
              You are an Organizer, not a Judge. Please head over to the Admin Panel.
            </p>
            <Link to="/admin" className="inline-block bg-2099-orange text-zinc-900 px-6 py-3 font-hero text-2xl uppercase tracking-widest hover:scale-105 transition-transform text-center shadow-[4px_4px_0_#111] max-w-xs">
              Go to Admin Panel
            </Link>
          </div>
        )}

        {/* JUDGE DASHBOARD */}
        {canUseJudge && (
          <div className="mt-8 border-4 border-gwen-cyan bg-zinc-900/90 backdrop-blur-md shadow-comic-cyan relative overflow-hidden">
            <div className="p-6 md:p-8 border-b-4 border-zinc-800 flex flex-col gap-6">
              <div>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-gwen-cyan/10 rounded-full blur-3xl pointer-events-none"></div>
                 <h2 className="font-hero text-5xl uppercase text-white drop-shadow-[3px_3px_0_#111] tracking-wider relative z-10">{judgeName}</h2>
                 <p className="text-gwen-cyan font-bold tracking-widest uppercase text-sm mt-2 relative z-10">Live Evaluation Dashboard</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 z-10 relative mt-2">
                <select 
                   value={trackFilter} 
                   onChange={e => { setTrackFilter(e.target.value); setRoundFilter('all'); }} 
                   className="w-full border-4 border-zinc-700 bg-zinc-950 px-4 py-3 font-hero text-xl text-white outline-none focus:border-gwen-cyan shadow-comic uppercase cursor-pointer"
                >
                  <option value="software">SOFTWARE</option>
                  <option value="hardware">HARDWARE</option>
                </select>
                <select 
                   value={roundFilter} 
                   onChange={e => setRoundFilter(e.target.value)} 
                   className="w-full border-4 border-zinc-700 bg-zinc-950 px-4 py-3 font-hero text-xl text-white outline-none focus:border-gwen-cyan shadow-comic uppercase cursor-pointer"
                >
                  <option value="all">ALL ROUNDS</option>
                  {activeRoundNames.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select 
                   value={evaluationFilter} 
                   onChange={e => setEvaluationFilter(e.target.value)} 
                   className="w-full border-4 border-zinc-700 bg-zinc-950 px-4 py-3 font-hero text-xl text-white outline-none focus:border-gwen-cyan shadow-comic uppercase cursor-pointer"
                >
                  <option value="all">ALL STATUS</option>
                  <option value="pending">PENDING</option>
                  <option value="completed">COMPLETED</option>
                </select>
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full border-4 border-zinc-700 bg-zinc-950 px-4 py-3 font-hero text-xl text-white outline-none focus:border-gwen-cyan shadow-comic uppercase" />
              </div>
            </div>
            
            <div className="p-6 md:p-8 grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
              {[...teams]
                .filter(t => t.track === trackFilter)
                .sort((a,b) => a.name.localeCompare(b.name))
                .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .filter(t => {
                  if (evaluationFilter === 'all') return true;
                  const isCompleted = displayedRounds.length > 0 && displayedRounds.every(rname => t.scores?.[rname] !== undefined);
                  if (evaluationFilter === 'completed') return isCompleted;
                  if (evaluationFilter === 'pending') return !isCompleted;
                  return true;
                })
                .map(t => (
                  <div key={t.id} className="border-4 border-zinc-800 bg-zinc-950 shadow-comic flex flex-col group hover:border-gwen-cyan transition-all">
                    <div className="p-4 border-b-4 border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                      <span className="font-hero text-3xl text-white">{t.name}</span>
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-500">#{t.id.slice(-6)}</span>
                    </div>
                    <div className="p-0">
                       {displayedRounds.map(rname => {
                         let savedScoreObj = t.scores?.[rname]
                         if (savedScoreObj && typeof savedScoreObj === 'object' && savedScoreObj.total === undefined) {
                            const vals = Object.values(savedScoreObj)
                            if (vals.length > 0) savedScoreObj = vals[0]
                         }
                         const isLegacyNumber = typeof savedScoreObj === 'number'
                         const parametersObj = isLegacyNumber ? {} : (savedScoreObj?.parameters || {})
                         const savedTotal = isLegacyNumber ? savedScoreObj : (savedScoreObj?.total ?? '')
                         
                         const isEvaluated = savedScoreObj !== undefined
                         const isBusy = busyMap.get(t.id)

                         const currentRubricDef = rubrics?.[`${trackFilter}_${rname}`] || []

                         return (
                           <div key={rname} className="flex flex-col border-b-4 border-zinc-800 bg-zinc-950/20 last:border-0 relative">
                              <div className="p-4 bg-zinc-900 border-b-2 border-zinc-900 flex justify-between items-center z-10 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                                <span className="font-hero text-2xl uppercase tracking-widest text-zinc-100">{rname}</span>
                                <div className="flex gap-2 items-center">
                                  {lockedRounds.includes(`${trackFilter}_${rname}`) && (
                                     <span className="text-spidey-red text-xs font-black tracking-widest uppercase border border-spidey-red px-2 py-1 bg-spidey-red/10 flex items-center gap-1">
                                       <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V7a3 3 0 0 1 3-3zm-6 8h12v8H6z"/></svg>
                                       LOCKED
                                     </span>
                                  )}
                                  {isEvaluated && <span className="text-gwen-cyan text-xs font-black tracking-widest uppercase border border-gwen-cyan px-2 py-1 bg-gwen-cyan/10">EVALUATED</span>}
                                </div>
                              </div>
                              
                              {currentRubricDef.length > 0 ? (
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {currentRubricDef.map(cr => {
                                    const paramKey = `${t.id}_${rname}_${cr.id}`
                                    const draftVal = localDrafts[paramKey] ?? parametersObj[cr.id] ?? ''
                                    
                                    return (
                                      <div key={cr.id} className="flex flex-col gap-2">
                                        <div className="flex justify-between items-end">
                                          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 leading-tight" title={cr.label}>{cr.label}</span>
                                          <span className="text-xs font-black text-gwen-pink tabular-nums">/{cr.max}</span>
                                        </div>
                                        <input 
                                          disabled={isBusy || lockedRounds.includes(`${trackFilter}_${rname}`)}
                                          value={draftVal}
                                          onChange={(e) => setLocalDrafts(m => ({ ...m, [paramKey]: e.target.value }))}
                                          type="number" 
                                          min="0"
                                          max={cr.max}
                                          placeholder="-"
                                          className={`w-full border-b-4 bg-zinc-900 p-2 font-hero text-2xl text-center outline-none transition-colors 
                                             ${lockedRounds.includes(`${trackFilter}_${rname}`) 
                                                ? 'border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50' 
                                                : isEvaluated ? 'border-gwen-cyan text-zinc-100' : 'border-zinc-700 text-spidey-blue hover:bg-zinc-800 focus:border-spidey-blue'}`} 
                                        />
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="p-4">
                                  <div className="flex flex-col gap-2 max-w-[200px]">
                                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Total Score</span>
                                    <input 
                                      disabled={isBusy || lockedRounds.includes(`${trackFilter}_${rname}`)}
                                      value={localDrafts[`${t.id}_${rname}__legacy`] ?? savedTotal} 
                                      onChange={(e) => setLocalDrafts(m => ({ ...m, [`${t.id}_${rname}__legacy`]: e.target.value }))}
                                      type="number" 
                                      className={`w-full border-b-4 bg-zinc-900 p-2 font-hero text-2xl text-center outline-none transition-colors 
                                         ${lockedRounds.includes(`${trackFilter}_${rname}`) 
                                            ? 'border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50' 
                                            : isEvaluated ? 'border-gwen-cyan text-zinc-100' : 'border-zinc-700 text-spidey-blue hover:bg-zinc-800 focus:border-spidey-blue'}`} 
                                    />
                                  </div>
                                </div>
                              )}
                           </div>
                         )
                       })}
                    </div>

                    <div className="p-4 bg-zinc-900 border-t-2 border-zinc-800">
                      <button 
                        disabled={busyMap.get(t.id)} 
                        onClick={() => handleSaveTeam(t.id)}
                        className="w-full bg-gwen-cyan px-6 py-2 font-hero text-xl uppercase tracking-widest text-zinc-900 shadow-comic hover:-translate-y-1 hover:-translate-x-1 hover:bg-gwen-pink hover:shadow-comic-cyan transition-all disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                      >
                        {busyMap.get(t.id) ? 'SAVING...' : 'SAVE TEAM SCORES'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
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
