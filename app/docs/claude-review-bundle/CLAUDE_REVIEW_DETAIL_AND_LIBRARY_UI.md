# External Review Packet: Execution Language + Remaining Framework

This packet is for a **structure / information-architecture / execution-model** review, not a beautification review.

## Current State

The app has already gone through:

- base-to-journey screen split
- canonical Exercise / Practice detail
- canonical Routine detail
- separate Study surfaces for stages
- domain-aware visuals for physical vs mental activities
- semantic overview passes for routines and stages

The current checkpoint is no longer just about density. The remaining questions are about whether the app now behaves clearly enough as an **execution engine** before visual polish starts.

## Current Product Hierarchy

- Exercise / Practice = smallest stable owner record
- Routine = reusable composed session block
- Stage = progression layer over routines / rest / tests
- Plan = staged structure
- Active Plan = runtime state

## Current Direction

- Overview/action screens are separate from Study/detail screens
- Higher layers should only show **compact** summaries of the layer below
- Physical records can use body-target visuals
- Mental records can use family-driven visuals instead of body maps
- Routine detail now distinguishes:
  - **activity entry**
  - **nested execution blocks / pattern lane inside the entry**
  - **between-entry transition connector**
- Simple repeated entries are rendered as a visible work/rest pattern lane instead of long prose
- Explicit advanced blocks are supported in schema/runtime, but the editor still mostly authors the simpler repeated-set shape

## What Needs Review Now

Please review these current UI layers:

1. Exercise / Practice library cards
2. Exercise detail
3. Routine detail
4. Blueprint detail
5. Active plan detail
6. Active plan study

## Current Concerns

These are the unresolved framework questions we want reviewed against actual app/web patterns, not intuition:

1. **Routine execution language**
   - Does the current entry structure read clearly as:
     - activity header
     - execution lane inside the entry
     - transition between entries
   - Are the visible work / rest cues strong enough?
   - Are reps / duration / load / rest still too text-like?
   - Do we still need a stronger metric glyph / visual language?

2. **Exercise library visual meaning**
   - Physical cards currently still lean on target/body emphasis.
   - But should the compact visual tell you **what movement/practice this is** at a glance, not just where it targets?
   - Is the compact visual contract still incomplete?

3. **Stage / plan compression**
   - Stage Study is better, but may still be too text-heavy.
   - Blueprint detail and active-plan detail may still need one more compression pass before beautification.

4. **Framework vs beautification boundary**
   - Are we now close enough to move into beautification?
   - Or is one more framework pass still necessary?

## What Good Should Look Like

Users should be able to understand, at a glance:

- what this thing is
- what kind of thing it is
- what it mainly targets / trains / practices
- what the session / routine / stage is like
- what the execution rhythm is
- what equipment or mode it uses
- what happens next

And only then go deeper into explanatory text.

## Screenshot Set In Bundle

The bundle should include these current-state screenshots:

- `01-plan-library.png`
- `02-blueprint-detail.png`
- `04-routine-detail.png`
- `05-exercise-detail.png`
- `07-active-plan-detail.png`
- `08-active-plan-study.png`
- `desktop-02-active-plan-detail.png`
- `desktop-03-routine-detail.png`
- `desktop-04-exercise-library.png`
- `desktop-05-exercise-detail.png`
- `desktop-06-plan-detail.png`
- `phone-landscape-03-routine-detail.png`

If needed, include the user-captured screenshots from the chat as additional evidence for specific complaints.

## Questions To Answer

1. What is structurally working now?
2. What still needs framework work before beautification?
3. Is the **routine execution model** correct as:
   - activity header
   - nested execution lane
   - between-entry transition
4. For simple repeated entries, is a compact visible **work/rest lane** the right pattern?
5. What should the routine metric language communicate first?
   - reps / duration / load / rest
   - flow / rhythm
   - both, and how?
6. Is the **exercise compact visual** still underdefined?
   - target-first
   - movement/practice-first
   - hybrid
7. What is still too text-heavy in:
   - blueprint detail
   - active plan detail
   - active plan study
8. What do strong examples from workout apps, interval timers, meditation apps, and course/path apps do differently here?
9. Are we ready to start beautification, or is one more framework pass recommended first?
