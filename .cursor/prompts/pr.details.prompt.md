---
agent: expert-nextjs-developer
description: 'Generate a pull request title and description from the current branch changes'
---

TASK
Create a Pull Request (PR) title and a detailed PR description for the CURRENT BRANCH compared to `main`, based strictly on the diff.

IMPORTANT FRAMING
Treat this PR as proposing the changes for review. Write as if the changes are part of the PR and under review (present tense / proposal-oriented), not as a historical summary and not as future work planning.

PRIMARY GOALS

1. Use the branch-vs-`main` diff as the source of truth.
2. Produce:
   - A clear, concise PR Title
   - A detailed PR Description written in Markdown
3. Make the PR easy to review, understand, and reason about.

PROCESS (DO NOT SKIP)
A) Collect change context

1.  Identify all changed files compared to `main`.
2.  For each file, read the relevant diff hunks and extract:
    - What behavior is being added, modified, or removed?
    - What user-facing or API-facing behavior is affected?
    - What data shapes or contracts change (DTOs, schemas, endpoints)?
    - What cross-cutting concerns are touched (auth, logging, validation, error handling)?
    - What tests were added or updated?

B) Group changes into logical buckets (2–6 buckets)
Examples: "API changes", "data access", "authorization", "tests", "refactoring", "tooling".
Each bucket must map to at least one changed file.

C) Infer reviewer-relevant context

1.  Why these changes are needed (only if supported by diff, naming, or comments).
2.  What reviewers should pay special attention to.
3.  Any compatibility, migration, or rollout concerns implied by the changes.
4.  What is explicitly NOT included (out of scope).

OUTPUT FORMAT (EXACTLY THIS ORDER)

1. PR Title
   - One concise sentence.
   - Imperative or descriptive (e.g., “Add user-scoped environments endpoint”).
   - No trailing period.
   - Should reflect the primary change in the diff.

2. PR Description (Markdown)
   Use clear sections and bullet points. Include ALL of the following sections:

   ## Overview
   - Brief summary of what this PR changes and why (based only on the diff).

   ## Summary of Changes
   - Bullet list grouped by logical area (API, data, auth, tests, etc.).
   - Each bullet should describe WHAT changed, not implementation trivia.

   ## Behavior Details
   - Describe how behavior works with these changes applied.
   - Contrast with prior behavior only when helpful and supported by the diff.

   ## Impacted Areas
   - Bulleted list of impacted components, layers, or services.

   ## Out of Scope
   - Explicit list of what this PR does NOT attempt to solve or change.

   ## Testing
   - Describe tests added/updated in this PR.
   - If no tests are changed, state: “No tests updated as part of this PR.”

   ## Review Notes
   - Call out areas that deserve extra reviewer attention.
   - Mention any non-obvious design decisions implied by the diff.

   ## Risks / Rollout Considerations
   - Only include items that are clearly implied by the changes
     (e.g., migrations, auth behavior changes, backward compatibility).

HARD RULES

- Do not invent requirements, intent, or future work not supported by the diff.
- Do not reference ticket numbers unless they appear in branch name, commit messages, or code/comments.
- Keep the PR Title short and focused.
- The description should be detailed but factual.
- Use Markdown ONLY in the PR Description (Title is plain text).
- Do not describe changes as “already deployed” or “completed”; this is a PR under review.

QUALITY BAR

- A reviewer should understand WHAT changed, WHY it changed, and WHERE to focus
  without reading the full diff first.
- The PR should be ready to open without manual edits.

NOW DO IT

1. First, list the changed files vs `main` (paths only).
2. Then output the PR Title.
3. Then output the full PR Description in Markdown.
