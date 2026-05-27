# Plan Surface Redesign Contract v2

## Purpose
Freeze the next major plan-surface pass around one visual model instead of continuing to iterate against list-like layouts.

This revision exists because the previous pass improved the plan screens, but the stage roadmap and study surfaces still read too much like ordered cards and not enough like a journey.

This document now freezes the shared visual grammar for:
- `Active Plan Detail`
- `Blueprint Detail`
- `Active Plan Study`
- `Blueprint Study`

The goal is:
- lower mental friction
- clearer stage purpose and milestone understanding
- a visible routine/rest sequence inside each stage
- better intuition about what one cycle feels like
- stronger differentiation between runtime and template surfaces

## Why V2 Exists

### 1. The roadmap still feels like a list
The current roadmap still behaves like a stack of stages instead of a path.

That creates three problems:
- stages feel isolated from each other
- milestones are read as text instead of checkpoints
- the user cannot infer the shape of the journey at a glance

### 2. Study still explains too much with boxes
Study is no longer a chapter accordion, but it still feels card-built.

That creates three problems:
- the selected stage is repeated too heavily
- the schedule still feels attached to a card instead of embedded in a progression
- runtime and blueprint study still feel too similar

### 3. Stages do not yet show their cycle visually
Users should be able to tell, from the stage itself:
- what the stage is trying to achieve
- what one cycle contains
- where the rests live
- roughly how long a cycle feels

The current screens still require too much reading to derive that.

## Core Model

### Detail surfaces
Detail surfaces are current-node dashboards.

They answer:
1. where am I or what is this plan?
2. what is the current or first stage?
3. what does one stage cycle look like?
4. what should I do next?

They must not explain the whole journey in prose.

### Study surfaces
Study surfaces are progression maps.

They answer:
1. what stages exist?
2. what is each stage trying to accomplish?
3. what does one cycle look like inside each stage?
4. what milestone unlocks the next stage?

They must feel like a readable path with one selected stage, not stacked mini detail pages.

## Shared Visual Grammar

### Stage path
Every plan surface that shows stages should use a stage path instead of a boxed list.

The path may be:
- vertical on mobile
- two-pane with a vertical rail on desktop

It must make the progression direction obvious.

### Stage node
A stage node is the parent unit in the journey.

Each stage node must show:
- stage name
- one-line objective
- milestone cue
- mini cycle strip
- cycle estimate

Each stage node must not show:
- multiple stacked support cards
- paragraph-length explanation
- full routine detail

### State styles
Every stage node uses one of four states:
- `current`
- `completed`
- `upcoming`
- `selected`

Rules:
- `current` is the strongest emphasis on active surfaces
- `selected` is the stage whose detail is open
- `completed` looks resolved, not loud
- `upcoming` looks available but quieter

### Milestone marker
Milestones must be visually distinct from stage description.

Milestones should render as a checkpoint element such as:
- a diamond token
- a flag marker
- a checkpoint badge attached to the stage rail

Milestone copy stays short:
- `Unlock after 4 cycles`
- `Milestone test: 40s hold`

### Mini cycle strip
Every stage node must include a compact sequence strip that previews one cycle.

The strip is the key new grammar in this revision.

It must show the order of:
- routines
- rest steps
- reset or transition steps if relevant

The strip exists to answer:
- what happens first?
- where are the rests?
- is this stage dense or light?

### Cycle estimate
Every stage node should expose the feel of one cycle using one or two values.

The preferred model is:
- active time
- elapsed cycle span

Examples:
- `~28 min active`
- `~3 days per full cycle`
- `~18 min active / 1-day cycle`

Use only the value that matters.
Do not show two values if the second one adds no clarity.

## Mini Cycle Strip Rules

### Visual meaning
Use one consistent visual language:
- routine = solid segment
- rest = hollow or dashed segment
- reset = light outlined segment
- connector = thin line

The strip is a preview, not a logging surface.

### Labeling
Each segment may use a short label such as:
- `Full Body A`
- `Rest`
- `Lower Reset`

Avoid large metadata blocks inside the strip.

### Compression rules
If a stage has many routine steps:
- show the first few named steps
- collapse the remainder to `+N more`

If a stage is simple:
- show the full cycle

### Rest visibility
Rest steps must stay visible in the strip.

Do not hide rests in summary text alone.
The user should be able to see recovery spacing at a glance.

## Path Rules

### Detail screens use a light path preview
Detail screens should show a lighter stage path.

The path preview must orient the user, not become a second study screen.

It should show:
- current or first stage
- next stage
- total stage count

It may also show small milestone markers.

### Study screens use the full path
Study screens should use the stronger path representation.

They should show:
- every stage
- state or selection
- milestone markers
- stage objective
- mini cycle strip
- cycle estimate

They should not repeat the selected stage title as a large duplicate card immediately below the same selected node.

## Detail Surface Contracts

### Active Plan Detail
This is the day-to-day runtime dashboard.

It must answer in one glance:
1. what stage am I in?
2. what is this stage trying to do?
3. what unlocks next?
4. what should I do now?

#### Required blocks
1. slim identity strip
2. current-node module
3. CTA zone
4. light path preview
5. recent sessions
6. tools and lifecycle

#### Current-node module
This is the main block.

It must contain:
- current stage name
- one-line objective
- milestone or unlock line
- mini cycle strip
- cycle estimate
- next action or next session

It must not split these into separate nearby cards.

#### CTA zone
Contains:
- primary `Start session`
- secondary `Study this plan`

It should sit immediately under the current-node module.

### Blueprint Detail
This is the adoption surface.

