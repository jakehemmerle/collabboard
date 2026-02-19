---
name: review
description: Review current branch changes against main
disable-model-invocation: true
argument-hint: "[focus area (optional)]"
---

Review all changes on the current branch compared to main. Stop and report findings before making any fixes.

1. Run `git diff main...HEAD` to see all changes
2. Run `git log main..HEAD --oneline` to understand the commit history
3. Review the diff for:
   - Type safety issues
   - Bugs or logic errors
   - Security concerns (injection, leaked secrets, OWASP top 10)
   - Unnecessary abstractions or over-engineering
   - Convention violations relative to the rest of the codebase
4. If `$ARGUMENTS` is provided, pay special attention to that area
5. List findings grouped by severity:
   - **Critical** — bugs, security issues, data loss risks
   - **Warning** — code smells, potential issues, missing edge cases
   - **Nit** — style, naming, minor improvements
6. Ask whether to fix the critical and warning items
7. After fixes, run `bun run typecheck && bun run lint && bun run test` to verify nothing broke
