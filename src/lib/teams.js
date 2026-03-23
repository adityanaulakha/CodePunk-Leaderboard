import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
  const scores = data.scores || {}
  if (data.round1 !== undefined && !scores['Round 1']) scores['Round 1'] = Number(data.round1)
  if (data.round2 !== undefined && !scores['Round 2']) scores['Round 2'] = Number(data.round2)
  if (data.finalEval !== undefined && !scores['Final']) scores['Final'] = Number(data.finalEval)

  const normalized = {
    id: docSnap.id,
    name: String(data.name ?? ''),
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

export async function addTeam({ name, scores = {} }) {
  assertFirebaseEnabled()
  const trimmedName = String(name ?? '').trim()
  if (!trimmedName) throw new Error('Team name is required')

  await addDoc(collection(db, TEAMS_COLLECTION), {
    name: trimmedName,
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
    const ref = doc(teamsCol)
    batch.set(ref, {
      name,
      scores: row.scores || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    added += 1
  }

  if (!added) return { added: 0 }
  await batch.commit()
  return { added }
}

export async function updateRoundNames(roundsArray) {
  assertFirebaseEnabled()
  if (!Array.isArray(roundsArray)) throw new Error('roundsArray must be an array')
  await setDoc(doc(db, SETTINGS_COLLECTION, CONFIG_DOC), {
    rounds: roundsArray,
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
