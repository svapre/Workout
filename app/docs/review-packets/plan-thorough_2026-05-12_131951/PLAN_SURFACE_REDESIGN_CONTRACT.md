# Plan Surface Redesign Contract v3

## Purpose
This contract freezes the plan-family surface model around the newer stage-object decisions.
It replaces the older "show the cycle strip everywhere" direction.

Use this file with:
- SCREEN_CONTRACTS.md
- STAGE_SURFACE_CONTRACT.md
- STAGE_STEP_CONTRACT.md
- PLAN_INTERACTION_CONTRACT.md
- MOBILE_COMPACT_VIEW_CONTRACT.md

## Core Direction
- Phone portrait is the primary design target for runtime and Study surfaces.
- `StageCompact` is goal-first.
- `StageStudy` owns process.
- `StageDetail` owns deeper explanation.
- Detail pages are owner surfaces plus a light path preview.
- Study pages are path + selected stage script, not chapter-card stacks.

## What Changed From V2
The old V2 direction assumed every visible stage node should contain:
- a mini cycle strip
- a cycle estimate
- visible routine/rest sequence inside the compact node

That is no longer the product direction.
The newer stage contracts intentionally move ordered process into Study and Detail.
Compact stage nodes should explain:
- what the stage is
- what state it is in
- what unlocks next

They should not try to teach the whole process inline.

## Screen Ownership

### Active Plan Detail
This is the low-friction runtime owner surface.
It must answer:
1. what stage am I in?
2. what is this stage trying to achieve?
3. what unlocks next?
4. what should I do now?

It must contain:
- identity strip
- current-stage module
- primary action zone
- light path preview
- recent sessions
- tools and lifecycle

The current-stage module owns:
- stage number and name
- current/runtime state
- one-line stage goal
- unlock or milestone summary
- next action context

The light path preview must stay lighter than the current-stage module.
It may show:
- stage number and name
- state
- unlock summary
- explicit `Study stage` affordance
- a shorter goal cue for later stages

It must not repeat the full current-stage explanation block below the current-stage module.

### Blueprint Detail
This is the adoption owner surface.
It must answer:
1. who is this for?
2. what does the plan try to achieve?
3. what commitment shape does it imply?
4. what does the starting stage look like?
5. do I want to create an active plan from it?

It must contain:
- identity strip
- adoption summary module
- CTA zone
- light path preview
- tools and lifecycle

The adoption module owns:
- plan goal
- intended fit / audience
- commitment summary
- starting-stage preview

The lower path preview must orient the user to later stages without becoming a second starting-stage card.

## Stage Node Grammar By Context

### Detail Path Preview Node
Use on:
- Active Plan Detail
- Blueprint Detail
- editor previews when shown as a path

Must contain:
- stage number
- stage name
- state when relevant
- unlock or milestone summary
- explicit navigation affordance when the node opens Study

May contain:
- one short goal cue when that goal is not already owned by the module above

Must not contain:
- routine strips
- ordered schedules
- cycle estimates
- long prose
- duplicated current/opening-stage explanation

### Study Selection Node
Use on:
- Active Plan Study
- Blueprint Study

Must contain:
- stage number
- stage name
- state when relevant
- unlock or milestone summary
- visible selected-state treatment

May contain:
- one short goal cue for unselected nodes

Must not contain:
- a second embedded chapter card shell
- repeated schedule cards for the same selected stage
- navigation language that competes with in-place selection

### Selected Stage Script
Use on:
- mobile attached expansion
- desktop right pane

Must contain:
- stage goal
- ordered stage-step script
- one optional support line

May contain:
- one short milestone or unlock reminder

Must not contain:
- another large duplicate stage card above the script
- activity-level metadata walls

## Study Surface Rules

### Mobile
Study on phone should feel like:
- path
- selected node
- attached script

It must not feel like:
- stacked chapter cards
- duplicated selected-stage summaries
- desktop side panels squeezed into one column

### Desktop
Desktop Study remains:
- left rail of stage nodes
- right pane for the selected stage script

This shell can freeze in principle.
The remaining work is in node/script content, not the overall desktop split.

## Runtime vs Template Differentiation

### Active Plan Study
Foreground:
- current stage
- runtime progress
- next unlock
- live action context

Preferred language:
- `Current`
- `Locked`
- `Completed`
- `Study plan`
- `Study stage`

### Blueprint Study
Foreground:
- canonical stage order
- starting stage
- unlock pattern
- commitment shape

Preferred language:
- `Starting stage`
- stage numbering
- `Study blueprint`
- `Study stage`
- no runtime lock language unless the stage is truly inaccessible in the current context

## Verb System
The plan family should use the action labels defined in PLAN_INTERACTION_CONTRACT.md.
Most important rules:
- `Start workout` for the routine session the active plan wants now
- `Complete rest step` for a recovery step
- `Take milestone test` for a stage gate
- `View plan` for the active-plan owner surface
- `Study plan` for active-plan Study
- `Study stage` for stage-specific Study entry
- `View blueprint` for blueprint detail
- `Create active plan` for instantiating a blueprint
- `Study blueprint` for blueprint Study

Do not reintroduce `Start session` or `Start this plan` when the destination can be named directly.

## Entry Screens

### Active Plans List
Compact cards should optimize for:
- current stage
- current progress
- next meaningful action

They should not try to explain the whole plan.

### Blueprint List
Blueprint cards should optimize for comparison.
They should show:
- plan name
- one-line goal
- stage count / structure cue
- starting stage
- one short opening-goal cue
- one clear action

They must not become mini detail pages.

## Editors
Editors must continue to author the same stage object that Study explains.
That direction is correct.

Phone editors are utility-first and secondary to runtime logging/reading.
They must remain workable, but they do not need to become the most optimized mobile surfaces in the product before the runtime plan family freezes.

## Freeze Criteria
Freeze the plan framework when all of the following are true:
- detail pages no longer duplicate the current/opening stage in the lower path preview
- mobile Study reads as selected node + attached script
- active vs blueprint Study are clearly differentiated in use
- the verb system is consistent across list, detail, and Study
- blueprint list cards compare cleanly without truncation-driven ambiguity

## Out of Scope
- beautification
- motion polish
- icon refinement
- desktop visual polish beyond structural correctness

Those come after the plan family passes one final review against this aligned contract stack.