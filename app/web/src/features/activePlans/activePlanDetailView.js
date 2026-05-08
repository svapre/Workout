/**
 * Active Plan Detail View
 *
 * Detailed breakdown of a specific active plan instance.
 */

import { getNextRoutine } from "./activePlanUtils.js";
import { buildJourneyContext } from "./journeyContext.js";
import { evaluateStageProgress } from "../plans/progressionEngine.js";
import { confirmAction } from "../../ui/modal.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatEligibilityDescriptor(progress) {
  const { eligibility } = progress;

  if (eligibility.type === "none") {
    return progress.requiresTest
      ? "Milestone test can be attempted any time."
      : "Stage can be advanced any time.";
  }

  if (eligibility.type === "sessions") {
    return `Unlock after ${eligibility.target} logged session${eligibility.target === 1 ? "" : "s"} in this stage.`;
  }

  if (eligibility.requiresContinuous) {
    return `Unlock after ${eligibility.target} consecutive ${eligibility.target === 1 ? "cycle" : "cycles"}.`;
  }

  return `Unlock after ${eligibility.target} ${eligibility.target === 1 ? "cycle" : "cycles"} in this stage.`;
}

function formatMilestoneDescriptor(progress) {
  if (progress.requiresTest && progress.test.exerciseId) {
    if (progress.isComplete) {
      return `Milestone passed: ${progress.summaryText}`;
    }
    return progress.isReadyForTest
      ? `Test unlocked: ${progress.summaryText}`
      : `Milestone test: ${progress.summaryText}`;
  }

  return formatEligibilityDescriptor(progress);
}

function resolveProgressMeter(progress) {
  if (progress.requiresTest) {
    const target =
      progress.eligibility.type === "none"
        ? 1
        : Math.max(1, Number(progress.eligibility.target ?? 1));
    const current =
      progress.eligibility.type === "none"
        ? (progress.isReadyForTest || progress.isComplete ? 1 : 0)
        : Math.max(0, Number(progress.eligibility.current ?? 0));
    return { current, target };
  }

  if (progress.target == null || Number(progress.target) === 0) {
    return { current: progress.isComplete ? 1 : 0, target: 1 };
  }

  return {
    current: Math.max(0, Number(progress.current ?? 0)),
    target: Math.max(1, Number(progress.target ?? 1)),
  };
}

function formatStaticMilestoneDescriptor(stage, exercises) {
  const milestone = stage?.milestone || {};
  const test = milestone.test || {};
  const eligibility = milestone.eligibility || {
    type: "cycles",
    target: 1,
    requiresContinuous: false,
  };

  if (test.type === "exercise" && test.exerciseId) {
    const exerciseName =
      exercises.find((exercise) => exercise.id === test.exerciseId)?.name || "target exercise";
    const metricLabel = test.metric === "duration" ? "seconds" : "reps";
    return `Milestone test: ${test.target ?? 1} ${metricLabel} on ${exerciseName}`;
  }

  if (eligibility.type === "sessions") {
    return `Unlock after ${eligibility.target ?? 1} session${Number(eligibility.target ?? 1) === 1 ? "" : "s"}.`;
  }

  if (eligibility.type === "none") {
    return "Milestone test can be attempted any time.";
  }

  return `Unlock after ${eligibility.target ?? 1} cycle${Number(eligibility.target ?? 1) === 1 ? "" : "s"}.`;
}

function formatProgressText(progress) {
  return progress.progressText;
}

function renderJourneySequence(stage, routines) {
  const items =
    stage.schedule?.map((entry) => {
      if (entry.type === "rest") {
        return `<span class="journey-rotation__item journey-rotation__item--rest">Rest Step</span>`;
      }

      const routine = routines.find((candidate) => candidate.id === entry.routineId);
      return `<span class="journey-rotation__item">${escapeHtml(routine?.name || "Workout")}</span>`;
    }) || [];

  return items.length ? items.join('<span class="journey-rotation__separator">/</span>') : "No schedule";
}

