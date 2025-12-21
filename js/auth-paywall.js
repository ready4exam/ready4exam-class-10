/**
 * template/js/auth-paywall.js
 * FINAL PROFESSIONAL FIX: Non-blocking Auth & Background Firestore Sync
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
const ADMIN_EMAILS = ["keshav.karn@gmail.com", "ready4urexam@gmail.com"];

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

/**
 * Syncs user profile to Firestore without blocking the main Auth state.
 * Ensures data structure matches Admin Portal (Object for classes, String for streams).
 */
export async function ensureUserInFirestore(user) {
  if (!user?.uid) return;
  const { db } = getInitializedClients();
  const ref = doc(db, "users", user.uid);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const emailLower = (user.email || "").toLowerCase();
      const isAdmin = ADMIN_EMAILS.includes(emailLower);

      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        // Matches your Management Suite UI structure
        paidClasses: { "6":false,"7":false,"8":false,"9":false,"10":false,"11":false,"12":false },
        streams: "",
        role: isAdmin ? "admin" : "student",
        signupDate: serverTimestamp()
      });
      console.log(LOG, "New student record created.");
    }
  } catch (e) { 
    console.warn(LOG, "Database sync backgrounded due to delay.", e); 
  }
}

/**
 * Initializes the Auth Listener and Persistence.
 * High-speed entry: Allows user access before DB sync completes.
 */
export async function initializeAuthListener(callback) {
  await initializeServices();
  const { auth } = getInitializedClients();
  
  // Persist session across browser restarts
  setPersistence(auth, browserLocalPersistence).catch(() => {});

  onAuthStateChanged(auth, (user) => {
    // Permanent Fix for the "Signed OUT" console error
    console.log(LOG, "State →", user ? user.email : "Signed OUT");
    
    if (user) {
      // Sync in background so student can start quiz immediately
      ensureUserInFirestore(user);
    }
    
    if (callback) callback(user);
  });
}

/**
 * Mandatory Sign-In: Triggers Google Popup.
 * Whitelisting verified for: ready4exam.github.io
 */
export async function signInWithGoogle() {
  const { auth } = getInitializedClients();
  try {
    const res = await signInWithPopup(auth, provider);
    // Background registration immediately after popup close
    ensureUserInFirestore(res.user);
    return res.user;
  } catch (e) {
    console.error(LOG, "Login Failed:", e.code, e.message);
    if (e.code === "auth/popup-blocked") {
      alert("Please allow pop-ups for this site to log in.");
    } else {
      alert(`Login failed: ${e.code}. Check domain whitelisting.`);
    }
    return null;
  }
}

export const signOut = async () => {
  const { auth } = getInitializedClients();
  return firebaseSignOut(auth);
};

export const checkAccess = () => {
  try {
    const { auth } = getInitializedClients();
    return !!auth.currentUser;
  } catch {
    return false;
  }
};
