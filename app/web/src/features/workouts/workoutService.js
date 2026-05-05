function sortByStartedAtDesc(workouts) {
  return [...workouts].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
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
    getSummary() {
      const workouts = this.getAll();
      const latest = workouts[0] ?? null;
      return {
        totalWorkouts: workouts.length,
        latestWorkoutId: latest?.id ?? null,
        latestWorkoutDate: latest?.workoutDate ?? null,
        totalSets: workouts.reduce((sum, workout) => sum + (workout.totalSets ?? 0), 0),
        totalVolume: workouts.reduce((sum, workout) => sum + (workout.totalVolume ?? 0), 0)
      };
    }
  };
}
