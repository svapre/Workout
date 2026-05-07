import { createId } from "../../core/uid.js";
import { joinGoals, mapTrackingType, PRIMARY_MUSCLE_NAME_TO_BODY_MAP_ID } from "../schemaMigration.js";

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

function mapMusclesToTargets(list) {
  const ids = [];
  for (const name of list) {
    const id = PRIMARY_MUSCLE_NAME_TO_BODY_MAP_ID[name];
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function normalizeExerciseCatalogItem(item, usedSlugs) {
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
    trackingType: mapTrackingType(item.trackingType ?? item.mode ?? "reps-only"),
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

function normalizeRoutineExercise(item, order) {
  const trackingType = mapTrackingType(item.trackingType ?? item.mode ?? "reps-only");
  return {
    id: createId("exercise"),
    order,
    name: item.name?.trim() || item.exerciseName?.trim() || `Exercise ${order}`,
    exerciseSlug: item.exerciseSlug?.trim() || item.slug?.trim() || "",
    trackingType,
    sets: Number.isFinite(Number(item.sets ?? item.targetSets)) ? Number(item.sets ?? item.targetSets) : null,
    reps: Number.isFinite(Number(item.reps ?? item.targetReps)) ? Number(item.reps ?? item.targetReps) : null,
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
    notes: item.notes?.trim() || "",
  };
}

function normalizeRoutine(item) {
  const now = new Date().toISOString();
  const rawEntries = item.entries ?? item.exercises ?? [];
  const entries = Array.isArray(rawEntries)
    ? rawEntries.map((exercise, index) => normalizeRoutineExercise(exercise, index + 1))
    : [];

  return {
    id: createId("routine"),
    name: item.name?.trim() || "Imported Routine",
    description: item.description?.trim() || item.notes?.trim() || "",
    notes: item.notes?.trim() || "",
    isCustom: true,
    difficultyScore: item.difficultyScore ?? 1,
    createdAt: now,
    updatedAt: now,
    entries,
  };
}

export function parseTrainingPlanImport(text, usedExerciseSlugs) {
  const payload = JSON.parse(text);
  const plan = payload.type === "training_plan" ? payload : { routines: payload.routines ?? [], exerciseCatalog: payload.exerciseCatalog ?? [] };

  const exercises = normalizeExerciseCollection(plan.exerciseCatalog, usedExerciseSlugs);

  const routines = Array.isArray(plan.routines)
    ? plan.routines.map(normalizeRoutine)
    : [];

  const goals = Array.isArray(plan.goals)
    ? plan.goals.map(g => typeof g === 'string' ? { id: createId("goal"), title: g } : { id: createId("goal"), ...g })
    : [];

  const stages = Array.isArray(plan.stages)
    ? plan.stages.map(s => ({ id: createId("stage"), ...s }))
    : [];

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
