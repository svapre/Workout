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

function groupSets(sets) {
  const groups = new Map();
  sets.forEach((set) => {
    if (!groups.has(set.exerciseName)) {
      groups.set(set.exerciseName, []);
    }
    groups.get(set.exerciseName).push(set);
  });
  return [...groups.entries()];
}

function renderWorkoutDetail(workout) {
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

  const groupedSets = groupSets(workout.sets);

  return `
    <section class="panel">
      <div class="panel__header">
        <div>
          <h2 class="panel__title">${escapeHtml(workout.routineName)}</h2>
          <p class="panel__copy">${escapeHtml(workout.workoutDate)} - ${escapeHtml(workout.classification)}</p>
        </div>
      </div>
      <div class="panel__body stack">
        <div class="metric-grid">
          <article class="metric-card">
            <span class="metric-card__label">Duration</span>
            <strong class="metric-card__value">${formatDuration(workout.workoutDurationSec)}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Total Volume</span>
            <strong class="metric-card__value">${workout.totalVolume}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Total Sets</span>
            <strong class="metric-card__value">${workout.totalSets}</strong>
          </article>
          <article class="metric-card">
            <span class="metric-card__label">Pushup Volume</span>
            <strong class="metric-card__value">${workout.pushupVolume}</strong>
          </article>
        </div>

        <div class="empty-state">
          <h3>Imported source data</h3>
          <p>${escapeHtml(workout.source)}.</p>
          <p>${workout.sourceHasSetTiming ? "Per-set timing is available for this workout." : "This source includes workout duration, reps, and weights, but not per-set timestamps or per-set duration."}</p>
        </div>

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
                      <span>${set.actualReps ?? "-"} reps</span>
                      <span>${set.actualWeightKg ?? 0} kg</span>
                      <span>${set.setDurationSec == null ? "No set time" : formatDuration(set.setDurationSec)}</span>
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
  const selectedWorkout = state.workouts.find((workout) => workout.id === state.selectedWorkoutId) ?? state.workouts[0] ?? null;
  const latestWorkout = state.workouts[0] ?? null;

  container.innerHTML = `
    <section class="page">
      <div class="page-grid">
        <section class="panel">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Workout History</h2>
              <p class="panel__copy">Seeded from the Strong export already present in this repo, including the workout logged on 2026-05-05.</p>
            </div>
          </div>
          <div class="panel__body stack">
            ${latestWorkout ? `
              <div class="empty-state">
                <h3>Latest imported workout</h3>
                <p><strong>${escapeHtml(latestWorkout.workoutDate)}</strong> - ${escapeHtml(latestWorkout.routineName)} (${formatDuration(latestWorkout.workoutDurationSec)})</p>
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
                  <span class="routine-card__name">${escapeHtml(workout.workoutDate)} - ${escapeHtml(workout.routineName)}</span>
                  <span class="routine-card__meta">${formatDuration(workout.workoutDurationSec)} - ${workout.totalSets} sets - Vol ${workout.totalVolume}</span>
                </button>
              `).join("")}
            </div>
          </div>
        </section>

        ${renderWorkoutDetail(selectedWorkout)}
      </div>
    </section>
  `;

  container.querySelectorAll('[data-action="select-workout"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.selectWorkout(button.dataset.workoutId);
    });
  });
}
