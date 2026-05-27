import { createId } from "../../core/uid.js";
import {
  createDefaultMilestone,
  createActivePlanFromBlueprint,
  joinGoals,
  migrateActivePlan,
  migrateBlueprint,
  migrateExercise,
  normalizeRoutineEntryBlocks,
  migrateRoutine,
  migrateStage,
  migrateWorkoutSession,
  validateMilestoneTestAgainstExercise,
  validateRoutineEntryAgainstExercise,
} from "../../data/schemaMigration.js";
import {
  createExerciseReferenceLookup,
  resolveExerciseReference,
} from "../../data/import/trainingPlanImport.js";
import { generateUniquePlanName } from "../activePlans/activePlanUtils.js";
import {
  applyPreparedActivePlanRevision,
  prepareActivePlanRevisionReview,
  refreshActivePlanRevisionReview,
} from "./activePlanRevision.js";

const DEFAULT_DIRECT_EDIT_CHANGE_SUMMARY = "Edited live plan";
const SUPPORTED_EXPORT_VERSION = "1.0";

function normalizeImportedRoutineEntry(entry, index, exerciseLookup, routineLabel, unresolvedEntries) {
  const exerciseId = resolveExerciseReference(entry, exerciseLookup);
  if (!exerciseId) {
    unresolvedEntries.push({
      routine: routineLabel,
      order: index + 1,
      reference: entry.exerciseId || entry.exerciseSlug || entry.slug || entry.name || entry.exerciseName || "unknown",
    });
  }

  return {
    id: entry.id ?? createId("ex_inst"),
    exerciseId: exerciseId ?? "",
    order: entry.order ?? index + 1,
    sets: entry.sets ?? entry.targetSets ?? 3,
    reps: typeof entry.reps === "string" ? parseInt(entry.reps, 10) || 10 : entry.reps ?? entry.targetReps ?? 10,
    repTargetMode: entry.repTargetMode ?? null,
    durationSeconds: entry.durationSeconds ?? entry.targetDurationSec ?? null,
    weight: entry.weight ?? entry.targetWeightKg ?? null,
    resistance: entry.resistance ?? null,
    restSeconds: entry.restSeconds ?? entry.restSec ?? 60,
    sideMode: entry.sideMode ?? "",
    tempoMode: entry.tempoMode ?? null,
    tempoSecondsPerRep: entry.tempoSecondsPerRep ?? entry.secondsPerRep ?? entry.cadenceSeconds ?? null,
    tempoDownSeconds: entry.tempoDownSeconds ?? entry.downSeconds ?? entry.eccentricSeconds ?? null,
    tempoBottomHoldSeconds: entry.tempoBottomHoldSeconds ?? entry.bottomHoldSeconds ?? entry.pauseBottomSeconds ?? null,
    tempoUpSeconds: entry.tempoUpSeconds ?? entry.upSeconds ?? entry.concentricSeconds ?? null,
    tempoTopHoldSeconds: entry.tempoTopHoldSeconds ?? entry.topHoldSeconds ?? entry.pauseTopSeconds ?? null,
    tempoLabel: entry.tempoLabel ?? entry.tempo ?? null,
    transitionAfterSeconds: entry.transitionAfterSeconds ?? entry.transitionSec ?? null,
    transitionLabel: entry.transitionLabel ?? entry.transitionCue ?? "",
    entryBlocks: normalizeRoutineEntryBlocks(entry.entryBlocks ?? entry.blocks),
    notes: entry.notes ?? "",
  };
}

function createUnresolvedRoutineImportError(unresolvedEntries) {
  const details = unresolvedEntries
    .slice(0, 5)
    .map((entry) => `${entry.routine} (entry ${entry.order}: ${entry.reference})`)
    .join(", ");
  const summary = unresolvedEntries.length > 5
    ? `${details}, and ${unresolvedEntries.length - 5} more`
    : details;

  const error = new Error(
    `Import failed: ${unresolvedEntries.length} routine entr${unresolvedEntries.length === 1 ? "y" : "ies"} could not be matched to an exerciseId. ${summary}`,
  );
  error.code = "UNRESOLVED_ROUTINE_EXERCISES";
  error.details = unresolvedEntries;
  return error;
}

