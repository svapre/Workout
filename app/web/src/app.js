import { createRouter } from "./core/router.js";
import { createStore } from "./core/store.js";
import { createSeedExerciseCatalog } from "./data/defaultExerciseCatalog.js";
import { createSeedRoutines, createSeedPlans } from "./data/defaults.js";
import { createSeedWorkoutHistory } from "./data/defaultWorkoutHistory.js";
import { parseExerciseImportJson, parseTrainingPlanImport } from "./data/import/trainingPlanImport.js";
import { createExerciseRepository } from "./data/repositories/exerciseRepository.js";
import { createRoutineRepository } from "./data/repositories/routineRepository.js";
import { createWorkoutRepository } from "./data/repositories/workoutRepository.js";
import { createPlanRepository } from "./data/repositories/planRepository.js";
import { createLocalStore } from "./data/storage/localStore.js";
import { renderDashboardView } from "./features/dashboard/dashboardView.js";
import { renderExerciseView } from "./features/exercises/exerciseView.js";
import { createExerciseService } from "./features/exercises/exerciseService.js";
import { renderRoutineView } from "./features/routines/routineView.js";
import { createRoutineService } from "./features/routines/routineService.js";
import { createWorkoutService } from "./features/workouts/workoutService.js";
import { createPlanService } from "./features/plans/planService.js";
import { renderWorkoutView } from "./features/workouts/workoutView.js";
import { renderPlansView } from "./features/plans/plansView.js?v=3";
import { renderActivePlansView } from "./features/activePlans/activePlansView.js";
import { createActivePlanService } from "./features/activePlans/activePlanService.js";
import { renderShell } from "./ui/shell.js";

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

