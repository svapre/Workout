import { getNextRoutine } from "./activePlanUtils.js";
import { evaluateStageProgress } from "../plans/progressionEngine.js";
import { buildStageStudyModel } from "../plans/stageStudy.js";
import { enhanceStageJourneyModel, renderJourneyNode } from "../plans/journeyNodes.js";
import { confirmAction } from "../../ui/modal.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseRouteId(route) {
  return String(route || "").split("/")[1] || "";
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown time";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEligibilityDescriptor(progress) {
  const eligibility = progress.eligibility || {};

  if (eligibility.type === "none") {
    return progress.requiresTest
      ? "Milestone test can be attempted any time."
      : "Stage can be advanced any time.";
  }

  if (eligibility.type === "sessions") {
    return `Unlock after ${eligibility.target} logged session${eligibility.target === 1 ? "" : "s"} in this stage.`;
  }

  if (eligibility.requiresContinuous) {
    return `Unlock after ${eligibility.target} consecutive cycle completion${eligibility.target === 1 ? "" : "s"}.`;
  }

  return `Unlock after ${eligibility.target} cycle completion${eligibility.target === 1 ? "" : "s"} in this stage.`;
}

function formatMilestoneDescriptor(progress) {
  if (progress.requiresTest && progress.test.exerciseId) {
    return progress.isReadyForTest || progress.isComplete
      ? `Test unlocked: ${progress.summaryText}`
      : `Milestone test: ${progress.summaryText}`;
  }

  return formatEligibilityDescriptor(progress);
}

function buildRecentSessions(planId, workouts = [], routines = []) {
  const routineIndex = new Map((routines || []).map((routine) => [routine.id, routine]));
  return (workouts || [])
    .filter((workout) => workout.activePlanId === planId)
    .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
    .slice(0, 5)
    .map((workout) => ({
      id: workout.id,
      completedAt: workout.completedAt,
      sessionType: workout.sessionType || "routine",
      title:
        workout.sessionType === "milestone_test"
          ? "Milestone test"
          : routineIndex.get(workout.routineId)?.name || workout.routineName || "Routine session",
      reflectionRating: workout.reflectionRating,
    }));
}

function bindJourneyNode(node, handler) {
  node.addEventListener("click", handler);
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler();
    }
  });
}

function formatSessionFeel(value) {
  const cleanValue = String(value ?? "").trim();
  if (!cleanValue) {
    return "Not rated";
  }
  return cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1);
}

function renderCompactRoadmap(stageModels = [], options = {}) {
  if (!stageModels.length) {
    return `<p class="muted">${escapeHtml(options.emptyText || "No stages defined yet.")}</p>`;
  }

  const hiddenObjectiveStageIds = new Set(options.hiddenObjectiveStageIds || []);

  return `
    <div class="journey-path journey-path--compact">
      ${stageModels.map((model) => renderJourneyNode(model, {
        actionName: "open-active-plan-study",
        interactive: true,
        actionKind: "navigate",
        affordanceLabel: "Study stage",
        actionHintLabel: "Tap this stage to open Study",
        compact: true,
        showObjective: !hiddenObjectiveStageIds.has(model.id),
        showSequence: false,
        showEstimate: false,
      })).join("")}
    </div>
  `;
}

function describeStagePurpose(stage, { isRest = false, canTakeMilestoneTest = false } = {}) {
  if (stage?.guidance) {
    return stage.guidance;
  }

  if (canTakeMilestoneTest) {
    return "Milestone conditions are met. Run the test when you are ready to validate this stage.";
  }

  if (isRest) {
    return "Use the current rest step exactly as written so the plan cadence stays intact.";
  }

  return "Complete this stage with steady form until the milestone clears.";
}

function describeUnlockLine(progress, nextStage, { canAdvanceStage = false, canArchivePlan = false } = {}) {
  if (canAdvanceStage) {
    return `${nextStage?.name || "Next stage"} is unlocked now.`;
  }

  if (canArchivePlan) {
    return "Final stage complete. Archive this journey or keep reinforcing the last stage.";
  }

  if (progress.requiresTest && progress.test.exerciseId) {
    return progress.isReadyForTest || progress.isComplete
      ? `Milestone test ready: ${progress.summaryText}`
      : `Milestone gate: ${progress.summaryText}`;
  }

  if (nextStage?.name) {
    return `${formatEligibilityDescriptor(progress).replace(/^Unlock/, `Unlock ${nextStage.name}`)}`;
  }

  return formatMilestoneDescriptor(progress);
}

