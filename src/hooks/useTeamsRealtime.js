import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, query } from 'firebase/firestore'
import { db, firebaseEnabled } from '../lib/firebase.js'
import { normalizeTeamDoc, TEAMS_COLLECTION, SETTINGS_COLLECTION, CONFIG_DOC } from '../lib/teams.js'

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
  const keys = new Set([...Object.keys(prevScores), ...Object.keys(nextScores)])
  for (const k of keys) {
    if (prevScores[k] !== nextScores[k]) return true
  }
  return false
}

export default function useTeamsRealtime() {
  const [teams, setTeams] = useState([])
  const [roundNamesSoftware, setRoundNamesSoftware] = useState(['Round 1', 'Round 2', 'Final'])
  const [roundNamesHardware, setRoundNamesHardware] = useState(['Round 1', 'Round 2', 'Final'])
  const [isFrozen, setIsFrozen] = useState(false)
  const [celebrationAt, setCelebrationAt] = useState(null)
  const [updatedIds, setUpdatedIds] = useState(() => new Set())
  const [lastUpdateAt, setLastUpdateAt] = useState(null)

  useEffect(() => {
    if (!firebaseEnabled || !db) return undefined

    const prevById = new Map()
    const timers = new Map()

    const q = query(collection(db, TEAMS_COLLECTION))
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

    const unsubSettings = onSnapshot(doc(db, SETTINGS_COLLECTION, CONFIG_DOC), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        
        if (Array.isArray(data.rounds_software)) setRoundNamesSoftware(data.rounds_software)
        else if (Array.isArray(data.rounds)) setRoundNamesSoftware(data.rounds)
        
        if (Array.isArray(data.rounds_hardware)) setRoundNamesHardware(data.rounds_hardware)
        else if (Array.isArray(data.rounds)) setRoundNamesHardware(data.rounds)

        setIsFrozen(Boolean(data.isFrozen))
        if (data.celebrationAt) {
          setCelebrationAt(data.celebrationAt.toMillis ? data.celebrationAt.toMillis() : Date.now())
        }
      }
    })

    return () => {
      unsubTeams()
      unsubSettings()
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
    }
  }, [])

  const updatedIdsMemo = useMemo(() => updatedIds, [updatedIds])
  return { teams, roundNamesSoftware, roundNamesHardware, isFrozen, celebrationAt, updatedIds: updatedIdsMemo, lastUpdateAt }
}
