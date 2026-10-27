export function estimateOneRepMax(weight, reps) {
  const load = Number(weight);
  const count = Number(reps);
  if (!Number.isFinite(load) || load <= 0 || !Number.isFinite(count) || count < 1) return null;
  return Math.round(load * (1 + count / 30) * 10) / 10;
}

export function prescriptionFor(exercise, history) {
  const rawTargetRir = exercise.targetRir;
  const plannedRir = rawTargetRir !== null && rawTargetRir !== '' && Number.isFinite(Number(rawTargetRir)) ? Number(rawTargetRir) : 2;
  const safeHistory = Array.isArray(history) ? history : [];
  const matches = safeHistory
    .flatMap((session) => (session.exercises || []).map((entry) => ({ ...entry, date: entry.date || session.date || null })))
    .filter((entry) => entry.exerciseId === exercise.id || entry.name?.toLowerCase() === String(exercise.name || '').toLowerCase())
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const previous = matches[0];
  const min = Number(exercise.minReps) || 8;
  const max = Number(exercise.maxReps) || 12;
  const targetRir = plannedRir;
  const planInputs = {
    sets: Number(exercise.sets) || 3,
    minReps: min,
    maxReps: max,
    targetRir,
    load: Number(exercise.load) || 0,
    increment: exercise.increment !== null && exercise.increment !== '' && Number.isFinite(Number(exercise.increment)) ? Number(exercise.increment) : 2.5,
    bodyweight: Boolean(exercise.bodyweight),
    unit: exercise.unit || 'kg'
  };
  const makePrescription = (weight, reps, rir, reason, previousInputs = null) => ({
    algorithmVersion: 'double-progression-v1',
    weight,
    reps,
    rir,
    previous,
    reason,
    inputs: { plan: planInputs, previous: previousInputs }
  });
  const base = {
    weight: planInputs.load,
    reps: min,
    rir: targetRir,
    reason: 'Starting point based on your plan. Log a controlled set; future targets will use your training history.'
  };
  if (!previous || !previous.sets?.length) return makePrescription(base.weight, base.reps, base.rir, base.reason);

  const sets = previous.sets.filter((set) => set.done !== false && set.reps !== null && set.reps !== '' && Number.isFinite(Number(set.reps)));
  if (!sets.length) return makePrescription(base.weight, base.reps, base.rir, base.reason, { date: previous.date || null, sets: [] });
  const meanReps = sets.reduce((sum, set) => sum + Number(set.reps), 0) / sets.length;
  const meanRir = sets.reduce((sum, set) => sum + (set.rir !== null && set.rir !== '' && Number.isFinite(Number(set.rir)) ? Number(set.rir) : targetRir), 0) / sets.length;
  const previousWeight = Number(sets.at(-1).weight ?? previous.load ?? exercise.load) || 0;
  const allAtTop = sets.length >= planInputs.sets && sets.every((set) => Number(set.reps) >= max) && meanRir >= targetRir;
  const previousInputs = {
    date: previous.date || null,
    sets: sets.map((set) => ({
      weight: Number(set.weight ?? previousWeight) || 0,
      reps: Number(set.reps),
      rir: set.rir !== null && set.rir !== '' && Number.isFinite(Number(set.rir)) ? Number(set.rir) : null
    })),
    meanReps,
    meanRir,
    weight: previousWeight
  };

  if (allAtTop && !exercise.bodyweight) {
    const increment = planInputs.increment;
    const nextWeight = Math.round((previousWeight + increment) * 100) / 100;
    return makePrescription(nextWeight, min, targetRir, `You reached ${max} reps on every set at the planned effort. Try ${nextWeight} ${exercise.unit || 'kg'} and build reps again.`, previousInputs);
  }
  if (meanReps >= min && meanRir >= targetRir) {
    const nextReps = Math.min(max, Math.max(min, Math.floor(meanReps) + 1));
    return makePrescription(previousWeight, nextReps, targetRir, `Your last sets stayed within range at the planned effort. Keep the load and aim for ${nextReps} reps.`, previousInputs);
  }
  const lowEffort = sets.some((set) => set.rir !== null && set.rir !== '' && Number.isFinite(Number(set.rir)) && Number(set.rir) < targetRir - 1);
  const missedFloor = sets.some((set) => Number(set.reps) < min);
  const nextWeight = lowEffort && missedFloor && !exercise.bodyweight
    ? Math.max(0, Math.round((previousWeight - planInputs.increment) * 100) / 100)
    : previousWeight;
  const reason = lowEffort || missedFloor
    ? `You fell below the target range or effort last time. Keep the target conservative${nextWeight < previousWeight ? ` and use ${nextWeight} ${exercise.unit || 'kg'}` : ''}; reassess after logging.`
    : `Keep the load steady and aim for at least ${min} controlled reps at about ${targetRir} reps in reserve.`;
  return makePrescription(nextWeight, min, targetRir, reason, previousInputs);
}

export function recommendationSnapshot(prescription) {
  if (!prescription) return null;
  return {
    algorithmVersion: prescription.algorithmVersion || 'double-progression-v1',
    inputs: JSON.parse(JSON.stringify(prescription.inputs || {})),
    target: {
      weight: Number(prescription.weight) || 0,
      reps: Number(prescription.reps) || 0,
      rir: Number(prescription.rir) || 0
    },
    reason: String(prescription.reason || '')
  };
}

export function performancePoints(history, exerciseId, exerciseName) {
  return history
    .map((session) => {
      const exercise = (session.exercises || []).find((entry) => entry.exerciseId === exerciseId || entry.name?.toLowerCase() === exerciseName.toLowerCase());
      if (!exercise) return null;
      const values = (exercise.sets || []).filter((set) => set.done !== false).map((set) => estimateOneRepMax(set.weight, set.reps)).filter(Number.isFinite);
      if (!values.length) return null;
      return { date: session.date, value: Math.max(...values), exercise: exercise.name };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}
