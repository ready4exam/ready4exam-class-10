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
 * Creates user record if missing. 
 * Matches Admin Portal structure (Object for classes, String for streams).
 */
export async function ensureUserInFirestore(user) {
  if (!user?.uid) return;
  const { db } = getInitializedClients();
  const ref = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        paidClasses: { "6":false,"7":false,"8":false,"9":false,"10":false,"11":false,"12":false },
        streams: "",
        role: ADMIN_EMAILS.includes(user.email?.toLowerCase()) ? "admin" : "student",
        signupDate: serverTimestamp()
      });
    }
  } catch (e) { console.warn(LOG, "Sync deferred", e); }
}

export async function initializeAuthListener(callback) {
  await initializeServices();
  const { auth } = getInitializedClients();
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  onAuthStateChanged(auth, (user) => {
    if (user) ensureUserInFirestore(user);
    if (callback) callback(user);
  });
}

export async function signInWithGoogle() {
  const { auth } = getInitializedClients();
  try {
    const res = await signInWithPopup(auth, provider);
    await ensureUserInFirestore(res.user);
    return res.user;
  } catch (e) {
    alert("Login failed. Check if popups are blocked.");
    return null;
  }
}

export const checkAccess = () => {
  try { return !!getInitializedClients().auth.currentUser; } 
  catch { return false; }
};
