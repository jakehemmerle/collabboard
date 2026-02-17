# CollabBoard Research Task Plan (Boilerplate Foundation)

**Date:** February 16, 2026  
**Purpose:** Define the research work needed to produce an implementation-ready plan.  
**Scope:** Boilerplate and platform setup research only (no feature-level implementation tasks yet).

## Output We Want

A single implementation plan document that is actionable, sequenced, and grounded in official documentation for the selected stack.

Companion artifact for execution sequencing:

- `implementation-task-plan.md` (maps research outputs to architecture contracts, scaffold tasks, MVP implementation slices, and hard-gate E2E requirements)

## Research Rules

- Use official docs as primary sources (Bun, Google Cloud, Firebase, Pulumi, React, Konva, GitHub).
- Capture citations for every major recommendation.
- Record decisions, alternatives considered, and why they were rejected.
- Prefer reproducible runbooks/checklists over narrative prose.

## Task List

| ID | Research Task | Acceptance Criteria | Expected Output |
|---|---|---|---|
| R0 | Define research template + citation format | Template includes: question, source links, recommendation, tradeoffs, decision status | `docs/research/template.md` |
| R1 | Stack inventory + missing framework discovery | Full inventory extracted from `presearch.md` plus missing items; each item tagged `required`, `optional`, or `defer` | `docs/research/stack-inventory.md` |
| R2 | GCP abstraction/isolation model research | Defines recommended isolation approach across Org/Folder/Project levels for current and future projects | `docs/research/gcp-isolation-model.md` |
| R3 | GCP CLI/bootstrap + new project creation research | Clean-machine runbook for auth, naming convention + project ID format, project creation, billing linkage, API enablement, and verification commands | `docs/research/gcp-bootstrap.md` |
| R4 | Firebase setup research (local + cloud) | Documented baseline for Auth, Firestore, Hosting, and Emulator Suite with local/cloud parity checklist | `docs/research/firebase-foundation.md` |
| R5 | Bun monorepo/bootstrap research | Reproducible setup flow for Bun workspace, TS config, scripts, and local dev commands | `docs/research/bun-bootstrap.md` |
| R6 | Pulumi foundation research for GCP | Recommended Pulumi project structure, stack strategy, config layout, and state backend approach | `docs/research/pulumi-foundation.md` |
| R7 | Secrets management research | Defines secret strategy for local dev + CI + GCP runtime using Secret Manager and least-privilege IAM | `docs/research/secrets-management.md` |
| R8 | CI quality gate research (GitHub Actions) | Defined pipeline stages for lint/typecheck/test/build with caching and required checks | `docs/research/ci-pipeline.md` |
| R9 | Containerization research | Agreed Docker strategy (build, local dev, artifact structure), plus image versioning/tagging rules | `docs/research/container-strategy.md` |
| R11 | Boilerplate testing strategy research | Testing matrix for baseline unit/integration/e2e flows, emulator usage, and CI enforcement | `docs/research/testing-strategy.md` |
| R12 | Security/ops baseline research | Baseline for IAM, logging/monitoring, budgets/cost alerts, and operational visibility | `docs/research/security-ops-baseline.md` |
| R13 | Synthesis: implementation plan generation | Consolidates all accepted research outputs into one phased build plan with dependencies and milestones | `docs/implementation-plan-v1.md` |

`R10` is intentionally removed for this phase (feature/backend research deferred).

## Proposed Execution Order

1. Start: `R0`, `R1`
2. Platform isolation/bootstrap: `R2`, `R3`, `R4`, `R5`, `R6`, `R7`
3. Delivery baseline: `R8`, `R9`, `R11`
4. Ops baseline: `R12`
5. Final synthesis: `R13`

## Parallelization Groups (for later `br` breakdown)

- Group A: `R2`, `R3`, `R7`
- Group B: `R4`, `R5`, `R6`
- Group C: `R8`, `R9`, `R11`, `R12`
- Group D: `R13` (after all prior tasks complete)

## Candidate “Missing Frameworks/Products” to Validate in R1

- Artifact Registry (image storage)
- Workload Identity Federation for GitHub Actions -> GCP auth
- Secret Manager
- Cloud Logging/Error Reporting/Monitoring
- Firebase Emulator Suite in CI
- Optional: Terraform parity check (decision guardrail only, no migration work)
