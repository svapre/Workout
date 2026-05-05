function formatExerciseCount(count) {
  return `${count} exercise${count === 1 ? "" : "s"}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderExerciseCard(exercise, state) {
  return `
    <details class="exercise-card" data-exercise-id="${exercise.id}" ${state.expandedExerciseIds.has(exercise.id) ? "open" : ""}>
      <summary class="exercise-card__top">
        <div>
          <h3 class="exercise-card__title">${escapeHtml(exercise.name || "Untitled Exercise")}</h3>
          <p class="exercise-card__subtitle">Order ${exercise.order} - Mode: ${escapeHtml(exercise.mode)}</p>
        </div>
        <div class="exercise-card__actions">
          <button class="mini-button" data-action="exercise-up" type="button">Move Up</button>
          <button class="mini-button" data-action="exercise-down" type="button">Move Down</button>
          <button class="mini-button" data-action="exercise-delete" type="button">Delete</button>
        </div>
      </summary>

      <div class="field-grid">
        <div class="field field--full">
          <label>Exercise Name</label>
          <input data-field="name" type="text" value="${escapeHtml(exercise.name)}">
        </div>

        <div class="field">
          <label>Mode</label>
          <select data-field="mode">
            <option value="reps-only" ${exercise.mode === "reps-only" ? "selected" : ""}>Reps Only</option>
            <option value="time-only" ${exercise.mode === "time-only" ? "selected" : ""}>Time Only</option>
            <option value="reps+time" ${exercise.mode === "reps+time" ? "selected" : ""}>Reps + Time</option>
          </select>
        </div>

        <div class="field">
          <label>Exercise Slug</label>
          <input data-field="exerciseSlug" type="text" value="${escapeHtml(exercise.exerciseSlug ?? "")}">
        </div>

        <div class="field">
          <label>Target Sets</label>
          <input data-field="targetSets" type="number" min="0" step="1" value="${exercise.targetSets ?? ""}">
        </div>

        <div class="field">
          <label>Target Reps</label>
          <input data-field="targetReps" type="number" min="0" step="1" value="${exercise.targetReps ?? ""}">
        </div>

        <div class="field">
          <label>Target Duration (sec)</label>
          <input data-field="targetDurationSec" type="number" min="0" step="1" value="${exercise.targetDurationSec ?? ""}">
        </div>

        <div class="field">
          <label>Target Weight (kg)</label>
          <input data-field="targetWeightKg" type="number" min="0" step="0.5" value="${exercise.targetWeightKg ?? ""}">
        </div>

        <div class="field">
          <label>Rest (sec)</label>
          <input data-field="restSec" type="number" min="0" step="1" value="${exercise.restSec ?? ""}">
        </div>

        <div class="field field--full">
          <label>Notes</label>
          <textarea data-field="notes">${escapeHtml(exercise.notes)}</textarea>
        </div>
      </div>
    </details>
  `;
}

function renderSelectedRoutine(routine, state) {
  if (!routine) {
    return `
      <section class="panel">
        <div class="panel__body">
          <div class="empty-state">
            <h3>No routine selected</h3>
            <p>Create a routine or import a CSV template to begin shaping the app data model.</p>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="panel__header">
        <div>
          <h2 class="panel__title">Routine Editor</h2>
          <p class="panel__copy">Each routine is self-contained, and every exercise block is editable without touching unrelated modules.</p>
        </div>
        <div class="toolbar">
          <button class="button button--primary" data-action="add-exercise" type="button">Add Exercise</button>
          <button class="button" data-action="duplicate-routine" type="button">Duplicate</button>
          <button class="button" data-action="export-selected" type="button">Export Selected</button>
          <button class="button button--danger" data-action="delete-routine" type="button">Delete</button>
        </div>
      </div>
      <div class="panel__body stack">
        <div class="field-grid">
          <div class="field">
            <label>Routine Name</label>
            <input data-routine-field="name" type="text" value="${escapeHtml(routine.name)}">
          </div>
          <div class="field">
            <label>Difficulty Score (1-10)</label>
            <input data-routine-field="difficultyScore" type="number" min="1" max="10" step="1" value="${routine.difficultyScore ?? 1}">
          </div>
          <div class="field">
            <label>Exercise Count</label>
            <input type="text" value="${formatExerciseCount(routine.exercises.length)}" disabled>
          </div>
          <div class="field field--full">
            <label>Routine Notes</label>
            <textarea data-routine-field="notes">${escapeHtml(routine.notes)}</textarea>
          </div>
        </div>

        <div class="exercise-list">
          ${routine.exercises.map((exercise) => renderExerciseCard(exercise, state)).join("")}
        </div>
      </div>
    </section>
  `;
}

export function renderRoutineView(container, { state, actions }) {
  const selectedRoutine = state.routines.find((routine) => routine.id === state.selectedRoutineId) ?? null;

  if (!selectedRoutine) {
    container.innerHTML = `
      <section class="page page-single">
        <div class="panel">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Routine Library</h2>
              <p class="panel__copy">Manage routine templates, CSV import, and CSV export.</p>
            </div>
            <div class="toolbar">
              <button class="button button--primary" data-action="create-routine" type="button">New Routine</button>
              <button class="button" data-action="export-all" type="button">Export All</button>
              <button class="button button--ghost" data-action="import-routines" type="button">Import File</button>
              <input class="hidden" data-role="import-input" type="file" accept=".csv,.json,text/csv,application/json">
            </div>
          </div>
          <div class="panel__body">
            ${state.routines.length === 0 ? '<p class="muted">No routines found. Create one!</p>' : `
              <div class="card-grid">
                ${state.routines.map(routine => `
                  <div class="exercise-card" style="display: flex; flex-direction: column;">
                    <div class="exercise-card__top" style="margin-bottom: 8px;">
                      <h3 class="exercise-card__title" style="font-size: 1.1rem; color: var(--brand);">${escapeHtml(routine.name || "Untitled Routine")}</h3>
                    </div>
                    <p class="muted" style="font-size: 0.9rem; margin-bottom: 24px; flex-grow: 1;">${escapeHtml(routine.notes ? routine.notes.slice(0, 120) + '...' : "No description")}</p>
                    <div style="font-size: 0.85rem; color: var(--soft); margin-bottom: 16px; display: flex; justify-content: space-between;">
                      <span>${formatExerciseCount(routine.exercises.length)}</span>
                      <span style="color: var(--brand-2); font-weight: 700;">Score: ${routine.difficultyScore ?? 1}</span>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: auto;">
                      <button class="button button--ghost" data-action="select-routine" data-routine-id="${routine.id}" type="button" style="flex: 1; padding: 8px;">Edit Routine</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </section>
    `;
  } else {
    container.innerHTML = `
      <section class="page page-single">
        <div style="margin-bottom: 16px;">
          <button class="button button--ghost" data-action="back-to-list" type="button">⬅ Back to Routines</button>
        </div>
        ${renderSelectedRoutine(selectedRoutine, state)}
      </section>
    `;
  }

  const importInput = container.querySelector('[data-role="import-input"]');
  container.querySelector('[data-action="create-routine"]')?.addEventListener("click", () => {
    actions.createRoutine();
  });
  container.querySelector('[data-action="export-all"]')?.addEventListener("click", () => {
    actions.exportRoutines("all");
  });
  container.querySelector('[data-action="import-routines"]')?.addEventListener("click", () => {
    importInput?.click();
  });
  importInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await actions.importRoutines(file);
    event.target.value = "";
  });

  container.querySelector('[data-action="back-to-list"]')?.addEventListener('click', () => {
    actions.selectRoutine(null);
  });

  container.querySelectorAll('[data-action="select-routine"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.selectRoutine(button.dataset.routineId);
    });
  });

  if (!selectedRoutine) {
    return;
  }

  container.querySelector('[data-action="duplicate-routine"]')?.addEventListener("click", () => {
    actions.duplicateRoutine(selectedRoutine.id);
  });
  container.querySelector('[data-action="delete-routine"]')?.addEventListener("click", () => {
    actions.deleteRoutine(selectedRoutine.id);
  });
  container.querySelector('[data-action="add-exercise"]')?.addEventListener("click", () => {
    actions.addExercise(selectedRoutine.id);
  });
  container.querySelector('[data-action="export-selected"]')?.addEventListener("click", () => {
    actions.exportRoutines("selected", selectedRoutine.id);
  });

  container.querySelectorAll("[data-routine-field]").forEach((field) => {
    field.addEventListener("change", () => {
      actions.updateRoutine(selectedRoutine.id, { [field.dataset.routineField]: field.value });
    });
  });

  container.querySelectorAll("[data-exercise-id]").forEach((exerciseCard) => {
    const { exerciseId } = exerciseCard.dataset;
    exerciseCard.querySelectorAll("[data-field]").forEach((field) => {
      field.addEventListener("change", () => {
        actions.updateExercise(selectedRoutine.id, exerciseId, {
          [field.dataset.field]: field.value,
        });
      });
    });

    exerciseCard.querySelector('[data-action="exercise-delete"]')?.addEventListener("click", () => {
      actions.deleteExercise(selectedRoutine.id, exerciseId);
    });
    exerciseCard.querySelector('[data-action="exercise-up"]')?.addEventListener("click", () => {
      actions.moveExercise(selectedRoutine.id, exerciseId, "up");
    });
    exerciseCard.querySelector('[data-action="exercise-down"]')?.addEventListener("click", () => {
      actions.moveExercise(selectedRoutine.id, exerciseId, "down");
    });
    
    exerciseCard.addEventListener("toggle", (event) => {
      actions.toggleExerciseExpansion(exerciseId, event.target.open);
    });
  });
}
