import { createId } from "../../core/uid.js";

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

function normalizeExerciseCatalogItem(item, usedSlugs) {
  const baseSlug = slugify(item.slug || item.name || "exercise");
  let slug = baseSlug;
  let index = 2;
  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }
  usedSlugs.add(slug);

  return {
    id: createId("exercise_ref"),
    slug,
    name: item.name?.trim() || slug,
    aliases: splitList(item.aliases),
    category: item.category?.trim() || "strength",
    movementPattern: item.movementPattern?.trim() || item.movement_pattern?.trim() || "",
    equipment: splitList(item.equipment),
    primaryMuscles: splitList(item.primaryMuscles ?? item.primary_muscles),
    secondaryMuscles: splitList(item.secondaryMuscles ?? item.secondary_muscles),
    summary: item.summary?.trim() || "",
    whyItHelps: item.whyItHelps?.trim() || item.why_it_helps?.trim() || "",
    sourceName: item.sourceName?.trim() || item.source_name?.trim() || "",
    sourceUrl: item.sourceUrl?.trim() || item.source_url?.trim() || "",
    notes: item.notes?.trim() || "",
  };
}

function normalizeExerciseCollection(items, usedSlugs) {
  return Array.isArray(items)
    ? items.map((item) => normalizeExerciseCatalogItem(item, usedSlugs))
    : [];
}

function normalizeRoutineExercise(item, order) {
  const mode = item.mode?.trim() || "reps-only";
  return {
    id: createId("exercise"),
    order,
    name: item.name?.trim() || item.exerciseName?.trim() || `Exercise ${order}`,
    exerciseSlug: item.exerciseSlug?.trim() || item.slug?.trim() || "",
    mode,
    targetSets: Number.isFinite(Number(item.targetSets)) ? Number(item.targetSets) : null,
    targetReps: Number.isFinite(Number(item.targetReps)) ? Number(item.targetReps) : null,
    targetDurationSec: Number.isFinite(Number(item.targetDurationSec)) ? Number(item.targetDurationSec) : null,
    targetWeightKg: Number.isFinite(Number(item.targetWeightKg)) ? Number(item.targetWeightKg) : null,
    restSec: Number.isFinite(Number(item.restSec)) ? Number(item.restSec) : null,
    notes: item.notes?.trim() || "",
  };
}

function normalizeRoutine(item) {
  const now = new Date().toISOString();
  const exercises = Array.isArray(item.exercises)
    ? item.exercises.map((exercise, index) => normalizeRoutineExercise(exercise, index + 1))
    : [];

  return {
    id: createId("routine"),
    name: item.name?.trim() || "Imported Routine",
    notes: item.notes?.trim() || "",
    createdAt: now,
    updatedAt: now,
    exercises,
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
