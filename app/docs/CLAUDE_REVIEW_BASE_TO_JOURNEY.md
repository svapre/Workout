# Base-to-Journey UI Review Packet

Last updated: 2026-05-09

## Purpose
This packet is for reviewing the current **framework / screen-architecture** pass, not beautification.

The core structural change is:
- `Exercise -> Routine -> Stage -> Plan -> Active runtime`
- blueprint and active-plan detail are now **overview/action** surfaces
- full reading moved into separate **Study** routes
- routine and exercise now have canonical **read-only detail** surfaces
- higher screens should summarize lower-level truth instead of duplicating it

## Screenshot Folder
Attach screenshots from:

`app/web/screenshots-e2e/base-to-journey-audit/`

## Navigation Flow Captured

1. `01-plan-library.png`
   - Route: `#/plans`
   - Purpose: blueprint library list
   - Review focus: scanability, primary actions, card density

2. `02-blueprint-detail.png`
   - Route: `#/plans` with a selected blueprint in detail mode
   - Purpose: blueprint overview/action surface
   - Review focus:
     - compact roadmap vs old inline chapter overload
     - whether tools/lifecycle are sufficiently deprioritized
     - whether the page now reads as overview + entry to study

3. `03-blueprint-study.png`
   - Route: `#/plan-study/<blueprintId>`
   - Purpose: blueprint stage-reading surface
   - Review focus:
     - one-stage-open-at-a-time density
     - whether this is the right place for full stage reading
     - whether routine previews are compact enough

4. `04-routine-detail.png`
   - Route: `#/routine/<routineId>`
   - Purpose: canonical read-only routine detail
   - Review focus:
     - whether the routine screen feels canonical rather than editor-first
     - whether aggregate metadata is useful without being noisy
     - whether routine entries read cleanly

5. `05-exercise-detail.png`
   - Route: `#/exercise/<exerciseId>`
   - Purpose: canonical exercise detail
   - Review focus:
     - metadata-first layout
     - whether this looks like the correct place for new exercise fields to land first
     - whether higher-level screens can safely stay lighter because of this screen

6. `06-home-dashboard.png`
   - Route: `#/active-plans`
   - Purpose: dashboard/home after activating a blueprint
   - Review focus:
     - compact orientation
     - whether cards are too dense or too empty
     - whether the screen answers “what’s next?” clearly

7. `07-active-plan-detail.png`
   - Route: `#/active-plan/<activePlanId>`
   - Purpose: active-plan overview/action surface
   - Review focus:
     - `Now + compact path + current/next summary + recent sessions + Study CTA`
     - whether the roadmap is still too dominant
     - whether recent-history/context is light enough
     - whether the page still feels overloaded

8. `08-active-plan-study.png`
   - Route: `#/active-plan-study/<activePlanId>`
   - Purpose: active-plan stage-reading surface
   - Review focus:
     - whether it clearly differs in role from Active Plan Detail
     - whether it correctly feels like “study the live journey as it exists now”
     - whether this should share more or less with blueprint study

## Important Architecture Rules For Review

- Roadmap is for **orientation**, not for detailed explanation.
- Study is for **full stage reading**.
- Routine detail and exercise detail are **canonical lower-level read surfaces**.
- Higher-level screens should consume lower-level truth through shared display models, not manual copied summaries.
- New exercise metadata should appear on Exercise Detail first and only flow upward if explicitly promoted through the metadata registry.
- The active-plan study route must read from `activePlan.stages`, not from the original blueprint.
- This review should focus on **structure, density, hierarchy, and navigation**, not color/theme/beautification.

## Specific Questions For Review

1. Is the split between **overview/action** and **study** now correct?
2. Is the roadmap compact enough, or still too heavy?
3. Are blueprint detail and active-plan detail now doing the right jobs?
4. Are study screens the right place for full stage reading, or do they still feel too dense?
5. Do routine and exercise details now feel canonical enough to support later metadata growth?
6. Is anything still duplicated between:
   - blueprint detail and blueprint study
   - active-plan detail and active-plan study
   - routine detail and study step previews
7. Does the dashboard remain compact enough, or is it still trying to tell too much?
8. Before beautification, what structural issues still remain?

