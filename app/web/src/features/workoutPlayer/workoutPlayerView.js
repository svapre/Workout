import { confirmAction } from "../../ui/modal.js";
import { isRestDay } from "../activePlans/activePlanUtils.js";
import { getNarrative } from "../activePlans/narrativeService.js";
import { evaluateStageProgress } from "../plans/progressionEngine.js";
import {
  buildAdvanceStagePatch,
  buildFailureTransitionPatch,
  buildScheduleCompletionState,
} from "../plans/stageProgression.js";
import {
  getExerciseExecutionUnitType,
  getRoutineBlockMetricType,
  getRoutineBlockTempoPresentation,
  getRoutineEntryBlocks,
} from "../../data/schemaMigration.js";
import {
  buildEntryWorkDisplayMap,
  formatEffortLabel,
  formatRepGoalLabel,
  usesOpenEndedRepGoal,
} from "../routines/executionFlow.js";

let currentSession = null;
let restTimerInterval = null;
let sessionTimerInterval = null;
let activeWorkInterval = null;

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDurationToken(totalSeconds) {
  const numeric = Number(totalSeconds);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }
  if (numeric % 60 === 0) {
    return `${numeric / 60} min`;
  }
  if (numeric >= 60) {
    const mins = Math.floor(numeric / 60);
    const secs = numeric % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  }
  return `${numeric}s`;
}

