import { createId } from "../../core/uid.js";
import {
  createActivePlanFromBlueprint,
  joinGoals,
  migrateBlueprint,
  migrateRoutine,
  migrateStage,
} from "../../data/schemaMigration.js";

export function createPlanService(blueprintRepo, activeRepo) {
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
      theme: { color: "#4FD1C5", icon: "💪", code: "PLN" },
      createdAt: ts,
      stages: [
        {
          id: createId("stage"),
          name: "Stage 1",
          predecessorStageId: null,
          transitionRule: "prompt_user",
          schedule: [{ type: "rest", routineId: null }],
          milestone: {
            description: "Complete the cycle",
            type: "cycles",
            target: 1,
            requiresContinuous: false,
            exerciseId: null,
            metric: null,
            onFailure: { action: "none", targetStageId: null },
          },
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

    let finalName = customName || blueprint.name;
    let suffix = 1;
    const existingNames = new Set(currentActive.map((p) => p.name));

    while (existingNames.has(finalName)) {
      suffix += 1;
      const baseName = customName || blueprint.name;
      finalName = `${baseName} (${suffix})`;
    }

    const activePlan = createActivePlanFromBlueprint(blueprint, {
      name: finalName,
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
        theme: { color: "#4FD1C5", icon: "💪", code: "PLN" },
        createdAt: new Date().toISOString(),
        stages: (p.stages || []).map((s) => migrateStage(s)),
      }),
    );
    blueprintRepo.replaceAll([...plans, ...newPlans]);
    return { count: newPlans.length, firstPlanId: newPlans[0]?.id };
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
    if (!data.plan || !data.routines) {
      throw new Error("Invalid plan format");
    }

    const plan = { ...data.plan };

    if (data.stages && !plan.stages) {
      plan.stages = data.stages.map((s) => {
        if (s.cycle && !s.schedule) {
          return {
            ...s,
            schedule: s.cycle.map((rid) => ({
              type: rid ? "routine" : "rest",
              routineId: rid || null,
            })),
          };
        }
        return s;
      });
    }

    const mappedRoutines = data.routines.map((r) => {
      const routine = { ...r };
      const rawEx = r.entries ?? r.exercises;
      if (rawEx) {
        routine.entries = rawEx.map((ex, idx) => {
          if (ex.name && !ex.exerciseId) {
            return {
              id: createId("ex_inst"),
              exerciseId: ex.name.toLowerCase().replace(/\s+/g, "-"),
              order: idx + 1,
              sets: ex.sets || ex.targetSets || 3,
              reps: typeof ex.reps === "string" ? parseInt(ex.reps, 10) || 10 : ex.reps || ex.targetReps || 10,
              durationSeconds: ex.durationSeconds ?? ex.targetDurationSec ?? null,
              weight: ex.weight ?? ex.targetWeightKg ?? null,
              resistance: ex.resistance ?? null,
              restSeconds: ex.restSeconds ?? ex.restSec ?? 60,
              notes: ex.notes ?? "",
            };
          }
          return ex;
        });
      }
      delete routine.exercises;
      return migrateRoutine(routine, exerciseCatalog);
    });

    routineService.importPrepared(mappedRoutines);

    const plans = getAllBlueprints();
    const migratedPlan = migrateBlueprint(plan);
    const existingIndex = plans.findIndex((p) => p.id === plan.id);

    if (existingIndex !== -1) {
      plans[existingIndex] = migratedPlan;
    } else {
      plans.push(migratedPlan);
    }

    blueprintRepo.replaceAll(plans);

    return migratedPlan.id;
  }

  function exportFullPlan(planId, routineService) {
    const plan = getBlueprint(planId);
    if (!plan) throw new Error("Plan not found");

    const routineIds = new Set();
    plan.stages.forEach((stage) => {
      stage.schedule.forEach((day) => {
        if (day.routineId) routineIds.add(day.routineId);
      });
    });

    const allRoutines = routineService.getAll();
    const referencedRoutines = allRoutines.filter((r) => routineIds.has(r.id));

    return JSON.stringify(
      {
        plan,
        routines: referencedRoutines,
        stages: plan.stages,
      },
      null,
      2,
    );
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
    exportFullPlan,
  };
}
