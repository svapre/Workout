# Execution Review Brief

This bundle is intentionally narrow. It is only for reviewing the **routine execution grammar** and the **player contract**.

## What Changed

- Routine entries can now own explicit `entryBlocks`
- Work blocks can explicitly declare:
  - `metricType`
  - `side`
  - `holdSeconds`
  - `tempoLabel`
- Simple unilateral entries can declare `sideMode`, which auto-expands into explicit side-switch flow
- Routine Detail now tries to mirror the executable script instead of showing prose or flat metadata
- Player now uses block-level metrics instead of inferring everything from the activity or entry

## Intended Rule

The routine should behave like an executable script:

- If the player needs a distinct screen/state
- that thing should exist as a distinct block in the routine

Examples:

- `work`
- `rest`
- `switch_side`
- `transition before next activity`

## Why This Review Exists

We stress-tested the system with a custom routine that includes:

- unilateral work with explicit left/right sequencing
- switch-side instructions
- set rest
- between-activity transition
- variable reps and load
- timed work
- hold-per-rep semantics
- alternating timed work with tempo

Earlier failures included:

- timed blocks still showing rep inputs
- side behavior being implied by notes instead of explicit blocks
- rest and transition not being distinct enough
- routine detail rows wasting space while still conveying too little

## What To Judge

Please judge whether the routine now reads like a **clear executable flow**:

- parent activity entry
- nested execution blocks inside it
- separate between-entry transition

And whether the player now feels like it is **following the routine exactly**, rather than inventing behavior from hidden logic.
