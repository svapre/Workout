import { createActivePlanFromBlueprint } from "../../data/schemaMigration.js";
import { generateUniquePlanName } from "./activePlanUtils.js";

export function createActivePlanService(repository) {
  function getAll() {
    return repository.list();
  }

  function getActivePlan(id) {
    return getAll().find((p) => p.id === id);
  }

  function activatePlan(planTemplate) {
    const current = getAll();
    const finalName = generateUniquePlanName(planTemplate.name, current);

    const activePlan = createActivePlanFromBlueprint(planTemplate, {
      displayName: finalName,
      blueprintId: planTemplate.id,
    });
    repository.replaceAll([...current, activePlan]);
    return activePlan;
  }

  function updateActivePlan(id, patch) {
    const plans = getAll();
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) return null;

    plans[index] = { ...plans[index], ...patch };
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
    void id;
  }

  return { getAll, getActivePlan, activatePlan, updateActivePlan, deleteActivePlan, toggleActivePlan };
}
