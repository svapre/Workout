/**
 * Routine Editor View
 * 
 * Manages the ordered list of exercises for a specific routine.
 */

import { confirmAction } from "../../ui/modal.js";
import {
  getExerciseDefaultTrackingType,
  getExerciseSupportedTrackingModes,
  inferRoutineEntryTrackingType,
} from "../../data/schemaMigration.js";

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

function truncate(value, maxLength = 150) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function summarizeRoutineFocus(routine, state) {
  const entries = routine.entries || routine.exercises || [];
  const names = entries
    .map((entry) => state.exercises.find((exercise) => exercise.id === entry.exerciseId)?.name)
    .filter(Boolean)
    .slice(0, 3);

  if (names.length === 0) {
    return "No exercises yet";
  }

  const remainder = entries.length - names.length;
  return remainder > 0 ? `${names.join(", ")} +${remainder}` : names.join(", ");
}

function getRoutineTheme(routine) {
  const difficulty = Number(routine.difficultyScore ?? 1);
  if (difficulty >= 8) {
    return { accent: "#F6AD55", icon: "HI" };
  }
  if (difficulty >= 5) {
    return { accent: "#4FD1C5", icon: "RT" };
  }
  return { accent: "#63B3ED", icon: "EZ" };
}

function renderRoutineLibraryCard(routine, state) {
  const theme = getRoutineTheme(routine);
  const entries = routine.entries || routine.exercises || [];
  const exerciseCount = entries.length;
  const note = truncate(routine.notes || routine.description || "No routine notes yet.", 150);

  return `
    <article class="plan-card" style="--plan-color: ${theme.accent};" data-action="routine-card" data-routine-id="${routine.id}">
      <div class="plan-card__top">
        <div class="plan-card__icon" style="background: ${theme.accent}22; border-color: ${theme.accent}44; color: ${theme.accent}; font-size: 0.82rem; font-weight: 800;">
          ${theme.icon}
        </div>
        <div class="plan-card__info">
          <h2 class="plan-card__title">${escapeHtml(routine.name || "Untitled Routine")}</h2>
          <p class="plan-card__subtitle">Reusable session block for one or more active plans.</p>
        </div>
      </div>

      <div class="plan-card__label-row">
        <span class="plan-card__tag">${escapeHtml(formatExerciseCount(exerciseCount))}</span>
        <span class="plan-card__tag">${escapeHtml(`Difficulty ${routine.difficultyScore ?? 1}`)}</span>
      </div>

      <div class="plan-card__mission">
        <div class="plan-card__mission-label">Routine focus</div>
        <h3 class="plan-card__mission-title">${escapeHtml(summarizeRoutineFocus(routine, state))}</h3>
        <p class="plan-card__mission-note">${escapeHtml(note)}</p>
      </div>

      <div class="plan-card__progress">
        <div class="plan-card__progress-title">Readiness</div>
        <div class="plan-card__progress-text">${escapeHtml(`${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"} configured`)}</div>
      </div>

      <button
        class="button button--primary plan-card__cta"
        data-action="select-routine"
        data-routine-id="${routine.id}"
        type="button"
        style="background: ${theme.accent}; color: #000; border: none; box-shadow: 0 10px 24px ${theme.accent}55;"
      >
        Edit routine
      </button>
    </article>
  `;
}

function renderExerciseCard(instance, state) {
  const catalogEntry = state.exercises.find(e => e.id === instance.exerciseId);
  const name = catalogEntry?.name || "Unknown Exercise";
  const supportedModes = getExerciseSupportedTrackingModes(catalogEntry);
  const mode = inferRoutineEntryTrackingType(instance, catalogEntry);

  const showReps = mode === "reps" || mode === "weight" || (mode === "resistance" && instance.durationSeconds == null);
  const showDuration = mode === "duration";
  const showWeight = mode === "weight" || instance.weight != null;
  const showResistance = mode === "resistance" || instance.resistance != null;

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
        ${supportedModes.length > 1 ? `
          <div class="field">
            <label>Tracking mode</label>
            <select data-field="trackingMode">
              ${supportedModes.map((trackingMode) => `
                <option value="${trackingMode}" ${trackingMode === mode ? "selected" : ""}>${escapeHtml(trackingMode)}</option>
              `).join("")}
            </select>
          </div>
        ` : `
          <div class="field">
            <label>Tracking mode</label>
            <div class="read-block">${escapeHtml(getExerciseDefaultTrackingType(catalogEntry))}</div>
          </div>
        `}

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
        <div style="font-size: 0.8rem; color: var(--soft); text-transform: uppercase;">Modes: ${escapeHtml(getExerciseSupportedTrackingModes(ex).join(", "))}</div>
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
    <div class="editor-shell">
      <div class="library-header">
        <div class="library-header__copy">
          <button class="button button--ghost" data-action="back-to-list" type="button">Back to Routines</button>
          <h1 style="margin-top: 14px;">Routine Editor</h1>
          <p>Refining template: ${escapeHtml(routine.name || "Untitled")}</p>
        </div>
        <div class="library-header__actions">
          <button class="button button--primary" data-action="open-picker" type="button">Add Exercise</button>
          <button class="button button--ghost button--danger" data-action="delete-routine" type="button">Delete Routine</button>
        </div>
      </div>

      <section class="panel panel--section">
        <div class="panel__header">
          <div>
            <span class="eyebrow">Routine configuration</span>
            <h3 class="panel__title" style="margin-top: 8px;">Template settings</h3>
            <p class="panel__copy">Define the reusable session block, then arrange the exercise instances below.</p>
          </div>
        </div>
        <div class="panel__body stack">
          <div class="field-grid">
            <div class="field">
              <label>Routine name</label>
              <input data-routine-field="name" type="text" value="${escapeHtml(routine.name)}">
            </div>
            <div class="field">
              <label>Difficulty score (1-10)</label>
              <input data-routine-field="difficultyScore" type="number" min="1" max="10" step="1" value="${routine.difficultyScore ?? 1}">
            </div>
            <div class="field field--full">
              <label>Routine notes</label>
              <textarea data-routine-field="notes">${escapeHtml(routine.notes)}</textarea>
            </div>
          </div>
        </div>
      </section>

      <section class="panel panel--section">
        <div class="panel__header">
          <div>
            <span class="eyebrow">Exercise flow</span>
            <h3 class="panel__title" style="margin-top: 8px;">Ordered routine entries</h3>
            <p class="panel__copy">Each entry is the instanced exercise prescription this routine will execute.</p>
          </div>
        </div>
        <div class="panel__body">
          <div class="exercise-list">
            ${entries.length === 0 ? '<p class="muted" style="text-align: center; padding: 40px; border: 2px dashed rgba(143,168,210,0.1); border-radius: var(--radius-md);">No exercises yet. Click "Add Exercise" to start building.</p>' : entries.map((exercise) => renderExerciseCard(exercise, state)).join("")}
          </div>
        </div>
      </section>

      <div class="form-actions">
        <button class="button button--ghost" data-action="back-to-list">Discard Changes</button>
        <button class="button button--primary" data-action="save-routine">Save Changes</button>
      </div>
    </div>
  `;
}

export function renderRoutineView(container, { state, actions }) {
  const { routines, selectedRoutineId, draftRoutine } = state;
  const selectedRoutine = routines.find((r) => r.id === selectedRoutineId) ?? null;

  if (!selectedRoutine) {
    container.innerHTML = `
      <section class="page page-single">
        <div class="library-header">
          <div class="library-header__copy">
            <h1>Routine Library</h1>
            <p>Reusable session blocks that your plans execute without storing duplicate exercise names.</p>
          </div>
          <div class="library-header__actions">
            <button class="button button--primary" data-action="create-routine" type="button">New Routine</button>
          </div>
        </div>

        ${routines.length === 0 ? `
          <section class="panel">
            <div class="panel__body">
              <div class="empty-state">
                <h3>No routines found</h3>
                <p>Create a reusable routine to start assembling blueprint schedules and active plans.</p>
              </div>
            </div>
          </section>
        ` : `
          <div class="plan-card-grid">
            ${routines.map((routine) => renderRoutineLibraryCard(routine, state)).join("")}
          </div>
        `}
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
  container.querySelectorAll('[data-action="routine-card"]').forEach((card) => {
    card.addEventListener("click", () => actions.selectRoutine(card.dataset.routineId));
  });
  container.querySelectorAll('[data-action="select-routine"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.selectRoutine(button.dataset.routineId);
    });
  });

  if (!selectedRoutine || !draftRoutine) return;

  // Bind Editor Listeners
  container.querySelector('[data-action="back-to-list"]')?.addEventListener("click", () =>
    actions.leaveRoutineEditor(),
  );
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
        if (field.dataset.field === "trackingMode") {
          const selectedMode = field.value;
          const currentEntry = (state.draftRoutine?.entries || state.draftRoutine?.exercises || []).find((entry) => entry.id === instanceId) || {};
          const nextPatch = selectedMode === "duration"
            ? {
                reps: null,
                durationSeconds: currentEntry.durationSeconds ?? 30,
                weight: null,
                resistance: null,
              }
            : selectedMode === "weight"
              ? {
                  reps: currentEntry.reps ?? 5,
                  durationSeconds: null,
                  weight: currentEntry.weight ?? 20,
                  resistance: null,
                }
              : selectedMode === "resistance"
                ? {
                    reps: currentEntry.reps ?? 10,
                    durationSeconds: null,
                    weight: null,
                    resistance: currentEntry.resistance ?? "Band",
                  }
                : {
                    reps: currentEntry.reps ?? 10,
                    durationSeconds: null,
                    weight: null,
                    resistance: null,
                  };
          actions.updateExercise(instanceId, nextPatch);
          return;
        }
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
