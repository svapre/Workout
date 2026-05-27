# Screen Contracts

## Purpose
This file defines what each layer of the product hierarchy is allowed to
show, own, summarize, and link to.

It exists to stop higher screens from absorbing lower-level detail and to
keep future UI changes aligned with the product hierarchy:

Exercise -> Routine -> Stage -> Plan -> Active runtime

Read this before changing:
- compact card content
- detail screen content
- study screen content
- roadmap density
- metadata roll-up behavior

## Core Rule
Each owner layer gets two public UI contracts:
- `Compact`: the minimum scannable summary that higher layers may embed
- `Detail`: the canonical owner surface

Higher layers may show:
- their own full data
- the compact contract of the layer below

Higher layers must never show:
- the full canonical detail of the layer below
- duplicated explanations that already belong to the lower owner

## Visual Metadata Contract

### Image / Body Visual
Use for:
- exercise body targets
- routine aggregate body targets

Do not use body visuals inline on stage, plan, or active-plan overview
surfaces.

### Primary Visual By Domain
Use for:
- physical and mind-body records => body visual
- mental-only records => practice-profile visual

The owner surface chooses the correct primary visual. Higher layers should
embed only the owner's compact preview, not reinvent the visual logic.

### Icon + Short Label
Use for:
- equipment
- tracking modes
- movement pattern
- domain or type

### Badge / Chip
Use for:
- state labels
- difficulty
- built-in vs custom
- structural labels like `3-step cycle`

### Text
Use for:
- stage guidance
- milestone explanation
- routine purpose
- exercise cues
- why it helps
- notes
- source/context

## Exercise

### ExerciseCompact
Must contain:
- exercise name
- one short target summary
- compact equipment summary
- compact tracking-mode summary

May contain:
- one compact primary visual slot
- body-target thumbnail for physical / mind-body records
- family-driven practice visual for mental-only records
- one short type marker like `Physical` or `Mental`

Must not contain:
- full cue list
- long description
- why-it-helps prose
- source metadata
- long notes

### ExerciseDetail
Must contain:
- exercise identity
- large primary visual chosen by domain
- body visual with highlighted targets for physical and mind-body records
- practice-profile visual for mental-only records
- equipment
- tracking modes
- movement pattern
- supporting text sections for description / cues / why it helps / source

Must not contain:
- routine-specific prescription
- stage-specific meaning
- plan-specific guidance

## Routine

### RoutineCompact
Must contain:
- routine name
- short purpose line
- exercise count
- one compact aggregate summary row

May contain:
- small aggregate body visual
- compact equipment row
- compact domain / mode markers

Must not contain:
- full exercise metadata stacks
- full cue text
- editor controls

### RoutineDetail
Must contain:
- routine identity
- purpose / overview
- aggregate body visual
- aggregate equipment summary
- aggregate tracking-mode summary
- aggregate domain or movement summary when computable
- ordered entries shown as a vertical list
- each entry rendered as a routine-owned wrapper around `ExerciseCompact`
- a visually nested execution block inside each entry
- work and rest rendered as distinct nested block types inside the entry
- between-entry transition connectors rendered between rows, not inside the
  activity-owned compact summary

Must not contain:
- duplicated aggregate sections that restate the same overview twice
- editor-first layout
- stage- or plan-specific explanation
- transition timing presented as if it belongs to the activity record itself

Editing entry:
- editing is allowed only as a secondary tool action, not a top-of-screen
  competing CTA

## Stage

### StageCompact
Must contain:
- stage name
- milestone state
- cycle or structure hint

May contain:
- one short current or upcoming status marker

Must not contain:
- full routine metadata
- exercise metadata stacks
- long chapter prose

### StageStudy
Must contain:
- stage guidance
- milestone gate summary
- optional stage check-in / feedback prompts
- ordered schedule
- each routine step rendered as `RoutineCompact`
- rest steps rendered as plain structural rows

May contain:
- a single open chapter at a time
- current-stage highlight in active-plan study

Must not contain:
- inline `ExerciseCompact` grids
- stacked target/equipment/mode chips for every step
- duplicated routine detail

## Plan

### PlanCompact
Must contain:
- plan name
- goal
- stage count
- one-line structure summary

May contain:
- small roadmap
- theme marker

Must not contain:
- full stage chapters
- inline routine detail

### PlanDetail
Must contain:
- plan overview
- compact roadmap
- grouped tools and lifecycle actions
- entry into blueprint study

Must not contain:
- full readable stage chapters inline
- exercise or routine detail inline

## Active Plan

### ActivePlanCompact
Must contain:
- current stage
- current day or cycle progress
- next meaningful action
- compact progress strip

Must not contain:
- roadmap explanations
- routine or exercise detail

### ActivePlanDetail
Must contain:
- `Now`
- compact roadmap
- current and next stage summary
- recent sessions
- entry into active-plan study

May contain:
- small contextual history entry point
- grouped tools and lifecycle actions

Must not contain:
- full stage chapters inline
- repeated current-stage description blocks
- routine or exercise detail inline

## Blueprint Study vs Active Plan Study
These are separate screen contexts that may share components.

Blueprint study reads from:
- `blueprint.stages`

Active-plan study reads from:
- `activePlan.stages`

Do not let one screen silently read from the other's source data.

## Cards vs Lists

### Use Cards For
- library items
- entry points
- overview blocks

### Use Lists / Timelines For
- routine entries
- stage schedules
- recent sessions
- roadmap rows

Cards are for entry and summary.
Lists are for ordered homogeneous sequences.

## Metadata Roll-Up Rule
New exercise metadata appears on `ExerciseDetail` first.

It only propagates upward when explicitly marked:
- compact eligible
- roll-up eligible

If a field is not promoted through the metadata registry, higher layers do
not show it.

Examples:
- body targets: compact + roll-up eligible
- equipment: compact + roll-up eligible
- tracking modes: compact + roll-up eligible
- cues: detail only
- source metadata: detail only
- long notes: detail only

## Anti-Duplication Rules
- Do not show the same aggregate metadata twice on the same owner detail
  screen
- Do not repeat current-stage meaning across hero, summary, and support
  blocks
- Do not make a collapsed state nearly as verbose as an open state
- Do not let study previews become owner-detail replacements

## Implementation Order
1. Exercise detail and compact contract
2. Routine detail and compact contract
3. Stage study and compact contract
4. Plan and active-plan overview/action surfaces
5. Only after that: beautification
