# AI Onboarding - Read This First

You are being onboarded onto the Workout App project.
Read every file in this docs/ folder before doing anything.
Do not write any code until you have read all of them.

## Reading Order
1. VISION.md - what this product is and is not
2. SPEC.md - locked data schemas
3. ARCHITECTURE.md - technical rules
4. UI_FRAMEWORK.md - shared visual and interaction system
5. SCREEN_CONTRACTS.md - owner/compact/detail screen scaffold
6. DECISIONS.md - why things are the way they are
7. CHANGELOG.md - what was recently changed
8. REVIEW_PROTOCOL.md - when to stop and get review

## Project Location
app/web/

## Current Stack
- Vanilla JS, ES modules
- No framework, no build step
- localStorage only, offline first
- Playwright available for testing

## Current State
[THIS SECTION MUST BE UPDATED AFTER EVERY MAJOR CHANGE]

Last updated: 2026-05-27

Completed:
- Data layer migration to locked schema
- Active plan is living document, no activeState object
- Active plans now keep a formal `displayName` field for instance naming
- Sessions write to workoutRepository only
- Reflection ratings now persist on sessions as `reflectionRating`
- Stages can now define optional `feedbackPrompts`, and sessions can persist `feedbackResponses` for symptom-led or subjective check-ins without the app auto-interpreting them
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
- History is now a plan-centric journey review surface with active, archived, and removed snapshots, stage history timelines, revision history, and full session timelines instead of only a flat workout list
- Removing an active plan now preserves a read-only removed journey snapshot in history, while archiving preserves a read-only archived snapshot through the same historical storage path
- Exercises now use `trackingType` as the default/preferred mode plus `supportedTrackingModes` as the allowed prescription/test modes, so one movement can legally support more than one mode without duplicating plan-specific targets on the exercise itself
- Routine editing, stage milestone editors, CSV/import normalization, and the workout player now respect supported exercise modes and the actual prescription fields instead of assuming one exercise can only ever be logged one way
- Training-plan JSON imports, full blueprint imports, and active-plan revision packages now enforce the same exercise capability rules as the editor/runtime and block unsupported routine or milestone mode combinations before writing data
- Starter content now ships with a broader physical + mental default library, including strength, mobility/yoga, breathwork/meditation, and posture/rehab starter plans
- Starter content is now versioned app-owned baseline content; fresh installs seed it automatically and existing installs receive missing shipped items through bootstrap sync
- A visible starter-content audit now covers physical, yoga, and meditation starter plans plus archive/remove history preservation, and the broad final regression still passes afterward
- Fresh installs now ship with four richer starter blueprints instead of the earlier lightweight set: `Grounded Strength Path`, `Steady Balance Flow`, `Posture Rebuild Path`, and `Ten-Stage Attention Training`
- The meditation starter pack now includes a ten-stage attention-training journey with stage names, milestone descriptions, longer seated tests, and enough structure to stress the roadmap and history surfaces realistically
- The starter library now includes more realistic weight, resistance, rehab, yoga, and meditation exercises/routines so framework issues show up under stronger content instead of being hidden by generic plans
- Stages now carry dedicated `guidance`, and both blueprint detail and active-plan detail expose stage-chapter study sections with schedule and equipment context
- The visible starter-content audit now validates the richer pack by re-syncing removed starter items and running sessions across strength, yoga, rehab, and meditation plans
- UI Framework v1 is now documented as the shared source of truth for hierarchy, spacing, button roles, panels, motion restraint, and anti-drift rules
- The first framework application pass now covers the shared button/surface system plus the Home card rhythm, Active Plan Detail action hierarchy, and the Workout Player pre-workout screen
- The broader framework rollout now covers Exercises, Routines, Blueprint detail/editor, Stage Editor, and History so those screens share calmer action hierarchy, better metadata alignment, and safer destructive-action placement
- The visible responsive audit still passes after the wider framework rollout across phone, tablet, and desktop smoke layouts, and the broad final regression still passes afterward
- The UI now follows the base-to-journey hierarchy directly: Exercise -> Routine -> Stage -> Plan -> Active runtime
- Exercise metadata now resolves through a shared registry + display-model layer, so new exercise fields land on Exercise Detail first and only roll upward when explicitly marked compact + roll-up eligible
- Routines now have a canonical read-only detail route, and exercises keep a canonical detail route that study/routine surfaces link into instead of duplicating lower-level truth inline
- Blueprint study and active-plan study now live on separate routes with shared components but different data sources, so an active plan never accidentally reads stale blueprint stage data after revisions
- Blueprint detail and active-plan detail are now overview/action surfaces with compact roadmaps plus study entry points instead of inline stage-chapter readers
- The architecture pass now has a model-level propagation check (`base-to-journey-model-check.mjs`) and a visible route-flow audit (`base-to-journey-audit.mjs`) in addition to the responsive audit
- Screen owner contracts are now explicitly documented in SCREEN_CONTRACTS.md, including what Exercise, Routine, Stage, Plan, and Active Plan compact/detail surfaces must contain and must not contain
- Exercise detail now owns the first real body-target visual, and exercise compact cards now use smaller body visuals plus shorter focus/equipment/tracking summaries instead of relying on text chips alone
- Routine detail now owns the aggregate routine body visual and compact exercise rows, with editing demoted into a tools disclosure instead of sitting high in the read surface
- Exercise Library now includes lightweight search + scope organization scaffolding, and the responsive audit now covers both exercise library and exercise detail in addition to the existing screens
- Activity records now derive explicit `domains` / `primaryDomain`, so the library can distinguish physical, mental, and mind-body records without a schema fork
- Mental-only records now use a practice-profile visual instead of an empty body map, while physical and mind-body records still use the body-target visual
- Activity Library now uses stable top-level scopes (`All`, `Physical`, `Mental`, `Mind-body`) with category filtering underneath them
- The old combined-guide body-map extraction path has been retired; body visuals now use locked Style C neutral front/back art plus one separately generated overlay image per supported muscle region
- The runtime body-map assets are now generated by `app/web/assets/body-map/build_raster_body_assets.py`, and the pipeline contract is documented in `BODY_MAP_EXTRACTION_SPEC.md`
- The latest mobile and responsive UI audits both pass with the overlay-derived body-map assets in place
- The web app now exposes a manifest, app icons, and home-screen metadata so it is installable as a lightweight mobile web app shell without creating a separate native client
- Poco X6 viewport audit scripts now exist for targeted device-level UI/UX testing at 442×983px with device scale factor, touch simulation, and mobile user agent
- A comprehensive deep audit script checks horizontal overflow, touch target minimums (44px), mobile nav occlusion, and workout history ordering across all major screens
- A 12-screenshot blind review packet system exists for external AI UX review, with neutral filenames and a structured review prompt
- A documentation-freshness check (`doc-freshness-check.mjs`) now validates that key docs are not stale when source code changes, enforcing the docs-in-same-commit rule
- A service worker (`sw.js`) is registered for basic offline caching support

