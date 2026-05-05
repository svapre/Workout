"""
cloud_function/main.py — Google Cloud Function entry point.

Deployed as a Cloud Function, triggered by Cloud Scheduler.
Checks the "Strong Exports" Drive folder for new CSVs, processes them,
and uploads results to Google Sheets.

Deploy:
    gcloud functions deploy workout-processor \
        --runtime python312 \
        --trigger-http \
        --allow-unauthenticated \
        --entry-point process \
        --timeout 60 \
        --memory 256MB \
        --region us-central1

Schedule (every 30 min):
    gcloud scheduler jobs create http workout-check \
        --schedule "*/30 * * * *" \
        --uri "YOUR_CLOUD_FUNCTION_URL" \
        --http-method GET
"""

import csv
import io
import json
import os
import re
from dataclasses import dataclass, field
from typing import List

import gspread
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# ── Configuration ────────────────────────────────────────────────────────────

SPREADSHEET_NAME = "Workout Tracker"
DAILY_LOG_SHEET = "Daily_Log"
DRIVE_FOLDER_NAME = "Workout Tracker Inbox"

STAGE1_KEYWORDS = ["surya namaskar", "bird dog", "glute bridge", "band pull-apart", "row"]
PUSHUP_KEYWORDS = ["push-up", "pushup", "push up"]
FULL_THRESHOLD = 3

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
]

# Credentials: either from env var (Cloud) or file (local)
def _get_creds():
    creds_json = os.environ.get("GOOGLE_CREDENTIALS")
    if creds_json:
        info = json.loads(creds_json)
        return Credentials.from_service_account_info(info, scopes=SCOPES)
    else:
        return Credentials.from_service_account_file("credentials.json", scopes=SCOPES)


# ── Data structures ─────────────────────────────────────────────────────────

@dataclass
class SetRecord:
    exercise_name: str
    reps: int
    weight: float

@dataclass
class DailyWorkout:
    date: str
    exercises: List[SetRecord] = field(default_factory=list)
    duration_min: int = 0

@dataclass
class ClassifiedDay:
    date: str
    workout_type: str
    duration_min: int
    pushup_volume: int
    total_volume: int
    total_sets: int
    exercises_done: str


# ── CSV parsing ──────────────────────────────────────────────────────────────

def _parse_duration(s: str) -> int:
    if not s or not s.strip():
        return 0
    h = re.search(r"(\d+)\s*h", s, re.I)
    m = re.search(r"(\d+)\s*m", s, re.I)
    sec = re.search(r"(\d+)\s*s", s, re.I)
    total = (int(h.group(1)) * 60 if h else 0) + (int(m.group(1)) if m else 0) + (round(int(sec.group(1)) / 60) if sec else 0)
    return max(total, 1) if (h or m or sec) else 0


