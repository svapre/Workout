import { createRouter } from "./core/router.js";
import { createStore } from "./core/store.js";
import { createSeedExerciseCatalog } from "./data/defaultExerciseCatalog.js";
import { createSeedRoutines, createSeedPlans } from "./data/defaults.js";
import { createSeedWorkoutHistory } from "./data/defaultWorkoutHistory.js";
import { createStarterContentBundle, STARTER_CONTENT_VERSION } from "./data/starterContent.js";
import { parseExerciseImportJson, parseTrainingPlanImport } from "./data/import/trainingPlanImport.js";
import { createBodyMapRepository, createSeedBodyMap } from "./data/repositories/bodyMapRepository.js";
import { createExerciseRepository } from "./data/repositories/exerciseRepository.js";
import { createRoutineRepository } from "./data/repositories/routineRepository.js";
import { createWorkoutRepository } from "./data/repositories/workoutRepository.js";
import { createPlanRepository } from "./data/repositories/planRepository.js";
import {
  createHistoricalPlanSnapshot,
  loadHistoricalPlanSnapshots,
  upsertHistoricalPlanSnapshot,
} from "./data/historySnapshot.js";
import { createLocalStore } from "./data/storage/localStore.js";
import { renderExerciseView } from "./features/exercises/exerciseView.js";
import { createExerciseService } from "./features/exercises/exerciseService.js";
import { renderRoutineView } from "./features/routines/routineView.js";
import { renderRoutineDetailView } from "./features/routines/routineDetailView.js";
import { createRoutineService } from "./features/routines/routineService.js";
import { createWorkoutService } from "./features/workouts/workoutService.js";
import { createPlanService } from "./features/plans/planService.js";
import { evaluateStageProgress } from "./features/plans/progressionEngine.js";
import { buildAdvanceStagePatch, buildRestDayCompletionPatch } from "./features/plans/stageProgression.js";
import {
  createDefaultMilestone,
  getExerciseDefaultTrackingType,
  inferRoutineEntryTrackingType,
  normalizeRoutineEntryBlocks,
} from "./data/schemaMigration.js";
import { renderWorkoutView } from "./features/workouts/workoutView.js";
import { renderPlansView } from "./features/plans/plansView.js?v=10";
import { renderBlueprintStudyView, renderActivePlanStudyView } from "./features/plans/studyView.js";
import { renderActivePlansView } from "./features/activePlans/activePlansView.js";
import { createActivePlanService } from "./features/activePlans/activePlanService.js";
import { getNextRoutine } from "./features/activePlans/activePlanUtils.js";
import { renderShell } from "./ui/shell.js";
import { renderActivePlanDetailView } from "./features/activePlans/activePlanDetailView.js";
import { renderActivePlanEditorView } from "./features/activePlans/activePlanEditorView.js";
import { renderActivePlanRevisionView } from "./features/activePlans/activePlanRevisionView.js";
import {
  renderWorkoutPlayerView,
  hasWorkoutPlayerUnsavedProgress,
  discardWorkoutPlayerSession,
} from "./features/workoutPlayer/workoutPlayerView.js";
import { confirmUnsavedChanges, confirmAbandonWorkout, confirmAction } from "./ui/modal.js";

function normalizeSelectedId(items, selectedId) {
  if (selectedId === null || selectedId === undefined) {
    return null;
  }
  if (!items.length) {
    return null;
  }
  const exists = items.some((item) => item.id === selectedId);
  return exists ? selectedId : null;
}

