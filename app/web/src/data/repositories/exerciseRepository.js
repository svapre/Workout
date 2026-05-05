export function createExerciseRepository(localStore, seedFactory) {
  const seeded = localStore.load();
  let exercises = Array.isArray(seeded?.exercises) && seeded.exercises.length
    ? seeded.exercises
    : seedFactory();

  persist();

  function persist() {
    localStore.save({ exercises });
  }

  return {
    list() {
      return structuredClone(exercises);
    },
    replaceAll(nextExercises) {
      exercises = structuredClone(nextExercises);
      persist();
    },
  };
}
