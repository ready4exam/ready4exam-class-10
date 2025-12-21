// js/auth-paywall.js
// Optimized: Non-blocking auth flow to ensure "Access for All" 

import {
  initializeServices,
  getInitializedClients
} from "./config.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signOut as firebaseSignOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const LOG = "[AUTH]";
let externalCallback = null;

// Hardcoded Admin List
const ADMIN_EMAILS = ["keshav.karn@gmail.com", "ready4urexam@gmail.com"];

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

/* --- UI HELPERS --- */
function findPaywall() {
  return document.querySelector("#paywall-screen") || document.querySelector("#auth-container");
}
function findLoading() {
  return document.querySelector("#auth-loading") || document.querySelector(".auth-loading");
}
function hidePaywall() { const pw = findPaywall(); if (pw) pw.style.display = "none"; }
function showPaywall() { const pw = findPaywall(); if (pw) pw.style.display = "block"; }
function showAuthLoading(msg = "Loading…") {
  const el = findLoading();
  if (el) { el.textContent = msg; el.style.display = "block"; }
}
function hideAuthLoading() {
  const el = findLoading();
  if (el) el.style.display = "none";
}

/**
 * Ensures user record exists in Firestore without blocking the UI flow.
 * Data structure is perfectly aligned with Admin Portal and firebase-expiry.js.
 */
export async function ensureUserInFirestore(user) {
  if (!user || !user.uid) return null;

  try {
    const db = getFirestore();
    const ref = doc(db, `users/${user.uid}`);
    const snap = await getDoc(ref);

    const emailLower = (user.email || "").toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(emailLower);

    // If user is new, create the document with the specific structure required by the Admin Dashboard
    if (!snap.exists()) {
      const newDoc = {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        // Initialized as Object to match Admin Portal toggles
        paidClasses: { "6": false, "7": false, "8": false, "9": false, "10": false, "11": false, "12": false },
        streams: "", // Initialized as String to match firebase-expiry.js
        role: isAdmin ? "admin" : "student",
        signupDate: serverTimestamp()
      };
      await setDoc(ref, newDoc);
      return newDoc;
    }

    // If user exists, return data (Silent Trial logic will handle the rest in firebase-expiry.js)
    return snap.data();
  } catch (e) {
    console.warn(LOG, "Firestore sync delayed or failed. Access remains open.", e);
    return null; 
  }
}

/**
 * AUTH LISTENER: The primary gatekeeper.
 * Immediately hides paywall upon authentication to provide instant access.
 */
export async function initializeAuthListener(callback = null) {
  await initializeServices();
  const { auth } = getInitializedClients();

  if (callback) externalCallback = callback;

  try { await setPersistence(auth, browserLocalPersistence); }
  catch (e) { console.warn(LOG, "Persistence skipped", e); }

  onAuthStateChanged(auth, async (user) => {
    console.log(LOG, "State →", user?.email || "Signed OUT");

    if (user) {
      // 1. Instantly allow access
      hidePaywall();
      hideAuthLoading();

      // 2. Sync user data in the background (Non-blocking)
      ensureUserInFirestore(user);

      if (externalCallback) {
        try { externalCallback(user); } catch {}
      }
      return;
    }

    // If not logged in, show login screen
    showPaywall();
    showAuthLoading("Please sign in to continue");

    if (externalCallback) {
      try { externalCallback(null); } catch {}
    }
  });
}

/**
 * GOOGLE SIGN-IN: Triggers the popup and handles initial record creation.
 */
export async function signInWithGoogle() {
  await initializeServices();
  const { auth } = getInitializedClients();

  showAuthLoading("Opening Google Login…");

  try {
    const result = await signInWithPopup(auth, provider);
    // Create record immediately after login
    ensureUserInFirestore(result.user);
    hideAuthLoading();
    hidePaywall();
    return result.user;
  } catch (e) {
    console.error(LOG, "Login Error:", e.message);
    hideAuthLoading();
    alert("Login failed. Please ensure pop-ups are allowed for this site.");
    return null;
  }
}

export async function signOut() {
  await initializeServices();
  const { auth } = getInitializedClients();
  showPaywall();
  showAuthLoading("Signing out…");
  return firebaseSignOut(auth);
}

export function checkAccess() {
  try {
    const { auth } = getInitializedClients();
    return !!auth.currentUser;
  } catch {
    return false;
  }
}
