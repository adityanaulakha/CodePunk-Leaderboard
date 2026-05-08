import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, query } from 'firebase/firestore'
import { db, firebaseEnabled } from '../lib/firebase.js'
import { normalizeTeamDoc, CONFIG_DOC } from '../lib/teams.js'

function sortTeams(a, b) {
  if (b.total !== a.total) return b.total - a.total
  const nameA = a.name.toLowerCase()
  const nameB = b.name.toLowerCase()
  if (nameA < nameB) return -1
  if (nameA > nameB) return 1
  return a.id.localeCompare(b.id)
}

function scoresChanged(prev, next) {
  if (!prev) return true
  const prevScores = prev.scores || {}
  const nextScores = next.scores || {}
  let keys = new Set([...Object.keys(prevScores), ...Object.keys(nextScores)])
  for (const k of keys) {
    const prevVal = prevScores[k] && typeof prevScores[k] === 'object' ? prevScores[k].total : prevScores[k]
    const nextVal = nextScores[k] && typeof nextScores[k] === 'object' ? nextScores[k].total : nextScores[k]
    if (prevVal !== nextVal) return true
  }
  
  const prevBonus = prev.bonuses || {}
  const nextBonus = next.bonuses || {}
  keys = new Set([...Object.keys(prevBonus), ...Object.keys(nextBonus)])
  for (const k of keys) {
    if (prevBonus[k] !== nextBonus[k]) return true
  }
  
  return false
}

export default function useTeamsRealtime(hackathonId) {
  const [teams, setTeams] = useState([])
  const [tracks, setTracks] = useState([{ id: 'software', name: 'Software' }, { id: 'hardware', name: 'Hardware' }])
  const [roundsByTrack, setRoundsByTrack] = useState({ software: ['Round 1', 'Round 2', 'Final'], hardware: ['Round 1', 'Round 2', 'Final'] })
  const [bonusesByTrack, setBonusesByTrack] = useState({ software: ['HackerRank', 'Riddle Bonus'], hardware: [] })
  const [isFrozen, setIsFrozen] = useState(false)
  const [celebrationAt, setCelebrationAt] = useState(null)
  const [activeJudges, setActiveJudges] = useState([])
  const [judgesList, setJudgesList] = useState([])
  const [rubrics, setRubrics] = useState({})
  const [lockedRounds, setLockedRounds] = useState([])
  const [updatedIds, setUpdatedIds] = useState(() => new Set())
  const [lastUpdateAt, setLastUpdateAt] = useState(null)
  const [hackathonData, setHackathonData] = useState(null)

  useEffect(() => {
    if (!firebaseEnabled || !db || !hackathonId) return undefined

    const prevById = new Map()
    const timers = new Map()

    const q = query(collection(db, 'hackathons', hackathonId, 'teams'))
    const unsubTeams = onSnapshot(q, (snap) => {
      const next = []
      const nextUpdated = new Set()

      for (const d of snap.docs) {
        const normalized = normalizeTeamDoc(d)
        next.push(normalized)

        const prev = prevById.get(normalized.id)
        if (prev && scoresChanged(prev, normalized)) {
          nextUpdated.add(normalized.id)
        }

        prevById.set(normalized.id, normalized)
      }

      next.sort(sortTeams)
      setTeams(next)
      setLastUpdateAt(Date.now())

      if (nextUpdated.size) {
        setUpdatedIds((current) => {
          const merged = new Set(current)
          for (const id of nextUpdated) merged.add(id)
          return merged
        })

        for (const id of nextUpdated) {
          const existing = timers.get(id)
          if (existing) clearTimeout(existing)
          const t = setTimeout(() => {
            setUpdatedIds((current) => {
              const nextSet = new Set(current)
              nextSet.delete(id)
              return nextSet
            })
            timers.delete(id)
          }, 1400)
          timers.set(id, t)
        }
      }
    })

    const unsubSettings = onSnapshot(doc(db, 'hackathons', hackathonId, 'settings', CONFIG_DOC), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        
        if (data.tracks && Array.isArray(data.tracks)) {
          setTracks(data.tracks)
        } else {
          setTracks([{ id: 'software', name: 'Software' }, { id: 'hardware', name: 'Hardware' }])
        }

        const nextRounds = { software: [], hardware: [] }
        if (data.rounds && !Array.isArray(data.rounds)) {
          Object.assign(nextRounds, data.rounds)
        } else {
          if (Array.isArray(data.rounds_software)) nextRounds.software = data.rounds_software
          else if (Array.isArray(data.rounds)) nextRounds.software = data.rounds
          if (Array.isArray(data.rounds_hardware)) nextRounds.hardware = data.rounds_hardware
          else if (Array.isArray(data.rounds)) nextRounds.hardware = data.rounds
        }
        setRoundsByTrack(nextRounds)

        const nextBonuses = { software: [], hardware: [] }
        if (data.bonuses && !Array.isArray(data.bonuses)) {
          Object.assign(nextBonuses, data.bonuses)
        } else {
          if (Array.isArray(data.bonuses_software)) nextBonuses.software = data.bonuses_software
          if (Array.isArray(data.bonuses_hardware)) nextBonuses.hardware = data.bonuses_hardware
        }
        setBonusesByTrack(nextBonuses)

        setIsFrozen(Boolean(data.isFrozen))
        if (data.activeJudges) setActiveJudges(data.activeJudges)
        if (data.rubrics) setRubrics(data.rubrics)
        if (data.lockedRounds) setLockedRounds(data.lockedRounds)
        if (data.celebrationAt) {
          setCelebrationAt(data.celebrationAt.toMillis ? data.celebrationAt.toMillis() : Date.now())
        }
      }
    })

    const unsubJudges = onSnapshot(collection(db, 'hackathons', hackathonId, 'judges'), (snap) => {
      const parsed = []
      snap.forEach(d => {
        parsed.push({ ...d.data(), id: d.id })
      })
      parsed.sort((a,b) => a.name?.localeCompare(b.name))
      setJudgesList(parsed)
    })

    const unsubHackathon = onSnapshot(doc(db, 'hackathons', hackathonId), (snap) => {
      if (snap.exists()) {
        setHackathonData({ id: snap.id, ...snap.data() })
      } else {
        setHackathonData(null)
      }
    })

    return () => {
      unsubTeams()
      unsubSettings()
      unsubJudges()
      unsubHackathon()
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
    }
  }, [hackathonId])

  const updatedIdsMemo = useMemo(() => updatedIds, [updatedIds])
  return { 
    teams, 
    tracks, 
    roundsByTrack, 
    bonusesByTrack,
    isFrozen, 
    celebrationAt, 
    updatedIds: updatedIdsMemo, 
    lastUpdateAt,
    activeJudges,
    judgesList,
    rubrics,
    lockedRounds,
    hackathonData
  }
}
