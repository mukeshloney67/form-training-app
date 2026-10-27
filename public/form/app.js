import { estimateOneRepMax, performancePoints, prescriptionFor, recommendationSnapshot } from './progression.js';
import { initializePhase2, isFirebaseConfigured, loadCloudState, signInWithGoogle, signOutOfGoogle, syncCloudState } from './phase-2-cloud.js';

const STORAGE_KEY = 'form-training-phase1-v1';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const main = document.getElementById('main');
const bottomNav = document.getElementById('bottomNav');
const saveStateLabel = document.getElementById('saveState');
const toastNode = document.getElementById('toast');
const editorDialog = document.getElementById('editorDialog');
const editorFields = document.getElementById('editorFields');
const importDialog = document.getElementById('importDialog');
const syncChoiceDialog = document.getElementById('syncChoiceDialog');
let currentView = 'today';
let authReturnView = 'welcome';
let editingWorkoutId = null;
let editingProfile = false;
let toastTimer = null;
let timerHandle = null;
let installPrompt = null;
let cloudUser = null;
let cloudStatus = isFirebaseConfigured() ? 'Sign in to connect your account.' : 'Setup needed';
let cloudRemote = { exists: false, state: null };
let cloudSyncEnabled = false;
let cloudSyncBusy = false;
let cloudSyncTimer = null;

const LIBRARY = [
  { id: 'barbell-bench', name: 'Barbell bench press', muscle: 'Chest', equipment: 'Barbell', load: 40, increment: 2.5 },
  { id: 'seated-row', name: 'Seated cable row', muscle: 'Back', equipment: 'Cable', load: 30, increment: 2.5 },
  { id: 'back-squat', name: 'Barbell back squat', muscle: 'Legs', equipment: 'Barbell', load: 40, increment: 2.5 },
  { id: 'rdl', name: 'Romanian deadlift', muscle: 'Hamstrings', equipment: 'Barbell', load: 40, increment: 2.5 },
  { id: 'lat-pulldown', name: 'Lat pulldown', muscle: 'Back', equipment: 'Cable', load: 30, increment: 2.5 },
  { id: 'db-shoulder', name: 'Dumbbell shoulder press', muscle: 'Shoulders', equipment: 'Dumbbells', load: 10, increment: 1 },
  { id: 'triceps', name: 'Cable triceps pressdown', muscle: 'Arms', equipment: 'Cable', load: 15, increment: 2.5 },
  { id: 'leg-press', name: 'Leg press', muscle: 'Legs', equipment: 'Machine', load: 80, increment: 5 },
  { id: 'leg-curl', name: 'Seated leg curl', muscle: 'Hamstrings', equipment: 'Machine', load: 20, increment: 2.5 },
  { id: 'calf-raise', name: 'Standing calf raise', muscle: 'Calves', equipment: 'Machine', load: 30, increment: 2.5 },
  { id: 'db-incline', name: 'Incline dumbbell press', muscle: 'Chest', equipment: 'Dumbbells', load: 10, increment: 1 },
  { id: 'deadlift', name: 'Barbell deadlift', muscle: 'Back', equipment: 'Barbell', load: 60, increment: 2.5 },
  { id: 'push-up', name: 'Push-up', muscle: 'Chest', equipment: 'Bodyweight', load: 0, increment: 0, bodyweight: true },
  { id: 'goblet-squat', name: 'Goblet squat', muscle: 'Legs', equipment: 'Dumbbells', load: 12, increment: 2 },
  { id: 'one-arm-row', name: 'One-arm dumbbell row', muscle: 'Back', equipment: 'Dumbbells', load: 12, increment: 1 },
  { id: 'split-squat', name: 'Dumbbell split squat', muscle: 'Legs', equipment: 'Dumbbells', load: 8, increment: 1 },
  { id: 'hip-thrust', name: 'Barbell hip thrust', muscle: 'Glutes', equipment: 'Barbell', load: 40, increment: 2.5 },
  { id: 'lateral-raise', name: 'Dumbbell lateral raise', muscle: 'Shoulders', equipment: 'Dumbbells', load: 5, increment: 1 },
  { id: 'biceps-curl', name: 'Dumbbell biceps curl', muscle: 'Arms', equipment: 'Dumbbells', load: 7.5, increment: 1 },
  { id: 'plank', name: 'Plank', muscle: 'Core', equipment: 'Bodyweight', load: 0, increment: 0, bodyweight: true },
  { id: 'bodyweight-squat', name: 'Bodyweight squat', muscle: 'Legs', equipment: 'Bodyweight', load: 0, increment: 0, bodyweight: true },
  { id: 'reverse-lunge', name: 'Reverse lunge', muscle: 'Legs', equipment: 'Bodyweight', load: 0, increment: 0, bodyweight: true },
  { id: 'glute-bridge', name: 'Glute bridge', muscle: 'Glutes', equipment: 'Bodyweight', load: 0, increment: 0, bodyweight: true },
  { id: 'pike-pushup', name: 'Pike push-up', muscle: 'Shoulders', equipment: 'Bodyweight', load: 0, increment: 0, bodyweight: true },
  { id: 'prone-w', name: 'Prone W raise', muscle: 'Back', equipment: 'Bodyweight', load: 0, increment: 0, bodyweight: true },
  { id: 'bodyweight-calf', name: 'Bodyweight calf raise', muscle: 'Calves', equipment: 'Bodyweight', load: 0, increment: 0, bodyweight: true },
  { id: 'db-floor-press', name: 'Dumbbell floor press', muscle: 'Chest', equipment: 'Dumbbells', load: 10, increment: 1 },
  { id: 'db-rdl', name: 'Dumbbell Romanian deadlift', muscle: 'Hamstrings', equipment: 'Dumbbells', load: 12, increment: 1 },
  { id: 'db-triceps', name: 'Dumbbell overhead triceps extension', muscle: 'Arms', equipment: 'Dumbbells', load: 6, increment: 1 }
];

const TEMPLATES = {
  'Full body': ['Barbell back squat', 'Barbell bench press', 'Seated cable row', 'Romanian deadlift', 'Plank'],
  'Upper': ['Barbell bench press', 'Seated cable row', 'Dumbbell shoulder press', 'Lat pulldown', 'Cable triceps pressdown'],
  'Lower': ['Barbell back squat', 'Romanian deadlift', 'Leg press', 'Seated leg curl', 'Standing calf raise'],
  'Push': ['Barbell bench press', 'Dumbbell shoulder press', 'Incline dumbbell press', 'Cable triceps pressdown', 'Dumbbell lateral raise'],
  'Pull': ['Barbell deadlift', 'Lat pulldown', 'Seated cable row', 'One-arm dumbbell row', 'Dumbbell biceps curl'],
  'Legs': ['Barbell back squat', 'Romanian deadlift', 'Leg press', 'Dumbbell split squat', 'Standing calf raise']
};

function newId() {
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyState() {
  return { version: 1, profile: null, program: null, history: [], activeSession: null };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.version === 1) return { ...emptyState(), ...stored };
  } catch (error) {
    console.warn('Could not read saved training data.', error);
  }
  return emptyState();
}

let state = loadState();
if (!state.profile || !state.program) currentView = 'welcome';

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    saveStateLabel.textContent = 'Saved on this device';
    saveStateLabel.classList.remove('save-error');
    queueCloudSync();
    return true;
  } catch (error) {
    saveStateLabel.textContent = 'Could not save';
    saveStateLabel.classList.add('save-error');
    console.error('Could not save training data.', error);
    return false;
  }
}

function cloudSyncKey(uid) {
  return `form-cloud-sync-enabled-${uid}`;
}

function hasLocalTrainingData(value = state) {
  return Boolean(value.profile || value.program || value.activeSession || value.history?.length);
}

function mergeTrainingStates(local, remote, planSource = 'local') {
  const preferred = planSource === 'cloud' ? remote : local;
  const fallback = planSource === 'cloud' ? local : remote;
  const sessions = new Map();
  for (const session of [...(remote.history || []), ...(local.history || [])]) sessions.set(session.id, session);
  return {
    version: 1,
    profile: preferred.profile || fallback.profile || null,
    program: preferred.program || fallback.program || null,
    history: [...sessions.values()].sort((a, b) => new Date(b.date) - new Date(a.date)),
    activeSession: local.activeSession || remote.activeSession || null
  };
}

function queueCloudSync() {
  if (!cloudUser || !cloudSyncEnabled || cloudSyncBusy) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => syncCurrentState(), 1200);
}

async function syncCurrentState() {
  if (!cloudUser || !cloudSyncEnabled || cloudSyncBusy) return;
  if (navigator.onLine === false) {
    cloudStatus = 'Saved here · will sync when you reconnect';
    return;
  }
  cloudSyncBusy = true;
  try {
    await syncCloudState(cloudUser.uid, state);
    cloudStatus = 'Cloud sync is up to date';
  } catch (error) {
    cloudStatus = `Saved on this device · ${friendlyCloudError(error)}`;
  } finally {
    cloudSyncBusy = false;
    if (currentView === 'settings') render();
  }
}

function friendlyCloudError(error) {
  const code = String(error?.code || '');
  if (code.includes('unauthorized-domain')) return 'Add this app address in Firebase authorized domains.';
  if (code.includes('permission-denied')) return 'Firestore rules need to be published.';
  if (code.includes('operation-not-allowed')) return 'Google sign-in needs to be enabled in Firebase.';
  if (code.includes('invalid-api-key') || code.includes('invalid-credential')) return 'Check the Firebase app settings copied into this app.';
  if (code.includes('network') || navigator.onLine === false) return 'Check your internet connection, then try again.';
  if (code.includes('popup') || code.includes('redirect')) return 'Google sign-in did not finish. Try again.';
  if (code.includes('not-found')) return 'Create the Firestore database in Firebase first.';
  return 'Cloud connection needs attention. Your workout data is still saved on this device.';
}

