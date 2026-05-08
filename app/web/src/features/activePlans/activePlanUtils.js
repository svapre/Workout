/**
 * Active Plan Utilities
 */

export function getNextRoutine(plan, routines) {
  if (!plan || !routines) return null;

  const stageIndex = plan.currentStageIndex ?? 0;
  const stage = plan.stages?.[stageIndex];
  if (!stage) return null;

  const dayInCycle = plan.currentDayInCycle ?? 1;
  const schedule = stage.schedule || [];
  const scheduleEntry = schedule[dayInCycle - 1];
  if (!scheduleEntry || scheduleEntry.type !== "routine" || !scheduleEntry.routineId) {
    return null;
  }

  return routines.find((r) => r.id === scheduleEntry.routineId) || null;
}

export function generateUniquePlanName(baseName, existingActivePlans) {
  let finalName = baseName;
  let suffix = 1;
  const existingNames = new Set(existingActivePlans.map((p) => p.displayName || p.name));

  while (existingNames.has(finalName)) {
    suffix += 1;
    finalName = `${baseName} (${suffix})`;
  }
  return finalName;
}

export function isRestDay(plan) {
  if (!plan) return false;
  const stageIndex = plan.currentStageIndex ?? 0;
  const stage = plan.stages?.[stageIndex];
  if (!stage) return false;

  const dayInCycle = plan.currentDayInCycle ?? 1;
  const schedule = stage.schedule || [];
  const scheduleEntry = schedule[dayInCycle - 1];
  
  if (!scheduleEntry) return false;

  return scheduleEntry.type === "rest";
}
