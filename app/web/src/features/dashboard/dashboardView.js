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

function renderSummaryCard(plan, routines, workouts, exercises) {
  const stageIndex = plan.currentStageIndex ?? 0;
  const stage = plan.stages?.[stageIndex] || { name: "Stage", schedule: [] };
  const scheduleEntry = stage.schedule?.[Math.max(0, (plan.currentDayInCycle ?? 1) - 1)] || {};
  const isRest = scheduleEntry.type === "rest";
  const nextRoutine = routines.find((routine) => routine.id === scheduleEntry.routineId);
  const nextRoutineName = nextRoutine?.name || (isRest ? "Recovery Day" : "Today's session");
  const theme = resolveTheme(plan.theme);
  const stageProgress = evaluateStageProgress(stage, workouts || [], routines || [], plan, exercises || []);
  const { current: progressCurrent, target: progressTarget } = resolveProgressMeter(stageProgress);
  const progressPct = Math.min(100, Math.round((progressCurrent / progressTarget) * 100));
  const scheduleLength = stage.schedule?.length || 1;
  const stageLabel = stage.name ? escapeHtml(stage.name) : `Stage ${stageIndex + 1}`;
  const statusText = isRest
    ? `Rest phase / ${stageLabel}`
    : `Stage ${stageIndex + 1} / Day ${plan.currentDayInCycle ?? 1} of ${scheduleLength}`;

  return `
    <article class="plan-card ${isRest ? "plan-card--rest" : ""}" style="--plan-color: ${theme.color};" data-action="view-plan" data-plan-id="${plan.id}">
      <div class="plan-card__top">
        <div class="plan-card__icon">${escapeHtml(theme.icon)}</div>
        <div class="plan-card__info">
          <h2 class="plan-card__title">${escapeHtml(plan.displayName || plan.name)}</h2>
          <p class="plan-card__subtitle">${escapeHtml(plan.goal || plan.description || "Built for consistency.")}</p>
        </div>
      </div>

      <div class="plan-card__mission">
        <div class="plan-card__mission-label">${isRest ? "Recovery focus" : "Today's mission"}</div>
        <h3 class="plan-card__mission-title">${escapeHtml(nextRoutineName)}</h3>
        <p class="plan-card__mission-note">${escapeHtml(isRest ? "A lighter day to recover, restore, and get ready for the next workout." : plan.goal || "Move with intent and follow today's plan.")}</p>
      </div>

      <div class="plan-card__progress">
        <div class="plan-card__progress-title">${escapeHtml(statusText)}</div>
        <div class="plan-card__progress-bar">
          <div class="plan-card__progress-fill" style="width: ${progressPct}%;"></div>
        </div>
        <div class="plan-card__progress-text">${escapeHtml(stageProgress.progressText)}</div>
      </div>
    </article>
  `;
}

export function renderDashboardView(container, { state, actions }) {
  const activePlans = state.activePlans || [];
  const workouts = state.workouts || [];
  const planSessions = workouts.filter((workout) => workout.activePlanId);
  const lastLog = [...planSessions].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];

  const lastWorkoutText = lastLog
    ? `Last workout ${formatRelativeDate(new Date(lastLog.completedAt))}`
    : "No workouts yet";
  const greeting = getGreeting();

  container.innerHTML = `
    <section class="page page-single">
      <div class="dashboard-arrival">
        <h1 class="dashboard-arrival__headline">${greeting}</h1>
        <div class="dashboard-arrival__subline">${activePlans.length} active plan${activePlans.length === 1 ? "" : "s"} / ${lastWorkoutText}</div>
      </div>

      ${activePlans.length === 0 ? `
        <div class="panel panel--section">
          <div class="panel__body" style="text-align: center;">
            <p style="color: var(--muted); margin-bottom: 20px;">No active plans yet. Activate a plan to start training.</p>
            <button class="button button--primary" data-action="go-to-plans" type="button">Browse Plans</button>
          </div>
        </div>
      ` : `
        <div class="dashboard-section">
          <div class="dashboard-section__header">
            <div>
              <div class="dashboard-section__label">Ready to train</div>
              <div class="dashboard-section__description">Your current plans and what to execute next.</div>
            </div>
          </div>
          <div class="plan-card-grid">
            ${activePlans.map((plan) => renderSummaryCard(plan, state.routines || [], state.workouts || [], state.exercises || [])).join("")}
          </div>
        </div>
      `}
    </section>
  `;

  container.querySelector('[data-action="go-to-plans"]')?.addEventListener("click", () => {
    actions.navigate("plans");
  });

  container.querySelectorAll('[data-action="view-plan"]').forEach((card) => {
    card.addEventListener("click", () => {
      actions.navigate(`active-plan/${card.dataset.planId}`);
    });
  });
}
