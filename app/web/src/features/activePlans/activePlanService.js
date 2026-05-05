import { createId } from "../../core/uid.js";

export function createActivePlanService(repository) {
  function getAll() {
    return repository.list();
  }

  function getActivePlan(id) {
    return getAll().find((p) => p.id === id);
  }

  function activatePlan(planTemplate) {
    // Deep clone the template so it's a snapshot
    const activePlan = JSON.parse(JSON.stringify(planTemplate));
    activePlan.id = createId("activePlan");
    activePlan.templateId = planTemplate.id;
    activePlan.isActive = true; // For dashboard rendering
    activePlan.activatedAt = new Date().toISOString();
    
    // Add it to repository
    repository.replaceAll([...getAll(), activePlan]);
    return activePlan;
  }

  function updateActivePlan(id, patch) {
    const plans = getAll();
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) return null;
    
    plans[index] = { ...plans[index], ...patch, updatedAt: new Date().toISOString() };
    repository.replaceAll(plans);
    return plans[index];
  }

  function deleteActivePlan(id) {
    const plans = getAll();
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const deleted = plans[index];
    plans.splice(index, 1);
    repository.replaceAll(plans);
    return deleted;
  }

  function toggleActivePlan(id) {
    const plans = getAll();
    const updated = plans.map(p => {
      if (p.id === id) {
        return { ...p, isActive: !p.isActive };
      }
      return p;
    });
    repository.replaceAll(updated);
  }

  return { getAll, getActivePlan, activatePlan, updateActivePlan, deleteActivePlan, toggleActivePlan };
}