It must answer:
1. who is this for?
2. what does the journey try to achieve?
3. what commitment shape does it imply?
4. what does the opening stage look like?
5. do I want to start it?

#### Required blocks
1. slim identity strip
2. adoption summary module
3. CTA zone
4. light path preview
5. tools and lifecycle

#### Adoption summary module
Must contain:
- intended user or use case
- journey objective
- cadence or rhythm
- commitment shape
- opening stage preview
- mini cycle strip for the first stage

This is not a runtime progress block.

## Study Surface Contracts

### Core structure
Study is `path + selected stage detail`, not `stacked chapter cards`.

#### Mobile
- top: compact path
- below: selected stage detail attached to the selected node
- other stages stay compressed

#### Desktop
- left: path rail with stage nodes
- right: selected stage detail pane

### Selected stage detail
The selected stage detail may contain:
- one short stage thesis
- milestone line
- ordered schedule list
- one optional support line for setup or check-in

It must not repeat the whole stage summary that already appears in the node above.

### Schedule list
The schedule list is a plain ordered script.

Each row should read like:
- `Step 1 - Full Body A`
- `Chest / Core / Back - ~20 min`

Rest rows should read like:
- `Step 2 - Rest day`
- `Recovery / no session`

Rows may be tappable for routine detail.
Rows must not be wrapped in secondary metadata cards.

### Active Plan Study
Must foreground runtime meaning:
- current stage pinned or selected by default
- progress visible once near the top or in the selected node
- runtime revisions summarized once if relevant

It should feel like:
- where I am now
- what this stage cycle looks like
- what unlocks next

### Blueprint Study
Must foreground canonical structure:
- stronger numbering
- no runtime progress framing
- stronger sense of total commitment and shape

It should feel like:
- how this journey is designed
- what the stages are for
- whether this structure fits me

## Low-Fi Structures

### Active Plan Detail - Mobile
```text
[Active] Strength Base
2 stages - live journey

CURRENT STAGE
Foundation
Build steady execution under load.
[ Full Body A ] -- [ Rest ] -- [ Lower Reset ]
~28 min active / ~3-day cycle
Unlock after 4 cycles
Next: Full Body A

[ Start session ]
[ Study this plan ]

PATH
o Foundation  Current
  milestone: 4 cycles
o Build       Upcoming

RECENT SESSIONS
- Full Body A
- Lower Reset

TOOLS
LIFECYCLE
```

### Blueprint Detail - Mobile
```text
[Blueprint] Strength Base
2 stages - repeatable journey

WHY CHOOSE THIS PLAN
For rebuilding consistent strength practice.
Cadence: 3-step cycle
Commitment: short repeatable stages
Starts with: Foundation
[ Full Body A ] -- [ Rest ] -- [ Lower Reset ]
~28 min active / ~3-day cycle

[ Start this plan ]
[ Study blueprint ]

PATH
o Foundation
o Build

TOOLS
LIFECYCLE
```

### Active Plan Study - Mobile
```text
Strength Base
Current: Foundation - 0 / 4 cycles completed

PATH
o Foundation [Current][Selected]
  Build steady execution under load.
  milestone: unlock after 4 cycles
  [ Full Body A ] -- [ Rest ] -- [ Lower Reset ]
  ~28 min active / ~3-day cycle

  Schedule
  1. Full Body A
     Chest / Core / Back - ~20 min
  2. Rest day
     Recovery / no session
  3. Lower Reset
     Quads / Hamstrings / Core - ~10 min

o Build [Upcoming]
  Increase work density and confidence.
  milestone: unlock after Foundation
  [ Upper Density ] -- [ Rest ] -- [ Lower Density ]
```

### Blueprint Study - Mobile
```text
Strength Base
Canonical journey - 2 stages

PATH
o 1 Foundation [Selected]
  Build steady execution under load.
  milestone: unlock after 4 cycles
  [ Full Body A ] -- [ Rest ] -- [ Lower Reset ]
  ~28 min active / ~3-day cycle

  Schedule
  1. Full Body A
     Chest / Core / Back - ~20 min
  2. Rest day
     Recovery / no session
  3. Lower Reset
     Quads / Hamstrings / Core - ~10 min

o 2 Build
  Increase work density and confidence.
```

### Study - Desktop
```text
| Journey rail                             | Selected stage                |
| o Foundation [Current][Selected]         | Foundation                    |
|   objective                              | short thesis                  |
|   mini cycle strip                       | milestone line                |
|   cycle estimate                         | ordered schedule list         |
| o Build [Upcoming]                       | optional setup/check-in line  |
|   objective                              |                               |
|   mini cycle strip                       |                               |
```

### Detail - Desktop
```text
| Identity strip                                           |
| Current node module                     | Start / Study  |
| Light path preview                                      |
| Recent sessions                                         |
| Tools / Lifecycle                                       |
```

## Implementation Priorities

### Pass A - Visual roadmap grammar
Rebuild the stage path so it behaves like a journey rail instead of a stage list.

Deliver:
- stage nodes
- state styles
- milestone marker
- light path on detail
- full path on study

### Pass B - Mini cycle strip
Add the routine/rest preview to every visible stage node.

Deliver:
- routine segment style
- rest segment style
- compressed strip rules
- cycle estimate model

### Pass C - Active and Blueprint differentiation
Strengthen the difference between runtime and template surfaces.

Deliver:
- runtime emphasis on current stage and progress
- template emphasis on intended use, cadence, and commitment

## Out of Scope
- beautification
- motion polish
- iconography refinement
- sound and haptics

Those come after the journey grammar is implemented and reviewed.

## Decision
Do not continue refining the current plan surfaces as if they were list/card screens.

The next pass must implement this journey-based grammar directly.
