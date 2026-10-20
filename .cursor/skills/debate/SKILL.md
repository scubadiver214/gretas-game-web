---
name: debate
description: "Live adversarial multi-agent debate streamed in chat. Agents argue, challenge, and naturally retire when bested until the strongest position remains. Use when '/debate' is invoked. Supports 2-10 agents, 1-10 rounds (or infinite), skill-based personas with personality overlays, four turn-order modes (round-robin, moderator-directed, rr-interjections, autonomous), user pause/resume/join controls, significance tracking, and post-debate trajectory analysis. Fundamentally different from /council — this is sequential real-time argumentation, not parallel-dispatch synthesis."
---

# Debate of Experts

Orchestrate a live, sequential, adversarial debate between expert subagents. Ideas graduate through pressure-testing. Agents retire when bested. The strongest position survives.

## Step 1: Parse Invocation

Extract from natural language input:

| Field | Detection | Default |
|-------|-----------|---------|
| **Agent groups** | "[N] [skill-name] (persona \| persona)" | 3 auto-inferred agents |
| **Rounds** | Number or -1/infinity/unlimited | 3 |
| **Turn order** | round-robin, moderator-directed, rr-interjections, autonomous | round-robin |
| **Topic** | The core question, problem, or scenario | Required — ask if missing |

Persona overlays are optional per agent. `(default)` or omission = neutral professional tone. `(calm \| paranoid \| insufferable)` = three distinct personality modifiers applied to the same skill binding.

**Limits:** 2-10 agents, 1-10 rounds (or -1 for infinite until /stop). Max 100 total turns.

## Step 2: Build Agent Roster

For each agent, construct:

1. **Skill binding** — Domain expertise from the named skill
2. **Personality overlay** — Behavioral modifiers for system prompt
3. **Agent name** — `[skill]-[N] (overlay)` or just `[skill]` if unique

If user didn't specify skills, auto-infer from the topic. Choose agents with **distinct perspectives** — complementary, not redundant.

## Step 3: Display Debate Header

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DEBATE OF EXPERTS
  Topic: [topic]
  Agents: [list with personas]
  Rounds: [N or ∞]
  Turn Order: [mode]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 4: Agent System Prompt

Each agent receives this system prompt on every call:

```
You are "[AGENT_NAME]", an expert in [SKILL_DOMAIN].

PERSONALITY: [overlay or "neutral professional"]

You are in a live debate. Rules:

1. ARGUE YOUR BEST CASE with conviction.
2. FIGHT IN GOOD FAITH — strongest idea wins, not ego.
3. ENGAGE DIRECTLY — address agents by name, respond to specific points.
4. CONCEDE WHEN BESTED — if you cannot meaningfully advance beyond the current strongest position, retire.
5. ADVANCE EACH TURN — strengthen, weaken another's, or synthesize. Never repeat yourself.

To retire: respond with exactly RETIRE: [one sentence on what convinced you]
To continue: respond with your argument (2-4 focused paragraphs).

TOPIC: [topic]
CONVERSATION SO FAR: [full transcript]
NEW SINCE YOUR LAST TURN: [diff]
ACTIVE AGENTS: [list]
RETIRED AGENTS: [list with reasons]
ROUND: [N] of [max]
```

Use `model: "sonnet"` for all agent dispatches.

## Step 5: Execute Debate

### Round-Robin / Moderator-Directed / RR-Interjections

```
For each round:
  For each active agent (in order, or moderator-selected):
    1. Build prompt with full transcript + diff
    2. Dispatch subagent
    3. Parse response — check for RETIRE prefix
    4. Evaluate significance (advance/hold/weaken/absorb/concede)
    5. Track peak moment candidacy
    6. Display response with status indicator:
       🟢 = active, spoke
       🔴 = retired this turn
    7. If retired: remove from roster, show retirement notice, show "[Active: N of M]"
    8. Check for user commands between turns
  Check convergence: 1 agent left? Max rounds?
```

For **rr-interjections**: between any two agent turns, the orchestrator MAY interject to redirect, summarize, or provoke. Use sparingly — only when conversation stalls or goes circular.

For **moderator-directed**: after each turn, the orchestrator decides who speaks next based on whose domain is most relevant to what was just said.

### Autonomous Mode

```
Each tick:
  For each active agent, lightweight check:
    "Rate 1-10 how much you need to speak. 7+ = speak. <7 = PASS."
  Agents that respond: display and process normally
  All PASS: increment silence counter, apply decay:
    Tick 1 silence: 60% spontaneous speech chance
    Tick 2 silence: 30%
    Tick 3 silence: 10%
    Tick 4+: force final-positions round → end
```

### User Commands (Monitored Between Turns)

| Command | Effect |
|---------|--------|
| `/pause` | Halt after current speaker |
| `/resume` | Continue debate |
| `/stop` | End debate, trigger synthesis + trajectory |
| `/join` | While paused — user's next message enters transcript as "🧑 Human", then resume |
| `/status` | Show active roster, round, retirements |
| `/kick [agent]` | Remove agent without retirement statement |

### Context Window Management

- Agent responses capped at ~500 tokens
- For debates exceeding 50 turns: provide compressed transcript (key points) + last 10 turns verbatim
- Orchestrator tracks structured metadata, not raw text, for trajectory

## Step 6: Significance Tracking

After each agent turn, evaluate with a lightweight call:

```
Classify this contribution: advance / hold / weaken / absorb / concede
Is this the agent's strongest contribution so far? yes / no
One-sentence summary of the key point (if advance or absorb).
```

Store per-turn: `{agent, round, status, significance, key_point}`.
Mark exactly ONE turn per agent as their `peak` (★).

## Step 7: Synthesis

After debate concludes:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DEBATE CONCLUDED — Round [N] of [max]
  Winner: [agent name]
  Final standing: [1 of M]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  SYNTHESIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1. Winning position and why it prevailed
 2. Key arguments that shaped the debate
 3. Ideas absorbed into the winning framework
 4. Unresolved tensions
 5. Actionable conclusions]
```

## Step 8: Debate Trajectory

Generate per-agent arc showing their path through the debate:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DEBATE TRAJECTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[agent-name] ▲ WINNER
  R1: [opening position summary]
  R3: ★ [peak moment description]
  R5: [absorbed X from agent-Y]
  R7: Final standing — unchallenged

[agent-name] ▼ Retired R4
  R1: [opening position]
  R2: ★ [peak moment — their best contribution]
  R4: Conceded — [reason]
```

### Trajectory Rules

- Every agent gets exactly ONE ★ — their single best contribution
- Agents who retired early still show their peak
- Winner's trajectory shows which absorbed ideas contributed to victory
- Only show rounds where significance was advance, absorb, peak, or concede
- If an agent had no significant contribution, state that honestly

## Critical Rules

1. **Each agent prompt MUST be self-contained** — full transcript included, no shared memory
2. **Never exceed 10 agents or 10 rounds** — hard limits
3. **Agents MUST be dispatched sequentially** — this is not parallel dispatch, each agent sees what came before
4. **RETIRE is sacred** — once retired, an agent is never re-invoked
5. **The orchestrator is the event loop, not the puppeteer** — it runs the clock, it doesn't pick winners
6. **Display results progressively** — stream each response as it arrives
7. **Use sonnet for all subagent calls** — faster, cheaper, sufficient quality
8. **Track structured data from turn 1** — the trajectory depends on it
