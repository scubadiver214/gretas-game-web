---
agent: expert-nextjs-developer
description: 'Run a test-only Vitest coverage hardening workflow for --ui. This prompt is for test coverage-only.'
---

You are GitHub Copilot running inside VS Code for the `--ui` workspace.

This prompt defines a complete, autonomous unit-test and code-coverage hardening workflow for the Menu Admin UI project. It is for Vitest coverage only. Do not run mutation testing, Playwright, browser automation, screenshots, or the Next.js dev server unless the user explicitly asks for runtime UI verification.

You are expected to:

- run Vitest tests and coverage
- analyze the local coverage output
- add or modify tests only
- iterate once after focused improvements
- keep all changes aligned with the repo Copilot rules and the expert Next.js developer constraints

## Non-Negotiable VS Code Rules

1. Never ask the user to type "READ AGAIN".
2. Never ask for permission to reread a file needed for the work.
3. Never loop on reading files or running identical commands.
4. Never pause to ask "continue?" between batches.
5. Never invalidate previously discovered results without new evidence.
6. Progress must move forward or terminate cleanly with a concise report.
7. Do not commit, branch, stash, reset, or revert changes unless the user explicitly asks.

## Goal

Improve source coverage using tests only.

Success threshold:

- Source-only coverage is at least 80% for the selected target.

Production code must not be modified.

## Target Selection

Default target: `all`

Valid targets:

- `all`: full Vitest unit test suite
- `api`: tests and coverage focus for `src/api/**` and app route handlers under `app/api/**`
- `components`: tests and coverage focus for `src/components/**` and UI route components under `app/(admin)/**`
- `hooks`: tests and coverage focus for `src/hooks/**` and Zustand store behavior when relevant
- `utils`: tests and coverage focus for `src/utils/**`, `src/constants/**`, and small pure TypeScript modules
- `path:<glob-or-file>`: user-selected path or feature area

If the user does not specify a target, use `all` for measurement, then choose focused improvement files from the lowest-covered real source files.

## Project Rules To Obey

- Use pnpm scripts from `package.json`.
- Use Vitest and Testing Library patterns already present in the repo.
- Use `pnpm run test:run` for a single full unit-test run.
- Use `pnpm run test:coverage` for coverage.
- Do not start `pnpm dev`, `next dev`, `pnpm start`, browser automation, Playwright, screenshots, or rendered UI diagnostics.
- Do not run `pnpm run test:e2e*` unless the user explicitly asks.
- Do not hand-edit `CHANGELOG.md`, `VERSION`, generated files, `.next`, `coverage`, or `test-results` as part of coverage hardening.
- Do not add dependencies, change package manager files, or modify package scripts.
- Keep TypeScript strict: no `any`; use `import type` for type-only imports.
- Use the `@/` alias for imports from `src`.
- Keep component files under the repo's 400-line component limit.
- Preserve Server Component and Client Component boundaries.
- Do not add `'use client'` to production files; production files are out of scope.
- No hardcoded API base URLs, theme values, route contracts, query keys, storage keys, roles, permissions, or repeated domain strings in tests when an existing constant or factory represents the contract.
- For API-layer tests, validate `apiJsonFetch`, `apiFetch`, query-key factories, and shared request helpers instead of duplicating request construction logic.
- For component tests, assert accessible behavior using Testing Library queries (`getByRole`, labels, visible text, user-event) instead of implementation details.
- For MUI components, use existing provider/test wrapper patterns when required (`QueryClientProvider`, `MuiSnackbarProvider`, theme providers, session providers, etc.).
- For TanStack Query hooks/components, use a fresh `QueryClient` per test with retries disabled.
- For browser globals, use Vitest stubs and restore them in cleanup.

## Files You May Modify

You may modify only:

- `*.test.ts`
- `*.test.tsx`
- test-only helpers already used by Vitest tests
- test setup files only if a test infrastructure gap blocks meaningful tests and the change is minimal

You must not modify:

- production source files under `app/**` or `src/**` unless they are test files
- package manifests or lockfiles
- Next.js, Vitest, Playwright, ESLint, TypeScript, or build configuration
- generated files, coverage reports, snapshots, or changelog/release files

If meaningful coverage cannot be improved without changing production code or test infrastructure, stop and report the blocker instead of violating these boundaries.

## Two-Phase Model

Use two phases and do not mix them.

### Phase 1: Measure

1. Run the relevant tests and coverage.

