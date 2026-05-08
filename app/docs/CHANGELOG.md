# Changelog
Newest first. Append only. Never delete entries.

Format for new entries:
## 2026-05-08 - [Feature or Fix Name]
- What changed
- Files affected
- Status: complete | needs-review | in-progress

---

## 2026-05-08 - Import Capability Hardening
- Training-plan JSON imports, full blueprint imports, and active-plan revision packages now reject unsupported routine prescriptions and invalid milestone test mode combinations instead of silently accepting them
- Full-plan import validation now happens before writes, so invalid imports stay atomic and do not partially add routines or plans
- Added a code-level import hardening check plus a visible revision-review Playwright audit covering blocked invalid revisions and successful valid revisions
- Status: complete
Files: schemaMigration.js, trainingPlanImport.js, planService.js, activePlanRevision.js, import-mode-hardening-check.mjs, revision-mode-hardening-audit.mjs, DECISIONS.md, CHANGELOG.md, ONBOARDING.md

## 2026-05-08 - Exercise Modeling Documentation Clarified
- Tightened the existing docs so future sessions do not have to rediscover the exercise-classification rule from chat history
- Documented that exercises are stable movement identities, multi-mode support belongs in `supportedTrackingModes`, materially different variations should become separate exercises, and notes are for human guidance only
- Status: complete
Files: SPEC.md, DECISIONS.md, ONBOARDING.md, CHANGELOG.md

## 2026-05-08 - Exercise Capability Modes
- Added `supportedTrackingModes` to exercises while keeping `trackingType` as the default/preferred mode, so one exercise can support more than one valid prescription/test mode without storing plan-specific values on the base exercise
- Routine editing, stage milestone editors, CSV/import normalization, and the workout player now respect supported modes and the actual prescription fields instead of assuming the exercise default is the only valid mode
- Bird Dog-style exercises can now be prescribed or tested as reps or duration, while routine entries still stay the source of truth for exact targets
- Status: complete
Files: schemaMigration.js, defaultExerciseCatalog.js, trainingPlanImport.js, exerciseCatalogCsv.js, routineCsv.js, exerciseView.js, routineView.js, plansView.js, activePlanEditorView.js, workoutPlayerView.js, progressionEngine.js, app.js, activePlanRevision.js, SPEC.md, DECISIONS.md, CHANGELOG.md, ONBOARDING.md

## 2026-05-08 - Dashboard Rest-State + History Upgrade
- Home rest-step cards now surface completed-stage states instead of staying visually stuck on generic rest CTAs; milestone-complete rest cards can now show review or stage-advance actions directly on the dashboard
- Active plan detail now exposes archive and remove-from-active-list actions, and final-stage completion promotes archiving as the primary action while still allowing the user to continue the current stage
- History is no longer a flat workout list; it now includes plan-aware filtering across active plans, archived plans, and removed-plan remnants so past journeys and sessions can be revisited together
- Added a visible Playwright audit covering dashboard rest-step completion, final-stage archive flow, active-plan removal, and the upgraded history slices for archived and removed plans
- Status: complete
Files: activePlansView.js, activePlanDetailView.js, workoutView.js, app.js, history-rest-audit.mjs, CHANGELOG.md, ONBOARDING.md

## 2026-05-08 - Rest-Step + Completion Flow Hardening
- Reframed rest-day UI copy into neutral rest-step language and made stage-readiness explicit after a rest-step completion
- Active plan detail now promotes the single most relevant next action, so stage advancement becomes the clear primary CTA when a milestone is reached
- Finished sessions now persist before reflection, final sets no longer force an unnecessary last rest screen, and leaving the post-session screen no longer triggers an abandon-workout prompt
- Added a visible targeted Playwright audit covering rest-step completion, post-session exit behavior, reflection persistence, and the still-open mixed-tracking Bird Dog limitation
- Status: complete
Files: app.js, activePlansView.js, activePlanDetailView.js, narrativeService.js, workoutPlayerView.js, workoutRepository.js, workoutService.js, exploratory-ux-audit.mjs, CHANGELOG.md, ONBOARDING.md

