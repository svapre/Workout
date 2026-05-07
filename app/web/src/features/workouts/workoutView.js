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

function workoutDurationSec(workout) {
  if (workout.workoutDurationSec != null) return workout.workoutDurationSec;
  const a = new Date(workout.startedAt).getTime();
  const b = new Date(workout.completedAt).getTime();
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 1000) : 0;
}

function workoutLabelDate(workout) {
  return (
    workout.workoutDate ||
    (workout.startedAt ? String(workout.startedAt).slice(0, 10) : "")
  );
}

function groupSets(sets, exercises) {
  const groups = new Map();
  sets.forEach((set) => {
    const name =
      exercises.find((e) => e.id === set.exerciseId)?.name ||
      set.exerciseId ||
      "Exercise";
    if (!groups.has(name)) {
      groups.set(name, []);
    }
    groups.get(name).push(set);
  });
  return [...groups.entries()];
}

function renderWorkoutDetail(workout, exercises) {
  if (!workout) {
    return `
      <section class="panel">
        <div class="panel__body">
          <div class="empty-state">
            <h3>No workout selected</h3>
            <p>Select a workout from the left to inspect its sets and summary metrics.</p>
          </div>
        </div>
      </section>
    `;
  }

  const groupedSets = groupSets(workout.sets || [], exercises);
  const dur = workoutDurationSec(workout);
  const setCount = workout.sets?.length ?? workout.totalSets ?? 0;

  return `
    <section class="panel">
      <div class="panel__header">
        <div>
          <h2 class="panel__title">${escapeHtml(workout.routineName || workout.routineId || "Session")}</h2>
          <p class="panel__copy">${escapeHtml(workoutLabelDate(workout))} — Plan ${escapeHtml(workout.activePlanId || "—")}</p>
        </div>
      </div>
      <div class="panel__body stack">
        <div class="metric-grid">
          <article class="metric-card">
            <span class="metric-card__label">Duration</span>
            <strong class="metric-card__value">${formatDuration(dur)}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Sets Logged</span>
            <strong class="metric-card__value">${setCount}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Stage</span>
            <strong class="metric-card__value">${escapeHtml(workout.stageId || "—")}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Routine ID</span>
            <strong class="metric-card__value" style="font-size: 0.85rem;">${escapeHtml(workout.routineId || "—")}</strong>
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
            <h3>Session Note</h3>
            <p>${escapeHtml(workout.notes)}</p>
          </div>
        ` : ""}

        <section class="detail-section">
          <h3 class="detail-section__title">Set Breakdown</h3>
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
                  ${sets.map((set) => `
                    <div class="set-row">
                      <span>Set ${set.setNumber}</span>
                      <span>${set.status || "—"}</span>
                      <span>${set.actualReps ?? "-"} reps</span>
                      <span>${set.actualWeightKg ?? 0} kg</span>
                    </div>
                  `).join("")}
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
  const selectedWorkout =
    state.workouts.find((workout) => workout.id === state.selectedWorkoutId) ??
    state.workouts[0] ??
    null;
  const latestWorkout = state.workouts[0] ?? null;

  container.innerHTML = `
    <section class="page">
      <div class="page-grid">
        <section class="panel">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Workout History</h2>
              <p class="panel__copy">Sessions logged from the workout player and legacy imports.</p>
            </div>
          </div>
          <div class="panel__body stack">
            ${latestWorkout ? `
              <div class="empty-state">
                <h3>Latest workout</h3>
                <p><strong>${escapeHtml(workoutLabelDate(latestWorkout))}</strong> (${formatDuration(workoutDurationSec(latestWorkout))})</p>
              </div>
            ` : ""}

            <div class="routine-list">
              ${state.workouts.map((workout) => `
                <button
                  class="routine-card ${workout.id === selectedWorkout?.id ? "is-selected" : ""}"
                  data-action="select-workout"
                  data-workout-id="${workout.id}"
                  type="button"
                >
                  <span class="routine-card__name">${escapeHtml(workoutLabelDate(workout))} — ${escapeHtml(workout.routineName || workout.routineId || "Session")}</span>
                  <span class="routine-card__meta">${formatDuration(workoutDurationSec(workout))} — ${workout.sets?.length ?? 0} sets</span>
                </button>
              `).join("")}
            </div>
          </div>
        </section>

        ${renderWorkoutDetail(selectedWorkout, state.exercises)}
      </div>
    </section>
  `;

  container.querySelectorAll('[data-action="select-workout"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.selectWorkout(button.dataset.workoutId);
    });
  });
}