function formatBlockSideLabel(side) {
  const normalized = String(side ?? "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "left") return "Left side";
  if (normalized === "right") return "Right side";
  if (normalized === "both") return "Both sides";
  if (normalized === "alternating") return "Alternating";
  return normalized;
}

function getEffectiveRestKind(set) {
  if (currentSession?.restPhase === "followup" && set?.followupRestKind) {
    return set.followupRestKind;
  }
  return set?.restKind || "set";
}

function resolveRestPreview(currentSet, nextSet, state) {
  const nextSetName = nextSet ? getExerciseDisplayName(state, nextSet.exerciseId) : "";
  const nextSetTitle = nextSet ? getSetDisplayTitle(nextSet) : "";
  const nextSetProgress = nextSet ? getSetProgressLabel(nextSet) : "";
  const effectiveRestKind = getEffectiveRestKind(currentSet);
  const isFollowupTransition = currentSession?.restPhase === "followup";

  if (effectiveRestKind === "transition") {
    return {
      heading: "Next Activity",
      title: nextSetName || "Workout Complete",
      subtitle: nextSetTitle,
      progress: nextSetProgress,
      cue: isFollowupTransition
        ? String(currentSet?.followupTransitionLabel || "").trim()
        : String(currentSet?.transitionLabel || "").trim(),
    };
  }

  if (currentSet?.followupRestKind === "transition") {
    const transitionDuration = Number.isFinite(Number(currentSet?.followupRestSec))
      && Number(currentSet.followupRestSec) > 0
      ? formatDurationToken(currentSet.followupRestSec)
      : "";
    return {
      heading: "Next Up",
      title: "Transition",
      subtitle: [transitionDuration ? `${transitionDuration} to` : "Moving to", nextSetName].filter(Boolean).join(" "),
      progress: [nextSetTitle, nextSetProgress].filter(Boolean).join(" · "),
      cue: String(currentSet?.followupTransitionLabel || "").trim(),
    };
  }

  return {
    heading: "Next Up",
    title: nextSetName || "Workout Complete",
    subtitle: nextSetTitle,
    progress: nextSetProgress,
    cue: String(currentSet?.transitionLabel || "").trim(),
  };
}

function getTempoPhaseSymbol(kind) {
  if (kind === "down") return "↓";
  if (kind === "up") return "↑";
  if (kind === "cadence") return "•";
  if (kind === "bottom_hold") return "B";
  if (kind === "top_hold") return "T";
  return "~";
}

function resolveBlockTrackingType(block, entry, exercise) {
  const metricType = getRoutineBlockMetricType(
    block,
    entry?.trackingType ?? exercise?.trackingType ?? "reps",
  );

  if (metricType === "duration") {
    return "duration";
  }
  if (block?.weight != null || entry?.weight != null || entry?.targetWeightKg != null) {
    return "weight";
  }
  if (
    (block?.resistance != null && block?.resistance !== "")
    || (entry?.resistance != null && entry?.resistance !== "")
  ) {
    return "resistance";
  }
  return "reps";
}

function resolveSetFacts(set) {
  const tempoPresentation = getRoutineBlockTempoPresentation(set);
  const repGoalLabel = formatRepGoalLabel({
    metricType: "reps",
    targetReps: set?.targetReps,
    repTargetMode: set?.repTargetMode,
    effort: set?.effort,
  });
  return {
    tempoPresentation,
    facts: [
    usesOpenEndedRepGoal({
      metricType: "reps",
      targetReps: set?.targetReps,
      repTargetMode: set?.repTargetMode,
      effort: set?.effort,
    })
      ? { label: "Goal", value: repGoalLabel }
      : null,
    set?.side
      ? { label: "Side", value: formatBlockSideLabel(set.side) }
      : null,
    set?.holdSeconds
      ? { label: "Hold", value: `${formatDurationToken(set.holdSeconds)} per rep` }
      : null,
    set?.effort && String(set.effort).trim().toLowerCase() !== "amrap"
      ? { label: "Effort", value: formatEffortLabel(set.effort) }
      : null,
    set?.targetResistance
      ? { label: "Resistance", value: set.targetResistance }
      : null,
    ].filter(Boolean),
  };
}

function resolveRepsInputConfig(set) {
  const openEnded = usesOpenEndedRepGoal({
    metricType: "reps",
    targetReps: set?.targetReps,
    repTargetMode: set?.repTargetMode,
    effort: set?.effort,
  });

  return {
    label: openEnded ? "Actual reps" : "Reps",
    value: openEnded ? "" : (set?.targetReps ?? 0),
    placeholder: "",
  };
}

function renderSetFacts(set, { compact = false, collapseTempo = false } = {}) {
  const { facts, tempoPresentation } = resolveSetFacts(set);
  if (!facts.length && !(tempoPresentation?.steps?.length)) {
    return "";
  }

  const chipStyle = compact
    ? "display:inline-flex; flex-direction:column; align-items:flex-start; gap:2px; min-width:88px; padding:8px 10px; border-radius:12px; border:1px solid rgba(143,168,210,0.18); background:rgba(255,255,255,0.05);"
    : "display:inline-flex; flex-direction:column; align-items:flex-start; gap:3px; min-width:112px; padding:10px 12px; border-radius:14px; border:1px solid rgba(143,168,210,0.18); background:rgba(255,255,255,0.05);";
  const shouldCollapseTempo = collapseTempo && (tempoPresentation?.steps?.length || 0) > 1;
  const tempoStrip = tempoPresentation?.steps?.length
    ? shouldCollapseTempo
      ? `
        <details style="margin:${facts.length ? "0 0 14px" : "0 0 18px"}; text-align:left; border-radius:16px; border:1px solid rgba(143,168,210,0.14); background:rgba(255,255,255,0.03); padding:10px 12px;">
          <summary style="cursor:pointer; list-style:none; display:flex; align-items:center; justify-content:space-between; gap:10px; color:var(--soft); font-weight:800; font-size:0.94rem;">
            <span style="display:inline-flex; align-items:center; gap:8px;">
              <span aria-hidden="true" style="display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:999px; background:rgba(79,209,197,0.14); color:var(--brand); font-size:0.72rem; font-weight:900;">↕</span>
              <span>Tempo guide</span>
            </span>
            <span style="font-size:0.78rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em;">${escapeHtml(tempoPresentation.summary || `${tempoPresentation.steps.length} phases`)}</span>
          </summary>
          <div aria-label="${escapeHtml(tempoPresentation.summary || "Tempo")}" style="display:grid; gap:8px; margin-top:12px;">
            ${tempoPresentation.steps.map((step) => `
              <span style="display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:8px; min-width:0; padding:8px 10px; border-radius:12px; border:1px solid rgba(143,168,210,0.12); background:rgba(255,255,255,0.03);">
                <span aria-hidden="true" style="display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:999px; background:${step.kind === "bottom_hold" || step.kind === "top_hold" ? "rgba(248,195,106,0.14)" : "rgba(79,209,197,0.14)"}; color:${step.kind === "bottom_hold" || step.kind === "top_hold" ? "var(--brand-2)" : "var(--brand)"}; font-size:0.72rem; font-weight:900; line-height:1;">${escapeHtml(getTempoPhaseSymbol(step.kind))}</span>
                <span style="font-size:0.82rem; color:var(--soft); font-weight:700; min-width:0;">${escapeHtml(step.label || "Tempo")}</span>
                <span style="font-size:0.84rem; color:var(--text); font-weight:800;">${escapeHtml(step.value || "")}</span>
              </span>
            `).join("")}
          </div>
        </details>
      `
      : `
        <div aria-label="${escapeHtml(tempoPresentation.summary || "Tempo")}" style="display:flex; flex-wrap:wrap; gap:${compact ? "8px" : "10px"}; justify-content:center; margin:${facts.length ? "0 0 18px" : "0 0 20px"};">
          ${tempoPresentation.steps.map((step) => `
            <span style="display:inline-flex; align-items:center; gap:${compact ? "6px" : "8px"}; min-width:0; padding:${compact ? "7px 10px" : "9px 12px"}; border-radius:999px; border:1px solid rgba(143,168,210,0.16); background:rgba(255,255,255,0.04);">
              <span aria-hidden="true" style="display:inline-flex; align-items:center; justify-content:center; width:${compact ? "18px" : "20px"}; height:${compact ? "18px" : "20px"}; border-radius:999px; background:${step.kind === "bottom_hold" || step.kind === "top_hold" ? "rgba(248,195,106,0.14)" : "rgba(79,209,197,0.14)"}; color:${step.kind === "bottom_hold" || step.kind === "top_hold" ? "var(--brand-2)" : "var(--brand)"}; font-size:${compact ? "0.72rem" : "0.78rem"}; font-weight:900; line-height:1;">${escapeHtml(getTempoPhaseSymbol(step.kind))}</span>
              <span style="display:inline-flex; flex-wrap:wrap; gap:4px; align-items:baseline; min-width:0;">
                <span style="font-size:${compact ? "0.66rem" : "0.74rem"}; color:var(--muted); font-weight:800; letter-spacing:0.04em;">${escapeHtml(step.label || "Tempo")}</span>
                <span style="font-size:${compact ? "0.9rem" : "0.98rem"}; color:var(--soft); font-weight:800; line-height:1.2;">${escapeHtml(step.value || "")}</span>
              </span>
            </span>
          `).join("")}
        </div>
      `
    : "";

  return `
    ${facts.length ? `
      <div style="display:flex; flex-wrap:wrap; gap:${compact ? "8px" : "12px"}; justify-content:center; margin:${compact ? "0 0 12px" : "0 0 16px"};">
        ${facts.map((fact) => `
          <span style="${chipStyle}">
            <span style="font-size:${compact ? "0.62rem" : "0.72rem"}; color:var(--muted); font-weight:800; letter-spacing:0.08em; text-transform:uppercase;">${escapeHtml(fact.label)}</span>
            <span style="font-size:${compact ? "0.98rem" : "1.08rem"}; color:var(--text); font-weight:800; line-height:1.2;">${escapeHtml(fact.value)}</span>
          </span>
        `).join("")}
      </div>
    ` : ""}
    ${tempoStrip}
  `;
}

function getSetDisplayTitle(set) {
  return String(set?.displayTitle || set?.setLabel || `Set ${set?.setNumber || 1}`).trim();
}

function getSetProgressLabel(set) {
  return String(set?.progressLabel || "").trim();
}

function formatExerciseFallback(exerciseId) {
  const raw = String(exerciseId ?? "").trim();
  if (!raw) return "Unknown activity";
  return raw
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveExerciseCatalogEntry(state, exerciseId) {
  const refId = String(exerciseId ?? "").trim();
  if (!refId) return null;

  return (
    state.exercises.find((exercise) => exercise.id === refId) ||
    state.exercises.find((exercise) => exercise.slug === refId) ||
    state.exercises.find((exercise) => exercise.name?.toLowerCase() === refId.toLowerCase()) ||
    null
  );
}

function getExerciseDisplayName(state, exerciseId) {
  return resolveExerciseCatalogEntry(state, exerciseId)?.name || formatExerciseFallback(exerciseId);
}

function summarizeSessionExercises(sets, state) {
  const counts = new Map();

  (sets || []).forEach((set) => {
    const exerciseName = getExerciseDisplayName(state, set.exerciseId);
    counts.set(exerciseName, (counts.get(exerciseName) || 0) + 1);
  });

  return [...counts.entries()];
}

function getPlayerViewport() {
  const width = window.innerWidth || 1024;
  const height = window.innerHeight || 768;
  return {
    compact: width <= 480 || height <= 760,
    narrow: width <= 480,
    veryNarrow: width <= 360,
    short: height <= 760,
  };
}

function clearAllIntervals() {
  if (activeWorkInterval) {
    clearInterval(activeWorkInterval);
    activeWorkInterval = null;
  }
  if (restTimerInterval) {
    clearInterval(restTimerInterval);
    restTimerInterval = null;
  }
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
  }
}

function cleanupImmersiveMode() {
  document.body.classList.remove('workout-active');
  clearAllIntervals();
}

export function hasWorkoutPlayerUnsavedProgress() {
  if (!currentSession) return false;
  if (currentSession.persistedSessionId || currentSession.status === "no-routine") return false;
  if (currentSession.status === "pre-workout" && !currentSession.sessionStartedAtIso) return false;
  return true;
}

export function discardWorkoutPlayerSession() {
  currentSession = null;
  cleanupImmersiveMode();
}

export function renderWorkoutPlayerView(container, { state, actions }) {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split('/');
  const id = parts[1];
  const sessionType = parts[2] === "test" ? "milestone_test" : "routine";
  const plan = state.activePlans.find(p => p.id === id);

  if (!plan) {
    cleanupImmersiveMode();
    container.innerHTML = `
      <section class="page page-single">
        <div class="panel" style="padding: 40px; text-align: center;">
          <h1 style="color: var(--danger);">Session Not Found</h1>
          <p style="color: var(--soft); margin-bottom: 24px;">Unable to load the workout session for this plan.</p>
          <button class="button button--ghost" data-action="player-exit" type="button">Back to Dashboard</button>
        </div>
      </section>
    `;
    container.querySelector('[data-action="player-exit"]')?.addEventListener("click", () => {
      actions.navigate("active-plans");
    });
    return;
  }

  // Initialize Session if not already active or if switched plans
  if (!currentSession || currentSession.planId !== id || currentSession.sessionType !== sessionType) {
    initSession(plan, state, sessionType);
  }

  // Enter Immersive Mode
  document.body.classList.add('workout-active');

  renderUI(container, actions, state);
}

function buildRoutineSessionSets(routine, state) {
  const sets = [];
  const entries = routine.entries || routine.exercises || [];

  entries.forEach((exInstance, entryIndex) => {
    const refId = exInstance.exerciseId || "";
    const catalogEntry = resolveExerciseCatalogEntry(state, refId);

    if (!catalogEntry) {
      console.warn("Unresolved exercise reference:", exInstance);
    }

    const setRestSec = Number.isFinite(Number(
      exInstance.restSeconds ?? exInstance.restSec ?? catalogEntry?.restSeconds,
    ))
      ? Math.max(0, Number(exInstance.restSeconds ?? exInstance.restSec ?? catalogEntry?.restSeconds))
      : 60;
    const transitionAfterSeconds = Number.isFinite(Number(
      exInstance.transitionAfterSeconds ?? exInstance.transitionSec,
    ))
      ? Math.max(0, Number(exInstance.transitionAfterSeconds ?? exInstance.transitionSec))
      : setRestSec;
    const transitionLabel = String(
      exInstance.transitionLabel ?? exInstance.transitionCue ?? "",
    ).trim();
    const isLastEntry = entryIndex === entries.length - 1;
    const hasEntryTransition = !isLastEntry && (transitionAfterSeconds > 0 || Boolean(transitionLabel));
    const blocks = getRoutineEntryBlocks(exInstance);
    const hasExplicitBlocks = Array.isArray(exInstance?.entryBlocks) && exInstance.entryBlocks.length > 0;
    const workBlocks = blocks.filter((block) => block.type === "work");
    const { displayMap } = buildEntryWorkDisplayMap(blocks);
    const totalSets = Math.max(1, workBlocks.length);
    let workIndex = 0;

    blocks.forEach((block, blockIndex) => {
      if (block.type !== "work") {
        return;
      }

      workIndex += 1;
      const metricType = getRoutineBlockMetricType(
        block,
        exInstance?.trackingType ?? catalogEntry?.trackingType ?? "reps",
      );
      const trackingType = resolveBlockTrackingType(block, exInstance, catalogEntry);
      const displayMeta = displayMap.get(block.id) || {
        logicalIndex: workIndex,
        totalLogical: totalSets,
        displayTitle: `Set ${workIndex}`,
        progressLabel: totalSets > 1 ? `Set ${workIndex} of ${totalSets}` : "",
      };
      const nextBlock = blocks[blockIndex + 1] || null;
      const blockAfterNext = blocks[blockIndex + 2] || null;
      let restSec = 0;
      let restKind = "complete";
      let cue = "";
      let followupRestKind = null;
      let followupRestSec = 0;
      let followupTransitionLabel = "";

      if (nextBlock?.type === "rest") {
        restSec = Number.isFinite(Number(nextBlock.seconds)) ? Math.max(0, Number(nextBlock.seconds)) : setRestSec;
        restKind = "set";
        if (hasEntryTransition && !blockAfterNext) {
          followupRestKind = "transition";
          followupRestSec = transitionAfterSeconds;
          followupTransitionLabel = transitionLabel;
        }
      } else if (nextBlock?.type === "switch_side") {
        restSec = 0;
        restKind = "instruction";
        cue = String(
          nextBlock.label || (nextBlock?.side ? `Switch to ${formatBlockSideLabel(nextBlock.side)}` : "Switch sides"),
        ).trim();
      } else if (hasEntryTransition) {
        restSec = transitionAfterSeconds;
        restKind = "transition";
        cue = transitionLabel;
      }

      sets.push({
        id: `set_${sets.length}_${Date.now()}`,
        exerciseId: catalogEntry?.id || refId,
        executionUnitType: getExerciseExecutionUnitType(catalogEntry),
        trackingType,
        metricType,
        side: block?.side ?? null,
        repTargetMode: block?.repTargetMode ?? exInstance?.repTargetMode ?? null,
        effort: block?.effort ?? null,
        holdSeconds: block?.holdSeconds ?? null,
        tempoMode: block?.tempoMode ?? null,
        tempoSecondsPerRep: block?.tempoSecondsPerRep ?? null,
        tempoDownSeconds: block?.tempoDownSeconds ?? null,
        tempoBottomHoldSeconds: block?.tempoBottomHoldSeconds ?? null,
        tempoUpSeconds: block?.tempoUpSeconds ?? null,
        tempoTopHoldSeconds: block?.tempoTopHoldSeconds ?? null,
        tempoLabel: block?.tempoLabel ?? null,
        setNumber: workIndex,
        totalSets,
        setLabel: block.label || `Set ${workIndex}`,
        displayTitle: displayMeta.displayTitle || block.label || `Set ${workIndex}`,
        logicalIndex: displayMeta.logicalIndex,
        logicalTotal: displayMeta.totalLogical,
        progressLabel: displayMeta.progressLabel,
        targetReps: block.reps ?? (hasExplicitBlocks ? null : (exInstance.reps ?? exInstance.targetReps)),
        targetWeightKg: block.weight ?? (hasExplicitBlocks ? null : (exInstance.weight ?? exInstance.targetWeightKg)),
        targetDurationSec: block.durationSeconds ?? (hasExplicitBlocks ? null : (exInstance.durationSeconds ?? exInstance.targetDurationSec)),
        targetResistance: block.resistance ?? (hasExplicitBlocks ? null : (exInstance.resistance ?? null)),
        restSec,
        restKind,
        transitionLabel: cue,
        followupRestKind,
        followupRestSec,
        followupTransitionLabel,
        notes: block.notes || exInstance.notes,
      });
    });
  });

  return sets;
}

function resolveSetInputs(set) {
  const trackingType = String(set?.trackingType ?? "reps");
  const metricType = String(set?.metricType ?? (trackingType === "duration" ? "duration" : "reps"));
  const showDuration = metricType === "duration" || set?.targetDurationSec != null;
  const showWeight = trackingType === "weight" || set?.targetWeightKg != null;
  const showResistance = trackingType === "resistance" || set?.targetResistance != null;
  const showReps =
    metricType === "reps" ||
    set?.targetReps != null;

  return {
    showReps,
    showWeight,
    showDuration,
    showResistance,
  };
}

function isTimedWorkSet(set) {
  return String(set?.metricType ?? "") === "duration"
    && Number.isFinite(Number(set?.targetDurationSec))
    && Number(set.targetDurationSec) > 0;
}

function clearActiveWorkInterval() {
  if (activeWorkInterval) {
    clearInterval(activeWorkInterval);
    activeWorkInterval = null;
  }
}

function resetActiveWorkState() {
  if (!currentSession) {
    return;
  }
  currentSession.activeWorkSetId = null;
  currentSession.workRemaining = 0;
  currentSession.workDurationTotal = 0;
}

function resolveLoggedDuration(set, explicitDuration) {
  if (explicitDuration != null) {
    return explicitDuration;
  }

  if (
    currentSession
    && currentSession.activeWorkSetId === set?.id
    && Number.isFinite(Number(currentSession.workDurationTotal))
  ) {
    return Math.max(
      0,
      Number(currentSession.workDurationTotal) - Number(currentSession.workRemaining ?? 0),
    );
  }

  return Number.isFinite(Number(set?.targetDurationSec))
    ? Number(set.targetDurationSec)
    : null;
}

function updateTimedWorkDisplay(container) {
  if (!currentSession) {
    return;
  }

  const timerDisplay = container.querySelector("#work-timer");
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(Math.max(0, Number(currentSession.workRemaining ?? 0)));
  }

  const progressFill = container.querySelector("#work-progress-fill");
  if (progressFill && Number.isFinite(Number(currentSession.workDurationTotal)) && Number(currentSession.workDurationTotal) > 0) {
    const completed = Math.max(
      0,
      Number(currentSession.workDurationTotal) - Number(currentSession.workRemaining ?? 0),
    );
    const percent = Math.max(0, Math.min(100, Math.round((completed / Number(currentSession.workDurationTotal)) * 100)));
    progressFill.style.width = `${percent}%`;
  }
}

function startActiveWorkInterval(container, actions, state) {
  clearActiveWorkInterval();

  const set = currentSession?.sets?.[currentSession.currentIndex];
  if (!set || !isTimedWorkSet(set) || currentSession.isPaused) {
    return;
  }

  activeWorkInterval = setInterval(() => {
    if (!currentSession || currentSession.isPaused || currentSession.status !== "active") {
      return;
    }

    if (currentSession.activeWorkSetId !== set.id) {
      clearActiveWorkInterval();
      return;
    }

    currentSession.workRemaining = Math.max(0, Number(currentSession.workRemaining ?? 0) - 1);
    updateTimedWorkDisplay(container);

    if (currentSession.workRemaining <= 0) {
      completeLoggedSet("success", null, container, actions, state);
    }
  }, 1000);
}

function ensureTimedWorkState(container, actions, state, set) {
  if (!isTimedWorkSet(set)) {
    clearActiveWorkInterval();
    resetActiveWorkState();
    return;
  }

  const targetDuration = Math.max(0, Number(set.targetDurationSec ?? 0));
  if (currentSession.activeWorkSetId !== set.id) {
    currentSession.activeWorkSetId = set.id;
    currentSession.workDurationTotal = targetDuration;
    currentSession.workRemaining = targetDuration;
  }

  updateTimedWorkDisplay(container);

  if (currentSession.workRemaining <= 0) {
    completeLoggedSet("success", null, container, actions, state);
    return;
  }

  if (!currentSession.isPaused) {
    startActiveWorkInterval(container, actions, state);
  }
}