function createInvalidRoutineImportError(invalidEntries) {
  const details = invalidEntries
    .slice(0, 5)
    .map((entry) => `${entry.routine} (entry ${entry.order}: ${entry.exerciseName})`)
    .join(", ");
  const summary = invalidEntries.length > 5
    ? `${details}, and ${invalidEntries.length - 5} more`
    : details;

  const error = new Error(
    `Import failed: ${invalidEntries.length} routine entr${invalidEntries.length === 1 ? "y is" : "ies are"} incompatible with the selected exercise mode rules. ${summary}`,
  );
  error.code = "INVALID_ROUTINE_ENTRY_MODE";
  error.details = invalidEntries;
  return error;
}

function createInvalidMilestoneImportError(invalidTests) {
  const details = invalidTests
    .slice(0, 5)
    .map((entry) => `${entry.stage} (${entry.exerciseName || entry.reference})`)
    .join(", ");
  const summary = invalidTests.length > 5
    ? `${details}, and ${invalidTests.length - 5} more`
    : details;

  const error = new Error(
    `Import failed: ${invalidTests.length} milestone test${invalidTests.length === 1 ? " is" : "s are"} incompatible with the selected exercise mode rules. ${summary}`,
  );
  error.code = "INVALID_MILESTONE_TEST";
  error.details = invalidTests;
  return error;
}

function normalizeImportedStageForExerciseRules(stage, routinesById, exerciseLookup, exerciseCatalogById, invalidTests) {
  const migratedStage = migrateStage(stage);
  const nextStage = JSON.parse(JSON.stringify(migratedStage));
  const test = nextStage?.milestone?.test;
  if (test?.type !== "exercise") {
    return nextStage;
  }

  const stageLabel = nextStage.name || nextStage.id || "Imported Stage";

  if (test.source === "stage_entry") {
    const routine = routinesById.get(test.routineId);
    const routineEntry = (routine?.entries || []).find((entry) => entry.id === test.routineEntryId) || null;
    if (!routineEntry) {
      invalidTests.push({
        stage: stageLabel,
        reference: test.routineEntryId || "missing routine entry",
        exerciseName: null,
        issues: [{
          code: "UNKNOWN_MILESTONE_ENTRY",
          message: `Milestone test references missing routine entry "${test.routineEntryId ?? "unknown"}".`,
        }],
      });
      return nextStage;
    }

    nextStage.milestone.test.exerciseId = routineEntry.exerciseId;
    const exercise = exerciseCatalogById.get(routineEntry.exerciseId) || null;
    const validation = validateMilestoneTestAgainstExercise(test, exercise, routineEntry);
    nextStage.milestone.test.metric = validation.test.metric;
    if (validation.issues.length) {
      invalidTests.push({
        stage: stageLabel,
        reference: routineEntry.id,
        exerciseName: exercise?.name || routineEntry.exerciseId,
        issues: validation.issues,
      });
    }
    return nextStage;
  }

  const resolvedExerciseId = resolveExerciseReference(test, exerciseLookup);
  if (!resolvedExerciseId) {
    invalidTests.push({
      stage: stageLabel,
      reference: test.exerciseId || "unknown exercise",
      exerciseName: null,
      issues: [{
        code: "UNKNOWN_MILESTONE_EXERCISE",
        message: `Milestone test references unknown exercise "${test.exerciseId ?? "unknown"}".`,
      }],
    });
    return nextStage;
  }

  nextStage.milestone.test.exerciseId = resolvedExerciseId;
  const exercise = exerciseCatalogById.get(resolvedExerciseId) || null;
  const validation = validateMilestoneTestAgainstExercise(test, exercise);
  nextStage.milestone.test.metric = validation.test.metric;
  if (validation.issues.length) {
    invalidTests.push({
      stage: stageLabel,
      reference: resolvedExerciseId,
      exerciseName: exercise?.name || resolvedExerciseId,
      issues: validation.issues,
    });
  }

  return nextStage;
}

function assertExportDependencies(deps) {
  const {
    bodyMapRepository,
    exerciseRepository,
    routineRepository,
    workoutRepository,
  } = deps;

  if (!workoutRepository || !exerciseRepository || !routineRepository || !bodyMapRepository) {
    throw new Error("Active plan export requires workout, exercise, routine, and body-map repositories.");
  }
}

function assertActivePlanImportDependencies(deps) {
  const {
    bodyMapRepository,
    exerciseRepository,
    routineRepository,
    workoutRepository,
  } = deps;

  if (!workoutRepository || !exerciseRepository || !routineRepository || !bodyMapRepository) {
    throw new Error("Active plan import requires workout, exercise, routine, and body-map repositories.");
  }
}

