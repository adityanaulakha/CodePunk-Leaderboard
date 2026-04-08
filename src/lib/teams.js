import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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

export function computeTotal(teamData) {
  let total = 0
  
  const avg = teamData.scores_avg || {}
  for (const v of Object.values(avg)) {
    const num = Number(v)
    if (Number.isFinite(num)) total += num
  }
  
  const bonuses = teamData.bonuses || {}
  for (const v of Object.values(bonuses)) {
    const num = Number(v)
    if (Number.isFinite(num)) total += num
  }
  
  return total
}

export function normalizeTeamDoc(docSnap) {
  const data = docSnap.data() || {}
  
  let bonuses = data.bonuses
  if (!bonuses) {
     bonuses = {}
     if (data.hackerRankScore !== undefined) bonuses['HackerRank'] = Number(data.hackerRankScore) || 0
     if (data.riddleBonus !== undefined) bonuses['Riddle Bonus'] = Number(data.riddleBonus) || 0
  }
  
  const normalized = {
    id: docSnap.id,
    name: String(data.name ?? ''),
    track: String(data.track ?? 'software').toLowerCase(),
    scores: data.scores || {},
    scores_avg: data.scores_avg || {},
    judgeStatus: data.judgeStatus || {},
    bonuses,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }

  return { ...normalized, total: computeTotal(normalized) }
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



export async function updateTeamBonuses(teamId, bonusesObj) {
  assertFirebaseEnabled()
  const clean = {}
  for (const [k, v] of Object.entries(bonusesObj || {})) {
     clean[k] = Number(v) || 0
  }
  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), {
    bonuses: clean,
    updatedAt: serverTimestamp()
  })
}

export async function updateBonusNames(track, bonusesArray) {
  assertFirebaseEnabled()
  if (!Array.isArray(bonusesArray)) throw new Error('bonusesArray must be an array')
  
  // 1. Get current to see if we are deleting anything
  const globalsRef = doc(db, SETTINGS_COLLECTION, CONFIG_DOC)
  const snap = await getDoc(globalsRef)
  const field = track === 'hardware' ? 'bonuses_hardware' : 'bonuses_software'
  const oldBonuses = snap.exists() ? (snap.data()[field] || []) : []
  
  // 2. Perform the update
  await setDoc(globalsRef, {
    [field]: bonusesArray,
    updatedAt: serverTimestamp()
  }, { merge: true })

  // 3. Purge data if a bonus was removed
  const removed = oldBonuses.filter(b => !bonusesArray.includes(b))
  if (removed.length > 0) {
    await purgeTeamsData(track, 'bonuses', removed)
  }
}

async function purgeTeamsData(track, mapField, keysToRemove) {
  const snap = await getDocs(collection(db, TEAMS_COLLECTION))
  let batch = writeBatch(db)
  let count = 0
  for (const teamDoc of snap.docs) {
    const data = teamDoc.data()
    const teamTrack = String(data.track || 'software').toLowerCase()
    if (teamTrack !== track) continue

    const map = data[mapField] || {}
    let mutated = false
    for (const k of keysToRemove) {
      if (map[k] !== undefined) {
        delete map[k]
        mutated = true
      }
    }
    if (mutated) {
      batch.update(teamDoc.ref, { [mapField]: map, updatedAt: serverTimestamp() })
      count++
      if (count >= 400) {
        await batch.commit()
        batch = writeBatch(db)
        count = 0
      }
    }
  }
  if (count > 0) await batch.commit()
}

export async function toggleRoundLock(track, roundName, currentLockedRounds = []) {
  assertFirebaseEnabled()
  const lockKey = `${track}_${roundName}`
  let nextLocked = []
  if (currentLockedRounds.includes(lockKey)) {
    nextLocked = currentLockedRounds.filter(l => l !== lockKey)
  } else {
    nextLocked = [...currentLockedRounds, lockKey]
  }
  await setDoc(doc(db, SETTINGS_COLLECTION, CONFIG_DOC), {
    lockedRounds: nextLocked,
    updatedAt: serverTimestamp()
  }, { merge: true })
}

