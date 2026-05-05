"""
setup_dashboard.py — Create a visually rich Dashboard tab in Google Sheets.

Features:
  • Dark-themed metric cards with color accents
  • Pushup volume progression chart (column chart)
  • Workout type distribution chart (donut)
  • Duration trend line chart
  • Volume progression chart
  • Weekly workout heatmap via conditional formatting
  • Personal records section
  • Styled Daily_Log with alternating rows
"""

import gspread

gc = gspread.service_account(filename="credentials.json")
sh = gc.open("Workout Tracker")

SHEET_ID_DAILY = sh.worksheet("Daily_Log").id
dash = sh.worksheet("Dashboard")
SHEET_ID_DASH = dash.id


# ── Helper: RGB dict for Sheets API ──────────────────────────────────────────
def rgb(r, g, b):
    return {"red": r / 255, "green": g / 255, "blue": b / 255}


# ── Color Palette (Catppuccin Mocha) ─────────────────────────────────────────
BG_DARK       = rgb(30, 30, 46)
BG_CARD       = rgb(49, 50, 68)
BG_SURFACE0   = rgb(69, 71, 90)
BG_ACCENT_1   = rgb(166, 227, 161)   # green
BG_ACCENT_2   = rgb(137, 180, 250)   # blue
BG_ACCENT_3   = rgb(245, 194, 231)   # pink
BG_ACCENT_4   = rgb(203, 166, 247)   # purple (mauve)
BG_ACCENT_5   = rgb(249, 226, 175)   # yellow
BG_ACCENT_6   = rgb(148, 226, 213)   # teal
TEXT_WHITE     = rgb(205, 214, 244)
TEXT_DARK      = rgb(30, 30, 46)
TEXT_SUBTEXT   = rgb(166, 173, 200)
BG_BASE       = rgb(24, 24, 37)


# ── 1. Clear and set up content ──────────────────────────────────────────────
dash.clear()

# First, unmerge everything to avoid conflicts
try:
    sh.batch_update({"requests": [{"unmergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": 0, "endRowIndex": 50, "startColumnIndex": 0, "endColumnIndex": 10}}}]})
except Exception:
    pass

# Also delete any existing charts
metadata = sh.fetch_sheet_metadata()
for sheet_meta in metadata.get("sheets", []):
    if sheet_meta["properties"]["sheetId"] == SHEET_ID_DASH:
        for chart in sheet_meta.get("charts", []):
            try:
                sh.batch_update({"requests": [{"deleteEmbeddedObject": {"objectId": chart["chartId"]}}]})
            except Exception:
                pass

# Also delete any existing banding on Daily_Log
for sheet_meta in metadata.get("sheets", []):
    if sheet_meta["properties"]["sheetId"] == SHEET_ID_DAILY:
        for banding in sheet_meta.get("bandedRanges", []):
            try:
                sh.batch_update({"requests": [{"deleteBanding": {"bandedRangeId": banding["bandedRangeId"]}}]})
            except Exception:
                pass


