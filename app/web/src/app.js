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
import { evaluateStageProgress } from "./features/plans/progressionEngine.js";
import { buildAdvanceStagePatch, buildRestDayCompletionPatch } from "./features/plans/stageProgression.js";
import {
  createDefaultMilestone,
  getExerciseDefaultTrackingType,
  inferRoutineEntryTrackingType,
} from "./data/schemaMigration.js";
import { renderWorkoutView } from "./features/workouts/workoutView.js";
import { renderPlansView } from "./features/plans/plansView.js?v=10";
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
  const planService = createPlanService(planRepository, activePlanRepository, {
    workoutRepository,
    exerciseRepository,
    routineRepository,
    bodyMapRepository,
  });
  const activePlanService = createActivePlanService(activePlanRepository);
  const router = createRouter(["routines", "exercises", "workouts", "plans", "active-plans", "active-plan", "active-plan-edit", "active-plan-revision", "workout-player"], "active-plans");

  const initialExercises = exerciseService.getAll();
  const initialRoutines = routineService.getAll();
  const initialWorkouts = workoutService.getAll();
  const store = createStore({
    route: router.getCurrentRoute(),
    notice: "",
    exercises: initialExercises,
    selectedExerciseId: null,
    routines: initialRoutines,
    selectedRoutineId: null,
    workouts: initialWorkouts,
    selectedWorkoutId: initialWorkouts[0]?.id ?? null,
    selectedHistoryPlanId: null,
    plans: planService.getAllBlueprints(),
    activePlans: activePlanService.getAll(),
    archivedPlans: createLocalStore("workout-app.archivedPlans.v1").load() || [],
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
        selectedActivePlanId: null,
        pendingActivePlanRevision: null,
        activePlanEditMode: false,
        editingActivePlanStageId: null,
        draftActivePlan: null,
        activePlanStageDraft: null,
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
    selectWorkout(workoutId) {
      store.setState({ selectedWorkoutId: workoutId });
    },
    selectHistoryPlan(planId) {
      const normalizedPlanId = planId || null;
      const workouts = store.getState().workouts;
      const currentSelectedWorkout = workouts.find(
        (workout) =>
          workout.id === store.getState().selectedWorkoutId &&
          (!normalizedPlanId || workout.activePlanId === normalizedPlanId),
      );
      const fallbackWorkout = workouts.find(
        (workout) => !normalizedPlanId || workout.activePlanId === normalizedPlanId,
      );

      store.setState({
        selectedHistoryPlanId: normalizedPlanId,
        selectedWorkoutId: currentSelectedWorkout?.id ?? fallbackWorkout?.id ?? null,
      });
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
          "Leaving will close this blueprint. Save your edits to the library, discard them, or stay on this screen.",
        onSave: () => {
          actions.saveBlueprint();
          actions.selectPlan(null);
        },
        onDiscard: () => actions.selectPlan(null),
      });
    },
    leaveRoutineEditor() {
      const state = store.getState();
      if (!isRoutineDraftDirty(state)) {
        actions.selectRoutine(null);
        return;
      }
      confirmUnsavedChanges(document.body, {
        message:
          "Leaving will close this routine. Save your edits, discard them, or stay on this screen.",
        onSave: () => actions.saveRoutine(),
        onDiscard: () => actions.selectRoutine(null),
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
          "Leave the editor? Save your blueprint changes, discard them, or stay on this screen.",
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
      const { draftBlueprint, stageDraft } = store.getState();
      let merged = draftBlueprint;
      if (draftBlueprint && stageDraft) {
        const stages = draftBlueprint.stages.map((s) => (s.id === stageDraft.id ? stageDraft : s));
        merged = { ...draftBlueprint, stages };
        store.setState({ draftBlueprint: merged, stageDraft: null, editingStageId: null });
      }
      if (merged) {
        planService.updateBlueprint(merged.id, merged);
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
    updateSessionReflection(sessionId, reflectionRating) {
      workoutService.updateSession(sessionId, { reflectionRating });
      syncCollections({
        workouts: workoutService.getAll(),
      });
    },
    deleteActivePlan(planId) {
      const deletedPlan = activePlanService.deleteActivePlan(planId);
      syncCollections({
        activePlans: activePlanService.getAll(),
        selectedActivePlanId: null,
        notice: deletedPlan
          ? `Removed "${deletedPlan.displayName || deletedPlan.name}" from active plans.`
          : "Removed the active plan.",
      });
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
          const type = inferRoutineEntryTrackingType(ex, catalogEntry);
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
    exportActivePlan(planId) {
      const plan = activePlanService.getActivePlan(planId);
      if (!plan) return;
      const json = planService.exportActivePlan(planId);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(plan.displayName || plan.name || "active-plan").toLowerCase().replace(/\s+/g, "-")}-export.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      store.setState({ notice: `Exported "${plan.displayName || plan.name}" active plan package successfully.` });
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
          notice: `Loaded revision package from ${file.name}. Review before applying.`,
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
            "You have unsaved blueprint or routine edits and a workout in progress. Leaving discards the workout and any unsaved blueprint or routine changes.",
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
