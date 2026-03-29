import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
  setDoc
} from 'firebase/firestore'
import { db, firebaseEnabled } from './firebase.js'

export const TEAMS_COLLECTION = 'teams'
export const SETTINGS_COLLECTION = 'settings'
export const CONFIG_DOC = 'globals'

export function computeTotal(scoresObj) {
  if (!scoresObj) return 0
  let total = 0
  for (const v of Object.values(scoresObj)) {
    const num = Number(v)
    if (Number.isFinite(num)) total += num
  }
  return total
}

export function normalizeTeamDoc(docSnap) {
  const data = docSnap.data() || {}
  
  // Backward compatibility + new map
  const scores = { ...(data.scores || {}) }
  const isMigrated = Object.keys(scores).length > 0
  
  if (!isMigrated) {
    if (data.round1 !== undefined) scores['Round 1'] = Number(data.round1)
    if (data.round2 !== undefined) scores['Round 2'] = Number(data.round2)
    if (data.finalEval !== undefined) scores['Final'] = Number(data.finalEval)
  }

  const normalized = {
    id: docSnap.id,
    name: String(data.name ?? ''),
    track: String(data.track ?? 'software').toLowerCase(),
    scores,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }

  return { ...normalized, total: computeTotal(scores) }
}

export function assertFirebaseEnabled() {
  if (!firebaseEnabled || !db) {
    throw new Error(
      'Firebase is not configured. Add VITE_FIREBASE_* env vars and restart the dev server.',
    )
  }
}

export async function addTeam({ name, track = 'software', scores = {} }) {
  assertFirebaseEnabled()
  const trimmedName = String(name).trim()
  if (!trimmedName) throw new Error('Team name is missing')

  await addDoc(collection(db, TEAMS_COLLECTION), {
    name: trimmedName,
    track: String(track).toLowerCase(),
    scores,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateTeamScores(teamId, passedScores) {
  assertFirebaseEnabled()
  if (!teamId) throw new Error('Missing team id')

  const cleanedScores = {}
  for (const [k, v] of Object.entries(passedScores)) {
    cleanedScores[k] = Number(v) || 0
  }

  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), {
    scores: cleanedScores,
    updatedAt: serverTimestamp(),
  })
}

export async function updateTeamTrack(teamId, track) {
  assertFirebaseEnabled()
  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), {
    track: String(track).toLowerCase(),
    updatedAt: serverTimestamp()
  })
}

export async function deleteTeam(teamId) {
  assertFirebaseEnabled()
  if (!teamId) throw new Error('Missing team id')
  await deleteDoc(doc(db, TEAMS_COLLECTION, teamId))
}

export async function bulkImportTeams(rows) {
  assertFirebaseEnabled()
  if (!Array.isArray(rows)) throw new Error('Rows must be an array')

  const batch = writeBatch(db)
  const teamsCol = collection(db, TEAMS_COLLECTION)

  let added = 0
  for (const row of rows) {
    const name = String(row.name ?? '').trim()
    if (!name) continue
    const ref = doc(collection(db, TEAMS_COLLECTION))
    batch.set(ref, {
      name,
      track: String(row.track || row.Track || 'software').toLowerCase(),
      scores: row.scores || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    added += 1
  }

  if (!added) return { added: 0 }
  await batch.commit()
  return { added }
}

export async function updateRoundNames(track, roundsArray) {
  assertFirebaseEnabled()
  if (!Array.isArray(roundsArray)) throw new Error('roundsArray must be an array')
  const field = track === 'hardware' ? 'rounds_hardware' : 'rounds_software'
  await setDoc(doc(db, SETTINGS_COLLECTION, CONFIG_DOC), {
    [field]: roundsArray,
    updatedAt: serverTimestamp()
  }, { merge: true })
}

export async function setLeaderboardFrozen(isFrozen) {
  assertFirebaseEnabled()
  await setDoc(doc(db, SETTINGS_COLLECTION, CONFIG_DOC), {
    isFrozen: Boolean(isFrozen),
    updatedAt: serverTimestamp()
  }, { merge: true })
}

export async function triggerCelebration() {
  assertFirebaseEnabled()
  await setDoc(doc(db, SETTINGS_COLLECTION, CONFIG_DOC), {
    isFrozen: false,
    celebrationAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true })
}

export async function renameRound(track, oldName, newName, currentRounds) {
  assertFirebaseEnabled()
  if (!oldName || !newName || oldName === newName) return

  const updatedRounds = currentRounds.map(r => r === oldName ? newName : r)
  const batch = writeBatch(db)
  
  const field = track === 'hardware' ? 'rounds_hardware' : 'rounds_software'
  batch.set(doc(db, SETTINGS_COLLECTION, CONFIG_DOC), {
    [field]: updatedRounds,
    updatedAt: serverTimestamp()
  }, { merge: true })

  const snap = await getDocs(collection(db, TEAMS_COLLECTION))
  for (const teamDoc of snap.docs) {
    const data = teamDoc.data()
    const teamTrack = String(data.track || 'software').toLowerCase()
    if (teamTrack !== track) continue

    const scores = data.scores || {}
    if (scores[oldName] !== undefined) {
      const val = scores[oldName]
      delete scores[oldName]
      scores[newName] = val
      batch.update(teamDoc.ref, {
        scores,
        updatedAt: serverTimestamp()
      })
    }
  }

  await batch.commit()
}