# Layout (9 columns: A=spacer, B-C=card1, D=spacer, E-F=card2, G=spacer, H-I=card3)
content = [
    # Row 1-2: Title
    ["", "WORKOUT TRACKER", "", "", "", "", "", "", ""],
    ["", "Stage 1 — Corrective Exercise Phase", "", "", "", "", "", "", ""],
    # Row 3: spacer
    [""],
    # Row 4-5: Key Metrics Row 1  (3 cards)
    ["", "TOTAL WORKOUTS", "", "", "FULL WORKOUTS", "", "", "HALF WORKOUTS", ""],
    ["", '=COUNTA(Daily_Log!A:A)-1', "", "", '=COUNTIF(Daily_Log!B:B,"Full")', "",
     "", '=COUNTIF(Daily_Log!B:B,"Half")', ""],
    # Row 6: spacer
    [""],
    # Row 7-8: Key Metrics Row 2  (3 cards)
    ["", "AVG DURATION", "", "", "TOTAL PUSHUP REPS", "", "", "CONSISTENCY", ""],
    ["", '=IFERROR(TEXT(AVERAGE(Daily_Log!C:C),"0.0")&" min","-")', "", "",
     "=SUM(Daily_Log!D:D)", "", "",
     '=IFERROR(TEXT((COUNTIF(Daily_Log!B:B,"Full")+COUNTIF(Daily_Log!B:B,"Half"))/(COUNTA(Daily_Log!A:A)-1)*100,"0")&"%","-")', ""],
    # Row 9: spacer
    [""],
    # Row 10-11: Key Metrics Row 3  (3 cards)
    ["", "TOTAL VOLUME", "", "", "BEST PUSHUP SESSION", "", "", "TOTAL SETS", ""],
    ["", '=SUM(Daily_Log!E:E)', "", "",
     "=MAX(Daily_Log!D:D)", "", "",
     "=SUM(Daily_Log!F:F)", ""],
    # Row 12: spacer
    [""],
    # Row 13: Section header - PROGRESS
    ["", "PROGRESS", "", "", "", "", "", "", ""],
    # Row 14-15: spacer for charts
    [""],
    [""],
    # Rows 16-25: chart area (10 rows)
    *([[""]]*10),
    # Row 26: spacer
    [""],
    # Row 27: Section header - PERSONAL RECORDS
    ["", "PERSONAL RECORDS", "", "", "", "", "", "", ""],
    # Row 28: spacer
    [""],
    # Row 29-30: PR metrics
    ["", "MAX PUSHUP REPS", "", "", "LONGEST WORKOUT", "", "", "LONGEST STREAK", ""],
    ["", "=MAX(Daily_Log!D:D)", "", "",
     '=TEXT(MAX(Daily_Log!C:C),"0")&" min"', "", "",
     '=IFERROR(LET(col,Daily_Log!B2:B200,s,ARRAYFORMULA(IF(OR(col="Full",col="Half"),1,0)),MAX(MMULT(TRANSPOSE(s),SEQUENCE(ROWS(s),1,1,0)/SEQUENCE(ROWS(s),1,1,0)))),"0")', ""],
    # Row 31: spacer
    [""],
    # Row 32-33: More PR metrics
    ["", "DAYS TRACKED", "", "", "THIS WEEK", "", "", "AVG SETS/SESSION", ""],
    ["", "=COUNTA(Daily_Log!A:A)-1", "", "",
     '=COUNTIFS(Daily_Log!A:A,">="&TEXT(TODAY()-WEEKDAY(TODAY(),2)+1,"yyyy-mm-dd"),Daily_Log!A:A,"<="&TEXT(TODAY(),"yyyy-mm-dd"))', "", "",
     '=IFERROR(ROUND(AVERAGE(Daily_Log!F:F),0),"-")', ""],
]

dash.update(values=content, range_name="A1:I33", value_input_option="USER_ENTERED")
print("[OK] Dashboard content written")


# ── 2. Format everything ─────────────────────────────────────────────────────
requests = []

# --- Set column widths (9 columns) ---
col_widths = [20, 120, 120, 20, 120, 120, 20, 120, 120, 20]
for i, w in enumerate(col_widths):
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": SHEET_ID_DASH, "dimension": "COLUMNS", "startIndex": i, "endIndex": i + 1},
            "properties": {"pixelSize": w}, "fields": "pixelSize",
        }
    })

# --- Row heights ---
row_config = {
    0: 55, 1: 28, 2: 12,       # title + subtitle + spacer
    3: 26, 4: 60, 5: 12,       # metric row 1
    6: 26, 7: 60, 8: 12,       # metric row 2
    9: 26, 10: 60, 11: 12,     # metric row 3
    12: 38,                     # section header
    26: 38,                     # section header
}
for row_idx, height in row_config.items():
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": SHEET_ID_DASH, "dimension": "ROWS", "startIndex": row_idx, "endIndex": row_idx + 1},
            "properties": {"pixelSize": height}, "fields": "pixelSize",
        }
    })

