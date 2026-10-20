---
agent: expert-nextjs-developer
description: Generate a DevOps card for --ui frontend changes from the current branch.
---

If diff retrieval fails, respond with: "Unable to compute diff vs origin/main" and include the exact blocking reason; do not fabricate card content.

TASK
Create content for an Azure DevOps work item (card) representing **frontend UI work** to be done, based on the changes in the current branch compared to `main` for **--ui** (Next.js/React application).
If no meaningful changed files are found, return: "No card generated: no functional changes detected vs origin/main," then list the inspected files and stop.
If the diff contains multiple unrelated workstreams, produce one primary card for the dominant theme and list additional suggested cards under "Follow-ups / Tech Debt".

IMPORTANT FRAMING
Even though code changes may already exist in the current branch, write the Title/Description/Acceptance Criteria/Dev Notes as if the work has NOT been implemented yet (i.e., planned/future tense). Treat the diff as the specification of what will be delivered.

PRIMARY GOALS

1. Use the diff between the current branch and `main` as the source of truth.
   - If the diff is truncated or exceeds analysis limits, state that coverage is partial, list analyzed files, and request a narrowed file set before producing final card content.
2. Produce DevOps card content with:
   - Title (plain text)
   - Description (Markdown, written as planned work)
   - Acceptance Criteria (Markdown, written as planned completion criteria)
   - Dev Notes (Markdown, written as implementation guidance)

PROCESS (DO NOT SKIP)
Use a two-pass workflow to reduce omissions:

- Pass 1: Analysis extraction from diff (A and B below)
- Pass 2: Card drafting from the extracted structure (OUTPUT FORMAT)

A) Collect change context from the repo

1.  Identify changed files using `git diff --name-only $(git merge-base HEAD origin/main)..HEAD` (use `origin/main` as the baseline).
2.  For each changed file, extract the key intent of the change by reading the diff hunks:
    - What user-facing UI or interaction will be added/changed/removed?
    - What pages, routes, or layouts will be impacted?
    - What client-side state management (Zustand, TanStack Query) will change?
    - What styling, theme tokens, or responsive behavior will change?
    - What form validation, error handling, or user feedback will change?
    - What authentication/authorization UI will change?
    - What accessibility or keyboard navigation will change?
    - What tests will be added/updated, and what gaps will remain?
3.  Summarize the changes into 3–8 “change bullets” (technical but concise, future tense).

B) Infer the “work item narrative” (future tense)

1.  Translate the diff into: problem → planned solution → expected user value.
2.  Identify impacted UI components (pages, components, hooks, Zustand stores, theme, routing, Server Actions).
3.  Identify risks and rollout considerations (breaking UI changes, responsive breakpoints, browser compatibility).
4.  Identify what is explicitly NOT addressed by the diff (out-of-scope) to avoid overpromising.

OUTPUT FORMAT (EXACTLY THIS ORDER) 0) Changed Files

- List changed file paths first (just the paths).

1. Title
   - A single, specific sentence (no trailing period).
   - Prefer: "<Verb> <Thing> for <Outcome>" (e.g., "Add dark mode toggle to dashboard for user preference persistence")
   - Title should be phrased as work to do (e.g., "Add…", "Implement…", "Introduce…", "Update…", "Refactor…").

