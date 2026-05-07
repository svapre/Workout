import { createRouter } from "./core/router.js";
import { createStore } from "./core/store.js";
import { createSeedExerciseCatalog } from "./data/defaultExerciseCatalog.js";
import { createSeedRoutines, createSeedPlans } from "./data/defaults.js";
import { createSeedWorkoutHistory } from "./data/defaultWorkoutHistory.js";
import { parseExerciseImportJson, parseTrainingPlanImport } from "./data/import/trainingPlanImport.js";
import { createBodyMapRepository, createSeedBodyMap } from "./data/repositories/bodyMapRepository.js";
import { createExerciseRepository } from "./data/repositories/exerciseRepository.js";
import { createRoutineRepository } from "./data/repositories/routineRepository.js";
import { createWorkoutRepository } from "./data/repositories/workoutRepository.js";
import { createPlanRepository } from "./data/repositories/planRepository.js";
import { createLocalStore } from "./data/storage/localStore.js";
import { renderExerciseView } from "./features/exercises/exerciseView.js";
import { createExerciseService } from "./features/exercises/exerciseService.js";
import { renderRoutineView } from "./features/routines/routineView.js";
import { createRoutineService } from "./features/routines/routineService.js";
import { createWorkoutService } from "./features/workouts/workoutService.js";
import { createPlanService } from "./features/plans/planService.js";
import { renderWorkoutView } from "./features/workouts/workoutView.js";
import { renderPlansView } from "./features/plans/plansView.js?v=10";
import { renderActivePlansView } from "./features/activePlans/activePlansView.js";
import { createActivePlanService } from "./features/activePlans/activePlanService.js";
import { renderShell } from "./ui/shell.js";
import { renderActivePlanDetailView } from "./features/activePlans/activePlanDetailView.js";
import { renderWorkoutPlayerView } from "./features/workoutPlayer/workoutPlayerView.js";

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
  const planService = createPlanService(planRepository, activePlanRepository);
  const activePlanService = createActivePlanService(activePlanRepository);
  const router = createRouter(["routines", "exercises", "workouts", "plans", "active-plans", "active-plan", "workout-player"], "active-plans");

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
    plans: planService.getAllBlueprints(),
    activePlans: activePlanService.getAll(),
    archivedPlans: createLocalStore("workout-app.archivedPlans.v1").load() || [],
    selectedPlanId: null,
    selectedActivePlanId: null,
    planEditMode: false,
    editingStageId: null,
    draftBlueprint: null,
    stageDraft: null,
    draftRoutine: null,
    expandedExerciseIds: new Set(),
  });

  // Master Seed Injection Logic
  const currentPlans = planService.getAllBlueprints();
  const masterPlanId = "plan_master_rehab_strength";
  
  if (!currentPlans.some(p => p.id === masterPlanId)) {
    console.log("Master Seed missing. Re-injecting strict database cascade...");
    
    // Clear potentially corrupted data
    exerciseRepository.replaceAll(createSeedExerciseCatalog());
    routineRepository.replaceAll(createSeedRoutines());
    planRepository.replaceAll(createSeedPlans());
    
    store.setState({ 
      exercises: exerciseService.getAll(),
      routines: routineService.getAll(),
      plans: planService.getAllBlueprints()
    });
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
      const routine = store.getState().routines.find(r => r.id === routineId);
      store.setState({ 
        selectedRoutineId: routineId,
        draftRoutine: routine ? JSON.parse(JSON.stringify(routine)) : null
      });
    },
    selectExercise(exerciseId) {
      store.setState({ selectedExerciseId: exerciseId });
    },
    selectWorkout(workoutId) {
      store.setState({ selectedWorkoutId: workoutId });
    },
    selectPlan(planId) {
      const plan = store.getState().plans.find(p => p.id === planId);
      store.setState({ 
        selectedPlanId: planId, 
        planEditMode: false, 
        editingStageId: null,
        draftBlueprint: plan ? JSON.parse(JSON.stringify(plan)) : null
      });
    },
    setEditingStageId(stageId) {
      const blueprint = store.getState().draftBlueprint;
      let stageDraft = null;
      if (blueprint && stageId) {
        const stage = blueprint.stages.find(s => s.id === stageId);
        if (stage) {
          stageDraft = JSON.parse(JSON.stringify(stage));
          // DATA SANITIZATION: Strip residual targetValue if exercise is missing (Legacy/Dirty data)
          if (stageDraft.milestone?.type === "exercise_target" && !stageDraft.milestone.exerciseId) {
            stageDraft.milestone.target = null;
          }
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
      syncCollections({ plans: planService.getAllBlueprints(), selectedPlanId: plan.id, notice: "Created a new blueprint." });
      store.setState({ planEditMode: true });
    },
    updateBlueprint(patch) {
      const draft = store.getState().draftBlueprint;
      if (draft) {
        store.setState({ draftBlueprint: { ...draft, ...patch } });
      }
    },
    saveBlueprint() {
      const draft = store.getState().draftBlueprint;
      if (draft) {
        planService.updateBlueprint(draft.id, draft);
        syncCollections({ plans: planService.getAllBlueprints(), notice: "Blueprint saved successfully." });
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
      syncCollections({ plans: planService.getAllBlueprints(), selectedPlanId: null, notice: "Deleted blueprint." });
      store.setState({ planEditMode: false });
    },
    selectActivePlan(planId) {
      store.setState({ selectedActivePlanId: planId });
    },
    updateActivePlan(planId, patch) {
      activePlanService.updateActivePlan(planId, patch);
      syncCollections({ activePlans: activePlanService.getAll() });
    },
    recordCompletedSession({ session, activePlanId, planPatch }) {
      workoutService.appendSession(session);
      activePlanService.updateActivePlan(activePlanId, planPatch);
      syncCollections({
        workouts: workoutService.getAll(),
        activePlans: activePlanService.getAll(),
      });
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
        archiveStore.save([...(archiveStore.load() || []), archived]);
        activePlanService.deleteActivePlan(planId);
        syncCollections({ 
          activePlans: activePlanService.getAll(), 
          archivedPlans: archiveStore.load(),
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
    updateRoutine(patch) {
      const draft = store.getState().draftRoutine;
      if (draft) {
        store.setState({ draftRoutine: { ...draft, ...patch } });
      }
    },
    saveRoutine() {
      const draft = store.getState().draftRoutine;
      if (draft) {
        const sourceEntries = draft.entries || draft.exercises || [];
        const entries = sourceEntries.map((ex) => {
          const catalogEntry = store.getState().exercises.find((e) => e.id === ex.exerciseId);
          const type = catalogEntry?.trackingType || "reps";
          const clean = {
            id: ex.id,
            exerciseId: ex.exerciseId,
            order: ex.order,
            notes: ex.notes,
            sets: ex.sets,
            resistance: ex.resistance ?? null,
            restSeconds: ex.restSeconds,
          };
          if (type === "reps") {
            clean.reps = ex.reps;
            clean.durationSeconds = null;
            clean.weight = null;
          } else if (type === "duration") {
            clean.durationSeconds = ex.durationSeconds;
            clean.reps = null;
            clean.weight = null;
          } else if (type === "weight") {
            clean.reps = ex.reps;
            clean.weight = ex.weight;
            clean.durationSeconds = null;
          } else {
            clean.reps = ex.reps;
            clean.durationSeconds = ex.durationSeconds;
            clean.weight = ex.weight;
            clean.resistance = ex.resistance ?? null;
          }
          return clean;
        });

        const cleanedRoutine = { ...draft, entries, exercises: undefined };
        routineService.updateRoutine(cleanedRoutine.id, cleanedRoutine);
        syncCollections({ routines: routineService.getAll(), notice: "Routine saved successfully." });
        store.setState({ selectedRoutineId: null, draftRoutine: null });
      }
    },
    addExercise(exerciseId) {
      const draft = store.getState().draftRoutine;
      if (draft && exerciseId) {
        const entries = draft.entries || draft.exercises || [];
        const newInstance = {
          id: `inst_${Date.now()}`,
          exerciseId,
          order: entries.length + 1,
          sets: 3,
          reps: 10,
          durationSeconds: null,
          weight: null,
          resistance: null,
          restSeconds: 45,
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
        const usedSlugs = new Set(store.getState().exercises.map((exercise) => exercise.slug));
        const parsed = parseTrainingPlanImport(text, usedSlugs);
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
    importFullPlan(data) {
      const planId = planService.importFullPlan(data, routineService, exerciseService.getAll());
      syncCollections({
        plans: planService.getAllBlueprints(),
        routines: routineService.getAll(),
        selectedPlanId: planId,
        notice: "Full plan imported successfully.",
      });
    },
    exportFullPlan(planId) {
      const plan = planService.getBlueprint(planId);
      if (!plan) return;
      const json = planService.exportFullPlan(planId, routineService);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${plan.name.toLowerCase().replace(/\s+/g, '-')}-blueprint.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      store.setState({ notice: `Exported "${plan.name}" blueprint successfully.` });
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
    workouts,
    selectedWorkoutId,
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

    const nextWorkouts = workouts ?? store.getState().workouts;
    const nextWorkoutId = normalizeSelectedId(
      nextWorkouts,
      selectedWorkoutId ?? store.getState().selectedWorkoutId,
    );

    store.setState({
      exercises: nextExercises,
      selectedExerciseId: nextExerciseId,
      routines: nextRoutines,
      selectedRoutineId: nextRoutineId,
      plans: nextPlans,
      selectedPlanId: nextPlanId,
      activePlans: nextActivePlans,
      selectedActivePlanId: nextActivePlanId,
      workouts: nextWorkouts,
      selectedWorkoutId: nextWorkoutId,
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

    if (state.route === "plans") {
      renderPlansView(outlet, { state, actions });
      return;
    }

    if (state.route === "active-plans") {
      renderActivePlansView(outlet, { state, actions });
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

    renderRoutineView(outlet, { state, actions });
  }

  store.subscribe(render);

  router.subscribe((route) => {
    store.setState({ route });
  });

  window.appActions = actions;

  return {
    mount() {
      render();
      router.start();
    },
  };
}
