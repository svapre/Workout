export function evaluateStageProgress(stage, workouts, routines, activePlan) {
  const defaultResult = { isUnlocked: true, current: 1, target: 1, type: 'MANUAL', displayStr: '' };
  
  if (!stage.rule || !stage.rule.type || stage.rule.type === 'MANUAL') {
    return defaultResult;
  }

  const { type, targetValue } = stage.rule;
  const target = parseInt(targetValue, 10) || 1;

  if (type === 'ROUTINE_COUNT') {
    const routineId = stage.rule.routineId;
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return { ...defaultResult, isUnlocked: false, displayStr: `🔒 Invalid Routine` };
    
    const completedWorkouts = workouts.filter(w => w.routineName === routine.name);
    const count = completedWorkouts.length;
    const isUnlocked = count >= target;
    
    return {
      isUnlocked,
      current: count,
      target,
      type,
      displayStr: isUnlocked ? `✅ ${count} / ${target} Workouts` : `🔒 ${count} / ${target} Workouts`
    };
  }

  if (type === 'ROUTINE_STREAK') {
    const routineId = stage.rule.routineId;
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return { ...defaultResult, isUnlocked: false, displayStr: `🔒 Invalid Routine` };

    const routineWorkouts = workouts
      .filter(w => w.routineName === routine.name)
      .map(w => new Date(w.date).setHours(0, 0, 0, 0))
      .sort((a, b) => b - a); // Descending (newest first)

    if (routineWorkouts.length === 0) {
      return { isUnlocked: false, current: 0, target, type, displayStr: `🔒 0 / ${target} Day Streak` };
    }

    // Unique dates only
    const uniqueDates = [...new Set(routineWorkouts)];
    let streak = 1;
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (let i = 0; i < uniqueDates.length - 1; i++) {
      if (uniqueDates[i] - uniqueDates[i+1] === oneDayMs) {
        streak++;
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
      displayStr: isUnlocked ? `✅ ${streak} Day Streak!` : `🔒 ${streak} / ${target} Day Streak`
    };
  }

  if (type === 'TOTAL_DURATION') {
    if (!activePlan || !activePlan.activatedAt) {
      return { ...defaultResult, isUnlocked: false, displayStr: `🔒 Not Activated` };
    }

    const start = new Date(activePlan.activatedAt).setHours(0, 0, 0, 0);
    const now = new Date().setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now - start) / (24 * 60 * 60 * 1000)) + 1;
    
    const isUnlocked = diffDays >= target;
    return {
      isUnlocked,
      current: diffDays,
      target,
      type,
      displayStr: isUnlocked ? `✅ Day ${diffDays} achieved` : `🔒 ${diffDays} / ${target} Days`
    };
  }

  if (type === 'ROUTINE_DIFFICULTY') {
    const routineId = stage.rule.routineId;
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return { ...defaultResult, isUnlocked: false, displayStr: `🔒 Invalid Routine` };

    const score = routine.difficultyScore || 1;
    const isUnlocked = score >= target;
    
    return {
      isUnlocked,
      current: score,
      target,
      type,
      displayStr: isUnlocked ? `✅ Difficulty ${score} / ${target}` : `🔒 Difficulty ${score} / ${target}`
    };
  }

  if (type === 'EXERCISE_METRIC') {
    const exerciseName = stage.rule.exerciseName || '';
    const metric = stage.rule.metric || 'REPS'; // 'REPS' or 'WEIGHT'
    
    let maxAchieved = 0;
    for (const w of workouts) {
      for (const set of w.sets) {
        if (set.exerciseName.toLowerCase() === exerciseName.toLowerCase()) {
          const val = metric === 'WEIGHT' ? (set.actualWeightKg || 0) : (set.actualReps || 0);
          if (val > maxAchieved) {
            maxAchieved = val;
          }
        }
      }
    }
    
    const isUnlocked = maxAchieved >= target;
    const unit = metric === 'WEIGHT' ? 'kg' : 'reps';
    
    return {
      isUnlocked,
      current: maxAchieved,
      target,
      type,
      displayStr: isUnlocked ? `✅ Max: ${maxAchieved} / ${target} ${unit}` : `🔒 Max: ${maxAchieved} / ${target} ${unit}`
    };
  }

  return defaultResult;
}