2. Description (Markdown) — MUST BE FUTURE TENSE
   Write as if the change is planned and not yet shipped. Use “will” / “will be” / “will add”.
   Include ALL of:
   - Background / Problem Statement (current UX limitation and why it's needed)
   - Planned Changes (bullet list; future tense)
   - Intended User Experience (what users will see/interact with after completion)
   - Impacted Areas (bulleted, e.g., pages, components, routes, state management, layout)
   - Non-Goals / Out of Scope (bulleted)
   - Planned Testing Approach (unit tests, Playwright tests, or manual verification steps)

3. Acceptance Criteria (Markdown) — MUST BE VERIFIABLE
   - Use this Yes/No gate checklist before writing criteria:
     - Page or route structure changed? If Yes, include AC-NAV block; if No, omit AC-NAV block.
     - Form, input validation, or error handling changed? If Yes, include AC-VAL block; if No, omit AC-VAL block.
     - Authentication/authorization UI changed? If Yes, include AC-AUTH block; if No, omit AC-AUTH block.
     - Component responsiveness, accessibility, or keyboard navigation changed? If Yes, include AC-A11Y block; if No, omit AC-A11Y block.
     - Performance-sensitive feature (pagination, filtering, lazy loading) changed? If Yes, include AC-PERF block; if No, omit AC-PERF block.
     - Test surface changed? If Yes, include AC-TEST block; if No, include one criterion confirming no test impact.
   - Use checkboxes.
   - Criteria must describe what will be true when the work is complete.
   - Make criteria testable and unambiguous.
   - Cover: UI functionality, user interactions, form/validation behavior, accessibility, responsive design, and tests.
   - Every criterion must be verifiable by either:
     a) an automated test (unit, Vitest, Playwright),
     b) a reproducible manual step (e.g., "click button X and verify Y appears"),
     c) code inspection (e.g., "component uses theme tokens, not hardcoded colors").

4. Dev Notes (Markdown) — IMPLEMENTATION GUIDANCE
   Even though the diff exists, write notes as guidance for implementation/review, not as a recap of completed work.
   Include ALL of:
   - Implementation Notes (key components/files to change and why; reference Next.js/React patterns; use imperative mood)
   - Component/Page Architecture (structure, layout helpers from MUI, Server Component vs Client Component boundary, routing pattern)
   - State Management Notes (Zustand stores to create/modify, TanStack Query hooks for data fetching, Server Actions for mutations)
   - Styling/Theme Notes (MUI `sx` prop usage with theme tokens, Tailwind utilities where applicable, responsive breakpoint strategy)
   - Testing Notes (unit tests to add with Vitest, Playwright scenarios if UI flows are significant, mock data setup)
   - Accessibility/Compatibility Notes (WCAG compliance, keyboard navigation, responsive testing on mobile/tablet/desktop)
   - Assumptions (ONLY if the diff is insufficient to be certain; keep minimal)
   - Follow-ups / Tech Debt (ONLY if clearly implied by the diff)

HARD RULES

- **Focus exclusively on frontend UI changes** (React components, pages, styling, client-side state, routing, Server Actions). Do not mention backend APIs, controllers, repositories, database schemas, or backend integrations.
- **Respect Next.js 16 and React 19 patterns**: pages are Server Components by default, use async `params`/`searchParams`, leverage Server Actions for mutations, use TanStack Query for client-side caching.
- **Follow copilot-instructions.md guardrails**: use MUI v7 `sx` prop with theme tokens (avoid hardcoded colors), use Tailwind utilities in Tailwind-based components, keep components under 400 lines, use `src/api/<feature>/hooks/use*.ts` for TanStack Query, place Server Actions in `src/api/<feature>/actions.ts`.
- **Do not require starting the dev server or running UI verification** unless explicitly calling out manual testing steps in acceptance criteria.
- Base everything on the diff. Do not invent features or requirements not supported by the changes.
- If something is unclear from the diff, state it explicitly as an assumption in Dev Notes (under "Assumptions") and keep it minimal.
- Do not reference internal ticket numbers unless they appear in commit messages, branch name, or changed text.
- Keep the Title short; keep the Description detailed.
- Use Markdown in Description/Acceptance Criteria/Dev Notes. Title is plain text only.
- Do NOT write "this was implemented" or "has been added" anywhere; always phrase as "will be implemented/added/updated".

QUALITY BAR

- The card should be ready to paste into Azure DevOps without edits.
- Acceptance Criteria should be strong enough for QA and reviewers to validate.
- All guidance should be frontend-focused with no backend/API details.

NOW DO IT

1. List changed files first as item "0) Changed Files".
2. Then produce the final card content in the required output format.
