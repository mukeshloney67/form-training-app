# FORM · Phase 3 validation

FORM is an installable, phone-first progressive web app for strength training. This phase is validating the workout flow and preparing the progression system and editor for a broader device range. It is not yet a native iOS/Android app.

## Included in this slice

- Goal, experience, weekly frequency, available time, equipment, and unit setup.
- Starter programs based on training frequency, plus a manual workout editor and built-in workout templates.
- A workout logger with previous performance, today's target, per-set load/reps/RIR, autosave, rest countdown, and session resume.
- A separate, inspectable double-progression rule with a plain-language reason for each target.
- Completed sessions retain the planned exercise details and a snapshot of each recommendation: algorithm version, inputs, target, and reason.
- A wider workout editor on tablet and desktop screens.
- Welcome, login, and sign-up page previews, with a clear route to continue locally without an account.
- Local workout history, estimated-strength trend, and set-volume summaries.
- CSV import for routines and past set logs, plus routine and history export.
- A service worker cache for the app shell and browser-local storage for offline sessions.
- Google sign-in and per-account Firestore sync integration points; they stay inactive until a Firebase project is connected.
- Explicit opt-in before the app uploads any existing workout data.

## Run it

Install dependencies from the project root with `npm install`, start Next.js with `npm run dev`, then open `http://localhost:3000`.

Run the automated progression checks from the project root with `npm test`.

Use the browser's install action to add it to a phone's home screen. In iOS Safari, use Share → Add to Home Screen. Until Firebase is configured and cloud sync is enabled, all data stays in this browser on this device. See [PHASE-2-SETUP.md](./PHASE-2-SETUP.md) for the exact setup steps. The Firebase SDK is loaded only when account features are used and requires an internet connection.

The type stack prefers Gilroy when it is already installed, then falls back to Avenir Next or Helvetica Neue. No proprietary font file is bundled.

## CSV formats

Routine import accepts one row per exercise:

```csv
workout,day,exercise,sets,min_reps,max_reps,rir,load
Upper A,Monday,Barbell bench press,3,7,9,2,60
Upper A,Monday,Seated cable row,3,8,10,2,45
```

History import accepts one row per performed set:

```csv
date,workout,exercise,weight,reps,rir
2026-10-07,Upper A,Barbell bench press,57.5,8,2
2026-10-07,Upper A,Barbell bench press,57.5,8,2
```

Routine `load` and history `weight` use the unit selected during setup. The import screen includes downloadable examples.

## Phase 3 boundary

The current app is still a web app installed from the browser. It has not yet been moved to a native cross-platform iOS/Android foundation. The immediate gate is verifying that people can find their next session, log and resume without losing sets, understand the recommendation, and adapt an exercise to their available equipment. Watch support and HealthKit/Health Connect work come after that gate. Cardio tracking remains out of scope unless it supports the strength-training use case.

Google sign-in and Firestore sync remain inactive until a Firebase project is connected. See [PHASE-2-SETUP.md](./PHASE-2-SETUP.md) for the deferred setup instructions. This is not a public production launch.

The login and sign-up screens are visual previews only. Email/password details are cleared when the form is submitted and are not sent or stored. Real account creation and login require secure authentication setup first.

The app uses a transparent rules-based target adjustment. It is not MacroFactor's private algorithm, a training prescription, or a medical product.
