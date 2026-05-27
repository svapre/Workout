# Workout Tracker

A personal training operating system. Not a workout tracker — a deterministic execution engine for structured transformation.

## Structure

### V2: Web App (Current)
Located in `app/web/`.

A dependency-free, fully offline, mobile-first web application built with Vanilla JS (ES Modules) and localStorage.

**Key Features:**
- Structured plan execution with stages, milestones, and progression
- Exercise library with body-map visuals, domains, and tracking modes
- Routine templates with tempo, side-mode, and block-level authoring
- Blueprint-to-active-plan lifecycle (create → activate → execute → archive)
- Living-plan editing and external revision import with review
- Workout player with execution flow, rest timers, and milestone tests
- Plan-centric workout history with journey snapshots and stage timelines
- Full import/export for coach/AI feedback loop
- Installable as a mobile web app (PWA-lite via manifest)
- 30+ Playwright audit scripts for automated regression and UX testing

**To run locally:**
```bash
cd app/web
python -m http.server 8000
```
Then open `http://localhost:8000`.

**Documentation:** See `app/docs/` for architecture rules, data spec, UI contracts, and decision log. Start with `app/docs/ONBOARDING.md`.

**Audit suite:** See `app/web/*.mjs` for Playwright-based visual and functional audits. Run any audit with `node <audit-name>.mjs` (requires Playwright and a running local server).

### V1: Python/Sheets Pipeline (Legacy)
Located in `legacy_v1/`.

The original version — an automated pipeline that ingested workout data from the **Strong app** (via CSV export), processed it through Python, and synced it to a **Google Sheet** dashboard.

See `legacy_v1/PROJECT_OVERVIEW.md` for V1 documentation.

## License
MIT — see [LICENSE](LICENSE).
