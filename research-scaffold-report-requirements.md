# CollabBoard Research + Scaffold Report Requirements

**Date:** February 16, 2026  
**Purpose:** Define the exact requirements for a separate deep-research agent to produce implementation-ready research reports and scaffold instructions.  
**Important:** This document defines requirements only. It is not the research output.

## 1) Mission

Produce a complete set of research reports that gives engineering everything needed to lay boilerplate/foundation code for CollabBoard before feature implementation starts.

The reports must cover:

1. Core concepts for each selected tool/framework/product/component.
2. Current best practices for setup and usage.
3. Concrete foundation instructions for this repo (commands, file structure, configs, verification).

## 2) Scope and Priorities

### In Scope

- Research + boilerplate foundation only.
- Local dev setup, CI baseline, project bootstrap, emulator/runtime setup.
- Dependency-aware execution order.
- Tool installation detection and install/remediation paths.

### Out of Scope (for this phase)

- Feature implementation details (sticky notes, shapes, object sync logic).
- Security/ops hardening deep dive (explicitly deferred for now).
- AI feature implementation details beyond foundation placeholders.

## 3) Required Research Standards

### Source Policy

- Use official vendor documentation as primary sources.
- Use release notes/changelogs for version-sensitive claims.
- Use community sources only as secondary context and clearly mark them.

### Freshness Policy

- Validate all version/tooling guidance as current as of research date.
- Include “verified on” date per report.
- Flag any section that cannot be confidently verified as `Needs Validation`.

### Evidence Policy

- Every major recommendation must include citation links.
- Distinguish facts vs recommendations vs team decisions.
- Record rejected alternatives with rationale.

## 4) Output Package (What the Research Agent Must Deliver)

Create these files:

1. `docs/research/template.md`
2. `docs/research/stack-inventory.md`
3. `docs/research/bun-bootstrap.md`
4. `docs/research/react-vite-client-foundation.md`
5. `docs/research/konva-canvas-foundation.md`
6. `docs/research/server-websocket-foundation.md`
7. `docs/research/firebase-foundation.md`
8. `docs/research/gcp-bootstrap.md`
9. `docs/research/pulumi-foundation.md`
10. `docs/research/testing-foundation.md`
11. `docs/research/ci-foundation.md`
12. `docs/research/container-foundation.md`
13. `docs/research/scaffold-execution-plan.md`
14. `docs/research/boilerplate-acceptance-checklist.md`

## 5) Required Report Template (Mandatory Sections)

Every report must include these sections:

1. `Objective`
2. `Core Concepts`  
3. `Recommended Approach`
4. `Best Practices`
5. `Installation + Version Policy`
6. `Bootstrap Instructions (Repo-Specific)`
7. `Verification Commands`
8. `Common Failure Modes + Fixes`
9. `Alternatives Considered`
10. `Decision Summary`
11. `Citations`
12. `Verified On (YYYY-MM-DD)`

## 6) Tool/Component Coverage Matrix

The research package must include, at minimum, these components:

1. Bun runtime + workspaces
2. TypeScript project references/base config
3. Biome lint/format baseline
4. React + Vite client app foundation
5. Konva + react-konva canvas baseline
6. Zustand state-store baseline strategy
7. Bun WebSocket server baseline
8. Shared package (`packages/shared`) with Zod schema validation
9. Firebase Auth + Firestore + Emulator Suite
10. GCP project bootstrap + API enablement
11. Pulumi foundation for infrastructure scaffolding
12. Docker/Docker Compose for local reproducibility
13. Vitest + Playwright (multi-context) test harness baseline
14. GitHub Actions baseline quality gates

## 7) Required “Core Concepts” Content

For each component in the matrix, the report must explain:

1. What it is and what role it serves in CollabBoard.
2. The minimum architectural concepts engineers must understand.
3. Common pitfalls for this stack.
4. Constraints/tradeoffs relevant to multiplayer whiteboard foundations.

## 8) Required “Best Practices” Content

For each component, include:

1. Project structure conventions.
2. Config defaults recommended for this project size/stage.
3. Local dev and CI usage patterns.
4. Pinning/versioning strategy.
5. Performance/reliability considerations at boilerplate stage.

## 9) Required Foundation/Scaffold Instructions

For each component, include repo-specific setup instructions:

1. Exact commands to initialize/install.
2. Exact files to create/update.
3. Expected folder structure after setup.
4. Minimal runnable example/smoke check.
5. Roll-forward guidance when setup fails.

## 10) Tool Installation + Preflight Requirements

Research output must provide an executable preflight strategy:

1. A table of required tools with:
   - detection command
   - minimum/target version
   - install command(s) by OS
   - verification command
2. A bootstrap flow:
   - if installed and version OK -> continue
   - if missing/outdated -> install/upgrade path
   - re-verify before proceeding
3. CI compatibility notes for each required tool.

Minimum tool list to cover:

- `bun`
- `node` (if required by specific tooling)
- `npm`/`pnpm` usage policy (if any)
- `gcloud`
- `firebase`
- `pulumi`
- `docker` + `docker compose`
- `git`

## 11) Required Scaffold Execution Plan

`docs/research/scaffold-execution-plan.md` must include:

1. Dependency graph from research outputs -> scaffold tasks.
2. Ordered phases:
   - Phase A: toolchain + workspace foundation
   - Phase B: cloud/foundation wiring
   - Phase C: test/CI/container baseline
3. Task-level acceptance criteria for each scaffold action.
4. Parallelization opportunities and blockers.
5. Explicit “stop/go” checkpoints between phases.

## 12) Boilerplate Acceptance Checklist Requirements

`docs/research/boilerplate-acceptance-checklist.md` must define pass/fail checks for:

1. Workspace compiles.
2. Lint + format passes.
3. Unit test harness runs.
4. Playwright harness runs multi-context smoke.
5. Local emulator stack starts.
6. Client and server both start locally.
7. CI baseline pipeline passes on a clean checkout.

## 13) Research-to-Scaffold Traceability Requirements

Every scaffold recommendation must trace back to:

1. A specific citation.
2. A specific decision statement.
3. A specific acceptance check.

No untraceable setup steps are allowed.

## 14) Quality Bar for Handoff

The research package is acceptable only if:

1. Another engineer can execute the scaffold from a clean machine with no tribal knowledge.
2. All required commands are explicit and testable.
3. All decisions are justified with current citations.
4. Deferred items are clearly labeled with reason and impact.

## 15) Open Questions to Resolve Before Running Deep Research

1. Should the report standardize on one local OS first (macOS-only) or require macOS + Linux parity from day one?
2. Do you want anonymous Firebase auth enabled in foundation by default, or documented as an optional toggle?
3. Should Pulumi be mandatory for initial scaffold, or allow a Firebase CLI fallback if Pulumi setup blocks day-1 progress?
4. Do you want the research outputs to include exact pinned versions, or “latest stable at runtime” with lockfile capture?
5. Should the deep-research agent include skeleton file contents, or only command-level instructions and structure?
