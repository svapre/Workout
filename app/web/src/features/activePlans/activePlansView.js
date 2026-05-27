import { getNextRoutine, isRestDay } from "./activePlanUtils.js";
import { evaluateStageProgress } from "../plans/progressionEngine.js";
import { resolvePlanAccent } from "../../ui/semanticColors.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function truncate(value, maxLength = 120) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
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

function formatStageCompactLabel(sequenceIndex, name) {
  const cleanName = String(name ?? "").trim();
  return cleanName ? `Stage ${sequenceIndex} / ${cleanName}` : `Stage ${sequenceIndex}`;
}

function formatScheduledStepLabel(stepCount) {
  return `${stepCount} planned step${stepCount === 1 ? "" : "s"}`;
}

function hexToRgbList(hex) {
  const raw = String(hex || "").trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) {
    return "79, 209, 197";
  }
  return [0, 2, 4].map((index) => parseInt(raw.slice(index, index + 2), 16)).join(", ");
}

function resolveTheme(plan) {
  const theme = plan?.theme || {};
  const rawIcon = String(theme.icon ?? "PL");
  const color = resolvePlanAccent(plan);
  return {
    color,
    colorRgb: hexToRgbList(color),
    icon: /ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°|ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°/.test(rawIcon) ? "PL" : rawIcon,
  };
}

function buildPlanCard(plan, routines, workouts = [], exercises = []) {
  const stageIndex = plan.currentStageIndex ?? 0;
  const stage = plan.stages?.[stageIndex] || { name: "Stage", schedule: [] };
  const nextStage = plan.stages?.[stageIndex + 1] || null;
  const stepInCycle = plan.currentDayInCycle ?? 1;
  const nextRoutine = getNextRoutine(plan, routines);
  const isRest = !nextRoutine;
  const stageProgress = evaluateStageProgress(stage, workouts, routines, plan, exercises);
  const isStageComplete = stageProgress.isComplete;
  const canAdvanceStage = isStageComplete && Boolean(nextStage);
  const canReviewCompletion = isStageComplete && !nextStage;
  const canTakeMilestoneTest = stageProgress.isReadyForTest;
  const theme = resolveTheme(plan);
  const accent = theme.color;
  const scheduleLength = stage.schedule?.length || 1;
  const totalStages = plan.stages?.length || 1;
  const stageName = stage.name || "Current stage";
  const stageLabel = formatStageCompactLabel(stageIndex + 1, stageName);
  const missionLabel = canAdvanceStage
    ? "Stage unlocked"
    : canReviewCompletion
      ? "Plan complete"
      : canTakeMilestoneTest
        ? "Test ready"
        : isRest
          ? "Rest today"
          : "Train today";
  const progressText = canAdvanceStage
    ? `Advance to ${nextStage?.name || "the next stage"}`
    : canReviewCompletion
      ? "Review final-stage completion"
      : canTakeMilestoneTest
        ? "Milestone test unlocked"
        : stageProgress.progressText || `${stepInCycle} / ${scheduleLength} steps`;
  const primaryStyle = canAdvanceStage || canTakeMilestoneTest || (!isRest && !canReviewCompletion)
    ? `style="background: ${accent}; color: #000; border: none; box-shadow: 0 10px 24px ${accent}55;"`
    : canReviewCompletion
      ? `style="border-color: ${accent}44; color: ${accent};"`
      : "";
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
  const secondaryCta = cta.action === "open-plan"
    ? null
    : {
        action: "open-plan",
        label: "View plan guide",
        className: "button--ghost plan-card__cta--secondary",
      };
  const commitmentText = `${totalStages} stage${totalStages === 1 ? "" : "s"} / ${formatScheduledStepLabel(scheduleLength)}`;
  const stageTrackLabel = `Stage progress: ${Math.min(stageIndex + 1, totalStages)} of ${totalStages}`;
  const stageTrack = (plan.stages || []).map((entry, index) => {
    const state = index < stageIndex || ((canAdvanceStage || canReviewCompletion) && index === stageIndex)
      ? "complete"
      : index === stageIndex
        ? "current"
        : "upcoming";
    const currentName = entry?.name || `Stage ${index + 1}`;
    return `
      <span class="plan-card__stage-stop plan-card__stage-stop--${state}" title="${escapeHtml(currentName)}"></span>
      ${index < totalStages - 1 ? `<span class="plan-card__stage-link plan-card__stage-link--${state}"></span>` : ""}
    `;
  }).join("");

  return `
    <article class="plan-card plan-card--index ${isRest ? "plan-card--rest" : ""}" style="--plan-color: ${accent}; --plan-color-rgb: ${theme.colorRgb};" data-action="plan-card" data-plan-id="${plan.id}">
      <div class="plan-card__top">
        <div class="plan-card__icon">${escapeHtml(theme.icon)}</div>
        <div class="plan-card__info">
          <h2 class="plan-card__title">${escapeHtml(plan.displayName || plan.name)}</h2>
        </div>
      </div>

      <div class="plan-card__label-row">
        <span class="plan-card__tag plan-card__tag--accent">${escapeHtml(stageLabel)}</span>
        <span class="plan-card__tag">${escapeHtml(missionLabel)}</span>
        <span class="plan-card__tag">${escapeHtml(commitmentText)}</span>
      </div>

      <div class="plan-card__stage-track" role="img" aria-label="${escapeHtml(stageTrackLabel)}">
        ${stageTrack}
      </div>
      <div class="plan-card__stage-track-meta">${escapeHtml(stageTrackLabel)}</div>

      <div class="plan-card__adoption plan-card__adoption--index">
        <div class="plan-card__adoption-item">
          <div class="plan-card__adoption-label">Current stage</div>
          <div class="plan-card__adoption-value">${escapeHtml(stageLabel)}</div>
        </div>
        <div class="plan-card__adoption-item">
          <div class="plan-card__adoption-label">Progress</div>
          <div class="plan-card__adoption-value">${escapeHtml(progressText)}</div>
        </div>
      </div>

      <div class="plan-card__actions">
        <button class="button plan-card__cta ${cta.className}" ${primaryStyle} type="button" data-action="${cta.action}" data-plan-id="${plan.id}">
          ${escapeHtml(cta.label)}
        </button>
        ${secondaryCta ? `
          <button class="button plan-card__cta ${secondaryCta.className}" type="button" data-action="${secondaryCta.action}" data-plan-id="${plan.id}">
            ${escapeHtml(secondaryCta.label)}
          </button>
        ` : ""}
      </div>
    </article>
  `;
}

