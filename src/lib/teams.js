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

export const CONFIG_DOC = 'globals'

export function computeTotal(teamData) {
  let total = 0
  
  const scores = teamData.scores || {}
  for (const rawV of Object.values(scores)) {
    let v = rawV
    if (v && typeof v === 'object' && v.total === undefined) {
       const vals = Object.values(v)
       if (vals.length > 0) v = vals[0]
    }
    const num = (v && typeof v === 'object') ? Number(v.total) : Number(v)
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

function getTeamsCol(hackathonId) {
  return collection(db, 'hackathons', hackathonId, 'teams')
}

function getGlobalsDoc(hackathonId) {
  return doc(db, 'hackathons', hackathonId, 'settings', CONFIG_DOC)
}

export async function addTeam(hackathonId, { name, track = 'software', scores = {} }) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  const trimmedName = String(name).trim()
  if (!trimmedName) throw new Error('Team name is missing')

  await addDoc(getTeamsCol(hackathonId), {
    name: trimmedName,
    track: String(track).toLowerCase(),
    scores,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateTeamScores(hackathonId, teamId, passedScores) {
  assertFirebaseEnabled()
  if (!hackathonId || !teamId) throw new Error('Missing hackathonId or team id')

  const cleanedScores = {}
  for (const [k, v] of Object.entries(passedScores)) {
    cleanedScores[k] = Number(v) || 0
  }

  await updateDoc(doc(db, 'hackathons', hackathonId, 'teams', teamId), {
    scores: cleanedScores,
    updatedAt: serverTimestamp(),
  })
}

export async function updateTeamBonuses(hackathonId, teamId, bonusesObj) {
  assertFirebaseEnabled()
  if (!hackathonId || !teamId) throw new Error('Missing hackathonId or team id')
  const clean = {}
  for (const [k, v] of Object.entries(bonusesObj || {})) {
     clean[k] = Number(v) || 0
  }
  await updateDoc(doc(db, 'hackathons', hackathonId, 'teams', teamId), {
    bonuses: clean,
    updatedAt: serverTimestamp()
  })
}

export async function updateTracks(hackathonId, tracksArray) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  await setDoc(getGlobalsDoc(hackathonId), {
    tracks: tracksArray,
    updatedAt: serverTimestamp()
  }, { merge: true })
}

export async function updateBonusNames(hackathonId, track, bonusesArray) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  if (!Array.isArray(bonusesArray)) throw new Error('bonusesArray must be an array')
  
  const globalsRef = getGlobalsDoc(hackathonId)
  const snap = await getDoc(globalsRef)
  
  const data = snap.exists() ? snap.data() : {}
  const bonusesObj = data.bonuses || {}
  
  // Legacy fallback read
  let oldBonuses = bonusesObj[track] || []
  if (!bonusesObj[track]) {
    const field = track === 'hardware' ? 'bonuses_hardware' : 'bonuses_software'
    if (data[field]) oldBonuses = data[field]
  }
  
  const nextBonusesObj = { ...bonusesObj, [track]: bonusesArray }
  
  await setDoc(globalsRef, {
    bonuses: nextBonusesObj,
    updatedAt: serverTimestamp()
  }, { merge: true })

  const removed = oldBonuses.filter(b => !bonusesArray.includes(b))
  if (removed.length > 0) {
    await purgeTeamsData(hackathonId, track, 'bonuses', removed)
  }
}

async function purgeTeamsData(hackathonId, track, mapField, keysToRemove) {
  const snap = await getDocs(getTeamsCol(hackathonId))
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

export async function toggleRoundLock(hackathonId, track, roundName, currentLockedRounds = []) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  const lockKey = `${track}_${roundName}`
  let nextLocked = []
  if (currentLockedRounds.includes(lockKey)) {
    nextLocked = currentLockedRounds.filter(l => l !== lockKey)
  } else {
    nextLocked = [...currentLockedRounds, lockKey]
  }
  await setDoc(getGlobalsDoc(hackathonId), {
    lockedRounds: nextLocked,
    updatedAt: serverTimestamp()
  }, { merge: true })
}

export async function updateRubrics(hackathonId, rubricsMap) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  await setDoc(getGlobalsDoc(hackathonId), {
    rubrics: rubricsMap,
    updatedAt: serverTimestamp()
  }, { merge: true })
}

export async function updateTeamTrack(hackathonId, teamId, track) {
  assertFirebaseEnabled()
  if (!hackathonId || !teamId) throw new Error('Missing hackathonId or team id')
  await updateDoc(doc(db, 'hackathons', hackathonId, 'teams', teamId), {
    track: String(track).toLowerCase(),
    updatedAt: serverTimestamp()
  })
}

export async function deleteTeam(hackathonId, teamId) {
  assertFirebaseEnabled()
  if (!hackathonId || !teamId) throw new Error('Missing hackathonId or team id')
  await deleteDoc(doc(db, 'hackathons', hackathonId, 'teams', teamId))
}

export async function bulkImportTeams(hackathonId, rows) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  if (!Array.isArray(rows)) throw new Error('Rows must be an array')

  const batch = writeBatch(db)

  let added = 0
  for (const row of rows) {
    const name = String(row.name ?? '').trim()
    if (!name) continue
    const ref = doc(collection(db, 'hackathons', hackathonId, 'teams'))
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

export async function updateRoundNames(hackathonId, track, roundsArray) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  if (!Array.isArray(roundsArray)) throw new Error('roundsArray must be an array')
  
  const globalsRef = getGlobalsDoc(hackathonId)
  const snap = await getDoc(globalsRef)
  const data = snap.exists() ? snap.data() : {}
  const roundsObj = data.rounds || {}

  let oldRounds = roundsObj[track] || []
  if (!roundsObj[track]) {
    const field = track === 'hardware' ? 'rounds_hardware' : 'rounds_software'
    if (data[field]) oldRounds = data[field]
  }
  
  const nextRoundsObj = { ...roundsObj, [track]: roundsArray }

  await setDoc(globalsRef, {
    rounds: nextRoundsObj,
    updatedAt: serverTimestamp()
  }, { merge: true })

  const removed = oldRounds.filter(r => !roundsArray.includes(r))
  if (removed.length > 0) {
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

    await purgeTeamsData(hackathonId, track, 'scores', removed)
  }
}

export async function setLeaderboardFrozen(hackathonId, isFrozen) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  await setDoc(getGlobalsDoc(hackathonId), {
    isFrozen: Boolean(isFrozen),
    updatedAt: serverTimestamp()
  }, { merge: true })
}

