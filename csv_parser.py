"""
csv_parser.py — Ingest and normalize Strong app CSV exports.

Handles:
  • Fuzzy column-name matching (strips whitespace, case-insensitive).
  • Date normalization → YYYY-MM-DD.
  • Duration string parsing ("1h 20m 30s" → minutes).
  • Groups rows (one-per-set) into per-day summaries.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

import pandas as pd

from config import CSV_COLUMNS


# ── Data structures ──────────────────────────────────────────────────────────

@dataclass
class SetRecord:
    """A single set from the Strong CSV."""
    exercise_name: str
    reps: int
    weight: float
    seconds: int


@dataclass
class DailyWorkout:
    """Aggregated workout data for one calendar day."""
    date: str                           # YYYY-MM-DD
    exercises: List[SetRecord] = field(default_factory=list)
    duration_min: int = 0               # total workout duration


# ── Helpers ──────────────────────────────────────────────────────────────────

def _fuzzy_match_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Map actual CSV headers to our canonical names.

    Strategy: keyword-based matching to handle Strong export variants
    like "Weight (kg)", "Duration (sec)", "Exercise Name", etc.
    """
    # Keyword rules: canonical_name → list of keywords that must ALL appear
    KEYWORD_RULES = [
        ("date",             ["date"]),
        ("workout_name",     ["workout", "name"]),
        ("exercise_name",    ["exercise", "name"]),
        ("set_order",        ["set", "order"]),
        ("weight",           ["weight"]),
        ("reps",             ["reps"]),
        ("distance",         ["distance"]),
        ("seconds",          ["seconds"]),
        ("workout_duration", ["duration"]),
        ("rpe",              ["rpe"]),
        ("notes",            ["notes"]),
        ("workout_notes",    ["workout", "notes"]),
    ]

    rename_map: dict[str, str] = {}
    used_canonical: set[str] = set()

    for col in df.columns:
        cleaned = col.strip().lower()
        for canonical, keywords in KEYWORD_RULES:
            if canonical in used_canonical:
                continue
            if all(kw in cleaned for kw in keywords):
                rename_map[col] = canonical
                used_canonical.add(canonical)
                break

    df = df.rename(columns=rename_map)

    # Handle "Duration (sec)" → convert seconds to the "Xh Ym Zs" format
    # so _parse_duration works correctly
    if "workout_duration" in df.columns:
        sample = df["workout_duration"].dropna().iloc[0] if len(df["workout_duration"].dropna()) > 0 else ""
        if str(sample).isdigit():
            # It's raw seconds — convert to minutes directly
            df["workout_duration"] = pd.to_numeric(df["workout_duration"], errors="coerce").fillna(0)
            df["workout_duration"] = df["workout_duration"].apply(
                lambda s: f"{int(s)//3600}h {(int(s)%3600)//60}m {int(s)%60}s" if s > 0 else ""
            )

    return df


def _parse_duration(duration_str: str) -> int:
    """
    Parse Strong's duration format into total minutes (rounded).

    Accepted patterns:
      "1h 20m 30s"  →  81
      "20m 15s"     →  20
      "45s"         →  1
      "1h"          →  60
    """
    if not isinstance(duration_str, str) or not duration_str.strip():
        return 0

    hours = minutes = seconds = 0

    h_match = re.search(r"(\d+)\s*h", duration_str, re.IGNORECASE)
    m_match = re.search(r"(\d+)\s*m", duration_str, re.IGNORECASE)
    s_match = re.search(r"(\d+)\s*s", duration_str, re.IGNORECASE)

    if h_match:
        hours = int(h_match.group(1))
    if m_match:
        minutes = int(m_match.group(1))
    if s_match:
        seconds = int(s_match.group(1))

    total_minutes = hours * 60 + minutes + round(seconds / 60)
    return max(total_minutes, 1) if (hours or minutes or seconds) else 0


# ── Public API ───────────────────────────────────────────────────────────────

def parse_csv(csv_path: str | Path) -> List[DailyWorkout]:
    """
    Read a Strong app CSV and return a list of DailyWorkout objects,
    one per unique date, sorted chronologically.

    Parameters
    ----------
    csv_path : path to the CSV file exported from Strong.

    Returns
    -------
    List of DailyWorkout, sorted by date ascending.
    """
    csv_path = Path(csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    # Auto-detect delimiter: Strong exports may use comma or semicolon
    raw = open(csv_path, encoding="utf-8-sig").read(2000)
    if raw.count(";") > raw.count(","):
        sep = ";"
    else:
        sep = ","

    df = pd.read_csv(csv_path, encoding="utf-8-sig", sep=sep, quotechar='"')
    df = _fuzzy_match_columns(df)

    # Validate required columns exist after mapping
    required = {"date", "exercise_name"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(
            f"CSV is missing required columns after mapping: {missing}\n"
            f"Found columns: {list(df.columns)}"
        )

    # Normalize dates → YYYY-MM-DD
    df["date"] = pd.to_datetime(df["date"], format="mixed", dayfirst=False).dt.strftime("%Y-%m-%d")

    # Fill missing numeric columns
    for col in ("reps", "weight", "seconds"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)
        else:
            df[col] = 0

    # Group by date
    daily_workouts: List[DailyWorkout] = []

    for date_str, group in df.groupby("date", sort=True):
        sets: List[SetRecord] = []
        for _, row in group.iterrows():
            sets.append(SetRecord(
                exercise_name=str(row.get("exercise_name", "")).strip(),
                reps=int(row.get("reps", 0)),
                weight=float(row.get("weight", 0)),
                seconds=int(row.get("seconds", 0)),
            ))

        # Duration: take the first non-empty Workout Duration in the group
        duration_min = 0
        if "workout_duration" in group.columns:
            for val in group["workout_duration"].dropna().unique():
                parsed = _parse_duration(str(val))
                if parsed > 0:
                    duration_min = parsed
                    break

        daily_workouts.append(DailyWorkout(
            date=str(date_str),
            exercises=sets,
            duration_min=duration_min,
        ))

    return daily_workouts