## 2026-05-08 - Bootstrap Hardening + Final Regression
- Removed the destructive master-seed reinjection path so existing local libraries are no longer wiped just because a specific seed blueprint is missing
- Added a broad visible Playwright regression covering safe boot without reseeding, direct live-plan editing, routine execution, active-plan export, revision import, and continued progression after apply
- Added a reusable visible-audit PowerShell wrapper so future headed Playwright runs can reuse one stable command pattern instead of ad hoc browser-launch commands
- Status: complete
Files: app.js, run-visible-audit.ps1, final-regression-audit.mjs, CHANGELOG.md, DECISIONS.md, ONBOARDING.md

## 2026-05-08 - Direct Live Plan Editing
- Added a direct in-app live-plan editor for active plans, reusing the blueprint-style editor shell while freezing completed stages and allowing metadata plus current/future stage edits
- Live-plan saves now auto-apply clean edits, while risky current-stage changes route through the existing review/remap screen before writing to the active plan
- Successful direct edits now append `versionHistory` with `modifiedBy: "user"` and preserve sessions, runtime counters, and completed-stage history ownership
- Added a visible Playwright audit covering direct metadata save, frozen completed stages, manual remap review, return-to-editor behavior, and successful remap apply
- Status: complete
Files: app.js, activePlanDetailView.js, activePlanEditorView.js, activePlanRevisionView.js, activePlanRevision.js, planService.js, shell.js, live-plan-editor-audit.mjs, run-visible-audit.ps1, CHANGELOG.md, DECISIONS.md, ONBOARDING.md

## 2026-05-08 - Living-Plan Revision Import
- Added an import-first active-plan revision workflow with a dedicated review screen, active-plan detail entrypoint, and safe apply path that preserves local session history and runtime ownership
- Imported active-plan revisions now normalize shared-library dependencies by adding new body targets, exercises, and routines when needed, while never overwriting existing shared library items in place
- Current and future stages can be revised, completed stages stay frozen, stale revisions require explicit acknowledgement, and missing current-stage mappings force a manual anchor before apply
- Added a visible Playwright audit covering happy-path revision apply, stale warning acknowledgement, manual anchor remap, and blocking body-target conflict behavior
- Status: complete
Files: app.js, activePlanDetailView.js, activePlanRevisionView.js, activePlanRevision.js, planService.js, shell.js, schemaMigration.js, living-plan-revision-audit.mjs, CHANGELOG.md, DECISIONS.md, ONBOARDING.md

## 2026-05-08 - Responsive Layout Expansion Pass
- Expanded the shared layout system for short landscape phones, tablet portrait, tablet landscape, and a lightweight desktop smoke layout without breaking the phone-first execution flow
- Added responsive shell and content refinements for compact-height devices, wider active-plan grids, and a cleaner workout-history split at tablet portrait sizes
- Added a visible multi-viewport Playwright audit covering phone landscape, tablet portrait, tablet landscape, and desktop smoke checks with no horizontal overflow and no console or page errors
- Status: complete
Files: styles.css, responsive-ui-audit.mjs

## 2026-05-08 - UI Framework Hardening Pass
- Standardized the shared shell, page spacing, action rows, detail shells, sticky active-plan CTA container, and modal behavior so phone-sized screens either fit cleanly or scroll intentionally
- Rebuilt home, active-plan detail, exercise detail, routine editor, blueprint detail/editor, stage editor, and workout history around the same mobile-safe layout primitives and removed the remaining visible mojibake from the main UI
- Added a local SVG favicon and expanded the visible Playwright mobile audit to cover home plus active-plan detail in addition to exercises, routines, plans, editors, and workout history
- Verified on a visible phone-sized Playwright run with no console or page errors and no horizontal overflow across the audited screens
- Status: complete
Files: styles.css, shell.js, activePlansView.js, activePlanDetailView.js, exerciseView.js, routineView.js, plansView.js, workoutView.js, modal.js, mobile-ui-audit.mjs, index.html, favicon.svg, schemaMigration.js

## 2026-05-08 - Milestone Test State Machine
- Replaced flat stage milestones with an eligibility-plus-test model so stages can unlock an explicit milestone test before advancing
- Added stage-entry and standalone/custom exercise tests, plus plan-defined failure outcomes for stay, restart-stage, or goto-stage transitions
- Workout player now supports milestone-test sessions, failed-test handling, explicit stage restarts/demotions, and stage-history episode resets when a plan restarts a stage
- Verified in a visible Playwright audit across pass-and-advance, pass-and-stay, restart-stage failure, goto-stage demotion, rest-step completion, duration-based input, and active-plan export
- Status: complete
Files: schemaMigration.js, stageProgression.js, progressionEngine.js, plansView.js, workoutPlayerView.js, activePlanDetailView.js, dashboardView.js, journeyContext.js, app.js, SPEC.md, DECISIONS.md

