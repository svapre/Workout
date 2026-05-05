"""
setup_formulas.py — One-time script to inject gamification formulas
into the Daily_Log and Dashboard tabs of the Google Sheet.

Safe to run multiple times — it overwrites formula cells only.
"""

import gspread

gc = gspread.service_account(filename="credentials.json")
sh = gc.open("Workout Tracker")

# ────────────────────────────────────────
# 1. Daily_Log — XP / Streak / Level
# ────────────────────────────────────────
ws = sh.worksheet("Daily_Log")

MAX_ROW = 50  # pre-fill formulas for 50 rows of headroom

batch = []
for r in range(2, MAX_ROW + 1):
    xp = (
        f'=IF(B{r}="","",IF(B{r}="Full",10,IF(B{r}="Half",5,1))'
        f'+IF(E{r}="Better",5,IF(E{r}="Worse",-2,0))'
        f'+IF(AND(ISNUMBER(F{r}),F{r}>=4),3,0)'
        f'+IF(AND(ISNUMBER(G{r}),G{r}<=360),3,IF(AND(ISNUMBER(G{r}),G{r}<=480),1,0)))'
    )

    if r == 2:
        streak = f'=IF(B{r}="",0,IF(OR(B{r}="Full",B{r}="Half"),1,0))'
    else:
        streak = f'=IF(B{r}="",0,IF(OR(B{r}="Full",B{r}="Half"),I{r-1}+1,0))'

    level = f'=IF(H{r}="","",INT(SUMPRODUCT(($H$2:H{r})*1)/50)+1)'

    batch.append({
        "range": f"H{r}:J{r}",
        "values": [[xp, streak, level]],
    })

ws.batch_update(batch, value_input_option="USER_ENTERED")
print(f"[OK] Daily_Log: formulas written to H2:J{MAX_ROW}")

# Read back the data rows to verify
data = ws.get("A1:K4")
print("\n--- Daily_Log (rows 1-4) ---")
for i, row in enumerate(data):
    print(f"  Row {i+1}: {row}")

# ────────────────────────────────────────
# 2. Dashboard tab
# ────────────────────────────────────────
try:
    dash = sh.worksheet("Dashboard")
except gspread.WorksheetNotFound:
    dash = sh.add_worksheet(title="Dashboard", rows=20, cols=5)

dashboard_data = [
    ["Total XP",          "=SUM(Daily_Log!H:H)"],
    ["Current Level",     "=INT(B1/50)+1"],
    ["Current Streak",    "=INDEX(Daily_Log!I:I,COUNTA(Daily_Log!A:A))"],
    ["Best Streak",       "=MAX(Daily_Log!I:I)"],
    ["Total Workouts",    "=COUNTA(Daily_Log!A:A)-1"],
    ["Full Workouts",     '=COUNTIF(Daily_Log!B:B,"Full")'],
    ["Half Workouts",     '=COUNTIF(Daily_Log!B:B,"Half")'],
    ['Avg Duration (min)', '=IFERROR(AVERAGE(Daily_Log!C:C),"-")'],
    ["Total Pushup Reps", "=SUM(Daily_Log!D:D)"],
]

dash.update("A1:B9", dashboard_data, value_input_option="USER_ENTERED")
print("\n[OK] Dashboard: formulas written to A1:B9")

# Read back
dash_vals = dash.get("A1:B9")
print("\n--- Dashboard ---")
for row in dash_vals:
    print(f"  {row[0]:20s} = {row[1]}")

print("\nAll done! Open your Google Sheet to see the results.")
