import { createId } from "../../core/uid.js";
import { parseCsv, toCsv } from "./csv.js";

const EXERCISE_COLUMNS = [
  "slug",
  "name",
  "aliases",
  "category",
  "movement_pattern",
  "equipment",
  "primary_muscles",
  "secondary_muscles",
  "summary",
  "why_it_helps",
  "source_name",
  "source_url",
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

export function exportExerciseCatalogToCsv(exercises) {
  const rows = exercises.map((exercise) => ({
    slug: exercise.slug,
    name: exercise.name,
    aliases: (exercise.aliases ?? []).join("|"),
    category: exercise.category ?? "",
    movement_pattern: exercise.movementPattern ?? "",
    equipment: (exercise.equipment ?? []).join("|"),
    primary_muscles: (exercise.primaryMuscles ?? []).join("|"),
    secondary_muscles: (exercise.secondaryMuscles ?? []).join("|"),
    summary: exercise.summary ?? "",
    why_it_helps: exercise.whyItHelps ?? "",
    source_name: exercise.sourceName ?? "",
    source_url: exercise.sourceUrl ?? "",
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
      return {
        id: createId("exercise_ref"),
        slug: ensureUniqueSlug(baseSlug, usedSlugs),
        name: row.name?.trim() || row.slug?.trim() || "Untitled Exercise",
        aliases: splitList(row.aliases),
        category: row.category?.trim() || "strength",
        movementPattern: row.movement_pattern?.trim() || "",
        equipment: splitList(row.equipment),
        primaryMuscles: splitList(row.primary_muscles),
        secondaryMuscles: splitList(row.secondary_muscles),
        summary: row.summary?.trim() || "",
        whyItHelps: row.why_it_helps?.trim() || "",
        sourceName: row.source_name?.trim() || "",
        sourceUrl: row.source_url?.trim() || "",
        notes: row.notes?.trim() || "",
      };
    });
}
