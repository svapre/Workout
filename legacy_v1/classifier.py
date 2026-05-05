"""
classifier.py — Workout classification and metric extraction.

Responsibilities:
  • Classify each day as Full / Half / Skip based on Stage-1 keyword presence.
  • Calculate total push-up volume per day.
  • Extract additional metrics: total volume, sets count, exercise list.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

from csv_parser import DailyWorkout
from config import STAGE1_KEYWORDS, PUSHUP_KEYWORDS, FULL_THRESHOLD


@dataclass
class ClassifiedDay:
    """Final processed row, ready for Google Sheets insertion."""
    date: str               # YYYY-MM-DD
    workout_type: str       # "Full" | "Half" | "Skip"
    duration_min: int       # total workout minutes
    pushup_volume: int      # total push-up reps
    total_volume: int       # sets × reps × weight (training load)
    total_sets: int         # number of sets performed
    exercises_done: str     # comma-separated unique exercise names


def _count_stage1_keywords(workout: DailyWorkout) -> int:
    """
    Count how many *unique* Stage-1 keywords appear among the
    exercises in a daily workout (case-insensitive substring match).
    """
    # Collect all exercise names for the day (lowercased)
    exercise_names = [s.exercise_name.lower() for s in workout.exercises]

    matched = set()
    for keyword in STAGE1_KEYWORDS:
        kw_lower = keyword.lower()
        for name in exercise_names:
            if kw_lower in name:
                matched.add(kw_lower)
                break  # one match per keyword is enough

    return len(matched)


def _sum_pushup_volume(workout: DailyWorkout) -> int:
    """Sum total reps across all push-up-like exercises."""
    total = 0
    for s in workout.exercises:
        name_lower = s.exercise_name.lower()
        if any(kw in name_lower for kw in PUSHUP_KEYWORDS):
            total += s.reps
    return total


def _calc_total_volume(workout: DailyWorkout) -> int:
    """Calculate total training volume (reps × weight) across all sets."""
    total = 0
    for s in workout.exercises:
        total += s.reps * s.weight
    return int(total)


def _unique_exercises(workout: DailyWorkout) -> str:
    """Return comma-separated list of unique exercise names."""
    seen = []
    for s in workout.exercises:
        name = s.exercise_name.strip()
        if name and name not in seen:
            seen.append(name)
    return ", ".join(seen)


def classify(workout: DailyWorkout) -> ClassifiedDay:
    """
    Classify a single day's workout and extract metrics.

    Rules:
      ≥ FULL_THRESHOLD unique Stage-1 keywords → "Full"
      1 to (FULL_THRESHOLD-1)                  → "Half"
      0                                         → "Skip"
    """
    keyword_count = _count_stage1_keywords(workout)

    if keyword_count >= FULL_THRESHOLD:
        workout_type = "Full"
    elif keyword_count >= 1:
        workout_type = "Half"
    else:
        workout_type = "Skip"

    return ClassifiedDay(
        date=workout.date,
        workout_type=workout_type,
        duration_min=workout.duration_min,
        pushup_volume=_sum_pushup_volume(workout),
        total_volume=_calc_total_volume(workout),
        total_sets=len(workout.exercises),
        exercises_done=_unique_exercises(workout),
    )


def classify_all(workouts: List[DailyWorkout]) -> List[ClassifiedDay]:
    """Classify a list of daily workouts."""
    return [classify(w) for w in workouts]