async function onCloudUserChanged(user) {
  cloudUser = user;
  cloudSyncEnabled = Boolean(user && localStorage.getItem(cloudSyncKey(user.uid)) === 'yes');
  if (!user) {
    cloudRemote = { exists: false, state: null };
    cloudStatus = isFirebaseConfigured() ? 'Local-only mode · not signed in' : 'Setup needed';
    render();
    return;
  }

  cloudStatus = `Signed in as ${user.email || 'your Google account'} · checking backup`;
  render();
  try {
    cloudRemote = await loadCloudState(user.uid);
    if (cloudSyncEnabled) {
      cloudSyncBusy = true;
      if (cloudRemote.exists) {
        state = mergeTrainingStates(state, cloudRemote.state, 'cloud');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
      await syncCloudState(user.uid, state);
      cloudStatus = 'Cloud sync is up to date';
    } else {
      cloudStatus = cloudRemote.exists
        ? `Signed in · ${cloudRemote.state.history.length} sessions in your account`
        : 'Signed in · cloud sync is off';
    }
  } catch (error) {
    cloudStatus = `Signed in · ${friendlyCloudError(error)}`;
  } finally {
    cloudSyncBusy = false;
    render();
  }
}

function chooseSyncPlan() {
  return new Promise((resolve) => {
    const onClose = () => resolve(syncChoiceDialog.returnValue || 'cancel');
    syncChoiceDialog.addEventListener('close', onClose, { once: true });
    syncChoiceDialog.showModal();
  });
}

async function enableCloudSync() {
  if (!cloudUser || cloudSyncBusy) return;
  cloudSyncBusy = true;
  render();
  try {
    cloudRemote = await loadCloudState(cloudUser.uid);
    const localHasData = hasLocalTrainingData();
    const remoteHasData = cloudRemote.exists && hasLocalTrainingData(cloudRemote.state);
    let planSource = 'local';

    if (localHasData && remoteHasData) {
      planSource = await chooseSyncPlan();
      if (planSource === 'cancel') return;
      state = mergeTrainingStates(state, cloudRemote.state, planSource);
    } else if (remoteHasData) {
      planSource = 'cloud';
      state = mergeTrainingStates(state, cloudRemote.state, 'cloud');
    } else if (localHasData) {
      const approved = window.confirm('Turn on cloud sync? This uploads your profile, training plan, workout history, and any active workout to the Firebase project connected to this Google sign-in. You can keep using the app locally if you cancel.');
      if (!approved) return;
    } else {
      const approved = window.confirm('Turn on cloud sync for this account? Your training data will be stored in the connected Firebase project as you use the app.');
      if (!approved) return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    await syncCloudState(cloudUser.uid, state);
    localStorage.setItem(cloudSyncKey(cloudUser.uid), 'yes');
    cloudSyncEnabled = true;
    cloudRemote = { exists: hasLocalTrainingData(state), state: JSON.parse(JSON.stringify(state)) };
    cloudStatus = 'Cloud sync is up to date';
    render();
    showToast('Cloud sync is on. This device keeps a local copy too.');
  } catch (error) {
    cloudStatus = friendlyCloudError(error);
    render();
    showToast(cloudStatus);
  } finally {
    cloudSyncBusy = false;
    if (currentView === 'settings') render();
  }
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function localDateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function prettyDate(value, options = { weekday: 'short', month: 'short', day: 'numeric' }) {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function formatWeight(value, unit = state.profile?.unit || 'kg') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  const rounded = Math.round(amount * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${unit}`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function showToast(message) {
  toastNode.textContent = message;
  toastNode.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastNode.classList.remove('show'), 2300);
}

function getLibraryExercise(name, unit = state.profile?.unit || 'kg') {
  const found = LIBRARY.find((item) => item.name.toLowerCase() === String(name).trim().toLowerCase());
  if (found) {
    const scale = unit === 'lb' ? 2.20462 : 1;
    return { ...found, load: Math.round(found.load * scale * 10) / 10, increment: Math.round(found.increment * scale * 10) / 10, unit };
  }
  return { id: `custom-${String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name: String(name).trim(), muscle: 'Other', equipment: 'Custom', load: 0, increment: unit === 'lb' ? 5 : 2.5, unit };
}

function exerciseFromName(name, profile, range) {
  const substitutions = profile.access === 'bodyweight' ? {
    'Barbell bench press': 'Push-up', 'Seated cable row': 'Prone W raise', 'Barbell back squat': 'Bodyweight squat',
    'Romanian deadlift': 'Glute bridge', 'Lat pulldown': 'Prone W raise', 'Dumbbell shoulder press': 'Pike push-up',
    'Cable triceps pressdown': 'Push-up', 'Leg press': 'Bodyweight squat', 'Seated leg curl': 'Glute bridge',
    'Standing calf raise': 'Bodyweight calf raise', 'Incline dumbbell press': 'Push-up', 'Barbell deadlift': 'Glute bridge',
    'Goblet squat': 'Bodyweight squat', 'One-arm dumbbell row': 'Prone W raise', 'Dumbbell split squat': 'Reverse lunge',
    'Hip thrust': 'Glute bridge', 'Dumbbell lateral raise': 'Pike push-up', 'Dumbbell biceps curl': 'Prone W raise'
  } : profile.access === 'home' ? {
    'Barbell bench press': 'Dumbbell floor press', 'Seated cable row': 'One-arm dumbbell row', 'Barbell back squat': 'Goblet squat',
    'Romanian deadlift': 'Dumbbell Romanian deadlift', 'Lat pulldown': 'One-arm dumbbell row', 'Cable triceps pressdown': 'Dumbbell overhead triceps extension',
    'Leg press': 'Goblet squat', 'Seated leg curl': 'Dumbbell Romanian deadlift', 'Standing calf raise': 'Bodyweight calf raise',
    'Incline dumbbell press': 'Dumbbell floor press', 'Barbell deadlift': 'Dumbbell Romanian deadlift', 'Hip thrust': 'Glute bridge'
  } : {};
  const base = getLibraryExercise(substitutions[name] || name, profile.unit);
  return {
    id: base.id,
    name: base.name,
    muscle: base.muscle,
    equipment: base.equipment,
    bodyweight: Boolean(base.bodyweight),
    sets: 3,
    minReps: range[0],
    maxReps: range[1],
    targetRir: 2,
    load: base.load,
    increment: base.increment,
    restSeconds: 90,
    unit: profile.unit
  };
}

function dayForIndex(selectedDays, index) {
  const used = selectedDays[index] ?? ((index * 2 + 1) % 7);
  return Number(used);
}

function splitDefinitions(count) {
  if (count <= 2) return [
    { name: 'Full body A', focus: 'Squat, push, pull', type: 'Full body', exercises: ['Barbell back squat', 'Barbell bench press', 'Seated cable row', 'Romanian deadlift'] },
    { name: 'Full body B', focus: 'Hinge, push, pull', type: 'Full body', exercises: ['Barbell deadlift', 'Incline dumbbell press', 'Lat pulldown', 'Goblet squat'] }
  ];
  if (count === 3) return [
    { name: 'Full body A', focus: 'Squat and push', type: 'Full body', exercises: ['Barbell back squat', 'Barbell bench press', 'Seated cable row', 'Plank'] },
    { name: 'Full body B', focus: 'Hinge and pull', type: 'Full body', exercises: ['Romanian deadlift', 'Dumbbell shoulder press', 'Lat pulldown', 'Leg press'] },
    { name: 'Full body C', focus: 'Unilateral and balance', type: 'Full body', exercises: ['Dumbbell split squat', 'Incline dumbbell press', 'One-arm dumbbell row', 'Hip thrust'] }
  ];
  if (count === 4) return [
    { name: 'Upper A', focus: 'Push strength', type: 'Upper', exercises: ['Barbell bench press', 'Seated cable row', 'Dumbbell shoulder press', 'Cable triceps pressdown'] },
    { name: 'Lower A', focus: 'Squat and hinge', type: 'Lower', exercises: ['Barbell back squat', 'Romanian deadlift', 'Leg press', 'Seated leg curl'] },
    { name: 'Upper B', focus: 'Pull focus', type: 'Upper', exercises: ['Lat pulldown', 'Incline dumbbell press', 'One-arm dumbbell row', 'Dumbbell biceps curl'] },
    { name: 'Lower B', focus: 'Unilateral and accessories', type: 'Lower', exercises: ['Barbell deadlift', 'Dumbbell split squat', 'Hip thrust', 'Standing calf raise'] }
  ];
  if (count === 5) return [
    { name: 'Push', focus: 'Chest, shoulders, triceps', type: 'Push', exercises: TEMPLATES.Push },
    { name: 'Pull', focus: 'Back and biceps', type: 'Pull', exercises: TEMPLATES.Pull },
    { name: 'Legs', focus: 'Quads, hamstrings, calves', type: 'Legs', exercises: TEMPLATES.Legs },
    { name: 'Upper', focus: 'Upper-body volume', type: 'Upper', exercises: TEMPLATES.Upper },
    { name: 'Lower', focus: 'Lower-body volume', type: 'Lower', exercises: TEMPLATES.Lower }
  ];
  return [
    { name: 'Push A', focus: 'Chest and triceps', type: 'Push', exercises: TEMPLATES.Push },
    { name: 'Pull A', focus: 'Back and biceps', type: 'Pull', exercises: TEMPLATES.Pull },
    { name: 'Legs A', focus: 'Squat focus', type: 'Legs', exercises: TEMPLATES.Legs },
    { name: 'Push B', focus: 'Shoulder and chest volume', type: 'Push', exercises: ['Incline dumbbell press', 'Dumbbell shoulder press', 'Push-up', 'Cable triceps pressdown'] },
    { name: 'Pull B', focus: 'Back volume', type: 'Pull', exercises: ['Barbell deadlift', 'Seated cable row', 'Lat pulldown', 'Dumbbell biceps curl'] },
    { name: 'Legs B', focus: 'Hinge and unilateral', type: 'Legs', exercises: ['Romanian deadlift', 'Dumbbell split squat', 'Hip thrust', 'Seated leg curl'] }
  ];
}

function createStarterProgram(profile) {
  const definitions = splitDefinitions(profile.trainingDays.length);
  const focus = profile.goal === 'strength' ? [5, 8] : profile.goal === 'hypertrophy' ? [8, 12] : [6, 10];
  const workouts = definitions.map((definition, index) => ({
    id: newId(),
    name: definition.name,
    focus: definition.focus,
    weekday: dayForIndex(profile.trainingDays, index),
    exercises: definition.exercises.map((name) => exerciseFromName(name, profile, focus))
  }));
  return { id: newId(), name: profile.goal === 'strength' ? 'Strength base' : profile.goal === 'hypertrophy' ? 'Muscle building' : 'Balanced training', workouts };
}

function getWorkout(id) {
  return state.program?.workouts.find((workout) => workout.id === id);
}

function getNextWorkout() {
  const workouts = state.program?.workouts || [];
  if (!workouts.length) return null;
  const today = new Date().getDay();
  const doneToday = new Set(state.history.filter((session) => session.date === localDateKey()).map((session) => session.workoutId));
  const remaining = workouts.filter((workout) => !doneToday.has(workout.id));
  const candidates = remaining.length ? remaining : workouts;
  return [...candidates].sort((a, b) => {
    const deltaA = (a.weekday - today + 7) % 7 || (remaining.length ? 0 : 7);
    const deltaB = (b.weekday - today + 7) % 7 || (remaining.length ? 0 : 7);
    return deltaA - deltaB;
  })[0];
}

function previousExerciseEntry(exercise) {
  const sessions = [...state.history].sort((a, b) => new Date(b.date) - new Date(a.date));
  for (const session of sessions) {
    const entry = (session.exercises || []).find((item) => item.exerciseId === exercise.id || item.name?.toLowerCase() === exercise.name.toLowerCase());
    if (entry) return entry;
  }
  return null;
}

function previousSetLabel(entry, setIndex, unit) {
  const set = entry?.sets?.[setIndex] || entry?.sets?.at(-1);
  if (!set) return 'New';
  return `${formatWeight(set.weight, unit)} × ${set.reps}`;
}

function startWorkout(workoutId) {
  const workout = getWorkout(workoutId) || getNextWorkout();
  if (!workout) return showToast('Add a workout to your plan first.');
  if (state.activeSession && state.activeSession.workoutId !== workout.id) {
    currentView = 'session';
    render();
    showToast(`Resume or finish ${state.activeSession.workoutName} before starting another workout.`);
    return;
  }
  if (!state.activeSession) {
    const exercises = workout.exercises.map((exercise) => {
      const prescription = prescriptionFor(exercise, state.history);
      const previous = prescription.previous;
      const setRows = Array.from({ length: Number(exercise.sets) || 3 }, (_, index) => ({
        weight: prescription.weight,
        reps: prescription.reps,
        rir: prescription.rir,
        done: false,
        previous: previousSetLabel(previous, index, state.profile.unit)
      }));
      return { exerciseId: exercise.id, name: exercise.name, plan: { ...exercise }, prescription, setRows };
    });
    state.activeSession = { id: newId(), workoutId: workout.id, workoutName: workout.name, startedAt: Date.now(), restUntil: null, exerciseIndex: 0, exercises };
    saveState();
  }
  currentView = 'session';
  render();
  startClock();
}

function startClock() {
  clearInterval(timerHandle);
  timerHandle = setInterval(updateClock, 1000);
  updateClock();
}

function updateClock() {
  const session = state.activeSession;
  if (!session) return;
  const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
  const elapsedNode = document.getElementById('workoutElapsed');
  if (elapsedNode) elapsedNode.textContent = formatDuration(elapsed);
  const restNode = document.getElementById('restCountdown');
  if (restNode) {
    const remaining = session.restUntil ? Math.max(0, Math.ceil((session.restUntil - Date.now()) / 1000)) : 0;
    restNode.textContent = formatDuration(remaining);
    if (remaining === 0 && session.restUntil) {
      session.restUntil = null;
      saveState();
      showToast('Rest finished. Ready when you are.');
    }
  }
}

function startRestTimer() {
  if (!state.activeSession) return;
  const current = state.activeSession.exercises[state.activeSession.exerciseIndex];
  state.activeSession.restUntil = Date.now() + (Number(current?.plan?.restSeconds) || 90) * 1000;
  saveState();
  updateClock();
}

function finishWorkout() {
  const session = state.activeSession;
  if (!session) return;
  const completedExercises = session.exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    plan: exercise.plan ? { ...exercise.plan } : null,
    recommendation: recommendationSnapshot(exercise.prescription),
    sets: exercise.setRows.filter((set) => set.done).map(({ weight, reps, rir, done }) => ({ weight: Number(weight), reps: Number(reps), rir: Number(rir), done }))
  })).filter((exercise) => exercise.sets.length);
  const setCount = completedExercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  if (!setCount && !window.confirm('No sets are marked complete. Finish and save this session anyway?')) return;
  state.history.unshift({
    id: session.id,
    workoutId: session.workoutId,
    workoutName: session.workoutName,
    date: localDateKey(),
    startedAt: new Date(session.startedAt).toISOString(),
    durationSeconds: Math.floor((Date.now() - session.startedAt) / 1000),
    exercises: completedExercises
  });
  state.activeSession = null;
  saveState();
  clearInterval(timerHandle);
  timerHandle = null;
  currentView = 'history';
  render();
  showToast(`${setCount} set${setCount === 1 ? '' : 's'} saved to history.`);
}

function renderOnboarding() {
  const defaultDays = [1, 3, 5, 6];
  return `<div class="onboarding-account-link"><span>Already have an account?</span><button class="text-button" type="button" data-action="open-login">Log in</button></div><section class="screen-heading"><p class="eyebrow">Set up your training</p><h1>Start with what fits.</h1><p class="subtitle">A few choices create your first plan. You can change everything later.</p></section>
    <form id="onboardingForm" class="form-stack">
      <div class="field-group"><label class="field-label" for="athleteName">What should we call you?</label><input class="field" id="athleteName" name="name" maxlength="30" placeholder="Your name"></div>
      <div class="field-group"><span class="field-label">Main goal</span><div class="choice-row">
        <label class="choice"><input type="radio" name="goal" value="strength" checked><span>Get stronger</span></label>
        <label class="choice"><input type="radio" name="goal" value="hypertrophy"><span>Build muscle</span></label>
        <label class="choice"><input type="radio" name="goal" value="general"><span>Stay balanced</span></label>
      </div></div>
      <div class="field-row"><div class="field-group"><label class="field-label" for="experience">Experience</label><select class="field" id="experience" name="experience"><option value="beginner">New to lifting</option><option value="intermediate">Regular lifter</option><option value="advanced">Experienced</option></select></div><div class="field-group"><label class="field-label" for="minutes">Time per workout</label><select class="field" id="minutes" name="minutes"><option value="30">About 30 min</option><option value="45">About 45 min</option><option value="60" selected>About 60 min</option><option value="75">About 75 min</option></select></div></div>
      <div class="field-group"><span class="field-label">Days you can train</span><div class="check-grid">${DAY_NAMES.slice(1).concat(DAY_NAMES[0]).map((day) => { const index = DAY_NAMES.indexOf(day); return `<label class="check-option"><input type="checkbox" name="trainingDays" value="${index}" ${defaultDays.includes(index) ? 'checked' : ''}>${day}</label>`; }).join('')}</div><p class="help-copy">Choose 2–6 days. Your plan will space sessions across the days you select.</p></div>
      <div class="field-row"><div class="field-group"><label class="field-label" for="unit">Weight unit</label><select class="field" name="unit" id="unit"><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option></select></div><div class="field-group"><label class="field-label" for="access">Training setup</label><select class="field" name="access" id="access"><option value="gym">Full gym</option><option value="home">Home equipment</option><option value="bodyweight">Bodyweight</option></select></div></div>
      <button class="button button-primary button-block spacer-top" type="submit">Build my starter plan <span aria-hidden="true">→</span></button>
      <p class="help-copy">Your training data stays in this browser on this device. No account is required.</p>
    </form>`;
}

function renderAuthWelcome() {
  return `<section class="auth-screen auth-welcome"><div class="auth-brand"><span class="brand-mark">f.</span><span>FORM</span></div><div class="auth-intro"><p class="eyebrow">Strength, with direction</p><h1>Build your next chapter.</h1><p class="subtitle">Plan your training, log each set, and know what to aim for next.</p></div><div class="auth-actions"><button class="button button-primary button-block" type="button" data-action="open-signup">Create account <span aria-hidden="true">→</span></button><button class="button button-quiet button-block" type="button" data-action="open-login">Log in</button></div><button class="auth-guest" type="button" data-action="continue-local">Continue without an account</button><p class="auth-local-note">Local mode is ready now. Your workouts stay on this device.</p></section>`;
}

function renderAuthForm(mode) {
  const isSignup = mode === 'signup';
  const title = isSignup ? 'Create your account.' : 'Welcome back.';
  const subtitle = isSignup ? 'A more personal home for your training.' : 'Pick up where your training left off.';
  const actionLabel = isSignup ? 'Create account' : 'Log in';
  const switchLabel = isSignup ? 'Log in' : 'Create an account';
  const switchAction = isSignup ? 'open-login' : 'open-signup';
  return `<section class="auth-screen"><button class="auth-back" type="button" data-action="auth-back" aria-label="Back">‹</button><div class="auth-brand"><span class="brand-mark">f.</span><span>FORM</span></div><div class="auth-intro"><p class="eyebrow">${isSignup ? 'Get started' : 'Your training space'}</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div><div class="auth-preview-note" role="note">Email access is a preview. Secure email sign-in is not connected, and email form entries will not be sent or saved.</div><button class="button button-google button-block" type="button" data-action="auth-google"><span class="google-mark" aria-hidden="true">G</span>Continue with Google</button><div class="auth-divider"><span>or use email</span></div><div id="authForm" class="auth-form"><div class="field-group">${isSignup ? '<label class="field-label" for="authName">Your name</label><input class="field" id="authName" type="text" autocomplete="off" placeholder="Name" required>' : ''}<label class="field-label" for="authEmail">Email address</label><input class="field" id="authEmail" type="email" autocomplete="off" placeholder="you@example.com" required><label class="field-label" for="authPassword">Password</label><input class="field" id="authPassword" type="password" autocomplete="off" placeholder="${isSignup ? 'At least 8 characters' : 'Your password'}" ${isSignup ? 'minlength="8"' : ''} required></div><button class="button button-primary button-block" type="button" data-action="auth-submit">${actionLabel}</button><p class="auth-form-message" id="authFormMessage" aria-live="polite">Email sign-in will be connected with secure account setup.</p></div><p class="auth-switch">${isSignup ? 'Already have an account?' : 'New to FORM?'} <button class="text-button" type="button" data-action="${switchAction}">${switchLabel}</button></p><button class="auth-guest" type="button" data-action="continue-local">Continue without an account</button></section>`;
}

function renderToday() {
  const next = getNextWorkout();
  const today = new Date();
  const doneToday = state.history.filter((session) => session.date === localDateKey());
  const recent = state.history.slice(0, 2);
  const latestBench = state.history.flatMap((session) => session.exercises || []).find((entry) => entry.name.toLowerCase().includes('bench'));
  const benchBest = latestBench?.sets?.reduce((best, set) => Math.max(best, estimateOneRepMax(set.weight, set.reps) || 0), 0) || 0;
  const activeWorkout = state.activeSession ? getWorkout(state.activeSession.workoutId) : null;
  const dayButtons = Array.from({ length: 7 }, (_, i) => {
    const day = (today.getDay() + i) % 7;
    const workout = state.program.workouts.find((item) => item.weekday === day);
    const isToday = i === 0;
    return `<button class="week-day${isToday ? ' active' : ''}${workout ? ' has-workout' : ''}" type="button" ${workout ? `data-action="open-plan-workout" data-id="${workout.id}"` : ''}><span class="day-name">${DAY_SHORT[day]}</span><span class="day-date">${new Date(today.getFullYear(), today.getMonth(), today.getDate() + i).getDate()}</span></button>`;
  }).join('');
  return `<section class="screen-heading"><p class="eyebrow">${escapeHTML(new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(today))}</p><h1>${state.profile.name ? `Good to see you, ${escapeHTML(state.profile.name)}.` : 'Your training, made clear.'}</h1><p class="subtitle">${doneToday.length ? 'Session logged today. Your next target will reflect what you did.' : 'One clear session, one set at a time.'}</p></section>
    ${state.activeSession ? `<section class="hero"><div class="hero-top"><span>Workout in progress</span><span class="hero-badge">SAVED</span></div><h2>${escapeHTML(state.activeSession.workoutName)}</h2><p class="hero-meta">${state.activeSession.exercises.filter((exercise) => exercise.setRows.some((set) => set.done)).length} exercises started · elapsed ${formatDuration((Date.now() - state.activeSession.startedAt) / 1000)}</p><button class="button button-primary button-block" data-action="resume-workout">Resume workout <span aria-hidden="true">→</span></button></section>` : next ? `<section class="hero"><div class="hero-top"><span>Next session · ${escapeHTML(DAY_NAMES[next.weekday])}</span><span class="hero-badge">${next.exercises.length} MOVEMENTS</span></div><h2>${escapeHTML(next.name)}</h2><p class="hero-meta">${escapeHTML(next.focus || 'Strength training')} · ${state.profile.sessionMinutes} min · ${state.profile.unit}</p><div class="hero-tags">${[...new Set(next.exercises.map((exercise) => exercise.muscle || 'Strength'))].slice(0, 3).map((muscle) => `<span>${escapeHTML(muscle)}</span>`).join('')}</div><button class="button button-primary button-block" data-action="start-workout" data-id="${next.id}">Start workout <span aria-hidden="true">→</span></button></section>` : `<div class="empty-state">Your plan has no workouts yet. Add a template from the Plan tab to get started.</div>`}
    <div class="section-heading"><h2>This week</h2><button class="text-button" data-nav="plan">View plan</button></div>
    <div class="week-strip" aria-label="Next seven days">${dayButtons}</div>
    ${next ? `<button class="surface next-workout button-as-card" type="button" data-action="open-plan-workout" data-id="${next.id}"><span class="day-symbol">↗</span><span class="grow"><span class="row-title">Plan · ${escapeHTML(next.name)}</span><span class="row-sub">${next.exercises.length} exercises · ${escapeHTML(next.focus || '')}</span></span><span class="chevron">›</span></button>` : ''}
    <div class="section-heading"><h2>Recent training</h2><button class="text-button" data-nav="history">History</button></div>
    ${recent.length ? `<div class="two-column">${recent.map((session) => `<article class="surface stat-card"><div class="stat-label">${escapeHTML(prettyDate(session.date))}</div><div class="row-title">${escapeHTML(session.workoutName)}</div><div class="stat-note">${session.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)} sets · ${formatDuration(session.durationSeconds)}</div></article>`).join('')}</div>` : `<div class="surface stat-card"><div class="stat-label">Your first session</div><div class="row-title">Your log will appear here</div><div class="stat-note">Previous performance and progression start with the sets you record.</div></div>`}
    <div class="section-heading"><h2>Training signal</h2><button class="text-button" data-nav="history">See progress</button></div>
    <div class="two-column"><div class="surface stat-card"><div class="stat-label">Best estimated bench</div><div class="stat-value">${benchBest ? `${benchBest} <small>${state.profile.unit}</small>` : '—'}</div><div class="stat-note">Based on logged sets</div></div><div class="surface stat-card"><div class="stat-label">Sessions this week</div><div class="stat-value">${state.history.filter((session) => (Date.now() - new Date(`${session.date}T12:00:00`).getTime()) < 7 * 86400000).length}</div><div class="stat-note">Training is not a score</div></div></div>`;
}

function renderWorkoutCard(workout) {
  const day = DAY_NAMES[workout.weekday] || 'Flexible';
  const exercises = workout.exercises.map((exercise) => `<div class="exercise-preview">${escapeHTML(exercise.name)}<small>${exercise.sets} sets · ${exercise.minReps}–${exercise.maxReps} reps · ${exercise.targetRir} RIR</small></div>`).join('');
  return `<article class="surface workout-card"><div class="workout-card-head"><div class="workout-day">${escapeHTML(day.slice(0, 3))}<strong>${workout.exercises.length}</strong></div><div class="grow"><div class="row-title">${escapeHTML(workout.name)}</div><p class="row-sub">${escapeHTML(workout.focus || 'Training')} · ${workout.exercises.length} exercises</p></div><div class="workout-card-actions"><button class="button button-small button-quiet" data-action="edit-workout" data-id="${workout.id}">Edit</button><button class="button button-small" data-action="start-workout" data-id="${workout.id}">Start</button></div></div><div class="exercise-preview-list">${exercises || '<div class="exercise-preview">No exercises yet</div>'}</div></article>`;
}

function renderPlan() {
  const workouts = [...state.program.workouts].sort((a, b) => a.weekday - b.weekday);
  const templateButtons = Object.keys(TEMPLATES).map((template) => `<button class="button button-small button-quiet" data-action="add-template" data-template="${escapeHTML(template)}">+ ${escapeHTML(template)}</button>`).join('');
  return `<section class="screen-heading"><p class="eyebrow">Your program</p><h1>${escapeHTML(state.program.name)}</h1><p class="subtitle">${state.profile.trainingDays.length} days · ${escapeHTML(state.profile.goal)} · Edit anything to fit your week.</p></section>
    <div class="plan-toolbar"><button class="button button-primary" data-action="new-workout">+ Build workout</button><button class="button" data-action="open-import">Import CSV</button><button class="button button-quiet" data-action="export-routine">Export routine</button></div>
    <div class="section-heading"><h2>Workout templates</h2></div><div class="button-row template-row">${templateButtons}</div>
    <div class="section-heading"><h2>Your week</h2><span class="row-sub">${workouts.length} sessions</span></div>
    <div class="list">${workouts.length ? workouts.map(renderWorkoutCard).join('') : '<div class="empty-state">No workouts yet. Add a template or build one from scratch.</div>'}</div>
    <p class="muted-note">Targets adjust from your logged sets. You stay in control of your training plan.</p>`;
}

function renderSession() {
  const session = state.activeSession;
  const current = session?.exercises[session.exerciseIndex];
  if (!session || !current) return '<div class="empty-state">No workout is active.</div>';
  const plan = current.plan;
  const done = session.exercises.reduce((sum, exercise) => sum + exercise.setRows.filter((set) => set.done).length, 0);
  const total = session.exercises.reduce((sum, exercise) => sum + exercise.setRows.length, 0);
  const percentage = total ? Math.round(done / total * 100) : 0;
  const rowMarkup = current.setRows.map((set, index) => {
    const selectedRir = Number(set.rir) >= 4 ? '4+' : String(set.rir);
    return `<div class="set-row${set.done ? ' done' : ''}"><span class="set-index">${index + 1}</span><span class="last-time">${escapeHTML(set.previous)}</span><input class="set-input" type="number" inputmode="decimal" step="0.5" min="0" aria-label="Set ${index + 1} weight" data-set-index="${index}" data-set-field="weight" value="${escapeHTML(set.weight)}"><input class="set-input" type="number" inputmode="numeric" step="1" min="0" aria-label="Set ${index + 1} reps" data-set-index="${index}" data-set-field="reps" value="${escapeHTML(set.reps)}"><select class="set-input rir-input" aria-label="Set ${index + 1} reps in reserve" data-set-index="${index}" data-set-field="rir">${['0','1','2','3','4+'].map((rir) => `<option value="${rir}" ${selectedRir === rir ? 'selected' : ''}>${rir}</option>`).join('')}</select><button class="log-button" type="button" aria-label="${set.done ? 'Undo' : 'Save'} set ${index + 1}" data-action="toggle-set" data-index="${index}">${set.done ? '✓' : '↵'}</button></div>`;
  }).join('');
  const currentPrescription = current.prescription;
  const lastDetails = currentPrescription.previous ? `Last time · ${escapeHTML(currentPrescription.previous.sets?.length || 0)} sets` : 'First time logging this movement';
  const prevExercise = session.exerciseIndex > 0 ? session.exercises[session.exerciseIndex - 1] : null;
  const nextExercise = session.exerciseIndex < session.exercises.length - 1 ? session.exercises[session.exerciseIndex + 1] : null;
  return `<div class="session-top"><button class="text-button" data-action="minimize">‹ Today</button><div class="session-title"><strong>${escapeHTML(session.workoutName)}</strong><span>${session.exerciseIndex + 1} of ${session.exercises.length} movements</span></div><button class="text-button" data-action="finish-workout">Finish</button></div>
    <div class="timer-grid"><div class="surface timer-card"><div><span>Workout</span><strong id="workoutElapsed">${formatDuration((Date.now() - session.startedAt) / 1000)}</strong></div><span>◷</span></div><div class="surface timer-card"><div><span>Rest</span><strong id="restCountdown">${formatDuration(session.restUntil ? Math.max(0, (session.restUntil - Date.now()) / 1000) : 0)}</strong></div><button data-action="skip-rest">Skip</button></div></div>
    <div class="progress-track" role="progressbar" aria-label="Workout progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}"><span style="width:${percentage}%"></span></div>
    <div class="exercise-head"><div><p class="exercise-kicker">Movement ${session.exerciseIndex + 1}</p><h2>${escapeHTML(current.name)}</h2></div></div>
    <div class="target-card"><div><span class="target-label">Suggested today</span><span class="target-value">${currentPrescription.weight ? `${formatWeight(currentPrescription.weight)} · ` : ''}${currentPrescription.reps} reps · ${currentPrescription.rir} RIR</span></div><button class="text-button" data-action="toggle-why" aria-expanded="false">Why?</button></div>
    <div class="why-panel" id="whyPanel">${escapeHTML(currentPrescription.reason)} <span class="row-sub">${lastDetails}</span></div>
    <div class="set-label-row" aria-hidden="true"><span>SET</span><span>LAST TIME</span><span>LOAD</span><span>REPS</span><span>RIR</span><span>DONE</span></div>
    <div class="set-list">${rowMarkup}</div>
    <p class="session-save-note">Each change saves on this device.</p>
    <div class="session-footer"><button class="button button-quiet" ${prevExercise ? `data-action="previous-exercise"` : 'disabled'}>‹ Previous</button><button class="button button-quiet" data-action="start-rest">Rest ${Math.floor((Number(plan.restSeconds) || 90) / 60)}:${String((Number(plan.restSeconds) || 90) % 60).padStart(2,'0')}</button><button class="button" ${nextExercise ? 'data-action="next-exercise"' : 'data-action="finish-workout"'}>${nextExercise ? 'Next movement ›' : 'Finish workout →'}</button></div>
    <div class="section-heading"><h2>Movements</h2><span class="row-sub">${done} / ${total} sets logged</span></div>
    <div class="list">${session.exercises.map((exercise, index) => `<button class="surface next-workout button-as-card" type="button" data-action="go-exercise" data-index="${index}"><span class="day-symbol">${String(index + 1).padStart(2,'0')}</span><span class="grow"><span class="row-title">${escapeHTML(exercise.name)}</span><span class="row-sub">${exercise.setRows.filter((set) => set.done).length} / ${exercise.setRows.length} sets</span></span><span class="chevron">${index === session.exerciseIndex ? '•' : '›'}</span></button>`).join('')}</div>`;
}

function renderHistory() {
  const exerciseOptions = [...new Set(state.history.flatMap((session) => (session.exercises || []).map((exercise) => exercise.name)))].sort();
  const selectedName = document.getElementById('historyExercise')?.value || exerciseOptions.find((name) => name.toLowerCase().includes('bench')) || exerciseOptions[0] || '';
  const selectedExercise = LIBRARY.find((exercise) => exercise.name === selectedName) || { id: '', name: selectedName };
  const points = selectedName ? performancePoints(state.history, selectedExercise.id, selectedName) : [];
  const values = points.map((point) => point.value);
  const min = values.length ? Math.floor((Math.min(...values) - 4) / 5) * 5 : 0;
  const max = values.length ? Math.ceil((Math.max(...values) + 4) / 5) * 5 : 100;
  const range = Math.max(1, max - min);
  const coords = points.map((point, index) => ({ x: points.length === 1 ? 170 : 16 + index * (308 / (points.length - 1)), y: 100 - ((point.value - min) / range) * 78 }));
  const linePath = coords.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const areaPath = coords.length ? `${linePath} L${coords.at(-1).x.toFixed(1)} 108 L${coords[0].x.toFixed(1)} 108 Z` : '';
  const latest = points.at(-1);
  const first = points[0];
  const delta = latest && first ? Math.round((latest.value - first.value) * 10) / 10 : 0;
  const chart = points.length ? `<svg class="chart" viewBox="0 0 340 130" role="img" aria-label="Estimated strength over time"><line class="chart-grid" x1="12" y1="22" x2="328" y2="22"/><line class="chart-grid" x1="12" y1="62" x2="328" y2="62"/><line class="chart-grid" x1="12" y1="102" x2="328" y2="102"/><text class="chart-axis" x="12" y="121">${escapeHTML(prettyDate(first.date, { month: 'short', day: 'numeric' }))}</text><text class="chart-axis" x="272" y="121">${escapeHTML(prettyDate(latest.date, { month: 'short', day: 'numeric' }))}</text><path class="chart-area" d="${areaPath}"/><path class="chart-line" d="${linePath}"/>${coords.map((point) => `<circle class="chart-dot" cx="${point.x}" cy="${point.y}" r="3.4"/>`).join('')}</svg>` : '<div class="empty-state">Log a few sets and your estimated strength trend will appear here.</div>';
  const totalSets = state.history.reduce((sum, session) => sum + (session.exercises || []).reduce((sub, exercise) => sub + exercise.sets.length, 0), 0);
  const historyCards = state.history.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map((session) => {
    const setCount = (session.exercises || []).reduce((sum, exercise) => sum + exercise.sets.length, 0);
    const lines = (session.exercises || []).map((exercise) => {
      const best = exercise.sets.reduce((current, set) => Math.max(current, Number(set.weight) || 0), 0);
      const reps = exercise.sets.map((set) => Number(set.reps)).filter(Number.isFinite).join(', ');
      return `<div>${escapeHTML(exercise.name)} · ${exercise.sets.length} sets · ${best ? formatWeight(best) : 'bodyweight'} × ${escapeHTML(reps)} reps</div>`;
    }).join('');
    return `<article class="surface history-item"><div class="history-head"><div><p class="eyebrow">${escapeHTML(prettyDate(session.date))}${session.imported ? ' · IMPORTED' : ''}</p><h3>${escapeHTML(session.workoutName || 'Workout')}</h3></div><span class="row-sub">${setCount} sets<br>${formatDuration(session.durationSeconds)}</span></div><div class="history-exercise">${lines || 'No sets recorded.'}</div></article>`;
  }).join('');
  return `<section class="screen-heading"><p class="eyebrow">Your training, over time</p><h1>Progress you can see.</h1><p class="subtitle">Estimates help show a trend. They are not a perfect measurement or a score.</p></section>
    <article class="surface progress-chart-card"><div class="chart-head"><div><p class="eyebrow">Estimated 1 rep max</p><div class="chart-metric">${latest ? `${latest.value} ${state.profile.unit}` : '—'}</div><div class="chart-delta">${latest && first ? `${delta >= 0 ? '+' : ''}${delta} ${state.profile.unit} across ${points.length} sessions` : 'Based on your completed sets'}</div></div><select class="field" id="historyExercise" aria-label="Choose exercise" ${exerciseOptions.length ? '' : 'disabled'}>${exerciseOptions.map((name) => `<option ${name === selectedName ? 'selected' : ''}>${escapeHTML(name)}</option>`).join('') || '<option>Bench press</option>'}</select></div>${chart}</article>
    <div class="two-column"><div class="surface stat-card"><div class="stat-label">Logged sessions</div><div class="stat-value">${state.history.length}</div><div class="stat-note">Across your training history</div></div><div class="surface stat-card"><div class="stat-label">Working sets</div><div class="stat-value">${totalSets}</div><div class="stat-note">Completed and imported</div></div></div>
    <div class="section-heading"><h2>Session history</h2><button class="text-button" data-action="export-history">Export CSV</button></div>
    <div class="list">${historyCards || '<div class="empty-state">Your completed workouts will show here. You can also import history from a CSV file.</div>'}</div>
    <div class="plan-toolbar spacer-top"><button class="button button-quiet" data-action="open-import">Import history or a program</button></div>`;
}

function renderCloudAccount() {
  if (!isFirebaseConfigured()) return `<article class="surface surface-inner account-card"><p class="eyebrow">Account and backup</p><h2>Keep your training close.</h2><p class="row-sub">Login and sign-up previews are ready. Secure account access and cloud backup are not connected yet. Your workouts stay on this device.</p><div class="button-row spacer-top"><button class="button button-primary" data-action="open-login">Log in</button><button class="button button-quiet" data-action="open-signup">Create account</button></div></article>`;
  if (!cloudUser) return `<article class="surface surface-inner account-card"><p class="eyebrow">Account and backup</p><h2>Use your Google account.</h2><p class="row-sub">${escapeHTML(cloudStatus)} Your data stays local until you turn cloud sync on.</p><button class="button button-primary button-block spacer-top" data-action="google-sign-in">Continue with Google</button></article>`;

  const displayName = cloudUser.displayName || cloudUser.email || 'Google account';
  const actionLabel = cloudSyncEnabled ? 'Sync now' : cloudRemote.exists && !hasLocalTrainingData() ? 'Restore and enable sync' : 'Enable cloud sync';
  return `<article class="surface surface-inner account-card"><p class="eyebrow">Account and backup</p><h2>${escapeHTML(displayName)}</h2><p class="row-sub">${escapeHTML(cloudStatus)}</p><div class="button-row spacer-top"><button class="button button-primary" data-action="${cloudSyncEnabled ? 'sync-cloud-now' : 'enable-cloud-sync'}">${actionLabel}</button><button class="button button-quiet" data-action="google-sign-out">Sign out</button></div><p class="help-copy spacer-top">Local workout logging continues without a connection. Cloud sync runs when this device is online.</p></article>`;
}

function renderSettings() {
  if (editingProfile) return `<section class="screen-heading"><p class="eyebrow">Preferences</p><h1>Edit your setup.</h1><p class="subtitle">Your program and history stay as they are.</p></section><form id="profileEditForm" class="form-stack"><div class="field-group"><label class="field-label" for="profileName">Name</label><input class="field" id="profileName" name="name" maxlength="30" value="${escapeHTML(state.profile.name)}"></div><div class="field-group"><label class="field-label" for="profileGoal">Main goal</label><select class="field" id="profileGoal" name="goal"><option value="strength" ${state.profile.goal === 'strength' ? 'selected' : ''}>Get stronger</option><option value="hypertrophy" ${state.profile.goal === 'hypertrophy' ? 'selected' : ''}>Build muscle</option><option value="general" ${state.profile.goal === 'general' ? 'selected' : ''}>Stay balanced</option></select></div><div class="field-row"><div class="field-group"><label class="field-label" for="profileExperience">Experience</label><select class="field" id="profileExperience" name="experience"><option value="beginner" ${state.profile.experience === 'beginner' ? 'selected' : ''}>New to lifting</option><option value="intermediate" ${state.profile.experience === 'intermediate' ? 'selected' : ''}>Regular lifter</option><option value="advanced" ${state.profile.experience === 'advanced' ? 'selected' : ''}>Experienced</option></select></div><div class="field-group"><label class="field-label" for="profileMinutes">Time per session</label><select class="field" id="profileMinutes" name="minutes">${[30,45,60,75].map((minutes) => `<option value="${minutes}" ${Number(state.profile.sessionMinutes) === minutes ? 'selected' : ''}>${minutes} min</option>`).join('')}</select></div></div><div class="button-row spacer-top"><button class="button button-quiet" type="button" data-action="cancel-profile-edit">Cancel</button><button class="button button-primary" type="submit">Save profile</button></div></form>`;
  const installButton = installPrompt ? '<button class="button button-block" data-action="install-app">Install app</button>' : '';
  return `<section class="screen-heading"><p class="eyebrow">Preferences and data</p><h1>Settings.</h1><p class="subtitle">Your data stays local unless you choose to turn on cloud sync.</p></section>
    ${renderCloudAccount()}
    <article class="surface surface-inner"><div class="section-heading" style="margin:0 0 13px"><h2>Training setup</h2><button class="text-button" data-action="edit-profile">Edit</button></div><div class="row-title">${escapeHTML(state.profile.name || 'Athlete')} · ${escapeHTML(state.profile.goal)}</div><p class="row-sub">${state.profile.trainingDays.length} days · ${state.profile.sessionMinutes} minutes · ${state.profile.unit} · ${escapeHTML(state.profile.experience)}</p></article>
    <div class="section-heading"><h2>Data and install</h2></div>
    <div class="list"><button class="button button-block" data-action="open-import">Import CSV data</button><button class="button button-block" data-action="export-history">Export workout history</button><button class="button button-block" data-action="export-routine">Export routine</button>${installButton}</div>
    <p class="muted-note">The app stores your plan, active workout, and history on this device. Clearing site data removes them. Export a CSV before moving to another browser.</p>
    <hr class="divider"><button class="button button-quiet danger-text" data-action="reset-data">Reset this app's data</button>
    <p class="help-copy spacer-top">Phase 1 uses a simple progression rule: build reps inside your range at the planned effort, then add the next available load after all work sets reach the top of the range. You can override every suggestion.</p>`;
}

function render() {
  const isOnboarding = !state.profile || !state.program;
  const isAuthView = ['welcome', 'login', 'signup'].includes(currentView);
  bottomNav.hidden = isOnboarding || isAuthView || currentView === 'session';
  document.querySelector('.topbar').hidden = isOnboarding || isAuthView;
  if (currentView === 'welcome') main.innerHTML = renderAuthWelcome();
  else if (currentView === 'login' || currentView === 'signup') main.innerHTML = renderAuthForm(currentView);
  else if (isOnboarding) main.innerHTML = renderOnboarding();
  else if (currentView === 'session') main.innerHTML = renderSession();
  else if (currentView === 'plan') main.innerHTML = renderPlan();
  else if (currentView === 'history') main.innerHTML = renderHistory();
  else if (currentView === 'settings') main.innerHTML = renderSettings();
  else main.innerHTML = renderToday();
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.nav === currentView);
    if (button.dataset.nav === currentView) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (currentView === 'session' && state.activeSession) startClock();
  else clearInterval(timerHandle);
  updateClock();
}

