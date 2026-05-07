import { createId } from "../../core/uid.js";
import { mapTrackingType } from "../schemaMigration.js";
import { parseCsv, toCsv } from "./csv.js";

const ROUTINE_COLUMNS = [
  "routine_name",
  "exercise_order",
  "exercise_name",
  "exercise_slug",
  "tracking_type",
  "sets",
  "reps",
  "duration_seconds",
  "weight_kg",
  "resistance",
  "rest_seconds",
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
  const rows = routines.flatMap((routine) => {
    const entries = routine.entries || routine.exercises || [];
    return entries.map((exercise, index) => ({
      routine_name: routine.name,
      exercise_order: index + 1,
      exercise_name: exercise.name ?? "",
      exercise_slug: exercise.exerciseSlug ?? "",
      tracking_type: mapTrackingType(exercise.trackingType ?? exercise.mode ?? "reps"),
      sets: exercise.sets ?? exercise.targetSets ?? "",
      reps: exercise.reps ?? exercise.targetReps ?? "",
      duration_seconds: exercise.durationSeconds ?? exercise.targetDurationSec ?? "",
      weight_kg: exercise.weight ?? exercise.targetWeightKg ?? "",
      resistance: exercise.resistance ?? "",
      rest_seconds: exercise.restSeconds ?? exercise.restSec ?? "",
      notes: exercise.notes ?? "",
    }));
  });

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
      .map((row, index) => {
        const modeRaw = row.tracking_type?.trim() || row.mode?.trim() || "reps-only";
        return {
          id: createId("exercise"),
          order: index + 1,
          name: row.exercise_name?.trim() || `Exercise ${index + 1}`,
          exerciseSlug: row.exercise_slug?.trim() || "",
          trackingType: mapTrackingType(modeRaw),
          sets: toNumberOrNull(row.sets ?? row.target_sets),
          reps: toNumberOrNull(row.reps ?? row.target_reps),
          durationSeconds: toNumberOrNull(row.duration_seconds ?? row.target_duration_sec),
          weight: toNumberOrNull(row.weight_kg ?? row.target_weight_kg),
          resistance: row.resistance?.trim() || null,
          restSeconds: toNumberOrNull(row.rest_seconds ?? row.rest_sec),
          notes: row.notes?.trim() || "",
        };
      });

    routines.push({
      id: createId("routine"),
      name,
      description: "",
      notes: "",
      isCustom: true,
      difficultyScore: 1,
      createdAt: now,
      updatedAt: now,
      entries: exercises,
    });
  });

  return routines;
}
