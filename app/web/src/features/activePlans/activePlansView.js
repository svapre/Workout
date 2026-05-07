/**
 * Active Plans View (Dashboard)
 *
 * Renders the user's current training journeys and their progress.
 */

import { confirmAction } from "../../ui/modal.js";
import { getNextRoutine } from "./activePlanUtils.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderActivePlansView(container, { state, actions }) {
  const { activePlans, routines, workouts } = state;

  const planSessions = workouts.filter((w) => w.activePlanId);
  const now = new Date();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const workoutsThisWeek = planSessions.filter(
    (w) => new Date(w.completedAt) >= startOfWeek,
  ).length;
  const lastLog = [...planSessions].sort(
    (a, b) => new Date(b.completedAt) - new Date(a.completedAt),
  )[0];
  const lastWorkoutTime = lastLog
    ? new Date(lastLog.completedAt).toLocaleDateString()
    : "None";

  container.innerHTML = "";

  const section = document.createElement("section");
  section.className = "page page-single";

  section.innerHTML = `
    <div class="global-overview">
        <div class="global-overview__item">
            <div style="font-size: 0.75rem; color: var(--soft); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Week Workouts</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--brand);">${workoutsThisWeek}</div>
        </div>
        <div class="global-overview__divider" style="width: 1px; background: rgba(143,168,210,0.1);"></div>
        <div class="global-overview__item">
            <div style="font-size: 0.75rem; color: var(--soft); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Active Plans</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--text);">${activePlans.length}</div>
        </div>
        <div class="global-overview__divider" style="width: 1px; background: rgba(143,168,210,0.1);"></div>
        <div class="global-overview__item">
            <div style="font-size: 0.75rem; color: var(--soft); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Last Session</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--brand-2);">${lastWorkoutTime}</div>
        </div>
    </div>

    <div class="card-grid">
      ${activePlans.length === 0 ? `
        <div class="panel" style="padding: 40px; text-align: center; grid-column: 1 / -1;">
          <p class="muted" style="margin-bottom: 24px;">No active plans. Go to Plan Blueprints to start one.</p>
          <button class="button button--primary" onclick="window.location.hash='#plans'">Browse Plan Blueprints</button>
        </div>
      ` : activePlans.map((plan) => {
        const stageIndex = plan.currentStageIndex ?? 0;
        const stage = plan.stages?.[stageIndex] || { name: "Unknown Stage", schedule: [] };
        const dayInCycle = plan.currentDayInCycle ?? 1;
        const nextRoutine = getNextRoutine(plan, routines);
        const nextRoutineName = nextRoutine ? nextRoutine.name : "Rest Day";
        const lastForPlan = [...workouts]
          .filter((w) => w.activePlanId === plan.id)
          .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
        const lastRoutine = lastForPlan
          ? routines.find((r) => r.id === lastForPlan.routineId)?.name || lastForPlan.routineId || "Session"
          : "None";
        const theme = plan.theme || { color: "#4FD1C5", icon: "💪", code: "PLN" };
        const started = plan.startedAt ? new Date(plan.startedAt) : new Date();

        return `
          <div class="panel active-plan-card" style="padding: 24px; cursor: pointer; position: relative; transition: transform 0.2s, border-color 0.2s; border-left: 6px solid ${theme.color};" data-action="view-active-detail" data-plan-id="${plan.id}">
            <button class="mini-button button--danger button--ghost" 
                    style="position: absolute; top: 16px; right: 16px; z-index: 10; padding: 4px 8px; font-size: 0.75rem;" 
                    data-action="remove-active-plan" 
                    data-plan-id="${plan.id}" 
                    title="Remove from Dashboard">
              ✕
            </button>

            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <span style="font-size: 2rem; line-height: 1;">${theme.icon}</span>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="font-size: 0.65rem; color: #fff; background: ${theme.color}; font-weight: 900; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.05em;">${theme.code}</span>
                            <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(plan.name)}</h2>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--soft); line-height: 1.3;">${escapeHtml(plan.description || plan.goal || "Steady progress")}</div>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 24px; padding: 12px 0; border-top: 1px solid rgba(143,168,210,0.05); border-bottom: 1px solid rgba(143,168,210,0.05);">
                <div style="font-weight: 700; color: var(--text); font-size: 0.95rem;">
                    Stage ${stageIndex + 1} <span style="color: var(--soft); font-weight: 400; margin: 0 4px;">·</span> Day ${dayInCycle} of ${stage.schedule?.length || 7}
                </div>
                <div style="font-size: 0.8rem; color: var(--soft);">
                    Milestone: ${plan.currentCycleCount || 0} / ${stage.milestone?.target || 1} cycles
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <div style="font-size: 0.75rem; color: var(--soft); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 8px;">Next Workout</div>
                <div style="font-size: 1.2rem; font-weight: 800; color: var(--text);">
                    <span style="color: ${theme.color};">→</span> ${escapeHtml(nextRoutineName)}
                </div>
            </div>

            ${nextRoutine ? `
              <button class="button button--primary" 
                      style="width: 100%; padding: 18px; font-size: 1.1rem; font-weight: 800; background: ${theme.color}; color: #000; box-shadow: 0 8px 20px ${theme.color}33;" 
                      data-action="continue-workout" 
                      data-plan-id="${plan.id}">
                START ${nextRoutineName.toUpperCase()}
              </button>
            ` : `
              <div style="display: flex; gap: 12px; align-items: center;">
                <button class="button button--ghost" style="flex: 1; padding: 14px; border-color: rgba(143,168,210,0.2);" data-action="mark-done" data-plan-id="${plan.id}">Mark Day Done</button>
                <div style="color: var(--soft); font-size: 0.8rem; font-style: italic;">Rest Day</div>
              </div>
            `}

            <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--muted); opacity: 0.6;">
                <span>Last: ${escapeHtml(lastRoutine)}</span>
                <span>Started ${Math.floor((new Date() - started) / (1000 * 60 * 60 * 24))}d ago</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.appendChild(section);

  section.querySelectorAll('[data-action="view-active-detail"]').forEach((card) => {
    card.addEventListener("click", () => {
      actions.navigate(`active-plan/${card.dataset.planId}`);
    });
  });

  section.querySelectorAll('[data-action="continue-workout"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      actions.navigate(`workout-player/${btn.dataset.planId}`);
    });
  });

  section.querySelectorAll('[data-action="mark-done"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const plan = activePlans.find((p) => p.id === btn.dataset.planId);
      if (plan) {
        const stage = plan.stages[plan.currentStageIndex ?? 0];
        const scheduleLength = stage?.schedule?.length || 1;
        const prevDay = plan.currentDayInCycle ?? 1;
        const nextDay = (prevDay % scheduleLength) + 1;
        let currentCycleCount = plan.currentCycleCount ?? 0;
        if (prevDay === scheduleLength && nextDay === 1) {
          currentCycleCount += 1;
        }
        actions.updateActivePlan(plan.id, { currentDayInCycle: nextDay, currentCycleCount });
      }
    });
  });

  section.querySelectorAll('[data-action="remove-active-plan"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      confirmAction(document.body, {
        title: "Stop Tracking This Plan?",
        message: "Are you sure you want to stop tracking this plan? This will remove it from your active dashboard but your completed workout history will remain.",
        confirmText: "Remove Plan",
        onConfirm: () => {
          actions.deleteActivePlan(btn.dataset.planId);
        },
      });
    });
  });
}
