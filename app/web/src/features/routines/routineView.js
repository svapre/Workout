/**
 * Routine Editor View
 * 
 * Manages the ordered list of exercises for a specific routine.
 */

import { confirmAction } from "../../ui/modal.js";

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

function renderExerciseCard(instance, state) {
  const catalogEntry = state.exercises.find(e => e.id === instance.exerciseId);
  const name = catalogEntry?.name || "Unknown Exercise";
  const mode = catalogEntry?.trackingType || "reps";

  // Data-Driven Input Visibility
  const showReps = mode === 'reps' || mode === 'weight' || mode === 'resistance';
  const showDuration = mode === 'duration' || mode === 'resistance';
  const showWeight = mode === 'weight' || mode === 'resistance';
  const showResistance = mode === 'resistance';

  return `
    <details class="exercise-card" data-instance-id="${instance.id}" ${state.expandedExerciseIds.has(instance.id) ? "open" : ""}>
      <summary class="exercise-card__top">
        <div>
          <h3 class="exercise-card__title">${escapeHtml(name)}</h3>
          <p class="exercise-card__subtitle">Order ${instance.order} - Mode: ${escapeHtml(mode)}</p>
        </div>
        <div class="exercise-card__actions">
          <button class="mini-button" data-action="exercise-up" type="button">Move Up</button>
          <button class="mini-button" data-action="exercise-down" type="button">Move Down</button>
          <button class="mini-button" data-action="exercise-delete" type="button" style="color: var(--danger);">Delete</button>
        </div>
      </summary>

      <div class="field-grid">
        <div class="field">
          <label>Sets</label>
          <input data-field="sets" type="number" min="0" step="1" value="${instance.sets ?? instance.targetSets ?? ""}">
        </div>

        ${showReps ? `
          <div class="field">
            <label>Reps</label>
            <input data-field="reps" type="number" min="0" step="1" value="${instance.reps ?? instance.targetReps ?? ""}">
          </div>
        ` : ""}

        ${showDuration ? `
          <div class="field">
            <label>Duration (sec)</label>
            <input data-field="durationSeconds" type="number" min="0" step="1" value="${instance.durationSeconds ?? instance.targetDurationSec ?? ""}">
          </div>
        ` : ""}

        ${showWeight ? `
          <div class="field">
            <label>Weight (kg)</label>
            <input data-field="weight" type="number" min="0" step="0.5" value="${instance.weight ?? instance.targetWeightKg ?? ""}">
          </div>
        ` : ""}

        ${showResistance ? `
          <div class="field field--full">
            <label>Resistance</label>
            <input data-field="resistance" type="text" value="${escapeHtml(instance.resistance ?? "")}">
          </div>
        ` : ""}

        <div class="field">
          <label>Rest (sec)</label>
          <input data-field="restSeconds" type="number" min="0" step="1" value="${instance.restSeconds ?? instance.restSec ?? ""}">
        </div>

        <div class="field field--full">
          <label>Notes (Overrides)</label>
          <textarea data-field="notes">${escapeHtml(instance.notes)}</textarea>
        </div>
      </div>
    </details>
  `;
}

