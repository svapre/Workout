import { getCurrentStageHistoryEntry } from "./stageProgression.js";
import { getExerciseDefaultTrackingType } from "../../data/schemaMigration.js";

function resolveExerciseName(exercises, exerciseId) {
  return exercises.find((exercise) => exercise.id === exerciseId)?.name || "target exercise";
}

function normalizeMilestone(stage) {
  const raw = stage?.milestone || {};
  return {
    description: raw.description || "",
    eligibility: {
      type:
        raw?.eligibility?.type === "sessions" || raw?.eligibility?.type === "none"
          ? raw.eligibility.type
          : "cycles",
      target: raw?.eligibility?.target == null ? null : Number(raw.eligibility.target),
      requiresContinuous: Boolean(raw?.eligibility?.requiresContinuous),
    },
    test: {
      type: raw?.test?.type === "exercise" ? "exercise" : "none",
      source: raw?.test?.source === "stage_entry" ? "stage_entry" : "custom",
      exerciseId: raw?.test?.exerciseId ?? null,
      metric: raw?.test?.metric === "duration" ? "duration" : raw?.test?.metric === "reps" ? "reps" : null,
      target: raw?.test?.target == null ? null : Number(raw.test.target),
      routineId: raw?.test?.routineId ?? null,
      routineEntryId: raw?.test?.routineEntryId ?? null,
      weight: raw?.test?.weight == null ? null : Number(raw.test.weight),
      resistance: raw?.test?.resistance ?? null,
      restSeconds: raw?.test?.restSeconds == null ? null : Number(raw.test.restSeconds),
      notes: raw?.test?.notes ?? "",
    },
    onFailure: {
      action: raw?.onFailure?.action || "none",
      targetStageId: raw?.onFailure?.targetStageId ?? null,
    },
  };
}

function getStageEpisodeStart(activePlan, stage) {
  const openEntry = getCurrentStageHistoryEntry(activePlan, stage?.id);
  return openEntry?.startedAt || activePlan?.startedAt || null;
}

function scopeStageSessions(workouts, activePlan, stage) {
  const planId = activePlan?.id;
  const stageId = stage?.id;
  const episodeStart = getStageEpisodeStart(activePlan, stage);
  const episodeStartMs = episodeStart ? new Date(episodeStart).getTime() : null;

  return (workouts || []).filter((session) => {
    if (!session || session.activePlanId !== planId || session.stageId !== stageId) {
      return false;
    }

    if (episodeStartMs == null) {
      return true;
    }

    const completedAtMs = session.completedAt ? new Date(session.completedAt).getTime() : NaN;
    return Number.isFinite(completedAtMs) ? completedAtMs >= episodeStartMs : true;
  });
}

function findStageRoutineEntry(stage, routines, milestoneTest) {
  if (!stage || !Array.isArray(stage.schedule)) {
    return null;
  }

  const tryMatch = (routineId, predicate) => {
    const routine = routines.find((entry) => entry.id === routineId);
    const matchedEntry = (routine?.entries || []).find(predicate);
    if (!matchedEntry) {
      return null;
    }
    return { routine, entry: matchedEntry };
  };

  if (milestoneTest.routineId && milestoneTest.routineEntryId) {
    const exact = tryMatch(
      milestoneTest.routineId,
      (entry) => entry.id === milestoneTest.routineEntryId,
    );
    if (exact) {
      return exact;
    }
  }

  if (milestoneTest.source === "stage_entry") {
    for (const scheduleEntry of stage.schedule) {
      if (scheduleEntry?.type !== "routine" || !scheduleEntry.routineId) {
        continue;
      }

      const match = tryMatch(
        scheduleEntry.routineId,
        (entry) =>
          (milestoneTest.routineEntryId && entry.id === milestoneTest.routineEntryId) ||
          (milestoneTest.exerciseId && entry.exerciseId === milestoneTest.exerciseId),
      );

      if (match) {
        return match;
      }
    }
  }

  return null;
}

export function resolveMilestoneTest(stage, routines = [], exercises = []) {
  const milestone = normalizeMilestone(stage);
  const rawTest = milestone.test;

  if (rawTest.type !== "exercise") {
    return {
      ...rawTest,
      exerciseName: null,
      metric: null,
      target: null,
      weight: null,
      resistance: null,
      restSeconds: null,
      notes: "",
    };
  }

  const matchedStageEntry = findStageRoutineEntry(stage, routines, rawTest);
  const routineEntry = matchedStageEntry?.entry || null;
  const exerciseId = rawTest.exerciseId ?? routineEntry?.exerciseId ?? null;
  const exercise = exercises.find((entry) => entry.id === exerciseId) || null;
  const inferredMetric =
    rawTest.metric ||
    (routineEntry?.durationSeconds != null
      ? "duration"
      : getExerciseDefaultTrackingType(exercise) === "duration"
        ? "duration"
        : "reps");
  const target =
    rawTest.target ??
    (inferredMetric === "duration" ? routineEntry?.durationSeconds : routineEntry?.reps) ??
    1;

  return {
    ...rawTest,
    exerciseId,
    exerciseName: resolveExerciseName(exercises, exerciseId),
    metric: inferredMetric,
    target: Number.isFinite(Number(target)) ? Number(target) : 1,
    routineId: rawTest.routineId ?? matchedStageEntry?.routine?.id ?? null,
    routineEntryId: rawTest.routineEntryId ?? routineEntry?.id ?? null,
    weight:
      rawTest.weight != null
        ? rawTest.weight
        : routineEntry?.weight ?? null,
    resistance:
      rawTest.resistance != null
        ? rawTest.resistance
        : routineEntry?.resistance ?? null,
    restSeconds:
      rawTest.restSeconds != null
        ? rawTest.restSeconds
        : routineEntry?.restSeconds ?? exercise?.restSeconds ?? null,
    notes: rawTest.notes || routineEntry?.notes || "",
  };
}

