# Architecture Rules

## Stack
- Vanilla JS, ES modules only
- No frameworks (no React, Vue, Svelte, etc.)
- No build step, no bundler
- No external dependencies
- localStorage only, fully offline

## Separation of Concerns
Views:     render HTML strings only, zero business logic
Services:  business logic only, no DOM manipulation
Repositories: data access only, one per data type
Display models: projection layer only, turns repository records into
detail/compact/study models for views without creating new sources of truth

Body-map visuals use a generated raster asset pipeline:
- neutral front/back figures are the visible base art
- one mask PNG per supported region is the runtime highlight source
- the build source of truth lives outside runtime code in
  `app/web/assets/body-map/build_raster_body_assets.py`
- the extraction workflow is documented in `BODY_MAP_EXTRACTION_SPEC.md`

Screen contracts: owner/compact/detail responsibilities are locked in
SCREEN_CONTRACTS.md and must be followed before adding new inline content
to higher screens

Naming and compact/mobile behavior are additionally governed by
UI_LANGUAGE_CONTRACT.md and MOBILE_COMPACT_VIEW_CONTRACT.md

Public UI term: `Activity`
Internal storage key: `exerciseId`

Stage depth and shared step semantics are additionally governed by
STAGE_SURFACE_CONTRACT.md and STAGE_STEP_CONTRACT.md

## Single Source of Truth
One owner per data type. Views resolve at render time.
Never store copies of data in views or services.

Resolution chain:
- Exercise names/types → Exercise Repository via exerciseId
- Routine structure → Routine Repository via routineId
- Stage/milestone data → Active Plan stages array
- Active state → Active Plan top-level fields
- Session logs → Workout Repository

NEVER store exercise names in routine entries or sessions.
ALWAYS store exerciseId and resolve name at render time.

Display-model rule:
- New activity metadata appears on Activity Detail first by default
- Higher screens consume display models, not raw exercise/routine records
- Metadata only propagates upward when explicitly marked compact and
  roll-up eligible in the exercise metadata registry
- Shared study components may be reused across blueprint and active-plan
  study, but they must read from the correct source array for that
  context (`blueprint.stages` vs `activePlan.stages`)

## File Structure
app/web/src/
  core/           → router.js, store.js, uid.js
  data/
    repositories/ → one file per data type (bodyMap, exercise, plan, routine, workout)
    csv/          → csv import/export (exerciseCatalogCsv.js, routineCsv.js)
    import/       → JSON import (trainingPlanImport.js)
    storage/      → localStore.js persistence wrapper
    schemaMigration.js  → versioned schema migration and validation
    defaults.js         → starter plan/routine/exercise seed data
    defaultExerciseCatalog.js → shipped exercise catalog
    defaultWorkoutHistory.js  → seed workout history
    starterContent.js   → versioned starter content sync
    historySnapshot.js  → archived/removed plan snapshot creation
  features/       → one folder per feature
    exercises/    → exerciseView.js, exerciseService.js
    routines/     → routineView.js, routineDetailView.js, routineService.js, executionFlow.js
    plans/        → plansView.js, planService.js, progressionEngine.js, stageProgression.js,
                    studyView.js, journeyNodes.js, stageStepViews.js, stageStudy.js,
                    activePlanRevision.js
    workouts/     → workoutView.js, historyWeekRail.js
    activePlans/  → activePlansView.js, activePlanDetailView.js,
                    activePlanEditorView.js, activePlanRevisionView.js
    workoutPlayer/ → workoutPlayerView.js
    dashboard/    → dashboardView.js
    library/      → shared body visuals and display-model helpers
                    (bodyVisuals.js, displayModels.js, primaryVisuals.js, metadataPrimitives.js)
  ui/             → shell.js, modal.js, semanticColors.js

## CSS Rules
- Shared layout and component rules live in UI_FRAMEWORK.md
- Prefer shared tokens and shared classes in styles.css before adding
  feature-specific styling
- Inline styles are allowed only for truly instance-specific values such as
  per-plan accent colors when a shared class cannot express them cleanly
- Promote recurring patterns into the shared system instead of copying
  one-off view styles
- No new external stylesheets

## Rules That Must Never Be Broken
- Do NOT add frameworks
- Do NOT add external dependencies
- Do NOT build a recommendation engine
- Do NOT make the app interpret reflection or feedback data and act on it
- Do NOT bring back activeState nested object
- Do NOT store exercise names, always store exerciseId
- Do NOT write sessions to active plan, use workoutRepository
- Do NOT add analytics dashboards to the main UI
- Do NOT add social features
- Do NOT add AI chat or suggestion features
- Do NOT modify schema field names without updating SPEC.md
  and getting human approval first
- Do NOT hand-edit body-map masks in runtime code; regenerate them through
  the body-map build pipeline and update the extraction spec if the
  workflow changes

## What Requires Human Review Before Implementation
See REVIEW_PROTOCOL.md for the full process.
These changes ALWAYS require review:
- Any change to data schemas
- Any new repository or data store
- Any new feature that did not previously exist
- Any change to the progression engine logic
- Any change to how sessions are written or read
- Any UI that introduces user choices during execution mode
