# CollabBoard

Real-time collaborative whiteboard built with React, Konva.js, and Firebase.

## Prerequisites

- [Bun](https://bun.sh/) >= 1.3
- [Node.js](https://nodejs.org/) >= 20
- [Firebase CLI](https://firebase.google.com/docs/cli) (`bun install -g firebase-tools`)
- [Docker](https://www.docker.com/) (optional, for containerized dev)

## Quick Start

```bash
# Install dependencies
bun install

# Copy env config
cp apps/web/.env.example apps/web/.env
# Then fill in your Firebase project values in apps/web/.env

# Start the dev server
bun run dev
```

The app will be available at `http://localhost:5173`.

## Firebase Emulators

The project uses Firebase emulators for local development (Auth, Firestore, Realtime Database).

### First-time setup

```bash
# Login to Firebase CLI (needed once)
firebase login

# Start all emulators
bun run emulators
```

### Emulator ports

| Service        | Port  | UI URL                          |
|----------------|-------|---------------------------------|
| Auth           | 9099  | http://localhost:4000/auth      |
| Firestore      | 8080  | http://localhost:4000/firestore |
| Realtime DB    | 9000  | http://localhost:4000/database  |
| Hosting        | 5050  | —                               |
| Emulator UI    | 4000  | http://localhost:4000           |

### Running dev server + emulators together

Open two terminals:

```bash
# Terminal 1: Firebase emulators
bun run emulators

# Terminal 2: Vite dev server
bun run dev
```

The app at `http://localhost:5173` will connect to emulators when `VITE_USE_EMULATORS=true` is set in `apps/web/.env`.

### Exporting emulator data

```bash
bun run emulators:export
```

This saves emulator state to `firebase/emulator-data/` for reuse across sessions.

## Docker

```bash
# Build and run the app container
docker compose up --build
```

This starts the web app at `http://localhost:3000`.

## Scripts

| Command             | Description                          |
|---------------------|--------------------------------------|
| `bun run dev`       | Start Vite dev server                |
| `bun run build`     | Typecheck + production build         |
| `bun run typecheck` | Run TypeScript type checking         |
| `bun run lint`      | Run ESLint                           |
| `bun run emulators` | Start Firebase emulators             |

## Project Structure

```
collabboard/
  apps/web/           # React + Vite app
    src/
      app/            # App shell, routing, composition root
      core/           # Module system, env, IDs, events
      modules/        # Domain modules (auth, viewport, sync, etc.)
      shared/         # Shared UI, hooks, utilities
  firebase/           # Firebase config, rules, emulator settings
  .github/workflows/  # CI pipeline
```
