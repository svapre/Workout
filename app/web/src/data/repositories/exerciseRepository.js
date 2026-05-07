import { migrateExercise } from "../schemaMigration.js";

export function createExerciseRepository(localStore, seedFactory) {
  const seeded = localStore.load();
  let exercises = Array.isArray(seeded?.exercises) && seeded.exercises.length
    ? seeded.exercises.map(migrateExercise)
    : seedFactory().map(migrateExercise);

  persist();

  function persist() {
    localStore.save({ exercises });
  }

  return {
    list() {
      return structuredClone(exercises);
    },
    replaceAll(nextExercises) {
      exercises = structuredClone(nextExercises).map(migrateExercise);
      persist();
    },
  };
}
