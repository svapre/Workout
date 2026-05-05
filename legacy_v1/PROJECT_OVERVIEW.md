# Workout Tracker — Project Overview

## What This Is

An automated fitness & rehabilitation tracking system for desk-bound users recovering from injury. It ingests workout data from the **Strong app** (via CSV export), processes it through a Python pipeline, and syncs it to a **Google Sheet** with a visual dashboard and a science-based progression roadmap.

---

## Target Profile

- **Physical**: Desk-bound professionals or students with long sitting hours.
- **Goal**: Transition from sedentary/rehab phase to active strength training.
- **Philosophy**: Data-driven, clean metrics, and progressive overload with safety gates.

---

## Architecture

```
Phone (Strong App)
    │
    ▼ Export CSV → Save to Google Drive
┌─────────────────────────┐
│  "Workout Tracker Inbox" │  ← Google Drive folder
│   (shared with service   │
│    account)              │
└──────────┬──────────────┘
           │
    ┌──────▼──────┐
    │  Processor   │  ← Python (watcher.py) or Google Apps Script (apps_script.js)
    │  1. Download │
    │  2. Parse    │
    │  3. Classify │
    │  4. Upload   │
    └──────┬──────┘
           │
    ┌──────▼──────────────────┐
    │  Google Sheet            │
    │  "Workout Tracker"       │
    │  ├── Daily_Log (data)    │
    │  └── Dashboard (visuals) │
    └─────────────────────────┘
```

---

## File Map

### Core Pipeline

| File | Purpose |
|---|---|
| `config.py` | All configuration: sheet names, keywords, CSV column mapping, 5-stage progression roadmap definition |
| `csv_parser.py` | Parses Strong CSV exports. Auto-detects delimiter (comma vs semicolon). Handles `Duration (sec)` and `Weight (kg)` column variants via keyword-based fuzzy matching. Groups sets into `DailyWorkout` objects. |
| `classifier.py` | Takes `DailyWorkout` → produces `ClassifiedDay`. Classifies as Full/Half/Skip based on how many Stage 1 keywords appear. Extracts pushup volume, total volume (reps×weight), total sets, exercise list. |
| `sheets_client.py` | Google Sheets API client using `gspread`. Writes to columns A-G with idempotent date-based dedup. Columns H-K (Pain, Energy, Sitting, Notes) are reserved for manual user input and never overwritten. |
| `main.py` | CLI entry point: `python main.py --csv <file.csv>`. Orchestrates parse → classify → upload. Has UTF-8 safe console output for Windows. |

### Automation

| File | Purpose |
|---|---|
| `watcher.py` | Polls the "Workout Tracker Inbox" Google Drive folder for new CSVs. Downloads, processes via the core pipeline, moves processed files to a `processed/` subfolder. Run with `--once` for single scan or without args for continuous polling (30s interval). |
| `apps_script.js` | **Self-contained Google Apps Script** — paste into the sheet's script editor. Runs every 15 minutes via a time trigger. Contains its own CSV parser, classifier, and uploader (independent of the Python code). Handles semicolon delimiters. |
| `cloud_function/main.py` | **Self-contained Cloud Function** — deployable to Google Cloud Functions. Same logic as apps_script.js but in Python. Triggered by Cloud Scheduler. Not yet deployed. |
| `cloud_function/requirements.txt` | Dependencies for cloud function: gspread, google-api-python-client, google-auth |

### Dashboard & Formatting

| File | Purpose |
|---|---|
| `setup_dashboard.py` | Applies full visual formatting to the Dashboard tab via Sheets API: 9 metric cards, 2 charts (pushup volume bar chart, duration line chart), personal records, conditional formatting on Daily_Log (green=Full, yellow=Half, red=Skip), dark Catppuccin Mocha theme. |
| `setup_roadmap.py` | Reads Daily_Log data, auto-detects current progression stage, calculates gate progress percentages, writes the 5-stage roadmap section to the Dashboard tab with color-coded stage nodes and status badges. |
| `dashboard_preview.html` | **Responsive mobile-first web dashboard** that reads live data from the published Google Sheet via CSV URL. Works on any phone browser. Self-contained HTML+CSS+JS, no framework. |

### Docs & Config

| File | Purpose |
|---|---|
| `docs/SETUP.md` | Setup guide: Google Cloud Console project, service account, API enablement |
| `credentials.json` | Service account key (gitignored) |
| `requirements.txt` | Python dependencies: `pandas`, `gspread` |
| `sample_data/strong_export.csv` | Sample CSV for testing (comma-delimited, 3 days) |

---

## Google Sheet Structure

**Spreadsheet Name**: `Workout Tracker`
**Spreadsheet ID**: `[YOUR_SPREADSHEET_ID]`

### Daily_Log Tab — Columns

| Col | Header | Source | Description |
|---|---|---|---|
| A | Date | Python | YYYY-MM-DD |
| B | Workout_Type | Python | Full / Half / Skip |
| C | Duration (min) | Python | Workout length in minutes |
| D | Pushup_Volume | Python | Total pushup reps that day |
| E | Total_Volume | Python | Sum of (reps × weight) across all exercises |
| F | Total_Sets | Python | Total number of sets |
| G | Exercises | Python | Comma-separated list of unique exercise names |
| H | Pain_Level | **Manual** | User enters: Better / Same / Worse |
| I | Energy | **Manual** | User's subjective energy level |
| J | Sitting (hrs) | **Manual** | Hours spent sitting that day |
| K | Notes | **Manual** | Free text |

