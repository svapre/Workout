"""
setup_roadmap.py — Add the progression roadmap to the Dashboard tab.

Renders a visual stage-by-stage roadmap with:
  • Current stage auto-detected from Daily_Log data
  • Progress bar showing % toward next gate
  • Each stage shown as a node with focus areas and gate criteria
  • Active stage highlighted, completed stages checked
"""

import gspread
from config import PROGRESSION_STAGES

gc = gspread.service_account(filename="credentials.json")
sh = gc.open("Workout Tracker")
dash = sh.worksheet("Dashboard")
dl = sh.worksheet("Daily_Log")
SHEET_ID_DASH = dash.id
SHEET_ID_DAILY = dl.id


def rgb(r, g, b):
    return {"red": r / 255, "green": g / 255, "blue": b / 255}

# Colors
BG_BASE     = rgb(24, 24, 37)
BG_DARK     = rgb(30, 30, 46)
BG_CARD     = rgb(49, 50, 68)
BG_SURFACE  = rgb(69, 71, 90)
BG_GREEN    = rgb(166, 227, 161)
BG_BLUE     = rgb(137, 180, 250)
BG_PINK     = rgb(245, 194, 231)
BG_MAUVE    = rgb(203, 166, 247)
BG_YELLOW   = rgb(249, 226, 175)
BG_TEAL     = rgb(148, 226, 213)
BG_RED      = rgb(243, 139, 168)
TEXT_WHITE   = rgb(205, 214, 244)
TEXT_DARK    = rgb(30, 30, 46)
TEXT_SUB     = rgb(166, 173, 200)
TEXT_DIM     = rgb(88, 91, 112)

STAGE_COLORS = [BG_GREEN, BG_BLUE, BG_YELLOW, BG_MAUVE, BG_TEAL]


# ── 1. Read current metrics from Daily_Log ───────────────────────────────────
all_data = dl.get_all_values()
headers = all_data[0] if all_data else []
rows = all_data[1:] if len(all_data) > 1 else []

def col_idx(name):
    try:
        return headers.index(name)
    except ValueError:
        return -1

# Calculate metrics needed for gate evaluation
total_workouts = len(rows)
full_workouts = sum(1 for r in rows if r[col_idx("Workout_Type")] == "Full" if col_idx("Workout_Type") >= 0)
half_workouts = sum(1 for r in rows if r[col_idx("Workout_Type")] == "Half" if col_idx("Workout_Type") >= 0)

ci_pain = col_idx("Pain_Level")
pain_better_count = sum(1 for r in rows if ci_pain >= 0 and len(r) > ci_pain and r[ci_pain] == "Better")

ci_dur = col_idx("Duration (min)")
durations = [int(r[ci_dur]) for r in rows if ci_dur >= 0 and len(r) > ci_dur and r[ci_dur].isdigit()]
avg_duration = sum(durations) / len(durations) if durations else 0

ci_pv = col_idx("Pushup_Volume")
pushup_sessions = [int(r[ci_pv]) for r in rows if ci_pv >= 0 and len(r) > ci_pv and r[ci_pv].isdigit()]
max_pushup_session = max(pushup_sessions) if pushup_sessions else 0

ci_tv = col_idx("Total_Volume")
total_volume = sum(int(r[ci_tv]) for r in rows if ci_tv >= 0 and len(r) > ci_tv and r[ci_tv].isdigit())

consistency_pct = ((full_workouts + half_workouts) / total_workouts * 100) if total_workouts > 0 else 0

print(f"Metrics: full={full_workouts}, pain_better={pain_better_count}, "
      f"avg_dur={avg_duration:.0f}, max_pushup={max_pushup_session}, "
      f"total_vol={total_volume}, consistency={consistency_pct:.0f}%")


# ── 2. Determine current stage ───────────────────────────────────────────────
def gate_passed(gate):
    if gate is None:
        return True
    checks = []
    if "full_workouts_min" in gate:
        checks.append(full_workouts >= gate["full_workouts_min"])
    if "consistency_pct_min" in gate:
        checks.append(consistency_pct >= gate["consistency_pct_min"])
    if "pain_better_count_min" in gate:
        checks.append(pain_better_count >= gate["pain_better_count_min"])
    if "pushup_session_max_min" in gate:
        checks.append(max_pushup_session >= gate["pushup_session_max_min"])
    if "avg_duration_min" in gate:
        checks.append(avg_duration >= gate["avg_duration_min"])
    if "total_volume_min" in gate:
        checks.append(total_volume >= gate["total_volume_min"])
    return all(checks) if checks else True