def parse_csv_content(content: str) -> List[DailyWorkout]:
    """Parse CSV content string into DailyWorkout objects."""
    # Auto-detect delimiter
    sample = content[:2000]
    delimiter = ";" if sample.count(";") > sample.count(",") else ","

    reader = csv.DictReader(io.StringIO(content), delimiter=delimiter)

    # Keyword-based header matching
    col_map = {}
    for field_name in (reader.fieldnames or []):
        clean = field_name.strip().lower()
        if "date" in clean and "date" not in col_map:
            col_map["date"] = field_name
        elif "exercise" in clean and "name" in clean:
            col_map["exercise_name"] = field_name
        elif clean == "reps" or "reps" in clean:
            col_map["reps"] = field_name
        elif "weight" in clean and "weight" not in col_map:
            col_map["weight"] = field_name
        elif "duration" in clean:
            col_map["workout_duration"] = field_name

    # Group by date
    from collections import defaultdict
    from datetime import datetime

    days = defaultdict(lambda: {"exercises": [], "duration": 0})
    for row in reader:
        raw_date = row.get(col_map.get("date", "Date"), "")
        try:
            dt = datetime.strptime(raw_date.strip()[:10], "%Y-%m-%d")
        except Exception:
            try:
                dt = datetime.strptime(raw_date.strip()[:19], "%Y-%m-%d %H:%M:%S")
            except Exception:
                continue

        date_str = dt.strftime("%Y-%m-%d")
        name = row.get(col_map.get("exercise_name", "Exercise Name"), "").strip()
        reps = int(row.get(col_map.get("reps", "Reps"), 0) or 0)
        weight = float(row.get(col_map.get("weight", "Weight"), 0) or 0)

        days[date_str]["exercises"].append(SetRecord(name, reps, weight))

        dur_str = str(row.get(col_map.get("workout_duration", ""), "") or "")
        if dur_str.strip().isdigit():
            # Raw seconds
            dur_min = max(int(dur_str) // 60, 1)
        else:
            dur_min = _parse_duration(dur_str)
        if dur_min > days[date_str]["duration"]:
            days[date_str]["duration"] = dur_min

    result = []
    for date_str in sorted(days.keys()):
        d = days[date_str]
        result.append(DailyWorkout(date=date_str, exercises=d["exercises"], duration_min=d["duration"]))
    return result


# ── Classification ───────────────────────────────────────────────────────────

def classify(workout: DailyWorkout) -> ClassifiedDay:
    names = [s.exercise_name.lower() for s in workout.exercises]
    matched = set()
    for kw in STAGE1_KEYWORDS:
        for name in names:
            if kw in name:
                matched.add(kw)
                break

    wtype = "Full" if len(matched) >= FULL_THRESHOLD else ("Half" if len(matched) >= 1 else "Skip")

    pushup_vol = sum(s.reps for s in workout.exercises if any(k in s.exercise_name.lower() for k in PUSHUP_KEYWORDS))
    total_vol = int(sum(s.reps * s.weight for s in workout.exercises))
    exercises = ", ".join(dict.fromkeys(s.exercise_name for s in workout.exercises if s.exercise_name))

    return ClassifiedDay(workout.date, wtype, workout.duration_min, pushup_vol, total_vol, len(workout.exercises), exercises)


# ── Main Cloud Function ─────────────────────────────────────────────────────

def process(request=None):
    """Cloud Function entry point. Also works locally."""
    creds = _get_creds()
    drive = build("drive", "v3", credentials=creds)
    gc = gspread.authorize(creds)

    # Find the inbox folder
    q = f"name='{DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    folders = drive.files().list(q=q, fields="files(id)").execute().get("files", [])
    if not folders:
        return {"status": "no_folder", "message": f"'{DRIVE_FOLDER_NAME}' folder not found"}
    folder_id = folders[0]["id"]

    # Find processed subfolder
    pq = f"name='processed' and mimeType='application/vnd.google-apps.folder' and '{folder_id}' in parents and trashed=false"
    pfolders = drive.files().list(q=pq, fields="files(id)").execute().get("files", [])
    if pfolders:
        processed_id = pfolders[0]["id"]
    else:
        meta = {"name": "processed", "mimeType": "application/vnd.google-apps.folder", "parents": [folder_id]}
        processed_id = drive.files().create(body=meta, fields="id").execute()["id"]

    # List CSVs
    cq = f"'{folder_id}' in parents and trashed=false and (mimeType='text/csv' or name contains '.csv')"
    csvs = drive.files().list(q=cq, fields="files(id,name)").execute().get("files", [])

    if not csvs:
        return {"status": "ok", "message": "No new CSVs", "processed": 0}

    # Open the spreadsheet
    sh = gc.open(SPREADSHEET_NAME)
    ws = sh.worksheet(DAILY_LOG_SHEET)

    # Check existing dates
    col_a = ws.col_values(1)
    existing_dates = set(col_a[1:]) if len(col_a) > 1 else set()

    total_inserted = 0

    for csv_file in csvs:
        # Download CSV content
        req = drive.files().get_media(fileId=csv_file["id"])
        buf = io.BytesIO()
        dl = MediaIoBaseDownload(buf, req)
        done = False
        while not done:
            _, done = dl.next_chunk()
        content = buf.getvalue().decode("utf-8-sig")

        # Parse & classify
        workouts = parse_csv_content(content)
        classified = [classify(w) for w in workouts]

        # Filter new dates
        new_days = [c for c in classified if c.date not in existing_dates]

        if new_days:
            rows = [[c.date, c.workout_type, c.duration_min, c.pushup_volume,
                      c.total_volume, c.total_sets, c.exercises_done] for c in new_days]
            next_row = len(existing_dates) + 2
            end_row = next_row + len(rows) - 1
            ws.update(f"A{next_row}:G{end_row}", rows, value_input_option="RAW")
            existing_dates.update(c.date for c in new_days)
            total_inserted += len(new_days)

        # Move to processed
        drive.files().update(
            fileId=csv_file["id"],
            addParents=processed_id,
            removeParents=folder_id,
        ).execute()

    return {"status": "ok", "processed": total_inserted, "files": len(csvs)}


# Local testing
if __name__ == "__main__":
    result = process()
    print(json.dumps(result, indent=2))
