function cloneStageHistory(plan, stage, fallbackStartedAt) {
  const existingHistory = Array.isArray(plan?.stageHistory)
    ? plan.stageHistory.map((entry) => ({ ...entry }))
    : [];

  if (existingHistory.length) {
    return existingHistory;
  }

  if (!stage?.id) {
    return [];
  }

  return [
    {
      stageId: stage.id,
      stageName: stage.name || "Unnamed Stage",
      startedAt: fallbackStartedAt,
      completedAt: null,
      completedVia: null,
      failureCount: 0,
    },
  ];
}

function findOpenStageHistoryIndex(history, stageId) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (entry.stageId === stageId && entry.completedAt == null) {
      return index;
    }
  }
  return -1;
}

export function createStageHistoryEntry(stage, startedAt) {
  if (!stage?.id) {
    return null;
  }

  return {
    stageId: stage.id,
    stageName: stage.name || "Unnamed Stage",
    startedAt,
    completedAt: null,
    completedVia: null,
    failureCount: 0,
  };
}

export function getCurrentStage(plan) {
  return plan?.stages?.[plan?.currentStageIndex ?? 0] ?? null;
}

export function getCurrentStageHistoryEntry(plan, stageId = getCurrentStage(plan)?.id) {
  if (!stageId) {
    return null;
  }

  const history = Array.isArray(plan?.stageHistory) ? plan.stageHistory : [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (entry.stageId === stageId && entry.completedAt == null) {
      return entry;
    }
  }

  return null;
}

export function buildScheduleCompletionState(plan, stage = getCurrentStage(plan)) {
  const scheduleLength = Math.max(1, Number(stage?.schedule?.length || 1));
  const prevDay = Math.max(1, Number(plan?.currentDayInCycle ?? 1));
  const nextDay = (prevDay % scheduleLength) + 1;
  const cycleCompleted = prevDay === scheduleLength;
  const currentCycleCount = Math.max(0, Number(plan?.currentCycleCount ?? 0));

  return {
    scheduleLength,
    prevDay,
    nextDay,
    cycleCompleted,
    currentCycleCount,
    nextCycleCount: cycleCompleted ? currentCycleCount + 1 : currentCycleCount,
  };
}

export function buildStageHistoryOnAdvance(plan, stage, nextStage, completedAt) {
  const history = cloneStageHistory(plan, stage, plan?.startedAt || completedAt);
  let currentIndex = findOpenStageHistoryIndex(history, stage?.id);

  if (currentIndex === -1) {
    const seeded = createStageHistoryEntry(stage, plan?.startedAt || completedAt);
    if (seeded) {
      history.push(seeded);
      currentIndex = history.length - 1;
    }
  }

  if (currentIndex !== -1) {
    history[currentIndex] = {
      ...history[currentIndex],
      stageId: stage?.id ?? history[currentIndex].stageId,
      stageName: stage?.name ?? history[currentIndex].stageName,
      completedAt,
      completedVia: "milestone",
    };
  }

  const nextEntry = createStageHistoryEntry(nextStage, completedAt);
  if (nextEntry) {
    history.push(nextEntry);
  }

  return history;
}

export function buildStageHistoryOnFailure(plan, stage, targetStage, completedAt, action) {
  const history = cloneStageHistory(plan, stage, plan?.startedAt || completedAt);
  let currentIndex = findOpenStageHistoryIndex(history, stage?.id);

  if (currentIndex === -1) {
    const seeded = createStageHistoryEntry(stage, plan?.startedAt || completedAt);
    if (seeded) {
      history.push(seeded);
      currentIndex = history.length - 1;
    }
  }

  if (currentIndex === -1) {
    return history;
  }

  const currentEntry = history[currentIndex];
  const startsFreshEpisode = action === "restart_stage" || action === "goto_stage";
  history[currentIndex] = {
    ...currentEntry,
    failureCount: Number(currentEntry.failureCount ?? 0) + 1,
    completedAt: startsFreshEpisode ? completedAt : currentEntry.completedAt ?? null,
    completedVia: currentEntry.completedVia ?? null,
  };

  if (action === "restart_stage") {
    const restartedEntry = createStageHistoryEntry(stage, completedAt);
    if (restartedEntry) {
      history.push(restartedEntry);
    }
  } else if (action === "goto_stage") {
    const nextEntry = createStageHistoryEntry(targetStage, completedAt);
    if (nextEntry) {
      history.push(nextEntry);
    }
  }

  return history;
}

export function buildAdvanceStagePatch(plan, completedAt = new Date().toISOString()) {
  const stage = getCurrentStage(plan);
  const currentStageIndex = Math.max(0, Number(plan?.currentStageIndex ?? 0));
  const nextStageIndex = currentStageIndex + 1;
  const nextStage = plan?.stages?.[nextStageIndex] ?? null;

  if (!stage || !nextStage) {
    return null;
  }

  return {
    currentStageIndex: nextStageIndex,
    currentDayInCycle: 1,
    currentCycleCount: 0,
    stageHistory: buildStageHistoryOnAdvance(plan, stage, nextStage, completedAt),
  };
}

export function buildRestDayCompletionPatch(plan) {
  const stage = getCurrentStage(plan);
  const completion = buildScheduleCompletionState(plan, stage);

  return {
    currentDayInCycle: completion.nextDay,
    currentCycleCount: completion.nextCycleCount,
  };
}

export function buildFailureTransitionPatch(plan, action, targetStageId, completedAt = new Date().toISOString()) {
  const currentStageIndex = Math.max(0, Number(plan?.currentStageIndex ?? 0));
  const stage = plan?.stages?.[currentStageIndex] ?? null;
  if (!stage) {
    return {};
  }

  if (action === "restart_stage") {
    return {
      currentDayInCycle: 1,
      currentCycleCount: 0,
      stageHistory: buildStageHistoryOnFailure(plan, stage, null, completedAt, action),
    };
  }

  if (action === "goto_stage") {
    const targetIndex = plan?.stages?.findIndex((entry) => entry.id === targetStageId) ?? -1;
    const targetStage = targetIndex >= 0 ? plan.stages[targetIndex] : null;
    if (!targetStage) {
      return {
        stageHistory: buildStageHistoryOnFailure(plan, stage, null, completedAt, "none"),
      };
    }

    return {
      currentStageIndex: targetIndex,
      currentDayInCycle: 1,
      currentCycleCount: 0,
      stageHistory: buildStageHistoryOnFailure(plan, stage, targetStage, completedAt, action),
    };
  }

  return {
    stageHistory: buildStageHistoryOnFailure(plan, stage, null, completedAt, "none"),
  };
}
