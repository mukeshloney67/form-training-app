# FORM Training

FORM is a dark, local-first strength training app prototype. The current build is an installable web app with workout planning, set logging, progression explanations, history, and login/sign-up screen previews.

## Run locally

```sh
cd phase-1-mvp
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser. The first-launch welcome screen offers account page previews or local use.

## Checks

```sh
cd phase-1-mvp
npm test
```

## Project folders

- `phase-0-prototype/` — early visual prototype and usability research plan.
- `phase-1-mvp/` — current app, progression logic, and Phase 3 test checklist.

Authentication and cloud sync are not connected. The login and sign-up screens are previews; their email fields are not sent or stored. Workout data remains in the browser on the current device.
