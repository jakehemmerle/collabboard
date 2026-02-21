---
name: emulators
description: Start Firebase emulators (Auth, Firestore, RTDB, Functions, Hosting) with health checks
disable-model-invocation: true
---

Start the Firebase emulators for CollabBoard local development.

## Current state

- Emulator ports: !`lsof -iTCP:4000 -iTCP:8080 -iTCP:9099 -iTCP:9000 -iTCP:5001 -sTCP:LISTEN -P 2>/dev/null | grep LISTEN || echo "no emulator ports in use"`
- Firebase CLI available: !`command -v firebase >/dev/null && firebase --version 2>/dev/null || echo "NOT INSTALLED"`
- Node modules installed: !`[ -d node_modules ] && echo "yes" || echo "no"`

## Steps

Work through these steps in order. Stop and report if any step fails.

### 1. Check prerequisites

- If Firebase CLI is not installed, stop and tell the user to install it (`bun install -g firebase-tools`)
- If `node_modules` is missing, run `bun install`

### 2. Check for already-running emulators

Using the port check results from above:

- **If ports 4000/8080/9099 are already in use:** Emulators are likely already running. Verify by checking if port 4000 (Emulator UI) responds with `curl -sf http://localhost:4000`. If it does, tell the user emulators are already running and stop.
- **If some emulator ports are bound but not all:** Something is partially running or another process is conflicting. Warn the user, list which ports are occupied and by what process, and ask how to proceed.

### 3. Start Firebase emulators

Run in background:

```bash
bun run emulators
```

Then poll until the Emulator UI is responding (up to 30 seconds):

```bash
for i in $(seq 1 30); do curl -sf http://localhost:4000 > /dev/null 2>&1 && break; sleep 1; done
```

If it doesn't come up in 30 seconds, show the emulator output and ask the user to investigate.

### 4. Report status

Print a summary:

```
Firebase emulators ready:
  Emulator UI:  http://localhost:4000
  Firestore:    localhost:8080
  Auth:         localhost:9099
  RTDB:         localhost:9000
  Functions:    localhost:5001
```

Include any warnings (skipped services, etc.).
