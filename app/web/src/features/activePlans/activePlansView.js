import { getNextRoutine, isRestDay } from "./activePlanUtils.js";
import { evaluateStageProgress } from "../plans/progressionEngine.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatRelativeDate(date) {
  const now = new Date();
  const days = Math.round((now - date) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function resolveTheme(theme = {}) {
  const rawIcon = String(theme.icon ?? "PL");
  return {
    color: theme.color || "#4FD1C5",
    icon: /Ã°|ð/.test(rawIcon) ? "PL" : rawIcon,
  };
}

function buildPlanCard(plan, routines, workouts = [], exercises = []) {
  const stageIndex = plan.currentStageIndex ?? 0;
  const stage = plan.stages?.[stageIndex] || { name: "Stage", schedule: [] };
  const nextStage = plan.stages?.[stageIndex + 1] || null;
  const dayInCycle = plan.currentDayInCycle ?? 1;
  const nextRoutine = getNextRoutine(plan, routines);
  const isRest = !nextRoutine;
  const stageProgress = evaluateStageProgress(stage, workouts, routines, plan, exercises);
  const isStageComplete = stageProgress.isComplete;
  const canAdvanceStage = isStageComplete && Boolean(nextStage);
  const canReviewCompletion = isStageComplete && !nextStage;
  const canTakeMilestoneTest = stageProgress.isReadyForTest;
  const nextRoutineName = nextRoutine?.name || "Scheduled Rest";
  const theme = resolveTheme(plan.theme);
  const accent = theme.color;
  const scheduleLength = stage.schedule?.length || 1;
  const stageLabel = stage.name || `Stage ${stageIndex + 1}`;
  const subtitleText =
    plan.description && plan.description !== plan.goal ? plan.description : stageLabel;
  const nextNote = nextRoutine?.description || stage.milestone?.description || plan.goal || plan.description;
  const missionLabel = canAdvanceStage
    ? "Stage ready"
    : canReviewCompletion
      ? "Stage complete"
      : canTakeMilestoneTest
        ? "Milestone ready"
        : isRest
          ? "Scheduled rest"
          : "Today's mission";
  const missionTitle = canAdvanceStage
    ? nextStage?.name || "Advance stage"
    : canReviewCompletion
      ? currentStageCompletionTitle(stageLabel)
      : canTakeMilestoneTest
        ? stageProgress.summaryText || "Milestone test"
        : nextRoutineName;
  const missionNote = canAdvanceStage
    ? `${stageLabel} is complete. Advance to ${nextStage?.name || "the next stage"}, or open the plan if you want to continue this stage.`
    : canReviewCompletion
      ? `${stageLabel} is complete. Open the plan to archive it or keep repeating the current stage.`
      : canTakeMilestoneTest
        ? `Eligibility is complete. ${stageProgress.summaryText || "Your milestone test"} is ready when you are.`
        : isRest
          ? "This schedule step has no routine. Complete it when you are ready to move forward."
          : nextNote || "Follow today's routine with strong form.";
  const statusText = canAdvanceStage
    ? `Ready to advance / ${stageLabel}`
    : canReviewCompletion
      ? `Final stage complete / ${stageLabel}`
      : canTakeMilestoneTest
        ? `Milestone test / ${stageLabel}`
        : isRest
          ? `Rest step / ${stageLabel}`
          : `Stage ${stageIndex + 1} / Day ${dayInCycle} of ${scheduleLength}`;
  const progressPct = isStageComplete || canTakeMilestoneTest
    ? 100
    : Math.min(100, Math.round((dayInCycle / scheduleLength) * 100));
  const progressText = canAdvanceStage
    ? `Advance to ${nextStage?.name || "the next stage"}`
    : canReviewCompletion
      ? "Review final-stage completion"
      : canTakeMilestoneTest
        ? "Milestone test unlocked"
        : `${dayInCycle} / ${scheduleLength} day${scheduleLength === 1 ? "" : "s"}`;
  const ctaStyle = canAdvanceStage || canTakeMilestoneTest
    ? `style="background: ${accent}; color: #000; border: none; box-shadow: 0 10px 24px ${accent}55;"`
    : canReviewCompletion
      ? `style="border-color: ${accent}44; color: ${accent};"`
      : isRest
        ? ""
        : `style="background: ${accent}; color: #000; border: none; box-shadow: 0 10px 24px ${accent}55;"`;
  const cta = canAdvanceStage
    ? {
        action: "advance-stage",
        label: `Advance to ${nextStage?.name || "Next stage"}`,
        className: "button--primary",
      }
    : canReviewCompletion
      ? {
          action: "open-plan",
          label: "Review completed stage",
          className: "button--ghost",
        }
      : canTakeMilestoneTest
        ? {
            action: "start-test",
            label: "Take milestone test",
            className: "button--primary",
          }
        : isRest
          ? {
              action: "mark-rest",
              label: "Complete rest step",
              className: "button--ghost",
            }
          : {
              action: "start-workout",
              label: "Start workout",
              className: "button--primary",
            };

  return `
    <article class="plan-card ${isRest ? "plan-card--rest" : ""}" style="--plan-color: ${accent};" data-action="plan-card" data-plan-id="${plan.id}">
      <div class="plan-card__top">
        <div class="plan-card__icon">${escapeHtml(theme.icon)}</div>
        <div class="plan-card__info">
          <h2 class="plan-card__title">${escapeHtml(plan.displayName || plan.name)}</h2>
          <p class="plan-card__subtitle">${escapeHtml(subtitleText)}</p>
        </div>
      </div>

      <div class="plan-card__mission">
        <div class="plan-card__mission-label">${escapeHtml(missionLabel)}</div>
        <h3 class="plan-card__mission-title">${escapeHtml(missionTitle)}</h3>
        <p class="plan-card__mission-note">${escapeHtml(missionNote)}</p>
      </div>

      <div class="plan-card__progress">
        <div class="plan-card__progress-title">${escapeHtml(statusText)}</div>
        <div class="plan-card__progress-bar">
          <div class="plan-card__progress-fill" style="width: ${progressPct}%;"></div>
        </div>
        <div class="plan-card__progress-text">${escapeHtml(progressText)}</div>
      </div>

      <button class="button plan-card__cta ${cta.className}" ${ctaStyle} type="button" data-action="${cta.action}" data-plan-id="${plan.id}">
        ${escapeHtml(cta.label)}
      </button>
    </article>
  `;
}

function currentStageCompletionTitle(stageLabel) {
  return stageLabel === "Stage" ? "Current stage complete" : `${stageLabel} complete`;
}

export function renderActivePlansView(container, { state, actions }) {
  const activePlans = state.activePlans || [];
  const routines = state.routines || [];
  const workouts = state.workouts || [];

  const planSessions = workouts.filter((workout) => workout.activePlanId);
  const lastLog = [...planSessions].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
  const lastWorkoutText = lastLog
    ? `Last workout ${formatRelativeDate(new Date(lastLog.completedAt))}`
    : "No workouts yet";
  const greeting = getGreeting();
  const workoutPlans = activePlans.filter((plan) => !isRestDay(plan));
  const restPlans = activePlans.filter((plan) => isRestDay(plan));

  container.innerHTML = "";
  const section = document.createElement("section");
  section.className = "page page-single";

  section.innerHTML = `
    <div class="dashboard-arrival">
      <h1 class="dashboard-arrival__headline">${greeting}</h1>
      <div class="dashboard-arrival__subline">${activePlans.length} active plan${activePlans.length === 1 ? "" : "s"} / ${lastWorkoutText}</div>
    </div>

    ${activePlans.length === 0 ? `
      <div class="panel panel--section">
        <div class="panel__body" style="text-align: center;">
          <p style="color: var(--muted); margin-bottom: 20px;">No active plans yet. Start a training blueprint to make today's session automatic.</p>
          <button class="button button--primary" type="button" data-action="browse-blueprints">Browse Plans</button>
        </div>
      </div>
    ` : `
      ${workoutPlans.length ? `
        <div class="dashboard-section">
          <div class="dashboard-section__header">
            <div>
              <div class="dashboard-section__label">Ready to train</div>
              <div class="dashboard-section__description">Plans with a routine scheduled for today.</div>
            </div>
          </div>
          <div class="plan-card-grid">
            ${workoutPlans.map((plan) => buildPlanCard(plan, routines, workouts, state.exercises || [])).join("")}
          </div>
        </div>
      ` : ""}

      ${restPlans.length ? `
        <div class="dashboard-section">
          <div class="dashboard-section__header">
            <div>
              <div class="dashboard-section__label">Scheduled rest</div>
              <div class="dashboard-section__description">Plan-authored rest steps that keep the journey moving.</div>
            </div>
          </div>
          <div class="plan-card-grid">
            ${restPlans.map((plan) => buildPlanCard(plan, routines, workouts, state.exercises || [])).join("")}
          </div>
        </div>
      ` : ""}
    `}
  `;

  container.appendChild(section);

  section.querySelectorAll('[data-action="plan-card"]').forEach((card) => {
    card.addEventListener("click", () => {
      actions.navigate(`active-plan/${card.dataset.planId}`);
    });
  });

  section.querySelectorAll('[data-action="start-workout"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.navigate(`workout-player/${button.dataset.planId}`);
    });
  });

  section.querySelectorAll('[data-action="mark-rest"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.completeRestDay(button.dataset.planId);
    });
  });

  section.querySelectorAll('[data-action="advance-stage"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.advanceStage(button.dataset.planId);
    });
  });

  section.querySelectorAll('[data-action="start-test"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.navigate(`workout-player/${button.dataset.planId}/test`);
    });
  });

  section.querySelectorAll('[data-action="open-plan"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.navigate(`active-plan/${button.dataset.planId}`);
    });
  });

  section.querySelector('[data-action="browse-blueprints"]')?.addEventListener("click", () => {
    actions.navigate("plans");
  });
}