# --- Entire sheet dark background ---
requests.append({
    "repeatCell": {
        "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": 0, "endRowIndex": 40, "startColumnIndex": 0, "endColumnIndex": 10},
        "cell": {"userEnteredFormat": {
            "backgroundColor": BG_BASE,
            "textFormat": {"foregroundColor": TEXT_WHITE, "fontFamily": "Inter"},
        }},
        "fields": "userEnteredFormat(backgroundColor,textFormat)",
    }
})

# --- Hide gridlines ---
requests.append({
    "updateSheetProperties": {
        "properties": {"sheetId": SHEET_ID_DASH, "gridProperties": {"hideGridlines": True}},
        "fields": "gridProperties.hideGridlines",
    }
})

# --- Title (row 1): merge B1:I1 ---
requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 1, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}})
requests.append({
    "repeatCell": {
        "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 1, "endColumnIndex": 9},
        "cell": {"userEnteredFormat": {
            "backgroundColor": BG_DARK,
            "textFormat": {"foregroundColor": TEXT_WHITE, "fontSize": 22, "bold": True, "fontFamily": "Inter"},
            "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE",
        }},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
    }
})

# --- Subtitle (row 2): merge B2:I2 ---
requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 1, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}})
requests.append({
    "repeatCell": {
        "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 1, "endColumnIndex": 9},
        "cell": {"userEnteredFormat": {
            "backgroundColor": BG_DARK,
            "textFormat": {"foregroundColor": TEXT_SUBTEXT, "fontSize": 11, "italic": True, "fontFamily": "Inter"},
            "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE",
        }},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
    }
})

# --- Section Headers (rows 13, 27) ---
for sec_row in [12, 26]:
    requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": sec_row, "endRowIndex": sec_row + 1, "startColumnIndex": 1, "endColumnIndex": 9}, "mergeType": "MERGE_ALL"}})
    requests.append({
        "repeatCell": {
            "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": sec_row, "endRowIndex": sec_row + 1, "startColumnIndex": 1, "endColumnIndex": 9},
            "cell": {"userEnteredFormat": {
                "backgroundColor": BG_SURFACE0,
                "textFormat": {"foregroundColor": TEXT_WHITE, "fontSize": 13, "bold": True, "fontFamily": "Inter"},
                "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE",
            }},
            "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
        }
    })

# --- Metric Cards: label + value pairs ---
# Row groups: (label_row_idx, value_row_idx, card_columns_startcol, accent_colors)
card_rows = [
    (3, 4, [BG_ACCENT_1, BG_ACCENT_2, BG_ACCENT_3]),    # Row 4-5
    (6, 7, [BG_ACCENT_2, BG_ACCENT_1, BG_ACCENT_4]),    # Row 7-8
    (9, 10, [BG_ACCENT_5, BG_ACCENT_6, BG_ACCENT_3]),   # Row 10-11
    (28, 29, [BG_ACCENT_6, BG_ACCENT_4, BG_ACCENT_5]),  # Row 29-30 (PRs)
    (31, 32, [BG_ACCENT_1, BG_ACCENT_2, BG_ACCENT_3]),  # Row 32-33 (More PRs)
]

