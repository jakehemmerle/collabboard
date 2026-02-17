# CollabBoard MVP Execution Plan (Foundation-First)

**Date:** February 16, 2026  
**Scope:** Organize work from research through MVP hard-gate delivery.  
**Source alignment:** Built from decisions in `presearch.md` and tasks in `research-task-plan.md`.

## 1) Planning Model

Use three phases, in strict order:

1. `RF*` Coupled research + boilerplate foundation tracks
2. `A*` Architecture/interface contracts
3. `M*` MVP implementation slices + `G*` hard-gate E2E validation

Rule: no feature-level E2E specs (`G1-G9`) are authored until `RF*` and `A*` are complete.

## 2) Coupled Research + Boilerplate Tracks (`RF*`)

Each track is done only when both research output and repo setup are complete.

| ID | Coupled Track | Research Inputs | Boilerplate Output | Exit Criteria |
|---|---|---|---|---|
| RF1 | Workspace/toolchain foundation | `R0`, `R5` | Bun monorepo skeleton, TS base config, Biome config, root scripts | `bun run lint/typecheck/test` commands exist and execute |
| RF2 | GCP project/bootstrap foundation | `R2`, `R3` | Project naming/runbook, enabled APIs, local bootstrap checklist | Clean-machine bootstrap runbook is executable end-to-end |
| RF3 | Firebase foundation | `R4` | Auth + Firestore baseline config, emulator config, local parity checklist | Local emulator startup and cloud config both verified |
| RF4 | Infrastructure foundation | `R6` | Pulumi project layout + dev stack baseline + config policy | `pulumi preview` succeeds for dev baseline |
| RF5 | Secrets/IAM foundation | `R7` | Local env strategy + Secret Manager + least-privilege IAM mapping | Secret flow documented for local, CI, runtime |
| RF6 | CI quality-gate foundation | `R8` | GitHub Actions skeleton for lint/typecheck/unit/build | Required checks configured and running |
| RF7 | Container/local-runtime foundation | `R9` | Dockerfile(s) + compose for local services | One-command local startup path documented |
| RF8 | Testing harness foundation | `R11` | Vitest + Playwright harness + multi-context utilities + network throttle helpers | Harness runs; placeholder smoke tests pass |
| RF9 | Security/ops foundation | `R12` | Logging, monitoring, budget alert baseline checklist | Operational baseline runbook is complete |
| RF10 | Synthesis and go/no-go | `R13` | Consolidated execution DAG and dependency map | Explicit go/no-go checkpoint completed |

## 3) Foundation Gate (Must Pass Before MVP Build)

MVP implementation starts only when:

1. `RF1-RF10` are complete.
2. Local dev environment can run client, server, emulator, and tests.
3. CI baseline checks are active on main.
4. Runbooks exist for bootstrap, local run, and CI expectations.

## 4) Architecture Contracts (`A*`)

Define contracts after foundation, before feature implementation:

| ID | Task | Depends On | Output |
|---|---|---|---|
| A1 | Shared domain model contract | `RF1`, `RF8` | `packages/shared/src/types/*` for objects, presence, and auth/session |
| A2 | WebSocket protocol contract | `A1` | Event schemas for cursor, presence, mutation, ack/error, reconnect |
| A3 | Mutation layer contract | `A1`, `A2` | Pure TS mutation signatures used by WS, AI, and tests |
| A4 | Persistence boundary contract | `RF3`, `RF5`, `A3` | Firestore adapter interface + serialization + conflict metadata |
| A5 | Client state/store contract | `A1`, `A2` | Store slices/selectors for board, presence, viewport, session |
| A6 | Test fixture contract | `RF8`, `A1`, `A2` | Deterministic fixtures and helper APIs shared by E2E specs |

## 5) MVP Hard Gates (`G*`)

These remain the milestone contract, but are implemented only after `RF*` + `A*`:

