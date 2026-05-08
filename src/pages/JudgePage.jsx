import { motion } from 'framer-motion'
import { signOut } from 'firebase/auth'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import AdminLogin from '../components/AdminLogin.jsx'
import useTeamsRealtime from '../hooks/useTeamsRealtime.js'
import { auth, firebaseEnabled } from '../lib/firebase.js'
import { useAuthState, useRoles } from './AdminPage.jsx'
import { submitScoresBatch } from '../lib/judges.js'

const MotionDiv = motion.div

export default function JudgePage() {
  const { hackathonId } = useParams()
  const user = useAuthState()
  const navigate = useNavigate()
  const { status: authStateStatus, isJudge, isAdmin, judgeName } = useRoles(user, hackathonId)
  const { teams, tracks, roundsByTrack, rubrics, lockedRounds } = useTeamsRealtime(hackathonId)

  const [trackFilter, setTrackFilter] = useState('')
  const [roundFilter, setRoundFilter] = useState('all')

  useEffect(() => {
    if (tracks && tracks.length > 0 && (!trackFilter || !tracks.find(t => t.id === trackFilter))) {
      setTrackFilter(tracks[0].id)
    }
  }, [tracks, trackFilter])
  const [evaluationFilter, setEvaluationFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)
  const [busyMap, setBusyMap] = useState(new Map())

  useEffect(() => {
    if (user === null) {
      navigate('/login')
    }
  }, [user, navigate])

  const canUseJudge = firebaseEnabled && user && authStateStatus === 'ready' && isJudge

  const uid = user?.uid
  const activeRoundNames = roundsByTrack?.[trackFilter] || []
  const displayedRounds = roundFilter === 'all' ? activeRoundNames : (activeRoundNames.includes(roundFilter) ? [roundFilter] : activeRoundNames)

  const [localDrafts, setLocalDrafts] = useState({})

  const handleSaveTeam = async (teamId) => {
    setBusyMap(m => new Map(m).set(teamId, true))
    try {
      const t = teams.find(x => x.id === teamId)
      if (!t) throw new Error('Team not found')
      
      const batchPayload = {}
      const activeRoundNamesForTeam = roundsByTrack?.[t.track] || []
      
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
        await submitScoresBatch(hackathonId, teamId, batchPayload, uid)
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
    <div className="min-h-screen bg-neo-white relative overflow-hidden text-neo-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px] pointer-events-none"></div>
      <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-auto max-w-6xl px-4 py-10 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
          <div className="flex flex-col items-start">
            <Link to="/assignments" className="mb-6 bg-white border-4 border-neo-black px-3 py-1 font-black text-xs uppercase tracking-[0.2em] hover:bg-neo-yellow transition-colors shadow-brutal-sm flex items-center gap-2">
              &larr; BACK
            </Link>
            <div className="relative">
              <div className="absolute -left-4 top-0 w-1 h-full bg-neo-yellow shadow-brutal"></div>
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-neo-black">Evaluator Access</div>
              <h1 className="mt-2 font-hero text-5xl tracking-widest text-neo-black uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">Judge Portal</h1>
            </div>
          </div>
          <div className="flex gap-4 items-center flex-wrap justify-end">
            {user && (
              <span className="font-black uppercase text-xs tracking-[0.2em] bg-white border-4 border-neo-black px-4 py-2 shadow-brutal hidden md:flex items-center gap-2 h-12">
                ID: {user.uid.slice(0, 6)}...
                <button onClick={() => { navigator.clipboard.writeText(user.uid); alert('Copied UID: ' + user.uid) }} title="Copy Full UID" className="hover:text-zinc-500 transition-colors active:scale-95">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </span>
            )}
            <Link to={`/${hackathonId}`} className="font-black text-sm border-4 border-neo-black bg-neo-yellow px-6 py-3 uppercase tracking-widest text-neo-black shadow-[4px_4px_0_#111] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_#111] transition-all flex items-center h-12">
              Public Leaderboard
            </Link>
            {user && (
              <button onClick={() => signOut(auth)} className="font-black text-sm border-4 border-neo-black bg-neo-black px-6 py-3 uppercase tracking-widest text-neo-white shadow-[4px_4px_0_#FFD600] hover:-translate-y-1 transition-all h-12">
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Notices */}
        {!firebaseEnabled && <div className="mt-8 border-4 border-neo-black bg-white p-6 text-sm font-bold text-neo-black shadow-brutal">Firebase not configured.</div>}
        {firebaseEnabled && user && authStateStatus === 'loading' && <div className="mt-8 font-hero text-2xl border-4 text-neo-black shadow-brutal">Authenticating Identity…</div>}
        
        {firebaseEnabled && user && authStateStatus === 'ready' && !isJudge && !isAdmin && (
          <div className="mt-8 border-4 border-neo-black bg-white p-6 font-bold text-neo-black shadow-brutal flex flex-col gap-4">
            <h2 className="font-hero text-3xl uppercase tracking-widest text-neo-red drop-shadow-[2px_2px_0_#111]">Pending Authorization</h2>
            <p className="text-neo-black">
              You are signed in, but your account has not been authorized as a Judge yet.
              Please copy your unique system ID below and securely send it to the Event Organizer.
            </p>
            <div className="p-4 bg-black border-4 border-neo-black font-mono text-xl text-neo-black break-all inline-block select-all cursor-text shadow-[4px_4px_0_#111]">
              {user.uid}
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
              Refresh this page once the Organizer confirms your authorization.
            </p>
          </div>
        )}

        {firebaseEnabled && user && authStateStatus === 'ready' && !isJudge && isAdmin && (
          <div className="mt-8 border-4 border-neo-black bg-white p-6 font-bold text-neo-black shadow-brutal flex flex-col gap-4">
            <h2 className="font-hero text-3xl uppercase tracking-widest text-neo-black drop-shadow-[2px_2px_0_#FFD600]">Wrong Portal</h2>
            <p className="text-neo-black">
              You are an Organizer, not a Judge. Please head over to the Admin Panel.
            </p>
            <Link to={`/${hackathonId}/admin`} className="inline-block bg-neo-yellow border-4 border-neo-black text-neo-black px-6 py-3 font-hero text-2xl uppercase tracking-widest hover:scale-105 transition-transform text-center shadow-[4px_4px_0_#111] max-w-xs">
              Go to Admin Panel
            </Link>
          </div>
        )}

        {/* JUDGE DASHBOARD */}
        {canUseJudge && (
          <div className="mt-8 border-4 border-neo-black bg-white/90 backdrop-blur-md shadow-brutal relative overflow-hidden">
            <div className="p-6 md:p-8 border-b-4 border-neo-black flex flex-col gap-6">
              <div>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-neo-yellow/10 rounded-full blur-3xl pointer-events-none"></div>
                 <h2 className="font-hero text-5xl uppercase text-neo-black drop-shadow-[3px_3px_0_#111] tracking-wider relative z-10">{judgeName}</h2>
                 <p className="text-neo-black font-bold tracking-widest uppercase text-sm mt-2 relative z-10">Live Evaluation Dashboard</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 z-10 relative mt-2">
                <select 
                   value={trackFilter} 
                   onChange={e => { setTrackFilter(e.target.value); setRoundFilter('all'); }} 
                   className="w-full border-4 border-neo-black bg-neo-white px-4 py-3 font-hero text-xl text-neo-black outline-none focus:border-neo-black shadow-brutal uppercase cursor-pointer"
                >
                  {tracks?.map(t => (
                    <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>
                  ))}
                </select>
                <select 
                   value={roundFilter} 
                   onChange={e => setRoundFilter(e.target.value)} 
                   className="w-full border-4 border-neo-black bg-neo-white px-4 py-3 font-hero text-xl text-neo-black outline-none focus:border-neo-black shadow-brutal uppercase cursor-pointer"
                >
                  <option value="all">ALL ROUNDS</option>
                  {activeRoundNames.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select 
                   value={evaluationFilter} 
                   onChange={e => setEvaluationFilter(e.target.value)} 
                   className="w-full border-4 border-neo-black bg-neo-white px-4 py-3 font-hero text-xl text-neo-black outline-none focus:border-neo-black shadow-brutal uppercase cursor-pointer"
                >
                  <option value="all">ALL STATUS</option>
                  <option value="pending">PENDING</option>
                  <option value="completed">COMPLETED</option>
                </select>
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full border-4 border-neo-black bg-neo-white px-4 py-3 font-hero text-xl text-neo-black outline-none focus:border-neo-black shadow-brutal uppercase" />
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
                  <div key={t.id} className="border-4 border-neo-black bg-neo-white shadow-brutal flex flex-col group hover:border-neo-black transition-all">
                    <div className="p-4 border-b-4 border-neo-black bg-white/50 flex items-center justify-between">
                      <span className="font-hero text-3xl text-neo-black">{t.name}</span>
                      <span className="text-xs font-black uppercase tracking-widest text-gray-500">#{t.id.slice(-6)}</span>
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
                           <div key={rname} className="flex flex-col border-b-4 border-neo-black bg-neo-white/20 last:border-0 relative">
                              <div className="p-4 bg-white border-b-4 border-neo-black flex justify-between items-center z-10 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                                <span className="font-hero text-2xl uppercase tracking-widest text-neo-black">{rname}</span>
                                <div className="flex gap-2 items-center">
                                  {lockedRounds.includes(`${trackFilter}_${rname}`) && (
                                     <span className="text-neo-red text-xs font-black tracking-widest uppercase border border-neo-black px-2 py-1 bg-neo-red/10 flex items-center gap-1">
                                       <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V7a3 3 0 0 1 3-3zm-6 8h12v8H6z"/></svg>
                                       LOCKED
                                     </span>
                                  )}
                                  {isEvaluated && <span className="text-neo-black text-xs font-black tracking-widest uppercase border border-neo-black px-2 py-1 bg-neo-yellow/10">EVALUATED</span>}
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
                                          <span className="text-xs font-bold uppercase tracking-widest text-gray-500 leading-tight" title={cr.label}>{cr.label}</span>
                                          <span className="text-xs font-black text-neo-black tabular-nums">/{cr.max}</span>
                                        </div>
                                        <input 
                                          disabled={isBusy || lockedRounds.includes(`${trackFilter}_${rname}`)}
                                          value={draftVal}
                                          onChange={(e) => setLocalDrafts(m => ({ ...m, [paramKey]: e.target.value }))}
                                          type="number" 
                                          min="0"
                                          max={cr.max}
                                          placeholder="-"
                                          className={`w-full border-b-4 bg-white p-2 font-hero text-2xl text-center outline-none transition-colors 
                                             ${lockedRounds.includes(`${trackFilter}_${rname}`) 
                                                ? 'border-neo-black text-zinc-600 cursor-not-allowed opacity-50' 
                                                : isEvaluated ? 'border-neo-black text-neo-black' : 'border-neo-black text-neo-black hover:bg-neo-lightgray focus:border-neo-black'}`} 
                                        />
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="p-4">
                                  <div className="flex flex-col gap-2 max-w-[200px]">
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Score</span>
                                    <input 
                                      disabled={isBusy || lockedRounds.includes(`${trackFilter}_${rname}`)}
                                      value={localDrafts[`${t.id}_${rname}__legacy`] ?? savedTotal} 
                                      onChange={(e) => setLocalDrafts(m => ({ ...m, [`${t.id}_${rname}__legacy`]: e.target.value }))}
                                      type="number" 
                                      className={`w-full border-b-4 bg-white p-2 font-hero text-2xl text-center outline-none transition-colors 
                                         ${lockedRounds.includes(`${trackFilter}_${rname}`) 
                                            ? 'border-neo-black text-zinc-600 cursor-not-allowed opacity-50' 
                                            : isEvaluated ? 'border-neo-black text-neo-black' : 'border-neo-black text-neo-black hover:bg-neo-lightgray focus:border-neo-black'}`} 
                                    />
                                  </div>
                                </div>
                              )}
                           </div>
                         )
                       })}
                    </div>

                    <div className="p-4 bg-white border-t-4 border-neo-black">
                      <button 
                        disabled={busyMap.get(t.id)} 
                        onClick={() => handleSaveTeam(t.id)}
                        className="w-full bg-neo-yellow px-6 py-2 font-hero text-xl uppercase tracking-widest text-neo-white shadow-brutal hover:-translate-y-1 hover:-translate-x-1 hover:bg-neo-yellow hover:shadow-brutal transition-all disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
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
          <div className={`fixed bottom-6 right-6 z-50 border-4 px-6 py-4 font-bold shadow-brutal ${toast.type==='error'?'bg-neo-red':'bg-neo-yellow text-neo-white'}`}>
            {toast.message}
          </div>
        )}
      </MotionDiv>
    </div>
  )
}