function createSessionShell(plan, stage, sessionType, routineId, routineName, sets, extra = {}) {
  const stageIndex = plan.currentStageIndex ?? 0;

  return {
    planId: plan.id,
    stageId: stage.id,
    routineId,
    sessionType,
    stageName: stage.name,
    stageIndex: stageIndex + 1,
    planDisplayName: plan.displayName || plan.name,
    routineName,
    sets,
    currentIndex: 0,
    status: "pre-workout",
    restRemaining: 0,
    restPhase: null,
    sessionSeconds: 0,
    isPaused: false,
    activeWorkSetId: null,
    workRemaining: 0,
    workDurationTotal: 0,
    sessionStartedAtIso: null,
    persistedSessionId: null,
    completionContext: null,
    theme: plan.theme || { color: "#4FD1C5", icon: "💪" },
    logs: [],
    ...extra,
  };
}

function initSession(plan, state, sessionType = "routine") {
  const stageIndex = plan.currentStageIndex ?? 0;
  const stage = plan.stages?.[stageIndex];
  const dayInCycle = plan.currentDayInCycle ?? 1;

  if (!stage) return;

  if (sessionType === "milestone_test") {
    const stageProgress = evaluateStageProgress(
      stage,
      state.workouts || [],
      state.routines || [],
      plan,
      state.exercises || [],
    );

    if (!stageProgress.requiresTest) {
      currentSession = {
        planId: plan.id,
        sessionType,
        status: "unavailable-test",
        unavailableReason: "This stage does not define a separate milestone test.",
      };
      return;
    }

    if (stageProgress.isComplete) {
      currentSession = {
        planId: plan.id,
        sessionType,
        status: "unavailable-test",
        unavailableReason: "This stage has already been cleared.",
      };
      return;
    }

    if (!stageProgress.isReadyForTest) {
      currentSession = {
        planId: plan.id,
        sessionType,
        status: "unavailable-test",
        unavailableReason: "The milestone test is still locked. Keep following the current stage to unlock it.",
      };
      return;
    }

    const test = stageProgress.test;
    const exercise = resolveExerciseCatalogEntry(state, test.exerciseId);
    const trackingType = test.metric === "duration"
      ? "duration"
      : test.weight != null
        ? "weight"
        : "reps";

    currentSession = createSessionShell(
      plan,
      stage,
      sessionType,
      null,
      "Milestone Test",
      [
        {
          id: `set_test_${Date.now()}`,
          exerciseId: test.exerciseId,
          trackingType,
          setNumber: 1,
          totalSets: 1,
          targetReps: test.metric === "reps" ? test.target : null,
          targetWeightKg: test.weight ?? null,
          targetDurationSec: test.metric === "duration" ? test.target : null,
          targetResistance: test.resistance ?? null,
          restSec: test.restSeconds ?? exercise?.restSeconds ?? 60,
          notes: test.notes || stage.milestone?.description || "",
        },
      ],
      { milestoneTest: test },
    );
    return;
  }

  const schedule = stage.schedule || [];
  const scheduleEntry = schedule[dayInCycle - 1];
  const routineId = scheduleEntry?.type === "routine" ? scheduleEntry.routineId : null;
  const routine = routineId ? state.routines.find((r) => r.id === routineId) : null;

  if (!routine) {
    currentSession = { planId: plan.id, sessionType, status: "no-routine" };
    return;
  }

  const sets = buildRoutineSessionSets(routine, state);


  currentSession = {
    planId: plan.id,
    stageId: stage.id,
    routineId,
    sessionType,
    stageName: stage.name,
    stageIndex: stageIndex + 1,
    planDisplayName: plan.displayName || plan.name,
    routineName: routine.name,
    sets,
    currentIndex: 0,
    status: "pre-workout",
    restRemaining: 0,
    restPhase: null,
    sessionSeconds: 0,
    isPaused: false,
    sessionStartedAtIso: null,
    theme: plan.theme || { color: "#4FD1C5", icon: "💪" },
    logs: [],
  };
}

function startSessionTimer(container) {
    if (sessionTimerInterval) return;
    sessionTimerInterval = setInterval(() => {
        if (currentSession && !currentSession.isPaused && currentSession.status !== 'pre-workout') {
            currentSession.sessionSeconds++;
            updateHUD(container);
        }
    }, 1000);
}

function updateHUD(container) {
    const clock = container.querySelector('#session-clock');
    if (clock) clock.textContent = formatTime(currentSession.sessionSeconds);
    
    // Update Node Tracker
    const nodes = container.querySelectorAll('.progress-node');
    nodes.forEach((node, idx) => {
        node.style.flex = idx === currentSession.currentIndex ? "2" : "1";
        if (idx < currentSession.currentIndex) {
            node.style.background = "var(--brand)";
        } else if (idx === currentSession.currentIndex) {
            node.style.background = "var(--brand-2)";
        } else {
            node.style.background = "rgba(255,255,255,0.1)";
        }
    });
}

function renderUI(container, actions, state) {
  if (!currentSession) return;
  const viewport = getPlayerViewport();

  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-player-scroll", "true");
  wrapper.style.cssText = `min-height: 100dvh; height: 100dvh; display: flex; flex-direction: column; background: var(--bg); color: var(--text); position: relative; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; padding-bottom: ${viewport.compact ? "max(16px, env(safe-area-inset-bottom))" : "0px"};`;

  if (currentSession.status === 'no-routine') {
    renderNoRoutine(wrapper, actions);
  } else if (currentSession.status === "unavailable-test") {
    renderUnavailableTest(wrapper, actions);
  } else if (currentSession.status === 'complete') {
    renderComplete(wrapper, actions, state);
  } else if (currentSession.status === 'pre-workout') {
    renderPreWorkout(wrapper, container, actions, state);
  } else {
    renderHUD(wrapper, container, actions);
    const content = document.createElement("div");
    content.setAttribute("data-player-content", "true");
    content.style.flexGrow = "1";
    content.style.minHeight = "0";
    content.style.display = "flex";
    content.style.flexDirection = "column";

    if (currentSession.status === 'resting') {
      renderResting(content, container, actions, state);
    } else {
      renderActiveSet(content, container, actions, state);
    }
    wrapper.appendChild(content);

    if (currentSession.isPaused) {
        renderPauseOverlay(wrapper, container, actions, state);
    }
  }

  container.appendChild(wrapper);
}