Needs verification:
- Optional richer desktop-specific polish if the project later decides desktop deserves more than a smoke-tested fallback layout
- Ongoing end-to-end regression coverage whenever a new logic-heavy living-plan feature lands
- Simultaneous dual-metric prescriptions inside one routine entry are still not a first-class workflow; the current model supports multiple valid modes per exercise, but each prescription/test still chooses one primary mode at a time

## Current Priority
[UPDATE THIS SECTION WHEN STARTING A NEW SESSION]
- Run the Poco X6 deep audit and fix any confirmed UX issues before moving forward
- Ensure all documentation stays current; the doc-freshness-check enforces this
- Expand the curated starter content only when it improves real plan coverage without turning the app into an exercise encyclopedia
- Keep the plan-centric history review surface focused on retrospective clarity rather than drifting into analytics-heavy dashboards
- Decide later whether true simultaneous dual-metric prescriptions are worth modeling, now that the single-primary-mode rule is enforced consistently across editor, runtime, and imports
- Validate the framework against the richer starter plan pack before starting beautification, especially around stage-roadmap density, current-mission emphasis, and secondary-action placement
- Keep the shipped starter baseline app-owned and versioned instead of surfacing a separate recovery button in the main Plans UI
- Delay the dedicated beautification phase until the richer data confirms that remaining issues are visual polish problems instead of framework/content-structure problems
- Keep the shared responsive template and visible Playwright audits current as new living-plan flows are added
- Validate the new base-to-journey screen split against richer real plans before starting beautification; any remaining issues should be framework/data-source issues first, not theme polish
- Extend routine/stage/plan previews only through the metadata registry/display-model contract so future exercise fields do not force view-by-view rewrites
- Keep visual compact summaries aligned with owner contracts: Exercise owns body visuals, Routine owns aggregate body visuals, Stage owns schedule meaning, and Plan/Active Plan stay overview-first
- Keep future body-map changes on the overlay-based pipeline; do not reopen the combined multicolor guide path unless the extraction contract changes deliberately
- Simplify Stage Study next so it consumes the lighter RoutineCompact contract instead of inheriting routine/exercise density upward
- Keep the new domain-aware library model stable: physical, mental, and mind-body should stay meaningful because they describe what the activity explicitly requires, not incidental effects
- The service worker is in place for basic caching; deeper offline install story is deferred

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
