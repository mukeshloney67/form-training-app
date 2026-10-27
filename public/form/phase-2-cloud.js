import { firebaseConfig } from './firebase-config.js';

const FIREBASE_VERSION = '13.0.0';
const FIREBASE_CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const APP_NAME = 'form-training';

let app;
let auth;
let db;
let authApi;
let firestoreApi;
let initialization;
const knownSignatures = new Map();

export function isFirebaseConfigured(config = firebaseConfig) {
  return ['apiKey', 'authDomain', 'projectId', 'appId'].every((key) =>
    typeof config?.[key] === 'string' && config[key].trim().length > 0
  );
}

async function initializeFirebase() {
  if (initialization) return initialization;
  initialization = (async () => {
    const [appApi, loadedAuthApi, loadedFirestoreApi] = await Promise.all([
      import(`${FIREBASE_CDN}/firebase-app.js`),
      import(`${FIREBASE_CDN}/firebase-auth.js`),
      import(`${FIREBASE_CDN}/firebase-firestore.js`)
    ]);
    app = appApi.getApps().find((candidate) => candidate.name === APP_NAME)
      || appApi.initializeApp(firebaseConfig, APP_NAME);
    authApi = loadedAuthApi;
    firestoreApi = loadedFirestoreApi;
    auth = authApi.getAuth(app);
    db = firestoreApi.getFirestore(app);
    await authApi.setPersistence(auth, authApi.browserLocalPersistence);
  })();
  try {
    await initialization;
  } catch (error) {
    initialization = null;
    throw error;
  }
}

export async function initializePhase2(onUser, onError) {
  if (!isFirebaseConfigured()) return null;
  await initializeFirebase();
  const stopListening = authApi.onAuthStateChanged(auth, onUser, onError);
  try {
    await authApi.getRedirectResult(auth);
  } catch (error) {
    onError?.(error);
  }
  return stopListening;
}

export async function signInWithGoogle() {
  if (!isFirebaseConfigured()) throw new Error('Firebase setup is not complete yet.');
  await initializeFirebase();
  const provider = new authApi.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await authApi.signInWithRedirect(auth, provider);
}

export async function signOutOfGoogle() {
  await initializeFirebase();
  await authApi.signOut(auth);
}

function stateSignature(value) {
  return JSON.stringify(value ?? null);
}

function signaturesFor(state) {
  const histories = new Map((state.history || []).map((session) => [session.id, stateSignature(session)]));
  const account = {
    schemaVersion: 1,
    profile: state.profile || null,
    program: state.program || null,
    activeSession: state.activeSession || null
  };
  return { account: stateSignature(account), histories };
}

export async function loadCloudState(uid) {
  await initializeFirebase();
  const root = firestoreApi.doc(db, 'users', uid);
  const [accountSnapshot, historySnapshot] = await Promise.all([
    firestoreApi.getDoc(root),
    firestoreApi.getDocs(firestoreApi.collection(root, 'sessions'))
  ]);
  const account = accountSnapshot.exists() ? accountSnapshot.data() : {};
  const history = historySnapshot.docs
    .map((snapshot) => snapshot.data().session)
    .filter((session) => session && typeof session.id === 'string');
  const state = {
    version: 1,
    profile: account.profile || null,
    program: account.program || null,
    history,
    activeSession: account.activeSession || null
  };
  knownSignatures.set(uid, signaturesFor(state));
  return { exists: accountSnapshot.exists() || history.length > 0, state };
}

export async function syncCloudState(uid, state) {
  await initializeFirebase();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You are offline. Your changes are saved on this device and will sync when you reconnect.');
  }

  const nextSignatures = signaturesFor(state);
  const previousSignatures = knownSignatures.get(uid) || { account: null, histories: new Map() };
  const accountPayload = {
    schemaVersion: 1,
    profile: state.profile || null,
    program: state.program || null,
    activeSession: state.activeSession || null,
    updatedAt: firestoreApi.serverTimestamp()
  };
  const root = firestoreApi.doc(db, 'users', uid);
  let writes = 0;

  if (previousSignatures.account !== nextSignatures.account) {
    await firestoreApi.setDoc(root, accountPayload);
    writes += 1;
  }

  const changedSessions = (state.history || []).filter((session) =>
    previousSignatures.histories.get(session.id) !== nextSignatures.histories.get(session.id)
  );
  for (let offset = 0; offset < changedSessions.length; offset += 400) {
    const batch = firestoreApi.writeBatch(db);
    changedSessions.slice(offset, offset + 400).forEach((session) => {
      const reference = firestoreApi.doc(root, 'sessions', session.id);
      batch.set(reference, { schemaVersion: 1, session, updatedAt: firestoreApi.serverTimestamp() });
    });
    await batch.commit();
    writes += changedSessions.slice(offset, offset + 400).length;
  }

  knownSignatures.set(uid, nextSignatures);
  return writes;
}