export function renderActivePlanDetailView(container, { state, actions }) {
  const planId = parseRouteId(state.route);
  const plan = (state.activePlans || []).find((entry) => entry.id === planId) || null;

  if (!plan) {
    container.innerHTML = `
      <section class="page page-single">
        <section class="panel panel--section">
          <div class="panel__body">
            <div class="empty-state">
              <h3>Plan not found</h3>
              <p>The active plan you are looking for does not exist or has been removed.</p>
            </div>
          </div>
        </section>
      </section>
    `;
    return;
  }

  const stageIndex = plan.currentStageIndex ?? 0;
  const currentStage = plan.stages?.[stageIndex] || { name: "Unknown Stage", guidance: "" };
  const nextStage = plan.stages?.[stageIndex + 1] || null;
  const nextRoutine = getNextRoutine(plan, state.routines);
  const isRest = !nextRoutine;
  const rawTheme = plan.theme || {};
  const theme = {
    color: rawTheme.color || "#4FD1C5",
    icon: String(rawTheme.icon || "PL"),
  };
  const stageProgress = evaluateStageProgress(
    currentStage,
    state.workouts || [],
    state.routines || [],
    plan,
    state.exercises || [],
  );
  const recentSessions = buildRecentSessions(plan.id, state.workouts, state.routines);
  const stageModels = (plan.stages || []).map((stage, index) => enhanceStageJourneyModel(
    buildStageStudyModel(stage, state.routines || [], state.exercises || [], {
      isCurrent: index === stageIndex,
      stateLabel: index < stageIndex ? "Completed" : index === stageIndex ? "Current" : "Locked",
    }),
    {
      sequenceIndex: index + 1,
      pathState: index < stageIndex ? "complete" : index === stageIndex ? "current" : "locked",
    },
  ));

  const canTakeMilestoneTest = stageProgress.isReadyForTest;
  const isStageComplete = stageProgress.isComplete;
  const canAdvanceStage = isStageComplete && Boolean(nextStage);
  const canArchivePlan = isStageComplete && !nextStage;
  const defaultAction = isRest
    ? { type: "rest", label: "Complete rest step" }
    : { type: "session", label: "Start workout" };
  const primaryAction = canAdvanceStage
    ? { type: "advance", label: `Advance to ${nextStage.name || "Next stage"}` }
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

  const stageCount = Math.max(plan.stages?.length || 1, 1);
  const stageStateLabel = canAdvanceStage
    ? "Ready to advance"
    : canArchivePlan
      ? "Plan complete"
      : canTakeMilestoneTest
        ? "Milestone test ready"
        : isRest
          ? "Rest step"
          : "Current stage";
  const progressLabel = stageProgress.requiresTest ? "Eligibility" : "Progress";
  const stageLine = `Stage ${stageIndex + 1} of ${stageCount}`;
  const stagePurpose = describeStagePurpose(currentStage, { isRest, canTakeMilestoneTest });
  const unlockLine = describeUnlockLine(stageProgress, nextStage, { canAdvanceStage, canArchivePlan });
  const nextActionLine = canAdvanceStage
    ? `Advance to ${nextStage?.name || "the next stage"} whenever you are ready.`
    : canArchivePlan
      ? "This journey has reached its final unlock. Archive it or keep the last stage active."
      : canTakeMilestoneTest
        ? "The milestone test is ready. Run it now or continue reinforcing this stage first."
        : isRest
          ? "No routine is scheduled here. Complete the rest step when you are ready to move on."
          : nextRoutine?.name
            ? `Next session: ${nextRoutine.name}`
            : "Continue the current stage when you are ready.";
  const baseCurrentStageModel = stageModels[stageIndex] || enhanceStageJourneyModel(buildStageStudyModel(currentStage, state.routines || [], state.exercises || []), {
      sequenceIndex: stageIndex + 1,
      pathState: "current",
    });
  const currentStageModel = {
    ...baseCurrentStageModel,
    objectiveLine: baseCurrentStageModel.objectiveLine || stagePurpose,
    milestoneLine: unlockLine,
    stateLabel: stageStateLabel,
  };
  const laterStageModels = stageModels.filter((model) => model.id !== currentStageModel.id);

  container.innerHTML = `
    <section class="page page-single">
      <div class="journey-hero journey-hero--compact journey-hero--strip" style="--plan-color: ${theme.color};">
        <div class="journey-hero__compact-top">
          <div class="journey-hero__icon">${escapeHtml(theme.icon)}</div>
          <div class="journey-hero__identity">
            <span class="panel__eyebrow">Active plan</span>
            <h1 class="journey-hero__title">${escapeHtml(plan.displayName || plan.name)}</h1>
            <p class="journey-hero__summary">${escapeHtml(`${stageLine} / active plan`)}</p>
          </div>
        </div>
      </div>

      <section class="panel panel--section">
        <div class="panel__header">
          <div>
            <span class="panel__eyebrow">Now</span>
            <h2 class="panel__title">Current stage</h2>
          </div>
        </div>
        <div class="panel__body stack">
          <div class="journey-now-card" style="--plan-color: ${theme.color}; border-color: ${theme.color}33; box-shadow: inset 0 0 0 1px ${theme.color}11;">
            ${renderJourneyNode(currentStageModel, {
              showIndex: true,
              showStateBadge: true,
              showSequence: false,
              showEstimate: false,
            })}
          </div>

          <div class="journey-cta-zone">
            <div class="journey-cta-actions">
              <button class="button button--primary journey-cta-large" data-action="apd-primary" type="button" style="background: ${theme.color}; color: #000; border: none; box-shadow: 0 10px 24px ${theme.color}55;">
                ${escapeHtml(primaryAction.label)}
              </button>
              ${secondaryAction ? `
                <button class="button button--secondary" data-action="apd-secondary" type="button" style="border-color: ${theme.color}44; color: ${theme.color};">
                  ${escapeHtml(secondaryAction.label)}
                </button>
              ` : ""}
              <button class="button button--ghost" data-action="study-plan" type="button">View plan guide</button>
              <input type="file" accept=".json,application/json" data-action="apd-import-file" style="display:none;">
            </div>
          </div>


        </div>
      </section>

      <section class="panel panel--section">
        <div class="panel__header">
          <div>
            <span class="panel__eyebrow">Stages</span>
            <h2 class="panel__title">Later stages</h2>
          </div>
        </div>
        <div class="panel__body" style="--plan-color: ${theme.color};">
          ${renderCompactRoadmap(laterStageModels, { emptyText: "No later stages in this plan yet." })}
        </div>
      </section>

      <section class="panel panel--section">
        <div class="panel__header">
          <div>
            <span class="panel__eyebrow">Recent activity</span>
            <h2 class="panel__title">Recent sessions</h2>
            <p class="panel__copy">Recent sessions from this active plan stay here. Open History when you want the full timeline.</p>
          </div>
          <div class="panel__header-actions">
            <button class="button button--secondary" data-action="apd-history" type="button">Open history</button>
          </div>
        </div>
        <div class="panel__body">
          ${recentSessions.length ? `
            <div class="timeline-list">
              ${recentSessions.map((session, index) => `
                <button class="timeline-item timeline-item--button" type="button" data-action="apd-session" data-session-id="${session.id}">
                  <div class="timeline-item__row">
                    <div class="timeline-item__index">${index + 1}</div>
                    <div class="timeline-item__content">
                      <h3 class="timeline-item__title">${escapeHtml(session.title)}</h3>
                      <div class="timeline-item__badges">
                        <span class="badge badge--muted">${escapeHtml(formatDateTime(session.completedAt))}</span>
                        <span class="badge badge--muted">${escapeHtml(session.sessionType === "milestone_test" ? "Milestone test" : "Routine session")}</span>
                        ${session.reflectionRating ? `<span class="badge badge--accent">Felt ${escapeHtml(formatSessionFeel(session.reflectionRating).toLowerCase())}</span>` : ""}
                      </div>
                    </div>
                    <span class="timeline-item__nav">Open in History &rsaquo;</span>
                  </div>
                </button>
              `).join("")}
            </div>
          ` : `<p class="muted">No completed sessions for this plan yet.</p>`}
        </div>
      </section>

      <div class="journey-support-grid">
        <details class="journey-advanced">
          <summary class="journey-advanced__summary">Plan tools</summary>
          <div class="journey-advanced__content">
            <p class="journey-support-panel__copy">Update the live plan or bring in plan updates without crowding the current focus view.</p>
            <div class="action-stack">
              <button class="button button--secondary" style="border-color: ${theme.color}44; color: ${theme.color};" data-action="apd-edit" type="button">
                Edit live plan
              </button>
              <button class="button button--secondary" style="border-color: ${theme.color}44; color: ${theme.color};" data-action="apd-import" type="button">
                Import plan update
              </button>
              <button class="button button--secondary" style="border-color: ${theme.color}44; color: ${theme.color};" data-action="apd-export" type="button">
                Export active plan
              </button>
            </div>
          </div>
        </details>

        <details class="journey-advanced journey-advanced--danger">
          <summary class="journey-advanced__summary">Plan status</summary>
          <div class="journey-advanced__content">
            <p class="journey-support-panel__copy">These actions change whether the plan stays in your live queue. History snapshots and completed sessions stay reviewable either way.</p>
            <div class="action-stack">
              ${primaryAction.type !== "archive" ? `
                <button class="button button--secondary" style="border-color: ${theme.color}44; color: ${theme.color};" data-action="apd-archive" type="button">
                  Archive plan
                </button>
              ` : ""}
              <button class="button button--danger" data-action="apd-remove" type="button">
                Remove from active list
              </button>
            </div>
          </div>
        </details>
      </div>
    </section>
  `;

  const runDefaultAction = () => {
    if (defaultAction.type === "rest") {
      actions.completeRestDay(plan.id);
      return;
    }

    actions.navigate(`workout-player/${plan.id}`);
  };

  container.querySelector('[data-action="apd-primary"]')?.addEventListener("click", () => {
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

  container.querySelector('[data-action="apd-secondary"]')?.addEventListener("click", () => {
    runDefaultAction();
  });

  container.querySelector('[data-action="study-plan"]')?.addEventListener("click", () => {
    actions.openActivePlanStudy(plan.id, "", state.route);
  });

  container.querySelectorAll('[data-action="open-active-plan-study"]').forEach((button) => {
    bindJourneyNode(button, () => {
      actions.openActivePlanStudy(plan.id, button.dataset.stageId, state.route);
    });
  });

  container.querySelectorAll('[data-action="open-routine"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      actions.openRoutineDetail(button.dataset.routineId, state.route);
    });
  });

  container.querySelector('[data-action="apd-history"]')?.addEventListener("click", () => {
    actions.viewHistoryForPlan(plan.id);
  });

  container.querySelectorAll('[data-action="apd-session"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.selectWorkout(button.dataset.sessionId);
      actions.viewHistoryForPlan(plan.id);
    });
  });

  container.querySelector('[data-action="apd-edit"]')?.addEventListener("click", () => {
    actions.beginActivePlanEdit(plan.id);
  });

  container.querySelector('[data-action="apd-import"]')?.addEventListener("click", () => {
    container.querySelector('[data-action="apd-import-file"]')?.click();
  });

  container.querySelector('[data-action="apd-import-file"]')?.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (file) {
      await actions.importActivePlanRevision(plan.id, file);
    }
    event.target.value = "";
  });

  container.querySelector('[data-action="apd-export"]')?.addEventListener("click", () => {
    actions.exportActivePlan(plan.id);
  });

  container.querySelector('[data-action="apd-archive"]')?.addEventListener("click", () => {
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

  container.querySelector('[data-action="apd-remove"]')?.addEventListener("click", () => {
    confirmAction(document.body, {
      title: "Remove from active plans?",
      message:
        "This removes the live plan from your active queue. The plan snapshot and all completed sessions will stay available in history as a read-only removed journey.",
      confirmText: "Remove plan",
      cancelText: "Keep active",
      onConfirm: () => {
        actions.deleteActivePlan(plan.id);
        actions.navigate("active-plans");
      },
    });
  });
}


