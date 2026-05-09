import Papa from 'papaparse'
import { motion } from 'framer-motion'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import AdminLogin from '../components/AdminLogin.jsx'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import useTeamsRealtime from '../hooks/useTeamsRealtime.js'
import { auth, db, firebaseEnabled } from '../lib/firebase.js'
import { addTeam, bulkImportTeams, deleteTeam, deleteAllTeams, resetBonusScores, resetRoundScores, updateTeamScores, updateRoundNames, setLeaderboardFrozen, triggerCelebration, renameRound, updateTeamTrack, updateTeamBonuses, updateRubrics, updateBonusNames, renameBonus, toggleRoundLock, updateTracks, deleteTeamsInTrack } from '../lib/teams.js'
import { addJudge, removeJudge, submitScore, updateJudgeName } from '../lib/judges.js'
import { sanitizeString, sanitizeAlphanumeric } from '../utils/sanitize.js'

const MotionDiv = motion.div

export function useAuthState() {
  const [user, setUser] = useState(undefined)
  useEffect(() => {
    if (!auth) return undefined
    const unsub = auth.onAuthStateChanged((u) => setUser(u))
    return () => unsub()
  }, [])
  return user
}

export function useRoles(user, hackathonId) {
  const [snapState, setSnapState] = useState({ uid: null, status: 'idle', isAdmin: false, isJudge: false, judgeName: '' })
  useEffect(() => {
    if (!firebaseEnabled || !db || !user?.uid || !hackathonId) return undefined
    const uid = user.uid
    
    let adminReady = false
    let judgeReady = false
    let adminVal = false
    let judgeVal = false
    let nameVal = ''

    const checkState = () => {
      if (adminReady && judgeReady) {
        setSnapState({ uid, status: 'ready', isAdmin: adminVal, isJudge: judgeVal, judgeName: nameVal })
      }
    }

    const unsubAdmin = onSnapshot(doc(db, 'hackathons', hackathonId), (snap) => {
      adminVal = snap.exists() && snap.data().ownerId === uid
      adminReady = true; checkState()
    })

    const unsubJudge = onSnapshot(doc(db, 'hackathons', hackathonId, 'judges', uid), (snap) => {
      if (snap.exists() && snap.data().isActive) {
        judgeVal = true
        nameVal = snap.data().name || 'Unknown Judge'
      } else {
        judgeVal = false
      }
      judgeReady = true; checkState()
    })

    return () => { unsubAdmin(); unsubJudge() }
  }, [user?.uid, hackathonId])

  if (!user?.uid) return { status: 'idle', isAdmin: false, isJudge: false }
  if (snapState.uid !== user.uid) return { status: 'loading', isAdmin: false, isJudge: false }
  return snapState
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function AdminPage() {
  const { hackathonId } = useParams()
  const user = useAuthState()
  const navigate = useNavigate()
  const { status: adminStatus, isAdmin, isJudge, judgeName } = useRoles(user, hackathonId)
  const { teams, tracks, roundsByTrack, bonusesByTrack, isFrozen, judgesList, activeJudges, rubrics, lockedRounds } = useTeamsRealtime(hackathonId)

  useEffect(() => {
    if (user === null) {
      navigate('/login')
    }
  }, [user, navigate])

  const [activeTab, setActiveTab] = useState('teams')
  const [roundManageTrack, setRoundManageTrack] = useState('')
  const [addForm, setAddForm] = useState({ name: '', track: '' })
  const [addJudgeForm, setAddJudgeForm] = useState({ name: '', uid: '' })
  const [newRoundName, setNewRoundName] = useState('')
  const [newTrackName, setNewTrackName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [manageTeamSearchQuery, setManageTeamSearchQuery] = useState('')
  const [scoreViewTrack, setScoreViewTrack] = useState('')
  const [expandedScoreTeam, setExpandedScoreTeam] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [csvState, setCsvState] = useState({ fileName: '', parsedRows: [], error: '', added: null })
  const [modal, setModal] = useState(null)

  const customConfirm = (message) => {
    return new Promise((resolve) => {
      setModal({
        title: "CONFIRM ACTION",
        message,
        type: "confirm",
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  };

  const customPrompt = (message, defaultValue = "") => {
    return new Promise((resolve) => {
      setModal({
        title: "ENTER VALUE",
        message,
        type: "prompt",
        defaultValue,
        onConfirm: (val) => resolve(val),
        onCancel: () => resolve(null)
      });
    });
  };

  const customAlert = (message) => {
    return new Promise((resolve) => {
      setModal({
        title: "ALERT",
        message,
        type: "alert",
        onConfirm: () => resolve(true)
      });
    });
  };

  // Bonuses
  const [editById, setEditById] = useState(() => new Map())
  const [scoreFilterTrack, setScoreFilterTrack] = useState('all')
  const [bonusManageTrack, setBonusManageTrack] = useState('')
  const [newBonusName, setNewBonusName] = useState('')

  // Rubrics
  const [rubricTrack, setRubricTrack] = useState('')
  const [rubricRound, setRubricRound] = useState('')
  const [newRubricRow, setNewRubricRow] = useState({ label: '', max: '' })

  // Initialize track states
  useEffect(() => {
    if (tracks && tracks.length > 0) {
      if (!roundManageTrack || !tracks.find(t => t.id === roundManageTrack)) setRoundManageTrack(tracks[0].id)
      if (!bonusManageTrack || !tracks.find(t => t.id === bonusManageTrack)) setBonusManageTrack(tracks[0].id)
      if (!rubricTrack || !tracks.find(t => t.id === rubricTrack)) setRubricTrack(tracks[0].id)
      if (!scoreViewTrack || (!tracks.find(t => t.id === scoreViewTrack) && scoreViewTrack !== 'all')) setScoreViewTrack(tracks[0].id)
      if (!addForm.track) setAddForm(f => ({ ...f, track: tracks[0].id }))
    }
  }, [tracks])

  const activeRubricKey = `${rubricTrack}_${rubricRound}`
  const currentRubricDef = rubrics?.[activeRubricKey] || []

  useEffect(() => {
    if (!tracks) return
    const available = roundsByTrack?.[rubricTrack] || []
    if (available.length && !available.includes(rubricRound)) {
      setRubricRound(available[0])
    }
  }, [rubricTrack, roundsByTrack, rubricRound, tracks])

  useEffect(() => {
    setEditById((current) => {
      const next = new Map(current)
      for (const t of teams) {
        if (!next.has(t.id)) {
           next.set(t.id, { ...(t.bonuses || {}) })
        }
      }
      return next
    })
  }, [teams])

  const canUseAdmin = firebaseEnabled && user && adminStatus === 'ready' && isAdmin
  const canUseJudge = firebaseEnabled && user && adminStatus === 'ready' && isJudge && !isAdmin

  const wrapAsync = (fn) => async (...args) => {
    setBusy(true); setToast(null)
    try { await fn(...args) }
    catch (err) { setToast({ type: 'error', message: err?.message || 'Action failed' }) }
    finally { setBusy(false) }
  }

  const handleAdd = wrapAsync(async (e) => {
    e.preventDefault()
    const cleanName = sanitizeString(addForm.name)
    if (!cleanName) return
    await addTeam(hackathonId, { name: cleanName, track: addForm.track, scores: {} })
    setAddForm({ name: '', track: tracks[0]?.id || '' })
    setToast({ type: 'success', message: 'Team added' })
  })

  const handleUpdateTrack = wrapAsync(async (teamId, track) => {
    await updateTeamTrack(hackathonId, teamId, track)
    setToast({ type: 'success', message: 'Track updated' })
  })

  const handleSaveBonus = wrapAsync(async (teamId) => {
    const values = editById.get(teamId)
    if (!values) return
    await updateTeamBonuses(hackathonId, teamId, values)
    setToast({ type: 'success', message: 'Bonuses updated' })
  })

  const handleSaveAllBonuses = wrapAsync(async () => {
    const promises = []
    for (const t of teams) {
      const values = editById.get(t.id)
      if (values) promises.push(updateTeamBonuses(hackathonId, t.id, values))
    }
    await Promise.all(promises)
    setToast({ type: 'success', message: 'All bonuses saved successfully!' })
  })

  const handleAddRubricElement = wrapAsync(async (e) => {
    e.preventDefault()
    if (!newRubricRow.label.trim() || !newRubricRow.max) return
    const maxNum = Number(newRubricRow.max)
    if (isNaN(maxNum) || maxNum <= 0) return

    const newObj = {
      id: crypto.randomUUID(),
      label: newRubricRow.label.trim(),
      max: maxNum
    }
    const updated = [...currentRubricDef, newObj]
    await updateRubrics(hackathonId, { ...rubrics, [activeRubricKey]: updated })
    setNewRubricRow({ label: '', max: '' })
    setToast({ type: 'success', message: 'Criterion added' })
  })

  const handleDeleteRubricElement = wrapAsync(async (id) => {
    if (!(await customConfirm("Remove this parameter? Existing scores tied to parameter IDs will remain in DB but be hidden."))) return
    const updated = currentRubricDef.filter(x => x.id !== id)
    await updateRubrics(hackathonId, { ...rubrics, [activeRubricKey]: updated })
    setToast({ type: 'success', message: 'Removed criterion' })
  })

  // JUDGE OPERATIONS //
  const handleAddJudge = wrapAsync(async (e) => {
    e.preventDefault()
    const cleanUid = sanitizeAlphanumeric(addJudgeForm.uid)
    const cleanName = sanitizeString(addJudgeForm.name)
    if (!cleanUid || !cleanName) return
    await addJudge(hackathonId, cleanUid, cleanName)
    setAddJudgeForm({ uid: '', name: '' })
    setToast({ type: 'success', message: 'Judge added successfully' })
  })

  const handleDeleteJudge = wrapAsync(async (jid, jname) => {
    if (!(await customConfirm(`Delete Judge "${jname}"? This removes them from active averages, drastically shifting current score totals! Proceed with caution.`))) return
    await removeJudge(hackathonId, jid)
    setToast({ type: 'success', message: 'Judge completely removed & teams recalculated.' })
  })

  const handleDelete = wrapAsync(async (teamId, name) => {
    if (!(await customConfirm(`Delete team "${name}"?`))) return
    await deleteTeam(hackathonId, teamId)
    setToast({ type: 'success', message: 'Team deleted' })
  })

  const handleDeleteAllTeams = wrapAsync(async () => {
    const confirm1 = await customConfirm("WARNING: Are you sure you want to delete ALL teams? This cannot be undone.")
    if (!confirm1) return
    const confirm2 = await customPrompt("Type 'DELETE ALL' to confirm:")
    if (confirm2 !== "DELETE ALL") {
       setToast({ type: 'error', message: 'Mass deletion cancelled' })
       return
    }
    await deleteAllTeams(hackathonId)
    setToast({ type: 'success', message: 'All teams successfully deleted' })
  })

  const handleResetRoundScores = wrapAsync(async () => {
    const confirm1 = await customConfirm(`WARNING: Are you sure you want to completely clear ALL MAIN ROUND SCORES for the ${roundManageTrack.toUpperCase()} track? This cannot be undone.`)
    if (!confirm1) return
    const confirm2 = await customPrompt("Type 'RESET SCORES' to confirm:")
    if (confirm2 !== "RESET SCORES") {
       setToast({ type: 'error', message: 'Score reset cancelled' })
       return
    }
    await resetRoundScores(hackathonId, roundManageTrack)
    setToast({ type: 'success', message: `${roundManageTrack.toUpperCase()} round scores successfully reset` })
  })

  const handleResetBonusScores = wrapAsync(async () => {
    const confirm1 = await customConfirm(`WARNING: Are you sure you want to completely clear ALL BONUS SCORES for the ${bonusManageTrack.toUpperCase()} track? This cannot be undone.`)
    if (!confirm1) return
    const confirm2 = await customPrompt("Type 'RESET BONUSES' to confirm:")
    if (confirm2 !== "RESET BONUSES") {
       setToast({ type: 'error', message: 'Bonus reset cancelled' })
       return
    }
    await resetBonusScores(hackathonId, bonusManageTrack)
    setToast({ type: 'success', message: `${bonusManageTrack.toUpperCase()} bonus scores successfully reset` })
  })

  const handleAddTrack = wrapAsync(async (e) => {
    e.preventDefault()
    const cleanName = sanitizeString(newTrackName)
    if (!cleanName) return
    const id = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    if (tracks.find(t => t.id === id)) {
      setToast({ type: 'error', message: 'A track with a similar name already exists.' })
      return
    }
    await updateTracks(hackathonId, [...tracks, { id, name: cleanName }])
    setNewTrackName('')
    setToast({ type: 'success', message: 'Track added' })
  })

  const handleDeleteTrack = wrapAsync(async (id, name) => {
    if (tracks.length <= 1) {
      setToast({ type: 'error', message: 'You must have at least one track.' })
      return
    }

    const confirm1 = await customConfirm(`DANGER: Delete track "${name}"? \n\nThis will: \n1. Download all team data for this track as a CSV backup. \n2. PERMANENTLY delete all teams assigned to this track from the database. \n3. Remove the track itself. \n\nProceed?`)
    if (!confirm1) return

    const confirm2 = await customPrompt(`FINAL CONFIRMATION: Type the track name "${name}" to confirm permanent deletion:`)
    if (confirm2 !== name) {
      setToast({ type: 'error', message: 'Track deletion cancelled: Name mismatch' })
      return
    }

    // 1. Backup to CSV
    const viewRounds = roundsByTrack?.[id] || []
    const viewBonuses = bonusesByTrack?.[id] || []
    const viewTeams = teams.filter(t => t.track === id).sort((a, b) => b.total - a.total)

    if (viewTeams.length > 0) {
      const headers = ['Rank', 'Team Name']
      for (const r of viewRounds) headers.push(r)
      for (const b of viewBonuses) headers.push(b)
      headers.push('Total')

      const rows = viewTeams.map((t, idx) => {
        const row = [idx + 1, `"${t.name}"`]
        for (const r of viewRounds) {
          let val = t.scores?.[r]
          if (val && typeof val === 'object' && val.total === undefined) {
             const vals = Object.values(val)
             if (vals.length > 0) val = vals[0]
          }
          row.push((val && typeof val === 'object') ? (val.total ?? 0) : (val ?? 0))
        }
        for (const b of viewBonuses) row.push(t.bonuses?.[b] || 0)
        row.push(t.total)
        return row
      })

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup_${name}_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

    // 2. Remove teams from DB
    await deleteTeamsInTrack(hackathonId, id)

    // 3. Remove track from settings
    await updateTracks(hackathonId, tracks.filter(t => t.id !== id))
    
    setToast({ type: 'success', message: `Track "${name}" and all associated teams deleted. Backup downloaded.` })
  })

  const activeRoundNames = roundsByTrack?.[roundManageTrack] || []

  const handleAddRound = wrapAsync(async (e) => {
    e.preventDefault()
    if (!newRoundName.trim() || activeRoundNames.includes(newRoundName.trim())) return
    await updateRoundNames(hackathonId, roundManageTrack, [...activeRoundNames, newRoundName.trim()])
    setNewRoundName('')
    setToast({ type: 'success', message: 'Round column added' })
  })

  const handleDeleteRound = wrapAsync(async (rname) => {
    if (!(await customConfirm(`Delete round column "${rname}" from ${roundManageTrack.toUpperCase()}? (Scores will remain in DB but be hidden)`))) return
    await updateRoundNames(hackathonId, roundManageTrack, activeRoundNames.filter(r => r !== rname))
    setToast({ type: 'success', message: 'Round deleted' })
  })

  const handleRenameRound = wrapAsync(async (oldName) => {
    const newName = await customPrompt(`Rename "${oldName}" to:`, oldName)
    if (!newName || newName.trim() === '' || newName === oldName) return
    if (activeRoundNames.includes(newName.trim())) {
       setToast({ type: 'error', message: 'A round with that name already exists' })
       return
    }
    await renameRound(hackathonId, roundManageTrack, oldName, newName.trim(), activeRoundNames)
    setToast({ type: 'success', message: 'Round renamed successfully' })
  })

  const handleMoveRound = wrapAsync(async (index, direction) => {
    const newRounds = [...activeRoundNames]
    if (direction === 'up' && index > 0) {
      ;[newRounds[index - 1], newRounds[index]] = [newRounds[index], newRounds[index - 1]]
      await updateRoundNames(hackathonId, roundManageTrack, newRounds)
    } else if (direction === 'down' && index < newRounds.length - 1) {
      ;[newRounds[index + 1], newRounds[index]] = [newRounds[index], newRounds[index + 1]]
      await updateRoundNames(hackathonId, roundManageTrack, newRounds)
    }
  })

  const activeBonusNames = bonusesByTrack?.[bonusManageTrack] || []

  const handleAddBonus = wrapAsync(async (e) => {
    e.preventDefault()
    if (!newBonusName.trim() || activeBonusNames.includes(newBonusName.trim())) return
    await updateBonusNames(hackathonId, bonusManageTrack, [...activeBonusNames, newBonusName.trim()])
    setNewBonusName('')
    setToast({ type: 'success', message: 'Bonus column added' })
  })

  const handleDeleteBonus = wrapAsync(async (bname) => {
    if (!(await customConfirm(`Delete bonus column "${bname}" from ${bonusManageTrack.toUpperCase()}?`))) return
    await updateBonusNames(hackathonId, bonusManageTrack, activeBonusNames.filter(b => b !== bname))
    setToast({ type: 'success', message: 'Bonus deleted' })
  })

  const handleRenameBonus = wrapAsync(async (oldName) => {
    const newName = window.prompt(`Rename "${oldName}" to:`, oldName)
    if (!newName || newName.trim() === '' || newName === oldName) return
    if (activeBonusNames.includes(newName.trim())) {
       setToast({ type: 'error', message: 'A bonus with that name already exists' })
       return
    }
    await renameBonus(hackathonId, bonusManageTrack, oldName, newName.trim(), activeBonusNames)
    setToast({ type: 'success', message: 'Bonus renamed successfully' })
  })

  const handleMoveBonus = wrapAsync(async (index, direction) => {
    const newBonuses = [...activeBonusNames]
    if (direction === 'up' && index > 0) {
      ;[newBonuses[index - 1], newBonuses[index]] = [newBonuses[index], newBonuses[index - 1]]
      await updateBonusNames(hackathonId, bonusManageTrack, newBonuses)
    } else if (direction === 'down' && index < newBonuses.length - 1) {
      ;[newBonuses[index + 1], newBonuses[index]] = [newBonuses[index], newBonuses[index + 1]]
      await updateBonusNames(hackathonId, bonusManageTrack, newBonuses)
    }
  })

  const handleToggleRoundLock = wrapAsync(async () => {
    if (!rubricRound) return
    await toggleRoundLock(hackathonId, rubricTrack, rubricRound, lockedRounds)
    setToast({ 
      type: 'success', 
      message: lockedRounds.includes(`${rubricTrack}_${rubricRound}`) ? 'Round UNLOCKED' : 'Round LOCKED' 
    })
  })

  const handleToggleFreeze = wrapAsync(async () => {
    await setLeaderboardFrozen(hackathonId, !isFrozen)
    setToast({ type: 'success', message: !isFrozen ? 'Leaderboard is now FROZEN' : 'Leaderboard is now LIVE' })
  })

  const handleCelebrate = wrapAsync(async () => {
    if (!(await customConfirm("Trigger celebration on all public screens? This will also unfreeze the board."))) return
    await triggerCelebration(hackathonId)
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
           const rawName = r.name ?? r.team ?? r.teamName ?? r['Team Name'] ?? ''
           const name = sanitizeString(rawName)
           const scores = {}
           for (const [k, v] of Object.entries(r)) {
             if (!['name', 'team', 'teamName', 'Team Name'].includes(k)) scores[k] = num(v)
           }
           return { name, scores }
        }).filter(r => r.name)
        setCsvState(s => ({ ...s, parsedRows: rows, error: '' }))
      },
      error: (err) => setCsvState(s => ({ ...s, error: err?.message || 'Failed to parse' })),
    })
  }

  const handleImportCsv = wrapAsync(async () => {
    const result = await bulkImportTeams(hackathonId, csvState.parsedRows)
    setCsvState((s) => ({ ...s, added: result.added }))
    setToast({ type: 'success', message: `Imported ${result.added} teams` })
  })

  return (
    <div className="min-h-screen bg-neo-white relative overflow-hidden text-neo-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(17,17,17,0.05)_2px,transparent_2px)] bg-[size:32px_32px] pointer-events-none"></div>
      <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-auto max-w-6xl px-4 py-10 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-12 border-b-4 border-neo-black pb-8">
          <div className="relative">
            <div className="border-4 border-neo-black px-4 py-1.5 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] mb-6 inline-flex items-center gap-3 bg-white shadow-[4px_4px_0_#111]">
              <span className="w-3 h-3 rounded-full border-4 border-neo-black bg-neo-yellow"></span>
              ORGANIZER DASHBOARD
            </div>
            <h1 className="font-hero text-[4rem] lg:text-[5rem] tracking-tight text-neo-black uppercase leading-[0.85]">
              <span className="block">ADMIN</span>
              <span className="inline-block bg-neo-yellow border-[4px] border-neo-black px-4 my-2 shadow-[6px_6px_0_#111] -rotate-2">
                PANEL
              </span>
            </h1>
          </div>
          <div className="flex gap-4 items-center flex-wrap justify-end mt-4">
            <Link to="/dashboard" className="font-black text-sm border-4 border-neo-black bg-white px-6 py-3 uppercase tracking-widest text-neo-black shadow-[4px_4px_0_#111] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_#111] transition-all flex items-center gap-2">&larr; Dash</Link>
            {canUseAdmin && <Link to={`/${hackathonId}/podium`} className="font-black text-sm border-4 border-neo-black bg-white px-6 py-3 uppercase tracking-widest text-neo-black shadow-[4px_4px_0_#111] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_#111] transition-all">🏆 Podium</Link>}
            <Link to={`/${hackathonId}`} className="font-black text-sm border-4 border-neo-black bg-neo-yellow px-6 py-3 uppercase tracking-widest text-neo-black shadow-[4px_4px_0_#111] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_#111] transition-all">Public</Link>
            {user && <button onClick={() => signOut(auth)} className="font-black text-sm border-4 border-neo-black bg-neo-black px-6 py-3 uppercase tracking-widest text-neo-white shadow-[4px_4px_0_#FFD600] hover:-translate-y-1 transition-all">Sign out</button>}
          </div>
        </div>

        {/* Notices */}
        {!firebaseEnabled && <div className="mt-8 border-4 border-neo-black bg-white p-6 text-sm font-bold text-neo-black shadow-brutal">Firebase not configured.</div>}
        {firebaseEnabled && user && adminStatus === 'loading' && <div className="mt-8 font-hero text-2xl border-4 text-neo-black shadow-brutal">Checking permissions…</div>}
        {firebaseEnabled && user && adminStatus === 'ready' && !isAdmin && !isJudge && (
          <div className="mt-8 border-4 border-neo-black bg-white p-6 font-bold text-neo-black shadow-brutal flex flex-col gap-4">
            <h2 className="font-hero text-3xl uppercase tracking-widest text-neo-red drop-shadow-[2px_2px_0_#111]">Pending Authorization</h2>
            <p className="text-neo-black">
              You are signed in, but your account has not been granted access to this event yet.
              If you are an <strong>Evaluator/Judge</strong>, please copy your unique system ID below and securely send it to the Event Organizer.
            </p>
            <div className="p-4 bg-black border-4 border-neo-black font-mono text-xl text-neo-black break-all inline-block select-all cursor-text shadow-[4px_4px_0_#111]">
              {user.uid}
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
              Refresh the page once the Organizer confirms your authorization.
            </p>
          </div>
        )}

        {firebaseEnabled && user && adminStatus === 'ready' && !isAdmin && isJudge && (
          <div className="mt-8 border-4 border-neo-black bg-white p-6 font-bold text-neo-black shadow-brutal flex flex-col gap-4">
            <h2 className="font-hero text-3xl uppercase tracking-widest text-neo-black drop-shadow-[2px_2px_0_#FFD600]">Wrong Portal</h2>
            <p className="text-neo-black">
              You are an authorized Judge. Please head over to the dedicated Judge Portal.
            </p>
            <Link to={`/${hackathonId}/judge`} className="inline-block bg-neo-yellow border-4 border-neo-black text-neo-black px-6 py-3 font-hero text-2xl uppercase tracking-widest hover:scale-105 transition-transform text-center shadow-[4px_4px_0_#111] max-w-xs">
              Go to Judge Portal
            </Link>
          </div>
        )}
        {/* Event Controls */}
        {canUseAdmin && (
          <div className="mt-8 flex flex-col md:flex-row gap-6 border-4 border-neo-black bg-white/90 backdrop-blur-md p-6 shadow-brutal md:items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neo-yellow/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
              <div className="flex flex-col">
                <div className="font-hero text-3xl text-neo-black uppercase tracking-widest text-neo-black drop-shadow-[2px_2px_0_#111]">Event Controls</div>
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Production Desk</div>
              </div>
              <button 
                onClick={handleToggleFreeze}
                disabled={busy}
                className={`font-hero text-xl px-8 py-3 border-4 transition-all hover:-translate-y-1 hover:-translate-x-1 uppercase tracking-widest ${isFrozen ? 'border-neo-black bg-neo-black text-white shadow-brutal scale-105' : 'border-neo-black bg-neo-lightgray text-neo-black shadow-[4px_4px_0_#333]'}`}
              >
                {isFrozen ? '❄️ Suspense Mode: ON (Frozen)' : 'Freeze Leaderboard'}
              </button>
            </div>
            <button 
              onClick={handleCelebrate}
              disabled={busy}
              className="font-hero text-2xl tracking-widest uppercase px-10 py-3 border-4 border-neo-black bg-neo-yellow text-neo-black shadow-[6px_6px_0_#FF00A0] transition-all hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0_#FF00A0] relative z-10"
            >
              🎉 REVEAL & CELEBRATE
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        {canUseAdmin && (
          <div className="mt-12">
             <div className="flex flex-wrap gap-4 mb-8 border-b-4 border-neo-black pb-4">
              {[
                { id: 'bonuses', label: 'EDIT BONUSES' },
                { id: 'rubrics', label: 'MANAGE RUBRICS' },
                { id: 'judges', label: 'MANAGE JUDGES' },
                { id: 'teams', label: 'MANAGE TEAMS' },
                { id: 'rounds', label: 'TRACKS & ROUNDS' },
                { id: 'scores', label: 'SCORE VIEWER' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`font-hero text-xl lg:text-2xl px-6 py-3 transition-all tracking-widest uppercase border-4 ${
                    activeTab === tab.id
                      ? 'bg-neo-black border-neo-black text-neo-yellow shadow-[6px_6px_0_#FFD600] scale-105 -translate-y-2'
                      : 'bg-white border-neo-black text-neo-black hover:bg-neo-yellow hover:shadow-[4px_4px_0_#111]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
             </div>

            {/* EDIT BONUSES TAB */}
            {activeTab === 'bonuses' && (
              <div className="border-4 border-neo-black bg-white/90 backdrop-blur-md p-6 lg:p-8 shadow-brutal relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neo-black/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* BONUS COLUMN CONFIGURATION BUILDER */}
                <div className="relative z-10 mb-12 border-b-4 border-neo-black pb-10">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 mb-6">
                    <div>
                      <h2 className="font-mono font-black text-5xl uppercase text-neo-black" style={{ textShadow: "3px 3px 0px #FFD600" }}>Manage Bonus Types</h2>
                      <p className="text-neo-black font-bold tracking-widest uppercase text-sm mt-2">Configure extra score columns</p>
                    </div>
                    <div className="flex gap-4 items-center flex-wrap">
                      <select 
                        value={bonusManageTrack} 
                        onChange={e => setBonusManageTrack(e.target.value)} 
                        className="border-4 border-neo-black bg-neo-white px-6 py-3 font-hero text-2xl text-neo-black outline-none focus:border-white transition-colors cursor-pointer shadow-[4px_4px_0_#111]"
                      >
                        {tracks.map(t => (
                          <option key={t.id} value={t.id}>{t.name.toUpperCase()} BONUSES</option>
                        ))}
                      </select>
                      <button
                        onClick={handleResetBonusScores}
                        disabled={busy}
                        className="font-hero text-xl px-4 py-3 bg-neo-red text-neo-black uppercase tracking-widest hover:bg-white hover:text-neo-red border-4 border-neo-black transition-colors shadow-brutal"
                        title={`Reset ${bonusManageTrack} Bonus Scores`}
                      >
                        RESET SCORES
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleAddBonus} className="flex flex-col sm:flex-row gap-4 max-w-4xl mx-auto bg-neo-white p-6 border-4 border-neo-black shadow-brutal relative mb-8">
                    <div className="absolute -top-4 left-4 bg-white px-2 font-black uppercase text-gray-500 tracking-widest text-xs">Add New Bonus</div>
                    <input value={newBonusName} onChange={e => setNewBonusName(e.target.value)} className="flex-1 border-b-4 border-neo-black bg-transparent p-3 font-hero text-3xl outline-none focus:border-neo-black text-neo-black" placeholder="e.g., Pitch Presentation" />
                    <button disabled={busy} className="bg-neo-black px-8 py-3 font-hero text-3xl uppercase tracking-widest text-[#fff] shadow-[4px_4px_0_#111] hover:-translate-y-1 hover:shadow-[6px_6px_0_#111] transition-all disabled:opacity-50">+ Add Setup</button>
                  </form>

                  <div className="max-w-4xl mx-auto space-y-4">
                    {activeBonusNames.map((b, idx) => (
                      <div key={b} className="flex flex-col sm:flex-row items-center justify-between p-4 border-4 border-neo-black bg-neo-white shadow-[4px_4px_0_#111] gap-4 group hover:border-neo-black transition-colors">
                        <span className="text-neo-black font-hero text-3xl truncate flex-1 uppercase tracking-wider"><span className="text-zinc-600 mr-3">{idx + 1}.</span>{b}</span>
                        <div className="flex gap-3">
                          <button disabled={busy} onClick={() => handleRenameBonus(b)} className="px-4 py-2 border-4 border-neo-black text-neo-black font-hero text-xl uppercase tracking-widest hover:border-neo-black hover:text-neo-black transition-colors">RENAME</button>
                          <button disabled={busy || idx === 0} onClick={() => handleMoveBonus(idx, 'up')} className="px-4 py-2 bg-neo-lightgray text-neo-black font-hero text-xl uppercase hover:bg-neo-lightgray disabled:opacity-30 transition-colors">UP</button>
                          <button disabled={busy || idx === activeBonusNames.length - 1} onClick={() => handleMoveBonus(idx, 'down')} className="px-4 py-2 bg-neo-lightgray text-neo-black font-hero text-xl uppercase hover:bg-neo-lightgray disabled:opacity-30 transition-colors">DN</button>
                          <button disabled={busy} onClick={() => handleDeleteBonus(b)} className="px-4 py-2 border-4 border-neo-black text-neo-red font-hero text-xl uppercase tracking-widest hover:bg-neo-red hover:text-neo-black transition-colors">REMOVE</button>
                        </div>
                      </div>
                    ))}
                    {activeBonusNames.length === 0 && (
                      <div className="border-4 border-dashed border-neo-black p-8 text-center font-hero text-2xl text-zinc-600 uppercase tracking-widest">
                        No custom bonuses active in this track.
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-neo-black pb-6">
                  <div>
                    <h2 className="font-mono font-black text-5xl uppercase text-neo-black" style={{ textShadow: "3px 3px 0px #FFD600" }}>Assign Values</h2>
                    <p className="text-neo-black font-bold tracking-widest uppercase text-sm mt-2">Inject external bonuses per team</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <select
                      value={scoreFilterTrack}
                      onChange={(e) => setScoreFilterTrack(e.target.value)}
                      className="border-4 border-neo-black bg-neo-white px-4 py-3 text-neo-black outline-none focus:border-neo-black transition-all font-hero text-2xl tracking-widest uppercase cursor-pointer shadow-[4px_4px_0_#111]"
                    >
                      <option value="all">ALL TRACKS</option>
                      {tracks.map(t => (
                        <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>
                      ))}
                    </select>
                    <button
                      disabled={busy}
                      onClick={handleSaveAllBonuses}
                      className="whitespace-nowrap border-4 border-neo-black bg-neo-yellow px-8 py-3 font-hero text-2xl tracking-widest uppercase text-neo-white transition hover:-translate-y-1 shadow-[4px_4px_0_#111] hover:shadow-[6px_6px_0_#00F0FF] disabled:opacity-50"
                    >
                      SAVE ALL BONUSES
                    </button>
                  </div>
                </div>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
                  {[...teams]
                    .filter(t => scoreFilterTrack === 'all' || t.track === scoreFilterTrack)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .filter(t => t.name.toLowerCase().includes(manageTeamSearchQuery.toLowerCase()))
                    .map(t => {
                    const values = editById.get(t.id) || {}
                    const teamBonusNames = bonusesByTrack?.[t.track] || []
                    return (
                      <div key={t.id} className="border-4 border-neo-black bg-neo-white flex flex-col justify-between shadow-[4px_4px_0_#111] hover:border-neo-black hover:-translate-y-1 transition-all overflow-hidden group">
                        <div className="p-5 border-b-4 border-neo-black bg-white/50">
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="font-hero text-3xl text-neo-black truncate">{t.name}</h3>
                            <span className={`px-2 py-1 text-xs font-black uppercase tracking-widest border-4 ${t.track === 'hardware' ? 'border-4099-orange text-2099-orange' : 'border-neo-black text-neo-black'}`}>
                              {t.track}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 p-5 bg-neo-white">
                          <div className="grid grid-cols-2 gap-4">
                              {teamBonusNames.map(bname => (
                                <label key={bname} className="flex flex-col gap-2">
                                  <div className="text-xs uppercase text-gray-500 font-bold tracking-widest truncate" title={bname}>{bname}</div>
                                  <input 
                                    type="number" 
                                    value={values[bname] === 0 ? '' : (values[bname] || '')} 
                                    onChange={e => setEditById(m => new Map(m).set(t.id, { ...values, [bname]: num(e.target.value) }))}
                                    className="border-b-4 border-neo-black bg-white p-2 font-hero text-2xl w-full text-neo-black outline-none focus:border-neo-black transition-colors text-center"
                                  />
                                </label>
                              ))}
                              {!teamBonusNames.length && (
                                <div className="col-span-2 text-gray-500 font-bold tracking-widest uppercase text-xs pt-2">No bonuses configured for {t.track}.</div>
                              )}
                          </div>
                        </div>
                        <div className="p-4 bg-white border-t-4 border-neo-black flex gap-4">
                          <button onClick={()=>handleSaveBonus(t.id)} className="flex-1 bg-neo-yellow border-4 border-neo-black py-2 font-hero text-xl text-neo-white uppercase tracking-widest shadow-[3px_3px_0_#111] hover:bg-white transition-colors">Save Team</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* MANAGE RUBRICS TAB */}
            {activeTab === 'rubrics' && (
              <div className="border-4 border-neo-black bg-white/90 backdrop-blur-md p-6 lg:p-8 shadow-brutal relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neo-yellow/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-neo-black pb-6 mb-8">
                  <div>
                    <h2 className="font-mono font-black text-5xl uppercase text-neo-black" style={{ textShadow: "3px 3px 0px #FFD600" }}>Scoring Rubrics</h2>
                    <p className="text-neo-black font-bold tracking-widest uppercase text-sm mt-2">Dynamic criteria builder for Judges</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <select value={rubricTrack} onChange={e => setRubricTrack(e.target.value)} className="border-4 border-neo-black bg-neo-white px-6 py-3 font-hero text-2xl text-neo-black outline-none focus:border-white transition-colors cursor-pointer shadow-[2px_2px_0_#111]">
                      {tracks.map(t => (
                        <option key={t.id} value={t.id}>{t.name.toUpperCase()} TRACK</option>
                      ))}
                    </select>
                    <select value={rubricRound} onChange={e => setRubricRound(e.target.value)} className="border-4 border-neo-black bg-neo-white px-6 py-3 font-hero text-2xl text-neo-black outline-none focus:border-white transition-colors cursor-pointer shadow-[2px_2px_0_#111]">
                      {(roundsByTrack?.[rubricTrack] || []).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleToggleRoundLock}
                      className={`px-6 py-2 border-4 font-hero text-2xl uppercase tracking-widest transition-all shadow-[4px_4px_0_#111] hover:-translate-y-1 ${
                        lockedRounds.includes(`${rubricTrack}_${rubricRound}`) 
                          ? 'bg-neo-red border-neo-black text-neo-black hover:bg-white hover:text-neo-red' 
                          : 'bg-neo-lightgray border-neo-black text-gray-500 hover:border-neo-black hover:text-neo-black'
                      }`}
                    >
                      {lockedRounds.includes(`${rubricTrack}_${rubricRound}`) ? 'LOCKED' : 'LOCK ROUND'}
                    </button>
                  </div>
                </div>

                {!rubricRound ? (
                   <div className="text-center p-8 text-gray-500 font-bold uppercase tracking-widest border-4 border-dashed border-neo-black">No rounds found for this track. Create rounds first.</div>
                ) : (
                  <div className="relative z-10 grid gap-8 lg:grid-cols-12">
                     <div className="lg:col-span-5 border-4 border-neo-black bg-neo-white p-6 shadow-brutal flex flex-col justify-between">
                       <div>
                         <h3 className="font-hero text-3xl uppercase text-neo-black mb-6">Add Parameter</h3>
                         <form onSubmit={handleAddRubricElement} className="flex flex-col gap-6">
                           <label className="flex flex-col gap-2">
                             <div className="text-xs uppercase text-gray-500 font-bold tracking-widest">Parameter Label</div>
                             <input value={newRubricRow.label} onChange={e => setNewRubricRow(m => ({...m, label: e.target.value}))} className="border-b-4 border-neo-black bg-white p-3 font-hero text-2xl text-neo-black outline-none focus:border-neo-black transition-colors" placeholder="e.g. Working Prototype" />
                           </label>
                           <label className="flex flex-col gap-2">
                             <div className="text-xs uppercase text-gray-500 font-bold tracking-widest">Max Marks</div>
                             <input type="number" min="1" value={newRubricRow.max} onChange={e => setNewRubricRow(m => ({...m, max: e.target.value}))} className="border-b-4 border-neo-black bg-white p-3 font-hero text-2xl text-neo-black outline-none focus:border-neo-black transition-colors" placeholder="e.g. 20" />
                           </label>
                           <button disabled={busy} className="bg-neo-yellow mt-4 px-6 py-4 font-hero text-2xl uppercase tracking-widest text-neo-white shadow-[4px_4px_0_#111] hover:-translate-y-1 hover:shadow-[6px_6px_0_#111] transition-all disabled:opacity-50">
                             + ADD CRITERION
                           </button>
                         </form>
                       </div>
                     </div>
                     <div className="lg:col-span-7">
                        <div className="border-4 border-neo-black bg-white/50 p-6 shadow-[8px_8px_0_#111] h-full">
                           <div className="flex justify-between items-center mb-6">
                             <h3 className="font-hero text-3xl uppercase text-neo-black">Active Rubric Layout</h3>
                             <div className="text-gray-500 font-black uppercase text-xs tracking-widest">Total: {currentRubricDef.reduce((acc, c) => acc + c.max, 0)} Marks</div>
                           </div>
                           <div className="space-y-4">
                             {!currentRubricDef.length && (
                               <div className="text-center p-8 text-gray-500 font-bold uppercase tracking-widest border-4 border-dashed border-neo-black">
                                 No specific criteria declared. Judges will see a single overarching 'Total Score' box.
                               </div>
                             )}
                             {currentRubricDef.map((cr, idx) => (
                               <div key={cr.id} className="flex flex-col sm:flex-row items-center justify-between p-4 border-4 border-neo-black bg-neo-white shadow-[4px_4px_0_#111] group hover:border-neo-black">
                                 <div className="flex-1 w-full truncate border-b-4 sm:border-0 border-neo-black pb-2 sm:pb-0 mb-2 sm:mb-0">
                                    <span className="text-neo-black font-hero text-2xl uppercase tracking-wider block truncate"><span className="text-zinc-600 mr-2">{idx+1}.</span>{cr.label}</span>
                                 </div>
                                 <div className="flex gap-4 items-center w-full sm:w-auto justify-between">
                                    <span className="text-neo-black font-hero text-2xl uppercase tracking-widest">MAX: {cr.max}</span>
                                    <button disabled={busy} onClick={() => handleDeleteRubricElement(cr.id)} className="bg-neo-red text-neo-black font-hero px-4 py-2 uppercase tracking-widest hover:bg-white hover:text-neo-red transition-colors border-4 border-neo-black shadow-brutal">Del</button>
                                 </div>
                               </div>
                             ))}
                           </div>
                        </div>
                     </div>
                  </div>
                )}
              </div>
            )}

            {/* MANAGE JUDGES TAB */}
            {activeTab === 'judges' && (
              <div className="space-y-8">
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="border-4 border-neo-black bg-white/90 backdrop-blur-md p-6 lg:p-8 shadow-brutal max-w-4xl overflow-hidden relative">
                    <div className="absolute top-0 -left-10 w-40 h-40 bg-neo-red/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10">
                      <div className="mb-8">
                        <h2 className="font-hero text-5xl uppercase text-neo-black drop-shadow-[3px_3px_0_#FFD600]">Register Judge</h2>
                        <p className="text-neo-red font-bold tracking-widest uppercase text-sm mt-2">Whitelist an evaluator</p>
                      </div>

                      <form onSubmit={handleAddJudge} className="flex flex-col gap-4 mb-6">
                        <input value={addJudgeForm.uid} onChange={e => setAddJudgeForm(f => ({...f, uid: e.target.value}))} className="w-full border-b-4 border-neo-black bg-neo-white p-3 font-hero text-xl sm:text-2xl outline-none focus:border-neo-black text-neo-black transition-colors" placeholder="Copy/Paste Judge Firebase UID" />
                        <div className="flex flex-col xl:flex-row gap-4">
                          <input value={addJudgeForm.name} onChange={e => setAddJudgeForm(f => ({...f, name: e.target.value}))} className="w-full xl:flex-1 border-b-4 border-neo-black bg-neo-white p-3 font-hero text-xl sm:text-2xl outline-none focus:border-neo-black text-neo-black transition-colors" placeholder="Display Name (e.g. Dr. Alan)" />
                          <button disabled={busy} className="w-full xl:w-auto bg-neo-red px-6 py-3 font-hero text-xl sm:text-2xl uppercase tracking-widest text-neo-black border-4 border-neo-black shadow-[4px_4px_0_#111] hover:-translate-y-1 hover:shadow-[6px_6px_0_#111] transition-all disabled:opacity-50">Authorize</button>
                        </div>
                      </form>
                      <p className="text-sm font-medium text-gray-500 bg-neo-white/50 p-3 border-l-4 border-neo-black">
                        <strong className="text-neo-black block mb-1">How this works:</strong>
                        1. The judge visits your leaderboard URL and signs up/logs in.<br/>
                        2. They copy their UID and securely send it to you.<br/>
                        3. You paste it here. It instantly grants them grading access!
                      </p>
                    </div>
                  </div>

                  <div className="border-4 border-neo-black bg-white/90 backdrop-blur-md p-6 lg:p-8 shadow-[8px_8px_0_#111]">
                    <h3 className="font-mono font-black text-5xl uppercase text-neo-black mb-8" style={{ textShadow: "3px 3px 0px #FFD600" }}>Active Panel</h3>
                    <div className="space-y-4">
                      {judgesList.map(j => (
                        <div key={j.id} className="flex items-center justify-between p-4 border-4 border-neo-black bg-neo-white shadow-brutal gap-4 group hover:border-neo-black transition-colors">
                          <div className="flex-1 truncate">
                            <span className="text-neo-black font-hero text-3xl uppercase tracking-wider block">{j.name}</span>
                            <span className="text-gray-500 font-bold text-xs font-mono uppercase tracking-widest mt-1 flex items-center gap-2">
                              ID: {j.id}
                              <button onClick={() => { navigator.clipboard.writeText(j.id); customAlert('Copied UID: ' + j.id) }} title="Copy UID" className="hover:text-neo-black transition-colors active:scale-95">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                              </button>
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            {activeJudges.includes(j.id) ? (
                              <span className="px-3 py-1 bg-neo-yellow/20 border-4 border-neo-black text-neo-black font-bold text-xs uppercase tracking-widest animate-pulse">LIVE</span>
                            ) : (
                              <span className="px-3 py-1 bg-neo-lightgray/80 border-4 border-neo-black text-gray-500 font-bold text-xs uppercase tracking-widest">Revoked</span>
                            )}
                            <button disabled={busy} onClick={() => handleDeleteJudge(j.id, j.name)} className="font-hero text-xl text-neo-red underline underline-offset-4 hover:text-neo-black transition-colors">BAN</button>
                          </div>
                        </div>
                      ))}
                      {!judgesList.length && <div className="p-8 text-center text-gray-500 font-bold tracking-widest uppercase">No judges registered in the database.</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MANAGE TEAMS TAB */}
            {activeTab === 'teams' && (
              <div className="space-y-8">
                <div className="grid gap-8 lg:grid-cols-2">
                  {/* ADD TEAM CARD */}
                  <div className="border-4 border-neo-black bg-white/90 backdrop-blur-md p-6 lg:p-8 shadow-brutal flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-neo-yellow/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10">
                      <h2 className="font-hero text-5xl uppercase text-neo-black drop-shadow-[3px_3px_0_#FFD600] mb-2">Add Team</h2>
                      <p className="text-neo-black font-bold tracking-widest uppercase text-sm mb-6">Manually register a new team</p>
                      
                      <form onSubmit={handleAdd} className="flex flex-col gap-5">
                        <div className="flex flex-col xl:flex-row gap-4">
                          <input 
                            type="text" 
                            placeholder="Team Name" 
                            value={addForm.name} 
                            onChange={e => setAddForm({ ...addForm, name: e.target.value })} 
                            className="w-full xl:flex-1 border-4 border-neo-black bg-neo-white p-4 font-hero text-2xl text-neo-black outline-none focus:bg-neo-yellow/10 transition-colors"
                          />
                          <select 
                            value={addForm.track} 
                            onChange={e => setAddForm({ ...addForm, track: e.target.value })} 
                            className="w-full xl:w-auto border-4 border-neo-black bg-neo-white p-4 font-hero text-2xl text-neo-black outline-none focus:bg-neo-yellow/10 transition-colors tracking-widest uppercase cursor-pointer"
                          >
                            {tracks.map(t => (
                              <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                        <button disabled={busy} className="bg-neo-yellow px-8 py-4 font-hero text-3xl uppercase tracking-widest text-neo-black border-4 border-neo-black shadow-[6px_6px_0_#111] hover:-translate-y-1 hover:shadow-[8px_8px_0_#111] transition-all disabled:bg-neo-lightgray disabled:text-gray-400 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed">
                          CREATE TEAM
                        </button>
                      </form>
                    </div>
                  </div>
                  
                  {/* IMPORT CSV CARD */}
                  <div className="border-4 border-neo-black bg-white/90 backdrop-blur-md p-6 lg:p-8 shadow-brutal relative overflow-hidden">
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-neo-black/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10">
                      <h2 className="font-hero text-5xl uppercase text-neo-black drop-shadow-[3px_3px_0_#FFD600] mb-2">Import CSV</h2>
                      <p className="text-neo-black font-bold tracking-widest uppercase text-sm mb-2">Upload a spreadsheet of teams</p>
                      <p className="text-sm font-medium text-gray-500 mb-6 bg-neo-white/50 p-3 border-l-4 border-neo-black">
                        Columns required: <span className="font-bold text-neo-black">name</span>.<br />
                        Optional columns: <span className="font-bold text-neo-black">track</span> (hardware/software), plus any round names exactly matching the track columns (e.g. <span className="font-bold text-neo-black">Round 1</span>).
                      </p>
                      <input type="file" accept=".csv" onChange={e => handleCsvFile(e.target.files?.[0])} className="w-full border-4 border-neo-black bg-neo-white p-3 font-medium text-neo-black file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-4 file:border-neo-black file:text-sm file:font-black file:uppercase file:tracking-widest file:bg-neo-yellow file:text-neo-black hover:file:bg-neo-white transition-all cursor-pointer" />
                      <button disabled={busy || !csvState.parsedRows.length} onClick={handleImportCsv} className="mt-6 w-full bg-neo-black border-4 border-neo-black px-8 py-4 font-hero text-3xl uppercase tracking-widest text-neo-white shadow-[6px_6px_0_#FFD600] hover:-translate-y-1 hover:shadow-[8px_8px_0_#FFD600] transition-all disabled:bg-neo-lightgray disabled:text-gray-400 disabled:shadow-none disabled:border-gray-400 disabled:translate-y-0 disabled:cursor-not-allowed">
                        {csvState.parsedRows.length ? `Import ${csvState.parsedRows.length} Teams` : 'Upload File First'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* CURRENT TEAMS LIST */}
                <div className="border-4 border-neo-black bg-white/90 backdrop-blur-md p-6 lg:p-8 shadow-[8px_8px_0_#111]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <h3 className="font-mono font-black text-5xl uppercase text-neo-black" style={{ textShadow: "3px 3px 0px #FFD600" }}>Team Roster</h3>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <input
                        type="text"
                        placeholder="Search teams..."
                        value={manageTeamSearchQuery}
                        onChange={(e) => setManageTeamSearchQuery(e.target.value)}
                        className="border-4 border-neo-black bg-neo-white px-4 py-3 text-neo-black outline-none focus:border-neo-black transition-all flex-1 md:w-64 font-hero text-2xl placeholder:text-zinc-600 shadow-brutal"
                      />
                      {teams.length > 0 && (
                        <button
                          onClick={handleDeleteAllTeams}
                          disabled={busy}
                          className="font-hero text-xl px-4 py-3 bg-neo-red text-neo-black uppercase tracking-widest hover:bg-white hover:text-neo-red border-4 border-neo-black transition-colors shadow-brutal"
                          title="Delete all teams"
                        >
                          DELETE ALL
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...teams]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .filter(t => t.name.toLowerCase().includes(manageTeamSearchQuery.toLowerCase()))
                      .map(t => (
                      <div key={t.id} className="flex flex-col border-4 border-neo-black bg-neo-white shadow-[4px_4px_0_#000] overflow-hidden group hover:border-neo-black transition-colors">
                        <div className="p-4 bg-white/50 border-b-4 border-neo-black font-hero text-2xl truncate text-neo-black">
                          {t.name}
                        </div>
                        <div className="flex p-4 gap-4 items-center justify-between bg-neo-white">
                          <select 
                            value={t.track} 
                            onChange={(e) => handleUpdateTrack(t.id, e.target.value)} 
                            disabled={busy}
                            className="font-hero text-xl px-3 py-2 border-4 transition-colors outline-none cursor-pointer uppercase border-neo-black text-neo-black bg-neo-white"
                          >
                            {tracks.map(trk => (
                              <option key={trk.id} value={trk.id} className="bg-white">{trk.name.toUpperCase()}</option>
                            ))}
                          </select>
                          <button disabled={busy} onClick={() => handleDelete(t.id, t.name)} className="font-hero text-xl text-neo-red underline underline-offset-4 hover:text-neo-black transition-colors">REMOVE</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MANAGE ROUNDS TAB */}
            {activeTab === 'rounds' && (
              <div className="border-4 border-neo-black bg-white/90 backdrop-blur-md p-6 lg:p-8 shadow-brutal max-w-4xl mx-auto overflow-hidden relative">
                <div className="absolute top-0 -left-10 w-40 h-40 bg-neo-yellow/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="mb-12 border-b-4 border-neo-black pb-8">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-6">
                      <div>
                        <h2 className="font-mono font-black text-5xl uppercase text-neo-black" style={{ textShadow: "3px 3px 0px #FFD600" }}>Event Tracks</h2>
                        <p className="text-neo-black font-bold tracking-widest uppercase text-sm mt-2">Create custom competitive tracks</p>
                      </div>
                    </div>
                    <form onSubmit={handleAddTrack} className="flex flex-col sm:flex-row gap-4 mb-8 bg-neo-white p-6 border-4 border-neo-black shadow-[6px_6px_0_#111] relative">
                      <div className="absolute -top-4 left-4 bg-white px-2 font-black uppercase text-gray-500 tracking-widest text-xs">Create Track</div>
                      <input value={newTrackName} onChange={e => setNewTrackName(e.target.value)} className="flex-1 border-b-4 border-neo-black bg-transparent p-3 font-hero text-3xl outline-none focus:border-neo-black text-neo-black" placeholder="e.g., AI/ML or Web3" />
                      <button disabled={busy} className="bg-neo-black px-8 py-3 font-hero text-3xl uppercase tracking-widest text-neo-white shadow-[4px_4px_0_#FFD600] hover:-translate-y-1 hover:shadow-[6px_6px_0_#FFD600] transition-all disabled:opacity-50">Add Track</button>
                    </form>
                    <div className="flex flex-wrap gap-4">
                      {tracks.map(t => (
                        <div key={t.id} className="border-4 border-neo-black bg-white px-4 py-3 flex items-center gap-4 shadow-[4px_4px_0_#111]">
                          <span className="font-hero text-2xl uppercase tracking-widest">{t.name}</span>
                          <button onClick={() => handleDeleteTrack(t.id, t.name)} className="text-neo-red font-black hover:text-neo-black transition-colors" title="Delete Track">X</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b-4 border-neo-black pb-6 mb-8">
                    <div>
                      <h2 className="font-mono font-black text-5xl uppercase text-neo-black" style={{ textShadow: "3px 3px 0px #FFD600" }}>Column Structure</h2>
                      <p className="text-neo-black font-bold tracking-widest uppercase text-sm mt-2">Manage scoring factors</p>
                    </div>
                    <div className="flex gap-4 items-center flex-wrap">
                      <select 
                        value={roundManageTrack} 
                        onChange={e => setRoundManageTrack(e.target.value)} 
                        className="border-4 border-neo-black bg-neo-white px-6 py-3 font-hero text-2xl text-neo-black outline-none focus:border-white transition-colors cursor-pointer shadow-[4px_4px_0_#111]"
                      >
                        {tracks.map(t => (
                          <option key={t.id} value={t.id}>{t.name.toUpperCase()} ROUNDS</option>
                        ))}
                      </select>
                      <button
                        onClick={handleResetRoundScores}
                        disabled={busy}
                        className="font-hero text-xl px-4 py-3 bg-neo-red text-neo-black uppercase tracking-widest hover:bg-white hover:text-neo-red border-4 border-neo-black transition-colors shadow-[4px_4px_0_#111]"
                        title={`Reset ${roundManageTrack} Main Round Scores`}
                      >
                        RESET SCORES
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleAddRound} className="flex flex-col sm:flex-row gap-4 mb-10 bg-neo-white p-6 border-4 border-neo-black shadow-[6px_6px_0_#111] relative">
                    <div className="absolute -top-4 left-4 bg-white px-2 font-black uppercase text-gray-500 tracking-widest text-xs">Add New Column</div>
                    <input value={newRoundName} onChange={e => setNewRoundName(e.target.value)} className="flex-1 border-b-4 border-neo-black bg-transparent p-3 font-hero text-3xl outline-none focus:border-neo-black text-neo-black" placeholder="e.g., UI/UX Design" />
                    <button disabled={busy} className="bg-neo-black px-8 py-3 font-hero text-3xl uppercase tracking-widest text-neo-white shadow-[4px_4px_0_#FFD600] hover:-translate-y-1 hover:shadow-[6px_6px_0_#FFD600] transition-all disabled:opacity-50">Create</button>
                  </form>

                  <div>
                    <h3 className="font-hero text-gray-500 text-xl uppercase tracking-widest mb-4 flex items-center">
                      <span className="bg-neo-lightgray w-full h-1 mr-4"></span>
                      Active Configuration
                      <span className="bg-neo-lightgray w-full h-1 ml-4"></span>
                    </h3>
                    
                    <div className="space-y-4">
                      {activeRoundNames.map((r, idx) => (
                        <div key={r} className="flex flex-col sm:flex-row items-center justify-between p-4 border-4 border-neo-black bg-neo-white shadow-[4px_4px_0_#111] gap-4 group hover:border-neo-black transition-colors">
                          <span className="text-neo-black font-hero text-3xl truncate flex-1 uppercase tracking-wider"><span className="text-zinc-600 mr-3">{idx + 1}.</span>{r}</span>
                          <div className="flex gap-3">
                            <button disabled={busy} onClick={() => handleRenameRound(r)} className="px-4 py-2 border-4 border-neo-black text-neo-black font-hero text-xl uppercase tracking-widest hover:border-neo-black hover:text-neo-black transition-colors">RENAME</button>
                            <button disabled={busy || idx === 0} onClick={() => handleMoveRound(idx, 'up')} className="px-4 py-2 bg-neo-lightgray text-neo-black font-hero text-xl uppercase hover:bg-neo-lightgray disabled:opacity-30 transition-colors">UP</button>
                            <button disabled={busy || idx === activeRoundNames.length - 1} onClick={() => handleMoveRound(idx, 'down')} className="px-4 py-2 bg-neo-lightgray text-neo-black font-hero text-xl uppercase hover:bg-neo-lightgray disabled:opacity-30 transition-colors">DN</button>
                            <button disabled={busy} onClick={() => handleDeleteRound(r)} className="px-4 py-2 border-4 border-neo-black text-neo-red font-hero text-xl uppercase tracking-widest hover:bg-neo-red hover:text-neo-black transition-colors">REMOVE</button>
                          </div>
                        </div>
                      ))}
                      {activeRoundNames.length === 0 && (
                        <div className="border-4 border-dashed border-neo-black p-12 text-center font-hero text-2xl text-zinc-600 uppercase tracking-widest">
                          No rounds active in this track.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCORE VIEWER TAB */}
            {activeTab === 'scores' && (() => {
              const viewRounds = roundsByTrack?.[scoreViewTrack] || []
              const viewBonuses = bonusesByTrack?.[scoreViewTrack] || []
              const viewTeams = [...teams]
                .filter(t => t.track === scoreViewTrack)
                .sort((a, b) => b.total - a.total)

              const handleExportCSV = () => {
                const activeJudgeNames = judgesList.reduce((map, j) => { map[j.id] = j.name; return map }, {})
                const judgeIds = judgesList.filter(j => activeJudges.includes(j.id)).map(j => j.id)

                // Build header row
                const headers = ['Rank', 'Team Name']
                for (const r of viewRounds) headers.push(r)
                for (const b of viewBonuses) headers.push(b)
                headers.push('Total')

                // Build data rows
                const rows = viewTeams.map((t, idx) => {
                  const row = [idx + 1, `"${t.name}"`]
                  for (const r of viewRounds) {
                    let val = t.scores?.[r]
                    if (val && typeof val === 'object' && val.total === undefined) {
                       const vals = Object.values(val)
                       if (vals.length > 0) val = vals[0]
                    }
                    row.push((val && typeof val === 'object') ? (val.total ?? 0) : (val ?? 0))
                  }
                  for (const b of viewBonuses) row.push(t.bonuses?.[b] || 0)
                  row.push(t.total)
                  return row
                })

                const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `codepunk_scores_${scoreViewTrack}_${new Date().toISOString().slice(0,10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }
              
              return (
                <div className="border-4 border-neo-black bg-white/90 backdrop-blur-md shadow-brutal relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-neo-yellow/10 rounded-full blur-3xl pointer-events-none"></div>
                  
                  {/* Header */}
                  <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 p-6 lg:p-8 border-b-4 border-neo-black">
                    <div>
                      <h2 className="font-mono font-black text-5xl uppercase text-neo-black" style={{ textShadow: "3px 3px 0px #FFD600" }}>Score Viewer</h2>
                      <p className="text-neo-black font-bold tracking-widest uppercase text-sm mt-2">Read-only backup view of all teams and direct scores</p>
                    </div>
                    <div className="flex gap-4 items-center">
                      <span className="text-gray-500 font-bold text-xs uppercase tracking-widest">{viewTeams.length} Teams</span>
                      <select
                        value={scoreViewTrack}
                        onChange={e => { setScoreViewTrack(e.target.value); setExpandedScoreTeam(null) }}
                        className="border-4 border-neo-black bg-neo-white px-6 py-3 font-hero text-2xl text-neo-black outline-none focus:border-white transition-colors cursor-pointer shadow-[2px_2px_0_#111]"
                      >
                        {tracks.map(t => (
                          <option key={t.id} value={t.id}>{t.name.toUpperCase()} TRACK</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Single horizontal scroll container */}
                  <div className="relative z-10 overflow-x-auto scrollbar-thin">
                    <div style={{ minWidth: `${600 + viewRounds.length * 110 + viewBonuses.length * 100}px` }}>
                      
                      {/* Column Header Bar */}
                      <div className="grid gap-0 bg-neo-white border-b-4 border-neo-black px-4 py-3 sticky top-0 z-20"
                        style={{ gridTemplateColumns: `60px 1fr ${viewRounds.map(() => '100px').join(' ')} ${viewBonuses.map(() => '90px').join(' ')} 100px` }}
                      >
                        <div className="font-hero text-sm uppercase tracking-widest text-gray-500">#</div>
                        <div className="font-hero text-sm uppercase tracking-widest text-gray-500">Team Name</div>
                        {viewRounds.map(r => <div key={r} className="font-hero text-sm uppercase tracking-widest text-gray-500 text-center">{r}</div>)}
                        {viewBonuses.map(b => <div key={`bh_${b}`} className="font-hero text-sm uppercase tracking-widest text-neo-black/60 text-center">{b}</div>)}
                        <div className="font-hero text-sm uppercase tracking-widest text-gray-500 text-center">Total</div>
                      </div>

                      {/* Team Rows */}
                      {viewTeams.map((t, idx) => {
                        const rank = idx + 1
                        const isExpanded = expandedScoreTeam === t.id
                        const isTop3 = rank <= 3
                        
                        let accentColorText = 'text-gray-500'
                        let accentColorBg = 'bg-gray-500'
                        if (rank === 1) { accentColorText = 'text-neo-yellow'; accentColorBg = 'bg-neo-yellow' }
                        else if (rank === 2) { accentColorText = 'text-neo-black'; accentColorBg = 'bg-neo-black' }
                        else if (rank === 3) { accentColorText = 'text-neo-red'; accentColorBg = 'bg-neo-red' }

                        return (
                          <div key={t.id}>
                            {/* Overview Row */}
                            <div
                              onClick={() => setExpandedScoreTeam(isExpanded ? null : t.id)}
                              className={`grid gap-0 items-center px-4 py-3 cursor-pointer transition-all border-b-4 border-neo-black/50 hover:bg-neo-yellow/20 ${
                                isExpanded ? 'bg-neo-yellow/40 border-l-4 border-l-neo-black' : isTop3 ? 'bg-white/60' : (idx % 2 === 0 ? 'bg-white/20' : 'bg-neo-white/20')
                              }`}
                              style={{ gridTemplateColumns: `60px 1fr ${viewRounds.map(() => '100px').join(' ')} ${viewBonuses.map(() => '90px').join(' ')} 100px` }}
                            >
                              {/* Rank */}
                              <div className={`font-hero text-2xl tabular-nums ${isTop3 ? accentColorText : 'text-gray-500'} drop-shadow-[1px_1px_0_#111]`}>
                                {rank}
                              </div>

                              {/* Team Name */}
                              <div className="flex items-center gap-3 min-w-0 pr-4">
                                {isTop3 && <div className={`w-2 h-8 ${accentColorBg} border-2 border-neo-black flex-shrink-0`}></div>}
                                <div className="min-w-0">
                                  <div className={`font-hero text-xl truncate text-neo-black`}>{t.name}</div>
                                </div>
                              </div>

                              {/* Round Scores */}
                              {viewRounds.map(r => {
                                let val = t.scores?.[r]
                                if (val && typeof val === 'object' && val.total === undefined) {
                                   const vals = Object.values(val)
                                   if (vals.length > 0) val = vals[0]
                                }
                                const score = (val && typeof val === 'object') ? val.total : (val ?? 0)
                                return (
                                  <div key={r} className="text-center">
                                    <span className={`font-hero text-xl tabular-nums ${score > 0 ? 'text-neo-black' : 'text-zinc-600'}`}>{score}</span>
                                  </div>
                                )
                              })}

                              {/* Bonuses */}
                              {viewBonuses.map(b => (
                                <div key={`bd_${b}`} className="text-center">
                                  <span className={`font-hero text-xl tabular-nums ${(t.bonuses?.[b] || 0) > 0 ? 'text-neo-black' : 'text-zinc-600'}`}>{t.bonuses?.[b] || 0}</span>
                                </div>
                              ))}

                              {/* Total */}
                              <div className="text-center">
                                <span className={`font-hero text-2xl font-black tabular-nums ${isTop3 ? 'text-neo-black' : 'text-neo-black'}`}>{t.total}</span>
                              </div>
                            </div>


                          </div>
                        )
                      })}

                      {viewTeams.length === 0 && (
                        <div className="p-12 text-center font-hero text-2xl text-zinc-600 uppercase tracking-widest">No teams in this track</div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="relative z-10 px-6 py-4 bg-neo-white/50 border-t-4 border-neo-black flex flex-wrap gap-6 items-center justify-between">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                      {viewTeams.length} teams · {viewRounds.length} rounds · {viewBonuses.length} bonuses · Read-only
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="text-xs text-zinc-600 font-bold uppercase tracking-widest">
                        Click any team row to expand
                      </div>
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-6 py-2 border-4 border-neo-black bg-neo-yellow text-neo-white font-hero text-xl uppercase tracking-widest shadow-[4px_4px_0_#111] hover:-translate-y-1 hover:shadow-[6px_6px_0_#111] transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3"/></svg>
                        EXPORT CSV
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}

          </div>
        )}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 border-4 px-6 py-4 font-bold shadow-brutal ${toast.type==='error'?'bg-neo-red':'bg-neo-yellow text-neo-white'}`}>
            {toast.message}
          </div>
        )}
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-black/80 backdrop-blur-sm">
            <div className="border-4 border-neo-black bg-white p-8 shadow-[12px_12px_0_#FFD600] w-full max-w-lg relative">
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
                    onClick={() => {
                      if (modal.onCancel) modal.onCancel();
                      setModal(null);
                    }}
                    className="flex-1 bg-white text-neo-black border-4 border-neo-black py-3 font-hero text-xl uppercase tracking-widest hover:bg-neo-lightgray transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </MotionDiv>
    </div>
  )
}


