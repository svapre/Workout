# Decision Log
Append only. Never delete entries. Newest at top.

Format for new entries:
## 2026-05-08 - [Short Title]
Decision: what was decided
Reason: why it was decided
Impact: which files/systems are affected
---

## 2026-05-08 - Imports And Revisions Enforce Exercise Capability Rules
Decision: Imported training plans, full blueprint imports, and active-plan
revision packages now block unsupported routine prescriptions and
unsupported milestone test combinations instead of silently accepting
them. Validation happens before writes so failed imports remain atomic.
Reason: The editor, runtime, and docs already agree on the exercise
capability model. Import paths must enforce the same rules or they
become a backdoor for schema drift and confusing runtime behavior.
Impact: trainingPlanImport.js, planService.js, activePlanRevision.js,
schemaMigration.js, import audits, future content imports

## 2026-05-08 - Exercise Modeling Uses Stable Identity + Separate Variations
Decision: Exercise records represent stable movement identities for
planning and evaluation, not full instructional encyclopedias. If the
same movement can be prescribed or tested in more than one valid way,
keep one exercise and list the valid modes in
`supportedTrackingModes`. If the variation changes the movement or the
benchmark in a meaningful way, create a separate exercise instead.
Notes remain human guidance only and should not become the source of
truth for engine logic.
Reason: Keeps the library reusable and easy to extend without
duplicating plan-specific data, while preventing unrelated movement
variations from collapsing into one ambiguous exercise record.
Impact: exercise catalog authoring, routine authoring, milestone tests,
future imports, future AI onboarding

## 2026-05-08 - Exercises Use Default + Supported Tracking Modes
Decision: Exercises now keep a single `trackingType` as the default or
preferred tracking mode, plus `supportedTrackingModes` as the allowed
set of valid prescription/test modes for that exercise. Routine
entries and milestone tests continue to own the exact numeric
prescription values.
Reason: Keeps the exercise catalog simple and reusable while allowing
movements like Bird Dog to be prescribed or tested with more than one
valid mode without turning the catalog into an encyclopedia or
duplicating plan-specific data on the base exercise.
Impact: SPEC.md, schemaMigration.js, exercise catalog/import/export,
routine editor, stage editors, workout player

## 2026-05-08 - Finished Sessions Persist Before Reflection
Decision: A session is now persisted as soon as the execution work is
complete. Reflection remains optional follow-up metadata on the saved
session, rather than the action that determines whether the session
exists at all. The final logged set also goes straight to completion
instead of forcing one last rest screen.
Reason: Once the user has finished the prescribed work, leaving should
not feel like abandoning an in-progress workout. This keeps the runtime
honest, prevents accidental data loss, and makes the post-session flow
feel more intuitive.
Impact: workoutPlayerView.js, workoutRepository.js, workoutService.js,
app.js

## 2026-05-08 - Repository Seeding Owns Bootstrap
Decision: First-run/bootstrap seeding stays inside the repository
layer only. The app shell no longer performs a destructive
"master seed reinjection" cascade when a specific seed blueprint is
missing from local data.
Reason: Existing local libraries and plans must never be wiped just
because a seed template was deleted, renamed, or intentionally absent.
Impact: app.js, planRepository.js, exerciseRepository.js,
routineRepository.js, workoutRepository.js

## 2026-05-08 - Direct Live Plan Edits Use Draft + Remap Review
Decision: Active plans can now be edited directly in-app through a
draft-based live-plan editor. Clean edits apply immediately, while
current-stage edits that break the current day mapping must go
through the remap review flow before apply.
Reason: The living document should be editable in the app without
silently corrupting runtime state or forcing every change through an
export/import loop.
Impact: app.js, activePlanEditorView.js, activePlanDetailView.js,
activePlanRevisionView.js, activePlanRevision.js, planService.js,
shell.js

## 2026-05-08 - Living-Plan Revisions Preserve Runtime History
Decision: Active-plan revisions now import through the exported
active-plan package shape, review on a dedicated screen, and apply
only to metadata plus current/future stage structure.
Completed stages stay frozen. Sessions, session IDs, and local
runtime history remain owned by the local active plan.
Reason: Coaches and AI can revise the living document without
rewriting the user's completed journey or corrupting workout history.
Impact: planService.js, activePlanRevision.js, app.js,
activePlanRevisionView.js, activePlanDetailView.js