function openExercisePicker(container, exercises, onSelect) {
  const existing = document.getElementById('exercise-picker-modal');
  if (existing) existing.remove();

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'exercise-picker-modal';
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.cssText = 'position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;';
  
  modalOverlay.innerHTML = `
    <div class="modal-content panel" style="max-width: 500px; width: 90%; height: 80vh; display: flex; flex-direction: column; padding: 0;">
      <div style="padding: 24px; border-bottom: 1px solid rgba(143,168,210,0.1);">
        <h2 class="panel__title" style="margin-bottom: 16px;">Browse Exercises</h2>
        <input type="text" id="exercise-search" placeholder="Search exercises..." style="width: 100%;" autofocus>
      </div>
      <div id="exercise-list" style="flex-grow: 1; overflow-y: auto; padding: 12px;">
        <!-- List populated dynamically -->
      </div>
      <div style="padding: 16px; border-top: 1px solid rgba(143,168,210,0.1); text-align: right;">
        <button class="button button--ghost" data-action="close-picker">Cancel</button>
      </div>
    </div>
  `;

  const searchInput = modalOverlay.querySelector('#exercise-search');
  const listContainer = modalOverlay.querySelector('#exercise-list');

  const renderList = (filter = "") => {
    const filtered = exercises.filter(ex => ex.name.toLowerCase().includes(filter.toLowerCase()));
    listContainer.innerHTML = filtered.map(ex => `
      <div class="picker-item" data-id="${ex.id}" style="padding: 12px 16px; cursor: pointer; border-radius: var(--radius-sm); margin-bottom: 4px; transition: background 0.2s;">
        <div style="font-weight: 600; color: var(--text);">${escapeHtml(ex.name)}</div>
        <div style="font-size: 0.8rem; color: var(--soft); text-transform: uppercase;">Type: ${escapeHtml(ex.trackingType || ex.mode || "reps")}</div>
      </div>
    `).join('');

    listContainer.querySelectorAll('.picker-item').forEach(item => {
      item.addEventListener('click', () => {
        onSelect(item.dataset.id);
        close();
      });
    });
  };

  const close = () => {
    modalOverlay.classList.add('modal-overlay--closing');
    setTimeout(() => modalOverlay.remove(), 200);
  };

  searchInput.addEventListener('input', (e) => renderList(e.target.value));
  modalOverlay.querySelector('[data-action="close-picker"]').addEventListener('click', close);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) close(); });

  container.appendChild(modalOverlay);
  renderList();
}

function renderSelectedRoutine(routine, state) {
  const entries = routine.entries || routine.exercises || [];
  return `
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0; color: var(--brand); font-size: 2rem;">Routine Editor</h2>
      <p style="color: var(--soft);">Refining Template: ${escapeHtml(routine.name || "Untitled")}</p>
    </div>

    <section class="panel" style="margin-bottom: 100px;">
      <div class="panel__header" style="flex-wrap: wrap; gap: 20px;">
        <div>
          <h3 style="margin: 0; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);">Routine Configuration</h3>
        </div>
        <div class="toolbar" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <button class="button button--primary" data-action="open-picker" type="button" style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem; line-height: 1;">+</span> Browse Exercises
          </button>
          <button class="button button--danger button--ghost" data-action="delete-routine" type="button">Delete Routine</button>
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
          <div class="field field--full">
            <label>Routine Notes</label>
            <textarea data-routine-field="notes">${escapeHtml(routine.notes)}</textarea>
          </div>
        </div>

        <div class="exercise-list">
          ${entries.length === 0 ? '<p class="muted" style="text-align: center; padding: 40px; border: 2px dashed rgba(143,168,210,0.1); border-radius: var(--radius-md);">No exercises yet. Click "Browse Exercises" to start building.</p>' : entries.map((exercise) => renderExerciseCard(exercise, state)).join("")}
        </div>
      </div>
    </section>

    <!-- Standardized Action Bar -->
    <div class="form-actions" style="position: fixed; bottom: 0; left: 0; right: 0; background: rgba(9, 17, 31, 0.95); backdrop-filter: blur(10px); border-top: 1px solid rgba(143, 168, 210, 0.2); padding: 20px; z-index: 100; display: flex; justify-content: center; gap: 20px;">
      <button class="button button--ghost" data-action="back-to-list" style="min-width: 180px;">Discard Changes</button>
      <button class="button button--primary" data-action="save-routine" style="min-width: 180px;">Save Changes</button>
    </div>
  `;
}

