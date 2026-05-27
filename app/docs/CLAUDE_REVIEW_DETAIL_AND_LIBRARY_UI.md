# Claude Review Packet: Semantic Overview + Remaining Framework

This packet is for a **structure / information-architecture** review, not a beautification review.

## Current State

The app has already gone through:

- base-to-journey screen split
- canonical Exercise / Practice detail
- canonical Routine detail
- separate Study surfaces for stages
- domain-aware visuals for physical vs mental activities
- a semantic overview pass for routines and stages

We are now at the point where the remaining issues are **not** "make the old density fixes again."
They are a smaller set of unresolved framework questions.

## Current Product Hierarchy

- Exercise / Practice = smallest stable owner record
- Routine = reusable composed session block
- Stage = progression layer over routines / rest / tests
- Plan = staged structure
- Active Plan = runtime state

## Current Direction

- Overview/action screens are separate from Study screens
- Higher layers should only show **compact** summaries of the layer below
- Physical records can use body-target visuals
- Mental records can use family-driven visuals instead of body maps
- Routine detail now tries to express session character through:
  - focus
  - format
  - pace
  - feel
  - session length
  - transition style
- Stage Study now tries to express stage character through:
  - stage overview
  - milestone
  - setup
  - compact routine previews

## What Needs Review Now

Please review these current UI layers:

1. Exercise / Practice library cards
2. Routine library cards
3. Exercise detail
4. Routine detail
5. Blueprint detail
6. Active plan detail
7. Active plan study

## Current Concerns

These are the unresolved framework questions we want reviewed against actual app/web patterns, not intuition:

1. **Exercise library visual meaning**
   - Physical cards currently show target/body emphasis.
   - But should the compact visual tell you **what movement/practice this is** at a glance, not just where it targets?
   - Is the compact visual contract still incomplete?

2. **Routine semantics**
   - Routine detail now shows format / pace / feel / duration / transitions.
   - Is that enough to communicate what the session is like?
   - Are those the right semantic buckets?
   - Are routine rows correctly treated as `entries / activities` rather than `steps`?

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
- what equipment or mode it uses

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

If needed, include the user-captured screenshots from the chat as additional evidence for specific complaints.

## Questions To Answer

1. What is structurally working now?
2. What still needs framework work before beautification?
3. Is the **exercise compact visual** still underdefined?
   - target-first
   - movement/practice-first
   - hybrid
4. Is the **routine semantic overview** strong enough now?
   - focus
   - format
   - pace
   - feel
   - duration
   - transitions
5. What is still too text-heavy in:
   - blueprint detail
   - active plan detail
   - active plan study
6. What do strong examples from workout apps, meditation apps, and course/path apps do differently here?
7. Are we ready to start beautification, or is one more framework pass recommended first?
