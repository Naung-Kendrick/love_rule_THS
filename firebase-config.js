// ═══════════════════════════════════════════════════════
// FIREBASE SETUP
// ═══════════════════════════════════════════════════════
// 1. Go to https://console.firebase.google.com
// 2. Create a free project
// 3. Enable: Authentication → Anonymous Sign-in
// 4. Enable: Cloud Firestore → Create database (start in test mode)
// 5. Enable: Storage → Get started (start in test mode)
// 6. Go to Project Settings → General → Your apps → Add web app
// 7. Copy the config object below and replace the values
// ═══════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ─── DON'T TOUCH BELOW THIS LINE ─────────────────────────

let db = null;
let storage = null;
let currentUser = null;
let coupleCode = null;
let firebaseReady = false;

function initFirebase() {
  if (firebaseReady) return;
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.warn('Firebase not configured yet');
    return;
  }
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  storage = firebase.storage();
  firebase.auth().signInAnonymously().then(user => {
    currentUser = user.user;
    firebaseReady = true;
    document.dispatchEvent(new CustomEvent('firebase-ready'));
  }).catch(err => {
    console.warn('Firebase auth failed:', err);
  });
}

function getCoupleRef() {
  if (!db || !coupleCode) return null;
  return db.collection('couples').doc(coupleCode);
}

function getStorageRef(path) {
  if (!storage || !coupleCode) return null;
  return storage.ref(`couples/${coupleCode}/${path}`);
}

async function loadFromFirebase() {
  const ref = getCoupleRef();
  if (!ref) return null;
  try {
    const doc = await ref.get();
    return doc.exists ? doc.data() : null;
  } catch {
    return null;
  }
}

async function saveToFirebase(data) {
  const ref = getCoupleRef();
  if (!ref) return;
  try {
    await ref.set(data, { merge: true });
  } catch (e) {
    console.warn('Firebase save failed:', e);
  }
}

async function uploadPhotoToFirebase(base64Data, fileName) {
  const ref = getStorageRef(`photos/${fileName}`);
  if (!ref) return null;
  try {
    const snapshot = await ref.putString(base64Data, 'data_url');
    return await snapshot.ref.getDownloadURL();
  } catch {
    return null;
  }
}

async function deletePhotoFromFirebase(fileName) {
  const ref = getStorageRef(`photos/${fileName}`);
  if (!ref) return;
  try {
    await ref.delete();
  } catch {}
}