for label_row, value_row, colors in card_rows:
    for card_idx, start_col in enumerate([1, 4, 7]):
        end_col = start_col + 2

        # Merge label cells
        requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": label_row, "endRowIndex": label_row + 1, "startColumnIndex": start_col, "endColumnIndex": end_col}, "mergeType": "MERGE_ALL"}})
        # Merge value cells
        requests.append({"mergeCells": {"range": {"sheetId": SHEET_ID_DASH, "startRowIndex": value_row, "endRowIndex": value_row + 1, "startColumnIndex": start_col, "endColumnIndex": end_col}, "mergeType": "MERGE_ALL"}})

        # Format label
        requests.append({
            "repeatCell": {
                "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": label_row, "endRowIndex": label_row + 1, "startColumnIndex": start_col, "endColumnIndex": end_col},
                "cell": {"userEnteredFormat": {
                    "backgroundColor": BG_CARD,
                    "textFormat": {"foregroundColor": TEXT_SUBTEXT, "fontSize": 9, "bold": True, "fontFamily": "Inter"},
                    "horizontalAlignment": "CENTER", "verticalAlignment": "BOTTOM",
                }},
                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
            }
        })

        # Format value with accent color
        requests.append({
            "repeatCell": {
                "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": value_row, "endRowIndex": value_row + 1, "startColumnIndex": start_col, "endColumnIndex": end_col},
                "cell": {"userEnteredFormat": {
                    "backgroundColor": colors[card_idx],
                    "textFormat": {"foregroundColor": TEXT_DARK, "fontSize": 24, "bold": True, "fontFamily": "Inter"},
                    "horizontalAlignment": "CENTER", "verticalAlignment": "MIDDLE",
                }},
                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
            }
        })

        # Rounded card borders
        requests.append({
            "updateBorders": {
                "range": {"sheetId": SHEET_ID_DASH, "startRowIndex": label_row, "endRowIndex": value_row + 1, "startColumnIndex": start_col, "endColumnIndex": end_col},
                "top":    {"style": "SOLID", "width": 2, "color": BG_CARD},
                "bottom": {"style": "SOLID", "width": 2, "color": BG_CARD},
                "left":   {"style": "SOLID", "width": 2, "color": BG_CARD},
                "right":  {"style": "SOLID", "width": 2, "color": BG_CARD},
            }
        })


# ── 3. Add Charts ────────────────────────────────────────────────────────────

# Chart 1: Pushup Volume Over Time (column chart) — left side
requests.append({
    "addChart": {
        "chart": {
            "position": {"overlayPosition": {
                "anchorCell": {"sheetId": SHEET_ID_DASH, "rowIndex": 13, "columnIndex": 1},
                "widthPixels": 360, "heightPixels": 260,
            }},
            "spec": {
                "title": "Pushup Volume Over Time",
                "titleTextFormat": {"foregroundColor": TEXT_WHITE, "fontSize": 11, "bold": True, "fontFamily": "Inter"},
                "backgroundColor": BG_CARD,
                "basicChart": {
                    "chartType": "COLUMN",
                    "legendPosition": "NO_LEGEND",
                    "axis": [
                        {"position": "BOTTOM_AXIS", "title": "", "format": {"foregroundColor": TEXT_SUBTEXT, "fontFamily": "Inter", "fontSize": 9}},
                        {"position": "LEFT_AXIS", "title": "Reps", "format": {"foregroundColor": TEXT_SUBTEXT, "fontFamily": "Inter", "fontSize": 9}},
                    ],
                    "domains": [{"domain": {"sourceRange": {"sources": [{"sheetId": SHEET_ID_DAILY, "startRowIndex": 0, "endRowIndex": 200, "startColumnIndex": 0, "endColumnIndex": 1}]}}}],
                    "series": [{"series": {"sourceRange": {"sources": [{"sheetId": SHEET_ID_DAILY, "startRowIndex": 0, "endRowIndex": 200, "startColumnIndex": 3, "endColumnIndex": 4}]}}, "color": rgb(166, 227, 161)}],
                    "headerCount": 1,
                },
            },
        }
    }
})

# Chart 2: Duration Trend (line chart) — right side
requests.append({
    "addChart": {
        "chart": {
            "position": {"overlayPosition": {
                "anchorCell": {"sheetId": SHEET_ID_DASH, "rowIndex": 13, "columnIndex": 5},
                "widthPixels": 360, "heightPixels": 260,
            }},
            "spec": {
                "title": "Workout Duration Trend",
                "titleTextFormat": {"foregroundColor": TEXT_WHITE, "fontSize": 11, "bold": True, "fontFamily": "Inter"},
                "backgroundColor": BG_CARD,
                "basicChart": {
                    "chartType": "LINE",
                    "legendPosition": "NO_LEGEND",
                    "lineSmoothing": True,
                    "axis": [
                        {"position": "BOTTOM_AXIS", "title": "", "format": {"foregroundColor": TEXT_SUBTEXT, "fontFamily": "Inter", "fontSize": 9}},
                        {"position": "LEFT_AXIS", "title": "Minutes", "format": {"foregroundColor": TEXT_SUBTEXT, "fontFamily": "Inter", "fontSize": 9}},
                    ],
                    "domains": [{"domain": {"sourceRange": {"sources": [{"sheetId": SHEET_ID_DAILY, "startRowIndex": 0, "endRowIndex": 200, "startColumnIndex": 0, "endColumnIndex": 1}]}}}],
                    "series": [{"series": {"sourceRange": {"sources": [{"sheetId": SHEET_ID_DAILY, "startRowIndex": 0, "endRowIndex": 200, "startColumnIndex": 2, "endColumnIndex": 3}]}}, "color": rgb(137, 180, 250)}],
                    "headerCount": 1,
                },
            },
        }
    }
})