**Important**: The Python pipeline ONLY writes to columns A-G. Columns H-K are safe for manual user input and will never be overwritten.

### Dashboard Tab

Formatted via `setup_dashboard.py` and `setup_roadmap.py`. Contains:
- Rows 1-4: Title block
- Rows 5-13: 9 metric cards (3×3 grid)
- Rows 14-23: Charts section (pushup volume + duration trend)
- Rows 24-33: Personal records
- Rows 35-73: Progression roadmap (5 stages)

---

## Classification Logic

```python
# From classifier.py
STAGE1_KEYWORDS = ["surya namaskar", "bird dog", "glute bridge", "band pull-apart", "row"]
FULL_THRESHOLD = 3

# If ≥ 3 keywords found in exercise names → "Full"
# If 1-2 keywords found → "Half"
# If 0 keywords found → "Skip"
```

---

## Progression Roadmap (5 Stages)

Based on Dr. Stuart McGill's spine rehabilitation model + ACSM guidelines.

| Stage | Name | Gate Criteria |
|---|---|---|
| 1 | Foundation | 14 Full workouts + Pain trending Better + 60% consistency |
| 2 | Motor Control | 25 Full workouts + 30 pushups/session + 25min avg duration |
| 3 | Graded Loading | 40 Full workouts + 5000 total volume + 30min avg duration |
| 4 | Strength Building | 80 Full workouts + 20000 total volume |
| 5 | Maintenance | No gate — lifetime practice |

Gate criteria are evaluated in `setup_roadmap.py` and `dashboard_preview.html`.

---

## Google Cloud / Auth Setup

- **Project**: `[YOUR_PROJECT_ID]`
- **Service Account**: `[YOUR_SERVICE_ACCOUNT_EMAIL]`
- **APIs Enabled**: Google Sheets API, Google Drive API
- **Auth Method**: Service account JSON key (`credentials.json`)
- **Drive Folder**: "Workout Tracker Inbox" — created by the service account, user shares their own folder with the service account email (Editor access)
- **Sheet Sharing**: The Google Sheet is shared with the service account (Editor) and set to "anyone with link can view" for the web dashboard CSV feed

---

## CSV Format (Strong App)

Strong exports use **semicolons** as delimiters (locale-dependent). The parser auto-detects this.

```csv
"Workout #";"Date";"Workout Name";"Duration (sec)";"Exercise Name";"Set Order";"Weight (kg)";"Reps";"RPE";"Distance (meters)";"Seconds";"Notes";"Workout Notes"
```

Key differences from comma-delimited exports:
- Delimiter: `;` instead of `,`
- Duration column: `Duration (sec)` (raw seconds) instead of `Workout Duration` (human-readable)
- Weight column: `Weight (kg)` instead of `Weight`

The parser handles both variants automatically.

---

## Current Status (as of 2026-05-05)

- ✅ Core pipeline fully functional (parse → classify → upload)
- ✅ Google Sheet with formatted dashboard + roadmap
- ✅ Google Drive integration working (watcher.py)
- ✅ Mobile-responsive web dashboard (dashboard_preview.html)
- ✅ Apps Script ready (apps_script.js)
- ✅ Cloud Function ready (cloud_function/)

### Pending / TODO

1. **Install Apps Script**: User needs to paste `apps_script.js` into Extensions → Apps Script and run `setupTrigger()` once for fully automatic processing
2. **Cloud Function deployment**: Optional — `cloud_function/` is ready but not deployed. Requires `gcloud` CLI
3. **Dashboard refresh after new data**: Run `python setup_dashboard.py` and `python setup_roadmap.py` to update dashboard formatting/roadmap after significant new data
4. **Web dashboard hosting**: `dashboard_preview.html` works locally but could be hosted on GitHub Pages for phone bookmark access
5. **Pain_Level tracking**: User hasn't started filling in column H yet — needed for Stage 1 gate progress (pain trending Better)

---

## How to Run

```bash
# One-time: install dependencies
pip install pandas gspread google-api-python-client

# Manual CSV processing
python main.py --csv path/to/strong_export.csv

# Check Google Drive for new CSVs (one-shot)
python watcher.py --once

# Watch Google Drive continuously (polls every 30s)
python watcher.py

# Refresh dashboard formatting
python setup_dashboard.py

# Update roadmap progress
python setup_roadmap.py
```

---

## Key Design Decisions

1. **No gamification** — user explicitly removed XP/streaks/levels. Data only.
2. **Columns H-K are sacred** — Python never touches them. Manual user input preserved.
3. **Idempotent writes** — duplicate dates are never inserted, safe to re-run.
4. **Semicolon detection** — Strong exports vary by locale; parser auto-detects.
5. **Service account auth** — no browser login needed, headless operation.
6. **Self-contained automation files** — `apps_script.js` and `cloud_function/main.py` each contain ALL logic (parser + classifier + uploader) so they work independently of the Python modules.
