"""
config.py — Central configuration for the Gamified Fitness & Rehab Tracker.

All tuneable constants live here so the rest of the codebase stays clean.
"""

# ──────────────────────────────────────────────
#  Google Sheets
# ──────────────────────────────────────────────
SPREADSHEET_NAME = "Workout Tracker"          # Name of your Google Sheet
DAILY_LOG_SHEET  = "Daily_Log"                # Tab that stores per-day rows
DASHBOARD_SHEET  = "Dashboard"                # Tab with aggregate formulas
CREDENTIALS_PATH = "credentials.json"         # Service-account JSON key

# ──────────────────────────────────────────────
#  Stage 1 — Corrective Exercise Keywords
#  (case-insensitive substring match)
# ──────────────────────────────────────────────
STAGE1_KEYWORDS = [
    "surya namaskar",
    "bird dog",
    "glute bridge",
    "band pull-apart",
    "row",
]

# How many unique Stage-1 keywords must appear to qualify as "Full"
FULL_THRESHOLD = 3   # ≥ 3 → Full,  1-2 → Half,  0 → Skip

# ──────────────────────────────────────────────
#  Push-up Detection Keywords
#  (case-insensitive substring match)
# ──────────────────────────────────────────────
PUSHUP_KEYWORDS = [
    "push-up",
    "pushup",
    "push up",
]

# ──────────────────────────────────────────────
#  Strong CSV — Canonical Column Names
#  The parser fuzzy-matches real headers to these.
# ──────────────────────────────────────────────
CSV_COLUMNS = {
    "date":             "Date",
    "workout_name":     "Workout Name",
    "exercise_name":    "Exercise Name",
    "set_order":        "Set Order",
    "weight":           "Weight",
    "reps":             "Reps",
    "distance":         "Distance",
    "seconds":          "Seconds",
    "workout_duration": "Workout Duration",
    "notes":            "Notes",
    "workout_notes":    "Workout Notes",
}

# ──────────────────────────────────────────────
#  Progression Roadmap
#
#  Based on:
#  • Dr. Stuart McGill's phased spine rehabilitation model
#  • ACSM guidelines for sedentary-to-active transitions
#  • Research on lumbar radiculopathy rehab timelines
#
#  Each stage has measurable "gate" criteria that must be
#  met before advancing. Criteria are checked against
#  the Daily_Log data.
# ──────────────────────────────────────────────
PROGRESSION_STAGES = [
    {
        "name": "Stage 1 — Foundation",
        "subtitle": "Build the Habit (McGill Phase 1-2)",
        "goal": "Daily corrective work for 3+ weeks. Pain centralizing.",
        "focus": [
            "Surya Namaskar, Bird Dog, Glute Bridge",
            "Band Pull-Aparts for posture",
            "20 min/day, consistency over intensity",
        ],
        "gate": {
            "description": "14 Full workouts + Pain trending 'Better'",
            "full_workouts_min": 14,
            "consistency_pct_min": 60,
            "pain_better_count_min": 5,
        },
    },
    {
        "name": "Stage 2 — Motor Control",
        "subtitle": "Core Endurance (McGill Phase 2-3)",
        "goal": "Add push-ups, side planks, bodyweight squats. 25+ min sessions.",
        "focus": [
            "McGill Big 3: Bird Dog, Curl-Up, Side Plank",
            "Push-ups (building to 3x10)",
            "Bodyweight squat pattern (hip hinge)",
        ],
        "gate": {
            "description": "Push-up volume >= 30/session + 25 Full workouts",
            "full_workouts_min": 25,
            "pushup_session_max_min": 30,
            "avg_duration_min": 25,
        },
    },
    {
        "name": "Stage 3 — Graded Loading",
        "subtitle": "Light Resistance (McGill Phase 3)",
        "goal": "Introduce resistance bands and light dumbbells. No spinal compression.",
        "focus": [
            "Resistance band rows, pull-aparts",
            "Goblet squats (light), Romanian deadlifts",
            "Farmers carries for spinal endurance",
        ],
        "gate": {
            "description": "Total volume > 5000 + 40 Full workouts",
            "full_workouts_min": 40,
            "total_volume_min": 5000,
            "avg_duration_min": 30,
        },
    },
    {
        "name": "Stage 4 — Strength Building",
        "subtitle": "Progressive Overload (ACSM Guidelines)",
        "goal": "Structured programs, increasing weight progressively. Monitor nerve symptoms.",
        "focus": [
            "Barbell hip hinge (trap bar deadlift preferred)",
            "Bench press, overhead press",
            "Structured 3-4x/week program",
        ],
        "gate": {
            "description": "Sustained 12+ weeks, no pain regression",
            "full_workouts_min": 80,
            "total_volume_min": 20000,
        },
    },
    {
        "name": "Stage 5 — Maintenance",
        "subtitle": "Lifetime Practice",
        "goal": "Ongoing strength training with daily corrective warmups. Full autonomy.",
        "focus": [
            "Maintain McGill warmup routine",
            "Train 3-5x/week with progressive overload",
            "Annual mobility & nerve health check-ins",
        ],
        "gate": None,  # no gate — this is the endgame
    },
]

