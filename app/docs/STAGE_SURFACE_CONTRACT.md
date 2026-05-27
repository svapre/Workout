# Stage Surface Contract

## Purpose
This contract defines what a `Stage` is allowed to show at each depth.
It exists to stop stage cards from drifting between goal, process, and
editor semantics.

Use this file together with:
- SCREEN_CONTRACTS.md
- UI_LANGUAGE_CONTRACT.md
- MOBILE_COMPACT_VIEW_CONTRACT.md
- PLAN_INTERACTION_CONTRACT.md
- STAGE_STEP_CONTRACT.md

## Core Principle
- `StageCompact` explains what the stage is trying to achieve.
- `StageStudy` explains how the stage works.
- `StageDetail` explains why the stage exists and how success is judged.

Compact stage cards must not try to teach the full process.
Process belongs to Study and Detail.

## StageCompact

### Must contain
- stage number
- stage name
- stage state
- one-line stage goal
- unlock or milestone condition

### May contain
- one compact progress cue
- one explicit navigation affordance when the card opens Study

### Must not contain
- routine names
- routine strips
- ordered schedules
- cycle estimates
- long explanatory prose

### Runtime state language
- `Current`
- `Locked`
- `Completed`

### Blueprint state language
- `Opening stage`
- later stage numbering only when needed
- no runtime lock language on blueprint surfaces

## StageStudy

### Must contain
- stage goal
- unlock or milestone summary
- ordered stage-step script
- one optional support line when the stage needs it

### Must not contain
- duplicated compact-card process hints
- repeated mini-cards for the same routine steps

### Mobile rule
Phone study should feel like:
- path
- selected node
- attached script

It must not feel like a stack of chapter cards.

## StageDetail

### Must contain
- stage identity
- full purpose and intended outcome
- unlock logic or milestone logic
- ordered stage-step script
- support or check-in logic when relevant

### May contain
- cycle estimate
- deeper coaching notes
- milestone-test explanation

## Editor Preview Rule
Blueprint editor and stage editor previews may reuse `StageCompact` plus an
ordered script below it, but the compact node itself must still remain
goal-first.

Editor previews must not reintroduce routine strips into the compact node.
