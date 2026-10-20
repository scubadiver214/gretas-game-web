# Speckit Prompts: Developer Guide

This guide walks you through the **Speckit prompt workflow** — a structured, AI-assisted process for turning a feature idea into working code. Each prompt file in `.github/prompts/` drives a specific phase of that process.

You run these prompts inside your AI assistant (Cursor, Copilot Chat, etc.) by invoking them as slash commands (e.g., `/speckit.specify`) or pasting their contents into the conversation.

---

## The Big Picture

Think of the workflow as a pipeline:

```
Idea → Specification → Clarification → Plan → Tasks → Implementation
```

Some stages are **required** (the pipeline won't work without them), and others are **optional quality gates** you can add when the situation calls for it. The prompts build on each other — each one reads artifacts produced by earlier steps, so order matters.

---

## Workflow Sequence

### Phase 0: One-Time Project Setup

| Prompt                 | Required?        |
| ---------------------- | ---------------- |
| `speckit.constitution` | Once per project |

**What it does:** Establishes the project's non-negotiable principles — coding standards, quality gates, architectural constraints. These get stored in `.specify/memory/constitution.md` and are enforced throughout every downstream prompt.

**When to use it:** You almost certainly won't need to run this yourself. It's already been set up for the project. Read the constitution file if you want to understand the rules the other prompts enforce. Only run this prompt if the team is updating or adding principles.

---

### Phase 1: Define the Feature

| Prompt            | Required?                   |
| ----------------- | --------------------------- |
| `speckit.specify` | **Yes** — always start here |

**What it does:** Takes your natural-language feature description and produces a formal specification (`spec.md`). It also creates a feature branch and initializes the feature directory under `.specify/`.

**How to use it:** Describe the feature in plain language after the command:

```
/speckit.specify Add a bulk import tool for menu items via CSV upload
```

The prompt will generate the spec, create a quality checklist, and ask you to resolve any critical ambiguities (max 3 questions). Once complete, you'll have a branch like `5-csv-bulk-import` and a `spec.md` ready for the next phase.

---

### Phase 2: Sharpen the Spec (Optional)

| Prompt            | Required?                                                    |
| ----------------- | ------------------------------------------------------------ |
| `speckit.clarify` | **Optional** — recommended for complex or ambiguous features |

**What it does:** Reads your `spec.md`, scans it for gaps and vague language across ~10 categories (scope, data model, UX flows, security, edge cases, etc.), and asks you up to 5 targeted questions — one at a time. Your answers are written directly into the spec.

**When to skip it:** Small, well-understood changes where the spec is already unambiguous. If you skip it, the `plan` prompt may surface the same ambiguities later, so you're not saving time — just deferring decisions.

**When to use it:** Features touching unfamiliar domains, features with security/compliance implications, or anything where "it depends" keeps coming up in your head.

---

### Phase 3: Build the Technical Plan

| Prompt         | Required? |
| -------------- | --------- |
| `speckit.plan` | **Yes**   |

**What it does:** Reads your spec and constitution, then produces a full implementation plan (`plan.md`) including:

- Tech stack and architecture decisions
- Data model (`data-model.md`)
- Interface contracts (`contracts/`)
- Research notes for any unknowns (`research.md`)
- Constitution compliance checks

**How to use it:** Provide context about what you're building with:

```
/speckit.plan I am building with Next.js 16 and MUI v7
```

The plan is the bridge between "what" (spec) and "how" (tasks). It resolves all technical unknowns before any code is written.

---

### Phase 4: Generate Quality Checklists (Optional)

| Prompt              | Required?                                        |
| ------------------- | ------------------------------------------------ |
| `speckit.checklist` | **Optional** — recommended before implementation |

**What it does:** Generates domain-specific checklists that validate whether your _requirements_ are complete, clear, and consistent. These are "unit tests for English" — they test the spec, not the code.

**How to use it:** Specify the domain you want to validate:

```
/speckit.checklist UX requirements for the bulk import wizard
/speckit.checklist API contract quality
/speckit.checklist Security requirements
```

Each run creates a separate file (e.g., `ux.md`, `api.md`, `security.md`) in the `checklists/` directory. You can run it multiple times for different domains. The `implement` prompt will check these checklists before starting work and will pause if any items are incomplete.

---

### Phase 5: Break Into Tasks

| Prompt          | Required? |
| --------------- | --------- |
| `speckit.tasks` | **Yes**   |

**What it does:** Reads `spec.md`, `plan.md`, and any design artifacts to produce a complete, dependency-ordered task list (`tasks.md`). Tasks are organized by user story and grouped into phases:

- **Phase 1:** Project setup
- **Phase 2:** Foundational/blocking work
- **Phase 3+:** One phase per user story (in priority order)
- **Final:** Polish and cross-cutting concerns

Each task has an ID, file paths, dependency markers, and parallel execution flags (`[P]`).

---

### Phase 6: Cross-Artifact Analysis (Optional)

| Prompt            | Required?                                     |
| ----------------- | --------------------------------------------- |
| `speckit.analyze` | **Optional** — recommended for large features |

**What it does:** A **read-only** consistency check across `spec.md`, `plan.md`, and `tasks.md`. It detects:

- Requirements with no corresponding tasks (coverage gaps)
- Tasks that don't map to any requirement (orphans)
- Terminology drift between documents
- Vague language and unresolved placeholders
- Constitution violations

It produces a report with severity ratings (Critical / High / Medium / Low) and recommends fixes — but changes nothing itself.

**When to use it:** Before starting implementation on any feature with more than a handful of tasks. It catches misalignment that would otherwise surface as bugs or rework mid-build.

---

### Phase 7: Convert Tasks to GitHub Issues (Optional)

| Prompt                  | Required?    |
| ----------------------- | ------------ |
| `speckit.taskstoissues` | **Optional** |

**What it does:** Reads `tasks.md` and creates a GitHub issue for each task using the GitHub MCP server. Issues are created in the repository matching your `git remote origin`.

**When to use it:** When the team wants to track progress in GitHub Projects, assign tasks to individuals, or maintain a public record of work items. Not necessary for solo work or short-lived features.

---

### Phase 8: Implement

| Prompt              | Required? |
| ------------------- | --------- |
| `speckit.implement` | **Yes**   |

**What it does:** Executes your task list phase by phase. Before writing any code it:

1. Checks all checklists — pauses if any are incomplete
2. Loads the full implementation context (plan, data model, contracts, research)
3. Sets up project scaffolding and ignore files
4. Processes tasks in dependency order, respecting parallel markers
5. Marks tasks complete in `tasks.md` as it goes

If a task fails, sequential work halts and you get a clear error. Parallel tasks continue independently.

---

## Quick Reference: Prompt Order at a Glance

```
┌─────────────────────────────────────────────────────┐
│  1. speckit.specify        REQUIRED   Create spec   │
│  2. speckit.clarify        optional   Refine spec   │
│  3. speckit.plan           REQUIRED   Tech plan     │
│  4. speckit.checklist      optional   Quality gates │
│  5. speckit.tasks          REQUIRED   Task list     │
│  6. speckit.analyze        optional   Consistency   │
│  7. speckit.taskstoissues  optional   GitHub issues │
│  8. speckit.implement      REQUIRED   Build it      │
└─────────────────────────────────────────────────────┘

    speckit.constitution     reference  Project rules
```

### Minimum Viable Path (small, clear features)

```
specify → plan → tasks → implement
```

### Recommended Path (most features)

```
specify → clarify → plan → checklist → tasks → analyze → implement
```

### Full Path (large, high-risk, or team-tracked features)

```
specify → clarify → plan → checklist → tasks → analyze → taskstoissues → implement
```

---

## Tips for New Developers

- **Read the constitution first.** Open `.specify/memory/constitution.md` to understand the project's non-negotiable rules. Every other prompt enforces these.
- **Don't skip `clarify` on your first few features.** It teaches you what "well-specified" looks like in this project and surfaces gaps you might not think to check.
- **Checklists block implementation.** If you run `checklist` and leave items unchecked, `implement` will stop and ask you about it. Complete them or consciously skip them.
- **`analyze` is free.** It's read-only and fast. There's no downside to running it before you start coding.
- **Each prompt tells you what to do next.** After completing a step, the prompt suggests the logical next command. Follow the breadcrumbs.
- **You can re-run prompts.** If requirements change mid-flight, you can re-run `specify` or `clarify` to update the spec, then cascade through `plan` → `tasks` again.
