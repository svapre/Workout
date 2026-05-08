function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) {
    return "-";
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

function formatDateLabel(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTimeLabel(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function workoutDurationSec(workout) {
  if (workout.workoutDurationSec != null) return workout.workoutDurationSec;
  const startedAt = new Date(workout.startedAt).getTime();
  const completedAt = new Date(workout.completedAt).getTime();
  return Number.isFinite(startedAt) && Number.isFinite(completedAt)
    ? Math.round((completedAt - startedAt) / 1000)
    : 0;
}

function workoutLabelDate(workout) {
  return workout.workoutDate || (workout.startedAt ? String(workout.startedAt).slice(0, 10) : "");
}

function groupSets(sets, exercises) {
  const groups = new Map();
  sets.forEach((set) => {
    const name =
      exercises.find((exercise) => exercise.id === set.exerciseId)?.name ||
      set.exerciseId ||
      "Exercise";
    if (!groups.has(name)) {
      groups.set(name, []);
    }
    groups.get(name).push(set);
  });
  return [...groups.entries()];
}

function resolveRoutineName(workout, routines, exercises = []) {
  if (workout?.sessionType === "milestone_test") {
    const exerciseName =
      exercises.find((exercise) => exercise.id === workout?.milestoneTest?.exerciseId)?.name ||
      exercises.find((exercise) => exercise.id === workout?.sets?.[0]?.exerciseId)?.name ||
      "Milestone";
    return `Milestone Test / ${exerciseName}`;
  }

  return (
    routines.find((routine) => routine.id === workout?.routineId)?.name ||
    workout?.routineName ||
    workout?.routineId ||
    "Session"
  );
}

function reflectionLabel(workout) {
  const value = workout?.reflectionRating || workout?.perceivedDifficulty || null;
  if (!value) {
    return "Not rated";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getPlanSessions(workouts = []) {
  const sessionsByPlan = new Map();
  workouts.forEach((workout) => {
    if (!workout?.activePlanId) {
      return;
    }
    if (!sessionsByPlan.has(workout.activePlanId)) {
      sessionsByPlan.set(workout.activePlanId, []);
    }
    sessionsByPlan.get(workout.activePlanId).push(workout);
  });

  sessionsByPlan.forEach((sessions) => {
    sessions.sort((left, right) => (right.completedAt || "").localeCompare(left.completedAt || ""));
  });

  return sessionsByPlan;
}

function buildPlanSummaries(activePlans = [], archivedPlans = [], workouts = []) {
  const sessionsByPlan = getPlanSessions(workouts);
  const summaries = [];
  const knownIds = new Set();

  const pushSummary = (plan, status) => {
    if (!plan?.id || knownIds.has(plan.id)) {
      return;
    }

    const sessions = sessionsByPlan.get(plan.id) || [];
    const latestSession = sessions[0] || null;
    knownIds.add(plan.id);
    summaries.push({
      id: plan.id,
      title: plan.displayName || plan.name || "Plan",
      subtitle: plan.goal || plan.description || "Structured training journey",
      description: plan.description || "",
      status,
      startedAt: plan.startedAt || null,
      completedAt: plan.completedAt || null,
      lastActivityAt: latestSession?.completedAt || plan.completedAt || plan.lastSessionDate || plan.startedAt || null,
      currentStageName:
        plan.stages?.[plan.currentStageIndex ?? 0]?.name ||
        plan.stageHistory?.[plan.stageHistory.length - 1]?.stageName ||
        null,
      sessionCount: sessions.length,
      stageCount: Array.isArray(plan.stages) ? plan.stages.length : 0,
      stageHistoryCount: Array.isArray(plan.stageHistory) ? plan.stageHistory.length : 0,
      version: plan.version || "-",
      versionHistoryCount: Array.isArray(plan.versionHistory) ? plan.versionHistory.length : 0,
      latestSession,
      sessions,
    });
  };

  activePlans.forEach((plan) => pushSummary(plan, "active"));
  archivedPlans.forEach((plan) => pushSummary(plan, "archived"));

  sessionsByPlan.forEach((sessions, planId) => {
    if (knownIds.has(planId)) {
      return;
    }
    const latestSession = sessions[0] || null;
    summaries.push({
      id: planId,
      title: "Removed plan",
      subtitle: "Past sessions remain even though the live plan snapshot is gone.",
      description: "",
      status: "removed",
      startedAt: sessions[sessions.length - 1]?.startedAt || null,
      completedAt: null,
      lastActivityAt: latestSession?.completedAt || null,
      currentStageName: null,
      sessionCount: sessions.length,
      stageCount: 0,
      stageHistoryCount: 0,
      version: "-",
      versionHistoryCount: 0,
      latestSession,
      sessions,
    });
  });

  return summaries.sort((left, right) => {
    const statusOrder = { active: 0, archived: 1, removed: 2 };
    const leftOrder = statusOrder[left.status] ?? 9;
    const rightOrder = statusOrder[right.status] ?? 9;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(right.lastActivityAt || "").localeCompare(String(left.lastActivityAt || ""));
  });
}

function resolvePlanName(workout, planLookup) {
  const summary = planLookup.get(workout?.activePlanId);
  if (summary?.status === "removed") {
    return `Removed plan / ${workout?.activePlanId || "-"}`;
  }
  return summary?.title || (workout?.activePlanId ? `Plan ${workout.activePlanId}` : "Plan -");
}

function renderPlanSnapshot(planSummary) {
  if (!planSummary) {
    return `
      <section class="panel panel--section">
        <div class="panel__header">
          <div>
            <h2 class="panel__title">Plan history</h2>
            <p class="panel__copy">Choose a plan on the left to inspect its sessions, stage history footprint, and latest activity.</p>
          </div>
        </div>
        <div class="panel__body">
          <div class="empty-state">
            <h3>All activity selected</h3>
            <p>Showing the complete session log across active plans, archived plans, and removed plan remnants that still have workout history.</p>
          </div>
        </div>
      </section>
    `;
  }

  const statusLabel =
    planSummary.status === "active"
      ? "Active"
      : planSummary.status === "archived"
        ? "Archived"
        : "Removed";
  const statusCopy =
    planSummary.status === "active"
      ? "Still available in the active queue."
      : planSummary.status === "archived"
        ? "Archived snapshot preserved for later review."
        : "The live plan snapshot is gone, but its session history remains.";

  return `
    <section class="panel panel--section">
      <div class="panel__header">
        <div>
          <h2 class="panel__title">${escapeHtml(planSummary.title)}</h2>
          <p class="panel__copy">${escapeHtml(planSummary.subtitle || statusCopy)}</p>
        </div>
      </div>
      <div class="panel__body stack">
        <div class="metric-grid">
          <article class="metric-card">
            <span class="metric-card__label">Status</span>
            <strong class="metric-card__value" style="font-size: 1rem;">${escapeHtml(statusLabel)}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Sessions</span>
            <strong class="metric-card__value">${planSummary.sessionCount}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Current stage</span>
            <strong class="metric-card__value" style="font-size: 1rem;">${escapeHtml(planSummary.currentStageName || "-")}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Last activity</span>
            <strong class="metric-card__value" style="font-size: 1rem;">${escapeHtml(formatDateLabel(planSummary.lastActivityAt))}</strong>
          </article>
        </div>

        <div class="detail-list">
          <article class="detail-card">
            <div class="detail-card__header">
              <div>
                <h3 class="detail-card__title">Plan snapshot</h3>
                <p class="detail-card__sub">${escapeHtml(statusCopy)}</p>
              </div>
            </div>
            <div style="display: grid; gap: 10px; color: var(--soft); line-height: 1.6;">
              <div><strong style="color: var(--text);">Started</strong> / ${escapeHtml(formatDateTimeLabel(planSummary.startedAt))}</div>
              <div><strong style="color: var(--text);">Completed</strong> / ${escapeHtml(formatDateTimeLabel(planSummary.completedAt))}</div>
              <div><strong style="color: var(--text);">Stages tracked</strong> / ${planSummary.stageCount || "-"}</div>
              <div><strong style="color: var(--text);">Stage-history entries</strong> / ${planSummary.stageHistoryCount || 0}</div>
              <div><strong style="color: var(--text);">Version</strong> / ${escapeHtml(planSummary.version || "-")} (${planSummary.versionHistoryCount || 0} entries)</div>
            </div>
          </article>
        </div>
      </div>
    </section>
  `;
}

function renderWorkoutDetail(workout, exercises, routines, planLookup) {
  if (!workout) {
    return `
      <section class="panel panel--section">
        <div class="panel__body">
          <div class="empty-state">
            <h3>No session selected</h3>
            <p>Select a session from the left to inspect its set breakdown, duration, and reflection rating.</p>
          </div>
        </div>
      </section>
    `;
  }

  const groupedSets = groupSets(workout.sets || [], exercises);
  const duration = workoutDurationSec(workout);
  const setCount = workout.sets?.length ?? workout.totalSets ?? 0;

  return `
    <section class="panel panel--section" data-role="workout-detail">
      <div class="panel__header">
        <div>
          <h2 class="panel__title">${escapeHtml(resolveRoutineName(workout, routines, exercises))}</h2>
          <p class="panel__copy">${escapeHtml(workoutLabelDate(workout))} / ${escapeHtml(resolvePlanName(workout, planLookup))}</p>
        </div>
      </div>
      <div class="panel__body stack">
        <div class="metric-grid">
          <article class="metric-card">
            <span class="metric-card__label">Duration</span>
            <strong class="metric-card__value">${formatDuration(duration)}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Sets logged</span>
            <strong class="metric-card__value">${setCount}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Stage</span>
            <strong class="metric-card__value">${escapeHtml(workout.stageId || "-")}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Reflection</span>
            <strong class="metric-card__value" style="font-size: 1rem;">${escapeHtml(reflectionLabel(workout))}</strong>
          </article>
        </div>

        ${workout.source ? `
          <div class="empty-state">
            <h3>Imported source data</h3>
            <p>${escapeHtml(workout.source)}.</p>
            <p>${workout.sourceHasSetTiming ? "Per-set timing is available for this workout." : "This source includes workout duration, reps, and weights, but not per-set timestamps or per-set duration."}</p>
          </div>
        ` : ""}

        ${workout.notes ? `
          <div class="empty-state">
            <h3>Session note</h3>
            <p>${escapeHtml(workout.notes)}</p>
          </div>
        ` : ""}

        <section class="detail-section">
          <h3 class="detail-section__title">Set breakdown</h3>
          <div class="detail-list">
            ${groupedSets.map(([exerciseName, sets]) => `
              <article class="detail-card">
                <div class="detail-card__header">
                  <div>
                    <h4 class="detail-card__title">${escapeHtml(exerciseName)}</h4>
                    <p class="detail-card__sub">${sets.length} set${sets.length === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <div class="set-table">
                  ${sets
                    .map((set) => `
                      <div class="set-row">
                        <span>Set ${set.setNumber}</span>
                        <span>${escapeHtml(set.status || "-")}</span>
                        <span>${set.actualReps ?? "-"} reps</span>
                        <span>${set.actualWeightKg ?? 0} kg</span>
                      </div>
                    `)
                    .join("")}
                </div>
              </article>
            `).join("")}
          </div>
        </section>
      </div>
    </section>
  `;
}

export function renderWorkoutView(container, { state, actions }) {
  const workouts = state.workouts || [];
  const planSummaries = buildPlanSummaries(state.activePlans || [], state.archivedPlans || [], workouts);
  const planLookup = new Map(planSummaries.map((summary) => [summary.id, summary]));
  const filteredWorkouts = state.selectedHistoryPlanId
    ? workouts.filter((workout) => workout.activePlanId === state.selectedHistoryPlanId)
    : workouts;
  const selectedPlanSummary = state.selectedHistoryPlanId
    ? planLookup.get(state.selectedHistoryPlanId) || null
    : null;
  const selectedWorkout =
    filteredWorkouts.find((workout) => workout.id === state.selectedWorkoutId) ||
    filteredWorkouts[0] ||
    null;
  const latestWorkout = workouts[0] || null;
  const archivedCount = (state.archivedPlans || []).length;

  container.innerHTML = `
    <section class="page page-single">
      <div class="library-header">
        <div class="library-header__copy">
          <h1>History</h1>
          <p>Revisit past plans, archived journeys, and the exact sessions your runtime has logged over time.</p>
        </div>
      </div>

      <div class="metric-grid" style="margin-bottom: 20px;">
        <article class="metric-card">
          <span class="metric-card__label">Total sessions</span>
          <strong class="metric-card__value">${workouts.length}</strong>
        </article>
        <article class="metric-card">
          <span class="metric-card__label">Active plans</span>
          <strong class="metric-card__value">${(state.activePlans || []).length}</strong>
        </article>
        <article class="metric-card">
          <span class="metric-card__label">Archived plans</span>
          <strong class="metric-card__value">${archivedCount}</strong>
        </article>
        <article class="metric-card">
          <span class="metric-card__label">Latest session</span>
          <strong class="metric-card__value" style="font-size: 1rem;">${escapeHtml(latestWorkout ? formatDateLabel(latestWorkout.completedAt) : "-")}</strong>
        </article>
      </div>

      <div class="page-grid page-grid--workouts">
        <section class="panel panel--section" data-role="workout-list">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Plan history</h2>
              <p class="panel__copy">Filter sessions by active plans, archived plans, or removed plan remnants that still have stored workouts.</p>
            </div>
          </div>
          <div class="panel__body stack">
            <section class="detail-section">
              <h3 class="detail-section__title">Plans</h3>
              <div class="routine-list">
                <button
                  class="routine-card ${state.selectedHistoryPlanId ? "" : "is-selected"}"
                  data-action="select-history-plan"
                  data-plan-id=""
                  type="button"
                >
                  <span class="routine-card__eyebrow">All activity</span>
                  <span class="routine-card__name">All plans and sessions</span>
                  <span class="routine-card__meta">
                    <span>${workouts.length} sessions</span>
                    <span>${(state.activePlans || []).length} active</span>
                    <span>${archivedCount} archived</span>
                  </span>
                </button>
                ${planSummaries.length === 0 ? `
                  <div class="empty-state">
                    <h3>No plan history yet</h3>
                    <p>Start a plan and complete a session to build a reusable journey history here.</p>
                  </div>
                ` : planSummaries.map((summary) => `
                  <button
                    class="routine-card ${summary.id === state.selectedHistoryPlanId ? "is-selected" : ""}"
                    data-action="select-history-plan"
                    data-plan-id="${summary.id}"
                    type="button"
                  >
                    <span class="routine-card__eyebrow">${escapeHtml(summary.status)}</span>
                    <span class="routine-card__name">${escapeHtml(summary.title)}</span>
                    <span class="routine-card__meta">
                      <span>${summary.sessionCount} session${summary.sessionCount === 1 ? "" : "s"}</span>
                      <span>${escapeHtml(summary.currentStageName || "No stage snapshot")}</span>
                      <span>${escapeHtml(formatDateLabel(summary.lastActivityAt))}</span>
                    </span>
                  </button>
                `).join("")}
              </div>
            </section>

            <section class="detail-section">
              <h3 class="detail-section__title">${selectedPlanSummary ? "Sessions in this plan" : "Sessions"}</h3>
              ${filteredWorkouts.length === 0 ? `
                <div class="empty-state">
                  <h3>No sessions in this slice</h3>
                  <p>${selectedPlanSummary ? "This plan snapshot is present, but no workout sessions have been logged for it yet." : "Finish a session in the workout player to populate detailed history here."}</p>
                </div>
              ` : `
                <div class="routine-list">
                  ${filteredWorkouts.map((workout) => `
                    <button
                      class="routine-card ${workout.id === selectedWorkout?.id ? "is-selected" : ""}"
                      data-action="select-workout"
                      data-workout-id="${workout.id}"
                      type="button"
                    >
                      <span class="routine-card__eyebrow">${escapeHtml(workoutLabelDate(workout))}</span>
                      <span class="routine-card__name">${escapeHtml(resolveRoutineName(workout, state.routines, state.exercises))}</span>
                      <span class="routine-card__meta">
                        <span>${formatDuration(workoutDurationSec(workout))}</span>
                        <span>${workout.sets?.length ?? 0} sets</span>
                        <span>${escapeHtml(reflectionLabel(workout))}</span>
                      </span>
                    </button>
                  `).join("")}
                </div>
              `}
            </section>
          </div>
        </section>

        <div class="stack">
          ${renderPlanSnapshot(selectedPlanSummary)}
          ${renderWorkoutDetail(selectedWorkout, state.exercises, state.routines, planLookup)}
        </div>
      </div>
    </section>
  `;

  container.querySelectorAll('[data-action="select-history-plan"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.selectHistoryPlan(button.dataset.planId);
      if (window.innerWidth <= 720) {
        window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      }
    });
  });

  container.querySelectorAll('[data-action="select-workout"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.selectWorkout(button.dataset.workoutId);
      if (window.innerWidth <= 720) {
        window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      }
    });
  });
}
