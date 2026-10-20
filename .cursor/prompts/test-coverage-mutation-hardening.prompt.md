---
agent: expert-nextjs-developer
description: 'Run a test-only Vitest coverage and StrykerJS mutation hardening workflow for --ui. Use when strengthening UI unit tests with mutation testing.'
---

You are GitHub Copilot running inside VS Code for the `--ui` workspace.

This prompt defines a complete, autonomous unit-test hardening workflow for the Menu Admin UI project. It uses Vitest coverage and StrykerJS mutation testing through the installed Stryker npm package. Do not run Playwright, browser automation, screenshots, rendered UI diagnostics, `next dev`, `pnpm dev`, or other local UI dev servers unless the user explicitly asks for runtime UI verification.

You are expected to:

- run Vitest tests and coverage
- run StrykerJS mutation testing for selected source targets
- analyze coverage and mutation reports
- add or modify tests only
- iterate within the strict limits below
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

Improve UI code quality using tests only.

Hard success thresholds per selected target:

- Mutation score is at least 50%.
- Source-only line coverage is at least 80%.

Mutation score is the primary quality driver. Coverage is secondary and used for target selection only after mutation gaps are addressed.

Production code must not be modified. If meaningful mutation or coverage improvement requires production changes, package/config changes, or runtime UI verification, stop and report the blocker instead of violating these boundaries.

## Target Selection

Default target: `all`

Valid targets:

- `all`: full Vitest unit-test suite and broad mutation scan using the repo-safe mutate defaults
- `api`: `src/api/**` and app route handlers under `app/api/**`
- `components`: `src/components/**` and UI route components under `app/(admin)/**`
- `hooks`: `src/hooks/**` and Zustand store behavior when relevant
- `utils`: `src/utils/**`, `src/constants/**`, and small pure TypeScript modules
- `path:<glob-or-file>`: user-selected path or feature area

If the user does not specify a target, measure `all`, then choose focused mutation work from files with surviving mutants. If the initial mutation run would be too broad or slow, narrow to the highest-value measured coverage areas and state that scope in the final report.

## Project Rules To Obey

- Use pnpm scripts and local binaries from `package.json`.
- Use Vitest and Testing Library patterns already present in the repo.
- Use `pnpm run test:run` for a single full unit-test run.
- Use `pnpm run test:coverage` for coverage.
- Use `pnpm exec stryker run` for mutation testing when a Stryker config exists.
- The installed Stryker packages currently include the npm Stryker core plus the available local runner packages. Do not assume `@stryker-mutator/vitest-runner` is installed.
- If no Stryker config exists, run StrykerJS with CLI options or a temporary config outside tracked source when practical, using only installed Stryker capabilities. Do not run interactive Stryker initialization.
- Do not start `pnpm dev`, `next dev`, `pnpm start`, browser automation, Playwright, screenshots, or rendered UI diagnostics.
- Do not run `pnpm run test:e2e*` unless the user explicitly asks.
- Do not hand-edit `CHANGELOG.md`, `VERSION`, generated files, `.next`, `coverage`, `reports`, `.stryker-tmp`, or `test-results` as part of test hardening.
- Do not add dependencies, change package manager files, modify package scripts, or edit Next.js, Vitest, Playwright, ESLint, TypeScript, Stryker, or build configuration.
- Keep TypeScript strict: no `any`; use `import type` for type-only imports.
- Use the `@/` alias for imports from `src`.
- Keep component files under the repo's 400-line component limit.
- Preserve Server Component and Client Component boundaries.
- Do not add `'use client'` to production files; production files are out of scope.
- No hardcoded API base URLs, theme values, route contracts, query keys, storage keys, roles, permissions, statuses, or repeated domain strings in tests when an existing constant or factory represents the contract.
- For API-layer tests, validate `apiJsonFetch`, `apiFetch`, query-key factories, and shared request helpers instead of duplicating request construction logic.
- For component tests, assert accessible behavior using Testing Library queries such as `getByRole`, labels, visible text, and `user-event` instead of implementation details.
- For MUI components, use existing provider/test wrapper patterns when required, including QueryClient, snackbar, theme, and session providers.
- For TanStack Query hooks/components, use a fresh `QueryClient` per test with retries disabled.
- For browser globals, use Vitest stubs and restore them in cleanup.

## Files You May Modify

You may modify only:

- `*.test.ts`
- `*.test.tsx`
- test-only helpers already used by Vitest tests
- `vitest.setup.ts` only if a minimal test infrastructure change blocks meaningful tests

You must not modify:

- production source files under `app/**` or `src/**` unless they are test files
- package manifests or lockfiles
- Next.js, Vitest, Playwright, ESLint, TypeScript, Stryker, or build configuration
- generated files, coverage reports, mutation reports, snapshots, changelog, or release files

If a temporary Stryker config is needed, keep it outside tracked project source or remove it before finishing. Never commit it as part of this workflow.

## StrykerJS Execution Guidance

