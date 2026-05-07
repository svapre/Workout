import { migrateWorkoutSession } from "../schemaMigration.js";

export function createWorkoutRepository(localStore, seedFactory) {
  const seeded = localStore.load();
  let workouts = Array.isArray(seeded?.workouts) && seeded.workouts.length
    ? seeded.workouts.map(migrateWorkoutSession)
    : seedFactory().map(migrateWorkoutSession);

  persist();

  function persist() {
    localStore.save({ workouts });
  }

  return {
    list() {
      return structuredClone(workouts);
    },
    replaceAll(nextWorkouts) {
      workouts = structuredClone(nextWorkouts).map(migrateWorkoutSession);
      persist();
    },
    appendSession(session) {
      const normalized = migrateWorkoutSession(session);
      workouts = [normalized, ...workouts];
      persist();
      return structuredClone(normalized);
    },
  };
}