function toHistoryDateIso(value) {
  if (!value) {
    return "";
  }

  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function getWorkoutHistoryDate(workout) {
  return toHistoryDateIso(workout?.workoutDate || workout?.completedAt || workout?.startedAt);
}

function resolveHistorySelection(workouts, planId, selectedWorkoutId = null, selectedHistoryDate = null) {
  const normalizedPlanId = planId || null;
  const visibleWorkouts = workouts.filter(
    (workout) => !normalizedPlanId || workout.activePlanId === normalizedPlanId,
  );
  const currentSelectedWorkout = visibleWorkouts.find((workout) => workout.id === selectedWorkoutId) || null;
  const preferredDate = currentSelectedWorkout
    ? getWorkoutHistoryDate(currentSelectedWorkout)
    : toHistoryDateIso(selectedHistoryDate);
  const matchingDateWorkout = preferredDate
    ? visibleWorkouts.find((workout) => getWorkoutHistoryDate(workout) === preferredDate) || null
    : null;
  const fallbackWorkout = matchingDateWorkout || visibleWorkouts[0] || null;

  return {
    selectedHistoryPlanId: normalizedPlanId,
    selectedWorkoutId: currentSelectedWorkout?.id ?? fallbackWorkout?.id ?? null,
    selectedHistoryDate:
      currentSelectedWorkout
      ? getWorkoutHistoryDate(currentSelectedWorkout)
      : matchingDateWorkout
        ? preferredDate
        : getWorkoutHistoryDate(fallbackWorkout) || toHistoryDateIso(new Date()),
  };
}

function mergeMissingById(currentItems, starterItems) {
  const existingIds = new Set((currentItems || []).map((item) => item.id));
  const added = (starterItems || []).filter((item) => item?.id && !existingIds.has(item.id));
  return {
    merged: [...(currentItems || []), ...added],
    added,
  };
}

function formatStarterSyncNotice(result) {
  if (!result || result.totalAdded === 0) {
    return "";
  }

  const parts = [];
  if (result.exerciseMerge.added.length) {
    parts.push(
      `${result.exerciseMerge.added.length} exercise${result.exerciseMerge.added.length === 1 ? "" : "s"}`,
    );
  }
  if (result.routineMerge.added.length) {
    parts.push(
      `${result.routineMerge.added.length} routine${result.routineMerge.added.length === 1 ? "" : "s"}`,
    );
  }
  if (result.planMerge.added.length) {
    parts.push(
      `${result.planMerge.added.length} template${result.planMerge.added.length === 1 ? "" : "s"}`,
    );
  }
  if (result.bodyTargetMerge.added.length) {
    parts.push(
      `${result.bodyTargetMerge.added.length} body target${result.bodyTargetMerge.added.length === 1 ? "" : "s"}`,
    );
  }

  return `Starter library updated: ${parts.join(", ")}.`;
}

function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoke after the browser has a chance to start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createApp(root) {
  const localStore = createLocalStore("workout-app.state.v1");
  const exerciseStore = createLocalStore("workout-app.exercises.v1");
  const exerciseRepository = createExerciseRepository(exerciseStore, createSeedExerciseCatalog);
  const exerciseService = createExerciseService(exerciseRepository);
  const bodyMapStore = createLocalStore("workout-app.bodymap.v1");
  const bodyMapRepository = createBodyMapRepository(bodyMapStore, createSeedBodyMap);
  void bodyMapRepository.getAll();
  const routineRepository = createRoutineRepository(localStore, createSeedRoutines, {
    getExerciseCatalog: () => exerciseRepository.list(),
  });
  const routineService = createRoutineService(routineRepository);
  const workoutStore = createLocalStore("workout-app.workouts.v1");
  const workoutRepository = createWorkoutRepository(workoutStore, createSeedWorkoutHistory);
  const workoutService = createWorkoutService(workoutRepository);
  const planStore = createLocalStore("workout-app.plans.v1");
  const planRepository = createPlanRepository(planStore, createSeedPlans, "plan_blueprints");
  const activePlanStore = createLocalStore("workout-app.activePlans.v1");
  const activePlanRepository = createPlanRepository(activePlanStore, () => [], "active_plans");
  const archivedPlanStore = createLocalStore("workout-app.archivedPlans.v1");
  const appMetaStore = createLocalStore("workout-app.meta.v1");
  const planService = createPlanService(planRepository, activePlanRepository, {
    workoutRepository,
    exerciseRepository,
    routineRepository,
    bodyMapRepository,
  });
  const activePlanService = createActivePlanService(activePlanRepository);
  const router = createRouter(
    [
      "routines",
      "routine",
      "exercises",
      "exercise",
      "body-targets",
      "body-target",
      "workouts",
      "plans",
      "plan-study",
      "active-plans",
      "active-plan",
      "active-plan-study",
      "active-plan-edit",
      "active-plan-revision",
      "workout-player",
    ],
    "active-plans",
  );

  function syncStarterContentIfNeeded({ force = false } = {}) {
    const meta = appMetaStore.load() || {};
    const shouldSync = force || meta.starterContentVersion !== STARTER_CONTENT_VERSION;
    if (!shouldSync) {
      return {
        totalAdded: 0,
        bodyTargetMerge: { added: [] },
        exerciseMerge: { added: [] },
        routineMerge: { added: [] },
        planMerge: { added: [] },
      };
    }

    const starterBundle = createStarterContentBundle();
    const currentBodyTargets = bodyMapRepository.getAll();
    const currentExercises = exerciseRepository.list();
    const currentRoutines = routineRepository.list();
    const currentPlans = planService.getAllBlueprints();

    const bodyTargetMerge = mergeMissingById(currentBodyTargets, starterBundle.bodyTargets);
    const exerciseMerge = mergeMissingById(currentExercises, starterBundle.exercises);
    const routineMerge = mergeMissingById(currentRoutines, starterBundle.routines);
    const planMerge = mergeMissingById(currentPlans, starterBundle.plans);

    if (bodyTargetMerge.added.length) {
      bodyMapRepository.replaceAll(bodyTargetMerge.merged);
    }
    if (exerciseMerge.added.length) {
      exerciseRepository.replaceAll(exerciseMerge.merged);
    }
    if (routineMerge.added.length) {
      routineRepository.replaceAll(routineMerge.merged);
    }
    if (planMerge.added.length) {
      planRepository.replaceAll(planMerge.merged);
    }

    appMetaStore.save({
      ...meta,
      starterContentVersion: STARTER_CONTENT_VERSION,
      starterContentSyncedAt: new Date().toISOString(),
    });

    return {
      totalAdded:
        bodyTargetMerge.added.length +
        exerciseMerge.added.length +
        routineMerge.added.length +
        planMerge.added.length,
      bodyTargetMerge,
      exerciseMerge,
      routineMerge,
      planMerge,
    };
  }

  const starterSyncResult = syncStarterContentIfNeeded();

  const initialBodyTargets = bodyMapRepository.getAll();
  const initialExercises = exerciseService.getAll();
  const initialRoutines = routineService.getAll();
  const initialWorkouts = workoutService.getAll();
  const initialArchivedPlans = loadHistoricalPlanSnapshots(archivedPlanStore);
  const store = createStore({
    route: router.getCurrentRoute(),
    notice: formatStarterSyncNotice(starterSyncResult),
    bodyTargets: initialBodyTargets,
    exercises: initialExercises,
    selectedExerciseId: null,
    routines: initialRoutines,
    selectedRoutineId: null,
    workouts: initialWorkouts,
    selectedWorkoutId: initialWorkouts[0]?.id ?? null,
    selectedHistoryPlanId: null,
    selectedHistoryDate: getWorkoutHistoryDate(initialWorkouts[0]) || toHistoryDateIso(new Date()),
    plans: planService.getAllBlueprints(),
    activePlans: activePlanService.getAll(),
    archivedPlans: initialArchivedPlans,
    selectedPlanId: null,
    selectedActivePlanId: null,
    pendingActivePlanRevision: null,
    activePlanEditMode: false,
    editingActivePlanStageId: null,
    draftActivePlan: null,
    activePlanStageDraft: null,
    planEditMode: false,
    editingStageId: null,
    draftBlueprint: null,
    stageDraft: null,
    draftRoutine: null,
    expandedExerciseIds: new Set(),
    detailNavigation: null,
  });

  function getPrimaryNavResetPatch() {
    return {
      selectedPlanId: null,
      planEditMode: false,
      draftBlueprint: null,
      editingStageId: null,
      stageDraft: null,
      selectedRoutineId: null,
      draftRoutine: null,
      selectedExerciseId: null,
        selectedWorkoutId: null,
        selectedHistoryPlanId: null,
        selectedHistoryDate: null,
        selectedActivePlanId: null,
        pendingActivePlanRevision: null,
        activePlanEditMode: false,
        editingActivePlanStageId: null,
        draftActivePlan: null,
        activePlanStageDraft: null,
        detailNavigation: null,
      };
  }

  function effectiveBlueprintDraft(state) {
    const { draftBlueprint, stageDraft } = state;
    if (!draftBlueprint) return null;
    if (!stageDraft) return draftBlueprint;
    const stages = draftBlueprint.stages.map((s) => (s.id === stageDraft.id ? stageDraft : s));
    return { ...draftBlueprint, stages };
  }

  function isBlueprintDirty(state) {
    const effective = effectiveBlueprintDraft(state);
    if (!effective || !state.selectedPlanId) return false;
    const saved = state.plans.find((p) => p.id === effective.id);
    if (!saved) return true;
    return JSON.stringify(effective) !== JSON.stringify(saved);
  }

  function isRoutineDraftDirty(state) {
    const { draftRoutine, selectedRoutineId, routines } = state;
    if (!draftRoutine || !selectedRoutineId) return false;
    const saved = routines.find((r) => r.id === selectedRoutineId);
    if (!saved) return true;
    return JSON.stringify(draftRoutine) !== JSON.stringify(saved);
  }

  function effectiveActivePlanDraft(state) {
    const { draftActivePlan, activePlanStageDraft } = state;
    if (!draftActivePlan) return null;
    if (!activePlanStageDraft) return draftActivePlan;
    const stages = draftActivePlan.stages.map((stage) =>
      stage.id === activePlanStageDraft.id ? activePlanStageDraft : stage,
    );
    return { ...draftActivePlan, stages };
  }

  function isActivePlanDraftDirty(state) {
    const effective = effectiveActivePlanDraft(state);
    if (!effective?.id) return false;
    const saved = state.activePlans.find((plan) => plan.id === effective.id);
    if (!saved) return true;
    return JSON.stringify(effective) !== JSON.stringify(saved);
  }

  function clearActivePlanDraftState() {
    store.setState({
      activePlanEditMode: false,
      editingActivePlanStageId: null,
      draftActivePlan: null,
      activePlanStageDraft: null,
    });
  }

  function isActivePlanEditorWorkflowRoute(route, state = store.getState()) {
    if (route.startsWith("active-plan-edit/")) {
      return true;
    }
    return route.startsWith("active-plan-revision/") && state.pendingActivePlanRevision?.reviewMode === "editor";
  }

  function hasUnsavedEditableState(state = store.getState()) {
    return (
      isBlueprintDirty(state) ||
      isRoutineDraftDirty(state) ||
      isActivePlanDraftDirty(state) ||
      hasWorkoutPlayerUnsavedProgress()
    );
  }

  function getRoutineEditorReturnRoute(state = store.getState()) {
    const returnRoute = state.detailNavigation?.returnRoute || "";
    return returnRoute.startsWith("routine/") ? returnRoute : "";
  }

  function planUsesRoutine(plan, routineId) {
    const stages = Array.isArray(plan?.stages) ? plan.stages : [];
    return stages.some((stage) => {
      const scheduleUsesRoutine = Array.isArray(stage?.schedule)
        && stage.schedule.some((entry) => entry?.type === "routine" && entry.routineId === routineId);
      const milestoneUsesRoutine = stage?.milestone?.test?.routineId === routineId;
      return scheduleUsesRoutine || milestoneUsesRoutine;
    });
  }

  function routineUsesCatalogExercise(routine, exerciseId) {
    const entries = Array.isArray(routine?.entries)
      ? routine.entries
      : Array.isArray(routine?.exercises)
        ? routine.exercises
        : [];
    return entries.some((entry) => entry?.exerciseId === exerciseId);
  }

  function planUsesCatalogExercise(plan, exerciseId, routines = store.getState().routines) {
    const stages = Array.isArray(plan?.stages) ? plan.stages : [];
    const routinesById = new Map((routines || []).map((routine) => [routine.id, routine]));
    return stages.some((stage) => {
      const scheduleUsesExercise = Array.isArray(stage?.schedule)
        && stage.schedule.some((entry) => {
          if (entry?.type !== "routine" || !entry?.routineId) {
            return false;
          }
          return routineUsesCatalogExercise(routinesById.get(entry.routineId), exerciseId);
        });
      const milestoneUsesExercise = stage?.milestone?.test?.exerciseId === exerciseId;
      return scheduleUsesExercise || milestoneUsesExercise;
    });
  }

  function workoutUsesCatalogExercise(workout, exerciseId) {
    const setUsesExercise = Array.isArray(workout?.sets)
      && workout.sets.some((set) => set?.exerciseId === exerciseId);
    const milestoneUsesExercise = workout?.milestoneTest?.exerciseId === exerciseId;
    return setUsesExercise || milestoneUsesExercise;
  }

  function exerciseUsesBodyTarget(exercise, targetId) {
    const primaryTargets = Array.isArray(exercise?.bodyTargets) ? exercise.bodyTargets : [];
    const secondaryTargets = Array.isArray(exercise?.secondaryMuscles) ? exercise.secondaryMuscles : [];
    return primaryTargets.includes(targetId) || secondaryTargets.includes(targetId);
  }

  function describeRoutineDependencies(routineId, state = store.getState()) {
    const blueprints = (state.plans || []).filter((plan) => planUsesRoutine(plan, routineId));
    const activePlans = (state.activePlans || []).filter((plan) => planUsesRoutine(plan, routineId));
    return { blueprints, activePlans };
  }

  function describeExerciseDependencies(exerciseId, state = store.getState()) {
    const routines = (state.routines || []).filter((routine) => routineUsesCatalogExercise(routine, exerciseId));
    const blueprints = (state.plans || []).filter((plan) => planUsesCatalogExercise(plan, exerciseId, state.routines));
    const activePlans = (state.activePlans || []).filter((plan) => planUsesCatalogExercise(plan, exerciseId, state.routines));
    const workouts = (state.workouts || []).filter((workout) => workoutUsesCatalogExercise(workout, exerciseId));
    return { routines, blueprints, activePlans, workouts };
  }

  function describeBodyTargetDependencies(targetId, state = store.getState()) {
    const exercises = (state.exercises || []).filter((exercise) => exerciseUsesBodyTarget(exercise, targetId));
    return { exercises };
  }

  function formatRoutineDependencyNotice(routineName, dependencySummary) {
    const parts = [];
    if (dependencySummary.activePlans.length) {
      parts.push(`${dependencySummary.activePlans.length} active plan${dependencySummary.activePlans.length === 1 ? "" : "s"}`);
    }
    if (dependencySummary.blueprints.length) {
      parts.push(`${dependencySummary.blueprints.length} template${dependencySummary.blueprints.length === 1 ? "" : "s"}`);
    }

    const names = [
      ...dependencySummary.activePlans.map((plan) => plan.displayName || plan.name),
      ...dependencySummary.blueprints.map((plan) => plan.name),
    ].filter(Boolean);

    const previewNames = names.slice(0, 3);
    const extraCount = Math.max(0, names.length - previewNames.length);
    const previewText = previewNames.length
      ? ` In use by ${previewNames.join(", ")}${extraCount > 0 ? ` +${extraCount} more` : ""}.`
      : "";

    return `Can't delete "${routineName}" because it is still used by ${parts.join(" and ")}. Replace or remove those references first.${previewText}`;
  }

  function formatExerciseDependencyNotice(exerciseName, dependencySummary) {
    const parts = [];
    if (dependencySummary.routines.length) {
      parts.push(`${dependencySummary.routines.length} routine${dependencySummary.routines.length === 1 ? "" : "s"}`);
    }
    if (dependencySummary.activePlans.length) {
      parts.push(`${dependencySummary.activePlans.length} active plan${dependencySummary.activePlans.length === 1 ? "" : "s"}`);
    }
    if (dependencySummary.blueprints.length) {
      parts.push(`${dependencySummary.blueprints.length} template${dependencySummary.blueprints.length === 1 ? "" : "s"}`);
    }
    if (dependencySummary.workouts.length) {
      parts.push(`${dependencySummary.workouts.length} logged session${dependencySummary.workouts.length === 1 ? "" : "s"}`);
    }

    const names = [
      ...dependencySummary.routines.map((routine) => routine.name),
      ...dependencySummary.activePlans.map((plan) => plan.displayName || plan.name),
      ...dependencySummary.blueprints.map((plan) => plan.name),
    ].filter(Boolean);
    const previewNames = names.slice(0, 4);
    const extraCount = Math.max(0, names.length - previewNames.length);
    const previewText = previewNames.length
      ? ` In use by ${previewNames.join(", ")}${extraCount > 0 ? ` +${extraCount} more` : ""}.`
      : "";

    return `Can't delete "${exerciseName}" because it is still used by ${parts.join(" and ")}. Replace or remove those references first.${previewText}`;
  }

  function formatBodyTargetDependencyNotice(targetName, dependencySummary) {
    const names = dependencySummary.exercises.map((exercise) => exercise.name).filter(Boolean);
    const previewNames = names.slice(0, 4);
    const extraCount = Math.max(0, names.length - previewNames.length);
    const previewText = previewNames.length
      ? ` In use by ${previewNames.join(", ")}${extraCount > 0 ? ` +${extraCount} more` : ""}.`
      : "";
    return `Can't delete "${targetName}" because it is still used by ${dependencySummary.exercises.length} activit${dependencySummary.exercises.length === 1 ? "y" : "ies"}. Remove or retarget those activities first.${previewText}`;
  }

  function createDetailNavigation(returnRoute, returnState = null) {
    return {
      returnRoute,
      returnState,
      parent: returnRoute.includes("/") ? store.getState().detailNavigation : null,
    };
  }

  const actions = {
    clearNotice() {
      store.setState({ notice: "" });
    },
    createRoutine() {
      const routine = routineService.createRoutine();
      syncCollections({
        routines: routineService.getAll(),
        selectedRoutineId: routine.id,
        notice: `Created routine "${routine.name}".`,
      });
    },
    selectRoutine(routineId) {
      const routine = store.getState().routines.find(r => r.id === routineId);
      store.setState({ 
        selectedRoutineId: routineId,
        draftRoutine: routine ? JSON.parse(JSON.stringify(routine)) : null
      });
    },
    selectExercise(exerciseId) {
      store.setState({ selectedExerciseId: exerciseId });
    },
    openRoutineDetail(routineId, returnRoute = store.getState().route) {
      if (!routineId) {
        return;
      }
      store.setState({
        detailNavigation: createDetailNavigation(returnRoute),
        selectedRoutineId: null,
        draftRoutine: null,
      });
      router.navigate(`routine/${routineId}`);
    },
    openExerciseDetail(exerciseId, returnRoute = store.getState().route) {
      if (!exerciseId) {
        return;
      }
      store.setState({
        detailNavigation: createDetailNavigation(returnRoute),
        selectedExerciseId: exerciseId,
      });
      router.navigate(`exercise/${exerciseId}`);
    },
    openBodyTargetDetail(targetId, returnRoute = store.getState().route) {
      if (!targetId) {
        return;
      }
      store.setState({ detailNavigation: createDetailNavigation(returnRoute) });
      router.navigate(`body-target/${targetId}`);
    },
    openBlueprintStudy(planId, stageId = "", returnRoute = store.getState().route) {
      if (!planId) {
        return;
      }
      store.setState({
        detailNavigation: createDetailNavigation(
          returnRoute,
          returnRoute === "plans" ? { selectedPlanId: planId } : null,
        ),
      });
      router.navigate(stageId ? `plan-study/${planId}/${stageId}` : `plan-study/${planId}`);
    },
    openActivePlanStudy(planId, stageId = "", returnRoute = store.getState().route) {
      if (!planId) {
        return;
      }
      store.setState({ detailNavigation: createDetailNavigation(returnRoute) });
      router.navigate(stageId ? `active-plan-study/${planId}/${stageId}` : `active-plan-study/${planId}`);
    },
    editRoutineFromDetail(routineId) {
      const routine = store.getState().routines.find((entry) => entry.id === routineId);
      if (!routine) {
        return;
      }
      store.setState({
        selectedRoutineId: routineId,
        draftRoutine: JSON.parse(JSON.stringify(routine)),
        detailNavigation: createDetailNavigation(`routine/${routineId}`),
      });
      router.navigate("routines");
    },
    returnFromDetailContext(fallbackRoute = "active-plans") {
      const context = store.getState().detailNavigation;
      const returnRoute = context?.returnRoute || fallbackRoute;
      const returnState = context?.returnState || null;
      const parent = context?.parent || null;

      if (returnState && !returnRoute.includes("/")) {
        store.setState({
          ...getPrimaryNavResetPatch(),
          ...returnState,
          detailNavigation: parent,
        });
        router.navigate(returnRoute);
        return;
      }

      store.setState({ detailNavigation: parent });
      actions.navigate(returnRoute);
    },
    selectWorkout(workoutId) {
      const workout = store.getState().workouts.find((entry) => entry.id === workoutId) || null;
      store.setState({
        selectedWorkoutId: workoutId,
        selectedHistoryDate: getWorkoutHistoryDate(workout) || store.getState().selectedHistoryDate,
      });
    },
    selectHistoryDate(dateIso) {
      const state = store.getState();
      const normalizedDate = toHistoryDateIso(dateIso) || state.selectedHistoryDate || toHistoryDateIso(new Date());
      const visibleWorkouts = state.workouts.filter(
        (workout) => !state.selectedHistoryPlanId || workout.activePlanId === state.selectedHistoryPlanId,
      );
      const matchingWorkout = visibleWorkouts.find((workout) => getWorkoutHistoryDate(workout) === normalizedDate) || null;
      store.setState({
        selectedHistoryDate: normalizedDate,
        selectedWorkoutId: matchingWorkout?.id ?? state.selectedWorkoutId,
      });
    },
    selectHistoryPlan(planId) {
      const selection = resolveHistorySelection(
        store.getState().workouts,
        planId,
        store.getState().selectedWorkoutId,
        store.getState().selectedHistoryDate,
      );
      store.setState(selection);
    },
    viewHistoryForPlan(planId) {
      const nextState = {
        ...getPrimaryNavResetPatch(),
        ...resolveHistorySelection(
          store.getState().workouts,
          planId,
          store.getState().selectedWorkoutId,
          store.getState().selectedHistoryDate,
        ),
      };
      store.setState(nextState);
      router.navigate("workouts");
    },
    selectPlan(planId) {
      if (planId == null || planId === "") {
        store.setState({
          selectedPlanId: null,
          planEditMode: false,
          editingStageId: null,
          draftBlueprint: null,
          stageDraft: null,
        });
        return;
      }
      const plan = store.getState().plans.find((p) => p.id === planId);
      store.setState({
        selectedPlanId: planId,
        planEditMode: false,
        editingStageId: null,
        draftBlueprint: plan ? JSON.parse(JSON.stringify(plan)) : null,
        stageDraft: null,
      });
    },
    leavePlanLibraryDetail() {
      const state = store.getState();
      if (!isBlueprintDirty(state)) {
        actions.selectPlan(null);
        return;
      }
      confirmUnsavedChanges(document.body, {
        message:
          "Leaving will close this template. Save your edits to the library, discard them, or stay on this screen.",
        onSave: () => {
          actions.saveBlueprint();
          actions.selectPlan(null);
        },
        onDiscard: () => actions.selectPlan(null),
      });
    },
    leaveRoutineEditor() {
      const state = store.getState();
      const returnRoute = getRoutineEditorReturnRoute(state);
      const parentContext = state.detailNavigation?.parent || null;
      const exitRoutineEditor = () => {
        store.setState({ selectedRoutineId: null, draftRoutine: null });
        if (returnRoute) {
          store.setState({ detailNavigation: parentContext });
          actions.navigate(returnRoute);
          return;
        }
      };
      if (!isRoutineDraftDirty(state)) {
        exitRoutineEditor();
        return;
      }
      confirmUnsavedChanges(document.body, {
        message:
          "Leaving will close this routine. Save your edits, discard them, or stay on this screen.",
        onSave: () => actions.saveRoutine(),
        onDiscard: () => exitRoutineEditor(),
      });
    },
    exitBlueprintEditorToDetail(planId) {
      const state = store.getState();
      if (!isBlueprintDirty(state)) {
        actions.togglePlanEditMode(false);
        actions.selectPlan(planId);
        return;
      }
      confirmUnsavedChanges(document.body, {
        message:
          "Leave the editor? Save your template changes, discard them, or stay on this screen.",
        onSave: () => {
          actions.saveBlueprint();
          actions.togglePlanEditMode(false);
          actions.selectPlan(planId);
        },
        onDiscard: () => {
          actions.togglePlanEditMode(false);
          actions.selectPlan(planId);
        },
      });
    },
    setEditingStageId(stageId) {
      const blueprint = store.getState().draftBlueprint;
      let stageDraft = null;
      if (blueprint && stageId) {
        const stage = blueprint.stages.find(s => s.id === stageId);
        if (stage) {
          stageDraft = JSON.parse(JSON.stringify(stage));
          stageDraft.milestone = createDefaultMilestone(stageDraft.milestone || {});
        }
      }
      store.setState({ editingStageId: stageId, stageDraft });
    },
    updateStageDraft(patch) {
      const draft = store.getState().stageDraft;
      if (draft) {
        store.setState({ stageDraft: { ...draft, ...patch } });
      }
    },
    commitStageDraft() {
      const { draftBlueprint, stageDraft } = store.getState();
      if (draftBlueprint && stageDraft) {
        const stages = draftBlueprint.stages.map(s => 
          s.id === stageDraft.id ? stageDraft : s
        );
        store.setState({ 
          draftBlueprint: { ...draftBlueprint, stages },
          stageDraft: null,
          editingStageId: null
        });
      }
    },
    togglePlanEditMode(mode) {
      const isEnteringEdit = mode ?? !store.getState().planEditMode;
      if (isEnteringEdit && !store.getState().draftBlueprint) {
        const plan = store.getState().plans.find(p => p.id === store.getState().selectedPlanId);
        if (plan) {
          store.setState({ draftBlueprint: JSON.parse(JSON.stringify(plan)) });
        }
      }
      store.setState({ planEditMode: isEnteringEdit });
    },
    createBlueprint() {
      const plan = planService.createBlueprint();
      syncCollections({ plans: planService.getAllBlueprints(), selectedPlanId: plan.id, notice: "Created a new template." });
      store.setState({ planEditMode: true });
    },
    updateBlueprint(patch) {
      const draft = store.getState().draftBlueprint;
      if (draft) {
        store.setState({ draftBlueprint: { ...draft, ...patch } });
      }
    },
    saveBlueprint() {
      const { draftBlueprint, stageDraft } = store.getState();
      let merged = draftBlueprint;
      if (draftBlueprint && stageDraft) {
        const stages = draftBlueprint.stages.map((s) => (s.id === stageDraft.id ? stageDraft : s));
        merged = { ...draftBlueprint, stages };
        store.setState({ draftBlueprint: merged, stageDraft: null, editingStageId: null });
      }
      if (merged) {
        planService.updateBlueprint(merged.id, merged);
        syncCollections({ plans: planService.getAllBlueprints(), notice: "Template saved successfully." });
        store.setState({ planEditMode: false });
      }
    },
    instantiatePlan(planId, customName) {
      const success = planService.instantiatePlan(planId, customName);
      if (success) {
        syncCollections({
          activePlans: activePlanService.getAll(),
          notice: "Plan started! Redirecting to dashboard...",
        });
        return true;
      }
      return false;
    },
    activatePlan(planId) {
      const plan = store.getState().plans.find(p => p.id === planId);
      if (plan) {
        const activePlan = activePlanService.activatePlan(plan);
        syncCollections({ 
          activePlans: activePlanService.getAll(), 
          notice: `Activated "${activePlan.name}". Tracking started.` 
        });
      }
    },
    deleteBlueprint(planId) {
      planService.deleteBlueprint(planId);
      syncCollections({ plans: planService.getAllBlueprints(), selectedPlanId: null, notice: "Deleted template." });
      store.setState({ planEditMode: false });
    },
    selectActivePlan(planId) {
      store.setState({ selectedActivePlanId: planId });
    },
    updateActivePlan(planId, patch) {
      activePlanService.updateActivePlan(planId, patch);
      syncCollections({ activePlans: activePlanService.getAll() });
    },
    beginActivePlanEdit(planId) {
      const plan = store.getState().activePlans.find((entry) => entry.id === planId);
      if (!plan) {
        return;
      }

      store.setState({
        selectedActivePlanId: planId,
        activePlanEditMode: true,
        draftActivePlan: JSON.parse(JSON.stringify(plan)),
        editingActivePlanStageId: null,
        activePlanStageDraft: null,
      });
      router.navigate(`active-plan-edit/${planId}`);
    },
    leaveActivePlanEditorToDetail(planId) {
      const state = store.getState();
      if (!isActivePlanDraftDirty(state)) {
        clearActivePlanDraftState();
        actions.navigate(planId ? `active-plan/${planId}` : "active-plans");
        return;
      }

      confirmUnsavedChanges(document.body, {
        message:
          "Leave the live plan editor? Save your live-plan changes, discard them, or stay on this screen.",
        onSave: () => {
          actions.saveActivePlanDraft();
        },
        onDiscard: () => {
          clearActivePlanDraftState();
          actions.navigate(planId ? `active-plan/${planId}` : "active-plans");
        },
      });
    },
    setEditingActivePlanStageId(stageId) {
      const activePlan = store.getState().draftActivePlan;
      let activePlanStageDraft = null;
      if (activePlan && stageId) {
        const stage = activePlan.stages.find((entry) => entry.id === stageId);
        if (stage) {
          activePlanStageDraft = JSON.parse(JSON.stringify(stage));
          activePlanStageDraft.milestone = createDefaultMilestone(activePlanStageDraft.milestone || {});
        }
      }
      store.setState({ editingActivePlanStageId: stageId, activePlanStageDraft });
    },
    updateActivePlanStageDraft(patch) {
      const draft = store.getState().activePlanStageDraft;
      if (!draft) {
        return;
      }
      store.setState({ activePlanStageDraft: { ...draft, ...patch } });
    },
    commitActivePlanStageDraft() {
      const { draftActivePlan, activePlanStageDraft } = store.getState();
      if (!draftActivePlan || !activePlanStageDraft) {
        return;
      }
      const stages = draftActivePlan.stages.map((stage) =>
        stage.id === activePlanStageDraft.id ? activePlanStageDraft : stage,
      );
      store.setState({
        draftActivePlan: { ...draftActivePlan, stages },
        activePlanStageDraft: null,
        editingActivePlanStageId: null,
      });
    },
    updateActivePlanDraft(patch) {
      const draft = store.getState().draftActivePlan;
      if (!draft) {
        return;
      }
      store.setState({ draftActivePlan: { ...draft, ...patch }, activePlanEditMode: true });
    },
    saveActivePlanDraft() {
      const state = store.getState();
      const merged = effectiveActivePlanDraft(state);
      if (!merged) {
        return;
      }

      try {
        const review = planService.prepareDirectActivePlanEdit(merged.id, merged);
        if (review.blockingIssues.length) {
          store.setState({ notice: review.blockingIssues[0]?.message || "Unable to save the live plan draft." });
          return;
        }

        if (review.stageMapping.requiresManualAnchor) {
          store.setState({
            draftActivePlan: merged,
            activePlanStageDraft: null,
            editingActivePlanStageId: null,
            pendingActivePlanRevision: review,
            notice: "Current-stage changes need a quick remap review before saving.",
          });
          router.navigate(`active-plan-revision/${merged.id}`);
          return;
        }

        const updatedPlan = planService.applyActivePlanRevision(review);
        clearActivePlanDraftState();
        syncCollections({
          activePlans: activePlanService.getAll(),
          notice: `Saved live plan changes to "${updatedPlan.displayName || updatedPlan.name}".`,
        });
        router.navigate(`active-plan/${updatedPlan.id}`);
      } catch (error) {
        store.setState({ notice: error.message || "Unable to save the live plan draft." });
      }
    },
    completeRestDay(planId) {
      const plan = activePlanService.getActivePlan(planId);
      if (!plan) {
        return false;
      }

      const patch = buildRestDayCompletionPatch(plan);
      const updatedPlan = activePlanService.updateActivePlan(planId, patch);
      const currentStage = updatedPlan?.stages?.[updatedPlan.currentStageIndex ?? 0] ?? null;
      const stageProgress = currentStage
        ? evaluateStageProgress(
            currentStage,
            workoutService.getAll(),
            routineService.getAll(),
            updatedPlan,
            exerciseService.getAll(),
          )
        : null;
      const nextStage = updatedPlan?.stages?.[(updatedPlan?.currentStageIndex ?? 0) + 1] ?? null;
      const nextRoutine = updatedPlan ? getNextRoutine(updatedPlan, routineService.getAll()) : null;
      let notice = `${plan.displayName || plan.name}: rest step completed.`;

      if (stageProgress?.isComplete && nextStage) {
        notice = `${plan.displayName || plan.name}: rest step completed. ${currentStage?.name || "This stage"} is ready to advance to ${nextStage.name || "the next stage"}.`;
      } else if (nextRoutine) {
        notice = `${plan.displayName || plan.name}: rest step completed. Next up: ${nextRoutine.name}.`;
      }

      syncCollections({
        activePlans: activePlanService.getAll(),
        notice,
      });
      return true;
    },
    advanceStage(planId) {
      const plan = activePlanService.getActivePlan(planId);
      if (!plan) {
        return false;
      }

      const stage = plan.stages?.[plan.currentStageIndex ?? 0] ?? null;
      if (!stage) {
        return false;
      }

      const progress = evaluateStageProgress(
        stage,
        workoutService.getAll(),
        routineService.getAll(),
        plan,
        exerciseService.getAll(),
      );

      if (!progress.isComplete) {
        return false;
      }

      const patch = buildAdvanceStagePatch(plan);
      if (!patch) {
        return false;
      }

      activePlanService.updateActivePlan(planId, patch);
      syncCollections({
        activePlans: activePlanService.getAll(),
        notice: `${plan.displayName || plan.name}: advanced to the next stage.`,
      });
      return true;
    },
    recordCompletedSession({ session, activePlanId, planPatch }) {
      workoutService.appendSession(session);
      activePlanService.updateActivePlan(activePlanId, planPatch);
      syncCollections({
        workouts: workoutService.getAll(),
        activePlans: activePlanService.getAll(),
      });
    },
    updateSessionReflection(sessionId, patch) {
      const nextPatch =
        patch && typeof patch === "object"
          ? patch
          : { reflectionRating: patch ?? null };
      workoutService.updateSession(sessionId, nextPatch);
      syncCollections({
        workouts: workoutService.getAll(),
      });
    },
    deleteActivePlan(planId) {
      const deletedPlan = activePlanService.deleteActivePlan(planId);
      if (deletedPlan) {
        const historicalPlans = loadHistoricalPlanSnapshots(archivedPlanStore);
        const snapshot = createHistoricalPlanSnapshot(deletedPlan, {
          historyStatus: "removed",
        });
        archivedPlanStore.save(upsertHistoricalPlanSnapshot(historicalPlans, snapshot));
      }
      syncCollections({
        activePlans: activePlanService.getAll(),
        archivedPlans: loadHistoricalPlanSnapshots(archivedPlanStore),
        selectedActivePlanId: null,
        notice: deletedPlan
          ? `Removed "${deletedPlan.displayName || deletedPlan.name}" from the active queue and preserved it in history.`
          : "Removed the active plan.",
      });
    },
    archivePlan(planId) {
      const plans = activePlanService.getAll();
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        const historicalPlans = loadHistoricalPlanSnapshots(archivedPlanStore);
        const archived = createHistoricalPlanSnapshot(plan, {
          historyStatus: "archived",
        });
        archivedPlanStore.save(upsertHistoricalPlanSnapshot(historicalPlans, archived));
        activePlanService.deleteActivePlan(planId);
        syncCollections({ 
          activePlans: activePlanService.getAll(), 
          archivedPlans: loadHistoricalPlanSnapshots(archivedPlanStore),
          notice: `"${plan.displayName || plan.name}" archived and moved into history.` 
        });
      }
    },
    duplicateRoutine(routineId) {
      const routine = routineService.duplicateRoutine(routineId);
      syncCollections({
        routines: routineService.getAll(),
        selectedRoutineId: routine.id,
        notice: `Duplicated "${routine.name}".`,
      });
    },
    deleteRoutine(routineId) {
      const currentState = store.getState();
      const routine = currentState.routines.find((entry) => entry.id === routineId);
      if (!routine) {
        store.setState({ notice: "Routine not found." });
        return;
      }

      const dependencies = describeRoutineDependencies(routineId, currentState);
      if (dependencies.activePlans.length || dependencies.blueprints.length) {
        store.setState({ notice: formatRoutineDependencyNotice(routine.name, dependencies) });
        return;
      }

      const deleted = routineService.deleteRoutine(routineId);
      syncCollections({
        routines: routineService.getAll(),
        selectedRoutineId: null,
        notice: `Deleted "${deleted.name}".`,
      });
    },
    updateRoutine(patch) {
      const draft = store.getState().draftRoutine;
      if (draft) {
        store.setState({ draftRoutine: { ...draft, ...patch } });
      }
    },
    saveRoutine() {
      const draft = store.getState().draftRoutine;
      if (draft) {
        const currentState = store.getState();
        const returnRoute = getRoutineEditorReturnRoute(currentState);
        const parentContext = currentState.detailNavigation?.parent || null;
        const sourceEntries = draft.entries || draft.exercises || [];
        const entries = sourceEntries.map((ex) => {
          const catalogEntry = store.getState().exercises.find((e) => e.id === ex.exerciseId);
          const type = inferRoutineEntryTrackingType(ex, catalogEntry);
          const explicitBlocks = normalizeRoutineEntryBlocks(ex.entryBlocks ?? ex.blocks);
          const clean = {
            id: ex.id,
            exerciseId: ex.exerciseId,
            order: ex.order,
            notes: ex.notes ?? "",
            sets: ex.sets ?? null,
            reps: ex.reps ?? null,
            repTargetMode: ex.repTargetMode ?? null,
            durationSeconds: ex.durationSeconds ?? null,
            weight: ex.weight ?? null,
            resistance: ex.resistance ?? null,
            restSeconds: ex.restSeconds ?? null,
            sideMode: ex.sideMode ?? null,
            tempoMode: ex.tempoMode ?? null,
            tempoSecondsPerRep: ex.tempoSecondsPerRep ?? null,
            tempoDownSeconds: ex.tempoDownSeconds ?? null,
            tempoBottomHoldSeconds: ex.tempoBottomHoldSeconds ?? null,
            tempoUpSeconds: ex.tempoUpSeconds ?? null,
            tempoTopHoldSeconds: ex.tempoTopHoldSeconds ?? null,
            tempoLabel: ex.tempoLabel ?? null,
            transitionAfterSeconds: ex.transitionAfterSeconds ?? null,
            transitionLabel: ex.transitionLabel ?? "",
            entryBlocks: explicitBlocks,
          };
          if (explicitBlocks.length) {
            return clean;
          }
          if (type === "reps") {
            clean.reps = ex.reps;
            clean.durationSeconds = null;
            clean.weight = null;
            clean.resistance = null;
          } else if (type === "duration") {
            clean.durationSeconds = ex.durationSeconds;
            clean.reps = null;
            clean.weight = null;
            clean.resistance = null;
          } else if (type === "weight") {
            clean.reps = ex.reps;
            clean.weight = ex.weight;
            clean.durationSeconds = null;
            clean.resistance = null;
          } else {
            clean.reps = ex.reps;
            clean.durationSeconds = null;
            clean.weight = null;
            clean.resistance = ex.resistance ?? null;
          }
          return clean;
        });

        const cleanedRoutine = { ...draft, entries, exercises: undefined };
        routineService.updateRoutine(cleanedRoutine.id, cleanedRoutine);
        syncCollections({ routines: routineService.getAll(), notice: "Routine saved successfully." });
        store.setState({ selectedRoutineId: null, draftRoutine: null });
        if (returnRoute) {
          store.setState({ detailNavigation: parentContext });
          actions.navigate(returnRoute);
        }
      }
    },
    addExercise(exerciseId) {
      const draft = store.getState().draftRoutine;
      if (draft && exerciseId) {
        const entries = draft.entries || draft.exercises || [];
        const exercise = store.getState().exercises.find((entry) => entry.id === exerciseId);
        const defaultMode = getExerciseDefaultTrackingType(exercise);
        const newInstance = {
          id: `inst_${Date.now()}`,
          exerciseId,
          order: entries.length + 1,
          sets: 3,
          reps: defaultMode === "duration" ? null : 10,
          durationSeconds: defaultMode === "duration" ? 30 : null,
          weight: defaultMode === "weight" ? 20 : null,
          resistance: defaultMode === "resistance" ? "Band" : null,
          restSeconds: 45,
          sideMode: "",
          tempoMode: null,
          tempoSecondsPerRep: null,
          tempoDownSeconds: null,
          tempoBottomHoldSeconds: null,
          tempoUpSeconds: null,
          tempoTopHoldSeconds: null,
          tempoLabel: null,
          transitionAfterSeconds: null,
          transitionLabel: "",
          entryBlocks: [],
          notes: "",
        };
        store.setState({
          draftRoutine: { ...draft, entries: [...entries, newInstance], exercises: undefined },
          notice: "Added exercise to draft.",
        });
      }
    },
    updateExercise(exerciseInstanceId, patch) {
      const draft = store.getState().draftRoutine;
      if (draft) {
        const entries = draft.entries || draft.exercises || [];
        const next = entries.map((ex) =>
          ex.id === exerciseInstanceId ? { ...ex, ...patch } : ex,
        );
        store.setState({ draftRoutine: { ...draft, entries: next, exercises: undefined } });
      }
    },
    deleteExercise(exerciseInstanceId) {
      const draft = store.getState().draftRoutine;
      if (draft) {
        const entries = draft.entries || draft.exercises || [];
        const next = entries
          .filter((ex) => ex.id !== exerciseInstanceId)
          .map((ex, idx) => ({ ...ex, order: idx + 1 }));
        store.setState({
          draftRoutine: { ...draft, entries: next, exercises: undefined },
          notice: "Removed exercise from draft.",
        });
      }
    },
    moveExercise(exerciseInstanceId, direction) {
      const draft = store.getState().draftRoutine;
      if (draft) {
        const entries = draft.entries || draft.exercises || [];
        const index = entries.findIndex((ex) => ex.id === exerciseInstanceId);
        if (index === -1) return;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= entries.length) return;

        const next = [...entries];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        const reordered = next.map((ex, idx) => ({ ...ex, order: idx + 1 }));
        store.setState({ draftRoutine: { ...draft, entries: reordered, exercises: undefined } });
      }
    },
    toggleExerciseExpansion(exerciseId, isExpanded) {
      const currentExpanded = store.getState().expandedExerciseIds;
      if (currentExpanded.has(exerciseId) === isExpanded) {
        return;
      }
      const nextExpanded = new Set(currentExpanded);
      if (isExpanded) {
        nextExpanded.add(exerciseId);
      } else {
        nextExpanded.delete(exerciseId);
      }
      store.setState({ expandedExerciseIds: nextExpanded });
    },
    async importRoutines(file) {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith(".json")) {
        try {
          const currentExercises = store.getState().exercises;
          const usedSlugs = new Set(currentExercises.map((exercise) => exercise.slug));
          const parsed = parseTrainingPlanImport(text, {
            usedExerciseSlugs: usedSlugs,
            existingExercises: currentExercises,
          });
          const exerciseSummary = exerciseService.importPrepared(parsed.exercises);
          const routineSummary = routineService.importPrepared(parsed.routines);
          const planSummary = planService.importPrepared([parsed]);
          syncCollections({
            plans: planService.getAllBlueprints(),
            selectedPlanId: planSummary.firstPlanId ?? store.getState().selectedPlanId,
            exercises: exerciseService.getAll(),
            selectedExerciseId: exerciseSummary.firstExerciseId ?? store.getState().selectedExerciseId,
            routines: routineService.getAll(),
            selectedRoutineId: routineSummary.firstRoutineId,
            notice: `Imported ${routineSummary.count} routine${routineSummary.count === 1 ? "" : "s"} and ${exerciseSummary.count} exercise reference${exerciseSummary.count === 1 ? "" : "s"} from ${file.name}.`,
          });
        } catch (error) {
          store.setState({ notice: error.message || `Unable to import ${file.name}.` });
        }
        return;
      }

      const summary = routineService.importFromCsv(text);
      syncCollections({
        routines: routineService.getAll(),
        selectedRoutineId: summary.firstRoutineId,
        notice: `Imported ${summary.count} routine${summary.count === 1 ? "" : "s"} from ${file.name}.`,
      });
    },
    exportRoutines(scope, routineId) {
      const payload = routineService.exportToCsv(scope, routineId);
      const blob = new Blob([payload.csv], { type: "text/csv;charset=utf-8" });
      triggerBlobDownload(blob, payload.fileName);
      store.setState({ notice: `Exported ${payload.rowCount} template row${payload.rowCount === 1 ? "" : "s"} to ${payload.fileName}.` });
    },
    async importExercises(file) {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith(".json")) {
        const usedSlugs = new Set(store.getState().exercises.map((exercise) => exercise.slug));
        const exercises = parseExerciseImportJson(text, usedSlugs);
        const summary = exerciseService.importPrepared(exercises);
        syncCollections({
          exercises: exerciseService.getAll(),
          selectedExerciseId: summary.firstExerciseId,
          notice: `Imported ${summary.count} exercise reference${summary.count === 1 ? "" : "s"} from ${file.name}.`,
        });
        return;
      }

      const summary = exerciseService.importFromCsv(text);
      syncCollections({
        exercises: exerciseService.getAll(),
        selectedExerciseId: summary.firstExerciseId,
        notice: `Imported ${summary.count} exercise reference${summary.count === 1 ? "" : "s"} from ${file.name}.`,
      });
    },
    exportExercises() {
      const payload = exerciseService.exportToCsv();
      const blob = new Blob([payload.csv], { type: "text/csv;charset=utf-8" });
      triggerBlobDownload(blob, payload.fileName);
      store.setState({ notice: `Exported ${payload.rowCount} exercise reference${payload.rowCount === 1 ? "" : "s"} to ${payload.fileName}.` });
    },
    deleteCatalogExercise(exerciseId) {
      const currentState = store.getState();
      const exercise = currentState.exercises.find((entry) => entry.id === exerciseId) || null;
      if (!exercise) {
        return;
      }
      if (!exercise.isCustom) {
        store.setState({ notice: `"${exercise.name}" is built in and can't be deleted.` });
        return;
      }

      const dependencySummary = describeExerciseDependencies(exerciseId, currentState);
      const dependencyCount =
        dependencySummary.routines.length
        + dependencySummary.activePlans.length
        + dependencySummary.blueprints.length
        + dependencySummary.workouts.length;

      if (dependencyCount > 0) {
        store.setState({ notice: formatExerciseDependencyNotice(exercise.name, dependencySummary) });
        return;
      }

      const deleted = exerciseService.deleteExercise(exerciseId);
      if (!deleted) {
        store.setState({ notice: `Couldn't delete "${exercise.name}".` });
        return;
      }

      syncCollections({
        exercises: exerciseService.getAll(),
        selectedExerciseId: null,
        notice: `Deleted "${exercise.name}".`,
      });
      actions.navigate("exercises");
    },
    deleteBodyTarget(targetId) {
      const currentState = store.getState();
      const target = (currentState.bodyTargets || []).find((entry) => entry.id === targetId) || null;
      if (!target) {
        return;
      }
      if (!target.isCustom) {
        store.setState({ notice: `"${target.name}" is built in and can't be deleted.` });
        return;
      }

      const dependencySummary = describeBodyTargetDependencies(targetId, currentState);
      if (dependencySummary.exercises.length) {
        store.setState({ notice: formatBodyTargetDependencyNotice(target.name, dependencySummary) });
        return;
      }

      bodyMapRepository.delete(targetId);
      syncCollections({
        bodyTargets: bodyMapRepository.getAll(),
        notice: `Deleted "${target.name}".`,
      });
      actions.navigate("body-targets");
    },
    importFullPlan(data) {
      const importedBodyTargets = Array.isArray(data?.bodyTargets) ? data.bodyTargets : [];
      const importedExercises = Array.isArray(data?.exercises)
        ? data.exercises
        : Array.isArray(data?.exerciseCatalog)
          ? data.exerciseCatalog
          : [];

      if (importedBodyTargets.length) {
        const bodyTargetMerge = mergeMissingById(bodyMapRepository.getAll(), importedBodyTargets);
        if (bodyTargetMerge.added.length) {
          bodyMapRepository.replaceAll(bodyTargetMerge.merged);
        }
      }

      if (importedExercises.length) {
        const exerciseMerge = mergeMissingById(exerciseRepository.list(), importedExercises);
        if (exerciseMerge.added.length) {
          exerciseRepository.replaceAll(exerciseMerge.merged);
        }
      }

      const planId = planService.importFullPlan(data, routineService, exerciseService.getAll());
      syncCollections({
        plans: planService.getAllBlueprints(),
        exercises: exerciseService.getAll(),
        routines: routineService.getAll(),
        selectedPlanId: planId,
        notice: "Full plan imported successfully.",
      });
    },
    exportFullPlan(planId) {
      const plan = planService.getBlueprint(planId);
      if (!plan) return;
      const json = planService.exportFullPlan(
        planId,
        routineService,
        exerciseService.getAll(),
        bodyMapRepository.getAll(),
      );
      const blob = new Blob([json], { type: "application/json" });
      triggerBlobDownload(blob, `${plan.name.toLowerCase().replace(/\s+/g, '-')}-template.json`);
      store.setState({ notice: `Exported "${plan.name}" template successfully.` });
    },
    exportActivePlan(planId) {
      const plan = activePlanService.getActivePlan(planId);
      if (!plan) return;
      const json = planService.exportActivePlan(planId);
      const blob = new Blob([json], { type: "application/json" });
      triggerBlobDownload(blob, `${(plan.displayName || plan.name || "active-plan").toLowerCase().replace(/\s+/g, "-")}-export.json`);
      store.setState({ notice: `Exported "${plan.displayName || plan.name}" active plan package successfully.` });
    },
    async importActivePlanPackage(file) {
      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        const importedPlan = planService.importActivePlanPackage(text);
        syncCollections({
          activePlans: activePlanService.getAll(),
          workouts: workoutService.getAll(),
          routines: routineService.getAll(),
          exercises: exerciseService.getAll(),
          notice: `Imported "${importedPlan.displayName || importedPlan.name}" active plan package successfully.`,
        });
        router.navigate(`active-plan/${importedPlan.id}`);
      } catch (error) {
        store.setState({
          notice: error.message || `Unable to import ${file.name}.`,
        });
      }
    },
    async importActivePlanRevision(planId, file) {
      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        const review = planService.prepareActivePlanRevision(planId, text);
        store.setState({
          pendingActivePlanRevision: review,
          notice: `Loaded plan update package from ${file.name}. Review before applying.`,
        });
        router.navigate(`active-plan-revision/${planId}`);
      } catch (error) {
        store.setState({
          notice: error.message || `Unable to import ${file.name}.`,
        });
      }
    },
    updateActivePlanRevisionReview(patch) {
      const current = store.getState().pendingActivePlanRevision;
      if (!current) {
        return;
      }

      if (Object.prototype.hasOwnProperty.call(patch, "selectedStageAnchorId")) {
        const refreshed = planService.refreshPreparedActivePlanRevision(current, {
          selectedStageAnchorId: patch.selectedStageAnchorId,
          changeSummary: patch.changeSummary ?? current.changeSummary,
          staleAcknowledged: patch.staleAcknowledged ?? current.staleAcknowledged,
        });
        store.setState({ pendingActivePlanRevision: refreshed });
        return;
      }

      store.setState({
        pendingActivePlanRevision: {
          ...current,
          ...patch,
        },
      });
    },
    cancelActivePlanRevisionReview(planId) {
      const review = store.getState().pendingActivePlanRevision;
      store.setState({ pendingActivePlanRevision: null });
      actions.navigate(review?.returnRoute || (planId ? `active-plan/${planId}` : "active-plans"));
    },
    applyActivePlanRevisionReview() {
      const review = store.getState().pendingActivePlanRevision;
      if (!review) {
        return;
      }

      try {
        const updatedPlan = planService.applyActivePlanRevision(review);
        if (review.reviewMode === "editor") {
          clearActivePlanDraftState();
        }
        syncCollections({
          activePlans: activePlanService.getAll(),
          routines: routineService.getAll(),
          exercises: exerciseService.getAll(),
          notice: review.reviewMode === "editor"
            ? `Saved live plan changes to "${updatedPlan.displayName || updatedPlan.name}".`
            : `Applied revision to "${updatedPlan.displayName || updatedPlan.name}".`,
        });
        store.setState({ pendingActivePlanRevision: null });
        router.navigate(`active-plan/${updatedPlan.id}`);
      } catch (error) {
        store.setState({
          notice: error.message || (review.reviewMode === "editor"
            ? "Unable to save the live plan changes."
            : "Unable to apply the active-plan revision."),
        });
      }
    },
    navigate(route) {
      const isPrimarySection = !route.includes("/");
      const state = store.getState();
      const inActivePlanEditorWorkflow = isActivePlanEditorWorkflowRoute(state.route, state);
      const stayingInActivePlanEditorWorkflow = isActivePlanEditorWorkflowRoute(route, state);

      if (
        inActivePlanEditorWorkflow &&
        isActivePlanDraftDirty(state) &&
        !stayingInActivePlanEditorWorkflow
      ) {
        confirmAction(document.body, {
          title: "Discard live plan edits?",
          message:
            "Leaving now will discard your unsaved live-plan edits. Stay here or discard the draft.",
          confirmText: "Discard edits",
          cancelText: "Stay",
          onConfirm: () => {
            store.setState({ pendingActivePlanRevision: null });
            clearActivePlanDraftState();
            actions.navigate(route);
          },
        });
        return;
      }

      const isLeavingWorkoutPlayer =
        state.route.startsWith("workout-player/") &&
        !route.startsWith("workout-player/");

      const proceed = () => {
        if (isLeavingWorkoutPlayer && !hasWorkoutPlayerUnsavedProgress()) {
          discardWorkoutPlayerSession();
        }
        const isLeavingRevision =
          store.getState().route.startsWith("active-plan-revision/") &&
          !route.startsWith("active-plan-revision/");
        if (isLeavingRevision) {
          store.setState({ pendingActivePlanRevision: null });
        }
        if (isPrimarySection) {
          store.setState(getPrimaryNavResetPatch());
        }
        router.navigate(route);
      };

      if (!isPrimarySection) {
        const isLeavingRevision =
          store.getState().route.startsWith("active-plan-revision/") &&
          !route.startsWith("active-plan-revision/");
        if (isLeavingRevision) {
          store.setState({ pendingActivePlanRevision: null });
        }
        if (isLeavingWorkoutPlayer && !hasWorkoutPlayerUnsavedProgress()) {
          discardWorkoutPlayerSession();
        }
        router.navigate(route);
        return;
      }

      const bd = isBlueprintDirty(state);
      const rd = isRoutineDraftDirty(state);
      const pd = hasWorkoutPlayerUnsavedProgress();

      if (!bd && !rd && !pd) {
        proceed();
        return;
      }

      if (pd && (bd || rd)) {
        confirmAction(document.body, {
          title: "Discard unsaved work?",
          message:
            "You have unsaved template or routine edits and a workout in progress. Leaving discards the workout and any unsaved template or routine changes.",
          confirmText: "Discard all",
          cancelText: "Stay",
          onConfirm: () => {
            discardWorkoutPlayerSession();
            proceed();
          },
        });
        return;
      }

      if (pd) {
        confirmAbandonWorkout(document.body, {
          onAbandon: () => {
            discardWorkoutPlayerSession();
            proceed();
          },
        });
        return;
      }

      confirmUnsavedChanges(document.body, {
        message:
          "Leaving will close this view. You can save your changes to the library, discard them, or stay here.",
        onSave: () => {
          if (bd) actions.saveBlueprint();
          if (rd && isRoutineDraftDirty(store.getState())) actions.saveRoutine();
          proceed();
        },
        onDiscard: () => proceed(),
      });
    },
  };

  function syncCollections({
    bodyTargets,
    exercises,
    selectedExerciseId,
    routines,
    selectedRoutineId,
    plans,
    selectedPlanId,
    activePlans,
    selectedActivePlanId,
    workouts,
    selectedWorkoutId,
    selectedHistoryDate,
    archivedPlans,
    notice,
  } = {}) {
    const nextBodyTargets = bodyTargets ?? bodyMapRepository.getAll();
    const nextExercises = exercises ?? store.getState().exercises;
    const nextExerciseId = normalizeSelectedId(
      nextExercises,
      selectedExerciseId ?? store.getState().selectedExerciseId,
    );
    const nextRoutines = routines ?? store.getState().routines;
    const nextRoutineId = normalizeSelectedId(
      nextRoutines,
      selectedRoutineId ?? store.getState().selectedRoutineId,
    );
    const nextPlans = plans ?? store.getState().plans;
    const nextPlanIdCandidate = selectedPlanId !== undefined ? selectedPlanId : store.getState().selectedPlanId;
    const nextPlanId = nextPlans.some(p => p.id === nextPlanIdCandidate) ? nextPlanIdCandidate : null;

    const nextActivePlans = activePlans ?? store.getState().activePlans;
    const nextActivePlanIdCandidate = selectedActivePlanId !== undefined ? selectedActivePlanId : store.getState().selectedActivePlanId;
    const nextActivePlanId = nextActivePlans.some(p => p.id === nextActivePlanIdCandidate) ? nextActivePlanIdCandidate : null;

    const nextWorkouts = workouts ?? store.getState().workouts;
    const nextHistorySelection = resolveHistorySelection(
      nextWorkouts,
      store.getState().selectedHistoryPlanId,
      selectedWorkoutId ?? store.getState().selectedWorkoutId,
      selectedHistoryDate ?? store.getState().selectedHistoryDate,
    );

    store.setState({
      bodyTargets: nextBodyTargets,
      exercises: nextExercises,
      selectedExerciseId: nextExerciseId,
      routines: nextRoutines,
      selectedRoutineId: nextRoutineId,
      plans: nextPlans,
      selectedPlanId: nextPlanId,
      activePlans: nextActivePlans,
      selectedActivePlanId: nextActivePlanId,
      workouts: nextWorkouts,
      selectedWorkoutId: nextHistorySelection.selectedWorkoutId,
      selectedHistoryPlanId: nextHistorySelection.selectedHistoryPlanId,
      selectedHistoryDate: nextHistorySelection.selectedHistoryDate,
      archivedPlans: archivedPlans ?? store.getState().archivedPlans,
      notice: notice ?? store.getState().notice,
    });
  }

  function render() {
    const state = store.getState();
    const outlet = renderShell(root, state, actions);

    if (state.route === "workouts") {
      renderWorkoutView(outlet, { state, actions });
      return;
    }

    if (state.route === "exercises") {
      renderExerciseView(outlet, { state, actions });
      return;
    }

    if (state.route.startsWith("exercise/")) {
      renderExerciseView(outlet, { state, actions });
      return;
    }

    if (state.route === "body-targets") {
      renderExerciseView(outlet, { state, actions });
      return;
    }

    if (state.route.startsWith("body-target/")) {
      renderExerciseView(outlet, { state, actions });
      return;
    }

    if (state.route === "plans") {
      renderPlansView(outlet, { state, actions });
      return;
    }

    if (state.route.startsWith("plan-study/")) {
      renderBlueprintStudyView(outlet, { state, actions });
      return;
    }

    if (state.route === "active-plans") {
      renderActivePlansView(outlet, { state, actions });
      return;
    }

    if (state.route.startsWith("active-plan-study/")) {
      renderActivePlanStudyView(outlet, { state, actions });
      return;
    }

    if (state.route.startsWith("active-plan-revision/")) {
      renderActivePlanRevisionView(outlet, { state, actions });
      return;
    }

    if (state.route.startsWith("active-plan-edit/")) {
      renderActivePlanEditorView(outlet, { state, actions });
      return;
    }

    if (state.route.startsWith("active-plan/")) {
      renderActivePlanDetailView(outlet, { state, actions });
      return;
    }

    if (state.route.startsWith("workout-player/")) {
      renderWorkoutPlayerView(outlet, { state, actions });
      return;
    }

    if (state.route.startsWith("routine/")) {
      renderRoutineDetailView(outlet, { state, actions });
      return;
    }

    renderRoutineView(outlet, { state, actions });
  }

  store.subscribe(render);

  router.subscribe((route) => {
    store.setState({ route });
  });

  window.addEventListener("beforeunload", (event) => {
    if (!hasUnsavedEditableState()) {
      return;
    }
    event.preventDefault();
    event.returnValue = "";
  });

  window.appActions = actions;

  return {
    mount() {
      render();
      router.start();
    },
  };
}