function assertRevisionDependencies(deps) {
  const {
    exerciseRepository,
    routineRepository,
    bodyMapRepository,
  } = deps;

  if (!exerciseRepository || !routineRepository || !bodyMapRepository) {
    throw new Error("Active plan revision import requires exercise, routine, and body-map repositories.");
  }
}

function collectRoutineIdsFromActivePlan(activePlan) {
  const routineIds = new Set();
  (activePlan.stages || []).forEach((stage) => {
    (stage.schedule || []).forEach((entry) => {
      if (entry?.type === "routine" && entry.routineId) {
        routineIds.add(entry.routineId);
      }
    });
  });
  return routineIds;
}

function collectExerciseIds(activePlan, sessions, routines) {
  const exerciseIds = new Set();

  sessions.forEach((session) => {
    (session.sets || []).forEach((set) => {
      if (set.exerciseId) {
        exerciseIds.add(set.exerciseId);
      }
    });
  });

  routines.forEach((routine) => {
    (routine.entries || []).forEach((entry) => {
      if (entry.exerciseId) {
        exerciseIds.add(entry.exerciseId);
      }
    });
  });

  (activePlan.stages || []).forEach((stage) => {
    if (stage.milestone?.test?.exerciseId) {
      exerciseIds.add(stage.milestone.test.exerciseId);
    }
  });

  return exerciseIds;
}

function collectExerciseIdsFromStages(stages, routines) {
  const exerciseIds = new Set();

  routines.forEach((routine) => {
    (routine.entries || []).forEach((entry) => {
      if (entry.exerciseId) {
        exerciseIds.add(entry.exerciseId);
      }
    });
  });

  (stages || []).forEach((stage) => {
    if (stage.milestone?.test?.exerciseId) {
      exerciseIds.add(stage.milestone.test.exerciseId);
    }
  });

  return exerciseIds;
}

function canonicalBodyTarget(entry) {
  return JSON.stringify({
    name: entry?.name ?? "",
    category: entry?.category ?? "custom",
    isCustom: Boolean(entry?.isCustom),
  });
}

function canonicalExercise(entry) {
  return JSON.stringify(migrateExercise(entry));
}

function canonicalRoutine(entry, exerciseCatalog = []) {
  return JSON.stringify(migrateRoutine(entry, exerciseCatalog));
}

function canonicalWorkoutSession(entry) {
  return JSON.stringify(migrateWorkoutSession(entry));
}

function ensureUniquePackageIds(items, kind) {
  const seen = new Set();
  items.forEach((entry) => {
    const id = entry?.id;
    if (!id) {
      throw new Error(`Imported ${kind} entry is missing an id.`);
    }
    if (seen.has(id)) {
      throw new Error(`Imported ${kind} package contains duplicate id "${id}".`);
    }
    seen.add(id);
  });
}

function getRevisionContext(activeRepo, deps) {
  return {
    activePlans: activeRepo.list(),
    exercises: deps.exerciseRepository?.list?.() ?? [],
    routines: deps.routineRepository?.list?.() ?? [],
    bodyTargets: deps.bodyMapRepository?.getAll?.() ?? [],
  };
}

function buildDirectEditPackage(draftPlan) {
  return {
    exportVersion: "1.0",
    exportedAt: new Date().toISOString(),
    activePlan: draftPlan,
    sessions: [],
    exercises: [],
    routines: [],
    bodyTargets: [],
  };
}

