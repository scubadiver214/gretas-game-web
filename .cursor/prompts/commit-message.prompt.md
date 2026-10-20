---
agent: expert-nextjs-developer
description: Generate a detailed commit message body for --ui changes
---

TASK
Generate a detailed git commit message body (NO subject line) for the `--ui` repository, based strictly on the current diff evidence.

REPOSITORY CONTEXT

- Work from the `--ui` workspace root.
- Treat this as a Next.js 16 App Router UI project using React 19, TypeScript, MUI v7, Tailwind CSS v4, TanStack Query, Zustand, NextAuth.js v4, Vitest, Playwright, pnpm, and Changie.
- Report file paths relative to `--ui` only. Do not include sibling workspace paths such as `--api` unless those files are actually part of the analyzed diff and explicitly relevant.
- Preserve this repo's conventions in the summary language:
  - API-layer client requests use `apiJsonFetch` / `apiFetch` from `src/api/shared/api.ts`.
  - Server Components, Server Actions, route handlers, and TanStack Query hooks should be described distinctly when they change.
  - App Router route files live under `app/`; dashboard UI lives under `src/components/app/`; shared client/server API helpers live under `src/api/`.
  - Versioning uses committed `VERSION` plus generated `src/generated/appVersion.ts`; normal PR changes should use `.changes/unreleased/*.yaml` fragments instead of manual `CHANGELOG.md` or `VERSION` edits.

BRANCH MODE

- If CURRENT BRANCH is not `main`: analyze changes vs `origin/main` when available; otherwise use local `main`.
- If CURRENT BRANCH is `main`: analyze currently changed files in the working tree/index (diff vs `HEAD`).

If you cannot access the required diff source for the active branch mode, respond exactly: "Unable to access diff vs main; cannot generate reliable commit body."
If CURRENT BRANCH is not `main` and no files differ from main, output exactly: "No changes detected vs main." and stop.
If CURRENT BRANCH is `main` and no files differ from `HEAD`, output exactly: "No local changes detected on main." and stop.

PRIMARY GOALS

1. Use the correct source of truth by branch mode.
   - Non-`main`: branch-vs-main diff.
   - `main`: local changed-files diff vs `HEAD`.
   - Evidence priority: diff > changed-file comments > branch name.
   - Do not consult commit history unless explicitly provided.
2. Produce a commit message body that is:
   - Clear, scoped, and review-friendly.
   - Explicit about what changed and why, only when supported by the diff.
   - Helpful for future debugging by naming key routes, components, API modules, tests, or config files that actually changed.
   - Specific to UI behavior, data fetching, auth/session behavior, routing, styling, tooling, tests, or release metadata as applicable.
3. Output two parts only:
   - First, list changed files using branch mode (paths only).
   - Second, output the commit message body (multi-line) with no subject line.

PROCESS (DO NOT SKIP)

Use two phases:

- Phase 1 (analysis): extract structured findings from evidence.
- Phase 2 (rendering): convert findings into the final output format.

A) Collect change context

1. Identify all changed files using branch mode:
   - Non-`main`: changed files vs main.
   - `main`: changed files vs `HEAD` (working tree/index).
2. For each changed file, review all relevant diff hunks. Ignore only pure formatting-only hunks (whitespace/import ordering) unless they change behavior. Extract:
   - What behavior changed (added/modified/removed)?
   - Where did it change (route, component, hook, API module, provider, middleware, config, script, test)?
   - Why (only if the diff/comments/names clearly indicate intent)?
   - Any UI-visible behavior, navigation, loading/error state, auth/session, feature-flag, or accessibility change?
   - Any data-fetching or contract change (backend proxy route, DTO/type, request path, query key, cache invalidation, env/config key)?
   - Any styling/theme changes, especially use of MUI theme tokens or Tailwind/CSS variables?
   - Any tests added/updated and what they cover (Vitest, Testing Library, Playwright, proxy tests, scripts)?
   - Any dependency, package-manager, build, lint, changelog, versioning, or CI changes?

B) Group changes into 1-6 logical buckets. Use 1 bucket if all changes belong to a single area.

Recommended bucket names for this repo include:

- App Router
- Dashboard UI
- API layer
- Auth/session
- State/query caching
- Styling/theme
- Tests
- Tooling/build
- Release metadata
- Documentation

Each bucket must map to at least one changed file.

C) Draft the commit message body

- Start with 1-2 factual sentences: problem/context -> change -> outcome. Only include the problem/why when supported by the diff.
- Then a `Key changes:` section with bullets grouped by bucket.
- Then a `Testing:` section:
  - Include test files changed and what they cover.
  - Include relevant repo commands only when supported by changed scripts/config or obvious from changed test files, such as `pnpm run test:run`, `pnpm run test:coverage`, `pnpm run lint`, `pnpm run format:check`, `pnpm run build`, or `pnpm run knip`.
  - Do not claim that commands were run unless evidence is explicitly provided.
  - Do not recommend starting `pnpm run dev`, browser automation, screenshots, or rendered UI diagnostics unless the diff itself adds/changes that runtime UI verification path.
  - If not indicated by the diff, say: "Not indicated by diff."
- Then a `Notes/Risks:` section:
  - Include compatibility, migration, auth, rollout, env-var, backend-contract, feature-flag, or release/changelog notes only if implied by changes.
  - Call out missing or unusual `.changes/unreleased/*.yaml`, `CHANGELOG.md`, or `VERSION` edits only when release metadata changes are relevant to the diff.
  - If diff content is truncated or incomplete, include: "Diff appears incomplete; summary may be partial".
- Optionally include `Refs:` ONLY if refs appear in diff, changed-file comments, or provided branch metadata. Do not invent refs.
- Use concise, technical language. Avoid fluff.

STYLE OPTIONS (PICK ONE AND STICK TO IT)

- Default: standard git commit message body.
- Do not use Conventional Commit headers. If branch metadata or local conventions use Conventional Commits, only mirror terminology in section labels and bullet wording within the body.
- If commit history or branch metadata is unavailable, use the default style and omit Refs.

HARD RULES

- Do not invent intent, requirements, ticket numbers, tests run, screenshots, or outcomes not supported by the diff.
- If purpose is unclear, phrase carefully and keep it factual.
- Mention files/classes/components/hooks/routes only when they are in the diff.
- Do not include a subject line, header line, or `Subject:` label.
- Do not use generated or coverage output directories as evidence unless the diff changes committed project files there.
- Do not summarize unrelated sibling-repo changes while operating in `--ui` context.

OUTPUT FORMAT (USE THIS STRUCTURE)

Changed files:

- <path>

<paragraph(s)>

Key changes:

- <bucket>: <change summary tied to changed file(s)>
- <bucket>: <change summary tied to changed file(s)>

Testing:

- <what changed or what the diff indicates to run>

Notes/Risks:

- <as implied by diff>

[Optional]
Refs: <include only if applicable>

NOW DO IT

1. Confirm you are operating in `--ui`.
2. Detect whether CURRENT BRANCH is `main`.
3. List the changed files using branch mode (paths only, relative to `--ui`).
4. Then output the commit message body in the format above (no subject line).
