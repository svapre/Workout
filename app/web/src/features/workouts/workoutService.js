function sortByStartedAtDesc(workouts) {
  return [...workouts].sort((left, right) =>
    (right.startedAt || "").localeCompare(left.startedAt || ""),
  );
}

export function createWorkoutService(repository) {
  return {
    getAll() {
      return sortByStartedAtDesc(repository.list());
    },
    getLatest() {
      return this.getAll()[0] ?? null;
    },
    getById(workoutId) {
      return repository.list().find((workout) => workout.id === workoutId) ?? null;
    },
    appendSession(session) {
      repository.appendSession(session);
      return this.getAll();
    },
    updateSession(workoutId, patch) {
      repository.updateSession(workoutId, patch);
      return this.getAll();
    },
    getSummary() {
      const workouts = this.getAll();
      const latest = workouts[0] ?? null;
      return {
        totalWorkouts: workouts.length,
        latestWorkoutId: latest?.id ?? null,
        latestWorkoutDate: latest?.startedAt ?? null,
        totalSets: workouts.reduce((sum, workout) => sum + (workout.sets?.length ?? 0), 0),
        totalVolume: 0,
      };
    },
  };
}
