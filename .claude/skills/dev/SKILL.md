---
name: dev
description: Spin up the local dev environment (Firebase emulators + Vite dev server) with health checks
disable-model-invocation: true
---

Start the CollabBoard local development environment. Handle all edge cases gracefully.

## Current state

- Emulator ports: !`lsof -iTCP:4000 -iTCP:8080 -iTCP:9099 -iTCP:9000 -iTCP:5001 -sTCP:LISTEN -P 2>/dev/null | grep LISTEN || echo "no emulator ports in use"`
- Vite dev server port: !`lsof -iTCP:5173 -sTCP:LISTEN -P 2>/dev/null | grep LISTEN || echo "port 5173 free"`
- Node modules installed: !`[ -d node_modules ] && [ -d apps/web/node_modules ] && echo "yes" || echo "no"`
- .env file exists: !`[ -f apps/web/.env ] && echo "yes" || echo "missing"`
- Bun available: !`command -v bun >/dev/null && bun --version || echo "NOT INSTALLED"`
- Firebase CLI available: !`command -v firebase >/dev/null && firebase --version 2>/dev/null || echo "NOT INSTALLED"`

## Steps

Work through these steps in order. Stop and report if any step fails.

### 1. Check prerequisites

- If Bun is not installed, stop and tell the user to install it
- If Firebase CLI is not installed, stop and tell the user to install it (`bun install -g firebase-tools`)
- If `node_modules` or `apps/web/node_modules` is missing, run `bun install`
- If `apps/web/.env` is missing, copy from `apps/web/.env.example` and warn the user they may need to update values

### 2. Check for already-running services

Using the port check results from above:

- **If ports 4000/8080/9099 are already in use:** Emulators are likely already running. Tell the user and skip starting them. Verify by checking if port 4000 (Emulator UI) responds.
- **If port 5173 is already in use:** Vite dev server is likely already running. Tell the user and skip starting it.
- **If some emulator ports are bound but not all:** Something is partially running or another process is conflicting. Warn the user, list which ports are occupied and by what process, and ask how to proceed before doing anything.

### 3. Start Firebase emulators (if not already running)

Run in background:

```bash
bun run emulators
```

Then poll until the Emulator UI is responding (up to 30 seconds):

```bash
for i in $(seq 1 30); do curl -sf http://localhost:4000 > /dev/null 2>&1 && break; sleep 1; done
```

If it doesn't come up in 30 seconds, show the emulator output and ask the user to investigate.

### 4. Start Vite dev server (if not already running)

Run in background:

```bash
bun run dev
```

Then poll until port 5173 is responding (up to 15 seconds):

```bash
for i in $(seq 1 15); do curl -sf http://localhost:5173 > /dev/null 2>&1 && break; sleep 1; done
```

### 5. Report status

Print a summary:

```
Dev environment ready:
  App:          http://localhost:5173
  Emulator UI:  http://localhost:4000
  Firestore:    localhost:8080
  Auth:         localhost:9099
  RTDB:         localhost:9000
  Functions:    localhost:5001
```

Include any warnings (skipped services, .env copied from example, etc.).
