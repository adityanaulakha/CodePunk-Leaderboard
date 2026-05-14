// src/lib/users.js
// Complete global profile engine managing unique handles, name indexes, and transaction constraints.

import { db } from './firebase.js'
import { doc, getDoc, setDoc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore'

/**
 * getUserProfile
 * Grabs current user data object from global profiles directory.
 */
export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

/**
 * generateInitialHandle
 * Generates random Discord-style unique handle based on identity prefixes.
 */
export const generateInitialHandle = (prefix = 'judge') => {
  // Sanitize prefix to contain alphanumeric characters only
  const clean = prefix.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'judge';
  const code = Math.floor(1000 + Math.random() * 9000);
  return `${clean}#${code}`;
};

/**
 * ensureUserProfile
 * Runs safe registration routine. Bootstraps the global users directory & handle lookups registry atomically.
 */
export const ensureUserProfile = async (uid, email, displayName) => {
  if (!uid) return null;
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  // If the user is fully onboarded with a handle, we are done.
  if (userSnap.exists() && userSnap.data().handle) {
    return userSnap.data();
  }

  // Otherwise, they are either totally new OR an existing user missing a handle.
  // Derive high-quality fallback name
  let prefix = 'judge';
  if (displayName) {
    prefix = displayName.split(' ')[0];
  } else if (email) {
    prefix = email.split('@')[0];
  }
  
  let handle = generateInitialHandle(prefix);
  let handleLower = handle.toLowerCase();
  
  try {
    // Execute atomic Firestore transaction ensuring unique index locks
    await runTransaction(db, async (transaction) => {
      const indexRef = doc(db, 'handles', handleLower);
      const indexSnap = await transaction.get(indexRef);
      
      // Collision fallback protector
      if (indexSnap.exists()) {
        handle = generateInitialHandle(`${prefix}${Math.floor(Math.random() * 9)}`);
        handleLower = handle.toLowerCase();
      }
      
      const updateData = {
        uid,
        handle,
        handleLower,
        lastHandleChange: null
      };
      
      // If it's a completely new user, set their email and creation time
      if (!userSnap.exists()) {
        updateData.email = email || '';
        updateData.createdAt = serverTimestamp();
      }
      
      // Merge updates into the user document (preserves existing data if any)
      transaction.set(userRef, updateData, { merge: true });
      transaction.set(doc(db, 'handles', handleLower), { uid });
    });
    
    const finalSnap = await getDoc(userRef);
    return finalSnap.data();
  } catch (err) {
    console.error("Transaction lock failed during account onboarding initialization:", err);
    throw new Error("Failed to construct user handle profile. Please refresh and retry.");
  }
};

/**
 * updateUserHandle
 * Runs complete transactional handle mutation, strictly enforcing 30-day cooldown math.
 */
export const updateUserHandle = async (uid, newHandleRaw) => {
  const newHandle = newHandleRaw.trim().replace(/\s/g, '');
  
  // Perform strong syntactic formatting check (name#1234)
  if (!/^[a-zA-Z0-9_-]+#[0-9]{4}$/.test(newHandle)) {
    throw new Error("Format invalid! Must be alphanumeric + 4 digits, separated by a '#' (e.g., dev_isha#9080)");
  }
  
  const handleLower = newHandle.toLowerCase();
  
  return await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) throw new Error("User record not established in database");
    
    const user = userSnap.data();
    const oldHandleLower = user.handleLower;
    
    // Reject if trying to claim their own current username
    if (oldHandleLower === handleLower) return;
    
    // 1. Enforce 30-Day Temporal Cooldown Constraint
    if (user.lastHandleChange) {
      // Parse server timestamp accurately
      const last = user.lastHandleChange.toDate ? user.lastHandleChange.toDate() : new Date(user.lastHandleChange);
      const diffMs = Date.now() - last.getTime();
      const cooldownMs = 30 * 24 * 60 * 60 * 1000; // 30 Days in milliseconds
      
      if (diffMs < cooldownMs) {
        const remainingDays = Math.ceil((cooldownMs - diffMs) / (24 * 60 * 60 * 1000));
        throw new Error(`Cooldown active! You can change your handle in ${remainingDays} days.`);
      }
    }
    
    // 2. Enforce Unique Collision Lock
    const indexRef = doc(db, 'handles', handleLower);
    const indexSnap = await transaction.get(indexRef);
    
    if (indexSnap.exists()) {
      throw new Error("This unique handle is already claimed by another evaluator!");
    }
    
    // 3. Commit mutations atomically
    transaction.update(userRef, {
      handle: newHandle,
      handleLower: handleLower,
      lastHandleChange: serverTimestamp()
    });
    
    // Set new index pointer
    transaction.set(indexRef, { uid });
    
    // Purge old index pointer to reclaim namespace
    if (oldHandleLower) {
      transaction.delete(doc(db, 'handles', oldHandleLower));
    }
  });
};

/**
 * resolveHandleToUid
 * Maps recognizable handles back to internal immutable UIDs in Constant-Time O(1).
 */
export const resolveHandleToUid = async (inputHandle) => {
  if (!inputHandle) return null;
  const clean = inputHandle.trim().toLowerCase();
  const snap = await getDoc(doc(db, 'handles', clean));
  return snap.exists() ? snap.data().uid : null;
};