def gate_progress(gate):
    """Return (completed_items, total_items, progress_pct) for a gate."""
    if gate is None:
        return 0, 0, 100
    items = []
    if "full_workouts_min" in gate:
        items.append(min(full_workouts / gate["full_workouts_min"], 1.0))
    if "consistency_pct_min" in gate:
        items.append(min(consistency_pct / gate["consistency_pct_min"], 1.0))
    if "pain_better_count_min" in gate:
        items.append(min(pain_better_count / gate["pain_better_count_min"], 1.0))
    if "pushup_session_max_min" in gate:
        items.append(min(max_pushup_session / gate["pushup_session_max_min"], 1.0))
    if "avg_duration_min" in gate:
        items.append(min(avg_duration / gate["avg_duration_min"], 1.0))
    if "total_volume_min" in gate:
        items.append(min(total_volume / gate["total_volume_min"], 1.0))
    if not items:
        return 0, 0, 100
    completed = sum(1 for i in items if i >= 1.0)
    pct = int(sum(items) / len(items) * 100)
    return completed, len(items), pct


current_stage = 0
for i, stage in enumerate(PROGRESSION_STAGES):
    if stage["gate"] is not None and gate_passed(stage["gate"]):
        current_stage = i + 1
    else:
        break
current_stage = min(current_stage, len(PROGRESSION_STAGES) - 1)

print(f"Current stage: {current_stage} ({PROGRESSION_STAGES[current_stage]['name']})")


# ── 3. Build the roadmap content ─────────────────────────────────────────────
# Starting at row 35 on the dashboard (after the PR section which ends ~row 33)
START_ROW = 35

content_rows = []

# Section header
content_rows.append(["", "YOUR PROGRESSION ROADMAP", "", "", "", "", "", "", ""])
content_rows.append(["", "Based on McGill's rehab phases & ACSM exercise guidelines", "", "", "", "", "", "", ""])
content_rows.append([""])  # spacer

# For each stage, render:
#   Label row: [stage icon] STAGE NAME — subtitle
#   Detail row: Focus area | Gate criteria | Progress
for i, stage in enumerate(PROGRESSION_STAGES):
    is_completed = i < current_stage
    is_active = i == current_stage
    is_future = i > current_stage

    # Status icon
    if is_completed:
        status = "COMPLETED"
    elif is_active:
        _, _, pct = gate_progress(stage["gate"])
        status = f"IN PROGRESS ({pct}%)"
    else:
        status = "LOCKED"

    # Stage name row
    content_rows.append(["", stage["name"], "", "", stage["subtitle"], "", "", status, ""])

    # Goal row
    content_rows.append(["", stage["goal"], "", "", "", "", "", "", ""])

    # Focus items
    for focus_item in stage["focus"]:
        content_rows.append(["", "", focus_item, "", "", "", "", "", ""])

    # Gate criteria row
    if stage["gate"]:
        gate_desc = stage["gate"]["description"]

        # Build a detailed progress string
        gate = stage["gate"]
        progress_parts = []
        if "full_workouts_min" in gate:
            progress_parts.append(f"Full Workouts: {full_workouts}/{gate['full_workouts_min']}")
        if "pain_better_count_min" in gate:
            progress_parts.append(f"Pain 'Better': {pain_better_count}/{gate['pain_better_count_min']}")
        if "consistency_pct_min" in gate:
            progress_parts.append(f"Consistency: {consistency_pct:.0f}%/{gate['consistency_pct_min']}%")
        if "pushup_session_max_min" in gate:
            progress_parts.append(f"Max Pushups: {max_pushup_session}/{gate['pushup_session_max_min']}")
        if "avg_duration_min" in gate:
            progress_parts.append(f"Avg Duration: {avg_duration:.0f}/{gate['avg_duration_min']} min")
        if "total_volume_min" in gate:
            progress_parts.append(f"Total Volume: {total_volume}/{gate['total_volume_min']}")

        content_rows.append(["", "", "GATE:", gate_desc, "", "", "", " | ".join(progress_parts), ""])
    else:
        content_rows.append(["", "", "GATE:", "None - you've made it!", "", "", "", "", ""])

    # Spacer between stages
    content_rows.append([""])

# Write all content
end_row = START_ROW + len(content_rows)
range_str = f"A{START_ROW}:I{end_row}"
dash.update(values=content_rows, range_name=range_str, value_input_option="RAW")
print(f"[OK] Roadmap content written to rows {START_ROW}-{end_row}")


# ── 4. Format the roadmap ────────────────────────────────────────────────────
requests = []

# Section header (row START_ROW)
sec_row = START_ROW - 1  # 0-indexed
requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": sec_row, "endRowIndex": sec_row + 1, "startColumnIndex": 1, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}})
requests.append({
    "repeatCell": {
        "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": sec_row, "endRowIndex": sec_row + 1, "startColumnIndex": 1, "endColumnIndex": 9},
        "cell": {"userEnteredFormat": {
            "backgroundColor": BG_SURFACE,
            "textFormat": {"foregroundColor": TEXT_WHITE, "fontSize": 14, "bold": True, "fontFamily": "Inter"},
            "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE",
        }},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
    }
})

# Subtitle (row START_ROW+1)
sub_row = sec_row + 1
requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": sub_row, "endRowIndex": sub_row + 1, "startColumnIndex": 1, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}})
requests.append({
    "repeatCell": {
        "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": sub_row, "endRowIndex": sub_row + 1, "startColumnIndex": 1, "endColumnIndex": 9},
        "cell": {"userEnteredFormat": {
            "backgroundColor": BG_DARK,
            "textFormat": {"foregroundColor": TEXT_DIM, "fontSize": 10, "italic": True, "fontFamily": "Inter"},
            "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE",
        }},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
    }
})

