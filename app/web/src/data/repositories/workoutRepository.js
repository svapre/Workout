export function createWorkoutRepository(localStore, seedFactory) {
  const seeded = localStore.load();
  let workouts = Array.isArray(seeded?.workouts) && seeded.workouts.length
    ? seeded.workouts
    : seedFactory();

  persist();

  function persist() {
    localStore.save({ workouts });
  }

  return {
    list() {
      return structuredClone(workouts);
    },
    replaceAll(nextWorkouts) {
      workouts = structuredClone(nextWorkouts);
      persist();
    }
  };
}
