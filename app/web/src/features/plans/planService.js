import { createId } from "../../core/uid.js";

export function createPlanService(repository) {
  function getAll() {
    return repository.list();
  }

  function getPlan(id) {
    return getAll().find((p) => p.id === id);
  }

  function createPlan() {
    const plan = {
      id: createId("plan"),
      name: "New Plan",
      description: "",
      currentStageId: null,
      goals: [],
      stages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    repository.replaceAll([...getAll(), plan]);
    return plan;
  }

  function updatePlan(planId, patch) {
    const plans = getAll();
    const index = plans.findIndex((p) => p.id === planId);
    if (index === -1) return null;
    
    plans[index] = { ...plans[index], ...patch, updatedAt: new Date().toISOString() };
    repository.replaceAll(plans);
    return plans[index];
  }

  function deletePlan(planId) {
    const plans = getAll();
    const index = plans.findIndex((p) => p.id === planId);
    if (index === -1) return null;

    const deleted = plans[index];
    plans.splice(index, 1);
    repository.replaceAll(plans);
    return deleted;
  }

  function importPrepared(preparedPlans) {
    const plans = getAll();
    const newPlans = preparedPlans.map(p => ({
       id: createId("plan"),
       name: p.planName || "Imported Plan",
       description: p.description || "",
       goals: p.goals || [],
       stages: p.stages || [],
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString(),
    }));
    repository.replaceAll([...plans, ...newPlans]);
    return { count: newPlans.length, firstPlanId: newPlans[0]?.id };
  }

  function toggleActivePlan(planId) {
    const plans = getAll();
    const updated = plans.map(p => {
      if (p.id === planId) {
        return { ...p, isActive: !p.isActive };
      }
      return p;
    });
    repository.replaceAll(updated);
  }

  return { getAll, getPlan, createPlan, updatePlan, deletePlan, importPrepared, toggleActivePlan };
}