Prefer an existing checked-in Stryker config if present. If none exists, use a non-interactive command that targets the selected source glob and runs the unit test command through an installed Stryker runner capability.

Repo-safe mutate defaults:

- Include behavior-bearing source files under the selected target.
- Exclude `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, `tests/**`, `*.d.ts`, generated files, config files, and pure barrels.
- Avoid mutating large visual-only React trees when the resulting assertions would require runtime UI diagnostics outside Vitest.

Recommended Stryker settings when no config is available:

- test runner: an installed runner capability that can execute the repo's unit test command
- coverage analysis: `off` unless a local config proves another mode is stable
- reporters: clear text plus JSON
- timeout values: keep defaults unless tests are known to need a modest increase

If installed Stryker capabilities cannot run this Vitest project non-interactively, stop and report the blocker. Do not add `@stryker-mutator/vitest-runner`, `@stryker-mutator/command-runner`, or any other package. Use only installed packages.

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
- `reports/`
- `.stryker-tmp/`
- `test-results/`
- generated files (`*.generated.*`, `*.d.ts`, `src/generated/**`, generated GrowthBook output when applicable)
- config files (`next.config.*`, `vitest.config.*`, `eslint.config.*`, `postcss.config.*`, `playwright.config.*`, `stryker.config.*`)
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

4. Run StrykerJS mutation testing.

Use an existing Stryker config if available:

```bash
pnpm exec stryker run
```

If no config exists, run a focused non-interactive mutation command or temporary config using the selected target's mutate globs and Vitest command runner. Do not use an interactive initializer. Do not modify tracked config files.

5. Capture the authoritative mutation JSON report path.

Search mutation output once for a JSON report such as `mutation-report.json`. Capture the exact path and treat it as authoritative for the rest of the workflow. Do not repeatedly rediscover or reread report paths.

6. Extract only actionable mutants.

Include only:

- `Survived`
- `NoCoverage`

Ignore killed, timed-out, ignored, compile-error, and runtime-error mutants unless they indicate a test infrastructure blocker.

Phase 1 rules:

- Do not recommend changes until both coverage and mutation data have been captured or a blocker is clear.
- Do not edit files yet.
- Do not run browser or E2E diagnostics.
- If coverage or mutation fails because tests fail, inspect the failure. If failures are unrelated pre-existing test failures, report them and continue only when a focused target can still be measured safely.

### Phase 2: Improve

1. Select mutation-first targets.

Select 2 to 4 files per pass, in this order:

- files with the highest count of `Survived` mutants
- branches producing multiple mutant types
- state transitions, validation, sorting/filtering/pagination, auth/session behavior, route-handler branches, query-key behavior, request construction, fallback/error/loading states, and user interactions
- `NoCoverage` mutants that block mutation score gains
- only after mutation score is at least 50%, lowest source-only coverage files with meaningful behavior

Coverage is a tiebreaker only while mutation score is below 50%.

Skip:

- DTO/type-only files
- constants-only files unless constants encode behavior through factories
- simple barrel exports
- generated code
- visual-only branches that require browser/runtime verification outside Vitest

2. Plan mutation-killing tests.

For each selected mutant, identify:

- the mutated behavior
- the observable outcome that must differ if the mutation is present
- the assertion that definitively kills the mutant
- the smallest meaningful test needed

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
- Do not comment out, skip, or delete tests to make the suite pass.
- Every new or changed test must kill at least one `Survived` mutant or directly remove a `NoCoverage` mutant until mutation score reaches 50%.

4. Validate.

Run focused tests for files you modified:

```bash
pnpm exec vitest run <modified-test-files>
```

Then run the full unit suite:

```bash
pnpm run test:run
```

Then rerun mutation testing before coverage:

```bash
pnpm exec stryker run
pnpm run test:coverage
```

When using a focused no-config Stryker command, rerun the same mutation command captured in Phase 1. Recompute the same mutation and coverage metrics from the authoritative report paths when possible.

5. Iterate within strict limits.

If mutation score is below 50%, perform exactly one additional mutation-focused pass.

If mutation score is at least 50% but source-only coverage is below 80%, perform exactly one additional coverage-focused pass.

After the allowed passes, stop cleanly even if thresholds are not met and report remaining gaps.

## Request-Loop Guardrail

If you detect repeated identical actions (same command, same file read, same message) without new information:

- stop the repeated action immediately
- preserve current test-only changes
- proceed to the next logical phase or final report
- do not retry the same action indefinitely

## Final Report

For each target processed, report:

- tests added or modified
- surviving and no-coverage mutants before and after
- mutation score before and after
- source-only coverage before and after
- biggest mutation kills or coverage wins
- remaining risks if thresholds were not met
- commands run and whether they passed

Use concise Markdown. Include clickable workspace-relative links for changed files. Mention explicitly if runtime UI verification was skipped because it was not requested.

## Start

Begin with Phase 1 by running Vitest coverage for the selected target, then run StrykerJS mutation testing for the same target.
