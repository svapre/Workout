export function evaluateStageProgress(stage, workouts, routines, activePlan) {
  const defaultResult = {
    isUnlocked: true,
    current: 1,
    target: 1,
    type: "cycles",
    displayStr: "",
  };

  const scopedWorkouts = activePlan?.id
    ? workouts.filter((w) => !w.activePlanId || w.activePlanId === activePlan.id)
    : workouts;

  const milestone = stage.milestone || stage.rule || { type: "cycles" };
  const type = milestone.type || "cycles";

  if (type === "cycles" && (milestone.target === 0 || milestone.target == null)) {
    return defaultResult;
  }

  if (type === "cycles" && milestone.requiresContinuous) {
    const start = activePlan?.startedAt
      ? new Date(activePlan.startedAt).setHours(0, 0, 0, 0)
      : null;
    if (!start) return { ...defaultResult, isUnlocked: false, displayStr: "🔒 Not Started" };

    const workoutDays = [
      ...new Set(
        scopedWorkouts.map((w) =>
          new Date(w.startedAt || w.workoutDate || w.completedAt).setHours(0, 0, 0, 0),
        ),
      ),
    ].sort((a, b) => b - a);

    const target = parseInt(milestone.target, 10) || 1;

    if (workoutDays.length === 0) {
      return { isUnlocked: false, current: 0, target, type, displayStr: `🔒 0 / ${target} Days` };
    }

    let streak = 1;
    const oneDayMs = 24 * 60 * 60 * 1000;
    for (let i = 0; i < workoutDays.length - 1; i += 1) {
      if (workoutDays[i] - workoutDays[i + 1] === oneDayMs) {
        streak += 1;
      } else {
        break;
      }
    }

    const isUnlocked = streak >= target;
    return {
      isUnlocked,
      current: streak,
      target,
      type,
      displayStr: isUnlocked
        ? `✅ ${streak} / ${target} Day Streak!`
        : `🔒 ${streak} / ${target} Day Streak`,
    };
  }

  if (type === "cycles" && !milestone.requiresContinuous) {
    const target = parseInt(milestone.target, 10) || 1;
    const current = activePlan?.currentCycleCount ?? 0;
    const isUnlocked = current >= target;
    return {
      isUnlocked,
      current,
      target,
      type,
      displayStr: isUnlocked
        ? `✅ ${current} / ${target} Cycles`
        : `🔒 ${current} / ${target} Cycles`,
    };
  }

  if (type === "exercise_target") {
    const targetExerciseId = milestone.exerciseId;
    if (!targetExerciseId) {
      return { ...defaultResult, isUnlocked: false, displayStr: "🔒 No Target Exercise" };
    }

    const target = parseInt(milestone.target, 10) || 1;
    let maxAchieved = 0;
    for (const w of scopedWorkouts) {
      if (!w.sets) continue;
      for (const set of w.sets) {
        if (set.exerciseId === targetExerciseId) {
          const val = set.actualReps || 0;
          if (val > maxAchieved) maxAchieved = val;
        }
      }
    }

    const isUnlocked = maxAchieved >= target;
    return {
      isUnlocked,
      current: maxAchieved,
      target,
      type,
      displayStr: isUnlocked
        ? `✅ Target: ${maxAchieved} / ${target}`
        : `🔒 Target: ${maxAchieved} / ${target}`,
    };
  }

  if (type === "sessions") {
    const target = parseInt(milestone.target, 10) || 1;
    const count = scopedWorkouts.filter((w) => w.activePlanId === activePlan?.id).length;
    const isUnlocked = count >= target;
    return {
      isUnlocked,
      current: count,
      target,
      type,
      displayStr: isUnlocked
        ? `✅ ${count} / ${target} Sessions`
        : `🔒 ${count} / ${target} Sessions`,
    };
  }

  if (type === "ROUTINE_COUNT") {
    const routineId = milestone.routineId;
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return { ...defaultResult, isUnlocked: false, displayStr: "🔒 Invalid Routine" };

    const target = parseInt(milestone.target ?? milestone.targetValue, 10) || 1;
    const completedWorkouts = scopedWorkouts.filter((w) => w.routineId === routineId);
    const count = completedWorkouts.length;
    const isUnlocked = count >= target;

    return {
      isUnlocked,
      current: count,
      target,
      type,
      displayStr: isUnlocked
        ? `✅ ${count} / ${target} Workouts`
        : `🔒 ${count} / ${target} Workouts`,
    };
  }

  return defaultResult;
}