export function createApp(root) {
  const localStore = createLocalStore("workout-app.state.v1");
  const exerciseStore = createLocalStore("workout-app.exercises.v1");
  const exerciseRepository = createExerciseRepository(exerciseStore, createSeedExerciseCatalog);
  const exerciseService = createExerciseService(exerciseRepository);
  const routineRepository = createRoutineRepository(localStore, createSeedRoutines);
  const routineService = createRoutineService(routineRepository);
  const workoutStore = createLocalStore("workout-app.workouts.v1");
  const workoutRepository = createWorkoutRepository(workoutStore, createSeedWorkoutHistory);
  const workoutService = createWorkoutService(workoutRepository);
  const planStore = createLocalStore("workout-app.plans.v1");
  const planRepository = createPlanRepository(planStore, createSeedPlans);
  const planService = createPlanService(planRepository);
  const activePlanStore = createLocalStore("workout-app.activePlans.v1");
  const activePlanRepository = createPlanRepository(activePlanStore, () => []);
  const activePlanService = createActivePlanService(activePlanRepository);
  const router = createRouter(["routines", "exercises", "workouts", "dashboard", "plans", "active-plans"], "dashboard");

  const initialExercises = exerciseService.getAll();
  const initialRoutines = routineService.getAll();
  const initialWorkouts = workoutService.getAll();
  const store = createStore({
    route: router.getCurrentRoute(),
    notice: "Modular app shell ready. Routines are stored locally in your browser.",
    exercises: initialExercises,
    selectedExerciseId: null,
    routines: initialRoutines,
    selectedRoutineId: null,
    workouts: initialWorkouts,
    selectedWorkoutId: initialWorkouts[0]?.id ?? null,
    plans: planService.getAll(),
    activePlans: activePlanService.getAll(),
    archivedPlans: createLocalStore("workout-app.archivedPlans.v1").list() || [],
    selectedPlanId: null,
    selectedActivePlanId: null,
    planEditMode: false,
    expandedExerciseIds: new Set(),
  });

  // Auto-inject The Mind Illuminated plan if missing
  const currentPlans = planService.getAll();
  const seedPlans = createSeedPlans();
  if (!currentPlans.some(p => p.name === seedPlans[0].name)) {
    seedPlans.forEach(seed => {
      const p = planService.createPlan();
      planService.updatePlan(p.id, {
        name: seed.name,
        description: seed.description,
        isActive: seed.isActive,
        goals: seed.goals,
        stages: seed.stages
      });
    });
    store.setState({ plans: planService.getAll() });
  }

  const actions = {
    navigate(route) {
      router.navigate(route);
    },
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
      store.setState({ selectedRoutineId: routineId });
    },
    selectExercise(exerciseId) {
      store.setState({ selectedExerciseId: exerciseId });
    },
    selectWorkout(workoutId) {
      store.setState({ selectedWorkoutId: workoutId });
    },
    selectPlan(planId) {
      store.setState({ selectedPlanId: planId, planEditMode: false });
    },
    togglePlanEditMode(mode) {
      store.setState({ planEditMode: mode ?? !store.getState().planEditMode });
    },
    createPlan() {
      const plan = planService.createPlan();
      syncCollections({ plans: planService.getAll(), selectedPlanId: plan.id, notice: "Created a new plan." });
      store.setState({ planEditMode: true });
    },
    updatePlan(planId, patch) {
      planService.updatePlan(planId, patch);
      syncCollections({ plans: planService.getAll() });
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
    deletePlan(planId) {
      planService.deletePlan(planId);
      syncCollections({ plans: planService.getAll(), selectedPlanId: null, notice: "Deleted plan." });
      store.setState({ planEditMode: false });
    },
    selectActivePlan(planId) {
      store.setState({ selectedActivePlanId: planId });
    },
    updateActivePlan(planId, patch) {
      activePlanService.updateActivePlan(planId, patch);
      syncCollections({ activePlans: activePlanService.getAll() });
    },
    deleteActivePlan(planId) {
      activePlanService.deleteActivePlan(planId);
      syncCollections({ activePlans: activePlanService.getAll(), selectedActivePlanId: null, notice: "Deleted active roadmap." });
    },
    archivePlan(planId) {
      const plans = activePlanService.getAll();
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        const archiveStore = createLocalStore("workout-app.archivedPlans.v1");
        const archived = { ...plan, completedAt: new Date().toISOString() };
        archiveStore.replaceAll([...(archiveStore.list() || []), archived]);
        activePlanService.deleteActivePlan(planId);
        syncCollections({ 
          activePlans: activePlanService.getAll(), 
          archivedPlans: archiveStore.list(),
          notice: `Congratulations! "${plan.name}" has been archived.` 
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
      const deleted = routineService.deleteRoutine(routineId);
      syncCollections({
        routines: routineService.getAll(),
        selectedRoutineId: null,
        notice: `Deleted "${deleted.name}".`,
      });
    },
    updateRoutine(routineId, patch) {
      routineService.updateRoutine(routineId, patch);
      syncCollections({ routines: routineService.getAll() });
    },
    addExercise(routineId) {
      routineService.addExercise(routineId);
      syncCollections({
        routines: routineService.getAll(),
        selectedRoutineId: routineId,
        notice: "Added a new exercise block.",
      });
    },
    updateExercise(routineId, exerciseId, patch) {
      routineService.updateExercise(routineId, exerciseId, patch);
      syncCollections({
        routines: routineService.getAll(),
        selectedRoutineId: routineId,
      });
    },
    deleteExercise(routineId, exerciseId) {
      routineService.deleteExercise(routineId, exerciseId);
      syncCollections({
        routines: routineService.getAll(),
        selectedRoutineId: routineId,
        notice: "Removed exercise from routine.",
      });
    },
    moveExercise(routineId, exerciseId, direction) {
      routineService.moveExercise(routineId, exerciseId, direction);
      syncCollections({
        routines: routineService.getAll(),
        selectedRoutineId: routineId,
      });
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
        const usedSlugs = new Set(store.getState().exercises.map((exercise) => exercise.slug));
        const parsed = parseTrainingPlanImport(text, usedSlugs);
        const exerciseSummary = exerciseService.importPrepared(parsed.exercises);
        const routineSummary = routineService.importPrepared(parsed.routines);
        const planSummary = planService.importPrepared([parsed]);
        syncCollections({
          plans: planService.getAll(),
          selectedPlanId: planSummary.firstPlanId ?? store.getState().selectedPlanId,
          exercises: exerciseService.getAll(),
          selectedExerciseId: exerciseSummary.firstExerciseId ?? store.getState().selectedExerciseId,
          routines: routineService.getAll(),
          selectedRoutineId: routineSummary.firstRoutineId,
          notice: `Imported ${routineSummary.count} routine${routineSummary.count === 1 ? "" : "s"} and ${exerciseSummary.count} exercise reference${exerciseSummary.count === 1 ? "" : "s"} from ${file.name}.`,
        });
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
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = payload.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
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
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = payload.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      store.setState({ notice: `Exported ${payload.rowCount} exercise reference${payload.rowCount === 1 ? "" : "s"} to ${payload.fileName}.` });
    },
  };

  function syncCollections({
    exercises,
    selectedExerciseId,
    routines,
    selectedRoutineId,
    plans,
    selectedPlanId,
    activePlans,
    selectedActivePlanId,
    archivedPlans,
    notice,
  } = {}) {
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

    store.setState({
      exercises: nextExercises,
      selectedExerciseId: nextExerciseId,
      routines: nextRoutines,
      selectedRoutineId: nextRoutineId,
      plans: nextPlans,
      selectedPlanId: nextPlanId,
      activePlans: nextActivePlans,
      selectedActivePlanId: nextActivePlanId,
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

    if (state.route === "dashboard") {
      renderDashboardView(outlet, { state, actions });
      return;
    }

    if (state.route === "plans") {
      renderPlansView(outlet, { state, actions });
      return;
    }

    if (state.route === "active-plans") {
      renderActivePlansView(outlet, { state, actions });
      return;
    }

    renderRoutineView(outlet, { state, actions });
  }

  store.subscribe(render);

  router.subscribe((route) => {
    store.setState({ route });
  });

  return {
    mount() {
      render();
      router.start();
    },
  };
}
