import { getNarrative, getRecoveryInsight, getMomentumMessage } from "./narrativeService.js";
import { evaluateStageProgress } from "../plans/progressionEngine.js";

function parseDate(value) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function daysBetween(dateA, dateB) {
  const a = parseDate(dateA);
  const b = parseDate(dateB);
  if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    return null;
  }
  const delta = Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
  return delta;
}

function getRecentSessions(workouts, planId) {
  return (workouts || [])
    .filter((session) => session?.activePlanId === planId && session?.completedAt)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
}

function formatRecentAchievement(recentSessions, daysSinceLastSession) {
  if (!recentSessions.length) {
    return null;
  }

  if (daysSinceLastSession === 0) {
    return "You completed today's planned session.";
  }

  if (daysSinceLastSession === 1) {
    return "Yesterday you completed a planned session.";
  }

  if (recentSessions.length >= 3) {
    return `You've maintained a steady rhythm across ${recentSessions.length} sessions.`;
  }

  if (recentSessions.length === 2) {
    return `You've established a strong rhythm with two recent sessions.`;
  }

  return null;
}

export function buildJourneyContext({ plan, workouts, routines = [], exercises = [], currentDate = new Date() }) {
  const recentSessions = getRecentSessions(workouts, plan.id);
  const lastSession = recentSessions[0] || null;
  const daysSinceLastSession = lastSession ? daysBetween(currentDate, lastSession.completedAt) : null;
  const stageIndex = plan.currentStageIndex ?? 0;
  const stage = plan.stages?.[stageIndex] || {};
  const stageProgress = evaluateStageProgress(stage, workouts, routines, plan, exercises);
  const schedule = stage.schedule || [];
  const dayInCycle = Number(plan.currentDayInCycle ?? 1);
  const currentSchedule = schedule[dayInCycle - 1] || {};
  const isRestDay = currentSchedule.type === "rest";
  const hasRecentMomentum = (plan.streakDays ?? 0) >= 3 || (recentSessions.length >= 2 && daysSinceLastSession !== null && daysSinceLastSession <= 1);
  const justRestartedStage = recentSessions.length > 0 && recentSessions[0].stageId !== stage.id && daysSinceLastSession !== null && daysSinceLastSession <= 5;
  const isFreshStart = recentSessions.length === 0 && stageIndex === 0;
  const isRebuilding = !isFreshStart && stageIndex > 0 && daysSinceLastSession !== null && daysSinceLastSession > 3;
  const isMilestoneNear = !isRestDay && !stageProgress.isComplete && stageProgress.remaining === 1;
  const isTestUnlocked = stageProgress.isReadyForTest;
  const isBreakthrough = stageProgress.isComplete;

  let emotionalState = "momentum";
  if (isBreakthrough) {
    emotionalState = "breakthrough";
  } else if (isRebuilding) {
    emotionalState = "rebuilding";
  } else if (isFreshStart) {
    emotionalState = "fresh_start";
  } else if (isTestUnlocked) {
    emotionalState = "milestone_near";
  } else if (isMilestoneNear) {
    emotionalState = "milestone_near";
  } else if (isRestDay || daysSinceLastSession === 1) {
    emotionalState = "recovery";
  } else if (hasRecentMomentum) {
    emotionalState = "momentum";
  }

  const recentDiffs = recentSessions.slice(0, 3).map((session) => session.reflectionRating).filter(Boolean);
  const isFeelingStrong = recentDiffs.length >= 2 && recentDiffs.every(d => d === 'strong');
  const isFeelingDifficult = recentDiffs.length >= 2 && recentDiffs.every(d => d === 'difficult');
  const lastDiff = lastSession?.reflectionRating;

  const narrativeContext = {
    planId: plan.id,
    sessionCount: recentSessions.length,
    lastDiff,
    isFeelingStrong,
    isFeelingDifficult,
    stageIndex,
    stageCount: plan.stages?.length || 1,
    daysSinceLastSession,
  };

  const recentAchievement = formatRecentAchievement(recentSessions, daysSinceLastSession);
  const currentFocus = stageProgress.isReadyForTest
    ? `Milestone test unlocked: ${stageProgress.summaryText}`
    : stage.milestone?.description
      ? stage.milestone.description
      : stage.name
        ? `Continue through ${stage.name}.`
        : "Complete today's scheduled session.";

  const nextMeaningfulEvent = isRestDay
    ? getNarrative('recovery', narrativeContext)
    : isTestUnlocked
      ? `Milestone test ready: ${stageProgress.summaryText}`
      : isMilestoneNear
        ? getNarrative('milestone_progression', narrativeContext)
        : daysSinceLastSession >= 2
          ? getNarrative('return_after_gap', narrativeContext)
          : getNarrative('momentum', narrativeContext);

  const recoveryInsight = isRestDay
    ? getRecoveryInsight(narrativeContext)
    : daysSinceLastSession === 1
      ? "Intentional recovery is keeping your progress steady."
      : null;

  const momentumMessage = emotionalState === "momentum"
    ? getMomentumMessage(narrativeContext)
    : null;

  return {
    emotionalState,
    recentAchievement,
    currentFocus,
    nextMeaningfulEvent,
    recoveryInsight,
    momentumMessage,
  };
}
