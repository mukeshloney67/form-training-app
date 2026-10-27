# Phase 3 · Workout flow checks

## Automated checks

Run `npm test` from the project root. The tests cover the independent progression rule, boundary inputs, saved recommendation details, and chart data from completed sets.

## Hands-on acceptance checks

Run `npm run dev` from the project root and use the app at `http://localhost:3000`. Use a disposable browser profile if you need to start with a clean plan.

1. **Find the next workout:** complete onboarding and identify the suggested session. Record how long it took and whether the choice was clear.
2. **Start and log:** start that workout, change one set's load/reps/RIR, save it, then move to another exercise and back. The saved set should still be there.
3. **Resume safely:** leave the workout, reload the page, and resume. The active session and completed set should remain.
4. **Understand the target:** open “Why?” and explain in your own words what the app recommends and which prior sets led to it.
5. **Adapt equipment:** edit the plan and replace an exercise with an available movement. Start the plan and confirm the replacement is used.
6. **Finish and review:** finish after logging a set. Confirm that History shows it and that the next recommendation changes from the completed performance.
7. **Check a wider screen:** open Plan on a tablet/desktop sized window and edit a workout. Confirm that exercise fields are readable and the dialog is not cramped.

## What to record

- Time to locate and start the first session.
- Any set that disappears, duplicates, or requires re-entry.
- Whether the user can explain the next target after reading its reason.
- Whether the user can replace unavailable equipment without help.
- Whether the user knows what to do next and returns to the plan after logging.

The unit tests pass, but the hands-on browser checks still need a running local preview and should be completed before calling the phone logging flow validated.