function renderPreWorkout(wrapper, container, actions, state) {
    const exerciseSummary = summarizeSessionExercises(currentSession.sets, state);
    const uniqueExerciseCount = exerciseSummary.length;
    const exerciseLabel = uniqueExerciseCount === 1 ? "activity" : "activities";
    const startLabel = currentSession.sessionType === "milestone_test" ? "Start test" : "Start routine";

    wrapper.innerHTML = `
        <div class="player-prep-screen">
            <div class="player-prep">
                <div>
                    <p class="player-prep__eyebrow" style="color: ${currentSession.theme.color};">${escapeHtml(currentSession.planDisplayName)} / Stage ${currentSession.stageIndex}</p>
                    <h1 class="player-prep__title">${escapeHtml(currentSession.routineName)}</h1>
                </div>

                <p class="player-prep__copy">
                    ${currentSession.sets.length} total sets across ${uniqueExerciseCount} ${exerciseLabel}. Review the session once, then start and stay in motion.
                </p>

                <section class="player-prep__summary">
                    <p class="player-prep__summary-title">Session summary</p>
                    <div class="player-prep__summary-list">
                        ${exerciseSummary.map(([name, count]) => `
                            <div class="player-prep__summary-row">
                                <span>${escapeHtml(name)}</span>
                                <span class="player-prep__summary-value">${count} set${count === 1 ? "" : "s"}</span>
                            </div>
                        `).join('')}
                    </div>
                </section>

                <div class="player-prep__actions">
                    <button class="button button--primary player-prep__primary" style="background: ${currentSession.theme.color}; color: #000; border: none; box-shadow: 0 15px 40px ${currentSession.theme.color}55;" data-action="start" type="button">
                        ${escapeHtml(startLabel)}
                    </button>
                    <button class="button button--tertiary" data-action="cancel-pre" type="button">Cancel</button>
                </div>
            </div>
        </div>
    `;

    wrapper.querySelector('[data-action="start"]').addEventListener('click', () => {
        currentSession.sessionStartedAtIso = new Date().toISOString();
        currentSession.status = 'active';
        startSessionTimer(container);
        renderUI(container, actions, state);
    });
    wrapper.querySelector('[data-action="cancel-pre"]')?.addEventListener("click", () => {
      discardWorkoutPlayerSession();
      actions.navigate("active-plans");
    });
    return;

    if (false) {
    const { compact } = getPlayerViewport();
    const exerciseSummary = summarizeSessionExercises(currentSession.sets, state);
    const uniqueExerciseCount = exerciseSummary.length;
    const exerciseLabel = uniqueExerciseCount === 1 ? 'Activity' : 'Activities';
    const startLabel = currentSession.sessionType === "milestone_test" ? "START TEST" : "START ROUTINE";

    if (compact) {
        wrapper.innerHTML = `
            <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 24px 16px max(28px, env(safe-area-inset-bottom)); text-align: center;">
                <div style="width: min(100%, 520px); display: flex; flex-direction: column; align-items: center;">
                    <div style="font-size: 0.82rem; color: ${currentSession.theme.color}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 12px;">${escapeHtml(currentSession.planDisplayName)} &middot; Stage ${currentSession.stageIndex}</div>
                    <h1 style="font-size: 2.5rem; margin: 0 0 16px; line-height: 1.05;">${escapeHtml(currentSession.routineName)}</h1>
                    <p style="color: var(--soft); font-size: 1rem; margin-bottom: 32px;">
                        ${currentSession.sets.length} Total Sets across ${uniqueExerciseCount} ${exerciseLabel}.
                    </p>
                    <div class="panel" style="width: 100%; max-width: 500px; padding: 20px; margin-bottom: 32px; background: rgba(255,255,255,0.03);">
                        <div style="font-size: 0.82rem; color: var(--muted); text-transform: uppercase; margin-bottom: 14px; letter-spacing: 0.1em;">Session Summary</div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${exerciseSummary.map(([name, count]) => `
                                <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 1rem; color: var(--text);">
                                    <span>${escapeHtml(name)}</span>
                                    <span style="color: var(--brand); font-weight: 700; white-space: nowrap;">${count} Sets</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <button class="button button--primary" style="width: 100%; max-width: 360px; padding: 20px 28px; font-size: 1.35rem; border-radius: 100px; background: ${currentSession.theme.color}; color: #000; box-shadow: 0 15px 40px ${currentSession.theme.color}66;" data-action="start">
                        ${startLabel}
                    </button>
                    <button class="button button--ghost" style="margin-top: 18px;" data-action="cancel-pre" type="button">Cancel</button>
                </div>
            </div>
        `;

        wrapper.querySelector('[data-action="start"]').addEventListener('click', () => {
            currentSession.sessionStartedAtIso = new Date().toISOString();
            currentSession.status = 'active';
            startSessionTimer(container);
            renderUI(container, actions, state);
        });
        wrapper.querySelector('[data-action="cancel-pre"]')?.addEventListener("click", () => {
          discardWorkoutPlayerSession();
          actions.navigate("active-plans");
        });
        return;
    }

    wrapper.innerHTML = `
        <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: ${compact ? "flex-start" : "center"}; padding: ${compact ? "24px 16px max(28px, env(safe-area-inset-bottom))" : "40px"}; text-align: center;">
            <div style="font-size: 1rem; color: ${currentSession.theme.color}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px;">${escapeHtml(currentSession.planDisplayName)} · Stage ${currentSession.stageIndex}</div>
            <h1 style="font-size: 3.5rem; margin: 0 0 16px; line-height: 1;">${escapeHtml(currentSession.routineName)}</h1>
            <p style="color: var(--soft); font-size: 1.2rem; margin-bottom: 48px;">
                ${currentSession.sets.length} Total Sets across ${uniqueExerciseCount} ${exerciseLabel}.
            </p>
            
            <div class="panel" style="width: 100%; max-width: 500px; padding: 24px; margin-bottom: 48px; background: rgba(255,255,255,0.03);">
                <div style="font-size: 0.9rem; color: var(--muted); text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.1em;">Session Summary</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${exerciseSummary.map(([name, count]) => `
                        <div style="display: flex; justify-content: space-between; font-size: 1.1rem; color: var(--text);">
                            <span>${escapeHtml(name)}</span>
                            <span style="color: var(--brand); font-weight: 700;">${count} Sets</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <button class="button button--primary" style="padding: 24px 80px; font-size: 2rem; border-radius: 100px; background: ${currentSession.theme.color}; color: #000; box-shadow: 0 15px 40px ${currentSession.theme.color}66;" data-action="start">
                ${startLabel}
            </button>
            <button class="button button--ghost" style="margin-top: 24px;" data-action="cancel-pre" type="button">Cancel</button>
        </div>
    `;

    wrapper.querySelector('[data-action="start"]').addEventListener('click', () => {
        currentSession.sessionStartedAtIso = new Date().toISOString();
        currentSession.status = 'active';
        startSessionTimer(container);
        renderUI(container, actions, state);
    });
    wrapper.querySelector('[data-action="cancel-pre"]')?.addEventListener("click", () => {
      discardWorkoutPlayerSession();
      actions.navigate("active-plans");
    });
    }
}

function renderHUD(wrapper, container, actions) {
    const hud = document.createElement("div");
    hud.style.cssText = "padding: 16px 20px; background: rgba(9, 17, 31, 0.9); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.1); position: sticky; top: 0; z-index: 100;";
    
    const nodeTracker = `
        <div style="display: flex; gap: 6px; height: 8px; margin-bottom: 16px;">
            ${currentSession.sets.map((_, idx) => {
                let color = "rgba(255,255,255,0.1)";
                let flex = "1";
                if (idx < currentSession.currentIndex) color = "var(--brand)";
                else if (idx === currentSession.currentIndex) {
                    color = "var(--brand-2)";
                    flex = "2";
                }
                return `<div class="progress-node" style="flex: ${flex}; background: ${color}; border-radius: 4px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>`;
            }).join('')}
        </div>
    `;

    const statusRow = `
        <div class="player-hud">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 1.2rem;">${currentSession.theme.icon}</span>
                <span id="session-clock" style="font-family: monospace; font-size: 1.6rem; font-weight: 800; color: ${currentSession.theme.color}; font-variant-numeric: tabular-nums;">${formatTime(currentSession.sessionSeconds)}</span>
                <span style="color: var(--muted); font-size: 0.9rem; margin-left: 8px;">${escapeHtml(currentSession.planDisplayName)} · Stage ${currentSession.stageIndex}</span>
            </div>
            <button class="mini-button button--danger button--ghost" data-action="exit" style="padding: 6px 16px; font-size: 0.85rem; border-color: rgba(252, 129, 129, 0.3);">END SESSION</button>
        </div>
    `;

    hud.innerHTML = nodeTracker + statusRow;
    wrapper.appendChild(hud);

    hud.querySelector('[data-action="exit"]').addEventListener('click', () => {
        confirmAction(document.body, {
            title: "End Session Early?",
            message: "End workout session early? Progress will not be saved.",
            confirmText: "Yes, End Workout",
            onConfirm: () => {
                discardWorkoutPlayerSession();
                actions.navigate("active-plans");
            }
        });
    });
}

function renderPauseOverlay(wrapper, container, actions, state) {
    const { compact } = getPlayerViewport();
    const overlay = document.createElement("div");
    overlay.style.cssText = compact
      ? "position: fixed; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(8px); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px;"
      : "position: absolute; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(8px); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center;";
    overlay.innerHTML = `
        <h2 style="font-size: 3rem; color: var(--brand-2); margin-bottom: 48px; letter-spacing: 0.15em; font-weight: 800;">SESSION PAUSED</h2>
        <button class="button button--primary" style="padding: 32px 100px; font-size: 2.2rem; border-radius: 100px; background: ${currentSession.theme.color}; color: #000; border: none; box-shadow: 0 0 60px rgba(0, 0, 0, 0.35);" data-action="resume">▶ RESUME</button>
    `;
    wrapper.appendChild(overlay);

    overlay.querySelector('[data-action="resume"]').addEventListener('click', () => {
        currentSession.isPaused = false;
        if (currentSession.status === 'resting' && currentSession.restRemaining > 0) {
            startRestInterval(container, actions, state);
        } else if (currentSession.status === 'active' && isTimedWorkSet(currentSession.sets[currentSession.currentIndex])) {
            startActiveWorkInterval(container, actions, state);
        }
        renderUI(container, actions, state);
    });
}

function renderNoRoutine(container, actions) {
  container.innerHTML = `
    <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center;">
      <h2 style="color: var(--brand-2); margin-bottom: 16px;">Rest Step</h2>
      <p style="color: var(--soft); margin-bottom: 32px;">This schedule step has no routine attached. Complete it when you are ready to move on.</p>
      <div style="display: grid; gap: 12px; width: min(100%, 320px);">
        <button class="button button--primary" data-action="complete-rest" type="button">Complete Rest Step</button>
        <button class="button button--ghost" data-action="exit-no-routine" type="button">Exit Player</button>
      </div>
    </div>
  `;
  container.querySelector('[data-action="complete-rest"]')?.addEventListener("click", () => {
    const planId = currentSession?.planId;
    discardWorkoutPlayerSession();
    if (planId) {
      actions.completeRestDay(planId);
      actions.navigate(`active-plan/${planId}`);
    } else {
      actions.navigate("active-plans");
    }
  });
  container.querySelector('[data-action="exit-no-routine"]')?.addEventListener("click", () => {
    discardWorkoutPlayerSession();
    actions.navigate("active-plans");
  });
}

function renderUnavailableTest(container, actions) {
  const planId = currentSession?.planId;
  container.innerHTML = `
    <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center;">
      <h2 style="color: var(--brand-2); margin-bottom: 16px;">Milestone Test Unavailable</h2>
      <p style="color: var(--soft); margin-bottom: 32px; max-width: 520px;">${escapeHtml(currentSession?.unavailableReason || "This milestone test cannot be started right now.")}</p>
      <div style="display: grid; gap: 12px; width: min(100%, 320px);">
        <button class="button button--primary" data-action="test-back-detail" type="button">Back to Plan</button>
        <button class="button button--ghost" data-action="test-back-dashboard" type="button">Dashboard</button>
      </div>
    </div>
  `;
  container.querySelector('[data-action="test-back-detail"]')?.addEventListener("click", () => {
    discardWorkoutPlayerSession();
    if (planId) {
      actions.navigate(`active-plan/${planId}`);
      return;
    }
    actions.navigate("active-plans");
  });
  container.querySelector('[data-action="test-back-dashboard"]')?.addEventListener("click", () => {
    discardWorkoutPlayerSession();
    actions.navigate("active-plans");
  });
}

function transitionToComplete(container, actions, state) {
  currentSession.status = "complete";
  currentSession.completionContext = buildCompletionContext(state);
  persistCompletedSession(actions, state);
  renderUI(container, actions, state);
}

function completeLoggedSet(status, content, container, actions, state) {
  clearActiveWorkInterval();
  logSet(status, content);
  resetActiveWorkState();

  if (currentSession.currentIndex >= currentSession.sets.length - 1) {
    transitionToComplete(container, actions, state);
    return;
  }

  startRest(container, actions, state);
}

function renderActiveSet(content, container, actions, state) {
  const set = currentSession.sets[currentSession.currentIndex];
  if (!set) {
    transitionToComplete(container, actions, state);
    return;
  }

  const exerciseName = getExerciseDisplayName(state, set.exerciseId);
  const setDisplayTitle = getSetDisplayTitle(set);
  const setProgressLabel = getSetProgressLabel(set);

  const { showReps, showWeight, showDuration, showResistance } = resolveSetInputs(set);
  const { compact, veryNarrow } = getPlayerViewport();
  const setFactsMarkup = renderSetFacts(set, { compact, collapseTempo: compact && veryNarrow });
  const isTimedBlock = isTimedWorkSet(set);
  const repsInput = resolveRepsInputConfig(set);

  if (isTimedBlock) {
    if (compact) {
      content.innerHTML = `
        <div data-role="timed-work" style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 16px 14px 24px; text-align: center; min-height: 100%; background: linear-gradient(180deg, rgba(79, 209, 197, 0.04), transparent 42%);">
          <div style="width: 100%; max-width: 520px;">
            <h1 style="font-size: 2.45rem; margin: 0 0 10px; line-height: 1.05; font-weight: 900; color: var(--text); text-align: center;">${escapeHtml(exerciseName)}</h1>
            <div style="font-size: 1.02rem; color: var(--brand); font-weight: 800; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.08em;">${escapeHtml(setDisplayTitle)}</div>
            ${setProgressLabel ? `<div style="font-size: 0.92rem; color: var(--soft); font-weight: 700; margin-bottom: 18px; text-transform: uppercase; letter-spacing: 0.06em;">${escapeHtml(setProgressLabel)}</div>` : `<div style="margin-bottom:18px;"></div>`}
            ${setFactsMarkup}

            <div style="padding: 22px 18px; border-radius: 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(143,168,210,0.14); margin-bottom: 18px;">
              <div style="font-size: 0.82rem; color: var(--muted); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700;">Timed block</div>
              <div id="work-timer" style="font-size: 3.8rem; font-weight: 900; line-height: 1; color: var(--brand-2); font-variant-numeric: tabular-nums; margin-bottom: 12px;">${formatTime(set.targetDurationSec || 0)}</div>
              <div style="height: 10px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden;">
                <div id="work-progress-fill" style="height: 100%; width: 0%; background: ${currentSession.theme.color}; transition: width 0.2s linear;"></div>
              </div>
              <div style="margin-top: 12px; color: var(--soft); font-size: 0.92rem;">Timer starts automatically and advances when it finishes.</div>
            </div>

            <div style="width: 100%;">
              <button class="button button--primary" style="width: 100%; font-size: 1.4rem; font-weight: 900; padding: 18px; border-radius: 18px; margin-bottom: 12px; background: ${currentSession.theme.color}; color: #000; border: none;" data-action="complete">Finish Early</button>
              <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px;">
                <button class="button" style="font-size: 0.96rem; font-weight: 700; padding: 14px 10px; border-radius: 14px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.18); color: var(--text);" data-action="toggle-pause">Pause</button>
                <button class="button" style="font-size: 0.96rem; font-weight: 700; padding: 14px 10px; border-radius: 14px; background: rgba(255, 193, 7, 0.9); color: #000; border: none;" data-action="fail">Partial</button>
                <button class="button button--ghost" style="font-size: 0.96rem; padding: 14px 10px; border-radius: 14px; border: 2px solid rgba(255,255,255,0.15); color: var(--muted);" data-action="skip">Skip</button>
              </div>
            </div>

            ${set.notes ? `
              <div style="margin-top: 18px; text-align: center; color: var(--soft); font-size: 0.94rem; font-style: italic; opacity: 0.72;">
                "${escapeHtml(set.notes)}"
              </div>
            ` : ""}
          </div>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div data-role="timed-work" style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px; text-align: center; min-height: 100vh;">
          <div style="width: 100%; max-width: 760px;">
            <h1 style="font-size: 4.6rem; margin: 0 0 14px; line-height: 1; font-weight: 900; color: var(--text);">${escapeHtml(exerciseName)}</h1>
            <div style="font-size: 1.8rem; color: var(--brand); font-weight: 800; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.08em;">${escapeHtml(setDisplayTitle)}</div>
            ${setProgressLabel ? `<div style="font-size: 1.12rem; color: var(--soft); font-weight: 700; margin-bottom: 32px; text-transform: uppercase; letter-spacing: 0.08em;">${escapeHtml(setProgressLabel)}</div>` : `<div style="margin-bottom:32px;"></div>`}
            ${setFactsMarkup}

            <div style="padding: 34px 30px; border-radius: 28px; background: rgba(255,255,255,0.03); border: 1px solid rgba(143,168,210,0.14); margin-bottom: 28px;">
              <div style="font-size: 0.95rem; color: var(--muted); margin-bottom: 18px; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700;">Timed block</div>
              <div id="work-timer" style="font-size: 6rem; font-weight: 900; line-height: 1; color: var(--brand-2); font-variant-numeric: tabular-nums; margin-bottom: 18px;">${formatTime(set.targetDurationSec || 0)}</div>
              <div style="height: 14px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; max-width: 540px; margin: 0 auto;">
                <div id="work-progress-fill" style="height: 100%; width: 0%; background: ${currentSession.theme.color}; transition: width 0.2s linear;"></div>
              </div>
              <div style="margin-top: 16px; color: var(--soft); font-size: 1rem;">Timer starts automatically and advances when it finishes.</div>
            </div>

            <div style="width: 100%; max-width: 620px; margin: 0 auto;">
              <button class="button button--primary" style="width: 100%; font-size: 2.1rem; font-weight: 900; padding: 28px; border-radius: 22px; margin-bottom: 18px; background: ${currentSession.theme.color}; color: #000; border: none;" data-action="complete">Finish Early</button>
              <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;">
                <button class="button" style="font-size: 1.3rem; font-weight: 700; padding: 20px 16px; border-radius: 16px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.18); color: var(--text);" data-action="toggle-pause">Pause</button>
                <button class="button" style="font-size: 1.3rem; font-weight: 700; padding: 20px 16px; border-radius: 16px; background: rgba(255, 193, 7, 0.9); color: #000; border: none;" data-action="fail">Partial</button>
                <button class="button button--ghost" style="font-size: 1.3rem; padding: 20px 16px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.15); color: var(--muted);" data-action="skip">Skip</button>
              </div>
            </div>

            ${set.notes ? `
              <div style="margin-top: 24px; text-align: center; color: var(--soft); font-size: 1.02rem; font-style: italic; opacity: 0.72;">
                "${escapeHtml(set.notes)}"
              </div>
            ` : ""}
          </div>
        </div>
      `;
    }

    content.querySelector('[data-action="toggle-pause"]').addEventListener('click', () => {
      currentSession.isPaused = true;
      clearActiveWorkInterval();
      renderUI(container, actions, state);
    });
    content.querySelector('[data-action="complete"]').addEventListener('click', () => {
      completeLoggedSet('success', content, container, actions, state);
    });
    content.querySelector('[data-action="fail"]').addEventListener('click', () => {
      completeLoggedSet('partial', content, container, actions, state);
    });
    content.querySelector('[data-action="skip"]').addEventListener('click', () => {
      clearActiveWorkInterval();
      logSet('skipped', null, { captureMetrics: false });
      resetActiveWorkState();
      currentSession.currentIndex++;
      if (currentSession.currentIndex >= currentSession.sets.length) {
        transitionToComplete(container, actions, state);
        return;
      }
      currentSession.status = 'active';
      renderUI(container, actions, state);
    });

    ensureTimedWorkState(container, actions, state, set);
    return;
  }

  if (compact) {
    content.innerHTML = `
      <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding:${veryNarrow ? "10px 10px 16px" : "12px 12px 18px"}; text-align: center; min-height: 100%;">
        <div style="width: 100%; max-width: 520px;">
          <h1 style="font-size: ${veryNarrow ? "2.1rem" : "2.45rem"}; margin: 0 0 ${veryNarrow ? "8px" : "10px"}; line-height: 1.05; font-weight: 900; color: var(--text); text-align: center;">${escapeHtml(exerciseName)}</h1>
          <div style="font-size: ${veryNarrow ? "1rem" : "1.1rem"}; color: var(--brand); font-weight: 800; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.08em;">${escapeHtml(setDisplayTitle)}</div>
          ${setProgressLabel ? `<div style="font-size: ${veryNarrow ? "0.84rem" : "0.92rem"}; color: var(--soft); font-weight: 700; margin-bottom: ${veryNarrow ? "12px" : "18px"}; text-transform: uppercase; letter-spacing: 0.06em;">${escapeHtml(setProgressLabel)}</div>` : `<div style="margin-bottom:${veryNarrow ? "12px" : "18px"};"></div>`}
          ${setFactsMarkup}

          <div style="width: 100%; margin-bottom: ${veryNarrow ? "16px" : "22px"};">
            <div style="display: flex; gap: ${veryNarrow ? "10px" : "12px"}; justify-content: center; align-items: end; flex-wrap: wrap;">
              ${showReps ? `
                <div style="flex: 1 1 ${veryNarrow ? "108px" : "120px"}; text-align: center;">
                  <div style="font-size: ${veryNarrow ? "0.74rem" : "0.82rem"}; color: var(--muted); margin-bottom: ${veryNarrow ? "8px" : "10px"}; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">${escapeHtml(repsInput.label)}</div>
                  <input type="number" id="log-reps" value="${repsInput.value}" placeholder="${escapeHtml(repsInput.placeholder)}" aria-label="${escapeHtml(repsInput.label)}" style="font-size: ${veryNarrow ? "2rem" : "2.4rem"}; font-weight: 900; text-align: center; padding: ${veryNarrow ? "12px 8px" : "14px 10px"}; background: rgba(0,0,0,0.6); border: 3px solid rgba(143,168,210,0.3); border-radius: 16px; width: 100%; max-width: ${veryNarrow ? "126px" : "138px"}; color: var(--text); outline: none; transition: all 0.2s ease;" inputmode="numeric" pattern="[0-9]*">
                </div>
              ` : ""}
              ${showWeight ? `
                <div style="flex: 1 1 ${veryNarrow ? "108px" : "120px"}; text-align: center;">
                  <div style="font-size: ${veryNarrow ? "0.74rem" : "0.82rem"}; color: var(--muted); margin-bottom: ${veryNarrow ? "8px" : "10px"}; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">Weight</div>
                  <input type="number" id="log-weight" value="${set.targetWeightKg || 0}" step="0.5" aria-label="Weight in kg" style="font-size: ${veryNarrow ? "2rem" : "2.4rem"}; font-weight: 900; text-align: center; padding: ${veryNarrow ? "12px 8px" : "14px 10px"}; background: rgba(0,0,0,0.6); border: 3px solid rgba(143,168,210,0.3); border-radius: 16px; width: 100%; max-width: ${veryNarrow ? "126px" : "138px"}; color: var(--text); outline: none; transition: all 0.2s ease;" inputmode="decimal">
                </div>
              ` : ""}
              ${showDuration ? `
                <div style="flex: 1 1 ${veryNarrow ? "108px" : "120px"}; text-align: center;">
                  <div style="font-size: ${veryNarrow ? "0.74rem" : "0.82rem"}; color: var(--muted); margin-bottom: ${veryNarrow ? "8px" : "10px"}; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">Duration</div>
                  <input type="number" id="log-duration" value="${set.targetDurationSec || 0}" aria-label="Duration in seconds" style="font-size: ${veryNarrow ? "2rem" : "2.4rem"}; font-weight: 900; text-align: center; padding: ${veryNarrow ? "12px 8px" : "14px 10px"}; background: rgba(0,0,0,0.6); border: 3px solid rgba(143,168,210,0.3); border-radius: 16px; width: 100%; max-width: ${veryNarrow ? "126px" : "138px"}; color: var(--text); outline: none; transition: all 0.2s ease;" inputmode="numeric" pattern="[0-9]*">
                </div>
              ` : ""}
            </div>
          </div>

          <div style="width: 100%;">
            <button class="button button--primary" style="width: 100%; font-size: ${veryNarrow ? "1.46rem" : "1.7rem"}; font-weight: 900; padding: ${veryNarrow ? "18px" : "22px"}; border-radius: 22px; margin-bottom: 14px; background: ${currentSession.theme.color}; color: #000; border: none; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28); transition: all 0.2s ease;" data-action="complete">COMPLETE SET</button>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
              <button class="button" style="font-size: ${veryNarrow ? "0.94rem" : "1rem"}; font-weight: 700; padding: ${veryNarrow ? "13px 10px" : "15px 12px"}; border-radius: 16px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); color: var(--text); transition: all 0.2s ease;" data-action="toggle-pause">PAUSE</button>
              <button class="button" style="font-size: ${veryNarrow ? "0.94rem" : "1rem"}; font-weight: 700; padding: ${veryNarrow ? "13px 10px" : "15px 12px"}; border-radius: 16px; background: rgba(255, 193, 7, 0.9); color: #000; border: none; transition: all 0.2s ease;" data-action="fail">PARTIAL</button>
            </div>

            <button class="button button--ghost" style="width: 100%; font-size: ${veryNarrow ? "0.92rem" : "0.98rem"}; padding: ${veryNarrow ? "12px" : "14px"}; border-radius: 16px; border: 2px solid rgba(255,255,255,0.15); color: var(--muted); transition: all 0.2s ease;" data-action="skip">Skip Set</button>
          </div>

          ${set.notes ? `
            <div style="margin-top: ${veryNarrow ? "14px" : "20px"}; text-align: center; color: var(--soft); font-size: ${veryNarrow ? "0.88rem" : "0.98rem"}; font-style: italic; opacity: 0.72;">
              "${escapeHtml(set.notes)}"
            </div>
          ` : ""}
          ${showResistance ? `
            <div style="margin-top: 12px; text-align: center; color: var(--muted); font-size: 0.9rem; opacity: 0.9;">
              Resistance: ${escapeHtml(set.targetResistance || "Configured")}
            </div>
          ` : ""}
        </div>
      </div>
    `;

    content.querySelector('[data-action="toggle-pause"]').addEventListener('click', () => {
        currentSession.isPaused = true;
        if (restTimerInterval) {
            clearInterval(restTimerInterval);
            restTimerInterval = null;
        }
        renderUI(container, actions, state);
    });

    content.querySelector('[data-action="complete"]').addEventListener('click', () => {
      completeLoggedSet('success', content, container, actions, state);
    });

    content.querySelector('[data-action="fail"]').addEventListener('click', () => {
      completeLoggedSet('partial', content, container, actions, state);
    });

    content.querySelector('[data-action="skip"]').addEventListener('click', () => {
      logSet('skipped', content, { captureMetrics: false });
      currentSession.currentIndex++;
      if (currentSession.currentIndex >= currentSession.sets.length) {
        transitionToComplete(container, actions, state);
        return;
      } else {
        currentSession.status = 'active';
      }
      renderUI(container, actions, state);
    });
    return;
  }

  content.innerHTML = `
    <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; min-height: 100vh;">
      <!-- Exercise Focus -->
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; max-width: 800px;">
        <h1 style="font-size: 5rem; margin: 0 0 16px; line-height: 1; font-weight: 900; color: var(--text); text-align: center;">${escapeHtml(exerciseName)}</h1>
        <div style="font-size: 2.2rem; color: var(--brand); font-weight: 800; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.1em;">${escapeHtml(setDisplayTitle)}</div>
        ${setProgressLabel ? `<div style="font-size: 1.2rem; color: var(--soft); font-weight: 700; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 0.08em;">${escapeHtml(setProgressLabel)}</div>` : `<div style="margin-bottom:40px;"></div>`}
        ${setFactsMarkup}

        <!-- Performance Inputs - Dominant -->
        <div style="width: 100%; max-width: 700px; margin-bottom: 80px;">
          <div style="display: flex; gap: 32px; justify-content: center; align-items: end;">
            ${showReps ? `
              <div style="flex: 1; text-align: center;">
                <div style="font-size: 1.1rem; color: var(--muted); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">${escapeHtml(repsInput.label)}</div>
                <input type="number" id="log-reps" value="${repsInput.value}" placeholder="${escapeHtml(repsInput.placeholder)}" aria-label="${escapeHtml(repsInput.label)}" style="font-size: 4rem; font-weight: 900; text-align: center; padding: 24px 16px; background: rgba(0,0,0,0.6); border: 3px solid rgba(143,168,210,0.3); border-radius: 16px; width: 100%; max-width: 180px; color: var(--text); outline: none; transition: all 0.2s ease;" inputmode="numeric" pattern="[0-9]*">
              </div>
            ` : ""}
            ${showWeight ? `
              <div style="flex: 1; text-align: center;">
                <div style="font-size: 1.1rem; color: var(--muted); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Weight</div>
                <input type="number" id="log-weight" value="${set.targetWeightKg || 0}" step="0.5" aria-label="Weight in kg" style="font-size: 4rem; font-weight: 900; text-align: center; padding: 24px 16px; background: rgba(0,0,0,0.6); border: 3px solid rgba(143,168,210,0.3); border-radius: 16px; width: 100%; max-width: 180px; color: var(--text); outline: none; transition: all 0.2s ease;" inputmode="decimal">
              </div>
            ` : ""}
            ${showDuration ? `
              <div style="flex: 1; text-align: center;">
                <div style="font-size: 1.1rem; color: var(--muted); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Duration</div>
                <input type="number" id="log-duration" value="${set.targetDurationSec || 0}" aria-label="Duration in seconds" style="font-size: 4rem; font-weight: 900; text-align: center; padding: 24px 16px; background: rgba(0,0,0,0.6); border: 3px solid rgba(143,168,210,0.3); border-radius: 16px; width: 100%; max-width: 180px; color: var(--text); outline: none; transition: all 0.2s ease;" inputmode="numeric" pattern="[0-9]*">
              </div>
            ` : ""}
          </div>
        </div>

        <!-- Action Buttons - Massive and Clear -->
        <div style="width: 100%; max-width: 600px;">
          <button class="button button--primary" style="width: 100%; font-size: 2.8rem; font-weight: 900; padding: 40px; border-radius: 24px; margin-bottom: 24px; background: ${currentSession.theme.color}; color: #000; border: none; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28); transition: all 0.2s ease;" data-action="complete">COMPLETE SET</button>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <button class="button" style="font-size: 1.6rem; font-weight: 700; padding: 24px; border-radius: 16px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); color: var(--text); transition: all 0.2s ease;" data-action="toggle-pause">PAUSE</button>
            <button class="button" style="font-size: 1.6rem; font-weight: 700; padding: 24px; border-radius: 16px; background: rgba(255, 193, 7, 0.9); color: #000; border: none; transition: all 0.2s ease;" data-action="fail">PARTIAL</button>
          </div>

          <button class="button button--ghost" style="width: 100%; font-size: 1.4rem; padding: 20px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.15); color: var(--muted); transition: all 0.2s ease;" data-action="skip">Skip Set</button>
        </div>
      </div>

      <!-- Minimal Notes -->
      ${set.notes ? `
        <div style="position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); text-align: center; color: var(--soft); font-size: 1.1rem; font-style: italic; opacity: 0.6; max-width: 600px;">
          "${escapeHtml(set.notes)}"
        </div>
      ` : ""}
      ${showResistance ? `
        <div style="position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); text-align: center; color: var(--muted); font-size: 0.95rem; opacity: 0.85; max-width: 600px;">
          Resistance: ${escapeHtml(set.targetResistance || "Configured")}
        </div>
      ` : ""}
    </div>
  `;

  content.querySelector('[data-action="toggle-pause"]').addEventListener('click', () => {
      currentSession.isPaused = true;
      if (restTimerInterval) {
          clearInterval(restTimerInterval);
          restTimerInterval = null;
      }
      renderUI(container, actions, state);
  });

  content.querySelector('[data-action="complete"]').addEventListener('click', () => {
    completeLoggedSet('success', content, container, actions, state);
  });

  content.querySelector('[data-action="fail"]').addEventListener('click', () => {
    completeLoggedSet('partial', content, container, actions, state);
  });

  content.querySelector('[data-action="skip"]').addEventListener('click', () => {
    logSet('skipped', content, { captureMetrics: false });
    currentSession.currentIndex++;
    if (currentSession.currentIndex >= currentSession.sets.length) {
      transitionToComplete(container, actions, state);
      return;
    } else {
      currentSession.status = 'active';
    }
    renderUI(container, actions, state);
  });
}

function normalizeLoggedStatus(status) {
  if (status === "success") return "completed";
  if (status === "failed" || status === "fail") return "failed";
  if (status === "partial") return "partial";
  if (status === "skipped" || status === "skip") return "skipped";
  return "completed";
}

function logSet(status, content, options = {}) {
  const set = currentSession.sets[currentSession.currentIndex];
  const captureMetrics = options.captureMetrics !== false;
  const reps = content?.querySelector("#log-reps")?.value;
  const weight = content?.querySelector("#log-weight")?.value;
  const duration = content?.querySelector("#log-duration")?.value;
  const parsedDuration = captureMetrics && duration ? parseInt(duration, 10) : null;
  const resolvedDuration = captureMetrics
    ? resolveLoggedDuration(set, Number.isFinite(parsedDuration) ? parsedDuration : null)
    : null;

  currentSession.logs.push({
    exerciseId: set.exerciseId,
    setNumber: set.setNumber,
    metricType: set.metricType ?? null,
    side: set.side ?? null,
    holdSeconds: set.holdSeconds ?? null,
    tempoMode: set.tempoMode ?? null,
    tempoSecondsPerRep: set.tempoSecondsPerRep ?? null,
    tempoDownSeconds: set.tempoDownSeconds ?? null,
    tempoBottomHoldSeconds: set.tempoBottomHoldSeconds ?? null,
    tempoUpSeconds: set.tempoUpSeconds ?? null,
    tempoTopHoldSeconds: set.tempoTopHoldSeconds ?? null,
    tempoLabel: set.tempoLabel ?? null,
    status: normalizeLoggedStatus(status),
    actualReps: captureMetrics && reps ? parseInt(reps, 10) : null,
    actualWeightKg: captureMetrics && weight ? parseFloat(weight) : null,
    actualDurationSec: resolvedDuration,
    actualResistance: captureMetrics ? (set.targetResistance ?? null) : null,
  });
}

function startRest(container, actions, state) {
  clearActiveWorkInterval();
  resetActiveWorkState();
  const set = currentSession.sets[currentSession.currentIndex];
  currentSession.restPhase = "primary";
  if (set?.restKind === "instruction") {
    currentSession.status = 'resting';
    currentSession.restRemaining = 0;
    renderUI(container, actions, state);
    return;
  }

  const resolvedRest = Number.isFinite(Number(set?.restSec))
    ? Math.max(0, Number(set.restSec))
    : 60;

  if (resolvedRest <= 0) {
    finishRest(container, actions, state);
    return;
  }

  currentSession.status = 'resting';
  currentSession.restRemaining = resolvedRest;
  
  startRestInterval(container, actions, state);
  renderUI(container, actions, state);
}

function startRestInterval(container, actions, state) {
    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerInterval = setInterval(() => {
        if (!currentSession.isPaused) {
            currentSession.restRemaining--;
            if (currentSession.restRemaining <= 0) {
                finishRest(container, actions, state);
            } else {
                const timerDisplay = container.querySelector('#rest-timer');
                if (timerDisplay) timerDisplay.textContent = currentSession.restRemaining;
            }
        }
    }, 1000);
}

function finishRest(container, actions, state) {
  if (restTimerInterval) {
    clearInterval(restTimerInterval);
    restTimerInterval = null;
  }
  const currentSet = currentSession.sets[currentSession.currentIndex];
  const followupTransitionSeconds = Number.isFinite(Number(currentSet?.followupRestSec))
    ? Math.max(0, Number(currentSet.followupRestSec))
    : 0;

  if (
    currentSession.restPhase !== "followup"
    && currentSet?.followupRestKind === "transition"
    && followupTransitionSeconds > 0
  ) {
    currentSession.status = "resting";
    currentSession.restPhase = "followup";
    currentSession.restRemaining = followupTransitionSeconds;
    startRestInterval(container, actions, state);
    renderUI(container, actions, state);
    return;
  }

  currentSession.restPhase = null;
  currentSession.currentIndex++;
  if (currentSession.currentIndex >= currentSession.sets.length) {
    transitionToComplete(container, actions, state);
    return;
  } else {
    currentSession.status = 'active';
  }
  renderUI(container, actions, state);
}

function renderResting(content, container, actions, state) {
  const currentSet = currentSession.sets[currentSession.currentIndex];
  const nextSet = currentSession.sets[currentSession.currentIndex + 1];
  const preview = resolveRestPreview(currentSet, nextSet, state);
  if (currentSet?.restKind === "instruction") {
    const cueLabel = String(preview.cue || currentSet?.transitionLabel || "Follow the next instruction.").trim();
    const hasPreview = Boolean(preview.title);
    content.innerHTML = `
      <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px 18px 22px; text-align: center; min-height: 100%; background: linear-gradient(180deg, var(--bg) 0%, rgba(79, 209, 197, 0.015) 100%);">
        <div style="width: 100%; max-width: 560px; padding: 28px; border-radius: 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(143,168,210,0.12);">
          <div style="font-size: 1rem; color: var(--brand); font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; margin-bottom: 18px;">Instruction</div>
          <div style="font-size: 2.4rem; font-weight: 900; line-height: 1.1; color: var(--text); margin-bottom: 16px;">${escapeHtml(cueLabel)}</div>
          ${hasPreview ? `
            <div style="color: var(--soft); margin-bottom: 24px; line-height: 1.5;">
              Resume with ${escapeHtml(preview.title)}${preview.subtitle ? ` · ${escapeHtml(preview.subtitle)}` : ""}
              ${preview.progress ? `<div style="margin-top:6px; font-size:0.92rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em;">${escapeHtml(preview.progress)}</div>` : ""}
            </div>
          ` : ""}
          <div style="display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
            <button class="button button--primary" data-action="continue-rest-instruction" type="button">Continue</button>
            <button class="button button--ghost" data-action="toggle-pause" type="button">Pause</button>
          </div>
        </div>
      </div>
    `;

    content.querySelector('[data-action="continue-rest-instruction"]').addEventListener('click', () => {
      finishRest(container, actions, state);
    });
    content.querySelector('[data-action="toggle-pause"]').addEventListener('click', () => {
      currentSession.isPaused = true;
      renderUI(container, actions, state);
    });
    return;
  }

  const restHeading = getEffectiveRestKind(currentSet) === "transition" ? "Transition" : "Set Rest";
  const { compact } = getPlayerViewport();

  if (compact) {
    content.innerHTML = `
      <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 18px 14px 24px; text-align: center; min-height: 100%; background: linear-gradient(180deg, var(--bg) 0%, rgba(79, 209, 197, 0.02) 100%);">
        <div style="width: 100%; max-width: 520px;">
          <div style="font-size: 1rem; color: var(--brand); font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; margin-bottom: 24px; opacity: 0.85;">${escapeHtml(restHeading)}</div>

          <div id="rest-timer" style="font-size: 4.2rem; font-weight: 900; line-height: 1; color: var(--brand); margin-bottom: 10px; font-variant-numeric: tabular-nums; text-shadow: 0 4px 20px rgba(79, 209, 197, 0.3);">${currentSession.restRemaining ?? 60}</div>
          <div style="font-size: 1rem; color: var(--soft); margin-bottom: 28px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">seconds remaining</div>

          <div style="width: 100%; padding: 20px; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px solid rgba(79, 209, 197, 0.1); margin-bottom: 28px;">
            <div style="font-size: 0.82rem; color: var(--muted); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.1em; font-weight: 600;">${escapeHtml(preview.heading)}</div>
            ${preview.title ? `
              <div style="font-size: 1.55rem; font-weight: 800; color: var(--text); margin-bottom: 8px;">${escapeHtml(preview.title)}</div>
              ${preview.subtitle ? `<div style="color: var(--brand); font-size: 1rem; font-weight: 700;">${escapeHtml(preview.subtitle)}</div>` : ""}
              ${preview.progress ? `<div style="margin-top: 6px; color: var(--muted); font-size: 0.86rem; text-transform: uppercase; letter-spacing: 0.06em;">${escapeHtml(preview.progress)}</div>` : ""}
              ${preview.cue ? `<div style="margin-top: 10px; color: var(--soft); font-size: 0.92rem;">${escapeHtml(preview.cue)}</div>` : ""}
            ` : `
              <div style="font-size: 1.8rem; font-weight: 800; color: var(--brand);">Workout Complete</div>
            `}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <button class="button button--ghost" style="padding: 16px 14px; font-size: 1rem; border-radius: 12px; border: 2px solid rgba(255,255,255,0.15); color: var(--muted); transition: all 0.2s ease;" data-action="skip-rest">Skip Rest</button>
            <button class="button" style="padding: 16px 14px; font-size: 1rem; border-radius: 12px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); color: var(--text); transition: all 0.2s ease;" data-action="toggle-pause">Pause</button>
          </div>
        </div>
      </div>
    `;

    content.querySelector('[data-action="skip-rest"]').addEventListener('click', () => {
      finishRest(container, actions, state);
    });

    content.querySelector('[data-action="toggle-pause"]').addEventListener('click', () => {
      currentSession.isPaused = true;
      if (restTimerInterval) {
          clearInterval(restTimerInterval);
          restTimerInterval = null;
      }
      renderUI(container, actions, state);
    });
    return;
  }

  content.innerHTML = `
    <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; min-height: 100%; background: linear-gradient(180deg, var(--bg) 0%, rgba(79, 209, 197, 0.02) 100%);">
      <!-- Rest Timer - Calm and Focused -->
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; max-width: 600px;">
        <div style="font-size: 1.6rem; color: var(--brand); font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 40px; opacity: 0.8;">${escapeHtml(restHeading)}</div>

        <div id="rest-timer" style="font-size: 6rem; font-weight: 900; line-height: 1; color: var(--brand); margin-bottom: 16px; font-variant-numeric: tabular-nums; text-shadow: 0 4px 20px rgba(79, 209, 197, 0.3);">${currentSession.restRemaining ?? 60}</div>
        <div style="font-size: 1.3rem; color: var(--soft); margin-bottom: 60px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">seconds remaining</div>

        <!-- Next Exercise Preview - Subtle -->
        <div style="width: 100%; max-width: 500px; padding: 32px; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px solid rgba(79, 209, 197, 0.1); margin-bottom: 60px;">
          <div style="font-size: 0.9rem; color: var(--muted); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.1em; font-weight: 600;">${escapeHtml(preview.heading)}</div>
          ${preview.title ? `
            <div style="font-size: 2rem; font-weight: 800; color: var(--text); margin-bottom: 8px;">${escapeHtml(preview.title)}</div>
            ${preview.subtitle ? `<div style="color: var(--brand); font-size: 1.1rem; font-weight: 700;">${escapeHtml(preview.subtitle)}</div>` : ""}
            ${preview.progress ? `<div style="margin-top: 8px; color: var(--muted); font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.08em;">${escapeHtml(preview.progress)}</div>` : ""}
            ${preview.cue ? `<div style="margin-top: 14px; color: var(--soft); font-size: 1rem;">${escapeHtml(preview.cue)}</div>` : ""}
          ` : `
            <div style="font-size: 2rem; font-weight: 800; color: var(--brand);">Workout Complete</div>
          `}
        </div>

        <!-- Rest Controls - Minimal -->
        <div style="display: flex; gap: 20px; align-items: center;">
          <button class="button button--ghost" style="padding: 20px 32px; font-size: 1.4rem; border-radius: 12px; border: 2px solid rgba(255,255,255,0.15); color: var(--muted); transition: all 0.2s ease;" data-action="skip-rest">Skip Rest</button>
          <button class="button" style="padding: 20px 32px; font-size: 1.4rem; border-radius: 12px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); color: var(--text); transition: all 0.2s ease;" data-action="toggle-pause">Pause</button>
        </div>
      </div>
    </div>
  `;

  content.querySelector('[data-action="skip-rest"]').addEventListener('click', () => {
    finishRest(container, actions, state);
  });

  content.querySelector('[data-action="toggle-pause"]').addEventListener('click', () => {
    currentSession.isPaused = true;
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
    }
    renderUI(container, actions, state);
  });
}

function buildSessionSetPayload() {
  return currentSession.logs.map((log) => ({
    exerciseId: log.exerciseId || "",
    setNumber: log.setNumber,
    status: log.status,
    actualReps: log.actualReps ?? null,
    actualDurationSec: log.actualDurationSec ?? null,
    actualWeightKg: log.actualWeightKg ?? null,
    actualResistance: log.actualResistance ?? null,
  }));
}

function evaluateMilestoneTestAttempt(test, logs) {
  const relevantLogs = (logs || [])
    .filter((log) => log.exerciseId === test.exerciseId)
    .filter((log) => log.status === "completed");

  if (!relevantLogs.length) {
    return { passed: false, bestValue: 0 };
  }

  let bestValue = 0;
  let passed = false;

  relevantLogs.forEach((log) => {
    const value = test.metric === "duration"
      ? Number(log.actualDurationSec ?? 0)
      : Number(log.actualReps ?? 0);
    const loadSatisfied = test.weight == null || Number(log.actualWeightKg ?? 0) >= Number(test.weight);
    const resistanceSatisfied = test.resistance == null || log.actualResistance === test.resistance;

    if (value > bestValue) {
      bestValue = value;
    }

    if (value >= Number(test.target ?? 1) && loadSatisfied && resistanceSatisfied) {
      passed = true;
    }
  });

  return { passed, bestValue };
}

function buildRoutineCompletionPreview(plan, stage, state, completedAt) {
  const completion = buildScheduleCompletionState(plan, stage);
  const sessionPreview = {
    activePlanId: plan.id,
    stageId: stage?.id ?? "",
    sessionType: "routine",
    completedAt,
    sets: buildSessionSetPayload(),
  };
  const planAfterDay = {
    ...plan,
    currentDayInCycle: completion.nextDay,
    currentCycleCount: completion.nextCycleCount,
    streakDays: (plan.streakDays || 0) + 1,
    lastSessionDate: completedAt.slice(0, 10),
    sessions: [...(plan.sessions || []), "__preview__"],
  };
  const progressAfter = evaluateStageProgress(
    stage,
    [sessionPreview, ...(state.workouts || [])],
    state.routines || [],
    planAfterDay,
    state.exercises || [],
  );

  return { completion, progressAfter };
}

function buildCompletionContext(state) {
  const plan = state.activePlans.find((entry) => entry.id === currentSession?.planId);
  if (!plan) {
    return null;
  }

  const stage = plan.stages?.[plan.currentStageIndex ?? 0] || {};
  const nextStage = plan?.stages?.[plan.currentStageIndex + 1];
  const completedAt = new Date().toISOString();
  const isTestSession = currentSession.sessionType === "milestone_test";
  const routinePreview = !isTestSession
    ? buildRoutineCompletionPreview(plan, stage, state, completedAt)
    : null;
  const testOutcome = isTestSession
    ? evaluateMilestoneTestAttempt(currentSession.milestoneTest, currentSession.logs)
    : null;
  const milestoneTestResult = isTestSession
    ? (testOutcome?.passed ? "passed" : "failed")
    : null;
  const stageCleared = isTestSession
    ? Boolean(testOutcome?.passed)
    : Boolean(routinePreview?.progressAfter?.isComplete);
  const testUnlocked = !isTestSession && Boolean(routinePreview?.progressAfter?.isReadyForTest);
  const completionSummary = isTestSession
    ? (
        testOutcome?.passed
          ? `Passed milestone test: ${currentSession.milestoneTest?.exerciseName || "Milestone"}`
          : `Did not pass milestone test: ${currentSession.milestoneTest?.exerciseName || "Milestone"}`
      )
    : testUnlocked
      ? `Milestone test unlocked: ${routinePreview?.progressAfter?.summaryText || "Ready"}`
      : stageCleared
        ? (routinePreview?.progressAfter?.summaryText || "Stage milestone reached")
        : routinePreview?.progressAfter?.progressText || "Session logged";

  const narrativeContext = {
    planId: plan.id,
    sessionCount: (plan.sessions?.length || 0) + 1,
    stageIndex: plan.currentStageIndex,
    isRestDay: plan && isRestDay(plan),
  };

  return {
    plan,
    stage,
    nextStage,
    completedAt,
    isTestSession,
    routinePreview,
    testOutcome,
    milestoneTestResult,
    stageCleared,
    testUnlocked,
    completionSummary,
    sessionCompleteSubline: getNarrative("session_complete_subline", narrativeContext),
    milestoneReachedSubline: getNarrative("milestone_reached_subline", narrativeContext),
    nextWindowMessage: narrativeContext.isRestDay
      ? getNarrative("recovery", narrativeContext)
      : getNarrative("momentum", narrativeContext),
  };
}

function persistCompletedSession(actions, state, options = {}) {
  if (!currentSession) {
    return null;
  }

  if (currentSession.persistedSessionId) {
    return currentSession.completionContext;
  }

  const completionContext = currentSession.completionContext || buildCompletionContext(state);
  if (!completionContext?.plan) {
    return null;
  }

  const { plan, stage, completedAt, isTestSession, milestoneTestResult } = completionContext;
  const sessionId = `workout_${Date.now()}`;
  const startedAt = currentSession.sessionStartedAtIso || completedAt;
  const planPatch = {
    streakDays: (plan.streakDays || 0) + 1,
    lastSessionDate: completedAt.slice(0, 10),
    sessions: [...(plan.sessions || []), sessionId],
  };

  if (!isTestSession) {
    const completion = buildScheduleCompletionState(plan, stage);
    planPatch.currentDayInCycle = completion.nextDay;
    planPatch.currentCycleCount = completion.nextCycleCount;
  }

  if (isTestSession && milestoneTestResult === "failed") {
    Object.assign(
      planPatch,
      buildFailureTransitionPatch(
        plan,
        stage?.milestone?.onFailure?.action || "none",
        stage?.milestone?.onFailure?.targetStageId || null,
        completedAt,
      ),
    );
  }

  const session = {
    id: sessionId,
    activePlanId: plan.id,
    activePlanVersion: plan.version ?? "1.0",
    routineId: isTestSession ? null : currentSession.routineId,
    stageId: currentSession.stageId ?? stage?.id ?? "",
    startedAt,
    completedAt,
    sessionType: currentSession.sessionType,
    milestoneTest: isTestSession
      ? {
          exerciseId: currentSession.milestoneTest?.exerciseId ?? null,
          metric: currentSession.milestoneTest?.metric ?? null,
          target: currentSession.milestoneTest?.target ?? null,
          result: milestoneTestResult,
        }
      : null,
    reflectionRating: options.reflectionRating ?? null,
    feedbackResponses: Array.isArray(options.feedbackResponses) ? options.feedbackResponses : [],
    sets: buildSessionSetPayload(),
  };

  currentSession.persistedSessionId = sessionId;
  currentSession.completionContext = completionContext;

  actions.recordCompletedSession({
    session,
    activePlanId: plan.id,
    planPatch,
  });

  return completionContext;
}

function finishSessionAfterReflection(actions, state, options = {}) {
  const completionContext = currentSession?.completionContext
    || (currentSession?.persistedSessionId == null
      ? persistCompletedSession(actions, state, {
          reflectionRating: options.reflectionRating ?? null,
        })
      : null);

  if (!completionContext?.plan) {
    return;
  }

  if (currentSession?.persistedSessionId) {
    const sessionPatch = {};
    if (Object.prototype.hasOwnProperty.call(options, "reflectionRating")) {
      sessionPatch.reflectionRating = options.reflectionRating ?? null;
    }
    if (Array.isArray(options.feedbackResponses)) {
      sessionPatch.feedbackResponses = options.feedbackResponses;
    }

    if (Object.keys(sessionPatch).length) {
      actions.updateSessionReflection(
        currentSession.persistedSessionId,
        sessionPatch,
      );
    }
  }

  if (options.advanceStage) {
    actions.advanceStage(completionContext.plan.id);
  }

  const targetRoute = `active-plan/${completionContext.plan.id}`;
  currentSession = null;
  cleanupImmersiveMode();
  actions.navigate(targetRoute);
}

function renderComplete(wrapper, actions, state) {
  const completionContext =
    currentSession?.completionContext || buildCompletionContext(state);
  if (!completionContext?.plan) {
    return;
  }

  currentSession.completionContext = completionContext;
  persistCompletedSession(actions, state);

  const {
    plan,
    stage,
    nextStage,
    isTestSession,
    testOutcome,
    milestoneTestResult,
    stageCleared,
    testUnlocked,
    completionSummary,
    sessionCompleteSubline,
    milestoneReachedSubline,
    nextWindowMessage,
  } = completionContext;

  if (stageCleared && stage.transitionRule !== "manual") {
    renderMilestoneCeremony(wrapper, actions, state, {
      plan,
      stage,
      nextStage,
      completionSummary,
      milestoneReachedSubline,
      milestoneTestResult,
    });
    return;
  }

  wrapper.innerHTML = `
    <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; max-width: 720px; margin: 0 auto;">
      <h1 style="font-size: 3.5rem; margin-bottom: 24px; font-weight: 900; color: var(--text);">${isTestSession ? "Test complete" : "Session complete"}</h1>
      <p style="color: var(--soft); font-size: 1.4rem; margin-bottom: 48px; line-height: 1.6;">${escapeHtml(sessionCompleteSubline)}</p>
      
      <div style="display: grid; gap: 24px; width: 100%; margin-bottom: 60px;">
        <div style="padding: 32px; background: rgba(255,255,255,0.03); border: 1px solid rgba(143,168,210,0.15); border-radius: 24px; text-align: left;">
          <div style="font-size: 0.9rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 12px; font-weight: 700;">Journey Impact</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">${escapeHtml(completionSummary)}</div>
          <p style="color: var(--soft); margin-top: 8px; font-size: 1.1rem;">${escapeHtml(
            isTestSession
              ? (testOutcome?.passed
                  ? "Your result has already been logged against this stage milestone."
                  : "The test result is already logged. Your plan rules will decide what happens next.")
              : (testUnlocked
                  ? "This session is already saved, and your next milestone test is now ready whenever you want to take it."
                  : "This session is already saved. Add a reflection if you want extra context in the export loop."))
          }</p>
        </div>
        
        <div style="padding: 32px; background: rgba(79, 209, 197, 0.03); border: 1px solid rgba(79, 209, 197, 0.15); border-radius: 24px; text-align: left;">
          <div style="font-size: 0.9rem; color: var(--brand); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 12px; font-weight: 700;">Next step</div>
          <div style="font-size: 1.3rem; color: var(--text); line-height: 1.5;">${escapeHtml(nextWindowMessage)}</div>
        </div>
      </div>

      <div style="display: grid; gap: 16px; width: min(100%, 420px);">
        <button class="button button--primary" style="padding: 28px 36px; font-size: 1.7rem; border-radius: 100px; background: ${currentSession.theme.color}; color: #000; border: none; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);" data-action="continue-journey">Add Reflection</button>
        <button class="button button--ghost" style="padding: 18px 24px; border-radius: 18px;" data-action="skip-reflection" type="button">Back to Plan</button>
      </div>
    </div>
  `;

  wrapper.querySelector('[data-action="continue-journey"]').addEventListener('click', () => {
    renderReflection(wrapper, actions, state, {
      plan,
      milestoneTestResult,
    });
  });
  wrapper.querySelector('[data-action="skip-reflection"]').addEventListener("click", () => {
    finishSessionAfterReflection(actions, state, {
      plan,
      milestoneTestResult,
    });
  });
}

function renderMilestoneCeremony(wrapper, actions, state, context) {
  const { plan, stage, nextStage, completionSummary, milestoneReachedSubline, milestoneTestResult } = context;
  const stageLabel = stage.name ? escapeHtml(stage.name) : "Current stage";
  const nextStageLabel = nextStage ? escapeHtml(nextStage.name || `Stage ${plan.currentStageIndex + 2}`) : null;

  wrapper.innerHTML = `
    <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; max-width: 760px; margin: 0 auto;">
      <div style="font-size: 4rem; margin-bottom: 24px;">✨</div>
      <h1 style="font-size: 3.5rem; margin-bottom: 16px; font-weight: 900; color: var(--text);">Milestone reached</h1>
      <p style="color: var(--soft); font-size: 1.4rem; margin-bottom: 48px; line-height: 1.6;">${escapeHtml(milestoneReachedSubline)} ${escapeHtml(stageLabel)} is now complete.</p>
      
      <div style="display: grid; gap: 24px; width: 100%; margin-bottom: 60px;">
        <div style="padding: 32px; background: rgba(255,255,255,0.03); border: 1px solid rgba(143,168,210,0.15); border-radius: 24px; text-align: left;">
          <div style="font-size: 0.9rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 12px; font-weight: 700;">Transformation</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--text);">${escapeHtml(completionSummary)}</div>
          <p style="color: var(--soft); margin-top: 8px; font-size: 1.1rem;">You have moved through this stage with consistency and purpose.</p>
        </div>
        
        ${nextStage ? `
        <div style="padding: 32px; background: rgba(79, 209, 197, 0.05); border: 1px solid rgba(79, 209, 197, 0.2); border-radius: 24px; text-align: left;">
          <div style="font-size: 0.9rem; color: var(--brand); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 12px; font-weight: 700;">Unlocked Next</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: var(--text); margin-bottom: 8px;">${escapeHtml(nextStageLabel)}</div>
          <p style="color: var(--soft); font-size: 1.1rem; line-height: 1.5;">${escapeHtml(nextStage.milestone?.description || "A new phase of training awaits.")}</p>
        </div>
        ` : `
        <div style="padding: 32px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(143,168,210,0.15); border-radius: 24px; text-align: left;">
          <div style="font-size: 0.9rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 12px; font-weight: 700;">Status</div>
          <div style="font-size: 1.4rem; color: var(--text);">Stage complete. Continue the journey to maintain your progress.</div>
        </div>
        `}
      </div>

      <div style="display: grid; grid-template-columns: repeat(${nextStage ? 2 : 1}, minmax(0, 1fr)); gap: 20px; width: 100%;">
        ${nextStage ? `<button class="button button--primary" style="padding: 28px 36px; font-size: 1.6rem; border-radius: 24px; background: ${currentSession.theme.color}; color: #000; border: none; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);" data-action="begin-next-stage">Begin Next Stage</button>` : ''}
        <button class="button ${nextStage ? 'button--ghost' : 'button--primary'}" style="padding: 28px 36px; font-size: 1.6rem; border-radius: 24px; ${nextStage ? "" : `background: ${currentSession.theme.color}; color: #000; border: none; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);`}" data-action="continue-current-stage">${nextStage ? "Stay in Current Stage" : "Continue Journey"}</button>
      </div>
      <p style="margin-top: 20px; color: var(--muted); font-size: 0.98rem;">This session is already saved. You can decide the stage change now or come back to it later from the plan screen.</p>
    </div>
  `;

  if (nextStage) {
    wrapper.querySelector('[data-action="begin-next-stage"]').addEventListener('click', () => {
      renderReflection(wrapper, actions, state, { plan, advanceStage: true, milestoneTestResult });
    });
  }

  wrapper.querySelector('[data-action="continue-current-stage"]').addEventListener('click', () => {
    renderReflection(wrapper, actions, state, { plan, advanceStage: false, milestoneTestResult });
  });
}

function collectFeedbackResponses(wrapper) {
  return [...wrapper.querySelectorAll("[data-feedback-prompt-id]")]
    .map((field) => ({
      promptId: field.dataset.feedbackPromptId || "",
      label: field.dataset.feedbackLabel || "",
      response: field.value.trim(),
    }))
    .filter((entry) => entry.response);
}

function renderReflection(wrapper, actions, state, options) {
  const feedbackPrompts =
    currentSession?.completionContext?.stage?.milestone?.feedbackPrompts ||
    [];
  wrapper.innerHTML = `
    <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; max-width: 600px; margin: 0 auto;">
      <h2 style="font-size: 2.8rem; margin-bottom: 48px; font-weight: 800; color: var(--text); line-height: 1.2;">How did this session feel today?</h2>
      <p style="color: var(--muted); margin: -24px 0 32px; line-height: 1.6;">Reflection is optional. The session is already saved, so you can rate it now or skip for later.</p>
      ${feedbackPrompts.length ? `
        <div style="width: 100%; margin-bottom: 28px; padding: 24px; border-radius: 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(143,168,210,0.12); text-align: left;">
          <div style="margin-bottom: 18px;">
            <div style="font-size: 0.82rem; color: var(--brand); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; margin-bottom: 8px;">Session check-in</div>
            <p style="color: var(--soft); margin: 0; line-height: 1.6;">Capture any symptom, sensation, or rehab-specific feedback this stage cares about. These notes are stored with the session for later review.</p>
          </div>
          <div style="display: grid; gap: 16px;">
            ${feedbackPrompts.map((prompt) => `
              <label style="display: grid; gap: 8px;">
                <span style="font-weight: 700; color: var(--text);">${escapeHtml(prompt.label)}</span>
                <textarea
                  data-feedback-prompt-id="${escapeHtml(prompt.id)}"
                  data-feedback-label="${escapeHtml(prompt.label)}"
                  rows="3"
                  style="width: 100%; min-height: 96px; border-radius: 18px; border: 1px solid rgba(143,168,210,0.18); background: rgba(10, 19, 39, 0.72); color: var(--text); padding: 14px 16px; resize: vertical;"
                  placeholder="${escapeHtml(prompt.placeholder || "Write a short response...")}"
                ></textarea>
              </label>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <div style="display: grid; gap: 20px; width: 100%;">
        <button class="button" style="padding: 32px; font-size: 1.8rem; border-radius: 24px; background: rgba(79, 209, 197, 0.08); color: var(--brand); border: 1px solid rgba(79, 209, 197, 0.2); font-weight: 800;" data-difficulty="strong">Strong</button>
        <button class="button" style="padding: 32px; font-size: 1.8rem; border-radius: 24px; background: rgba(255, 255, 255, 0.04); color: var(--text); border: 1px solid rgba(255, 255, 255, 0.1); font-weight: 800;" data-difficulty="normal">Normal</button>
        <button class="button" style="padding: 32px; font-size: 1.8rem; border-radius: 24px; background: rgba(252, 129, 129, 0.08); color: var(--danger); border: 1px solid rgba(252, 129, 129, 0.2); font-weight: 800;" data-difficulty="difficult">Difficult</button>
      </div>
      ${feedbackPrompts.length ? `
        <button class="button button--ghost" style="margin-top: 20px; min-width: 260px;" data-action="save-feedback-only" type="button">Save feedback without rating</button>
      ` : ""}
      <button class="button button--ghost" style="margin-top: 20px; min-width: 220px;" data-action="skip-reflection" type="button">Skip for now</button>
    </div>
  `;

  wrapper.querySelectorAll('[data-difficulty]').forEach(btn => {
    btn.addEventListener('click', () => {
      const feedbackResponses = collectFeedbackResponses(wrapper);
      finishSessionAfterReflection(actions, state, {
        ...options,
        reflectionRating: btn.dataset.difficulty,
        feedbackResponses,
      });
    });
  });
  wrapper.querySelector('[data-action="save-feedback-only"]')?.addEventListener("click", () => {
    finishSessionAfterReflection(actions, state, {
      ...options,
      feedbackResponses: collectFeedbackResponses(wrapper),
    });
  });
  wrapper.querySelector('[data-action="skip-reflection"]')?.addEventListener("click", () => {
    finishSessionAfterReflection(actions, state, options);
  });
}
