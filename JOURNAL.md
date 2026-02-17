# Journal

## E2E test prompt generation

I wanted ot use claude code with the browser to automate the e2e testing after each phase completes. It has cooked through the first few properly so far, we are through 3 now. Use `claude --dangerously-skip-permissions --chrome`

```
I want you to read the @docs/onboard.md document and look at the PLAN_CODEX.md in particular. Then I want you to create a series of prompt files. At the end of each phase, a Claude Code instance connected to the browser would go through the startup and the emulators, and configure the local environments to be ready to do an end-to-end test of the application. Then proceed with end-to-end testing the application via browser automation. I want you to propose the set of end-to-end tests as a prompt that Claude Code should execute after each of the phases to confirm the features are implemented correctly.

...

great job. save these individual files in the docs folder
```
