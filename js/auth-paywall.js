/**
 * js/auth-paywall.js
 * FINAL VERSION: "Access-for-All" Silent Trial Logic
 */

import { initializeServices, getInitializedClients } from "./config.js";
import { 
  GoogleAuthProvider, signInWithPopup, onAuthStateChanged, 
  setPersistence, browserLocalPersistence, signOut as firebaseSignOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const LOG = "[AUTH]";
// TIER 1: Hardcoded Admins (Authorized for Management Suite)
const ADMIN_EMAILS = ["keshav.karn@gmail.com", "ready4urexam@gmail.com"];

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

/* --- COMPACT UI HELPERS --- */
const toggleUI = (id, show) => { 
  const el = document.getElementById(id) || document.querySelector(id);
  if (el) el.style.display = show ? "block" : "none"; 
};

/**
 * TIER 2 & 3: Background Sync for All Users
 * Creates or updates the user document with structure matching the Admin Portal.
 * Never blocks the login flow.
 */
export async function ensureUserInFirestore(user) {
  if (!user?.uid) return;
  const db = getFirestore();
  const ref = doc(db, "users", user.uid);

  try {
    const snap = await getDoc(ref);
    const emailLower = (user.email || "").toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(emailLower);

    // If new user, initialize with "Silent Trial" ready state
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        // Object format for portal toggle compatibility
        paidClasses: { "6":false,"7":false,"8":false,"9":false,"10":false,"11":false,"12":false },
        streams: "",
        role: isAdmin ? "admin" : "student",
        signupDate: serverTimestamp()
      });
    } else if (isAdmin && snap.data().role !== "admin") {
      // Auto-upgrade hardcoded emails to Admin role if they exist
      await setDoc(ref, { role: "admin" }, { merge: true });
    }
  } catch (e) { 
    console.warn(LOG, "Database sync deferred. Student still granted access.", e); 
  }
}

/**
 * AUTH LISTENER: Instant entry for any authenticated user.
 */
export async function initializeAuthListener(callback) {
  await initializeServices();
  const { auth } = getInitializedClients();
  
  // Persist session even after tab close
  setPersistence(auth, browserLocalPersistence).catch(() => {});

  onAuthStateChanged(auth, (user) => {
    console.log(LOG, "State →", user ? user.email : "Signed OUT");
    
    if (user) {
      toggleUI("#paywall-screen", false);
      toggleUI(".auth-loading", false);
      // Run DB sync in background so student can start quiz immediately
      ensureUserInFirestore(user); 
    } else {
      toggleUI("#paywall-screen", true);
    }
    
    if (callback) callback(user);
  });
}

/**
 * SIGN-IN: Triggers Google Popup. 
 * Ensure 'ready4exam.github.io' is in Firebase Authorized Domains.
 */
export async function signInWithGoogle() {
  const { auth } = getInitializedClients();
  try {
    const res = await signInWithPopup(auth, provider);
    ensureUserInFirestore(res.user);
    return res.user;
  } catch (e) {
    console.error(LOG, "Login failure:", e.code, e.message);
    // Common fix: Add domain to Firebase Console -> Auth -> Settings -> Authorized Domains
    alert(`Login failed (${e.code}). Please ensure pop-ups are allowed and the domain is whitelisted.`);
    return null;
  }
}

export const signOut = async () => firebaseSignOut((await getInitializedClients()).auth);
export const checkAccess = () => !!getInitializedClients().auth.currentUser;