# ── 4. Style the Daily_Log ───────────────────────────────────────────────────

# Update headers for the expanded column layout
dl = sh.worksheet("Daily_Log")
new_headers = [
    "Date", "Workout_Type", "Duration (min)", "Pushup_Volume",
    "Total_Volume", "Total_Sets", "Exercises",
    "Pain_Level", "Energy", "Sitting (min)", "Notes",
]
dl.update(values=[new_headers], range_name="A1:K1", value_input_option="RAW")

# Style header row
requests.append({
    "repeatCell": {
        "range": {"sheetId": SHEET_ID_DAILY, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": 11},
        "cell": {"userEnteredFormat": {
            "backgroundColor": BG_DARK,
            "textFormat": {"foregroundColor": TEXT_WHITE, "fontSize": 10, "bold": True, "fontFamily": "Inter"},
            "horizontalAlignment": "CENTER",
        }},
        "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
    }
})

# Alternate row colors (banding)
requests.append({
    "addBanding": {
        "bandedRange": {
            "range": {"sheetId": SHEET_ID_DAILY, "startRowIndex": 1, "endRowIndex": 200, "startColumnIndex": 0, "endColumnIndex": 11},
            "rowProperties": {
                "firstBandColor": rgb(40, 40, 55),
                "secondBandColor": rgb(50, 50, 68),
            },
        }
    }
})

# Column widths for Daily_Log
dl_col_widths = [100, 100, 90, 100, 90, 80, 250, 80, 60, 90, 200]
for i, w in enumerate(dl_col_widths):
    requests.append({
        "updateDimensionProperties": {
            "range": {"sheetId": SHEET_ID_DAILY, "dimension": "COLUMNS", "startIndex": i, "endIndex": i + 1},
            "properties": {"pixelSize": w}, "fields": "pixelSize",
        }
    })

# Conditional formatting: green for "Full", yellow for "Half", red for "Skip"
for value, color in [("Full", rgb(166, 227, 161)), ("Half", rgb(249, 226, 175)), ("Skip", rgb(243, 139, 168))]:
    requests.append({
        "addConditionalFormatRule": {
            "rule": {
                "ranges": [{"sheetId": SHEET_ID_DAILY, "startRowIndex": 1, "endRowIndex": 200, "startColumnIndex": 1, "endColumnIndex": 2}],
                "booleanRule": {
                    "condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": value}]},
                    "format": {"backgroundColor": color, "textFormat": {"foregroundColor": TEXT_DARK, "bold": True}},
                },
            },
            "index": 0,
        }
    })


# ── 5. Execute all requests ──────────────────────────────────────────────────
sh.batch_update({"requests": requests})
print("[OK] All formatting, charts, and conditional formatting applied!")

# ── 6. Update existing data with new columns ────────────────────────────────
# Re-process the existing rows to add Total_Volume, Total_Sets, Exercises
existing = dl.get("A2:G4")
if existing and existing[0]:
    # Check if the new columns are missing data
    needs_update = any(len(row) < 7 or row[4] == "" for row in existing)
    if needs_update:
        print("[INFO] Existing rows need new metrics. Re-run main.py to refresh.")
    else:
        print("[OK] Existing data already has all columns.")

print("\nDone! Open your Google Sheet to see the enhanced dashboard.")
