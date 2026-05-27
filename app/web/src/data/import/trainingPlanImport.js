import { createId } from "../../core/uid.js";
import {
  joinGoals,
  mapTrackingType,
  normalizeRoutineEntryBlocks,
  normalizeTrackingModes,
  PRIMARY_MUSCLE_NAME_TO_BODY_MAP_ID,
  validateMilestoneTestAgainstExercise,
  validateRoutineEntryAgainstExercise,
} from "../schemaMigration.js";

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLookupKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function setLookupValue(lookup, key, exerciseId, { override = false } = {}) {
  const normalized = normalizeLookupKey(key);
  if (!normalized) return;
  if (!override && lookup.has(normalized)) return;
  lookup.set(normalized, exerciseId);
}

function mapMusclesToTargets(list) {
  const ids = [];
  for (const name of list) {
    const id = PRIMARY_MUSCLE_NAME_TO_BODY_MAP_ID[name];
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function normalizeImportOptions(optionsOrSet) {
  if (optionsOrSet instanceof Set || optionsOrSet == null) {
    return {
      existingExercises: [],
      usedExerciseSlugs: optionsOrSet ?? new Set(),
    };
  }

  return {
    existingExercises: Array.isArray(optionsOrSet.existingExercises)
      ? optionsOrSet.existingExercises
      : [],
    usedExerciseSlugs: optionsOrSet.usedExerciseSlugs instanceof Set
      ? optionsOrSet.usedExerciseSlugs
      : new Set(),
  };
}

function normalizeExerciseCatalogItem(item, usedSlugs) {
  const trackingType = mapTrackingType(item.trackingType ?? item.mode ?? "reps-only");
  const baseSlug = slugify(item.slug || item.name || "exercise");
  let slug = baseSlug;
  let index = 2;
  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }
  usedSlugs.add(slug);

  const primaryList = splitList(item.primaryMuscles ?? item.primary_muscles);
  const bodyTargetsRaw = item.bodyTargets;
  const bodyTargets = Array.isArray(bodyTargetsRaw) && bodyTargetsRaw.length
    ? bodyTargetsRaw.map(String)
    : mapMusclesToTargets(primaryList);

  return {
    id: createId("exercise_ref"),
    slug,
    name: item.name?.trim() || slug,
    aliases: splitList(item.aliases),
    category: item.category?.trim() || "strength",
    type: item.type?.trim() || "physical",
    trackingType,
    executionUnitType: item.executionUnitType?.trim() || item.execution_unit_type?.trim() || "",
    supportedTrackingModes: normalizeTrackingModes(
      item.supportedTrackingModes ?? item.supported_tracking_modes,
      trackingType,
    ),
    equipment: splitList(item.equipment),
    primaryMuscles: primaryList,
    bodyTargets,
    movementPattern: item.movementPattern?.trim() || item.movement_pattern?.trim() || "",
    description: item.description?.trim() || item.summary?.trim() || "",
    whyItHelps: item.whyItHelps?.trim() || item.why_it_helps?.trim() || "",
    sourceName: item.sourceName?.trim() || item.source_name?.trim() || "",
    sourceUrl: item.sourceUrl?.trim() || item.source_url?.trim() || "",
    cues: splitList(item.cues),
    restSeconds: Number.isFinite(Number(item.restSeconds)) ? Number(item.restSeconds) : 60,
    notes: item.notes?.trim() || "",
    isCustom: true,
  };
}

function normalizeExerciseCollection(items, usedSlugs) {
  return Array.isArray(items)
    ? items.map((item) => normalizeExerciseCatalogItem(item, usedSlugs))
    : [];
}

function addExerciseLookupKeys(lookup, exercise, sourceItem = null, { override = false } = {}) {
  setLookupValue(lookup, exercise.id, exercise.id, { override });
  setLookupValue(lookup, exercise.slug, exercise.id, { override });
  setLookupValue(lookup, exercise.name, exercise.id, { override });
  splitList(exercise.aliases).forEach((alias) => {
    setLookupValue(lookup, alias, exercise.id, { override });
  });

  if (!sourceItem || typeof sourceItem !== "object") {
    return;
  }

  setLookupValue(lookup, sourceItem.id, exercise.id, { override: true });
  setLookupValue(lookup, sourceItem.exerciseId, exercise.id, { override: true });
  setLookupValue(lookup, sourceItem.slug, exercise.id, { override: true });
  setLookupValue(lookup, sourceItem.exerciseSlug, exercise.id, { override: true });
  setLookupValue(lookup, sourceItem.name, exercise.id, { override: true });
  setLookupValue(lookup, sourceItem.exerciseName, exercise.id, { override: true });

  splitList(sourceItem.aliases).forEach((alias) => {
    setLookupValue(lookup, alias, exercise.id, { override: true });
  });
}

export function createExerciseReferenceLookup(existingExercises = [], importedExercises = [], importedSourceItems = []) {
  const lookup = new Map();

  existingExercises.forEach((exercise) => {
    addExerciseLookupKeys(lookup, exercise, null, { override: false });
  });

  importedExercises.forEach((exercise, index) => {
    addExerciseLookupKeys(lookup, exercise, importedSourceItems[index], { override: true });
  });

  return lookup;
}

function resolveReferenceValue(value, lookup) {
  const normalized = normalizeLookupKey(value);
  if (!normalized) return null;

  if (lookup.has(normalized)) {
    return lookup.get(normalized);
  }

  const slug = slugify(value);
  if (slug && lookup.has(slug)) {
    return lookup.get(slug);
  }

  return null;
}

export function resolveExerciseReference(item, exerciseLookup) {
  if (!item || !exerciseLookup) return null;

  const candidates = [
    item.exerciseId,
    item.exerciseSlug,
    item.slug,
    item.name,
    item.exerciseName,
  ];

  for (const candidate of candidates) {
    const resolvedId = resolveReferenceValue(candidate, exerciseLookup);
    if (resolvedId) {
      return resolvedId;
    }
  }

  return null;
}

function createUnresolvedRoutineEntryError(unresolvedEntries) {
  const details = unresolvedEntries
    .slice(0, 5)
    .map((entry) => `${entry.routine} (entry ${entry.order}: ${entry.reference})`)
    .join(", ");
  const summary = unresolvedEntries.length > 5
    ? `${details}, and ${unresolvedEntries.length - 5} more`
    : details;

  const error = new Error(
    `Import failed: ${unresolvedEntries.length} routine entr${unresolvedEntries.length === 1 ? "y" : "ies"} could not be matched to an exerciseId. ${summary}`,
  );
  error.code = "UNRESOLVED_ROUTINE_EXERCISES";
  error.details = unresolvedEntries;
  return error;
}

function createInvalidRoutineEntryError(invalidEntries) {
  const details = invalidEntries
    .slice(0, 5)
    .map((entry) => `${entry.routine} (entry ${entry.order}: ${entry.exerciseName})`)
    .join(", ");
  const summary = invalidEntries.length > 5
    ? `${details}, and ${invalidEntries.length - 5} more`
    : details;

  const error = new Error(
    `Import failed: ${invalidEntries.length} routine entr${invalidEntries.length === 1 ? "y is" : "ies are"} incompatible with the selected exercise mode rules. ${summary}`,
  );
  error.code = "INVALID_ROUTINE_ENTRY_MODE";
  error.details = invalidEntries;
  return error;
}

function createInvalidMilestoneTestError(invalidTests) {
  const details = invalidTests
    .slice(0, 5)
    .map((entry) => `${entry.stage} (${entry.exerciseName || entry.reference})`)
    .join(", ");
  const summary = invalidTests.length > 5
    ? `${details}, and ${invalidTests.length - 5} more`
    : details;

  const error = new Error(
    `Import failed: ${invalidTests.length} milestone test${invalidTests.length === 1 ? " is" : "s are"} incompatible with the selected exercise mode rules. ${summary}`,
  );
  error.code = "INVALID_MILESTONE_TEST";
  error.details = invalidTests;
  return error;
}

function normalizeRoutineExercise(
  item,
  order,
  exerciseLookup,
  exerciseCatalogById,
  routineName,
  unresolvedEntries,
  invalidEntries,
) {
  const exerciseId = resolveExerciseReference(item, exerciseLookup);
  if (!exerciseId) {
    unresolvedEntries.push({
      routine: routineName || "Imported Routine",
      order,
      reference: item.exerciseId || item.exerciseSlug || item.slug || item.name || item.exerciseName || "unknown",
    });
  }

  const exercise = exerciseCatalogById.get(exerciseId);
  if (exercise) {
    const validation = validateRoutineEntryAgainstExercise(item, exercise);
    if (validation.issues.length) {
      invalidEntries.push({
        routine: routineName || "Imported Routine",
        order,
        exerciseId,
        exerciseName: exercise.name || exerciseId,
        issues: validation.issues,
      });
    }
  }

  return {
    id: item.id ?? createId("exercise"),
    exerciseId: exerciseId ?? "",
    order,
    sets: Number.isFinite(Number(item.sets ?? item.targetSets)) ? Number(item.sets ?? item.targetSets) : 0,
    reps: Number.isFinite(Number(item.reps ?? item.targetReps)) ? Number(item.reps ?? item.targetReps) : null,
    repTargetMode: item.repTargetMode?.trim() || null,
    durationSeconds: Number.isFinite(Number(item.durationSeconds ?? item.targetDurationSec))
      ? Number(item.durationSeconds ?? item.targetDurationSec)
      : null,
    weight: Number.isFinite(Number(item.weight ?? item.targetWeightKg))
      ? Number(item.weight ?? item.targetWeightKg)
      : null,
    resistance: item.resistance?.trim() || null,
    restSeconds: Number.isFinite(Number(item.restSeconds ?? item.restSec))
      ? Number(item.restSeconds ?? item.restSec)
      : null,
    sideMode: item.sideMode?.trim() || "",
    tempoMode: item.tempoMode?.trim() || null,
    tempoSecondsPerRep: Number.isFinite(Number(item.tempoSecondsPerRep ?? item.secondsPerRep ?? item.cadenceSeconds))
      ? Number(item.tempoSecondsPerRep ?? item.secondsPerRep ?? item.cadenceSeconds)
      : null,
    tempoDownSeconds: Number.isFinite(Number(item.tempoDownSeconds ?? item.downSeconds ?? item.eccentricSeconds))
      ? Number(item.tempoDownSeconds ?? item.downSeconds ?? item.eccentricSeconds)
      : null,
    tempoBottomHoldSeconds: Number.isFinite(Number(
      item.tempoBottomHoldSeconds ?? item.bottomHoldSeconds ?? item.pauseBottomSeconds,
    ))
      ? Number(item.tempoBottomHoldSeconds ?? item.bottomHoldSeconds ?? item.pauseBottomSeconds)
      : null,
    tempoUpSeconds: Number.isFinite(Number(item.tempoUpSeconds ?? item.upSeconds ?? item.concentricSeconds))
      ? Number(item.tempoUpSeconds ?? item.upSeconds ?? item.concentricSeconds)
      : null,
    tempoTopHoldSeconds: Number.isFinite(Number(
      item.tempoTopHoldSeconds ?? item.topHoldSeconds ?? item.pauseTopSeconds,
    ))
      ? Number(item.tempoTopHoldSeconds ?? item.topHoldSeconds ?? item.pauseTopSeconds)
      : null,
    tempoLabel: item.tempoLabel?.trim() || item.tempo?.trim() || null,
    transitionAfterSeconds: Number.isFinite(
      Number(item.transitionAfterSeconds ?? item.transitionSec),
    )
      ? Number(item.transitionAfterSeconds ?? item.transitionSec)
      : null,
    transitionLabel: item.transitionLabel?.trim() || item.transitionCue?.trim() || "",
    entryBlocks: normalizeRoutineEntryBlocks(item.entryBlocks ?? item.blocks),
    notes: item.notes?.trim() || "",
  };
}

function normalizeRoutine(item, exerciseLookup, exerciseCatalogById, unresolvedEntries, invalidEntries) {
  const now = new Date().toISOString();
  const rawEntries = item.entries ?? item.exercises ?? [];
  const routineName = item.name?.trim() || "Imported Routine";
  const entries = Array.isArray(rawEntries)
    ? rawEntries.map((exercise, index) => normalizeRoutineExercise(
      exercise,
      index + 1,
      exerciseLookup,
      exerciseCatalogById,
      routineName,
      unresolvedEntries,
      invalidEntries,
    ))
    : [];

  return {
    id: createId("routine"),
    name: routineName,
    description: item.description?.trim() || item.notes?.trim() || "",
    notes: item.notes?.trim() || "",
    isCustom: true,
    difficultyScore: Number.isFinite(Number(item.difficultyScore)) ? Number(item.difficultyScore) : 1,
    createdAt: now,
    updatedAt: now,
    entries,
  };
}

function remapStageSchedule(stage, routineIdMap) {
  if (!stage || typeof stage !== "object") {
    return stage;
  }

  const schedule = Array.isArray(stage.schedule)
    ? stage.schedule.map((entry) => {
        if (entry?.type !== "routine" || !entry.routineId) {
          return entry;
        }
        return {
          ...entry,
          routineId: routineIdMap.get(entry.routineId) ?? entry.routineId,
        };
      })
    : undefined;

  return {
    id: createId("stage"),
    ...stage,
    schedule,
    milestone: stage.milestone && typeof stage.milestone === "object"
      ? {
          ...stage.milestone,
          test: stage.milestone.test && typeof stage.milestone.test === "object"
            ? {
                ...stage.milestone.test,
                routineId: stage.milestone.test.routineId
                  ? routineIdMap.get(stage.milestone.test.routineId) ?? stage.milestone.test.routineId
                  : null,
              }
            : stage.milestone.test,
        }
      : stage.milestone,
  };
}

function normalizeStageMilestoneTest(
  stage,
  routineIdMap,
  exerciseLookup,
  routinesById,
  exerciseCatalogById,
  invalidTests,
) {
  if (!stage?.milestone?.test || stage.milestone.test.type !== "exercise") {
    return stage;
  }

  const nextStage = {
    ...stage,
    milestone: {
      ...stage.milestone,
      test: {
        ...stage.milestone.test,
      },
    },
  };
  const test = nextStage.milestone.test;
  const stageLabel = nextStage.name || nextStage.id || "Imported Stage";

  if (test.source === "stage_entry") {
    const resolvedRoutineId = test.routineId ? routineIdMap.get(test.routineId) ?? test.routineId : null;
    nextStage.milestone.test.routineId = resolvedRoutineId;
    const routine = resolvedRoutineId ? routinesById.get(resolvedRoutineId) : null;
    const routineEntry = (routine?.entries || []).find((entry) => entry.id === test.routineEntryId) || null;

    if (!routineEntry) {
      invalidTests.push({
        stage: stageLabel,
        reference: test.routineEntryId || "missing routine entry",
        exerciseName: null,
        issues: [{
          code: "UNKNOWN_MILESTONE_ENTRY",
          message: `Milestone test references missing routine entry "${test.routineEntryId ?? "unknown"}".`,
        }],
      });
      return nextStage;
    }

    nextStage.milestone.test.exerciseId = routineEntry.exerciseId;
    const exercise = exerciseCatalogById.get(routineEntry.exerciseId) || null;
    const validation = validateMilestoneTestAgainstExercise(test, exercise, routineEntry);
    nextStage.milestone.test.metric = validation.test.metric;

    if (validation.issues.length) {
      invalidTests.push({
        stage: stageLabel,
        reference: routineEntry.id,
        exerciseName: exercise?.name || routineEntry.exerciseId,
        issues: validation.issues,
      });
    }

    return nextStage;
  }

  const resolvedExerciseId = resolveExerciseReference(test, exerciseLookup);
  if (!resolvedExerciseId) {
    invalidTests.push({
      stage: stageLabel,
      reference: test.exerciseId || "unknown exercise",
      exerciseName: null,
      issues: [{
        code: "UNKNOWN_MILESTONE_EXERCISE",
        message: `Milestone test references unknown exercise "${test.exerciseId ?? "unknown"}".`,
      }],
    });
    return nextStage;
  }

  nextStage.milestone.test.exerciseId = resolvedExerciseId;
  const exercise = exerciseCatalogById.get(resolvedExerciseId) || null;
  const validation = validateMilestoneTestAgainstExercise(test, exercise);
  nextStage.milestone.test.metric = validation.test.metric;

  if (validation.issues.length) {
    invalidTests.push({
      stage: stageLabel,
      reference: resolvedExerciseId,
      exerciseName: exercise?.name || resolvedExerciseId,
      issues: validation.issues,
    });
  }

  return nextStage;
}

export function parseTrainingPlanImport(text, optionsOrSet) {
  const payload = JSON.parse(text);
  const plan = payload.type === "training_plan"
    ? payload
    : { routines: payload.routines ?? [], exerciseCatalog: payload.exerciseCatalog ?? [] };
  const { existingExercises, usedExerciseSlugs } = normalizeImportOptions(optionsOrSet);
  const importedExerciseSourceItems = Array.isArray(plan.exerciseCatalog) ? plan.exerciseCatalog : [];
  const exercises = normalizeExerciseCollection(importedExerciseSourceItems, usedExerciseSlugs);
  const exerciseLookup = createExerciseReferenceLookup(existingExercises, exercises, importedExerciseSourceItems);
  const unresolvedEntries = [];
  const invalidEntries = [];
  const invalidMilestoneTests = [];
  const exerciseCatalogById = new Map([
    ...existingExercises.map((exercise) => [exercise.id, exercise]),
    ...exercises.map((exercise) => [exercise.id, exercise]),
  ]);

  const routines = Array.isArray(plan.routines)
    ? plan.routines.map((item) => normalizeRoutine(item, exerciseLookup, exerciseCatalogById, unresolvedEntries, invalidEntries))
    : [];

  if (unresolvedEntries.length) {
    throw createUnresolvedRoutineEntryError(unresolvedEntries);
  }
  if (invalidEntries.length) {
    throw createInvalidRoutineEntryError(invalidEntries);
  }

  const routineIdMap = new Map();
  (plan.routines ?? []).forEach((routine, index) => {
    if (routine?.id) {
      routineIdMap.set(routine.id, routines[index]?.id);
    }
  });
  const routinesById = new Map(routines.map((routine) => [routine.id, routine]));

  const goals = Array.isArray(plan.goals)
    ? plan.goals.map((goal) => (typeof goal === "string" ? { id: createId("goal"), title: goal } : { id: createId("goal"), ...goal }))
    : [];

  const stages = Array.isArray(plan.stages)
    ? plan.stages
      .map((stage) => remapStageSchedule(stage, routineIdMap))
      .map((stage) => normalizeStageMilestoneTest(
        stage,
        routineIdMap,
        exerciseLookup,
        routinesById,
        exerciseCatalogById,
        invalidMilestoneTests,
      ))
    : [];

  if (invalidMilestoneTests.length) {
    throw createInvalidMilestoneTestError(invalidMilestoneTests);
  }

  return {
    planName: plan.planName?.trim() || "",
    description: plan.description?.trim() || "",
    goals,
    stages,
    exercises,
    routines,
  };
}

export function parseExerciseImportJson(text, usedExerciseSlugs) {
  const payload = JSON.parse(text);
  if (Array.isArray(payload)) {
    return normalizeExerciseCollection(payload, usedExerciseSlugs);
  }

  if (Array.isArray(payload.exerciseCatalog)) {
    return normalizeExerciseCollection(payload.exerciseCatalog, usedExerciseSlugs);
  }

  if (Array.isArray(payload.exercises)) {
    return normalizeExerciseCollection(payload.exercises, usedExerciseSlugs);
  }

  return [];
}