| Gate | Requirement | E2E Spec ID | Pass Condition |
|---|---|---|---|
| G1 | Infinite board with pan/zoom | `e2e/mvp/pan-zoom.spec.ts` | Pan/zoom works and coordinate transforms stay correct |
| G2 | Sticky notes with editable text | `e2e/mvp/sticky-note.spec.ts` | Create/edit persists across refresh |
| G3 | At least one shape type | `e2e/mvp/shape.spec.ts` | Rectangle (or circle/line) syncs across clients |
| G4 | Create, move, and edit objects | `e2e/mvp/object-crud.spec.ts` | CRUD mutations replicate correctly |
| G5 | Real-time sync between 2+ users | `e2e/mvp/realtime-sync.spec.ts` | Mutations propagate within defined SLA |
| G6 | Multiplayer cursors with name labels | `e2e/mvp/cursors.spec.ts` | Remote cursor + label visible and updated |
| G7 | Presence awareness | `e2e/mvp/presence.spec.ts` | Online roster updates on join/leave/reconnect |
| G8 | User authentication | `e2e/mvp/auth.spec.ts` | Auth required policy enforced (anonymous/provider flow supported) |
| G9 | Deployed and publicly accessible | `e2e/mvp/smoke-prod.spec.ts` | Public URL reachable and 2-user smoke passes |

Rules:

- Tag all gate specs with `@mvp`.
- CI executes `@mvp` on main branch.
- MVP milestone is complete only when `G1-G9` all pass in CI.

## 6) MVP Implementation Slices (`M*`, Vertical Order)

| ID | Slice | Depends On | Gates Targeted |
|---|---|---|---|
| M1 | Cursor sync pipeline (client -> WS -> room broadcast -> render) | `A2`, `A5`, `A6` | `G6` |
| M2 | Presence roster + heartbeat + reconnect lifecycle | `M1` | `G7` |
| M3 | Sticky note create mutation path (authoritative server mutation) | `A3`, `A4`, `M1` | `G2`, `G4`, `G5` |
| M4 | Sticky note text edit with LWW conflict handling | `M3` | `G2`, `G4`, `G5` |
| M5 | Object move/edit operations + optimistic client flow | `M3` | `G4`, `G5` |
| M6 | First shape support (rectangle first) | `M3` | `G3`, `G4`, `G5` |
| M7 | Infinite board pan/zoom + viewport normalization | `A5`, `M3` | `G1` |
| M8 | Persistence write-through + hydration on join/refresh | `A4`, `M3` | `G2`, `G5` |
| M9 | Reconnect and out-of-order event recovery | `M8`, `M2` | `G5`, `G7` |
| M10 | Authentication enforcement end-to-end | `RF3`, `A2`, `A5` | `G8` |
| M11 | Public deployment and production smoke stability | `RF2`, `RF4`, `RF6`, `M1-M10` | `G9` |

## 7) E2E Authoring Schedule (After Foundation)

Do not write full MVP specs during foundation. Use this order after `RF*` + `A*`:

1. Author and run `G6`, `G7`, `G5` first (multiplayer core).
2. Author `G2`, `G4`, `G3`, `G1` as board capabilities land.
3. Author `G8` once auth flow is wired.
4. Author `G9` only after deployment path is stable.

This preserves your priority: sync reliability before feature breadth.

## 8) Beads Breakdown Order

Create issues in this order:

1. Create `RF1-RF10` with dependencies.
2. Execute and close `RF*` tracks.
3. Create and close `A1-A6`.
4. Create `M1-M11`.
5. Create `G1-G9` linked to relevant `M*` tasks; implement in the schedule above.

Suggested type/priority:

- `RF*`: `task`, priority `1`
- `A*`: `task`, priority `1`
- `M*`: `feature`/`task`, priority `0`
- `G*`: `task`, priority `0` (hard gate)

## 9) 24-Hour Cadence (Reordered)

1. Hours 0-8: `RF1-RF8` (research + boilerplate setup together)
2. Hours 8-10: `RF9-RF10` go/no-go
3. Hours 10-12: `A1-A6` contracts
4. Hours 12-18: `M1-M4` + gates `G6/G7/G5` and sticky-note validation
5. Hours 18-22: `M5-M10` + gates `G1/G2/G3/G4/G8`
6. Hours 22-24: `M11` + `G9` production smoke + stabilization

## 10) Definition of Done

MVP milestone is done only when:

1. `RF1-RF10`, `A1-A6`, and `M1-M11` are complete.
2. `G1-G9` all pass in CI on main.
3. Public URL is reachable and demonstrable with two concurrent users.
4. No open P0/P1 issues tagged `mvp-gate`.
5. Runbooks exist for bootstrap, local run, test, and deploy.