export function renderActivePlanDetailView(container, { state, actions }) {
  const existingCta = document.querySelector(".journey-cta-zone");
  if (existingCta) {
    existingCta.remove();
  }

  const hash = window.location.hash.replace(/^#\/?/, "");
  const id = hash.split("/")[1];
  const plan = state.activePlans.find((entry) => entry.id === id);

  container.innerHTML = "";

  const section = document.createElement("section");
  section.className = "page page-single";

  if (!plan) {
    section.innerHTML = `
      <div class="panel panel--section">
        <div class="panel__body" style="padding: 40px; text-align: center;">
          <h1 style="color: var(--danger);">Plan not found</h1>
          <p style="color: var(--soft); margin-bottom: 24px;">The active plan you are looking for does not exist or has been removed.</p>
          <button class="button button--ghost" data-action="apd-back" type="button">Back to Dashboard</button>
        </div>
      </div>
    `;
    container.appendChild(section);
    section.querySelector('[data-action="apd-back"]')?.addEventListener("click", () => {
      actions.navigate("active-plans");
    });
    return;
  }

  const stageIndex = plan.currentStageIndex ?? 0;
  const currentStage = plan.stages?.[stageIndex] || { name: "Unknown Stage", milestone: {} };
  const nextStage = plan.stages?.[stageIndex + 1] || null;
  const nextRoutine = getNextRoutine(plan, state.routines);
  const rawTheme = plan.theme || { color: "#4FD1C5", icon: "PL" };
  const theme = {
    color: rawTheme.color || "#4FD1C5",
    icon: /Ã°|ð/.test(String(rawTheme.icon ?? "PL")) ? "PL" : String(rawTheme.icon ?? "PL"),
  };
  const isRest = !nextRoutine;
  const stageProgress = evaluateStageProgress(
    currentStage,
    state.workouts || [],
    state.routines || [],
    plan,
    state.exercises || [],
  );
  const journeyContext = buildJourneyContext({
    plan,
    workouts: state.workouts,
    routines: state.routines,
    exercises: state.exercises,
  });

  const { current: progressCurrent, target: progressTarget } = resolveProgressMeter(stageProgress);
  const canTakeMilestoneTest = stageProgress.isReadyForTest;
  const isStageComplete = stageProgress.isComplete;
  const canAdvanceStage = isStageComplete && Boolean(nextStage);
  const canArchivePlan = isStageComplete && !nextStage;
  const defaultAction = isRest
    ? { type: "rest", label: "Complete rest step" }
    : { type: "session", label: "Start session" };
  const primaryAction = canAdvanceStage
    ? {
        type: "advance",
        label: nextStage ? `Advance to ${nextStage.name || "Next Stage"}` : "Advance stage",
      }
    : canArchivePlan
      ? { type: "archive", label: "Archive plan" }
    : canTakeMilestoneTest
      ? { type: "test", label: "Take milestone test" }
      : defaultAction;
  const secondaryAction = canAdvanceStage || canArchivePlan
    ? { ...defaultAction, label: "Continue current stage" }
    : canTakeMilestoneTest
      ? defaultAction
      : null;
  const progressPct = isStageComplete
    ? 100
    : Math.min(100, Math.round((progressCurrent / progressTarget) * 100));
  const progressLabel = isStageComplete
    ? "Status"
    : stageProgress.requiresTest
      ? "Eligibility"
      : "Progress";
  const progressValue = canAdvanceStage
    ? nextStage
      ? `Ready to advance to ${nextStage.name || "Next Stage"}`
      : "Stage milestone complete"
    : canArchivePlan
      ? "Final stage complete"
    : formatProgressText(stageProgress);
  const missionTitle = canAdvanceStage
    ? "Milestone reached"
    : canArchivePlan
      ? "Stage complete"
    : canTakeMilestoneTest
      ? "Milestone ready"
      : isRest
        ? "Scheduled rest"
        : "Current mission";
  const milestoneDescription = canAdvanceStage
    ? nextStage
      ? `${currentStage.name || "This stage"} is complete. Advance when you are ready, or continue repeating this stage.`
      : `${currentStage.name || "This stage"} is complete. Continue the current stage whenever you want to keep reinforcing it.`
    : canArchivePlan
      ? `${currentStage.name || "This stage"} is complete. Archive the plan to move it out of your active queue, or keep the current stage active if you want to continue repeating it.`
    : isRest
      ? "This schedule step has no routine attached. Complete it when you are ready to move forward."
      : currentStage.milestone?.description || stageProgress.summaryText || "Build strength and consistency.";

  section.style.setProperty("--plan-color", theme.color);

  section.innerHTML = `
    <div class="journey-hero" style="--plan-color: ${theme.color};">
      <button class="button button--ghost journey-back-btn" data-action="apd-back" type="button">Back</button>
      <div class="journey-hero__icon">${escapeHtml(theme.icon)}</div>
      <h1 class="journey-hero__title">${escapeHtml(plan.displayName || plan.name)}</h1>
      <p class="journey-hero__goal">${escapeHtml(plan.goal || plan.description || "Training for excellence.")}</p>
      <p class="journey-hero__insight">${escapeHtml(journeyContext.currentFocus)}</p>
      <div class="journey-hero__status">
        ${journeyContext.recentAchievement ? `<div class="journey-hero__achievement">${escapeHtml(journeyContext.recentAchievement)}</div>` : ""}
        <div class="journey-hero__stage">${escapeHtml(currentStage.name)}</div>
        <div class="journey-hero__next">${escapeHtml(journeyContext.nextMeaningfulEvent)}</div>
      </div>
    </div>

    <div class="journey-path">
      ${plan.stages
        .map((stage, index) => {
          const isComplete = index < stageIndex;
          const isCurrent = index === stageIndex;
          const nodeClass = isComplete
            ? "journey-node--complete"
            : isCurrent
              ? "journey-node--current"
              : "journey-node--locked";
          const icon = isComplete ? "&#10003;" : isCurrent ? "&#9679;" : "&#128274;";
          const milestoneText = isComplete
            ? ""
            : isCurrent
              ? formatMilestoneDescriptor(stageProgress)
              : formatStaticMilestoneDescriptor(stage, state.exercises || []);
          const descText = isComplete ? "" : stage.milestone?.description || "Progress through this stage.";

          return `
            <div class="journey-node ${nodeClass}" ${isCurrent ? `style="--plan-color: ${theme.color};"` : ""}>
              <div class="journey-node__icon">${icon}</div>
              <div class="journey-node__content">
                <h3 class="journey-node__title">${escapeHtml(stage.name)}</h3>
                ${descText ? `<p class="journey-node__desc">${escapeHtml(descText)}</p>` : ""}
                ${milestoneText ? `<p class="journey-node__milestone">${escapeHtml(milestoneText)}</p>` : ""}
              </div>
            </div>
            ${index < plan.stages.length - 1 ? '<div class="journey-connector"></div>' : ""}
          `;
        })
        .join("")}
    </div>

    <div class="journey-current-stage ${isRest ? "journey-current-stage--rest" : ""}">
      <h2 class="journey-section-title">${escapeHtml(missionTitle)}</h2>
      <p class="journey-current-desc">${escapeHtml(milestoneDescription)}</p>

      <div class="journey-progress">
        <div class="journey-progress__label">${progressLabel}</div>
        <div class="journey-progress__value">${escapeHtml(progressValue)}</div>
        <div class="journey-progress__bar">
          <div class="journey-progress__fill" style="width: ${progressPct}%; background: ${theme.color};"></div>
        </div>
      </div>

      ${isStageComplete ? `
        <div style="margin-top: 16px; padding: 18px 20px; background: ${theme.color}12; border: 1px solid ${theme.color}33; border-radius: 20px;">
          <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.12em; color: ${theme.color}; font-weight: 800; margin-bottom: 8px;">${canAdvanceStage ? "Stage ready" : "Plan complete"}</div>
          <div style="color: var(--text); line-height: 1.55;">
            ${escapeHtml(canAdvanceStage
              ? `${currentStage.name || "This stage"} is complete. Advance to ${nextStage.name || "the next stage"} now, or keep this stage active and continue the current plan.`
              : `${currentStage.name || "This stage"} is complete. Archive this plan to keep it in history without leaving it active, or continue the current stage whenever you want to repeat it.`)}
          </div>
        </div>
      ` : ""}

      ${stageProgress.requiresTest ? `
        <div class="journey-rotation" style="margin-top: 16px;">
          <div class="journey-rotation__label">Milestone test</div>
          <div class="journey-rotation__schedule">${escapeHtml(stageProgress.summaryText || "No test configured.")}</div>
        </div>
      ` : ""}

      <div class="journey-rotation">
        <div class="journey-rotation__label">Journey sequence</div>
        <div class="journey-rotation__schedule">
          ${renderJourneySequence(currentStage, state.routines || [])}
        </div>
      </div>

      <div class="journey-cta-zone">
        <div style="display: grid; gap: 12px; width: min(100%, 420px); margin: 0 auto;">
          <button class="button button--primary journey-cta-large" data-action="apd-resume" type="button" style="background: ${theme.color}; color: #000; border: none; box-shadow: 0 10px 24px ${theme.color}55;">
            ${escapeHtml(primaryAction.label)}
          </button>
          ${secondaryAction ? `
            <button class="button button--ghost" data-action="apd-secondary" type="button" style="border-color: ${theme.color}44; color: ${theme.color};">
              ${escapeHtml(secondaryAction.label)}
            </button>
          ` : ""}
          <button class="button button--ghost" style="border-color: ${theme.color}44; color: ${theme.color};" data-action="apd-edit" type="button">
            Edit live plan
          </button>
          <button class="button button--ghost" style="border-color: ${theme.color}44; color: ${theme.color};" data-action="apd-import" type="button">
            Import revision
          </button>
          <button class="button button--ghost" style="border-color: ${theme.color}44; color: ${theme.color};" data-action="apd-export" type="button">
            Export active plan
          </button>
          ${primaryAction.type !== "archive" ? `
            <button class="button button--ghost" style="border-color: ${theme.color}44; color: ${theme.color};" data-action="apd-archive" type="button">
              Archive plan
            </button>
          ` : ""}
          <button class="button button--ghost" style="border-color: rgba(255,255,255,0.18); color: var(--soft);" data-action="apd-remove" type="button">
            Remove from active list
          </button>
          <input type="file" accept=".json,application/json" data-action="apd-import-file" style="display:none;">
        </div>
      </div>
    </div>
  `;

  container.appendChild(section);

  section.querySelector('[data-action="apd-back"]')?.addEventListener("click", () => {
    actions.navigate("active-plans");
  });
  const runDefaultAction = () => {
    if (defaultAction.type === "rest") {
      actions.completeRestDay(plan.id);
      return;
    }

    actions.navigate(`workout-player/${plan.id}`);
  };
  section.querySelector('[data-action="apd-resume"]')?.addEventListener("click", () => {
    if (primaryAction.type === "advance") {
      actions.advanceStage(plan.id);
      return;
    }
    if (primaryAction.type === "archive") {
      confirmAction(document.body, {
        title: "Archive this plan?",
        message:
          "Archiving removes this plan from the active queue but keeps its snapshot and completed sessions available in history.",
        confirmText: "Archive plan",
        cancelText: "Keep active",
        onConfirm: () => {
          actions.archivePlan(plan.id);
          actions.navigate("active-plans");
        },
      });
      return;
    }
    if (primaryAction.type === "test") {
      actions.navigate(`workout-player/${plan.id}/test`);
      return;
    }
    runDefaultAction();
  });
  section.querySelector('[data-action="apd-secondary"]')?.addEventListener("click", () => {
    runDefaultAction();
  });
  section.querySelector('[data-action="apd-edit"]')?.addEventListener("click", () => {
    actions.beginActivePlanEdit(plan.id);
  });
  section.querySelector('[data-action="apd-import"]')?.addEventListener("click", () => {
    section.querySelector('[data-action="apd-import-file"]')?.click();
  });
  section.querySelector('[data-action="apd-import-file"]')?.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (file) {
      await actions.importActivePlanRevision(plan.id, file);
    }
    event.target.value = "";
  });
  section.querySelector('[data-action="apd-export"]')?.addEventListener("click", () => {
    actions.exportActivePlan(plan.id);
  });
  section.querySelector('[data-action="apd-archive"]')?.addEventListener("click", () => {
    confirmAction(document.body, {
      title: "Archive this plan?",
      message:
        "Archiving removes this plan from the active queue but keeps its snapshot and completed sessions available in history.",
      confirmText: "Archive plan",
      cancelText: "Keep active",
      onConfirm: () => {
        actions.archivePlan(plan.id);
        actions.navigate("active-plans");
      },
    });
  });
  section.querySelector('[data-action="apd-remove"]')?.addEventListener("click", () => {
    confirmAction(document.body, {
      title: "Remove from active plans?",
      message:
        "This removes the live plan from your active queue. Completed workout sessions stay in history, but the live plan snapshot itself will be discarded unless you archive it instead.",
      confirmText: "Remove plan",
      cancelText: "Keep active",
      onConfirm: () => {
        actions.deleteActivePlan(plan.id);
        actions.navigate("active-plans");
      },
    });
  });
}
