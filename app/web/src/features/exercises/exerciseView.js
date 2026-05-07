function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPills(items) {
  if (!items?.length) {
    return `<span class="muted">None listed</span>`;
  }

  return `
    <div class="pill-list">
      ${items.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function renderExerciseDetail(exercise) {
  if (!exercise) {
    return `
      <section class="panel">
        <div class="panel__body">
          <div class="empty-state">
            <h3>No exercise selected</h3>
            <p>Select an exercise from the catalog to inspect muscles, purpose, and source details.</p>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="panel__header">
        <div>
          <h2 class="panel__title">${escapeHtml(exercise.name)}</h2>
          <p class="panel__copy">${escapeHtml(exercise.category)} — ${escapeHtml(exercise.trackingType || exercise.mode || "reps")} — ${escapeHtml(exercise.movementPattern || "general")}</p>
        </div>
      </div>
      <div class="panel__body stack">
        <div class="field-grid">
          <div class="field field--full">
            <label>Summary</label>
            <div class="read-block">${escapeHtml(exercise.description || exercise.summary || "No summary yet.")}</div>
          </div>
          <div class="field field--full">
            <label>Why It Helps</label>
            <div class="read-block">${escapeHtml(exercise.whyItHelps || "No context yet.")}</div>
          </div>
          <div class="field field--full">
            <label>Body Targets</label>
            ${renderPills((exercise.bodyTargets?.length ? exercise.bodyTargets : exercise.primaryMuscles) || [])}
          </div>
          <div class="field field--full">
            <label>Secondary Muscles</label>
            ${renderPills(exercise.secondaryMuscles)}
          </div>
          <div class="field field--full">
            <label>Equipment</label>
            ${renderPills(exercise.equipment)}
          </div>
          <div class="field field--full">
            <label>Aliases</label>
            ${renderPills(exercise.aliases)}
          </div>
        </div>

        <div class="empty-state">
          <h3>Source</h3>
          <p>${escapeHtml(exercise.sourceName || "Internal record")}</p>
          ${exercise.sourceUrl ? `<p><a class="source-link" href="${escapeHtml(exercise.sourceUrl)}" target="_blank" rel="noreferrer">Open source reference</a></p>` : ""}
          ${exercise.notes ? `<p>${escapeHtml(exercise.notes)}</p>` : ""}
        </div>
      </div>
    </section>
  `;
}

export function renderExerciseView(container, { state, actions }) {
  const selectedExercise = state.selectedExerciseId ? state.exercises.find((e) => e.id === state.selectedExerciseId) : null;

  if (!selectedExercise) {
    container.innerHTML = `
      <section class="page page-single">
        <div class="panel">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Exercise Library</h2>
              <p class="panel__copy">Internal exercise reference data that can be enriched from open files and outside sources.</p>
            </div>
            <div class="toolbar">
              <button class="button button--ghost" data-action="import-exercises" type="button">Import Catalog</button>
              <button class="button" data-action="export-exercises" type="button">Export Catalog</button>
              <input class="hidden" data-role="exercise-import-input" type="file" accept=".csv,.json,text/csv,application/json">
            </div>
          </div>
          <div class="panel__body">
            ${state.exercises.length === 0 ? '<p class="muted">No exercises found.</p>' : `
              <div class="card-grid">
                ${state.exercises.map(exercise => `
                  <div class="exercise-card" style="display: flex; flex-direction: column;">
                    <div class="exercise-card__top" style="margin-bottom: 8px;">
                      <h3 class="exercise-card__title" style="font-size: 1.1rem; color: var(--brand);">${escapeHtml(exercise.name || "Untitled Exercise")}</h3>
                    </div>
                    <p class="muted" style="font-size: 0.9rem; margin-bottom: 24px; flex-grow: 1;">${escapeHtml((exercise.description || exercise.summary || "").length > 120 ? (exercise.description || exercise.summary).slice(0, 120) + "..." : (exercise.description || exercise.summary || "No summary"))}</p>
                    <div style="font-size: 0.85rem; color: var(--soft); margin-bottom: 16px;">
                      ${escapeHtml(exercise.category)} — ${(exercise.bodyTargets?.length ? exercise.bodyTargets : exercise.primaryMuscles ?? []).slice(0, 2).join(", ")}
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: auto;">
                      <button class="button button--ghost" data-action="select-exercise" data-exercise-id="${exercise.id}" type="button" style="flex: 1; padding: 8px;">View Detail</button>
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
          <button class="button button--ghost" data-action="back-to-list" type="button">⬅ Back to Exercises</button>
        </div>
        ${renderExerciseDetail(selectedExercise)}
      </section>
    `;
  }

  const importInput = container.querySelector('[data-role="exercise-import-input"]');
  container.querySelector('[data-action="import-exercises"]')?.addEventListener("click", () => {
    importInput?.click();
  });
  container.querySelector('[data-action="export-exercises"]')?.addEventListener("click", () => {
    actions.exportExercises();
  });
  importInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await actions.importExercises(file);
    event.target.value = "";
  });

  container.querySelector('[data-action="back-to-list"]')?.addEventListener('click', () => {
    actions.selectExercise(null);
  });

  container.querySelectorAll('[data-action="select-exercise"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.selectExercise(button.dataset.exerciseId);
    });
  });
}
