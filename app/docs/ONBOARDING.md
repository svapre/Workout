# AI Onboarding - Read This First

You are being onboarded onto the Workout App project.
Read every file in this docs/ folder before doing anything.
Do not write any code until you have read all of them.

## Reading Order
1. VISION.md - what this product is and is not
2. SPEC.md - locked data schemas
3. ARCHITECTURE.md - technical rules
4. DECISIONS.md - why things are the way they are
5. CHANGELOG.md - what was recently changed
6. REVIEW_PROTOCOL.md - when to stop and get review

## Project Location
app/web/

## Current Stack
- Vanilla JS, ES modules
- No framework, no build step
- localStorage only, offline first
- Playwright available for testing

## Current State
[THIS SECTION MUST BE UPDATED AFTER EVERY MAJOR CHANGE]

Last updated: 2026-05-08

Completed:
- Data layer migration to locked schema
- Active plan is living document, no activeState object
- Active plans now keep a formal `displayName` field for instance naming
- Sessions write to workoutRepository only
- Reflection ratings now persist on sessions as `reflectionRating`
- Stage milestones now use `eligibility` plus optional explicit milestone tests
- Milestone tests can bind to a stage routine entry or define a standalone/custom exercise test
- Failed milestone tests can keep the user in-stage, restart the stage, or send them to another stage according to plan data
- Restart-stage failures now open a fresh stage-history episode so session-based milestone unlocks truly reset
- Body map pre-populated with 14 muscle groups
- Dashboard redesign with execution-first UI
- Dashboard/detail/player primary CTAs now inherit plan theme colors more consistently
- Exercise, routine, blueprint, and workout-history screens now use stronger mobile card hierarchy and phone-safe scroll behavior
- Shared shell, modal, page spacing, detail-shell, and editor layout patterns are now hardened for current-generation phone screens
- Home and active-plan detail now participate in the same phone-sized UI audit as the library and editor screens
- Shared layout patterns now also cover short landscape phones, tablet portrait, tablet landscape, and a lightweight desktop smoke baseline
- A visible multi-viewport audit now covers phone landscape, tablet portrait, tablet landscape, and desktop smoke checks with no horizontal overflow or console/page errors
- Ceremony + reflection layer (Strong/Normal/Difficult)
- Execution mode now removes the shell header and nav structurally on workout-player routes
- Workout player now scrolls correctly on mobile and uses compact phone layouts for pre-workout, active-set, and rest screens
- Stage roadmap on active plan detail screen
- Active plan detail progress now reflects milestone-aware progress text
- Stage history is seeded on activation and advances on milestone-driven stage transitions
- Training JSON imports now resolve routine entries to `exerciseId` and fail atomically on unresolved references
- Active plan detail screen can export a spec-shaped active plan package
- Active plan detail screen can also import a revised active-plan package into a dedicated review screen before applying
- Living-plan revisions now preserve local runtime history, freeze completed stages, and allow current/future stage changes only
- Shared-library conflicts during living-plan revision imports now fork new routines or exercises instead of overwriting existing shared items in place
- Stale active-plan revisions require explicit acknowledgement and missing current-stage mappings require a manual anchor before apply
- Active plans can now be edited directly in-app through a draft-based live-plan editor
- Direct live-plan saves auto-apply safe edits and route risky current-stage changes through the same remap review before apply
- Direct live-plan edits append `versionHistory` with `modifiedBy: "user"` while keeping sessions and completed-stage history intact
- The old destructive master-seed reinjection path is gone; repository bootstrap seeding now owns first-run defaults without wiping existing local data
- A visible joined-up regression now passes across safe boot, direct live-plan editing, routine execution, active-plan export, revision import, and continued progression after apply
- Local favicon is now present and the mobile UI audit no longer reports the prior local 404 asset noise
- Rest steps now use neutral UI copy and, when they complete a milestone, active-plan detail makes stage advancement the clear primary action instead of burying it beside a generic continue CTA
- Dashboard rest-step cards now reflect stage-complete and stage-ready states directly instead of staying visually stuck on a generic rest CTA
- Active plan detail now exposes explicit archive and remove-from-active-list actions, and final-stage completion can promote archiving as the primary next move
- Finished sessions now persist before reflection, the final logged set goes straight to completion instead of forcing one last rest screen, and leaving the post-session screen no longer triggers an abandon-workout confirmation once the work is done
- Reflection remains optional after completion and now updates the already-saved session instead of deciding whether the session exists at all
- History now includes plan-aware slices for active plans, archived plans, and removed-plan remnants instead of only a flat session list
- Exercises now use `trackingType` as the default/preferred mode plus `supportedTrackingModes` as the allowed prescription/test modes, so one movement can legally support more than one mode without duplicating plan-specific targets on the exercise itself
- Routine editing, stage milestone editors, CSV/import normalization, and the workout player now respect supported exercise modes and the actual prescription fields instead of assuming one exercise can only ever be logged one way
- Training-plan JSON imports, full blueprint imports, and active-plan revision packages now enforce the same exercise capability rules as the editor/runtime and block unsupported routine or milestone mode combinations before writing data

Needs verification:
- Optional richer desktop-specific polish if the project later decides desktop deserves more than a smoke-tested fallback layout
- Ongoing end-to-end regression coverage whenever a new logic-heavy living-plan feature lands
- Simultaneous dual-metric prescriptions inside one routine entry are still not a first-class workflow; the current model supports multiple valid modes per exercise, but each prescription/test still chooses one primary mode at a time

## Current Priority
[UPDATE THIS SECTION WHEN STARTING A NEW SESSION]
- Decide whether true simultaneous dual-metric prescriptions are worth modeling later, now that the current single-primary-mode rule is enforced consistently across editor, runtime, and imports
- Keep the living-plan editing workflow smooth now that both import-first revision and direct in-app editing exist
- Deepen plan/history analytics only if they still preserve the deterministic runtime identity and stay out of the main execution flow
- Keep the shared responsive template and visible Playwright audits current as new living-plan flows are added

## Exercise Modeling Rule
- Exercise records are planning/evaluation identities, not full how-to encyclopedias
- If the same movement can be prescribed or tested in multiple valid ways, keep one exercise and use `supportedTrackingModes`
- If the variation changes the movement or benchmark meaningfully, create a separate exercise instead of overloading one record
- Keep exact prescription values on routine entries or milestone tests, not on the base exercise
- Use notes for human guidance only; do not rely on notes for engine-computed logic

## Rules You Must Never Break
See ARCHITECTURE.md for the full list.
Short version:
- No frameworks
- No external dependencies
- No recommendation engine
- No activeState nested object
- No storing exercise names
- No sessions in active plan object
- No schema changes without SPEC.md update and human approval

## Review Protocol
See REVIEW_PROTOCOL.md for the full process.
Short version:
- New feature -> get Claude review BEFORE building
- Built something -> show Claude AFTER building
- GPT suggests something unplanned -> check with Claude first
- Docs update in same commit as code change