function setView(view) {
  if (view !== 'session' && state.activeSession) {
    currentView = view;
  } else currentView = view;
  render();
  main.focus({ preventScroll: true });
  main.scrollTop = 0;
}

function openAuthPage(view) {
  if (!['login', 'signup'].includes(currentView)) authReturnView = currentView;
  currentView = view;
  render();
  main.focus({ preventScroll: true });
  main.scrollTop = 0;
}

function continueWithoutAccount() {
  currentView = (!state.profile || !state.program) ? 'onboarding' : authReturnView;
  render();
}

function startOnboarding(form) {
  const data = new FormData(form);
  const trainingDays = data.getAll('trainingDays').map(Number).sort((a, b) => a - b);
  if (trainingDays.length < 2 || trainingDays.length > 6) {
    showToast('Choose between 2 and 6 training days.');
    return;
  }
  const profile = {
    name: String(data.get('name') || '').trim().slice(0, 30),
    goal: String(data.get('goal') || 'general'),
    experience: String(data.get('experience') || 'beginner'),
    sessionMinutes: Number(data.get('minutes')) || 60,
    unit: String(data.get('unit') || 'kg'),
    access: String(data.get('access') || 'gym'),
    trainingDays
  };
  state.profile = profile;
  state.program = createStarterProgram(profile);
  saveState();
  currentView = 'today';
  render();
  showToast('Your starter plan is ready. You can edit it any time.');
}

