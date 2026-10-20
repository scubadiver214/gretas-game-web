---
agent: expert-nextjs-developer
description: Generate PR details from current branch changes and auto-update the existing PR when available
---

TASK
Create PR details from the current branch changes and automatically push them to the existing PR for the current branch when one exists.

IMPORTANT FRAMING
Treat this PR as proposing the changes for review. Write as if the changes are under review (present tense / proposal-oriented), not as historical summary and not as future work planning. Keep description concise and reviewer-focused. Do not include screenshot notes unless explicitly requested.

PRIMARY GOALS

- Use branch-vs-main diff as source of truth.
- Generate:
  - A concise PR title.
  - A detailed Markdown PR description.
- Automatically update the existing PR for the current branch if it exists.
- Keep output factual, reviewable, and ready to open without manual edits.

AUTOMATION REQUIREMENT (DO NOT SKIP)

1. Detect current branch and refresh remote state.
   - Run:
     - git rev-parse --abbrev-ref HEAD
     - git fetch origin main
2. Find an existing open PR for the current branch.
   - Prefer Azure DevOps CLI in this repo:
     - az repos pr list --source-branch <branch> --status active --top 1 --output json
   - If Azure CLI is unavailable, try GitHub CLI:
     - gh pr view --json number,title,body,state
3. If an open PR exists:
   - Generate title and description from the diff.
   - Update that PR directly via CLI.
   - For Azure DevOps use:
     - az repos pr update --id <prId> --title "<title>" --description "<markdown>"
4. If no open PR exists:
   - Do not fail.
   - Output draft title + description and clearly state that no existing PR was found.
5. If PR update fails due limits/auth/tooling:
   - Preserve generated output.
   - State exact failure reason.
   - Provide a ready-to-run command for manual update.

DESCRIPTION LENGTH SAFETY

- Azure DevOps PR descriptions may be capped at 4000 characters.
- If update fails because description is too long, automatically compress the description while keeping all required sections, then retry update.

HARD RULES

- Do not invent requirements, intent, or future work not supported by the diff.
- Do not reference ticket numbers unless they appear in branch name, commit messages, or code/comments.
- Keep PR title short and focused (target <= 72 chars).
- The description should be detailed and factual.
- Use Markdown ONLY in the PR Description (Title is plain text).
- Do not describe changes as “already deployed” or “completed”; this is a PR under review.
- If the user includes extra text after /pr, treat it as additional context and incorporate it into the PR draft.
- Never skip the attempt to auto-update an existing PR.

QUALITY BAR

- A reviewer should understand WHAT changed, WHY it changed, and WHERE to focus
  without reading the full diff first.
- If an existing PR exists, it should be updated automatically in the same run.

NOW DO IT

1. First, list the changed files vs `main` (paths only).
2. Then output the PR Title.
3. Then output the full PR Description in Markdown.
4. Then report PR automation result:
   - PR detected: yes/no
   - PR id/number (if detected)
   - Update attempted: yes/no
   - Update status: success/failure
   - If failure: exact reason + ready-to-run manual update command.
