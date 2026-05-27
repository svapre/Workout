import { exportExerciseCatalogToCsv, importExerciseCatalogFromCsv } from "../../data/csv/exerciseCatalogCsv.js";

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSlug(baseSlug, usedSlugs) {
  if (!usedSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let index = 2;
  let candidate = `${baseSlug}-${index}`;
  while (usedSlugs.has(candidate)) {
    index += 1;
    candidate = `${baseSlug}-${index}`;
  }
  return candidate;
}

export function createExerciseService(repository) {
  function save(exercises) {
    repository.replaceAll(exercises);
    return repository.list();
  }

  return {
    getAll() {
      return repository.list().sort((left, right) => left.name.localeCompare(right.name));
    },
    getById(exerciseId) {
      return repository.list().find((exercise) => exercise.id === exerciseId) ?? null;
    },
    deleteExercise(exerciseId) {
      const current = repository.list();
      const next = current.filter((exercise) => exercise.id !== exerciseId);
      if (next.length === current.length) {
        return false;
      }
      save(next);
      return true;
    },
    importFromCsv(csvText) {
      const current = repository.list();
      const usedSlugs = new Set(current.map((exercise) => exercise.slug));
      const imported = importExerciseCatalogFromCsv(csvText, usedSlugs);
      save([...current, ...imported]);
      return {
        count: imported.length,
        firstExerciseId: imported[0]?.id ?? null,
      };
    },
    importPrepared(exercises) {
      const current = repository.list();
      const usedSlugs = new Set(current.map((exercise) => exercise.slug));
      const normalized = exercises.map((exercise) => {
        const baseSlug = slugify(exercise.slug || exercise.name || "exercise");
        const slug = uniqueSlug(baseSlug, usedSlugs);
        usedSlugs.add(slug);
        return { ...exercise, slug };
      });
      save([...current, ...normalized]);
      return {
        count: normalized.length,
        firstExerciseId: normalized[0]?.id ?? null,
      };
    },
    exportToCsv() {
      const payload = exportExerciseCatalogToCsv(repository.list());
      return {
        ...payload,
        fileName: "exercise-catalog.csv",
      };
    },
  };
}
