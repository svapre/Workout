# Execution Review Brief

This bundle is intentionally narrow. It is only for reviewing the **routine execution grammar**, the **player contract**, the **flow-first routine detail overview**, and the newer **rep-goal + tempo model**.

## What Changed

- Routine entries can own explicit `entryBlocks`
- Work blocks can explicitly declare:
  - `metricType`
  - `side`
  - `holdSeconds`
  - `tempo`
  - `repTargetMode`
- Rep goals are now part of the rep contract itself:
  - `exact` -> `6 reps`
  - `minimum_plus` -> `6+ reps`
  - `max` -> `Max reps`
- Player now surfaces open-ended rep goals as a `Goal` fact and asks for `Actual reps`
- Routine Detail now defaults to a **flow-first execution lane** instead of a document/spec layout
- Tempo is now rendered as explicit guidance instead of raw shorthand:
  - phased tempo -> `Down 3s`, `Bottom hold 1s`, `Up 1s`, `Top hold 1s`
  - cadence tempo -> `Each rep 4s`

## Intended Rule

The routine should behave like an executable script:

- if the player needs a distinct screen/state
- that thing should exist as a distinct block in the routine

Examples:

- `work`
- `rest`
- `switch_side`
- `transition before next activity`

## Why This Review Exists

We now have two important manual-check shapes:

- a **max-parameter routine** that stresses:
  - rep goal
  - side
  - load
  - hold
  - tempo
  - switch
  - rest
  - transition
- a **minimal timed block**

Earlier failures included:

- rep goals being split confusingly across `reps` and `AMRAP`
- timed blocks showing irrelevant rep inputs
- side behavior being implied by notes instead of explicit blocks
- long tempo strings overflowing routine-detail cells
- routine detail rows wasting space while still conveying too little
- tempo shorthand like `3-1-1-1` being too opaque for a user who does not already know tempo notation

## What To Judge

Please judge whether the routine now reads like a **clear executable flow**:

- parent activity entry
- nested execution blocks inside it
- separate between-entry transition
- explicit tempo phases that a user can understand without decoding shorthand

And whether the player now feels like it is **following the routine exactly**, rather than inventing behavior from hidden logic.
