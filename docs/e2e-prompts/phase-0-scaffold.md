# Phase 0 E2E Tests: Project Scaffold

Follow the instructions in `_preamble.md` to bootstrap the environment.

Phase 0 is about verifying the project scaffolding works correctly. No browser
interaction with the app itself is required beyond confirming it loads.

---

## Tests

### Test 0.1: CLI Tool Versions
Run the following commands and verify they produce valid version output:
- `bun --version` — expect 1.x (>= 1.3)
- `node --version` — expect v20.x or higher
- `firebase --version` — expect a version string
- `docker --version` — expect a version string
- `docker compose version` — expect a version string
- `git --version` — expect a version string

**Pass criteria:** All commands exit 0 and print reasonable version numbers.

### Test 0.2: Dependency Installation
Run `bun install` from the repo root.

**Pass criteria:** Exit code 0, no unresolved peer dependency errors.

### Test 0.3: TypeScript Type Check
Run `bun run typecheck`.

**Pass criteria:** Exit code 0, no type errors.

### Test 0.4: Production Build
Run `bun run build`.

**Pass criteria:** Exit code 0, `apps/web/dist/` directory is created with
`index.html` and JS/CSS assets.

### Test 0.5: ESLint
Run `bun run lint`.

**Pass criteria:** Exit code 0 or only warnings (no errors).

### Test 0.6: Firebase Emulators Start
Start Firebase emulators with `bun run emulators`. Wait up to 30 seconds.

**Pass criteria:** Console output shows:
- "Auth Emulator" listening on port 9099
- "Firestore Emulator" listening on port 8080
- "Database Emulator" listening on port 9000
- Emulator UI accessible at http://localhost:4000

### Test 0.7: App Loads in Browser
With emulators and dev server running, open a browser to `http://localhost:5173`.

**Pass criteria:** The page loads without a blank screen or JS errors in the console.
You should see UI content (at minimum a sign-in page or the app shell).

### Test 0.8: Docker Build (if Docker is available)
Run `docker compose up --build` and wait for it to start.

**Pass criteria:** Container starts, app responds on `http://localhost:3000`.
If Docker is not available, mark this test as SKIPPED.
