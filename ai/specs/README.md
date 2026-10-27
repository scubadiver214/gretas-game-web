# Feature specs

This folder is the coding agent's log for every change in this workspace, games and otherwise. Architecture, phases, decisions, leftover work and bugs live here so a later session does not have to reconstruct them from chat.

Workspace Cursor rule: `.cursor/rules/feature-specs.mdc` (always apply).

## Layout

One folder per feature, named with a short kebab-case **slug**:

```
ai/specs/<slug>/
  README.md      status, links, how to read the rest
  plan.md        architecture, module layout, API, risks
  phases.md      numbered delivery phases — what each is, done or not, how it was verified
  decisions.md   dated log, newest first; include rejected alternatives
  todos.md       open work, ordered, pointing at a phase when it has one
  bugs.md        open and closed defects
```

Create the whole set the first time you touch a feature that has no folder. Copy `racing/` if you want a filled example.

## Features

| Slug | Game | Code | Spec |
| --- | --- | --- | --- |
| [racing](racing/) | The Fitz and Furious | `src/features/racing/` | filled (phases 1–3 done) |
| [claw](claw/) | Bea's Claw-some Adventure | `src/features/claw/` | plan moved here; fill the rest on the next claw change |
| [kitchen](kitchen/) | Pizza Kitchen: Lunch Rush | `src/features/kitchen/` | stub |
| [frogger](frogger/) | Frogger Adventure | `src/features/frogger/` | stub |
| [delivery](delivery/) | Bike Delivery | `src/features/delivery/` | stub |
| [wordle](wordle/) | Word Quest | `src/features/wordle/` | filled (lint fix logged) |
| [duck-hunt](duck-hunt/) | Elijah's Quack Attack | `src/features/hunting/` | filled (phase 1 done) |
| [site-cache](site-cache/) | — | `public/sw.js` | v3: pages wait for the network |

Older notes that pre-date this folder:

- `Game Dev/specs/the-fitz-and-furious.md` → pointer to [racing](racing/)
- `Game Dev/specs/pizza-kitchen.md` → original kitchen brief; kitchen spec should absorb it when that game is next touched

## What "phase" means

A **phase** is a named slice of a feature with a clear "done" (playable prototype, five-car race, persistence, …). It is not a Speckit prompt stage and not a git branch.

Racing's phases (see [racing/phases.md](racing/phases.md)):

1. Repository analysis and architecture
2. Playable 3D desert prototype (solo)
3. Complete five-car race (rivals + time trial)
4. Collectibles, rewards, persistence
5. Garage and customization
6. Worlds, difficulty unlocks, moving obstacles (partially pulled forward)
7. Polish, audio, quality presets

When you add a phase, give it a number, a one-line goal, a done checklist, and after it ships a "what exists / how verified" section.

## Agent rules (short)

The always-on Cursor rule is `.cursor/rules/feature-specs.mdc`. It applies to every change an agent makes, not only game features. Widened on 2026-10-25: a shared component, a bugfix, config or a rule gets the same log as a game.

- Read the feature folder before changing that code. Create a slug folder if the change has no home yet.
- Write decisions, phase progress, todos and bugs here in the same session as the code.
- Do not leave the only copy of a decision in chat.
- Do not invent a second spec location. If you find an old doc, point it here.
