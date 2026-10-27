import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateOneRepMax, performancePoints, prescriptionFor, recommendationSnapshot } from '../public/form/progression.js';

const exercise = {
  id: 'bench', name: 'Bench press', sets: 3, minReps: 8, maxReps: 12,
  targetRir: 2, load: 40, increment: 2.5, unit: 'kg'
};

const session = (date, sets) => ({
  id: date,
  date,
  exercises: [{ exerciseId: 'bench', name: 'Bench press', sets }]
});

test('estimates one-rep max and rejects invalid inputs', () => {
  assert.equal(estimateOneRepMax(60, 8), 76);
  assert.equal(estimateOneRepMax(0, 8), null);
  assert.equal(estimateOneRepMax(60, 0), null);
  assert.equal(estimateOneRepMax('heavy', 8), null);
});

test('uses the plan as the first-session target and records its inputs', () => {
  const target = prescriptionFor(exercise, []);
  assert.deepEqual([target.weight, target.reps, target.rir], [40, 8, 2]);
  assert.equal(target.algorithmVersion, 'double-progression-v1');
  assert.deepEqual(target.inputs.plan, {
    sets: 3, minReps: 8, maxReps: 12, targetRir: 2,
    load: 40, increment: 2.5, bodyweight: false, unit: 'kg'
  });
  assert.match(target.reason, /Starting point/);
});

test('keeps bodyweight increments and missing effort targets accurate in the input snapshot', () => {
  const target = prescriptionFor({
    ...exercise, targetRir: null, load: 0, increment: 0, bodyweight: true
  }, []);
  assert.equal(target.rir, 2);
  assert.equal(target.inputs.plan.increment, 0);
  assert.equal(target.inputs.plan.bodyweight, true);
});

test('adds a rep when recent sets are in range at the planned effort', () => {
  const history = [session('2026-10-26', [
    { weight: 40, reps: 9, rir: 2 },
    { weight: 40, reps: 9, rir: 2 },
    { weight: 40, reps: 10, rir: 2 }
  ])];
  const target = prescriptionFor(exercise, history);
  assert.deepEqual([target.weight, target.reps, target.rir], [40, 10, 2]);
  assert.equal(target.inputs.previous.date, '2026-10-26');
  assert.equal(target.inputs.previous.meanReps, 28 / 3);
});

test('adds load only after every planned set reaches the top of the range', () => {
  const history = [session('2026-10-26', [
    { weight: 40, reps: 12, rir: 2 },
    { weight: 40, reps: 12, rir: 2 },
    { weight: 40, reps: 12, rir: 2 }
  ])];
  const target = prescriptionFor(exercise, history);
  assert.deepEqual([target.weight, target.reps, target.rir], [42.5, 8, 2]);
  assert.match(target.reason, /every set/);
});

test('reduces load after reps fall below range with much lower RIR', () => {
  const history = [session('2026-10-26', [
    { weight: 40, reps: 6, rir: 0 },
    { weight: 40, reps: 7, rir: 1 },
    { weight: 40, reps: 8, rir: 1 }
  ])];
  const target = prescriptionFor(exercise, history);
  assert.equal(target.weight, 37.5);
  assert.equal(target.reps, 8);
  assert.match(target.reason, /conservative/);
});

test('uses the newest matching session and treats missing RIR as unknown', () => {
  const history = [
    session('2026-10-26', [{ weight: 40, reps: 10, rir: 2 }]),
    session('2026-10-20', [{ weight: 35, reps: 12, rir: 2 }])
  ];
  const target = prescriptionFor(exercise, history);
  assert.equal(target.inputs.previous.date, '2026-10-26');

  const missingRir = prescriptionFor(exercise, [session('2026-10-26', [
    { weight: 40, reps: 7, rir: null }
  ])]);
  assert.equal(missingRir.weight, 40);
  assert.equal(missingRir.inputs.previous.sets[0].rir, null);
});

test('stores the recommendation snapshot in a stable, reviewable shape', () => {
  const target = prescriptionFor(exercise, [session('2026-10-26', [
    { weight: 40, reps: 9, rir: 2 }
  ])]);
  const snapshot = recommendationSnapshot(target);
  assert.deepEqual(snapshot.target, { weight: 40, reps: 10, rir: 2 });
  assert.equal(snapshot.algorithmVersion, 'double-progression-v1');
  assert.equal(snapshot.inputs.previous.sets[0].reps, 9);
  assert.equal(snapshot.reason, target.reason);
  snapshot.inputs.previous.sets[0].reps = 1;
  assert.equal(target.inputs.previous.sets[0].reps, 9, 'history snapshot must not share mutable recommendation inputs');
});

test('creates performance points from completed sets only', () => {
  const points = performancePoints([
    session('2026-10-26', [
      { weight: 40, reps: 8, done: true },
      { weight: 80, reps: 8, done: false }
    ])
  ], 'bench', 'Bench press');
  assert.equal(points.length, 1);
  assert.equal(points[0].value, 50.7);
});
