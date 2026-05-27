# Decision Log
Append only. Never delete entries. Newest at top.

Format for new entries:
## 2026-05-08 - [Short Title]
Decision: what was decided
Reason: why it was decided
Impact: which files/systems are affected
---

## 2026-05-15 - Body Map Uses Locked Style C Neutrals Plus Per-Region Overlays
Decision: The body-map asset system now uses locked Style C neutral front/back figures as the visible base art and one separately generated overlay image per supported muscle group as the mask source. The older combined multicolor guide workflow is no longer the source of truth.
Reason: The combined guide prompts kept collapsing region boundaries on the front view and made extraction brittle. The overlay workflow preserves one silhouette per view, makes each region independently regenerable, and produces cleaner deterministic masks.
Impact: app/web/assets/body-map/*, build_raster_body_assets.py, BODY_MAP_EXTRACTION_SPEC.md, bodyVisuals.js, future body-map art updates

## 2026-05-15 - Mobile Delivery Uses Installable Web Shell, Not A Separate Native App
Decision: The current mobile deliverable remains the responsive web app, but it now exposes a manifest and home-screen metadata so it can be installed and launched like a mobile app. We are not creating a separate native codebase or a new runtime architecture.
Reason: The app already passes mobile and responsive audits, and the highest-value mobile step is installability without introducing a second platform or a build pipeline.
Impact: app/web/index.html, app/web/manifest.webmanifest, app/web/assets/icons/*, future mobile packaging decisions

## 2026-05-13 - Solo AI Review Split Locks Blind UX vs Informed Review
Decision: This project now uses a lightweight reviewer split. OpenAI 5.4 in the IDE is the default implementer, verifier, and contract checker. Claude Sonnet on the web is the default blind UX reviewer and should receive only rendered UI evidence. Claude Opus in the IDE is optional and should be reserved for architecture, product-philosophy, or conflict-resolution questions. Mobile portrait review principles are locked: the whole row or header owns the tap on phone, inline expansion already communicates selection, and desktop-style selected or viewing indicators should not be added on mobile unless explicitly approved.
Reason: Broad informed reviews and early contract updates kept reintroducing desktop-style micro-affordances into mobile screens. The process needs a simpler separation between human-like UI review and informed implementation review so the blind reviewer evaluates what the app actually communicates, while the IDE agent handles code, tests, and contract checks.
Impact: AI_REVIEW_WORKFLOW.md, REVIEW_PROTOCOL.md, BLIND_REVIEW_PROMPT.md, cross-ai review packet prompts, future UI review loops

---

## 2026-05-09 - Activity Cards Share One Shell, But Mental Visuals Are Family-Driven
Decision: Activity library cards keep one shared outer shell, CTA rhythm,
and metadata contract, but the primary visual is now allowed to differ by
domain. Physical and mind-body records continue to use data-driven body
target visuals, while mental-only records use simpler family-driven
practice cues instead of a nested mini text card.
Reason: The first mental visual pass was structurally wrong because it
acted like another text block inside the card. The library was also too
dense because cards were repeating domain/category/tracking in multiple
places. A shared shell with lighter metadata and domain-specific visuals
keeps scanability without forcing false symmetry.
Impact: primaryVisuals.js, exerciseView.js, displayModels.js, styles.css,
SCREEN_CONTRACTS.md

## 2026-05-09 - Routine Detail Owns Aggregate Body Visual, Exercise Library Gets Search + Scope Scaffold
Decision: Routine Detail is now the canonical routine owner surface with
one aggregate overview, one aggregate body visual, compact exercise rows,
and editing moved into a lower-priority tools disclosure. The Exercise
Library now includes lightweight scale scaffolding through local search and
scope controls instead of relying on an unfiltered card grid alone.
Reason: The screen contracts require each owner layer to show its own full
data plus only the compact form of the layer below. Routine detail had
been duplicating overview data and acting too much like an editor, while
the growing exercise library needed organization structure before
beautification.
Impact: routineDetailView.js, routineView.js, exerciseView.js,
displayModels.js, bodyVisuals.js, responsive-ui-audit.mjs, styles.css

## 2026-05-09 - Activity Records Now Use Domains, And Mental Records Get A Practice Visual
Decision: Activity records now derive explicit `domains` /
`primaryDomain` values instead of relying on `type` alone. The library is
organized by stable top-level scopes (`All`, `Physical`, `Mental`,
`Mind-body`) with category filtering beneath them. Mental-only records now
use a practice-profile visual instead of an empty body map, while physical
and mind-body records continue to use the body-target visual.
Reason: The body-target visual is meaningful for physical and hybrid
records, but it communicates very little for mental-only practices. The
library also needed a more durable organizer than raw `type` values once
the product started holding physical exercises, mental practices, and
hybrid yoga-style records together.
Impact: schemaMigration.js, displayModels.js, primaryVisuals.js,
exerciseView.js, routineView.js, routineDetailView.js, defaultExerciseCatalog.js,
styles.css

## 2026-05-09 - Exercise Detail Owns The Body Visual
Decision: Exercise detail is now the first owner surface to use a body
target visual as the primary representation of muscle focus. Exercise
compact can reuse a smaller body visual, while higher layers must continue
to consume only compact exercise summaries rather than inline full target
metadata.
Reason: Body targets are stable, well-defined metadata that visuals convey
better than repeated text chips. This reduces text heaviness at the
lowest layer first and establishes the correct owner surface before
routine and stage previews are simplified further.
Impact: exerciseView.js, displayModels.js, shared body-visual primitive,
styles.css, future routine aggregate body-map work

## 2026-05-09 - Screen Contracts Lock Owner Detail vs Compact Preview
Decision: The UI scaffold now explicitly separates each hierarchy layer
into compact preview plus canonical detail contracts. Higher screens may
show their own full data plus the compact preview of the layer below, but
must not inline the lower layer's full canonical detail. Exercise owns
body visuals, Routine owns aggregate body visuals, Stage study owns stage
guidance and schedule meaning, and Plan/Active Plan stay overview/action
surfaces.
Reason: The base-to-journey architecture improved routing and data-source
ownership, but screen density drifted because owner-level content kept
leaking upward. Locking the contracts prevents Study from turning into
Routine Detail and prevents Plan Detail from turning into inline chapter
reading again.
Impact: SCREEN_CONTRACTS.md, UI_FRAMEWORK.md, ARCHITECTURE.md,
ONBOARDING.md, future exercise/routine/stage/plan UI changes

## 2026-05-09 - Base-To-Journey Screens Use Shared Models, Not Raw Records
Decision: The UI now follows the product hierarchy directly:
Exercise -> Routine -> Stage -> Plan -> Active runtime. Exercise and
routine each have canonical read-only detail surfaces, study uses
shared components but separate blueprint vs active-plan routes, and
blueprint/active-plan detail screens stay overview/action surfaces
instead of inline readers. Exercise metadata now flows upward through a
registry-driven display-model layer, so new exercise fields appear on
Exercise Detail by default and only propagate into routine/stage/plan
previews when explicitly marked compact + roll-up eligible.
Reason: The earlier screens drifted because they were trying to be
overview, roadmap, study, tools, and history all at once. Shared
projection models keep single-source-of-truth intact while letting lower
data evolve safely.
Impact: app.js routing/context, shell back flow, exerciseView.js,
routineView.js, routineDetailView.js, studyView.js, activePlanDetailView.js,
plansView.js, display-model builders, future metadata extensions like
side-balance or richer exercise context

## 2026-05-09 - Stages Need Readable Chapter Guidance
Decision: Stages now carry a dedicated `guidance` field so a plan can
explain what each stage is for in readable chapter-style language.
Equipment remains derived from the stage schedule and milestone test
exercise rather than being duplicated onto the stage itself.
Reason: Richer starter plans exposed that stage names plus milestone
copy were not enough to study a plan. Users need to inspect any stage as
guidance, not just as a progression node.
Impact: SPEC.md, defaults.js, schemaMigration.js, blueprint detail,
active-plan detail, blueprint/live stage editors

## 2026-05-09 - Starter Blueprints Must Be Rich Enough To Test The Framework
Decision: Fresh installs now ship with a more deliberate starter blueprint
pack: one richer strength path, one yoga/balance ladder, one
posture-rehab rebuild, and one ten-stage attention-training meditation
journey. Existing installs now receive missing shipped starter items
through versioned bootstrap sync instead of a visible recovery button.
Reason: Generic or underspecified plans hide framework problems. The UI
and progression system need realistic, multi-stage content before the
beautification phase can be judged fairly.
Impact: defaults.js, defaultExerciseCatalog.js, basic-ready-audit.mjs,
starter-content testing, future framework validation, app.js bootstrap

## 2026-05-08 - UI Framework V1 Uses Shared Hierarchy Before Screen-Specific Styling
Decision: The app now uses a documented UI framework baseline with one
primary action per screen section, grouped supporting actions, isolated
danger actions, a fixed spacing scale, shared panel/card grammar, and
restrained motion. Shared tokens and shared classes must be preferred
before feature-specific styling.
Reason: The product has reached the point where visual drift is a larger
risk than missing styles. A documented framework gives future UI work one
source of truth instead of letting each screen invent its own hierarchy.
Impact: UI_FRAMEWORK.md, ARCHITECTURE.md, styles.css, Home, Active Plan
Detail, Workout Player, future audits and UI polish passes

## 2026-05-08 - History Preserves Archived And Removed Journey Snapshots
Decision: Archiving or removing an active plan now preserves a read-only
historical snapshot in `workout-app.archivedPlans.v1` instead of leaving
history to reconstruct the journey only from orphaned sessions. Snapshot
metadata distinguishes `archived` vs `removed` journeys and records when
the history snapshot was captured.
Reason: The history surface should help users and coaches revisit the full
journey context, not just isolated workout sessions. Removing a plan from
the active queue should not destroy the reviewable record of that plan.
Impact: app.js, historySnapshot.js, workoutView.js,
activePlanDetailView.js, archived plan storage, history UI

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

## 2026-05-09 - Stage Feedback Prompts Added As Generic Check-ins
Decision: Stages may define optional `feedbackPrompts`, and
workout sessions may persist `feedbackResponses`.
These are simple text check-ins for symptom-led or subjective
stages such as rehab, recovery, or sensation-focused work.
Reason: Rehab-style plans need structured user feedback without
adding a rigid symptom schema or letting the app auto-interpret
the result.
Impact: schemaMigration.js, workoutPlayerView.js,
workoutView.js, stage editors, starter rehab content
