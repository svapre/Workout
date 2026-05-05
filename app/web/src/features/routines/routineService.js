import { createId } from "../../core/uid.js";
import { exportRoutinesToCsv, importRoutinesFromCsv } from "../../data/csv/routineCsv.js";

function cloneRoutines(routines) {
  return structuredClone(routines);
}

function withTimestamp(routine) {
  return { ...routine, updatedAt: new Date().toISOString() };
}

function createExercise(order) {
  return {
    id: createId("exercise"),
    order,
    name: `Exercise ${order}`,
    exerciseSlug: "",
    mode: "reps-only",
    targetSets: 3,
    targetReps: 10,
    targetDurationSec: null,
    targetWeightKg: 0,
    restSec: 45,
    notes: "",
  };
}

function renumberExercises(exercises) {
  return exercises.map((exercise, index) => ({
    ...exercise,
    order: index + 1,
  }));
}

function uniqueCopyName(baseName, existingNames) {
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let index = 2;
  let candidate = `${baseName} Copy`;
  while (existingNames.has(candidate)) {
    candidate = `${baseName} Copy ${index}`;
    index += 1;
  }

  return candidate;
}

function parseFieldValue(key, value) {
  const numericFields = new Set([
    "targetSets",
    "targetReps",
    "targetDurationSec",
    "targetWeightKg",
    "restSec",
  ]);

  if (!numericFields.has(key)) {
    return value;
  }

  if (value === "" || value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createRoutineService(repository) {
  function save(routines) {
    repository.replaceAll(routines);
    return repository.list();
  }

  function updateRoutineCollection(mutator) {
    const current = repository.list();
    const next = mutator(cloneRoutines(current));
    return save(next);
  }

  return {
    getAll() {
      return repository.list();
    },
    createRoutine() {
      const now = new Date().toISOString();
      const current = repository.list();
      const existingNames = new Set(current.map((routine) => routine.name));
      const routineName = uniqueCopyName("New Routine", existingNames);
      const routine = {
        id: createId("routine"),
        name: routineName,
        notes: "",
        createdAt: now,
        updatedAt: now,
        exercises: [createExercise(1)],
      };

      save([...current, routine]);
      return routine;
    },
    duplicateRoutine(routineId) {
      const current = repository.list();
      const source = current.find((routine) => routine.id === routineId);
      if (!source) {
        throw new Error("Routine not found.");
      }

      const existingNames = new Set(current.map((routine) => routine.name));
      const now = new Date().toISOString();
      const routine = {
        ...structuredClone(source),
        id: createId("routine"),
        name: uniqueCopyName(source.name, existingNames),
        createdAt: now,
        updatedAt: now,
        exercises: source.exercises.map((exercise, index) => ({
          ...structuredClone(exercise),
          id: createId("exercise"),
          order: index + 1,
        })),
      };

      save([...current, routine]);
      return routine;
    },
    deleteRoutine(routineId) {
      const current = repository.list();
      const deleted = current.find((routine) => routine.id === routineId);
      if (!deleted) {
        throw new Error("Routine not found.");
      }

      save(current.filter((routine) => routine.id !== routineId));
      return deleted;
    },
    updateRoutine(routineId, patch) {
      updateRoutineCollection((routines) => routines.map((routine) => {
        if (routine.id !== routineId) {
          return routine;
        }

        return withTimestamp({
          ...routine,
          ...patch,
        });
      }));
    },
    addExercise(routineId) {
      updateRoutineCollection((routines) => routines.map((routine) => {
        if (routine.id !== routineId) {
          return routine;
        }

        const exercises = [...routine.exercises, createExercise(routine.exercises.length + 1)];
        return withTimestamp({ ...routine, exercises });
      }));
    },
    updateExercise(routineId, exerciseId, patch) {
      updateRoutineCollection((routines) => routines.map((routine) => {
        if (routine.id !== routineId) {
          return routine;
        }

        const exercises = routine.exercises.map((exercise) => {
          if (exercise.id !== exerciseId) {
            return exercise;
          }

          const parsedPatch = Object.fromEntries(
            Object.entries(patch).map(([key, value]) => [key, parseFieldValue(key, value)]),
          );
          return { ...exercise, ...parsedPatch };
        });

        return withTimestamp({ ...routine, exercises });
      }));
    },
    deleteExercise(routineId, exerciseId) {
      updateRoutineCollection((routines) => routines.map((routine) => {
        if (routine.id !== routineId) {
          return routine;
        }

        const remaining = routine.exercises.filter((exercise) => exercise.id !== exerciseId);
        const exercises = renumberExercises(remaining.length ? remaining : [createExercise(1)]);
        return withTimestamp({ ...routine, exercises });
      }));
    },
    moveExercise(routineId, exerciseId, direction) {
      updateRoutineCollection((routines) => routines.map((routine) => {
        if (routine.id !== routineId) {
          return routine;
        }

        const index = routine.exercises.findIndex((exercise) => exercise.id === exerciseId);
        if (index < 0) {
          return routine;
        }

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= routine.exercises.length) {
          return routine;
        }

        const exercises = [...routine.exercises];
        [exercises[index], exercises[targetIndex]] = [exercises[targetIndex], exercises[index]];
        return withTimestamp({ ...routine, exercises: renumberExercises(exercises) });
      }));
    },
    importFromCsv(csvText) {
      const current = repository.list();
      const existingNames = new Set(current.map((routine) => routine.name));
      const imported = importRoutinesFromCsv(csvText, existingNames);
      const next = [...current, ...imported];
      save(next);
      return {
        count: imported.length,
        firstRoutineId: imported[0]?.id ?? null,
      };
    },
    importPrepared(routines) {
      const current = repository.list();
      const existingNames = new Set(current.map((routine) => routine.name));
      const imported = routines.map((routine) => {
        let name = routine.name || "Imported Routine";
        if (existingNames.has(name)) {
          name = uniqueCopyName(name, existingNames);
        }
        existingNames.add(name);
        return {
          ...routine,
          name,
        };
      });
      save([...current, ...imported]);
      return {
        count: imported.length,
        firstRoutineId: imported[0]?.id ?? null,
      };
    },
    exportToCsv(scope, routineId) {
      const routines = repository.list();
      const selected = scope === "selected"
        ? routines.filter((routine) => routine.id === routineId)
        : routines;
      const payload = exportRoutinesToCsv(selected);
      return {
        ...payload,
        fileName: scope === "selected" ? "routine-template.csv" : "routine-templates.csv",
      };
    },
  };
}
