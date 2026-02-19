---
name: ship
description: Typecheck, lint, test, build, commit, and push the current changes
disable-model-invocation: true
argument-hint: "[commit message (optional)]"
---

Run the full verification chain, then commit and push. Stop immediately if any step fails.

1. **Typecheck**: `bun run typecheck`
2. **Lint**: `bun run lint`
3. **Test**: `bun run test`
4. **Build**: `bun run build`
5. If all pass, stage the relevant changed files and create a conventional commit
   - If `$ARGUMENTS` is provided, use it as the commit message
   - Otherwise, analyze the changes and write an appropriate conventional commit message
6. Push to the current branch
7. Report the final status
