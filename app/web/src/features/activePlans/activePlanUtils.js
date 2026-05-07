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