export function createPlanService(blueprintRepo, activeRepo, deps = {}) {
  function getAllBlueprints() {
    return blueprintRepo.list();
  }

  function getBlueprint(id) {
    return getAllBlueprints().find((p) => p.id === id);
  }

  function createBlueprint() {
    const ts = new Date().toISOString();
    const plan = migrateBlueprint({
      id: createId("plan"),
      version: "1.0",
      name: "New Plan",
      description: "",
      goal: "",
      theme: { color: "#4FD1C5", icon: "\uD83D\uDCAA", code: "PLN" },
      createdAt: ts,
      stages: [
        {
          id: createId("stage"),
          name: "Stage 1",
          predecessorStageId: null,
          transitionRule: "prompt_user",
          schedule: [{ type: "rest", routineId: null }],
          milestone: createDefaultMilestone({
            description: "Complete the cycle",
          }),
        },
      ],
    });
    blueprintRepo.replaceAll([...getAllBlueprints(), plan]);
    return plan;
  }

  function updateBlueprint(planId, patch) {
    const plans = getAllBlueprints();
    const index = plans.findIndex((p) => p.id === planId);
    if (index === -1) return null;

    plans[index] = migrateBlueprint({ ...plans[index], ...patch });
    blueprintRepo.replaceAll(plans);
    return plans[index];
  }

  function deleteBlueprint(planId) {
    const plans = getAllBlueprints();
    const index = plans.findIndex((p) => p.id === planId);
    if (index === -1) return null;

    const deleted = plans[index];
    plans.splice(index, 1);
    blueprintRepo.replaceAll(plans);
    return deleted;
  }

  function instantiatePlan(blueprintId, customName) {
    const blueprint = getBlueprint(blueprintId);
    if (!blueprint) return null;

    const currentActive = activeRepo.list();
    const finalName = generateUniquePlanName(customName || blueprint.name, currentActive);
    const activePlan = createActivePlanFromBlueprint(blueprint, {
      displayName: finalName,
      blueprintId,
    });

    activeRepo.replaceAll([...currentActive, activePlan]);
    return true;
  }

  function importPrepared(preparedPlans) {
    const plans = getAllBlueprints();
    const newPlans = preparedPlans.map((p) =>
      migrateBlueprint({
        id: createId("plan"),
        version: "1.0",
        name: p.planName || "Imported Plan",
        description: p.description || "",
        goal: joinGoals(p.goals),
        theme: { color: "#4FD1C5", icon: "\uD83D\uDCAA", code: "PLN" },
        createdAt: new Date().toISOString(),
        stages: (p.stages || []).map((s) => migrateStage(s)),
      }),
    );
    blueprintRepo.replaceAll([...plans, ...newPlans]);
    return { count: newPlans.length, firstPlanId: newPlans[0]?.id };
  }

  function importActivePlanPackage(input) {
    assertActivePlanImportDependencies(deps);

    const rawPackage = typeof input === "string" ? JSON.parse(input) : JSON.parse(JSON.stringify(input));
    const exportVersion = rawPackage?.exportVersion ?? null;
    if (exportVersion !== SUPPORTED_EXPORT_VERSION) {
      throw new Error(`Unsupported active-plan package version "${exportVersion ?? "unknown"}". Expected ${SUPPORTED_EXPORT_VERSION}.`);
    }
    if (!rawPackage?.activePlan || typeof rawPackage.activePlan !== "object") {
      throw new Error("Imported package does not contain an activePlan payload.");
    }

    const localActivePlans = activeRepo.list();
    const localBodyTargets = deps.bodyMapRepository.getAll();
    const localExercises = deps.exerciseRepository.list();
    const localRoutines = deps.routineRepository.list();
    const localWorkouts = deps.workoutRepository.list();

    const importedPlan = migrateActivePlan(rawPackage.activePlan);
    const importedBodyTargets = (Array.isArray(rawPackage.bodyTargets) ? rawPackage.bodyTargets : []).map((entry) => ({
      id: entry?.id ?? "",
      name: entry?.name ?? "",
      category: entry?.category ?? "custom",
      isCustom: Boolean(entry?.isCustom),
    }));
    const importedExercises = (Array.isArray(rawPackage.exercises) ? rawPackage.exercises : []).map((entry) => migrateExercise(entry));
    const importedRoutines = (Array.isArray(rawPackage.routines) ? rawPackage.routines : []).map((entry) => migrateRoutine(entry, importedExercises));
    const importedSessions = (Array.isArray(rawPackage.sessions) ? rawPackage.sessions : []).map((entry) => migrateWorkoutSession(entry));

    ensureUniquePackageIds(importedBodyTargets, "body-target");
    ensureUniquePackageIds(importedExercises, "exercise");
    ensureUniquePackageIds(importedRoutines, "routine");
    ensureUniquePackageIds(importedSessions, "session");

    if (localActivePlans.some((plan) => plan.id === importedPlan.id)) {
      throw new Error(`An active plan named "${importedPlan.displayName || importedPlan.name || importedPlan.id}" already exists in this app.`);
    }

    const mergedBodyTargets = [...localBodyTargets];
    const knownBodyTargetIds = new Set(localBodyTargets.map((entry) => entry.id));
    importedBodyTargets.forEach((entry) => {
      const existing = localBodyTargets.find((target) => target.id === entry.id);
      if (existing) {
        if (canonicalBodyTarget(existing) !== canonicalBodyTarget(entry)) {
          throw new Error(`Body-target conflict for "${entry.name || entry.id}". Import into a clean state or resolve the shared taxonomy first.`);
        }
        return;
      }
      mergedBodyTargets.push(entry);
      knownBodyTargetIds.add(entry.id);
    });

    importedExercises.forEach((exercise) => {
      (exercise.bodyTargets || []).forEach((targetId) => {
        if (!knownBodyTargetIds.has(targetId)) {
          throw new Error(`Imported exercise "${exercise.name || exercise.id}" references unknown body target "${targetId}".`);
        }
      });
    });

    const mergedExercises = [...localExercises];
    const knownExerciseIds = new Set(localExercises.map((entry) => entry.id));
    importedExercises.forEach((exercise) => {
      const existing = localExercises.find((entry) => entry.id === exercise.id);
      if (existing) {
        if (canonicalExercise(existing) !== canonicalExercise(exercise)) {
          throw new Error(`Exercise conflict for "${exercise.name || exercise.id}". Import into a clean state or resolve the shared catalog first.`);
        }
        return;
      }
      mergedExercises.push(exercise);
      knownExerciseIds.add(exercise.id);
    });

    importedRoutines.forEach((routine) => {
      (routine.entries || []).forEach((entry) => {
        if (!knownExerciseIds.has(entry.exerciseId)) {
          throw new Error(`Imported routine "${routine.name || routine.id}" references unknown exercise "${entry.exerciseId}".`);
        }
      });
    });

    const mergedRoutines = [...localRoutines];
    const knownRoutineIds = new Set(localRoutines.map((entry) => entry.id));
    importedRoutines.forEach((routine) => {
      const existing = localRoutines.find((entry) => entry.id === routine.id);
      if (existing) {
        if (canonicalRoutine(existing, mergedExercises) !== canonicalRoutine(routine, mergedExercises)) {
          throw new Error(`Routine conflict for "${routine.name || routine.id}". Import into a clean state or resolve the shared routine library first.`);
        }
        return;
      }
      mergedRoutines.push(routine);
      knownRoutineIds.add(routine.id);
    });

    (importedPlan.stages || []).forEach((stage) => {
      (stage.schedule || []).forEach((entry) => {
        if (entry?.type === "routine" && entry.routineId && !knownRoutineIds.has(entry.routineId)) {
          throw new Error(`Imported active plan references unknown routine "${entry.routineId}" in stage "${stage.name || stage.id}".`);
        }
      });
      const milestoneExerciseId = stage?.milestone?.test?.exerciseId;
      if (milestoneExerciseId && !knownExerciseIds.has(milestoneExerciseId)) {
        throw new Error(`Imported milestone test references unknown exercise "${milestoneExerciseId}" in stage "${stage.name || stage.id}".`);
      }
    });

    const existingWorkoutIds = new Set(localWorkouts.map((entry) => entry.id));
    importedSessions.forEach((session) => {
      if (existingWorkoutIds.has(session.id)) {
        throw new Error(`Workout history already contains session "${session.id}". Import into a clean state before restoring this package.`);
      }
      if (session.activePlanId && session.activePlanId !== importedPlan.id) {
        throw new Error(`Imported session "${session.id}" points at a different active plan id.`);
      }
    });

    const restoredSessionIds = importedSessions.map((session) => session.id);
    const restoredPlan = {
      ...importedPlan,
      sessions: restoredSessionIds,
    };

    deps.bodyMapRepository.replaceAll(mergedBodyTargets);
    deps.exerciseRepository.replaceAll(mergedExercises);
    deps.routineRepository.replaceAll(mergedRoutines);
    deps.workoutRepository.replaceAll([...importedSessions, ...localWorkouts]);
    activeRepo.replaceAll([...localActivePlans, restoredPlan]);

    return restoredPlan;
  }

  function getActivePlan(id) {
    return activeRepo.list().find((p) => p.id === id);
  }

  function updateActivePlan(id, patch) {
    const plans = activeRepo.list();
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) return null;

    plans[index] = { ...plans[index], ...patch };
    activeRepo.replaceAll(plans);
    return plans[index];
  }

  function importFullPlan(data, routineService, exerciseCatalog = []) {
    const exportVersion = data?.exportVersion ?? null;
    if (exportVersion && exportVersion !== SUPPORTED_EXPORT_VERSION) {
      throw new Error(`Unsupported blueprint package version "${exportVersion}". Expected ${SUPPORTED_EXPORT_VERSION}.`);
    }

    if (!data.plan || !data.routines) {
      throw new Error("Invalid plan format");
    }

    const plan = { ...data.plan };

    if (data.stages && !plan.stages) {
      plan.stages = data.stages.map((stage) => {
        if (stage.cycle && !stage.schedule) {
          return {
            ...stage,
            schedule: stage.cycle.map((routineId) => ({
              type: routineId ? "routine" : "rest",
              routineId: routineId || null,
            })),
          };
        }
        return stage;
      });
    }

    const exerciseLookup = createExerciseReferenceLookup(exerciseCatalog);
    const unresolvedEntries = [];
    const invalidEntries = [];
    const mappedRoutines = data.routines.map((routineInput) => {
      const routine = { ...routineInput };
      const rawEntries = routineInput.entries ?? routineInput.exercises ?? [];

      routine.entries = rawEntries.map((entry, index) =>
        normalizeImportedRoutineEntry(
          entry,
          index,
          exerciseLookup,
          routineInput.name || routineInput.id || "Imported Routine",
          unresolvedEntries,
        ),
      );

      routine.entries.forEach((entry, index) => {
        const exercise = exerciseCatalog.find((catalogEntry) => catalogEntry.id === entry.exerciseId) || null;
        if (!exercise) {
          return;
        }
        const validation = validateRoutineEntryAgainstExercise(entry, exercise);
        if (validation.issues.length) {
          invalidEntries.push({
            routine: routineInput.name || routineInput.id || "Imported Routine",
            order: index + 1,
            exerciseId: entry.exerciseId,
            exerciseName: exercise.name || entry.exerciseId,
            issues: validation.issues,
          });
        }
      });

      delete routine.exercises;
      return migrateRoutine(routine, exerciseCatalog);
    });

    if (unresolvedEntries.length) {
      throw createUnresolvedRoutineImportError(unresolvedEntries);
    }
    if (invalidEntries.length) {
      throw createInvalidRoutineImportError(invalidEntries);
    }

    const routinesById = new Map(mappedRoutines.map((routine) => [routine.id, routine]));
    const exerciseCatalogById = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]));
    const invalidMilestoneTests = [];

    const plans = getAllBlueprints();
    const migratedPlan = migrateBlueprint({
      ...plan,
      stages: (plan.stages || []).map((stage) =>
        normalizeImportedStageForExerciseRules(
          stage,
          routinesById,
          exerciseLookup,
          exerciseCatalogById,
          invalidMilestoneTests,
        ),
      ),
    });
    if (invalidMilestoneTests.length) {
      throw createInvalidMilestoneImportError(invalidMilestoneTests);
    }

    routineService.importPrepared(mappedRoutines);
    const existingIndex = plans.findIndex((p) => p.id === plan.id);

    if (existingIndex !== -1) {
      plans[existingIndex] = migratedPlan;
    } else {
      plans.push(migratedPlan);
    }

    blueprintRepo.replaceAll(plans);
    return migratedPlan.id;
  }

  function exportFullPlan(planId, routineService, exerciseCatalog = [], bodyTargets = []) {
    const plan = getBlueprint(planId);
    if (!plan) throw new Error("Plan not found");

    const routineIds = new Set();
    plan.stages.forEach((stage) => {
      stage.schedule.forEach((day) => {
        if (day.routineId) routineIds.add(day.routineId);
      });
    });

    const allRoutines = routineService.getAll();
    const referencedRoutines = allRoutines.filter((routine) => routineIds.has(routine.id));
    const allExercises = Array.isArray(exerciseCatalog) && exerciseCatalog.length
      ? exerciseCatalog
      : deps.exerciseRepository?.list?.() ?? [];
    const exerciseIds = collectExerciseIdsFromStages(plan.stages, referencedRoutines);
    const referencedExercises = allExercises.filter((exercise) => exerciseIds.has(exercise.id));
    const bodyTargetIds = new Set(
      referencedExercises.flatMap((exercise) => exercise.bodyTargets || []).filter(Boolean),
    );
    const allBodyTargets = Array.isArray(bodyTargets) && bodyTargets.length
      ? bodyTargets
      : deps.bodyMapRepository?.getAll?.() ?? [];
    const referencedBodyTargets = allBodyTargets.filter((entry) => bodyTargetIds.has(entry.id));

    return JSON.stringify(
      {
        exportVersion: "1.0",
        exportedAt: new Date().toISOString(),
        plan,
        routines: referencedRoutines,
        stages: plan.stages,
        exercises: referencedExercises,
        bodyTargets: referencedBodyTargets,
      },
      null,
      2,
    );
  }

  function exportActivePlan(activePlanId) {
    assertExportDependencies(deps);

    const activePlan = getActivePlan(activePlanId);
    if (!activePlan) {
      throw new Error("Active plan not found");
    }

    const allSessions = deps.workoutRepository.list();
    const sessionIds = Array.isArray(activePlan.sessions) ? activePlan.sessions : [];
    const sessionIdSet = new Set(sessionIds);
    const sessionById = new Map(allSessions.map((session) => [session.id, session]));
    const exportedSessions = sessionIds
      .map((sessionId) => sessionById.get(sessionId))
      .filter(Boolean);
    const legacySessions = allSessions.filter(
      (session) => session.activePlanId === activePlan.id && !sessionIdSet.has(session.id),
    );
    const sessions = [...exportedSessions, ...legacySessions];

    const routineIds = collectRoutineIdsFromActivePlan(activePlan);
    sessions.forEach((session) => {
      if (session.routineId) {
        routineIds.add(session.routineId);
      }
    });

    const allRoutines = deps.routineRepository.list();
    const routines = allRoutines.filter((routine) => routineIds.has(routine.id));
    const exerciseIds = collectExerciseIds(activePlan, sessions, routines);
    const allExercises = deps.exerciseRepository.list();
    const exercises = allExercises.filter((exercise) => exerciseIds.has(exercise.id));
    const bodyTargetIds = new Set(
      exercises.flatMap((exercise) => exercise.bodyTargets || []).filter(Boolean),
    );
    const bodyTargets = deps.bodyMapRepository
      .getAll()
      .filter((entry) => bodyTargetIds.has(entry.id));

    return JSON.stringify(
      {
        exportVersion: "1.0",
        exportedAt: new Date().toISOString(),
        activePlan,
        sessions,
        exercises,
        routines,
        bodyTargets,
      },
      null,
      2,
    );
  }

  function prepareActivePlanRevision(activePlanId, input, overrides = {}) {
    assertRevisionDependencies(deps);
    return prepareActivePlanRevisionReview(
      activePlanId,
      input,
      getRevisionContext(activeRepo, deps),
      overrides,
    );
  }

  function prepareDirectActivePlanEdit(activePlanId, draftPlan, overrides = {}) {
    assertRevisionDependencies(deps);
    const review = prepareActivePlanRevisionReview(
      activePlanId,
      buildDirectEditPackage(draftPlan),
      getRevisionContext(activeRepo, deps),
      {
        ...overrides,
        changeSummary: overrides.changeSummary ?? DEFAULT_DIRECT_EDIT_CHANGE_SUMMARY,
      },
    );

    return {
      ...review,
      reviewMode: "editor",
      returnRoute: `active-plan-edit/${activePlanId}`,
    };
  }

  function refreshPreparedActivePlanRevision(review, overrides = {}) {
    assertRevisionDependencies(deps);
    return refreshActivePlanRevisionReview(
      review,
      getRevisionContext(activeRepo, deps),
      overrides,
    );
  }

  function applyActivePlanRevision(review) {
    assertRevisionDependencies(deps);
    const result = applyPreparedActivePlanRevision(
      review,
      getRevisionContext(activeRepo, deps),
    );

    deps.bodyMapRepository.replaceAll(result.bodyTargets);
    deps.exerciseRepository.replaceAll(result.exercises);
    deps.routineRepository.replaceAll(result.routines);
    activeRepo.replaceAll(result.activePlans);

    return result.updatedPlan;
  }

  return {
    getAllBlueprints,
    getBlueprint,
    createBlueprint,
    updateBlueprint,
    deleteBlueprint,
    instantiatePlan,
    getActivePlan,
    updateActivePlan,
    importPrepared,
    importFullPlan,
    importActivePlanPackage,
    exportFullPlan,
    exportActivePlan,
    prepareActivePlanRevision,
    prepareDirectActivePlanEdit,
    refreshPreparedActivePlanRevision,
    applyActivePlanRevision,
  };
}