function exerciseOptions(selected = '') {
  const names = LIBRARY.map((exercise) => exercise.name);
  if (selected && !names.includes(selected)) names.unshift(selected);
  return names.map((name) => `<option value="${escapeHTML(name)}" ${name === selected ? 'selected' : ''}>${escapeHTML(name)}</option>`).join('');
}

function exerciseEditorRow(exercise = null, index = 0) {
  const value = exercise || { name: LIBRARY[0].name, sets: 3, minReps: 8, maxReps: 12, targetRir: 2, load: getLibraryExercise(LIBRARY[0].name).load };
  return `<div class="editor-exercise" data-editor-index="${index}"><div class="editor-exercise-head"><span class="row-title">Movement ${index + 1}</span><button class="text-button" type="button" data-action="remove-editor-exercise" data-index="${index}">Remove</button></div><div class="editor-exercise-grid"><div class="field-group"><label class="field-label">Exercise</label><select class="field editor-exercise-name">${exerciseOptions(value.name)}</select></div><div class="field-group"><label class="field-label">Sets</label><input class="field editor-sets" type="number" min="1" max="10" value="${escapeHTML(value.sets)}"></div><div class="field-group"><label class="field-label">Min reps</label><input class="field editor-min" type="number" min="1" max="50" value="${escapeHTML(value.minReps)}"></div><div class="field-group"><label class="field-label">Max reps</label><input class="field editor-max" type="number" min="1" max="50" value="${escapeHTML(value.maxReps)}"></div><div class="field-group"><label class="field-label">Target RIR</label><input class="field editor-rir" type="number" min="0" max="5" value="${escapeHTML(value.targetRir)}"></div><div class="field-group"><label class="field-label">Start load (${state.profile.unit})</label><input class="field editor-load" type="number" min="0" step="0.5" value="${escapeHTML(value.load)}"></div></div></div>`;
}