export async function triggerCelebration(hackathonId) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  await setDoc(getGlobalsDoc(hackathonId), {
    isFrozen: false,
    celebrationAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true })
}

export async function renameRound(hackathonId, track, oldName, newName, currentRounds) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  if (!oldName || !newName || oldName === newName) return

  const globalsRef = getGlobalsDoc(hackathonId)
  const globalsSnap = await getDoc(globalsRef)
  const data_globals = globalsSnap.data() || {}

  const updatedRounds = currentRounds.map(r => r === oldName ? newName : r)
  const batchCommit = writeBatch(db)
  
  const roundsObj = data_globals.rounds || {}
  const nextRoundsObj = { ...roundsObj, [track]: updatedRounds }
  
  const rubrics = data_globals.rubrics || {}
  const rubricKeyOld = `${track}_${oldName}`
  const rubricKeyNew = `${track}_${newName}`
  
  if (rubrics[rubricKeyOld]) {
    rubrics[rubricKeyNew] = rubrics[rubricKeyOld]
    delete rubrics[rubricKeyOld]
  }

  batchCommit.set(globalsRef, {
    rounds: nextRoundsObj,
    rubrics,
    updatedAt: serverTimestamp()
  }, { merge: true })

  const snap = await getDocs(getTeamsCol(hackathonId))
  for (const teamDoc of snap.docs) {
    const data = teamDoc.data()
    const teamTrack = String(data.track || 'software').toLowerCase()
    if (teamTrack !== track) continue

    const updates = {}
    
    if (data.scores && data.scores[oldName] !== undefined) {
      const scores = { ...data.scores }
      scores[newName] = scores[oldName]
      delete scores[oldName]
      updates.scores = scores
    }

    if (Object.keys(updates).length > 0) {
      batchCommit.update(teamDoc.ref, { ...updates, updatedAt: serverTimestamp() })
    }
  }

  await batchCommit.commit()
}

export async function renameBonus(hackathonId, track, oldName, newName, currentBonuses) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  if (!oldName || !newName || oldName === newName) return

  const updatedBonuses = currentBonuses.map(b => b === oldName ? newName : b)
  const batchCommit = writeBatch(db)
  
  const globalsRef = getGlobalsDoc(hackathonId)
  const globalsSnap = await getDoc(globalsRef)
  const data_globals = globalsSnap.data() || {}
  const bonusesObj = data_globals.bonuses || {}
  const nextBonusesObj = { ...bonusesObj, [track]: updatedBonuses }

  batchCommit.set(globalsRef, {
    bonuses: nextBonusesObj,
    updatedAt: serverTimestamp()
  }, { merge: true })

  const snap = await getDocs(getTeamsCol(hackathonId))
  for (const teamDoc of snap.docs) {
    const data = teamDoc.data()
    const teamTrack = String(data.track || 'software').toLowerCase()
    if (teamTrack !== track) continue

    if (data.bonuses && data.bonuses[oldName] !== undefined) {
      const bonuses = { ...data.bonuses }
      bonuses[newName] = bonuses[oldName]
      delete bonuses[oldName]
      batchCommit.update(teamDoc.ref, {
        bonuses,
        updatedAt: serverTimestamp()
      })
    }
  }

  await batchCommit.commit()
}

export async function deleteAllTeams(hackathonId) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  const snap = await getDocs(getTeamsCol(hackathonId))
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

export async function resetRoundScores(hackathonId, track) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  const snap = await getDocs(getTeamsCol(hackathonId))
  if (snap.empty) return

  let batch = writeBatch(db)
  let count = 0

  for (const teamDoc of snap.docs) {
    const data = teamDoc.data()
    const teamTrack = String(data.track || 'software').toLowerCase()
    
    if (track && teamTrack !== track) continue

    const newData = { ...data, scores: {} }
    newData.total = computeTotal(newData)

    batch.update(teamDoc.ref, {
      scores: {},
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

export async function resetBonusScores(hackathonId, track) {
  assertFirebaseEnabled()
  if (!hackathonId) throw new Error('Missing hackathonId')
  const snap = await getDocs(getTeamsCol(hackathonId))
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
export async function deleteTeamsInTrack(hackathonId, track) {
  assertFirebaseEnabled()
  if (!hackathonId || !track) throw new Error('Missing hackathonId or track')
  const snap = await getDocs(getTeamsCol(hackathonId))
  if (snap.empty) return

  let batch = writeBatch(db)
  let count = 0

  for (const teamDoc of snap.docs) {
    const data = teamDoc.data()
    const teamTrack = String(data.track || 'software').toLowerCase()
    
    if (teamTrack === track.toLowerCase()) {
      batch.delete(teamDoc.ref)
      count++
      if (count >= 400) {
        await batch.commit()
        batch = writeBatch(db)
        count = 0
      }
    }
  }

  if (count > 0) {
    await batch.commit()
  }
}
