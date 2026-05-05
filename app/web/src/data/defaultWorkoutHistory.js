import { createId } from "../core/uid.js";

function createSet(config) {
  return {
    id: createId("set"),
    exerciseOrder: config.exerciseOrder,
    exerciseName: config.exerciseName,
    setNumber: config.setNumber,
    actualReps: config.actualReps,
    actualWeightKg: config.actualWeightKg,
    targetReps: config.targetReps ?? null,
    targetDurationSec: config.targetDurationSec ?? null,
    setDurationSec: config.setDurationSec ?? null,
    notes: config.notes ?? "",
  };
}

function createWorkout(config) {
  return {
    id: createId("workout"),
    workoutDate: config.workoutDate,
    routineName: config.routineName,
    startedAt: config.startedAt,
    endedAt: config.endedAt,
    workoutDurationSec: config.workoutDurationSec,
    classification: config.classification,
    pushupVolume: config.pushupVolume,
    totalVolume: config.totalVolume,
    totalSets: config.totalSets,
    notes: config.notes ?? "",
    source: config.source,
    sourceHasSetTiming: config.sourceHasSetTiming,
    sets: config.sets.map(createSet),
  };
}

export function createSeedWorkoutHistory() {
  return [
    createWorkout({
      workoutDate: "2026-05-03",
      routineName: "Morning Corrective",
      startedAt: "2026-05-03T07:00:00",
      endedAt: "2026-05-03T07:20:15",
      workoutDurationSec: 1215,
      classification: "Full",
      pushupVolume: 15,
      totalVolume: 0,
      totalSets: 8,
      source: "Imported from sample_data/strong_export.csv",
      sourceHasSetTiming: false,
      sets: [
        { exerciseOrder: 1, exerciseName: "Surya Namaskar", setNumber: 1, actualReps: 12, actualWeightKg: 0 },
        { exerciseOrder: 2, exerciseName: "Bird Dog", setNumber: 1, actualReps: 10, actualWeightKg: 0 },
        { exerciseOrder: 2, exerciseName: "Bird Dog", setNumber: 2, actualReps: 10, actualWeightKg: 0 },
        { exerciseOrder: 3, exerciseName: "Glute Bridge", setNumber: 1, actualReps: 15, actualWeightKg: 0 },
        { exerciseOrder: 3, exerciseName: "Glute Bridge", setNumber: 2, actualReps: 15, actualWeightKg: 0 },
        { exerciseOrder: 4, exerciseName: "Band Pull-Apart", setNumber: 1, actualReps: 12, actualWeightKg: 0 },
        { exerciseOrder: 5, exerciseName: "Push-up", setNumber: 1, actualReps: 8, actualWeightKg: 0 },
        { exerciseOrder: 5, exerciseName: "Push-up", setNumber: 2, actualReps: 7, actualWeightKg: 0 }
      ]
    }),
    createWorkout({
      workoutDate: "2026-05-04",
      routineName: "Quick Stretch",
      startedAt: "2026-05-04T07:30:00",
      endedAt: "2026-05-04T07:42:00",
      workoutDurationSec: 720,
      classification: "Half",
      pushupVolume: 10,
      totalVolume: 0,
      totalSets: 3,
      source: "Imported from sample_data/strong_export.csv",
      sourceHasSetTiming: false,
      sets: [
        { exerciseOrder: 1, exerciseName: "Surya Namaskar", setNumber: 1, actualReps: 10, actualWeightKg: 0 },
        { exerciseOrder: 2, exerciseName: "Glute Bridge", setNumber: 1, actualReps: 12, actualWeightKg: 0 },
        { exerciseOrder: 3, exerciseName: "Push-up", setNumber: 1, actualReps: 10, actualWeightKg: 0 }
      ]
    }),
    createWorkout({
      workoutDate: "2026-05-05",
      routineName: "Strength Test",
      startedAt: "2026-05-05T08:00:00",
      endedAt: "2026-05-05T08:25:45",
      workoutDurationSec: 1545,
      classification: "Logged",
      pushupVolume: 0,
      totalVolume: 860,
      totalSets: 3,
      source: "Imported from sample_data/strong_export.csv",
      sourceHasSetTiming: false,
      notes: "Seeded from the workout you already logged today.",
      sets: [
        { exerciseOrder: 1, exerciseName: "Bench Press", setNumber: 1, actualReps: 8, actualWeightKg: 40 },
        { exerciseOrder: 1, exerciseName: "Bench Press", setNumber: 2, actualReps: 6, actualWeightKg: 40 },
        { exerciseOrder: 2, exerciseName: "Lat Pulldown", setNumber: 1, actualReps: 10, actualWeightKg: 30 }
      ]
    })
  ];
}
