export function createRoutineRepository(localStore, seedFactory) {
  const seeded = localStore.load();
  let routines = Array.isArray(seeded?.routines) && seeded.routines.length
    ? seeded.routines
    : seedFactory();

  persist();

  function persist() {
    localStore.save({ routines });
  }

  return {
    list() {
      return structuredClone(routines);
    },
    replaceAll(nextRoutines) {
      routines = structuredClone(nextRoutines);
      persist();
    },
  };
}
