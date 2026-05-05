# 📊 Google Sheets Formula Guide

Paste these formulas into the **Daily_Log** tab of your Google Sheet.
They auto-calculate XP, Streak, and Level from the data Python writes + the values you fill in manually.

---

## Sheet Layout Reminder

| Col | A | B | C | D | E | F | G | H | I | J | K |
|-----|---|---|---|---|---|---|---|---|---|---|---|
| Header | Date | Workout_Type | Duration (min) | Pushup_Volume | Pain_Level | Energy | Sitting (min) | XP | Streak | Level | Notes |
| Source | 🤖 Python | 🤖 Python | 🤖 Python | 🤖 Python | ✍️ Manual | ✍️ Manual | ✍️ Manual | **📐 Formula** | **📐 Formula** | **📐 Formula** | ✍️ Manual |

### Manual columns you fill in:
- **Pain_Level (E)**: Enter `Better`, `Same`, or `Worse`
- **Energy (F)**: Enter a number from 1–5
- **Sitting (G)**: Enter total sitting minutes for the day (e.g., 480 = 8 hours)
- **Notes (K)**: Free text

---

## Formula: XP (Column H)

Paste this into cell **H2**, then drag down:

```
=IF(B2="","",
  IF(B2="Full",10,IF(B2="Half",5,1))
  + IF(E2="Better",5,IF(E2="Worse",-2,0))
  + IF(AND(ISNUMBER(F2),F2>=4),3,0)
  + IF(AND(ISNUMBER(G2),G2<=360),3,IF(AND(ISNUMBER(G2),G2<=480),1,0))
)
```

### XP Breakdown

| Condition | XP Earned |
|---|---|
| Full Workout | +10 |
| Half Workout | +5 |
| Skip (logged activity) | +1 |
| Pain = "Better" | +5 |
| Pain = "Same" | +0 |
| Pain = "Worse" | −2 |
| Energy ≥ 4 | +3 |
| Sitting ≤ 6 hrs (360 min) | +3 |
| Sitting ≤ 8 hrs (480 min) | +1 |
| Sitting > 8 hrs | +0 |

> **Philosophy**: You always earn XP for showing up — even a Skip earns 1 XP.
> Pain improvement is heavily rewarded (+5) to incentivize the corrective work.

---

## Formula: Streak (Column I)

Paste this into cell **I2**, then drag down:

```
=IF(B2="",0,IF(ROW()=2,IF(OR(B2="Full",B2="Half"),1,0),IF(OR(B2="Full",B2="Half"),I1+1,0)))
```

### How It Works
- Streak increments by 1 for each consecutive `Full` or `Half` day.
- Resets to `0` on a `Skip` day.
- **Important**: This assumes rows are in chronological order (Python ensures this).

---

## Formula: Level (Column J)

Paste this into cell **J2**, then drag down:

```
=IF(H2="","",INT(SUMPRODUCT(($H$2:H2)*1)/50)+1)
```

### How It Works
- Sums all XP earned from the beginning up to (and including) the current row.
- Every 50 cumulative XP = 1 new level.
- Everyone starts at **Level 1** (0–49 XP).

| Cumulative XP | Level |
|---|---|
| 0–49 | 1 |
| 50–99 | 2 |
| 100–149 | 3 |
| 150–199 | 4 |
| ... | ... |

---

## Dashboard Tab Formulas (Sheet 2: `Dashboard`)

Create a second tab called **Dashboard** and paste these:

| Cell | Label (put in A) | Formula (put in B) |
|---|---|---|
| A1 / B1 | Total XP | `=SUM(Daily_Log!H:H)` |
| A2 / B2 | Current Level | `=INT(B1/50)+1` |
| A3 / B3 | Current Streak | `=INDEX(Daily_Log!I:I,COUNTA(Daily_Log!A:A))` |
| A4 / B4 | Best Streak | `=MAX(Daily_Log!I:I)` |
| A5 / B5 | Total Workouts | `=COUNTA(Daily_Log!A:A)-1` |
| A6 / B6 | Full Workouts | `=COUNTIF(Daily_Log!B:B,"Full")` |
| A7 / B7 | Half Workouts | `=COUNTIF(Daily_Log!B:B,"Half")` |
| A8 / B8 | Avg Duration (min) | `=IFERROR(AVERAGE(Daily_Log!C:C),"—")` |
| A9 / B9 | Total Pushup Reps | `=SUM(Daily_Log!D:D)` |
| A10 / B10 | Avg Pain Trend | `=IFERROR(COUNTIF(Daily_Log!E:E,"Better")/(COUNTA(Daily_Log!E:E)),"—")` |

### Recommended Charts (create in Sheets UI)

1. **Pain vs. Sitting Hours** — Scatter plot: X = `G:G` (Sitting), Y = a numeric encoding of `E:E`.
   - Tip: Add a helper column `L` with formula `=IF(E2="Better",1,IF(E2="Same",0,-1))` and chart that.

2. **Pushup Volume Over Time** — Line chart: X = `A:A` (Date), Y = `D:D` (Pushup_Volume).

3. **XP Accumulation** — Line chart: X = `A:A` (Date), Y = `J:J` (Level) or cumulative XP.

---

## Tips

- **Drag formulas down** after pasting into row 2. Select H2:J2 → drag the fill handle down to ~row 200.
- Alternatively, use **ArrayFormula** versions to auto-expand (but they're harder to debug).
- **Don't sort the sheet** — streak calculation depends on chronological row order.
- The Python script guarantees rows are appended in date order.