function openWorkoutEditor(workout = null) {
  editingWorkoutId = workout?.id || null;
  const existing = workout || { name: 'New workout', weekday: state.profile.trainingDays[0], focus: '', exercises: [exerciseFromName(LIBRARY[0].name, state.profile, state.profile.goal === 'strength' ? [5, 8] : [8, 12])] };
  document.getElementById('editorTitle').textContent = workout ? 'Edit workout' : 'Build workout';
  editorFields.innerHTML = `<div class="form-stack"><div class="field-row"><div class="field-group"><label class="field-label" for="editWorkoutName">Workout name</label><input class="field" id="editWorkoutName" maxlength="32" value="${escapeHTML(existing.name)}" required></div><div class="field-group"><label class="field-label" for="editWorkoutDay">Training day</label><select class="field" id="editWorkoutDay">${DAY_NAMES.map((day, index) => `<option value="${index}" ${index === Number(existing.weekday) ? 'selected' : ''}>${day}</option>`).join('')}</select></div></div><div class="field-group"><label class="field-label" for="editWorkoutFocus">Focus note</label><input class="field" id="editWorkoutFocus" maxlength="50" value="${escapeHTML(existing.focus || '')}" placeholder="e.g. Squat and hinge"></div><div class="section-heading" style="margin:8px 0 0"><h3>Exercises</h3><button class="text-button" id="addEditorExercise" type="button">+ Add movement</button></div><div id="editorExerciseRows">${existing.exercises.map((exercise, index) => exerciseEditorRow(exercise, index)).join('')}</div></div>`;
  editorDialog.showModal();
}

