import { createId } from "../../core/uid.js";
import { parseCsv, toCsv } from "./csv.js";

const ROUTINE_COLUMNS = [
  "routine_name",
  "exercise_order",
  "exercise_name",
  "exercise_slug",
  "mode",
  "target_sets",
  "target_reps",
  "target_duration_sec",
  "target_weight_kg",
  "rest_sec",
  "notes",
];

function toNumberOrNull(value) {
  if (value === "" || value == null) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function ensureUniqueName(baseName, existingNames) {
  if (!existingNames.has(baseName)) {
    existingNames.add(baseName);
    return baseName;
  }

  let index = 2;
  let candidate = `${baseName} (${index})`;
  while (existingNames.has(candidate)) {
    index += 1;
    candidate = `${baseName} (${index})`;
  }

  existingNames.add(candidate);
  return candidate;
}

export function exportRoutinesToCsv(routines) {
  const rows = routines.flatMap((routine) => routine.exercises.map((exercise, index) => ({
      routine_name: routine.name,
      exercise_order: index + 1,
      exercise_name: exercise.name,
      exercise_slug: exercise.exerciseSlug ?? "",
      mode: exercise.mode,
      target_sets: exercise.targetSets ?? "",
    target_reps: exercise.targetReps ?? "",
    target_duration_sec: exercise.targetDurationSec ?? "",
    target_weight_kg: exercise.targetWeightKg ?? "",
    rest_sec: exercise.restSec ?? "",
    notes: exercise.notes ?? "",
  })));

  return {
    csv: toCsv(rows, ROUTINE_COLUMNS),
    rowCount: rows.length,
  };
}

export function importRoutinesFromCsv(csvText, existingNames) {
  const rows = parseCsv(csvText);
  const grouped = new Map();

  rows.forEach((row) => {
    const routineName = row.routine_name?.trim();
    if (!routineName) {
      return;
    }

    if (!grouped.has(routineName)) {
      grouped.set(routineName, []);
    }

    grouped.get(routineName).push(row);
  });

  const routines = [];

  grouped.forEach((groupRows, requestedName) => {
    const name = ensureUniqueName(requestedName, existingNames);
    const now = new Date().toISOString();
    const exercises = groupRows
      .sort((left, right) => Number(left.exercise_order || 0) - Number(right.exercise_order || 0))
      .map((row, index) => ({
        id: createId("exercise"),
        order: index + 1,
        name: row.exercise_name?.trim() || `Exercise ${index + 1}`,
        exerciseSlug: row.exercise_slug?.trim() || "",
        mode: row.mode?.trim() || "reps-only",
        targetSets: toNumberOrNull(row.target_sets),
        targetReps: toNumberOrNull(row.target_reps),
        targetDurationSec: toNumberOrNull(row.target_duration_sec),
        targetWeightKg: toNumberOrNull(row.target_weight_kg),
        restSec: toNumberOrNull(row.rest_sec),
        notes: row.notes?.trim() || "",
      }));

    routines.push({
      id: createId("routine"),
      name,
      notes: "",
      createdAt: now,
      updatedAt: now,
      exercises,
    });
  });

  return routines;
}