export async function updateRubrics(rubricsMap) {
  assertFirebaseEnabled()
  await setDoc(doc(db, SETTINGS_COLLECTION, CONFIG_DOC), {
    rubrics: rubricsMap,
    updatedAt: serverTimestamp()
  }, { merge: true })
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
  
  const globalsRef = doc(db, SETTINGS_COLLECTION, CONFIG_DOC)
  const snap = await getDoc(globalsRef)
  const field = track === 'hardware' ? 'rounds_hardware' : 'rounds_software'
  const oldRounds = snap.exists() ? (snap.data()[field] || []) : []
  
  await setDoc(globalsRef, {
    [field]: roundsArray,
    updatedAt: serverTimestamp()
  }, { merge: true })

  const removed = oldRounds.filter(r => !roundsArray.includes(r))
  if (removed.length > 0) {
    // 1. Purge from rubrics map
    const rubrics = snap.exists() ? (snap.data().rubrics || {}) : {}
    let rubricMutated = false
    for (const r of removed) {
      if (rubrics[`${track}_${r}`]) {
        delete rubrics[`${track}_${r}`]
        rubricMutated = true
      }
    }
    if (rubricMutated) {
      await setDoc(globalsRef, { rubrics, updatedAt: serverTimestamp() }, { merge: true })
    }

    // 2. Purge scores, scores_avg, and judgeStatus
    await purgeTeamsData(track, 'scores', removed)
    await purgeTeamsData(track, 'scores_avg', removed)
    await purgeTeamsData(track, 'judgeStatus', removed)
  }
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

  const globalsRef = doc(db, SETTINGS_COLLECTION, CONFIG_DOC)
  const globalsSnap = await getDoc(globalsRef)
  const data_globals = globalsSnap.data() || {}

  const updatedRounds = currentRounds.map(r => r === oldName ? newName : r)
  const batchCommit = writeBatch(db)
  
  const field = track === 'hardware' ? 'rounds_hardware' : 'rounds_software'
  const rubrics = data_globals.rubrics || {}
  const rubricKeyOld = `${track}_${oldName}`
  const rubricKeyNew = `${track}_${newName}`
  
  if (rubrics[rubricKeyOld]) {
    rubrics[rubricKeyNew] = rubrics[rubricKeyOld]
    delete rubrics[rubricKeyOld]
  }

  batchCommit.set(globalsRef, {
    [field]: updatedRounds,
    rubrics,
    updatedAt: serverTimestamp()
  }, { merge: true })

  const snap = await getDocs(collection(db, TEAMS_COLLECTION))
  for (const teamDoc of snap.docs) {
    const data = teamDoc.data()
    const teamTrack = String(data.track || 'software').toLowerCase()
    if (teamTrack !== track) continue

    const updates = {}
    
    // Rename in scores
    if (data.scores && data.scores[oldName] !== undefined) {
      const scores = { ...data.scores }
      scores[newName] = scores[oldName]
      delete scores[oldName]
      updates.scores = scores
    }

    // Rename in averages
    if (data.scores_avg && data.scores_avg[oldName] !== undefined) {
      const avg = { ...data.scores_avg }
      avg[newName] = avg[oldName]
      delete avg[oldName]
      updates.scores_avg = avg
    }

    // Rename in judgeStatus
    if (data.judgeStatus && data.judgeStatus[oldName] !== undefined) {
      const status = { ...data.judgeStatus }
      status[newName] = status[oldName]
      delete status[oldName]
      updates.judgeStatus = status
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(teamDoc.ref, { ...updates, updatedAt: serverTimestamp() })
    }
  }

  await batchCommit.commit()
}

export async function renameBonus(track, oldName, newName, currentBonuses) {
  assertFirebaseEnabled()
  if (!oldName || !newName || oldName === newName) return

  const updatedBonuses = currentBonuses.map(b => b === oldName ? newName : b)
  const batchCommit = writeBatch(db)
  
  const field = track === 'hardware' ? 'bonuses_hardware' : 'bonuses_software'
  batchCommit.set(doc(db, SETTINGS_COLLECTION, CONFIG_DOC), {
    [field]: updatedBonuses,
    updatedAt: serverTimestamp()
  }, { merge: true })

  const snap = await getDocs(collection(db, TEAMS_COLLECTION))
  for (const teamDoc of snap.docs) {
    const data = teamDoc.data()
    const teamTrack = String(data.track || 'software').toLowerCase()
    if (teamTrack !== track) continue

    if (data.bonuses && data.bonuses[oldName] !== undefined) {
      const bonuses = { ...data.bonuses }
      bonuses[newName] = bonuses[oldName]
      delete bonuses[oldName]
      await updateDoc(teamDoc.ref, {
        bonuses,
        updatedAt: serverTimestamp()
      })
    }
  }

  await batchCommit.commit()
}

// Delete ALL
export async function deleteAllTeams() {
  assertFirebaseEnabled()
  const snap = await getDocs(collection(db, TEAMS_COLLECTION))
  if (snap.empty) return

  let batch = writeBatch(db)
  let count = 0

  for (const teamDoc of snap.docs) {
    batch.delete(teamDoc.ref)
    count++
    if (count >= 400) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }

  if (count > 0) {
    await batch.commit()
  }
}

export async function resetRoundScores(track) {
  assertFirebaseEnabled()
  const snap = await getDocs(collection(db, TEAMS_COLLECTION))
  if (snap.empty) return

  let batch = writeBatch(db)
  let count = 0

  for (const teamDoc of snap.docs) {
    const data = teamDoc.data()
    const teamTrack = String(data.track || 'software').toLowerCase()
    
    if (track && teamTrack !== track) continue

    const newData = { ...data, scores: {}, scores_avg: {}, judgeStatus: {} }
    newData.total = computeTotal(newData)

    batch.update(teamDoc.ref, {
      scores: {},
      scores_avg: {},
      judgeStatus: {},
      total: newData.total,
      updatedAt: serverTimestamp()
    })
    
    count++
    if (count >= 400) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }

  if (count > 0) {
    await batch.commit()
  }
}

export async function resetBonusScores(track) {
  assertFirebaseEnabled()
  const snap = await getDocs(collection(db, TEAMS_COLLECTION))
  if (snap.empty) return

  let batch = writeBatch(db)
  let count = 0

  for (const teamDoc of snap.docs) {
    const data = teamDoc.data()
    const teamTrack = String(data.track || 'software').toLowerCase()
    
    if (track && teamTrack !== track) continue

    const newData = { ...data, bonuses: {} }
    newData.total = computeTotal(newData)

    batch.update(teamDoc.ref, {
      bonuses: {},
      total: newData.total,
      updatedAt: serverTimestamp()
    })
    
    count++
    if (count >= 400) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }

  if (count > 0) {
    await batch.commit()
  }
}