export function renderRoutineView(container, { state, actions }) {
  const { routines, selectedRoutineId, draftRoutine } = state;
  const selectedRoutine = routines.find((r) => r.id === selectedRoutineId) ?? null;

  if (!selectedRoutine) {
    container.innerHTML = `
      <section class="page page-single">
        <div class="panel">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Routine Library</h2>
              <p class="panel__copy">Manage your reusable training blocks.</p>
            </div>
            <div class="toolbar">
              <button class="button button--primary" data-action="create-routine" type="button">New Routine</button>
            </div>
          </div>
          <div class="panel__body">
            ${routines.length === 0 ? '<p class="muted">No routines found. Create one!</p>' : `
              <div class="card-grid">
                ${routines.map(routine => `
                  <div class="exercise-card" style="display: flex; flex-direction: column; padding: 24px;">
                    <h3 class="exercise-card__title" style="font-size: 1.2rem; color: var(--brand); margin-bottom: 8px;">${escapeHtml(routine.name || "Untitled Routine")}</h3>
                    <p class="muted" style="font-size: 0.9rem; margin-bottom: 24px; flex-grow: 1;">${escapeHtml(routine.notes ? (routine.notes.length > 120 ? routine.notes.slice(0, 120) + '...' : routine.notes) : "No description")}</p>
                    <div style="font-size: 0.85rem; color: var(--soft); margin-bottom: 16px; display: flex; justify-content: space-between;">
                      <span>${formatExerciseCount((routine.entries || routine.exercises || []).length)}</span>
                      <span style="color: var(--brand-2); font-weight: 700;">Score: ${routine.difficultyScore ?? 1}</span>
                    </div>
                    <button class="button button--ghost" data-action="select-routine" data-routine-id="${routine.id}" type="button" style="width: 100%;">Edit Routine</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </section>
    `;
  } else if (draftRoutine) {
    container.innerHTML = `
      <section class="page page-single">
        ${renderSelectedRoutine(draftRoutine, state)}
      </section>
    `;
  }

  // Bind Shared Listeners
  container.querySelector('[data-action="create-routine"]')?.addEventListener("click", () => actions.createRoutine());
  container.querySelectorAll('[data-action="select-routine"]').forEach((button) => {
    button.addEventListener("click", () => actions.selectRoutine(button.dataset.routineId));
  });

  if (!selectedRoutine || !draftRoutine) return;

  // Bind Editor Listeners
  container.querySelector('[data-action="back-to-list"]')?.addEventListener('click', () => actions.selectRoutine(null));
  container.querySelector('[data-action="save-routine"]')?.addEventListener("click", () => actions.saveRoutine());
  container.querySelector('[data-action="delete-routine"]')?.addEventListener("click", () => {
    confirmAction(document.body, {
      title: "Delete Routine?",
      message: `Are you sure you want to delete "${selectedRoutine.name}"? This will permanently remove the template and its exercise configuration.`,
      confirmText: "Delete",
      onConfirm: () => actions.deleteRoutine(selectedRoutine.id)
    });
  });
  
  container.querySelector('[data-action="open-picker"]')?.addEventListener("click", () => {
    openExercisePicker(document.body, state.exercises, (exerciseId) => {
      actions.addExercise(exerciseId);
    });
  });

  container.querySelectorAll("[data-routine-field]").forEach((field) => {
    field.addEventListener("change", () => {
      actions.updateRoutine({ [field.dataset.routineField]: field.value });
    });
  });

  container.querySelectorAll("[data-instance-id]").forEach((exerciseCard) => {
    const { instanceId } = exerciseCard.dataset;
    exerciseCard.querySelectorAll("[data-field]").forEach((field) => {
      field.addEventListener("change", () => {
        actions.updateExercise(instanceId, { [field.dataset.field]: field.value });
      });
    });

    exerciseCard.querySelector('[data-action="exercise-delete"]')?.addEventListener("click", () => {
      confirmAction(document.body, {
        title: "Remove Exercise?",
        message: "Are you sure you want to remove this exercise from the routine?",
        confirmText: "Remove",
        onConfirm: () => actions.deleteExercise(instanceId)
      });
    });
    
    exerciseCard.querySelector('[data-action="exercise-up"]')?.addEventListener("click", () => actions.moveExercise(instanceId, "up"));
    exerciseCard.querySelector('[data-action="exercise-down"]')?.addEventListener("click", () => actions.moveExercise(instanceId, "down"));
    exerciseCard.addEventListener("toggle", (event) => actions.toggleExerciseExpansion(instanceId, event.target.open));
  });
}
