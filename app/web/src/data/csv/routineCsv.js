import { createId } from "../../core/uid.js";
import { mapTrackingType, normalizeRoutineEntryBlocks } from "../schemaMigration.js";
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
  "side_mode",
  "transition_after_seconds",
  "transition_label",
  "entry_blocks_json",
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

function inferEntryTrackingType(entry) {
  if (entry?.trackingType) {
    return mapTrackingType(entry.trackingType);
  }
  if (entry?.weight != null || entry?.targetWeightKg != null) {
    return "weight";
  }
  if (entry?.durationSeconds != null || entry?.targetDurationSec != null) {
    return "duration";
  }
  if (entry?.resistance != null && entry?.resistance !== "") {
    return "resistance";
  }
  return "reps";
}

export function exportRoutinesToCsv(routines) {
  const rows = routines.flatMap((routine) => {
    const entries = routine.entries || routine.exercises || [];
    return entries.map((exercise, index) => ({
      routine_name: routine.name,
      exercise_order: index + 1,
      exercise_name: exercise.name ?? "",
      exercise_slug: exercise.exerciseSlug ?? "",
      tracking_type: inferEntryTrackingType(exercise),
      sets: exercise.sets ?? exercise.targetSets ?? "",
      reps: exercise.reps ?? exercise.targetReps ?? "",
      duration_seconds: exercise.durationSeconds ?? exercise.targetDurationSec ?? "",
      weight_kg: exercise.weight ?? exercise.targetWeightKg ?? "",
      resistance: exercise.resistance ?? "",
      rest_seconds: exercise.restSeconds ?? exercise.restSec ?? "",
      side_mode: exercise.sideMode ?? "",
      transition_after_seconds: exercise.transitionAfterSeconds ?? exercise.transitionSec ?? "",
      transition_label: exercise.transitionLabel ?? exercise.transitionCue ?? "",
      entry_blocks_json:
        Array.isArray(exercise.entryBlocks) && exercise.entryBlocks.length
          ? JSON.stringify(exercise.entryBlocks)
          : "",
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
        const trackingType = mapTrackingType(modeRaw);
        const reps = toNumberOrNull(row.reps ?? row.target_reps);
        const durationSeconds = toNumberOrNull(row.duration_seconds ?? row.target_duration_sec);
        const weight = toNumberOrNull(row.weight_kg ?? row.target_weight_kg);
        const resistance = row.resistance?.trim() || null;
        let entryBlocks = [];
        try {
          entryBlocks = row.entry_blocks_json ? JSON.parse(row.entry_blocks_json) : [];
        } catch {
          entryBlocks = [];
        }
        return {
          id: createId("exercise"),
          order: index + 1,
          name: row.exercise_name?.trim() || `Exercise ${index + 1}`,
          exerciseSlug: row.exercise_slug?.trim() || "",
          sets: toNumberOrNull(row.sets ?? row.target_sets),
          reps: trackingType === "duration" ? null : reps,
          durationSeconds: trackingType === "duration" ? durationSeconds : null,
          weight: trackingType === "weight" ? weight : null,
          resistance: trackingType === "resistance" ? resistance : null,
          restSeconds: toNumberOrNull(row.rest_seconds ?? row.rest_sec),
          sideMode: row.side_mode?.trim() || "",
          transitionAfterSeconds: toNumberOrNull(
            row.transition_after_seconds ?? row.transition_sec,
          ),
          transitionLabel: row.transition_label?.trim() || row.transition_cue?.trim() || "",
          entryBlocks: normalizeRoutineEntryBlocks(Array.isArray(entryBlocks) ? entryBlocks : []),
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