For full measurement:

```bash
pnpm run test:coverage
```

For a focused target, first run the closest focused test command if there are existing matching tests, then run full coverage:

```bash
pnpm exec vitest run <matching-test-files>
pnpm run test:coverage
```

2. Capture the authoritative coverage report path.

The expected coverage report is:

```text
coverage/lcov.info
```

If `coverage/lcov.info` is absent after a successful coverage run, inspect the coverage directory once, capture the actual produced lcov path if present, and use that path for the rest of the workflow. Do not repeatedly rediscover paths.

3. Extract coverage results from lcov.

Compute:

- raw line coverage from all lcov records
- source-only line coverage after excluding non-source records
- top 10 lowest-covered real source files for the selected target

Exclude from source-only coverage:

- `node_modules/`
- `.next/`
- `coverage/`
- `test-results/`
- generated files (`*.generated.*`, `*.d.ts`, `src/generated/**`, generated GrowthBook output when applicable)
- config files (`next.config.*`, `vitest.config.*`, `eslint.config.*`, `postcss.config.*`, `playwright.config.*`)
- test files (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, `tests/**`)
- setup files (`vitest.setup.ts`)
- pure barrel files with no meaningful source branches

Output format per target:

```text
TARGET: <target>
Coverage report: <full path>
Raw coverage: <NN.NN%>
Source-only coverage: <NN.NN%>
Lowest-covered files:
1. <path> | <covered>/<total> | <NN.NN%>
2. <path> | <covered>/<total> | <NN.NN%>
...
10. <path> | <covered>/<total> | <NN.NN%>
```

Phase 1 rules:

- Do not recommend changes yet.
- Do not edit files yet.
- Do not run browser or E2E diagnostics.
- If coverage fails because tests fail, inspect the failure. If failures are unrelated pre-existing test failures, report them and continue only when a focused target can still be measured safely.

### Phase 2: Improve

1. Select high-value files.

Use only the Phase 1 lowest-covered real source files plus nearby existing tests. Pick 2 to 4 files with meaningful behavior:

- branches, fallback states, error states, loading states, auth/session behavior, route-handler branches, query-key behavior, request construction, validation, state transitions, sorting/filtering/pagination, or user interactions

Skip:

- DTO/type-only files
- constants-only files unless the constants encode behavior through factories
- simple barrel exports
- generated code
- visual-only branches that require browser/runtime verification outside Vitest

2. Plan minimal tests.

For each selected file, identify:

- the untested behavior
- the observable outcome that would fail if the branch were wrong
- the smallest meaningful test set needed

Keep the plan brief and then implement it.

3. Implement tests only.

Test expectations:

- Use Vitest (`describe`, `it`, `expect`, `vi`, lifecycle hooks).
- Use Testing Library and `@testing-library/user-event` for React interaction.
- Prefer behavior assertions over line execution.
- Avoid brittle snapshots unless a local file already establishes snapshot testing for that exact pattern.
- Clean up mocks, stores, timers, DOM, and browser globals after tests.
- Use accessible queries first; use test IDs only when no user-observable query is practical and an existing component already exposes them.
- Use typed fixtures/builders. Do not use `any`.
- Keep fixture data small but representative.
- Do not weaken existing assertions.
- Do not comment out or skip tests to make the suite pass.

4. Validate.

Run focused tests for files you modified:

```bash
pnpm exec vitest run <modified-test-files>
```

Then run the full unit suite:

```bash
pnpm run test:run
```

Then rerun coverage:

```bash
pnpm run test:coverage
```

Recompute the same coverage metrics from the same authoritative coverage path.

5. Iterate once.

If source-only coverage for the selected target is still below 80%, perform one additional focused improvement pass. After the second improvement pass, stop cleanly even if the threshold is not met and report remaining gaps.

## Request-Loop Guardrail

If you detect repeated identical actions (same command, same file read, same message) without new information:

- stop the repeated action immediately
- preserve current test-only changes
- proceed to the next logical phase or final report
- do not retry the same action indefinitely

## Final Report

For each target processed, report:

- tests added or modified
- coverage before and after
- biggest coverage wins
- remaining coverage risks if the threshold was not met
- commands run and whether they passed

Use concise Markdown. Include clickable workspace-relative links for changed files. Mention explicitly if runtime UI verification was skipped because it was not requested.

## Start

Begin with Phase 1 by running Vitest coverage for the selected target.
