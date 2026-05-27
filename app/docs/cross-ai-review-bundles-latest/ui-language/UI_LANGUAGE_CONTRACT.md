# UI Language Contract

Purpose: define one consistent user-facing naming system across Activity, Routine, Stage, Plan, and Active Plan so compact views explain what something is before detail views explain why and how it works.

This file works with the existing contracts:
- SCREEN_CONTRACTS.md locks which layer owns which depth of content.
- PLAN_INTERACTION_CONTRACT.md locks how taps, selection, disclosure, and navigation behave.
- MOBILE_COMPACT_VIEW_CONTRACT.md locks what compact mobile surfaces are allowed to show.

## Core Principle
- Compact views explain what the item is.
- Owner/detail/study views explain why it matters and how it works.
- Execution views answer what to do now.
- Internal or poetic names must never appear by themselves in a compact view unless they are already self-explanatory to a first-time user.

A user should not need prior vocabulary knowledge to scan the app.

## Hierarchy Terms
- Activity: canonical movement or practice identity.
- Routine: executable script built from activities.
- Stage: progression layer made of routines, rests, prompts, and milestones.
- Blueprint: static template made of stages.
- Active Plan: live runtime version of a blueprint.

These terms should be used consistently in labels, copy, and review packets.

## Label Layers
Every domain object may expose multiple labels, but each label has a different job.

### 1. Canonical Name
- The stable identity name stored on the object.
- Best used on owner/detail surfaces and in editors.
- Example: `Walking Attention Reset`.

### 2. Compact Label
- The short user-facing label shown in lists, chips, compact cards, rails, and other scan-first surfaces.
- Must tell the user what kind of thing this is.
- Example: `Cycle day 2 routine / Walking reset`.

### 3. Action Label
- The wording on a button, row, or chip that tells the user what will happen next.
- Must reveal the destination or action, not just say `Open` or `View` when multiple destinations are plausible.
- Example: `Study`, `Open routine`, `Start session`, `Edit stage`.

### 4. State Label
- Short non-interactive status or taxonomy cue.
- Example: `Current`, `Upcoming`, `Opening stage`, `Rest day`.

## Naming Rules

### Compact views must be explicit
Do not show internal labels alone in compact views when the user really needs a translated label.

Bad:
- `Attention Arrival`
- `Walking Attention Reset`
- `Foundation` with no stage context

Better:
- `Cycle day 1 routine / Arrival breath reset`
- `Cycle day 2 routine / Walking reset`
- `Stage 1 / Foundation`

### Kind comes before nuance
When space is tight, prioritize the thing type before the expressive subtitle.

Preferred pattern:
- `Routine / Full Body Strength`
- `Rest day`
- `Milestone test / Front plank`
- `Activity / Push-up`

### Do not over-explain compact surfaces
Compact labels should become clearer, not longer.
They should replace vague text, not add more prose.

### Use day language only when it is true
- Use `Day 1`, `Day 2`, `Rest day` only when the model truly behaves like a day-based cycle.
- Use `Cycle day 1`, `Cycle day 2`, or `Step 1`, `Step 2` when the schedule is ordered but not strictly calendar-day based.

## Responsibility By Depth

### List Item
Job:
- identify the item
- expose state
- support scan/compare

Allowed:
- canonical title or translated compact label
- one state label
- one short support line
- one primary navigation/action

Not allowed:
- long purpose text
- deep philosophy copy
- multiple stacked sub-panels that recreate detail screens

### Compact Card / Node
Job:
- summarize the item and orient the user quickly

Allowed:
- title
- state
- one progress or milestone cue
- one compact process hint
- one obvious action

Not allowed:
- long explanatory paragraphs
- duplicate detail content
- hidden interaction models

### Owner / Detail / Study Surface
Job:
- explain purpose, structure, and next action

Allowed:
- deeper purpose text
- milestone explanation
- ordered scripts
- support rules
- adoption or runtime framing

## Cross-App Translation Rules

### Activity
Compact:
- identify the movement clearly
- avoid overloading with tracking metadata

Detail:
- owns canonical identity, setup, tracking modes, and execution cues

### Routine
Compact:
- show routine type and where it fits in the cycle
- do not rely only on an internal routine title

Detail:
- owns the executable script, timing, and exact sequence

### Stage
Compact:
- show stage number/name, state, milestone cue, and cycle overview
- do not explain the whole stage thesis inside the compact node

Expanded/detail/study:
- owns stage purpose, milestone meaning, ordered schedule, and one short support line

### Blueprint / Active Plan
Compact:
- show fit, state, commitment shape, and next action
- do not let compact cards become mini detail screens

Detail:
- Blueprint Detail owns adoption
- Active Plan Detail owns runtime
- Study owns path comprehension

## Interaction Label Rules
- Buttons should reveal where the user is going.
- If an element always routes to Study, say `Study` instead of `Open`.
- If an element opens a routine, say `Open routine` when needed or use a row/chip affordance that clearly signals routine drill-down.
- Static badges must not look interactive.

## Copy Tone
- clear
- literal
- calm
- short
- user-facing

Avoid:
- poetic labels without translation
- coaching-narrative filler on compact surfaces
- internal author vocabulary leaking into scan-first UI

## Review Checklist
- Can a first-time user tell what each compact item represents?
- Are internal names translated when needed?
- Does the compact view answer what this is before asking the user to read more?
- Does the action label reveal the destination?
- Is deeper explanation reserved for owner/detail/study surfaces?
- Are state labels visually and semantically different from action labels?
