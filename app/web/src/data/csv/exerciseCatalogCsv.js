import { createId } from "../../core/uid.js";
import { mapTrackingType, PRIMARY_MUSCLE_NAME_TO_BODY_MAP_ID } from "../schemaMigration.js";
import { parseCsv, toCsv } from "./csv.js";

const EXERCISE_COLUMNS = [
  "slug",
  "name",
  "aliases",
  "category",
  "type",
  "tracking_type",
  "equipment",
  "body_targets",
  "primary_muscles",
  "movement_pattern",
  "description",
  "why_it_helps",
  "source_name",
  "source_url",
  "cues",
  "rest_seconds",
  "notes",
];

function splitList(value) {
  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ensureUniqueSlug(baseSlug, usedSlugs) {
  if (!usedSlugs.has(baseSlug)) {
    usedSlugs.add(baseSlug);
    return baseSlug;
  }

  let index = 2;
  let candidate = `${baseSlug}-${index}`;
  while (usedSlugs.has(candidate)) {
    index += 1;
    candidate = `${baseSlug}-${index}`;
  }
  usedSlugs.add(candidate);
  return candidate;
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapMusclesToTargets(list) {
  const ids = [];
  for (const name of list) {
    const id = PRIMARY_MUSCLE_NAME_TO_BODY_MAP_ID[name];
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function exportExerciseCatalogToCsv(exercises) {
  const rows = exercises.map((exercise) => ({
    slug: exercise.slug,
    name: exercise.name,
    aliases: (exercise.aliases ?? []).join("|"),
    category: exercise.category ?? "",
    type: exercise.type ?? "",
    tracking_type: exercise.trackingType ?? mapTrackingType(exercise.mode),
    equipment: (exercise.equipment ?? []).join("|"),
    body_targets: (exercise.bodyTargets ?? []).join("|"),
    primary_muscles: (exercise.primaryMuscles ?? []).join("|"),
    movement_pattern: exercise.movementPattern ?? "",
    description: exercise.description ?? exercise.summary ?? "",
    why_it_helps: exercise.whyItHelps ?? "",
    source_name: exercise.sourceName ?? "",
    source_url: exercise.sourceUrl ?? "",
    cues: (exercise.cues ?? []).join("|"),
    rest_seconds: exercise.restSeconds ?? 60,
    notes: exercise.notes ?? "",
  }));

  return {
    csv: toCsv(rows, EXERCISE_COLUMNS),
    rowCount: rows.length,
  };
}

export function importExerciseCatalogFromCsv(csvText, usedSlugs) {
  const rows = parseCsv(csvText);
  return rows
    .filter((row) => row.name?.trim() || row.slug?.trim())
    .map((row) => {
      const baseSlug = slugify(row.slug || row.name || "exercise");
      const primaryList = splitList(row.primary_muscles);
      const bodyTargets = row.body_targets?.trim()
        ? splitList(row.body_targets)
        : mapMusclesToTargets(primaryList);

      return {
        id: createId("exercise_ref"),
        slug: ensureUniqueSlug(baseSlug, usedSlugs),
        name: row.name?.trim() || row.slug?.trim() || "Untitled Exercise",
        aliases: splitList(row.aliases),
        category: row.category?.trim() || "strength",
        type: row.type?.trim() || "physical",
        trackingType: mapTrackingType(row.tracking_type?.trim() || row.mode?.trim() || "reps-only"),
        equipment: splitList(row.equipment),
        primaryMuscles: primaryList,
        bodyTargets,
        movementPattern: row.movement_pattern?.trim() || "",
        description: row.description?.trim() || row.summary?.trim() || "",
        whyItHelps: row.why_it_helps?.trim() || "",
        sourceName: row.source_name?.trim() || "",
        sourceUrl: row.source_url?.trim() || "",
        cues: splitList(row.cues),
        restSeconds: Number.isFinite(Number(row.rest_seconds)) ? Number(row.rest_seconds) : 60,
        notes: row.notes?.trim() || "",
        isCustom: true,
      };
    });
}
