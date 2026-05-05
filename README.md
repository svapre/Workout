# Workout Tracker

This repository contains tools for tracking and planning workouts, focused on desk-bound users recovering from injury.

## Structure

The project has evolved into two distinct versions:

### V2: New Web App (Current)
Located in the `app/` directory.

This is the active development version. It is a dependency-light, modular browser application built with Vanilla JS (ES Modules).

Features include:
- Internal exercise library with import/export
- Routine template editing
- Browser local persistence
- Routine CSV import/export
- Multi-routine plan import
- Seeded workout history view

To run the new app locally:
```bash
cd app/web
python -m http.server 8000
```
Then navigate to `http://localhost:8000`.

See `app/README.md` for more details on the V2 architecture.

### V1: Python/Sheets Pipeline (Legacy)
Located in the `legacy_v1/` directory.

The original version of this project was an automated pipeline that ingested workout data from the **Strong app** (via CSV export), processed it through a Python script, and synced it to a **Google Sheet** with a visual dashboard.

It is preserved here for reference and legacy use.

See `legacy_v1/PROJECT_OVERVIEW.md` for full documentation on how the V1 pipeline works.
