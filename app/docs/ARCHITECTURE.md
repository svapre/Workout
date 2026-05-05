# App Architecture

## Goal

Keep the app modular enough that we can change one concern without breaking unrelated features.

## Module Boundaries

### `web/src/core`

Shared infrastructure only.

- `router.js`: route state from the URL hash
- `store.js`: small reactive state container
- `uid.js`: stable id generation

Rules:

- no feature-specific logic here
- no CSV assumptions here
- no routine or workout domain rules here

### `web/src/data`

Persistence and serialization.

- `storage/`: storage adapters
- `repositories/`: repository interfaces over persisted data
- `csv/`: import/export translators
- `import/`: structured JSON import translators
- `defaults.js`: seed data only

Rules:

- knows how data is stored
- does not decide how UI looks
- does not own user interaction

### `web/src/features/exercises`

Internal exercise reference feature slice.

- `exerciseService.js`: import/export and catalog logic
- `exerciseView.js`: exercise library UI

Rules:

- owns exercise reference records
- accepts open import formats from people, apps, or AI tools
- does not own routine scheduling or workout history

### `web/src/features/routines`

Routine template feature slice.

- `routineService.js`: business rules for routines and exercises
- `routineView.js`: routine UI rendering and event wiring

Rules:

- owns template editing
- owns template CSV import/export behavior
- accepts generic plan-file imports that can create multiple routines
- does not own performed workout logs

### `web/src/features/workouts`

Workout history and future live workout logging.

Planned responsibility:

- imported workout history from existing data sources
- session lifecycle
- set timing
- actual reps and weight capture
- workout and set export

### `web/src/features/dashboard`

Future config-driven dashboard rendering.

Planned responsibility:

- load dashboard config
- resolve metrics
- render widgets from normalized workout data

### `web/src/ui`

Shared shell and presentational scaffolding.

- `shell.js`: top-level app frame and navigation

Rules:

- can compose features
- should not absorb feature business rules

## Why This Helps

If we later change:

- storage from `localStorage` to IndexedDB
- CSV format
- dashboard widget system
- workout timer behavior

we can do that mostly inside one module boundary instead of touching the whole app.

## Near-Term Build Order

1. Routine templates
2. Workout logging
3. Normalized exports
4. Dashboard config renderer