## 2026-05-08 - Library + Planning Mobile UI Pass
- Rebuilt the Exercise Library, Routine Library, and Plan Blueprints list cards around the active-plan card rhythm for stronger hierarchy on phone-sized screens
- Moved blueprint activation into an above-the-fold summary card, fixed stage-editor mobile overflow, and made workout history surface the selected detail first on mobile
- Verified on a visible phone-sized Playwright audit across exercises, routines, plans, blueprint editor, stage editor, and workout history with no layout-related console/page errors
- Status: complete
Files: exerciseView.js, routineView.js, plansView.js, workoutView.js, styles.css, mobile-ui-audit.mjs

## 2026-05-08 - Mobile Workout Player Fit + Scroll Fix
- Workout player now uses an internal immersive scroll container on execution routes so tall mobile screens can still reach lower controls
- Added compact mobile layouts for pre-workout, active-set, and rest screens to keep key controls in view on phone-sized viewports
- Verified on a visible mobile Playwright pass with a duration-based exercise, pause/resume, partial, skip set, skip rest, milestone transition, reflection, and rest-day no-routine flow
- Status: complete
Files: workoutPlayerView.js, styles.css

## 2026-05-08 - Execution Mode + Journey Progress Polish
- Workout-player routes now remove the shell header and mobile nav structurally, with immersive main-content layout
- Active plan detail progress now reflects milestone-aware progress text instead of assuming every stage is cycle-based
- Dashboard, active-plan detail, and workout-player primary CTAs now inherit plan theme colors more consistently
- Status: complete
Files: shell.js, styles.css, activePlansView.js, activePlanDetailView.js, workoutPlayerView.js

## 2026-05-08 - Schema Alignment Pass
- Session writes now persist `reflectionRating` and legacy `perceivedDifficulty` reads migrate cleanly
- Workout player now resolves exercise names from `exerciseId` at render time, logs `partial` and `skipped` sets correctly, and advances `stageHistory` only on real stage transitions
- Training JSON imports now resolve routine entries against existing and same-file exercises, remap imported routine IDs in stage schedules, and fail atomically when any exercise reference is unresolved
- Added spec-shaped active-plan export from the active plan detail screen
- Status: complete
Files: workoutPlayerView.js, journeyContext.js, trainingPlanImport.js, planService.js, app.js, activePlanDetailView.js, workoutView.js, SPEC.md, DECISIONS.md, ONBOARDING.md

## 2026-05-08 - Ceremony + Reflection Layer
- Added session completion ceremony screen
- Added 3-button reflection step (Strong/Normal/Difficult)
- Added Clean Immersive Mode (hides nav during ceremony)
- Added continuity messaging for rest days
- Status: needs-review (reflectionRating persistence unverified)
Files: workoutPlayerView.js, styles.css

## 2026-05-08 - Stage Roadmap UI
- Added Stage Roadmap card to Active Plan detail screen
- Dot track showing completed/current/locked stages
- Current stage detail with milestone description
- Fixed grammar: "1 stage remaining" vs "stages remaining"
Files: activePlanDetailView.js

## 2026-05-08 - Dashboard Redesign
- Added "Good morning" greeting with context
- TODAY'S MISSION framing on plan cards
- Rest day cards visually differentiated
- RECOVERY FOCUS messaging for rest days
- Next session name resolved and displayed
Files: activePlansView.js, styles.css

## 2026-05-08 - Data Layer Migration
- Migrated exercise schema (mode -> trackingType, summary -> description)
- Migrated routine schema (exercises -> entries, field renames)
- Migrated plan blueprint schema (versioning, onFailure, requiresContinuous, predecessorStageId, typed schedule)
- Migrated active plan (removed activeState, flattened fields)
- Created bodyMapRepository with 14 muscle groups
- Sessions now write to workoutRepository not active plan
Files: all repositories, planService.js, activePlanService.js, workoutPlayerView.js
