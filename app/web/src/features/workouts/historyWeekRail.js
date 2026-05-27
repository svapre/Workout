import { resolvePlanAccent, resolveStatusAccent } from "../../ui/semanticColors.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function asDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setHours(12, 0, 0, 0);
  return parsed;
}

export function toIsoDate(value) {
  const parsed = asDate(value);
  if (!parsed) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

function shiftDays(value, amount) {
  const parsed = asDate(value) || asDate(new Date());
  parsed.setDate(parsed.getDate() + amount);
  return parsed;
}

function startOfWeek(date) {
  const base = asDate(date) || asDate(new Date());
  const weekday = base.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return shiftDays(base, offset);
}

function formatRangeLabel(start) {
  const end = shiftDays(start, 6);
  const startMonth = start.toLocaleDateString(undefined, { month: "short" });
  const endMonth = end.toLocaleDateString(undefined, { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

function formatDayLabel(date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function resolveHistoryMarkerAccent(plan) {
  if (!plan) {
    return resolveStatusAccent("active");
  }
  return plan.status && plan.status !== "active"
    ? resolveStatusAccent(plan.status)
    : resolvePlanAccent(plan);
}

function collectDayMarkers(dayWorkouts, allPlansMode) {
  if (!dayWorkouts.length) {
    return [];
  }
  if (!allPlansMode) {
    return [{ kind: "single", accent: resolveHistoryMarkerAccent(dayWorkouts[0]?.__plan) }];
  }

  const uniquePlans = [];
  const seen = new Set();
  dayWorkouts.forEach((workout) => {
    const planId = String(workout?.activePlanId || "");
    if (!planId || seen.has(planId)) {
      return;
    }
    seen.add(planId);
    uniquePlans.push({ kind: "dot", accent: resolveHistoryMarkerAccent(workout.__plan) });
  });

  if (uniquePlans.length <= 3) {
    return uniquePlans;
  }
  return [...uniquePlans.slice(0, 2), { kind: "plus", label: `+${uniquePlans.length - 2}` }];
}

export function buildHistoryWeekRailModel({
  selectedHistoryDate,
  filteredWorkouts = [],
  selectedPlanSummary = null,
  planLookup = new Map(),
}) {
  const selectedDate = toIsoDate(selectedHistoryDate) || toIsoDate(filteredWorkouts[0]?.completedAt || new Date());
  const weekStart = startOfWeek(selectedDate);
  const selectedWeekStartIso = toIsoDate(weekStart);
  const todayIso = toIsoDate(new Date());
  const workoutsByDate = new Map();

  filteredWorkouts.forEach((workout) => {
    const iso = toIsoDate(workout.workoutDate || workout.completedAt || workout.startedAt);
    if (!iso) {
      return;
    }
    if (!workoutsByDate.has(iso)) {
      workoutsByDate.set(iso, []);
    }
    workoutsByDate.get(iso).push({
      ...workout,
      __plan: planLookup.get(workout.activePlanId) || selectedPlanSummary || null,
    });
  });

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDays(weekStart, index);
    const iso = toIsoDate(date);
    const dayWorkouts = workoutsByDate.get(iso) || [];
    return {
      iso,
      dayLabel: formatDayLabel(date),
      dayNumber: String(date.getDate()),
      isToday: iso === todayIso,
      isSelected: iso === selectedDate,
      sessionCount: dayWorkouts.length,
      markers: collectDayMarkers(dayWorkouts, !selectedPlanSummary),
    };
  });

  return {
    rangeLabel: formatRangeLabel(weekStart),
    previousDateIso: toIsoDate(shiftDays(selectedWeekStartIso, -7)),
    nextDateIso: toIsoDate(shiftDays(selectedWeekStartIso, 7)),
    selectedDate,
    days,
    modeLabel: selectedPlanSummary ? "Plan week" : "All plans week",
  };
}

export function renderHistoryWeekRail(model) {
  return `
    <section class="history-week-rail" aria-label="Workout calendar week">
      <div class="history-week-rail__header">
        <div>
          <span class="history-week-rail__eyebrow">${escapeHtml(model.modeLabel)}</span>
          <h3 class="history-week-rail__range">${escapeHtml(model.rangeLabel)}</h3>
        </div>
        <div class="history-week-rail__controls">
          <button class="button button--ghost history-week-rail__nav" type="button" data-action="history-week-nav" data-date="${model.previousDateIso}" aria-label="Show previous week">&larr;</button>
          <button class="button button--ghost history-week-rail__nav" type="button" data-action="history-week-nav" data-date="${model.nextDateIso}" aria-label="Show next week">&rarr;</button>
        </div>
      </div>
      <div class="history-week-rail__days" role="list">
        ${model.days.map((day) => `
          <button
            class="history-week-rail__day ${day.isSelected ? "is-selected" : ""} ${day.isToday ? "is-today" : ""}"
            type="button"
            data-action="select-history-date"
            data-date="${day.iso}"
            style="--history-day-accent: ${escapeHtml(day.markers.find((marker) => marker.accent)?.accent || "#4FD1C5")};"
            aria-pressed="${day.isSelected ? "true" : "false"}"
            aria-label="${escapeHtml(`${day.dayLabel} ${day.iso}, ${day.sessionCount} session${day.sessionCount === 1 ? "" : "s"}`)}"
          >
            <span class="history-week-rail__day-label">${escapeHtml(day.dayLabel)}</span>
            <span class="history-week-rail__day-number">${escapeHtml(day.dayNumber)}</span>
            <span class="history-week-rail__markers" aria-hidden="true">
              ${day.markers.length ? day.markers.map((marker) => (
                marker.kind === "plus"
                  ? `<span class="history-week-rail__marker history-week-rail__marker--plus">${escapeHtml(marker.label)}</span>`
                  : `<span class="history-week-rail__marker ${marker.kind === "single" ? "history-week-rail__marker--single" : ""}" style="--history-marker: ${escapeHtml(marker.accent)};"></span>`
              )).join("") : `<span class="history-week-rail__marker history-week-rail__marker--empty"></span>`}
            </span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}


