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

  // 3. Recalculate ALL teams since the active judges reduced
  await recalculateAllTeamsDueToJudgeChange(activeJudges)
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

  // Get current active judges to verify state
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
  const scores_avg = teamData.scores_avg || {}
  const judgeStatus = teamData.judgeStatus || {}

  for (const rname of roundNames) {
    const scoreData = roundScoresMap[rname]

    // Initialize structure
    if (typeof scores[rname] !== 'object' || scores[rname] === null) {
      scores[rname] = {}
    }
    if (!judgeStatus[rname]) {
      judgeStatus[rname] = { submittedBy: [], isComplete: false }
    }

    // 1. Store score
    scores[rname][judgeId] = scoreData

    // 2. Add to submittedBy
    if (!judgeStatus[rname].submittedBy.includes(judgeId)) {
      judgeStatus[rname].submittedBy.push(judgeId)
    }

    // 3. Calc Average
    const validSubmissions = judgeStatus[rname].submittedBy.filter(id => activeJudges.includes(id))
    const isComplete = activeJudges.length > 0 && activeJudges.every(id => validSubmissions.includes(id))
    judgeStatus[rname].isComplete = isComplete

    if (isComplete) {
      let sum = 0
      for (const uid of activeJudges) {
        const val = scores[rname][uid]
        const num = (val !== null && typeof val === 'object') ? val.total : Number(val)
        sum += (num || 0)
      }
      scores_avg[rname] = Math.round((sum / activeJudges.length) * 100) / 100
    } else {
      scores_avg[rname] = 0
    }
  }

  await updateDoc(teamRef, {
    scores,
    scores_avg,
    judgeStatus,
    updatedAt: serverTimestamp()
  })
}

// Private Method to Recalculate Averages on Judge Removal
async function recalculateAllTeamsDueToJudgeChange(activeJudges) {
  const snap = await getDocs(collection(db, TEAMS_COLLECTION))
  let batch = writeBatch(db)
  let count = 0

  for (const teamDoc of snap.docs) {
    const data = teamDoc.data()
    const scores = data.scores || {}
    let mutated = false

    const scores_avg = data.scores_avg || {}
    const judgeStatus = data.judgeStatus || {}

    // Iterate through all rounds this team has
    for (const roundName of Object.keys(judgeStatus)) {
      const status = judgeStatus[roundName]
      const validSubmissions = status.submittedBy.filter(id => activeJudges.includes(id))
      
      const isComplete = activeJudges.length > 0 && activeJudges.every(id => validSubmissions.includes(id))
      status.isComplete = isComplete
      
      if (isComplete) {
         let sum = 0
         for (const uid of activeJudges) {
            const val = scores[roundName] && scores[roundName][uid] ? scores[roundName][uid] : 0
            const num = (val !== null && typeof val === 'object') ? val.total : Number(val)
            sum += (num || 0)
         }
         scores_avg[roundName] = Math.round((sum / activeJudges.length) * 100) / 100
      } else {
         scores_avg[roundName] = 0
      }
      mutated = true
    }

    if (mutated) {
      batch.update(teamDoc.ref, {
        scores_avg,
        judgeStatus,
        updatedAt: serverTimestamp()
      })
      count++
      if (count >= 400) { 
         await batch.commit()
         batch = writeBatch(db) // FIXED: Reinstantiate after commit
         count = 0
      }
    }
  }

  if(count > 0) {
    await batch.commit()
  }
}
