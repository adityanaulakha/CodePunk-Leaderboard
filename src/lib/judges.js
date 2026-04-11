import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore'
import { db, firebaseEnabled } from './firebase.js'
import { TEAMS_COLLECTION, SETTINGS_COLLECTION, CONFIG_DOC } from './teams.js'

export const JUDGES_COLLECTION = 'judges'

export function assertFirebaseEnabled() {
  if (!firebaseEnabled || !db) {
    throw new Error('Firebase is not configured.')
  }
}

// 1. Add Judge
export async function addJudge(uid, name) {
  assertFirebaseEnabled()
  if (!uid || !name) throw new Error('Missing judge uid or name')

  const batch = writeBatch(db)
  
  // Create judge doc
  const judgeRef = doc(db, JUDGES_COLLECTION, uid)
  batch.set(judgeRef, {
    id: uid,
    name: name.trim(),
    isActive: true,
    updatedAt: serverTimestamp()
  })

  // Add to activeJudges in settings
  const globalsRef = doc(db, SETTINGS_COLLECTION, CONFIG_DOC)
  const globalsSnap = await getDoc(globalsRef)
  let activeJudges = []
  if (globalsSnap.exists()) {
    activeJudges = globalsSnap.data().activeJudges || []
  }
  if (!activeJudges.includes(uid)) {
    activeJudges.push(uid)
    batch.set(globalsRef, { activeJudges, updatedAt: serverTimestamp() }, { merge: true })
  }

  await batch.commit()
}

// 2. Remove / Disable Judge
export async function removeJudge(judgeId) {
  assertFirebaseEnabled()
  
  // 1. Update settings/globals to remove from activeJudges
  const globalsRef = doc(db, SETTINGS_COLLECTION, CONFIG_DOC)
  const globalsSnap = await getDoc(globalsRef)
  let activeJudges = []
  if (globalsSnap.exists()) {
    activeJudges = globalsSnap.data().activeJudges || []
  }
  
  if (activeJudges.includes(judgeId)) {
    activeJudges = activeJudges.filter(id => id !== judgeId)
    await updateDoc(globalsRef, { activeJudges, updatedAt: serverTimestamp() })
  }

  // 2. Set isActive false (or delete)
  await deleteDoc(doc(db, JUDGES_COLLECTION, judgeId))

  // Removed recalculate logic since scoring is absolute now.
}

// 3. Edit Judge Name
export async function updateJudgeName(judgeId, newName) {
  assertFirebaseEnabled()
  if(!newName) return
  await updateDoc(doc(db, JUDGES_COLLECTION, judgeId), {
    name: newName.trim(),
    updatedAt: serverTimestamp()
  })
}

// 4. Submit Score & Average Logic (Singular Wrapper)
export async function submitScore(teamId, roundName, judgeId, scoreData) {
  return submitScoresBatch(teamId, { [roundName]: scoreData }, judgeId)
}

// 4b. Submit Multiple Scores Safely
export async function submitScoresBatch(teamId, roundScoresMap, judgeId) {
  assertFirebaseEnabled()
  const roundNames = Object.keys(roundScoresMap)
  if (!roundNames.length) return

  // Get current state to verify judge activity and locks
  const globalsRef = doc(db, SETTINGS_COLLECTION, CONFIG_DOC)
  const globalsSnap = await getDoc(globalsRef)
  const data_globals = globalsSnap.exists() ? globalsSnap.data() : {}
  const activeJudges = data_globals.activeJudges || []
  const lockedRounds = data_globals.lockedRounds || []
  
  if (!activeJudges.includes(judgeId)) {
    throw new Error('Judge is not active or deleted')
  }

  const teamRef = doc(db, TEAMS_COLLECTION, teamId)
  const teamSnap = await getDoc(teamRef)
  if (!teamSnap.exists()) throw new Error('Team not found')
  const teamData = teamSnap.data()
  
  // Validate Locks
  for (const rname of roundNames) {
    if (lockedRounds.includes(`${teamData.track}_${rname}`)) {
      throw new Error(`Round "${rname}" is LOCKED. Cannot save scores.`)
    }
  }

  const scores = teamData.scores || {}

  for (const rname of roundNames) {
    // Score becomes absolute immediately.
    scores[rname] = roundScoresMap[rname]
  }

  await updateDoc(teamRef, {
    scores,
    updatedAt: serverTimestamp()
  })
}
