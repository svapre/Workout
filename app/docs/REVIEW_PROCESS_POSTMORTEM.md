# Review Process Postmortem

This document records what happened in the recent plan-family review loop.
It is a diagnosis document, not a protocol change by itself.

## Purpose

Explain why desktop-style mobile indicators returned after earlier mobile-first cleanup,
and identify the process failures that allowed review feedback to override already-stated product principles.

## Locked Product Principles That Should Have Won

- Mobile portrait is the source of truth for runtime and Study surfaces.
- On phone, the whole stage row or stage header should own the tap when the user is selecting or opening a stage.
- On phone, expanded content already communicates which stage is open; a separate `Selected`, `Viewing`, or similar badge is usually redundant.
- A trailing pill on phone implies pill-only interactivity unless the UI makes whole-row ownership unmistakable.
- Touch clarity should be solved first through row/header treatment, spacing, and state change, not through desktop-style micro-controls.

## What Drifted

### 1. Detail-path mobile affordances drifted toward pill-first interaction

- Later-stage nodes in detail views remained whole-node navigation targets, but the UI emphasized a trailing `Study stage >` affordance.
- That created the impression that only the pill is tappable, even though the full node owns the action.
- Relevant implementation:
  - [activePlanDetailView.js](/d:/code/Workout/app/web/src/features/activePlans/activePlanDetailView.js:116)
  - [plansView.js](/d:/code/Workout/app/web/src/features/plans/plansView.js:331)
  - [journeyNodes.js](/d:/code/Workout/app/web/src/features/plans/journeyNodes.js:146)

### 2. Mobile Study selection drifted toward desktop-style selected-state labeling

- The mobile Study surface originally moved toward a softer "selected node + attached script" model.
- Review feedback repeatedly called mobile selection "too subtle."
- That feedback was implemented as explicit micro-affordances: `Open / Selected`, then `Select / Selected`, then `View stage / Viewing` plus a helper hint.
- On desktop that kind of label can help because the detail pane is separate. On mobile it is mostly redundant because the node expands inline.
- Relevant implementation:
  - [studyView.js](/d:/code/Workout/app/web/src/features/plans/studyView.js:167)
  - [journeyNodes.js](/d:/code/Workout/app/web/src/features/plans/journeyNodes.js:133)
  - [journeyNodes.js](/d:/code/Workout/app/web/src/features/plans/journeyNodes.js:148)
  - [journeyNodes.js](/d:/code/Workout/app/web/src/features/plans/journeyNodes.js:151)

### 3. Review findings were promoted into contracts too early

- The review loop did not just identify problems; it changed the contract stack.
- Once "explicit touch selection cue" became contract language, later reviews kept forcing visible control treatments instead of asking whether the mobile-first interaction principle should override them.
- Relevant contract lines:
  - [PLAN_INTERACTION_CONTRACT.md](/d:/code/Workout/app/docs/PLAN_INTERACTION_CONTRACT.md:71)
  - [PLAN_INTERACTION_CONTRACT.md](/d:/code/Workout/app/docs/PLAN_INTERACTION_CONTRACT.md:72)
  - [PLAN_SURFACE_REDESIGN_CONTRACT.md](/d:/code/Workout/app/docs/PLAN_SURFACE_REDESIGN_CONTRACT.md:256)
  - [PLAN_SURFACE_REDESIGN_CONTRACT.md](/d:/code/Workout/app/docs/PLAN_SURFACE_REDESIGN_CONTRACT.md:258)

## Timeline Of The Drift

### Baseline movement toward the correct mobile model

- [CHANGELOG.md](/d:/code/Workout/app/docs/CHANGELOG.md:48)
  - `Plan Compact Translation + Mobile Study Cleanup`
  - mobile Study was being softened toward a selected path node with an attached script

### Review-driven reintroduction of explicit mobile indicators

- [CHANGELOG.md](/d:/code/Workout/app/docs/CHANGELOG.md:34)
  - `Final Plan Study + Blueprint Compare Pass`
  - introduced visible `Open / Selected` mobile Study cues

