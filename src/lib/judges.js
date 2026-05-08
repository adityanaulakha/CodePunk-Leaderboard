import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { db, firebaseEnabled } from './firebase.js'
import { CONFIG_DOC } from './teams.js'

export function assertFirebaseEnabled() {
  if (!firebaseEnabled || !db) {
    throw new Error('Firebase is not configured.')
  }
}

function getJudgesCol(hackathonId) {
  return collection(db, 'hackathons', hackathonId, 'judges')
}

function getGlobalsDoc(hackathonId) {
  return doc(db, 'hackathons', hackathonId, 'settings', CONFIG_DOC)
}

// 1. Add Judge
export async function addJudge(hackathonId, uid, name) {
  assertFirebaseEnabled()
  if (!hackathonId || !uid || !name) throw new Error('Missing hackathonId, uid or name')

  const batch = writeBatch(db)
  
  // Create judge doc
  const judgeRef = doc(db, 'hackathons', hackathonId, 'judges', uid)
  batch.set(judgeRef, {
    id: uid,
    name: name.trim(),
    isActive: true,
    updatedAt: serverTimestamp()
  })

  // Add to activeJudges in settings
  const globalsRef = getGlobalsDoc(hackathonId)
  const globalsSnap = await getDoc(globalsRef)
  let activeJudges = []
  if (globalsSnap.exists()) {
    activeJudges = globalsSnap.data().activeJudges || []
  }
  if (!activeJudges.includes(uid)) {
    activeJudges.push(uid)
    batch.set(globalsRef, { activeJudges, updatedAt: serverTimestamp() }, { merge: true })
  }

  // Update hackathon document with judges array for easy querying
  const hackathonRef = doc(db, 'hackathons', hackathonId)
  batch.update(hackathonRef, { judges: arrayUnion(uid) })

  await batch.commit()
}

// 2. Remove / Disable Judge
export async function removeJudge(hackathonId, judgeId) {
  assertFirebaseEnabled()
  if (!hackathonId || !judgeId) throw new Error('Missing hackathonId or judgeId')
  
  // 1. Update settings/globals to remove from activeJudges
  const globalsRef = getGlobalsDoc(hackathonId)
  const globalsSnap = await getDoc(globalsRef)
  let activeJudges = []
  if (globalsSnap.exists()) {
    activeJudges = globalsSnap.data().activeJudges || []
  }
  
  if (activeJudges.includes(judgeId)) {
    activeJudges = activeJudges.filter(id => id !== judgeId)
    await updateDoc(globalsRef, { activeJudges, updatedAt: serverTimestamp() })
  }

  // 2. Update hackathon document to remove from judges array
  const hackathonRef = doc(db, 'hackathons', hackathonId)
  await updateDoc(hackathonRef, { judges: arrayRemove(judgeId) })

  // 3. Set isActive false (or delete)
  await deleteDoc(doc(db, 'hackathons', hackathonId, 'judges', judgeId))
}

// 3. Edit Judge Name
export async function updateJudgeName(hackathonId, judgeId, newName) {
  assertFirebaseEnabled()
  if(!hackathonId || !judgeId || !newName) return
  await updateDoc(doc(db, 'hackathons', hackathonId, 'judges', judgeId), {
    name: newName.trim(),
    updatedAt: serverTimestamp()
  })
}

// 4. Submit Score & Average Logic (Singular Wrapper)
export async function submitScore(hackathonId, teamId, roundName, judgeId, scoreData) {
  return submitScoresBatch(hackathonId, teamId, { [roundName]: scoreData }, judgeId)
}

// 4b. Submit Multiple Scores Safely
export async function submitScoresBatch(hackathonId, teamId, roundScoresMap, judgeId) {
  assertFirebaseEnabled()
  if (!hackathonId || !teamId || !judgeId) throw new Error('Missing parameters')
  const roundNames = Object.keys(roundScoresMap)
  if (!roundNames.length) return

  // Get current state to verify judge activity and locks
  const globalsRef = getGlobalsDoc(hackathonId)
  const globalsSnap = await getDoc(globalsRef)
  const data_globals = globalsSnap.exists() ? globalsSnap.data() : {}
  const activeJudges = data_globals.activeJudges || []
  const lockedRounds = data_globals.lockedRounds || []
  
  if (!activeJudges.includes(judgeId)) {
    throw new Error('Judge is not active or deleted')
  }

  const teamRef = doc(db, 'hackathons', hackathonId, 'teams', teamId)
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