function renderDashboardSection(title, description, count, plans, routines, workouts, exercises) {
  if (!plans.length) {
    return "";
  }

  return `
    <section class="dashboard-section dashboard-section--panel">
      <div class="dashboard-section__header">
        <div>
          <div class="dashboard-section__label">${escapeHtml(title)}</div>
          ${description ? `<div class="dashboard-section__description">${escapeHtml(description)}</div>` : ""}
        </div>
        <span class="dashboard-section__count">${count} plan${count === 1 ? "" : "s"}</span>
      </div>
      <div class="plan-card-grid plan-card-grid--dashboard">
        ${plans.map((plan) => buildPlanCard(plan, routines, workouts, exercises)).join("")}
      </div>
    </section>
  `;
}

export function renderActivePlansView(container, { state, actions }) {
  const activePlans = state.activePlans || [];
  const routines = state.routines || [];
  const workouts = state.workouts || [];
  const exercises = state.exercises || [];

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
      <div class="dashboard-arrival__actions">
        <input class="hidden" data-role="active-plan-import-input" type="file" accept=".json,application/json">
        <button class="button button--ghost" type="button" data-action="import-active-plan">Import plan package</button>
      </div>
      ${activePlans.length ? `
        <div class="dashboard-arrival__metrics">
          <span class="dashboard-arrival__metric">${workoutPlans.length} ready</span>
          <span class="dashboard-arrival__metric">${restPlans.length} rest</span>
        </div>
      ` : ""}
    </div>

    ${activePlans.length === 0 ? `
      <div class="panel panel--section">
        <div class="panel__body" style="text-align: center;">
          <p style="color: var(--muted); margin-bottom: 20px;">No active plans yet. Start from a plan template to make today's session automatic.</p>
          <div class="form-actions" style="justify-content: center;">
            <button class="button button--ghost" type="button" data-action="import-active-plan">Import plan package</button>
            <button class="button button--primary" type="button" data-action="browse-blueprints">Browse Plans</button>
          </div>
        </div>
      </div>
    ` : `
      <div class="dashboard-board">
        ${renderDashboardSection(
          "Ready to train",
          "",
          workoutPlans.length,
          workoutPlans,
          routines,
          workouts,
          exercises,
        )}
        ${renderDashboardSection(
          "Scheduled rest",
          "",
          restPlans.length,
          restPlans,
          routines,
          workouts,
          exercises,
        )}
      </div>
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

  const importInput = section.querySelector('[data-role="active-plan-import-input"]');
  section.querySelectorAll('[data-action="import-active-plan"]').forEach((button) => {
    button.addEventListener("click", () => {
      importInput?.click();
    });
  });
  importInput?.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (file) {
      await actions.importActivePlanPackage(file);
    }
    event.target.value = "";
  });
}