function saveWorkoutEditor() {
  const name = document.getElementById('editWorkoutName').value.trim();
  if (!name) return showToast('Give this workout a name.');
  const exerciseRows = [...document.querySelectorAll('.editor-exercise')].map((row) => {
    const exerciseName = row.querySelector('.editor-exercise-name').value;
    const source = getLibraryExercise(exerciseName, state.profile.unit);
    return {
      id: source.id,
      name: source.name,
      muscle: source.muscle,
      equipment: source.equipment,
      bodyweight: Boolean(source.bodyweight),
      sets: Math.min(10, Math.max(1, Number(row.querySelector('.editor-sets').value) || 3)),
      minReps: Math.max(1, Number(row.querySelector('.editor-min').value) || 8),
      maxReps: Math.max(1, Number(row.querySelector('.editor-max').value) || 12),
      targetRir: Math.min(5, Math.max(0, Number(row.querySelector('.editor-rir').value) || 0)),
      load: Math.max(0, Number(row.querySelector('.editor-load').value) || source.load),
      increment: source.increment,
      restSeconds: 90,
      unit: state.profile.unit
    };
  });
  if (!exerciseRows.length) return showToast('Add at least one exercise.');
  for (const exercise of exerciseRows) if (exercise.maxReps < exercise.minReps) [exercise.minReps, exercise.maxReps] = [exercise.maxReps, exercise.minReps];
  const workout = { id: editingWorkoutId || newId(), name, weekday: Number(document.getElementById('editWorkoutDay').value), focus: document.getElementById('editWorkoutFocus').value.trim(), exercises: exerciseRows };
  const index = state.program.workouts.findIndex((item) => item.id === editingWorkoutId);
  if (index >= 0) state.program.workouts[index] = workout;
  else state.program.workouts.push(workout);
  saveState();
  editorDialog.close();
  currentView = 'plan';
  render();
  showToast('Workout saved.');
}