- [CHANGELOG.md](/d:/code/Workout/app/docs/CHANGELOG.md:27)
  - `Plan Freeze Candidate Review Cleanup`
  - changed those cues to `Select / Selected`

- [CHANGELOG.md](/d:/code/Workout/app/docs/CHANGELOG.md:20)
  - `Blueprint Compare + Mobile Study Selection Pass`
  - strengthened the selection treatment again

- [CHANGELOG.md](/d:/code/Workout/app/docs/CHANGELOG.md:12)
  - `Study Node Grammar + Compare Card Tightening`
  - changed the wording again to `View stage / Viewing` and added an explicit touch hint

## Why The Process Allowed This

### Broad review prompts rewarded adversarial criticism over locked philosophy

- The current packet prompt explicitly asks reviewers to be critical and not assume the current direction is correct.
- That is useful for discovering structural problems, but harmful after the architecture is already mostly stable.
- Relevant lines:
  - [PROMPT_FOR_ANY_AI.txt](/d:/code/Workout/app/docs/cross-ai-review-bundles-latest/plan-thorough/PROMPT_FOR_ANY_AI.txt:32)
  - [PROMPT_FOR_ANY_AI.txt](/d:/code/Workout/app/docs/cross-ai-review-bundles-latest/plan-thorough/PROMPT_FOR_ANY_AI.txt:36)
  - [PROMPT_FOR_ANY_AI.txt](/d:/code/Workout/app/docs/cross-ai-review-bundles-latest/plan-thorough/PROMPT_FOR_ANY_AI.txt:38)

### The process had no "locked product principles" gate

- Reviews were allowed to keep questioning interaction grammar that had already been directed by the human product owner.
- There was no explicit rule saying: "mobile portrait interaction principles outrank reviewer preference unless the human approves a change."

### The contract stack blurred "must be obvious" into "must have a visible control"

- "Explicit selection cue" was interpreted too literally.
- Instead of strengthening the whole row/header as the tap target, the implementation kept adding labeled pills and selection micro-controls.

### The same component served desktop and mobile too literally

- [journeyNodes.js](/d:/code/Workout/app/web/src/features/plans/journeyNodes.js) became the shared answer for both desktop and phone.
- That encouraged a unified affordance treatment where the product likely needs breakpoint-specific interaction emphasis even when the data object is shared.

## What The Reviews Got Right

- Blueprint comparison density on mobile was a real issue.
- Mobile Study did need clearer touch behavior than the weakest early version.
- Desktop Study and detail-page ownership did improve because of the review process.

## What The Reviews Got Wrong Or Overweighted

- They overweighted explicit mobile selection controls instead of evaluating whether inline expansion already answered "which stage am I viewing?"
- They encouraged desktop-like affordance language on phone when the whole row already owned the action.
- They encouraged contract drift on unresolved mobile grammar instead of asking whether the human's mobile-first interaction principle had already answered the question.

## Proposed Rules For The Next Process Revision

These are proposals, not active rules yet.

1. Lock product principles before broad review.
2. Review feedback may identify blockers, but may not override a locked product principle without explicit human approval.
3. Do not promote reviewer complaints into contracts until they are filtered through product philosophy and breakpoint intent.
4. After one broad review, switch to blocker-only confirmation reviews instead of reopening the whole family.
5. For mobile-first surfaces, solve touch clarity through whole-row or whole-header ownership before adding pills, badges, or labeled micro-controls.
6. When desktop and mobile share a component, allow different interaction emphasis by breakpoint if the meaning is the same but the affordance burden is different.

## Immediate Audit Questions For Any Future Review

- Does this review comment contradict a locked mobile-first interaction rule?
- Is the reviewer asking for a visible control where a stronger whole-row state change would be better?
- Is this a real task blocker, or just a request for more explicit UI chrome?
- Are we changing a contract because of one review, or because the product owner approved a philosophy-level change?

## Current Conclusion

The `Study stage >` pill emphasis and the mobile `Selected / Viewing` style came back because review feedback was allowed to outrank the app's mobile-portrait interaction philosophy. The next process revision should prevent that class of drift before another broad review cycle happens.