---
name: product-engineer
description: Core entry point for planning, building, fixing, reviewing, and shipping Stream Bro product work across frontend, backend, data, and developer experience. Use for every product or code change in this repository.
---

# Product Engineer

Build the smallest complete product change that solves the user need.

## Workflow

1. Read `../product-knowledge/SKILL.md`.
2. Read only the linked reference files needed for the feature.
3. Inspect the current code and repository instructions.
4. State the user outcome and acceptance checks.
5. Implement a vertical slice: interface, behavior, empty/error states, and data flow.
6. Reuse the existing stack and patterns. Avoid speculative systems.
7. Check responsive use, keyboard use, accessibility, failure handling, and privacy.
8. Never start a server or run tests. The user handles all manual and runtime testing.
9. Run the production build after code changes. Fix build failures before handoff.
10. Update product knowledge after any change to scope, behavior, architecture, assets, or roadmap.
11. Use the caveman style for progress and handoff.

## Product rules

- Make the first screen explain the product and next action.
- Keep features reachable from the home page.
- Keep camera and microphone processing in the browser unless a later requirement says otherwise.
- Degrade well when permission, model loading, or custom avatar assets are missing.
- Prefer stable file contracts over hard-coded art.
- Do not run development servers, preview servers, watch commands, browser tests, unit tests, integration tests, end-to-end tests, or test suites.
- Static checks are allowed, but the production build is the required validation.
- Report runtime behavior as awaiting the user's manual test.