function addEditorExercise() {
  const list = document.getElementById('editorExerciseRows');
  const index = list.querySelectorAll('.editor-exercise').length;
  list.insertAdjacentHTML('beforeend', exerciseEditorRow(null, index));
}

function addTemplate(name) {
  const templateExercises = TEMPLATES[name];
  if (!templateExercises) return;
  const sameNameCount = state.program.workouts.filter((workout) => workout.name.startsWith(name)).length;
  const weekday = state.profile.trainingDays.find((day) => !state.program.workouts.some((workout) => workout.weekday === day)) ?? state.profile.trainingDays[state.program.workouts.length % state.profile.trainingDays.length];
  const range = state.profile.goal === 'strength' ? [5, 8] : state.profile.goal === 'hypertrophy' ? [8, 12] : [6, 10];
  state.program.workouts.push({ id: newId(), name: sameNameCount ? `${name} ${sameNameCount + 1}` : name, focus: `${name} template`, weekday, exercises: templateExercises.map((exercise) => exerciseFromName(exercise, state.profile, range)) });
  saveState();
  render();
  showToast(`${name} template added to your plan.`);
}

function openImport() {
  document.getElementById('csvFile').value = '';
  updateImportHelp();
  importDialog.showModal();
}

function updateImportHelp() {
  const type = document.getElementById('importType').value;
  document.getElementById('csvHelp').textContent = type === 'routine'
    ? 'Routine columns: workout, day, exercise, sets, min_reps, max_reps, rir, load'
    : 'History columns: date, workout, exercise, weight, reps, rir. Use one row per performed set.';
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' && quoted && source[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) throw new Error('This CSV has no data rows.');
  const headers = rows.shift().map((header) => header.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ''])));
}

function importedWeekday(value, fallback) {
  const numeric = Number(value);
  if (value !== '' && Number.isInteger(numeric) && numeric >= 0 && numeric <= 6) return numeric;
  const match = DAY_NAMES.findIndex((day) => day.toLowerCase().startsWith(String(value).trim().toLowerCase()));
  return match >= 0 ? match : fallback;
}

function importRoutineRows(rows) {
  if (!rows[0] || !('workout' in rows[0]) || !('exercise' in rows[0])) throw new Error('Routine CSV needs workout and exercise columns.');
  const grouped = new Map();
  for (const row of rows) {
    if (!row.workout || !row.exercise) continue;
    if (!grouped.has(row.workout)) grouped.set(row.workout, []);
    const base = exerciseFromName(row.exercise, state.profile, [Number(row.min_reps) || 8, Number(row.max_reps) || 12]);
    const load = Number(row.load);
    const rir = row.rir === '' ? 2 : Number(row.rir);
    grouped.get(row.workout).push({ ...base, sets: Math.max(1, Number(row.sets) || 3), targetRir: Math.min(5, Math.max(0, Number.isFinite(rir) ? rir : 2)), load: row.load !== '' && Number.isFinite(load) ? load : base.load });
  }
  if (!grouped.size) throw new Error('No valid workout and exercise rows were found.');
  const existingDays = state.program.workouts.map((workout) => workout.weekday);
  for (const [name, exercises] of grouped) {
    const first = rows.find((row) => row.workout === name);
    const day = importedWeekday(first?.day, state.profile.trainingDays.find((candidate) => !existingDays.includes(candidate)) ?? state.profile.trainingDays[0]);
    state.program.workouts.push({ id: newId(), name, weekday: day, focus: 'Imported program', exercises });
    existingDays.push(day);
  }
  return grouped.size;
}

function importHistoryRows(rows) {
  if (!rows[0] || !('date' in rows[0]) || !('exercise' in rows[0]) || !('weight' in rows[0]) || !('reps' in rows[0])) throw new Error('History CSV needs date, exercise, weight, and reps columns.');
  const grouped = new Map();
  for (const row of rows) {
    if (!row.date || !row.exercise) continue;
    const date = row.date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const workoutName = row.workout || 'Imported workout';
    const key = `${date}|${workoutName}`;
    if (!grouped.has(key)) grouped.set(key, { id: newId(), date, workoutName, startedAt: `${date}T12:00:00.000Z`, durationSeconds: 0, imported: true, exercises: [] });
    const session = grouped.get(key);
    const base = getLibraryExercise(row.exercise, state.profile.unit);
    let exercise = session.exercises.find((item) => item.exerciseId === base.id || item.name.toLowerCase() === row.exercise.toLowerCase());
    if (!exercise) {
      exercise = { exerciseId: base.id, name: base.name, sets: [] };
      session.exercises.push(exercise);
    }
    const importedRir = row.rir === '' ? 2 : Number(row.rir);
    exercise.sets.push({ weight: Number(row.weight) || 0, reps: Number(row.reps) || 0, rir: Number.isFinite(importedRir) ? importedRir : 2, done: true });
  }
  if (!grouped.size) throw new Error('No valid history rows were found. Use YYYY-MM-DD dates.');
  state.history.push(...grouped.values());
  state.history.sort((a, b) => new Date(b.date) - new Date(a.date));
  return grouped.size;
}

function importCsvFile(file) {
  if (!file) return showToast('Choose a CSV file first.');
  file.text().then((text) => {
    const rows = parseCSV(text);
    const type = document.getElementById('importType').value;
    const count = type === 'routine' ? importRoutineRows(rows) : importHistoryRows(rows);
    saveState();
    importDialog.close();
    currentView = type === 'routine' ? 'plan' : 'history';
    render();
    showToast(`Imported ${count} ${type === 'routine' ? 'workout' : 'session'}${count === 1 ? '' : 's'}.`);
  }).catch((error) => showToast(error.message || 'Could not read this CSV.'));
}

