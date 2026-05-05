export function evaluateStageProgress(stage, workouts, routines) {
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
    
    // Workouts store the routine name, not ID
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
