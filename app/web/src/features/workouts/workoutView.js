import { normalizeHistoricalPlanSnapshot } from "../../data/historySnapshot.js";
import { resolvePlanAccent, resolveStatusAccent } from "../../ui/semanticColors.js";
import { buildHistoryWeekRailModel, renderHistoryWeekRail, toIsoDate } from "./historyWeekRail.js";

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

function startOfDay(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function dayDiffFromToday(value) {
  const parsed = startOfDay(value);
  if (!parsed) {
    return null;
  }
  const today = startOfDay(new Date());
  return Math.round((today.getTime() - parsed.getTime()) / 86400000);
}

function formatDateLabel(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  const diff = dayDiffFromToday(parsed);
  if (diff === 0) {
    return "Today";
  }
  if (diff === 1) {
    return "Yesterday";
  }
  if (diff === -1) {
    return "Tomorrow";
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: diff !== null && Math.abs(diff) > 300 ? "numeric" : undefined,
  });
}

function formatDateGroupLabel(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  const diff = dayDiffFromToday(parsed);
  if (diff === 0) {
    return "Today";
  }
  if (diff === 1) {
    return "Yesterday";
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: diff !== null && Math.abs(diff) > 300 ? "numeric" : undefined,
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

function groupWorkoutsByDate(workouts = []) {
  const groups = new Map();
  workouts.forEach((workout) => {
    const iso = toIsoDate(workout?.workoutDate || workout?.completedAt || workout?.startedAt);
    if (!iso) {
      return;
    }
    if (!groups.has(iso)) {
      groups.set(iso, []);
    }
    groups.get(iso).push(workout);
  });

  return [...groups.entries()]
    .sort((left, right) => right[0].localeCompare(left[0]))
    .map(([date, dayWorkouts]) => [
      date,
      [...dayWorkouts].sort((left, right) => String(right.completedAt || right.startedAt || "").localeCompare(String(left.completedAt || left.startedAt || ""))),
    ]);
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
  (sets || []).forEach((set) => {
    const name =
      exercises.find((exercise) => exercise.id === set.exerciseId)?.name ||
      "Activity";
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
    "Routine session"
  );
}

function sessionFeelLabel(workout, options = {}) {
  const value = workout?.reflectionRating || workout?.perceivedDifficulty || null;
  if (!value) {
    return "Not rated";
  }

  const formatted = value.charAt(0).toUpperCase() + value.slice(1);
  return options.prefixed ? `Felt ${formatted.toLowerCase()}` : formatted;
}

function formatHistoryStatus(status) {
  if (status === "archived") {
    return "Archived";
  }
  if (status === "removed") {
    return "Removed";
  }
  return "Active";
}

function formatCompletedVia(value) {
  if (value === "milestone") {
    return "Milestone";
  }
  if (value === "user_override") {
    return "User override";
  }
  return "In progress";
}

function formatSessionType(workout) {
  return workout?.sessionType === "milestone_test" ? "Milestone test" : "Routine session";
}

function formatMilestoneOutcome(workout) {
  const result = workout?.milestoneTest?.result;
  if (result === "passed") {
    return "Passed";
  }
  if (result === "failed") {
    return "Failed";
  }
  return "Not recorded";
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

  const pushSummary = (plan, statusOverride) => {
    if (!plan?.id || knownIds.has(plan.id)) {
      return;
    }

    const normalizedHistoricalPlan =
      statusOverride === "active" ? plan : normalizeHistoricalPlanSnapshot(plan);
    const status = statusOverride ?? normalizedHistoricalPlan?.historyStatus ?? "archived";
    const sessions = sessionsByPlan.get(plan.id) || [];
    const latestSession = sessions[0] || null;
    const stageHistory = Array.isArray(plan.stageHistory) ? plan.stageHistory : [];
    const versionHistory = Array.isArray(plan.versionHistory) ? plan.versionHistory : [];
    const lastStageHistory = stageHistory[stageHistory.length - 1] || null;
    const currentStageName =
      status === "active"
        ? plan.stages?.[plan.currentStageIndex ?? 0]?.name || lastStageHistory?.stageName || null
        : lastStageHistory?.stageName ||
        plan.stages?.[Math.max(0, Math.min((plan.currentStageIndex ?? 0), (plan.stages?.length ?? 1) - 1))]?.name ||
        null;

    knownIds.add(plan.id);
    summaries.push({
      id: plan.id,
      title: plan.displayName || plan.name || "Plan",
      subtitle: plan.goal || plan.description || "Structured training journey",
      description: plan.description || "",
      status,
      historyRecordedAt: normalizedHistoricalPlan?.historyRecordedAt || null,
      startedAt: plan.startedAt || null,
      completedAt: normalizedHistoricalPlan?.completedAt || plan.completedAt || null,
      removedAt: normalizedHistoricalPlan?.removedAt || null,
      lastActivityAt:
        latestSession?.completedAt ||
        normalizedHistoricalPlan?.historyRecordedAt ||
        plan.completedAt ||
        plan.lastSessionDate ||
        plan.startedAt ||
        null,
      currentStageName,
      sessionCount: sessions.length,
      stageCount: Array.isArray(plan.stages) ? plan.stages.length : 0,
      stageHistoryCount: stageHistory.length,
      version: plan.version || "-",
      versionHistoryCount: versionHistory.length,
      latestSession,
      latestVersionEntry: versionHistory[versionHistory.length - 1] || null,
      stageHistory,
      versionHistory,
      sessions,
      plan,
    });
  };

  activePlans.forEach((plan) => pushSummary(plan, "active"));
  archivedPlans.forEach((plan) => pushSummary(plan, plan.historyStatus || "archived"));

  sessionsByPlan.forEach((sessions, planId) => {
    if (knownIds.has(planId)) {
      return;
    }
    const latestSession = sessions[0] || null;
    summaries.push({
      id: planId,
      title: "Removed plan snapshot",
      subtitle: "The live plan is gone, but its session log still remains in history.",
      description: "",
      status: "removed",
      historyRecordedAt: latestSession?.completedAt || null,
      startedAt: sessions[sessions.length - 1]?.startedAt || null,
      completedAt: null,
      removedAt: null,
      lastActivityAt: latestSession?.completedAt || null,
      currentStageName: null,
      sessionCount: sessions.length,
      stageCount: 0,
      stageHistoryCount: 0,
      version: "-",
      versionHistoryCount: 0,
      latestSession,
      latestVersionEntry: null,
      stageHistory: [],
      versionHistory: [],
      sessions,
      plan: null,
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
    return summary?.title || "Removed plan snapshot";
  }
  return summary?.title || (workout?.activePlanId ? "Saved plan snapshot" : "Plan");
}

function renderTimelineEmpty(title, description) {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

function useCollapsedHistorySections() {
  return typeof window !== "undefined" && window.innerWidth <= 720;
}

function renderHistorySection(title, content, { summary = "", meta = "", open = true } = {}) {
  return `
    <details class="detail-section history-section" ${open ? "open" : ""}>
      <summary class="history-section__summary">
        <div class="history-section__summary-copy">
          <h3 class="detail-section__title">${escapeHtml(title)}</h3>
          ${summary ? `<p class="history-section__summary-note">${escapeHtml(summary)}</p>` : ""}
        </div>
        <div class="history-section__summary-side">
          ${meta ? `<span class="history-section__summary-meta">${escapeHtml(meta)}</span>` : ""}
          <span class="history-section__summary-action" aria-hidden="true"></span>
        </div>
      </summary>
      <div class="history-section__content">
        ${content}
      </div>
    </details>
  `;
}

function renderHistoryFocusCard(selectedPlanSummary, filteredWorkouts, planSummaries) {
  const accent = selectedPlanSummary
    ? (selectedPlanSummary.status === "active" ? resolvePlanAccent(selectedPlanSummary) : resolveStatusAccent(selectedPlanSummary.status))
    : resolveStatusAccent("active");
  const selectedStatus = selectedPlanSummary ? formatHistoryStatus(selectedPlanSummary.status) : "All plans";
  const title = selectedPlanSummary ? selectedPlanSummary.title : "All sessions";
  const meta = selectedPlanSummary
    ? `${selectedPlanSummary.sessionCount} session${selectedPlanSummary.sessionCount === 1 ? "" : "s"} / ${selectedPlanSummary.currentStageName || "No stage snapshot"}`
    : `${planSummaries.length} plan${planSummaries.length === 1 ? "" : "s"} / ${filteredWorkouts.length} session${filteredWorkouts.length === 1 ? "" : "s"}`;
  const copy = selectedPlanSummary
    ? "Plan details and the selected session appear below. Choose another session any time to update this view."
    : "You are viewing the combined session log. Choose one plan when you want its stage progress, plan edits, and full journey details.";

  return `
    <section class="history-focus-card" aria-label="Current history focus" style="--history-accent: ${accent};">
      <span class="history-focus-card__eyebrow">${escapeHtml(selectedStatus)}</span>
      <h2 class="history-focus-card__title">${escapeHtml(title)}</h2>
      <p class="history-focus-card__copy">${escapeHtml(copy)}</p>
      <span class="history-focus-card__meta">${escapeHtml(meta)}</span>
    </section>
  `;
}

function renderDetailMeta(rows = []) {
  return `
    <div class="detail-meta-list">
      ${rows.map(([label, value]) => `
        <div class="detail-meta-row">
          <span class="detail-meta-key">${escapeHtml(label)}</span>
          <span>${escapeHtml(value)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderStageHistory(stageHistory = []) {
  if (!stageHistory.length) {
    return renderTimelineEmpty(
      "No stage progress yet",
      "Stage transitions will appear here as the journey progresses or is revised.",
    );
  }

  return `
    <div class="detail-list">
      ${stageHistory.map((entry) => `
        <article class="detail-card">
          <div class="detail-card__header">
            <div>
              <h3 class="detail-card__title">${escapeHtml(entry.stageName || entry.stageId || "Stage")}</h3>
              <p class="detail-card__sub">${escapeHtml(formatCompletedVia(entry.completedVia))}</p>
            </div>
          </div>
          ${renderDetailMeta([
    ["Started", formatDateTimeLabel(entry.startedAt)],
    ["Completed", formatDateTimeLabel(entry.completedAt)],
    ["Failures", String(entry.failureCount ?? 0)],
  ])}
        </article>
      `).join("")}
    </div>
  `;
}

function renderVersionHistory(versionHistory = []) {
  if (!versionHistory.length) {
    return renderTimelineEmpty(
      "No plan edits yet",
      "Plan edits will appear after imports or direct live-plan changes update the journey structure.",
    );
  }

  const ordered = [...versionHistory].slice().reverse();
  return `
    <div class="detail-list">
      ${ordered.map((entry, index) => `
        <article class="detail-card">
          <div class="detail-card__header">
            <div>
              <h3 class="detail-card__title">${index === 0 ? "Latest plan edit" : "Earlier plan edit"}</h3>
              <p class="detail-card__sub">${escapeHtml((entry.modifiedBy || "user").replace("_", " "))}</p>
            </div>
          </div>
          ${renderDetailMeta([
    ["Saved", formatDateTimeLabel(entry.modifiedAt)],
    ["Record", entry.version || "-"],
    ["Summary", entry.changeSummary || "No summary provided."],
  ])}
        </article>
      `).join("")}
    </div>
  `;
}

function renderSessionTimeline(sessions = [], routines, exercises, selectedWorkoutId) {
  if (!sessions.length) {
    return renderTimelineEmpty(
      "No sessions yet",
      "Once this plan logs a workout or milestone test, the full journey timeline will appear here.",
    );
  }

  return `
    <div class="detail-list">
      ${sessions.map((session) => `
        <article class="detail-card ${session.id === selectedWorkoutId ? "detail-card--selected" : ""}">
          <div class="detail-card__header">
            <div>
              <h3 class="detail-card__title">${escapeHtml(resolveRoutineName(session, routines, exercises))}</h3>
              <p class="detail-card__sub">${escapeHtml(formatSessionType(session))}</p>
            </div>
          </div>
          ${renderDetailMeta(
    [
      ["Completed", formatDateTimeLabel(session.completedAt)],
      ["Stage", session.stageId || "-"],
      ["Session feel", sessionFeelLabel(session)],
      session.sessionType === "milestone_test" ? ["Milestone result", formatMilestoneOutcome(session)] : null,
    ].filter(Boolean),
  )}
        </article>
      `).join("")}
    </div>
  `;
}

function renderAllHistorySummary(planSummaries, workouts) {
  const activeCount = planSummaries.filter((summary) => summary.status === "active").length;
  const archivedCount = planSummaries.filter((summary) => summary.status === "archived").length;
  const removedCount = planSummaries.filter((summary) => summary.status === "removed").length;
  const milestoneTestCount = workouts.filter((workout) => workout.sessionType === "milestone_test").length;

  return `
    <section class="panel panel--section">
      <div class="panel__header">
        <div>
          <h2 class="panel__title">Workout history</h2>
          <p class="panel__copy">Choose one plan when you want its stage progress, plan edits, and full session log.</p>
        </div>
      </div>
      <div class="panel__body stack">
        <div class="metric-grid">
          <article class="metric-card">
            <span class="metric-card__label">Active</span>
            <strong class="metric-card__value">${activeCount}</strong>
          </article>
          ${archivedCount > 0 ? `
            <article class="metric-card">
              <span class="metric-card__label">Archived</span>
              <strong class="metric-card__value">${archivedCount}</strong>
            </article>
          ` : ""}
          ${removedCount > 0 ? `
            <article class="metric-card">
              <span class="metric-card__label">Removed</span>
              <strong class="metric-card__value">${removedCount}</strong>
            </article>
          ` : ""}
          <article class="metric-card">
            <span class="metric-card__label">Milestone tests</span>
            <strong class="metric-card__value">${milestoneTestCount}</strong>
          </article>
        </div>
        <div class="empty-state">
          <h3>Viewing every plan</h3>
          <p>Showing the complete session log across active plans and saved history records.</p>
        </div>
      </div>
    </section>
  `;
}

function renderPlanSnapshot(planSummary, routines, exercises, selectedWorkoutId) {
  if (!planSummary) {
    return "";
  }

  const collapseSecondarySections = useCollapsedHistorySections();
  const statusLabel = formatHistoryStatus(planSummary.status);
  const statusCopy =
    planSummary.status === "active"
      ? "Still active and ready to continue."
      : planSummary.status === "archived"
        ? "Archived and kept here for later review."
        : "Removed from your active plans, but kept here as a read-only record.";
  const panelCopy = planSummary.status === "active"
    ? (planSummary.subtitle || statusCopy)
    : statusCopy;

  return `
    <section class="panel panel--section">
      <div class="panel__header">
        <div>
          <h2 class="panel__title">${escapeHtml(planSummary.title)}</h2>
          <p class="panel__copy">${escapeHtml(panelCopy)}</p>
        </div>
      </div>
      <div class="panel__body stack">
        <div class="metric-grid">
          <article class="metric-card">
            <span class="metric-card__label">Status</span>
            <strong class="metric-card__value metric-card__value--compact">${escapeHtml(statusLabel)}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Sessions</span>
            <strong class="metric-card__value">${planSummary.sessionCount}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Stage history</span>
            <strong class="metric-card__value">${planSummary.stageHistoryCount}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Plan edits</span>
            <strong class="metric-card__value">${planSummary.versionHistoryCount}</strong>
          </article>
        </div>

        ${renderHistorySection(
    "Plan details",
    `
            <div class="detail-list">
              <article class="detail-card">
                <div class="detail-card__header">
                  <div>
                    <h3 class="detail-card__title">Dates and status</h3>
                    <p class="detail-card__sub">${escapeHtml(statusCopy)}</p>
                  </div>
                </div>
                ${renderDetailMeta([
      ["Started", formatDateTimeLabel(planSummary.startedAt)],
      ["Added to history", formatDateTimeLabel(planSummary.historyRecordedAt)],
      ["Archived on", formatDateTimeLabel(planSummary.completedAt)],
      ["Removed on", formatDateTimeLabel(planSummary.removedAt)],
      [planSummary.status === "active" ? "Current stage" : "Final stage", planSummary.currentStageName || "-"],
    ])}
              </article>
            </div>
          `,
    {
      summary: statusCopy,
      meta: statusLabel,
      open: true,
    },
  )}

        ${renderHistorySection(
    "Stage progress",
    renderStageHistory(planSummary.stageHistory),
    {
      summary: planSummary.stageHistoryCount
        ? `${planSummary.stageHistoryCount} stage progress ${planSummary.stageHistoryCount === 1 ? "entry" : "entries"}`
        : "No stage progress recorded yet.",
      meta: planSummary.stageHistoryCount ? `${planSummary.stageHistoryCount}` : "Empty",
      open: !collapseSecondarySections,
    },
  )}

        ${renderHistorySection(
    "Plan edits",
    renderVersionHistory(planSummary.versionHistory),
    {
      summary: planSummary.versionHistoryCount
        ? `${planSummary.versionHistoryCount} saved plan ${planSummary.versionHistoryCount === 1 ? "edit" : "edits"}`
        : "No saved plan edits yet.",
      meta: planSummary.versionHistoryCount ? `${planSummary.versionHistoryCount}` : "Empty",
      open: !collapseSecondarySections,
    },
  )}

        ${renderHistorySection(
    "Session log",
    renderSessionTimeline(planSummary.sessions, routines, exercises, selectedWorkoutId),
    {
      summary: planSummary.sessionCount
        ? `${planSummary.sessionCount} logged ${planSummary.sessionCount === 1 ? "session" : "sessions"}`
        : "No sessions have been logged in this plan yet.",
      meta: planSummary.sessionCount ? `${planSummary.sessionCount}` : "Empty",
      open: !collapseSecondarySections,
    },
  )}
      </div>
    </section>
  `;
}

function renderSetMetric(set) {
  const details = [];
  if (set.actualReps != null) {
    details.push(`${set.actualReps} reps`);
  }
  if (set.actualDurationSec != null) {
    details.push(`${set.actualDurationSec}s`);
  }
  if (set.actualWeightKg != null) {
    details.push(`${set.actualWeightKg} kg`);
  }
  if (set.actualResistance) {
    details.push(String(set.actualResistance));
  }
  return details.length ? details.join(" / ") : "-";
}

function renderWorkoutDetail(workout, exercises, routines, planLookup) {
  if (!workout) {
    return `
      <section class="panel panel--section" data-role="workout-detail">
        <div class="panel__body">
          <div class="empty-state">
            <h3>No session selected</h3>
            <p>Select a session above to inspect its set breakdown, duration, milestone result, and session feel.</p>
          </div>
        </div>
      </section>
    `;
  }

  const groupedSets = groupSets(workout.sets || [], exercises);
  const collapseSecondarySections = useCollapsedHistorySections();
  const duration = workoutDurationSec(workout);
  const setCount = workout.sets?.length ?? workout.totalSets ?? 0;
  const milestoneExerciseName =
    exercises.find((exercise) => exercise.id === workout?.milestoneTest?.exerciseId)?.name ||
    "Milestone activity";

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
            <span class="metric-card__label">Session type</span>
            <strong class="metric-card__value metric-card__value--compact">${escapeHtml(formatSessionType(workout))}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Session feel</span>
            <strong class="metric-card__value metric-card__value--compact">${escapeHtml(sessionFeelLabel(workout))}</strong>
          </article>
        </div>

        ${workout.sessionType === "milestone_test" ? `
          <div class="empty-state">
            <h3>Milestone test result</h3>
            <p>${escapeHtml(milestoneExerciseName || "Milestone activity")} / ${escapeHtml(formatMilestoneOutcome(workout))}</p>
            <p>Target: ${escapeHtml(
    workout.milestoneTest?.metric === "duration"
      ? `${workout.milestoneTest?.target ?? "-"} seconds`
      : `${workout.milestoneTest?.target ?? "-"} reps`,
  )}</p>
          </div>
        ` : ""}

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

        ${Array.isArray(workout.feedbackResponses) && workout.feedbackResponses.length ? `
          <section class="detail-section">
            <h3 class="detail-section__title">Session feedback</h3>
            <div class="detail-list">
              ${workout.feedbackResponses.map((entry) => `
                <article class="detail-card">
                  <div class="detail-card__header">
                    <div>
                      <h4 class="detail-card__title">${escapeHtml(entry.label || "Feedback")}</h4>
                    </div>
                  </div>
                  <p class="panel__copy" style="margin: 0;">${escapeHtml(entry.response || "")}</p>
                </article>
              `).join("")}
            </div>
          </section>
        ` : ""}

        ${renderHistorySection(
    "Set breakdown",
    groupedSets.length
      ? `
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
                            <span>${escapeHtml(renderSetMetric(set))}</span>
                          </div>
                        `)
          .join("")}
                    </div>
                  </article>
                `).join("")}
              </div>
            `
      : renderTimelineEmpty(
        "No set log available",
        "This session does not contain individual set data.",
      ),
    {
      summary: setCount
        ? `${setCount} logged ${setCount === 1 ? "set" : "sets"} across ${groupedSets.length || 1} ${groupedSets.length === 1 ? "activity" : "activities"}`
        : "No set-by-set data was recorded for this session.",
      meta: setCount ? `${setCount}` : "Empty",
      open: !collapseSecondarySections,
    },
  )}
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
  const groupedWorkouts = groupWorkoutsByDate(filteredWorkouts);
  const selectedDate = groupedWorkouts.some(([date]) => date === state.selectedHistoryDate)
    ? state.selectedHistoryDate
    : groupedWorkouts[0]?.[0] || state.selectedHistoryDate || toIsoDate(new Date());
  const selectedDateWorkouts = groupedWorkouts.find(([date]) => date === selectedDate)?.[1] || [];
  const selectedWorkout =
    selectedDateWorkouts.find((workout) => workout.id === state.selectedWorkoutId) ||
    selectedDateWorkouts[0] ||
    filteredWorkouts.find((workout) => workout.id === state.selectedWorkoutId) ||
    filteredWorkouts[0] ||
    null;
  const latestWorkout = workouts[0] || null;
  const archivedCount = planSummaries.filter((summary) => summary.status === "archived").length;
  const removedCount = planSummaries.filter((summary) => summary.status === "removed").length;
  const weekRailModel = buildHistoryWeekRailModel({
    selectedHistoryDate: selectedDate,
    filteredWorkouts,
    selectedPlanSummary,
    planLookup,
  });
  const visibleGroups = groupedWorkouts.filter(([date]) => date === weekRailModel.selectedDate);
  const selectedHistoryAccent = selectedPlanSummary
    ? (selectedPlanSummary.status === "active" ? resolvePlanAccent(selectedPlanSummary) : resolveStatusAccent(selectedPlanSummary.status))
    : resolveStatusAccent("active");

  container.innerHTML = `
    <section class="page page-single">
      <div class="library-header">
        <div class="library-header__copy">
          <span class="section-eyebrow">Workout history</span>
          <h1>Workout history</h1>
          <p>Choose a plan to review its sessions, stage progress, plan edits, and the days it showed up in your training week.</p>
        </div>
      </div>

      <div class="metric-grid">
        <article class="metric-card">
          <span class="metric-card__label">Total sessions</span>
          <strong class="metric-card__value">${workouts.length}</strong>
        </article>
        <article class="metric-card">
          <span class="metric-card__label">Active plans</span>
          <strong class="metric-card__value">${(state.activePlans || []).length}</strong>
        </article>
        ${archivedCount > 0 ? `
          <article class="metric-card">
            <span class="metric-card__label">Archived</span>
            <strong class="metric-card__value">${archivedCount}</strong>
          </article>
        ` : ""}
        ${removedCount > 0 ? `
          <article class="metric-card">
            <span class="metric-card__label">Removed</span>
            <strong class="metric-card__value">${removedCount}</strong>
          </article>
        ` : ""}
        <article class="metric-card">
          <span class="metric-card__label">Latest session</span>
          <strong class="metric-card__value metric-card__value--compact">${escapeHtml(latestWorkout ? formatDateLabel(latestWorkout.completedAt) : "-")}</strong>
        </article>
      </div>

      <div class="page-grid page-grid--workouts">
        <section class="panel panel--section" data-role="workout-list">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Choose a plan</h2>
              <p class="panel__copy">Pick a plan first, then move through its week and session log. The summary and session detail update below.</p>
            </div>
          </div>
          <div class="panel__body stack">
            <section class="detail-section">
              <h3 class="detail-section__title">Plans</h3>
              <div class="routine-list">
                <button
                  class="routine-card history-plan-card ${state.selectedHistoryPlanId ? "" : "is-selected"}"
                  data-action="select-history-plan"
                  data-plan-id=""
                  type="button"
                  style="--history-card-accent: ${resolveStatusAccent("active")};"
                >
                  <span class="routine-card__eyebrow">All plans</span>
                  <span class="routine-card__name">All sessions</span>
                  <span class="routine-card__meta">
                    <span>${workouts.length} sessions</span>
                    <span>${(state.activePlans || []).length} active</span>
                    ${archivedCount > 0 || removedCount > 0 ? `<span>${archivedCount} archived / ${removedCount} removed</span>` : ""}
                  </span>
                </button>
                ${planSummaries.length === 0 ? `
                  <div class="empty-state">
                    <h3>No plan history yet</h3>
                    <p>Start a plan and complete a session to build a reusable journey history here.</p>
                  </div>
                ` : planSummaries.map((summary) => {
                  const accent = summary.status === "active" ? resolvePlanAccent(summary) : resolveStatusAccent(summary.status);
                  return `
                    <button
                      class="routine-card history-plan-card history-plan-card--${summary.status} ${summary.id === state.selectedHistoryPlanId ? "is-selected" : ""}"
                      data-action="select-history-plan"
                      data-plan-id="${summary.id}"
                      type="button"
                      style="--history-card-accent: ${accent}; --plan-color: ${accent};"
                    >
                      <span class="routine-card__eyebrow">${escapeHtml(formatHistoryStatus(summary.status))}</span>
                      <span class="routine-card__name">${escapeHtml(summary.title)}</span>
                      <span class="routine-card__meta">
                        <span>${summary.sessionCount} session${summary.sessionCount === 1 ? "" : "s"}</span>
                        <span>${escapeHtml(summary.currentStageName || "No stage snapshot")}</span>
                        <span>${escapeHtml(formatDateLabel(summary.lastActivityAt))}</span>
                      </span>
                    </button>
                  `;
                }).join("")}
              </div>
            </section>

            <section class="detail-section">
              <h3 class="detail-section__title">${selectedPlanSummary ? "Session log" : "Recent sessions"}</h3>
              ${filteredWorkouts.length === 0 ? `
                <div class="empty-state">
                  <h3>No sessions for this plan</h3>
                  <p>${selectedPlanSummary ? "This plan is preserved in history, but no workout sessions have been logged for it yet." : "Finish a session in the workout player to populate detailed history here."}</p>
                </div>
              ` : `
                ${visibleGroups.length ? visibleGroups.map(([date, dayWorkouts]) => `
                  <section class="history-date-group">
                    <div class="history-date-group__header">
                      <div>
                        <h4 class="history-date-group__title">${escapeHtml(formatDateGroupLabel(date))}</h4>
                        <p class="history-date-group__meta">${dayWorkouts.length} session${dayWorkouts.length === 1 ? "" : "s"} on ${escapeHtml(formatDateLabel(date))}</p>
                      </div>
                    </div>
                    <div class="routine-list">
                      ${dayWorkouts.map((workout) => {
                        const workoutPlan = planLookup.get(workout.activePlanId) || selectedPlanSummary || null;
                        const accent = workoutPlan && workoutPlan.status !== "removed"
                          ? (workoutPlan.status === "active" ? resolvePlanAccent(workoutPlan) : resolveStatusAccent(workoutPlan.status))
                          : selectedHistoryAccent;
                        return `
                          <button
                            class="routine-card history-session-card ${workout.id === selectedWorkout?.id ? "is-selected" : ""}"
                            data-action="select-workout"
                            data-workout-id="${workout.id}"
                            type="button"
                            style="--history-card-accent: ${accent};"
                          >
                            <span class="routine-card__eyebrow">${escapeHtml(formatDateLabel(workoutLabelDate(workout)))}</span>
                            <span class="routine-card__name">${escapeHtml(resolveRoutineName(workout, state.routines, state.exercises))}</span>
                            <span class="routine-card__meta">
                              <span>${formatDuration(workoutDurationSec(workout))}</span>
                              <span>${escapeHtml(formatSessionType(workout))}</span>
                              <span>${escapeHtml(sessionFeelLabel(workout, { prefixed: true }))}</span>
                            </span>
                          </button>
                        `;
                      }).join("")}
                    </div>
                  </section>
                `).join("") : `
                  <div class="empty-state">
                    <h3>No sessions on this day</h3>
                    <p>Choose another day above to review the sessions tied to this plan.</p>
                  </div>
                `}
              `}
            </section>
          </div>
        </section>

        <div class="stack" data-role="workout-summary">
          ${renderHistoryFocusCard(selectedPlanSummary, filteredWorkouts, planSummaries)}
          ${renderHistoryWeekRail(weekRailModel)}
          ${selectedPlanSummary
            ? renderPlanSnapshot(selectedPlanSummary, state.routines, state.exercises, selectedWorkout?.id)
            : renderAllHistorySummary(planSummaries, workouts)}
          ${renderWorkoutDetail(selectedWorkout, state.exercises, state.routines, planLookup)}
        </div>
      </div>
    </section>
  `;

  container.querySelectorAll('[data-action="select-history-plan"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.selectHistoryPlan(button.dataset.planId);
      if (window.innerWidth <= 720) {
        window.requestAnimationFrame(() => {
          document.querySelector('[data-role="workout-summary"]')?.scrollIntoView({ block: "start", behavior: "smooth" });
        });
      }
    });
  });

  container.querySelectorAll('[data-action="select-workout"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.selectWorkout(button.dataset.workoutId);
      if (window.innerWidth <= 720) {
        window.requestAnimationFrame(() => {
          document.querySelector('[data-role="workout-summary"]')?.scrollIntoView({ block: "start", behavior: "smooth" });
        });
      }
    });
  });

  container.querySelectorAll('[data-action="select-history-date"], [data-action="history-week-nav"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.selectHistoryDate(button.dataset.date);
    });
  });
}