function evaluateEligibility(stage, workouts, activePlan) {
  const milestone = normalizeMilestone(stage);
  const eligibility = milestone.eligibility;
  const stageSessions = scopeStageSessions(workouts, activePlan, stage);
  const routineSessions = stageSessions.filter((session) => session.sessionType !== "milestone_test");

  if (eligibility.type === "none") {
    return {
      type: "none",
      current: 0,
      target: 0,
      isUnlocked: true,
      requiresContinuous: false,
    };
  }

  if (eligibility.type === "sessions") {
    const target = Math.max(1, Number(eligibility.target ?? 1) || 1);
    const current = routineSessions.length;
    return {
      type: "sessions",
      current,
      target,
      isUnlocked: current >= target,
      requiresContinuous: Boolean(eligibility.requiresContinuous),
    };
  }

  const target = Math.max(1, Number(eligibility.target ?? 1) || 1);
  const current = Math.max(0, Number(activePlan?.currentCycleCount ?? 0));

  return {
    type: "cycles",
    current,
    target,
    isUnlocked: current >= target,
    requiresContinuous: Boolean(eligibility.requiresContinuous),
  };
}

function evaluateTest(stage, workouts, routines, activePlan, exercises) {
  const test = resolveMilestoneTest(stage, routines, exercises);
  if (test.type !== "exercise" || !test.exerciseId) {
    return {
      ...test,
      lastResult: null,
      lastAttempt: null,
      isPassed: false,
      attempts: [],
    };
  }

  const stageSessions = scopeStageSessions(workouts, activePlan, stage);
  const attempts = stageSessions
    .filter((session) => session.sessionType === "milestone_test")
    .filter((session) => session.milestoneTest?.exerciseId === test.exerciseId)
    .filter((session) => !test.metric || session.milestoneTest?.metric === test.metric)
    .sort((left, right) => (right.completedAt || "").localeCompare(left.completedAt || ""));

  const lastAttempt = attempts[0] || null;

  return {
    ...test,
    attempts,
    lastAttempt,
    lastResult: lastAttempt?.milestoneTest?.result ?? null,
    isPassed: attempts.some((session) => session.milestoneTest?.result === "passed"),
  };
}

function formatEligibilityProgress(eligibility) {
  if (eligibility.type === "sessions") {
    return `${eligibility.current} / ${eligibility.target} session${eligibility.target === 1 ? "" : "s"} completed`;
  }

  if (eligibility.type === "cycles") {
    if (eligibility.requiresContinuous) {
      return `${eligibility.current} / ${eligibility.target} consecutive ${eligibility.target === 1 ? "cycle" : "cycles"}`;
    }
    return `${eligibility.current} / ${eligibility.target} ${eligibility.target === 1 ? "cycle" : "cycles"} completed`;
  }

  return "Eligible at any time";
}

function formatTestLabel(test) {
  if (test.type !== "exercise" || !test.exerciseId) {
    return null;
  }

  const metricLabel = test.metric === "duration" ? "seconds" : "reps";
  const loadLabel = test.weight != null
    ? ` @ ${test.weight} kg`
    : test.resistance
      ? ` @ ${test.resistance}`
      : "";
  return `${test.exerciseName} · ${test.target} ${metricLabel}${loadLabel}`;
}

export function evaluateStageProgress(stage, workouts, routines, activePlan, exercises = []) {
  const eligibility = evaluateEligibility(stage, workouts, activePlan);
  const test = evaluateTest(stage, workouts, routines, activePlan, exercises);
  const requiresTest = test.type === "exercise";
  const isReadyForTest = eligibility.isUnlocked && requiresTest && !test.isPassed;
  const isComplete = eligibility.isUnlocked && (!requiresTest || test.isPassed);
  const remaining =
    eligibility.type === "none"
      ? 0
      : Math.max(0, Number(eligibility.target ?? 0) - Number(eligibility.current ?? 0));

  let summaryText = eligibility.type === "none" ? "Milestone test can be attempted any time." : formatEligibilityProgress(eligibility);
  let progressText = summaryText;
  let progressType = eligibility.type;
  let current = eligibility.current;
  let target = eligibility.target;
  let status = "in_progress";

  if (requiresTest) {
    summaryText = formatTestLabel(test) || "Milestone test";

    if (!eligibility.isUnlocked) {
      progressText = `Unlock requirement: ${formatEligibilityProgress(eligibility)}`;
      status = "locked";
    } else if (test.isPassed) {
      progressText = `Milestone test passed${test.lastAttempt?.completedAt ? ` on ${String(test.lastAttempt.completedAt).slice(0, 10)}` : ""}`;
      progressType = "test";
      current = test.target ?? 1;
      target = test.target ?? 1;
      status = "complete";
    } else if (test.lastResult === "failed") {
      progressText = "Milestone test unlocked · last attempt failed";
      progressType = "test";
      current = 0;
      target = test.target ?? 1;
      status = "ready_for_test";
    } else {
      progressText = "Milestone test unlocked · ready when you are";
      progressType = "test";
      current = 0;
      target = test.target ?? 1;
      status = "ready_for_test";
    }
  } else if (isComplete) {
    progressText = eligibility.type === "none" ? "Stage milestone complete" : formatEligibilityProgress(eligibility);
    status = "complete";
  }

  return {
    milestone: normalizeMilestone(stage),
    eligibility,
    test,
    requiresTest,
    isReadyForTest,
    isComplete,
    remaining,
    current,
    target,
    type: progressType,
    status,
    summaryText,
    progressText,
    displayStr: progressText,
  };
}