# Format each stage block
row_cursor = sec_row + 3  # after header + subtitle + spacer
for i, stage in enumerate(PROGRESSION_STAGES):
    is_completed = i < current_stage
    is_active = i == current_stage
    color = STAGE_COLORS[i]

    # Stage name row — merge B:D for name, E:G for subtitle, H:I for status
    requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 1, "endColumnIndex": 4}, "mergeType": "MERGE_ALL"}})
    requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 4, "endColumnIndex": 7}, "mergeType": "MERGE_ALL"}})
    requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 7, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}})

    # Stage name formatting
    name_bg = color if is_active else (BG_CARD if is_completed else BG_DARK)
    name_fg = TEXT_DARK if is_active else (TEXT_WHITE if is_completed else TEXT_DIM)
    requests.append({
        "repeatCell": {
            "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 1, "endColumnIndex": 4},
            "cell": {"userEnteredFormat": {
                "backgroundColor": name_bg,
                "textFormat": {"foregroundColor": name_fg, "fontSize": 12, "bold": True, "fontFamily": "Inter"},
                "verticalAlignment": "MIDDLE",
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
        }
    })

    # Subtitle formatting
    requests.append({
        "repeatCell": {
            "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 4, "endColumnIndex": 7},
            "cell": {"userEnteredFormat": {
                "backgroundColor": name_bg,
                "textFormat": {"foregroundColor": TEXT_SUB if is_active else TEXT_DIM, "fontSize": 10, "italic": True, "fontFamily": "Inter"},
                "verticalAlignment": "MIDDLE",
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
        }
    })

    # Status badge
    if is_completed:
        status_bg = BG_GREEN
        status_fg = TEXT_DARK
    elif is_active:
        status_bg = BG_YELLOW
        status_fg = TEXT_DARK
    else:
        status_bg = BG_DARK
        status_fg = TEXT_DIM

    requests.append({
        "repeatCell": {
            "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 7, "endColumnIndex": 9},
            "cell": {"userEnteredFormat": {
                "backgroundColor": status_bg,
                "textFormat": {"foregroundColor": status_fg, "fontSize": 10, "bold": True, "fontFamily": "Inter"},
                "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE",
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
        }
    })

    row_cursor += 1  # move past name row

    # Goal row — merge B:I
    requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 1, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}})
    goal_fg = TEXT_WHITE if (is_active or is_completed) else TEXT_DIM
    requests.append({
        "repeatCell": {
            "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 1, "endColumnIndex": 9},
            "cell": {"userEnteredFormat": {
                "backgroundColor": BG_CARD if (is_active or is_completed) else BG_BASE,
                "textFormat": {"foregroundColor": goal_fg, "fontSize": 10, "fontFamily": "Inter"},
                "verticalAlignment": "MIDDLE",
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
        }
    })
    row_cursor += 1

    # Focus items (3 rows)
    for _ in stage["focus"]:
        requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 2, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}})
        requests.append({
            "repeatCell": {
                "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 2, "endColumnIndex": 9},
                "cell": {"userEnteredFormat": {
                    "backgroundColor": BG_BASE,
                    "textFormat": {"foregroundColor": TEXT_SUB if (is_active or is_completed) else TEXT_DIM, "fontSize": 9, "fontFamily": "Inter"},
                }},
                "fields": "userEnteredFormat(backgroundColor,textFormat)",
            }
        })
        row_cursor += 1

    # Gate row — merge C:G for gate description, H:I for progress
    requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 3, "endColumnIndex": 7}, "mergeType": "MERGE_ALL"}})
    requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 7, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}})

    gate_color = BG_SURFACE if is_active else BG_DARK
    requests.append({
        "repeatCell": {
            "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": row_cursor, "endRowIndex": row_cursor + 1, "startColumnIndex": 2, "endColumnIndex": 9},
            "cell": {"userEnteredFormat": {
                "backgroundColor": gate_color,
                "textFormat": {"foregroundColor": TEXT_WHITE if is_active else TEXT_DIM, "fontSize": 9, "bold": is_active, "fontFamily": "Inter"},
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat)",
        }
    })
    row_cursor += 1

    # Spacer
    row_cursor += 1

# Left border accent stripe for the active stage
# (We already formatted the bg colors above)

# Execute
sh.batch_update({"requests": requests})
print("[OK] Roadmap formatting applied!")
print(f"\nYou are at: {PROGRESSION_STAGES[current_stage]['name']}")
if PROGRESSION_STAGES[current_stage]["gate"]:
    _, _, pct = gate_progress(PROGRESSION_STAGES[current_stage]["gate"])
    print(f"Progress to next stage: {pct}%")
print("\nOpen your Google Sheet -> Dashboard tab to see the roadmap!")