## 2026-05-08 - Shared Library Items Never Overwrite In Place During Revision Import
Decision: Living-plan revision imports may add new body targets,
exercises, or routines into the shared libraries, but they never
overwrite existing shared items in place. Conflicting body targets
block the import. Conflicting exercises or routines fork into new
shared-library items with new IDs and the revised active plan is
remapped to those items.
Reason: Protects other plans from silent library mutations while
keeping the import package self-contained.
Impact: activePlanRevision.js, planService.js, exerciseRepository.js,
routineRepository.js, bodyMapRepository.js

## 2026-05-08 - Milestone Gates Use Eligibility Plus Explicit Tests
Decision: Stage milestones now split into `eligibility`, optional
explicit `test`, and plan-defined `onFailure` transitions.
Exercise tests may inherit details from a stage routine entry or
define a standalone/custom test directly in the milestone.
Reason: This makes stage progression deterministic without forcing
the app to infer capability from routine history alone. Plans can
gate stage advancement on explicit assessments, including tests that
are not part of the normal working routine.
Impact: SPEC.md, schemaMigration.js, progressionEngine.js,
plansView.js, workoutPlayerView.js, activePlanDetailView.js

## 2026-05-08 - Milestone Tests Are Logged As Explicit Sessions
Decision: Milestone attempts write as workout sessions with
`sessionType: "milestone_test"` and a `milestoneTest` payload that
records the tested exercise, metric, target, and pass/fail result.
Reason: The app needs a deterministic audit trail for stage tests
without guessing from ordinary training sessions.
Impact: SPEC.md, workoutRepository.js, workoutPlayerView.js,
progressionEngine.js, export package

## 2026-05-08 - Active Plan Display Name
Decision: Active plans keep a top-level `displayName` field
separate from `name`.
Reason: `name` preserves the blueprint-derived plan identity.
`displayName` is the user-visible instance name so the same
blueprint can be activated multiple times without ambiguity.
Impact: SPEC.md, schemaMigration.js, planService.js,
activePlanService.js, active plan UI

## 2026-05-08 - Reflection Rating Added to Session Schema
Decision: Added reflectionRating field to workout sessions.
Values: "strong" | "normal" | "difficult" | null
Reason: Ceremony layer needs to persist subjective signal
for export to coach/AI. App does NOT act on this data,
only surfaces it in export.
Impact: workoutRepository.js, workoutPlayerView.js,
export package

## 2026-05-08 - No Deload Suggestions From App
Decision: App will never use reflection ratings to generate
suggestions or modify plan behaviour autonomously.
Deload/modification routes through plan onFailure rules only.
Reason: Protects execution-engine identity. App is a runtime,
not a recommendation engine.

## 2026-05-08 - Active Plan Is Living Document
Decision: Active plan is NOT a snapshot of blueprint.
It is the user's personal evolving plan with its own
version history and stages array.
Blueprint is static template for provenance only.
Reason: Coaches need to add stages mid-journey without
losing the user's existing progress data.
Impact: planService.js, activePlanService.js

## 2026-05-08 - No activeState Nested Object
Decision: Removed activeState nested object from active plan.
All fields flattened to top level of active plan.
Reason: Nested object caused SSOT violations and drift.
Critical: Any code reading activeState.* is a bug.
Impact: All files that read active plan data.

## 2026-05-08 - Sessions Write To Workout Repository Only
Decision: Completed sessions write to workoutRepository only.
Active plan stores session IDs in sessions array.
No dailyLogs nested in active plan.
Reason: SSOT - sessions have one owner.
Impact: workoutPlayerView.js, workoutRepository.js

## 2026-05-08 - Body Map Database
Decision: Separate database for body targets.
Pre-populated with 14 muscle groups.
Exercises link via bodyTargets array of IDs not string names.
localStorage key: workout-app.bodymap.v1
Reason: Enables training load analysis across muscle groups.

## 2026-05-08 - Schedule Uses Explicit Rest Type
Decision: Schedule entries use
{ type: "routine" | "rest", routineId }
Rest days are explicit, not implied by empty routineId.
Reason: Engine needs to deterministically identify rest days.

## 2026-05-08 - App Never Makes Training Decisions
Decision: The app executes plan rules. It does not generate,
suggest, or modify training content autonomously.
All progression rules are defined in the plan data.
The app reads and executes them. Nothing more.
Reason: Core product philosophy. Non-negotiable.