function csvQuote(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename, rows) {
  const blob = new Blob([rows.map((row) => row.map(csvQuote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadTemplate() {
  if (document.getElementById('importType').value === 'routine') {
    downloadCsv('form-routine-template.csv', [['workout','day','exercise','sets','min_reps','max_reps','rir','load'],['Upper A','Monday','Barbell bench press','3','7','9','2','60'],['Upper A','Monday','Seated cable row','3','8','10','2','45']]);
  } else {
    downloadCsv('form-history-template.csv', [['date','workout','exercise','weight','reps','rir'],['2026-10-07','Upper A','Barbell bench press','57.5','8','2'],['2026-10-07','Upper A','Barbell bench press','57.5','8','2']]);
  }
}

function exportHistory() {
  const rows = [['date','workout','exercise','weight','reps','rir']];
  [...state.history].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((session) => (session.exercises || []).forEach((exercise) => exercise.sets.forEach((set) => rows.push([session.date, session.workoutName, exercise.name, set.weight, set.reps, set.rir]))));
  if (rows.length === 1) return showToast('No workout history to export yet.');
  downloadCsv('form-workout-history.csv', rows);
  showToast('Workout history exported.');
}

function exportRoutine() {
  if (!state.program?.workouts.length) return showToast('No program to export yet.');
  const rows = [['workout','day','exercise','sets','min_reps','max_reps','rir','load']];
  state.program.workouts.forEach((workout) => workout.exercises.forEach((exercise) => rows.push([workout.name, DAY_NAMES[workout.weekday], exercise.name, exercise.sets, exercise.minReps, exercise.maxReps, exercise.targetRir, exercise.load])));
  downloadCsv('form-routine.csv', rows);
  showToast('Routine exported.');
}

function toggleSet(index) {
  const set = state.activeSession?.exercises[state.activeSession.exerciseIndex]?.setRows[index];
  if (!set) return;
  set.done = !set.done;
  if (set.done) startRestTimer();
  else saveState();
  render();
  showToast(set.done ? `Set ${index + 1} saved.` : `Set ${index + 1} marked incomplete.`);
}

function handleAction(button) {
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === 'open-login') openAuthPage('login');
  else if (action === 'open-signup') openAuthPage('signup');
  else if (action === 'auth-back') { currentView = authReturnView; render(); }
  else if (action === 'continue-local') continueWithoutAccount();
  else if (action === 'auth-submit') {
    const authFields = [...document.querySelectorAll('#authForm input')];
    const invalidField = authFields.find((field) => !field.checkValidity());
    if (invalidField) { invalidField.reportValidity(); return; }
    authFields.forEach((field) => { field.value = ''; });
    const notice = document.getElementById('authFormMessage');
    if (notice) notice.textContent = 'Secure email sign-in is not connected yet. Your details were cleared and nothing was sent or saved.';
    showToast('Account access is not connected yet.');
  }
  else if (action === 'auth-google') {
    if (!isFirebaseConfigured()) {
      const notice = document.getElementById('authFormMessage');
      if (notice) notice.textContent = 'Google sign-in is not connected yet. Nothing was sent to Google.';
      showToast('Secure account access is not connected yet.');
    } else {
      currentView = 'settings';
      cloudStatus = 'Opening Google sign-in…';
      render();
      signInWithGoogle().catch((error) => { cloudStatus = friendlyCloudError(error); render(); showToast(cloudStatus); });
    }
  }
  else if (action === 'start-workout') startWorkout(id);
  else if (action === 'resume-workout') { currentView = 'session'; render(); }
  else if (action === 'open-plan-workout') setView('plan');
  else if (action === 'edit-workout') openWorkoutEditor(getWorkout(id));
  else if (action === 'new-workout') openWorkoutEditor();
  else if (action === 'add-template') addTemplate(button.dataset.template);
  else if (action === 'remove-editor-exercise') { button.closest('.editor-exercise').remove(); document.querySelectorAll('.editor-exercise-head .row-title').forEach((node, index) => { node.textContent = `Movement ${index + 1}`; }); }
  else if (action === 'open-import') openImport();
  else if (action === 'export-history') exportHistory();
  else if (action === 'export-routine') exportRoutine();
  else if (action === 'google-sign-in') {
    cloudStatus = 'Opening Google sign-in…';
    render();
    signInWithGoogle().catch((error) => { cloudStatus = friendlyCloudError(error); render(); showToast(cloudStatus); });
  }
  else if (action === 'google-sign-out') {
    signOutOfGoogle().catch((error) => { cloudStatus = friendlyCloudError(error); render(); showToast(cloudStatus); });
  }
  else if (action === 'enable-cloud-sync') enableCloudSync();
  else if (action === 'sync-cloud-now') syncCurrentState().then(() => showToast(cloudStatus));
  else if (action === 'minimize') setView('today');
  else if (action === 'finish-workout') finishWorkout();
  else if (action === 'toggle-set') toggleSet(Number(button.dataset.index));
  else if (action === 'start-rest') startRestTimer();
  else if (action === 'skip-rest') { state.activeSession.restUntil = null; saveState(); updateClock(); }
  else if (action === 'next-exercise') { state.activeSession.exerciseIndex = Math.min(state.activeSession.exercises.length - 1, state.activeSession.exerciseIndex + 1); saveState(); render(); }
  else if (action === 'previous-exercise') { state.activeSession.exerciseIndex = Math.max(0, state.activeSession.exerciseIndex - 1); saveState(); render(); }
  else if (action === 'go-exercise') { state.activeSession.exerciseIndex = Number(button.dataset.index); saveState(); render(); }
  else if (action === 'toggle-why') { const panel = document.getElementById('whyPanel'); const open = panel.classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); button.textContent = open ? 'Hide' : 'Why?'; }
  else if (action === 'edit-current-exercise') openWorkoutEditor(getWorkout(state.activeSession.workoutId));
  else if (action === 'install-app' && installPrompt) { installPrompt.prompt(); installPrompt = null; render(); }
  else if (action === 'edit-profile') { editingProfile = true; currentView = 'settings'; render(); }
  else if (action === 'cancel-profile-edit') { editingProfile = false; render(); }
  else if (action === 'reset-data') {
    const message = cloudSyncEnabled
      ? 'Clear this device’s plan, active workout, and local history? The copy in your Firebase account will remain. Cloud sync will turn off on this device so the empty state is not uploaded.'
      : 'Delete this app’s plan, active workout, and local history from this browser? Export your history first if you need a copy.';
    if (window.confirm(message)) {
      localStorage.removeItem(STORAGE_KEY);
      if (cloudUser) localStorage.removeItem(cloudSyncKey(cloudUser.uid));
      cloudSyncEnabled = false;
      state = emptyState(); currentView = 'welcome'; render(); showToast('Local app data cleared.');
    }
  }
}

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) { setView(nav.dataset.nav); return; }
  const action = event.target.closest('[data-action]');
  if (action) { handleAction(action); return; }
  if (event.target.id === 'addEditorExercise') addEditorExercise();
  if (event.target.id === 'downloadTemplate') downloadTemplate();
});

document.addEventListener('submit', (event) => {
  if (event.target.id === 'onboardingForm') { event.preventDefault(); startOnboarding(event.target); }
  if (event.target.id === 'profileEditForm') {
    event.preventDefault();
    const data = new FormData(event.target);
    state.profile.name = String(data.get('name') || '').trim().slice(0, 30);
    state.profile.goal = String(data.get('goal') || state.profile.goal);
    state.profile.experience = String(data.get('experience') || state.profile.experience);
    state.profile.sessionMinutes = Number(data.get('minutes')) || state.profile.sessionMinutes;
    editingProfile = false;
    saveState();
    render();
    showToast('Profile updated.');
  }
  if (event.target.id === 'workoutEditorForm') { event.preventDefault(); if (event.submitter?.id === 'saveWorkoutButton') saveWorkoutEditor(); else editorDialog.close(); }
  if (event.target.id === 'importForm') { event.preventDefault(); if (event.submitter?.id === 'importCsvButton') importCsvFile(document.getElementById('csvFile').files[0]); else importDialog.close(); }
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (!target.matches('[data-set-field]') || !state.activeSession) return;
  const set = state.activeSession.exercises[state.activeSession.exerciseIndex].setRows[Number(target.dataset.setIndex)];
  if (!set) return;
  const field = target.dataset.setField;
  set[field] = field === 'rir' ? target.value : Number(target.value);
  saveStateLabel.textContent = 'Saving…';
  clearTimeout(target._saveTimer);
  target._saveTimer = setTimeout(() => { saveState(); }, 180);
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'importType') updateImportHelp();
  if (event.target.id === 'historyExercise') render();
  const target = event.target;
  if (target.matches('[data-set-field]') && target.dataset.setField === 'rir' && state.activeSession) {
    const set = state.activeSession.exercises[state.activeSession.exerciseIndex].setRows[Number(target.dataset.setIndex)];
    if (set) { set.rir = target.value === '4+' ? 4 : Number(target.value); saveState(); }
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.matches('#authForm input')) {
    event.preventDefault();
    document.querySelector('[data-action="auth-submit"]')?.click();
  }
  if (event.key === 'Escape') {
    if (editorDialog.open) editorDialog.close();
    if (importDialog.open) importDialog.close();
  }
});

window.addEventListener('pagehide', saveState);
window.addEventListener('online', () => { if (cloudSyncEnabled) syncCurrentState(); });
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPrompt = event; if (currentView === 'settings') render(); });
window.addEventListener('appinstalled', () => { installPrompt = null; showToast('FORM was added to your home screen.'); });

if (isFirebaseConfigured()) {
  initializePhase2(onCloudUserChanged, (error) => {
    cloudStatus = friendlyCloudError(error);
    if (currentView === 'settings') render();
  }).catch((error) => {
    cloudStatus = friendlyCloudError(error);
    if (currentView === 'settings') render();
  });
}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const registerAppWorker = () => navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Offline cache was not registered.', error));
  if (document.readyState === 'complete') registerAppWorker();
  else window.addEventListener('load', registerAppWorker, { once: true });
}

if (state.activeSession) currentView = 'today';
render();
