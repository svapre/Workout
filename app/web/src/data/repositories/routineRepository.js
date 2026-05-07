import { migrateRoutine } from "../schemaMigration.js";

export function createRoutineRepository(localStore, seedFactory, options = {}) {
  const { getExerciseCatalog } = options;

  const seeded = localStore.load();
  const catalog = typeof getExerciseCatalog === "function" ? getExerciseCatalog() : [];
  let routines = Array.isArray(seeded?.routines) && seeded.routines.length
    ? seeded.routines.map((r) => migrateRoutine(r, catalog))
    : seedFactory().map((r) => migrateRoutine(r, catalog));

  persist();

  function persist() {
    localStore.save({ routines });
  }

  return {
    list() {
      return structuredClone(routines);
    },
    replaceAll(nextRoutines) {
      const cat = typeof getExerciseCatalog === "function" ? getExerciseCatalog() : [];
      routines = structuredClone(nextRoutines).map((r) => migrateRoutine(r, cat));
      persist();
    },
  };
}
