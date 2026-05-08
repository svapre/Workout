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

## File Structure
app/web/src/
  core/           → router.js, store.js, uid.js
  data/
    repositories/ → one file per data type
    csv/          → csv import/export
    import/       → JSON import
  features/       → one folder per feature
    exercises/
    routines/
    plans/
    workouts/
    activePlans/
    workoutPlayer/
    dashboard/
  ui/             → shell.js, modal.js

## CSS Rules
- Inline styles only in view files
- Use existing CSS variables:
  var(--accent), var(--muted), var(--soft), var(--text)
- No new CSS classes unless absolutely unavoidable
- No new external stylesheets

## Rules That Must Never Be Broken
- Do NOT add frameworks
- Do NOT add external dependencies
- Do NOT build a recommendation engine
- Do NOT make the app interpret reflection data and act on it
- Do NOT bring back activeState nested object
- Do NOT store exercise names, always store exerciseId
- Do NOT write sessions to active plan, use workoutRepository
- Do NOT add analytics dashboards to the main UI
- Do NOT add social features
- Do NOT add AI chat or suggestion features
- Do NOT modify schema field names without updating SPEC.md
  and getting human approval first

## What Requires Human Review Before Implementation
See REVIEW_PROTOCOL.md for the full process.
These changes ALWAYS require review:
- Any change to data schemas
- Any new repository or data store
- Any new feature that did not previously exist
- Any change to the progression engine logic
- Any change to how sessions are written or read
- Any UI that introduces user choices during execution mode
