# FORM Training

FORM is a dark, local-first strength training app built with the Next.js App Router. It includes workout planning, set logging, progression explanations, history, and login/sign-up screen previews.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:3000` in a browser. The first-launch welcome screen offers account page previews or local use. The archived Phase 0 design is available at `/prototype`.

## Checks

```sh
npm test
npm run build
```

## Project folders

- `app/` — Next.js App Router pages and global styling.
- `public/form/` — browser-side workout app and its local-first progression modules.
- `public/prototype/` — archived Phase 0 design prototype.
- `docs/` — phase plans, setup instructions, and testing checklist.
- `tests/` — progression logic tests.

Authentication and cloud sync are not connected. The login and sign-up screens are previews; their email fields are not sent or stored. Workout data remains in the browser on the current device.
