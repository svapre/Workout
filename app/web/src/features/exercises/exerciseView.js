import {
  getExerciseDefaultTrackingType,
  getExerciseSupportedTrackingModes,
} from "../../data/schemaMigration.js";

const TRACKING_META = {
  reps: { accent: "#4FD1C5", icon: "RP" },
  duration: { accent: "#F6AD55", icon: "TM" },
  weight: { accent: "#63B3ED", icon: "KG" },
  resistance: { accent: "#F687B3", icon: "RS" },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toTitleCase(value) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBodyTargetLabel(value) {
  const raw = String(value ?? "");
  return toTitleCase(raw.startsWith("bm_") ? raw.slice(3) : raw);
}

function renderPills(items, formatter = (item) => item) {
  if (!items?.length) {
    return `<span class="muted">None listed</span>`;
  }

  return `
    <div class="pill-list">
      ${items.map((item) => `<span class="pill">${escapeHtml(formatter(item))}</span>`).join("")}
    </div>
  `;
}

function truncate(value, maxLength = 140) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function summarizeItems(items, formatter = (item) => item, limit = 2) {
  if (!items?.length) {
    return "";
  }

  const visible = items.slice(0, limit).map((item) => formatter(item));
  const remainder = items.length - visible.length;
  return remainder > 0 ? `${visible.join(", ")} +${remainder}` : visible.join(", ");
}

function resolveExerciseType(exercise) {
  return exercise.type || exercise.category || "custom";
}

function getExerciseTheme(exercise) {
  return TRACKING_META[getExerciseDefaultTrackingType(exercise)] || TRACKING_META.reps;
}

function buildExerciseProfile(exercise) {
  const equipment = exercise.equipment?.length ? summarizeItems(exercise.equipment, (item) => item, 2) : "Bodyweight";
  const rest = exercise.restSeconds != null ? `${exercise.restSeconds}s rest` : "Rest not set";
  const aliases = exercise.aliases?.length ? `${exercise.aliases.length} alias${exercise.aliases.length === 1 ? "" : "es"}` : "No aliases";
  const modes = getExerciseSupportedTrackingModes(exercise).map(toTitleCase).join(", ");
  return `${equipment} / ${rest} / ${aliases} / ${modes}`;
}

function renderExerciseLibraryCard(exercise) {
  const theme = getExerciseTheme(exercise);
  const typeLabel = toTitleCase(resolveExerciseType(exercise));
  const defaultTrackingLabel = toTitleCase(getExerciseDefaultTrackingType(exercise));
  const supportedTrackingLabel = getExerciseSupportedTrackingModes(exercise).map(toTitleCase).join(", ");
  const movementLabel = toTitleCase(exercise.movementPattern || "general");
  const targetSummary = summarizeItems(
    exercise.bodyTargets?.length ? exercise.bodyTargets : exercise.primaryMuscles,
    formatBodyTargetLabel,
    3,
  ) || "General movement";
  const missionNote = truncate(
    exercise.whyItHelps || exercise.description || exercise.summary || "No summary yet.",
    150,
  );

  return `
    <article class="plan-card" style="--plan-color: ${theme.accent};" data-action="exercise-card" data-exercise-id="${exercise.id}">
      <div class="plan-card__top">
        <div class="plan-card__icon" style="background: ${theme.accent}22; border-color: ${theme.accent}44; color: ${theme.accent}; font-size: 0.82rem; font-weight: 800;">
          ${theme.icon}
        </div>
        <div class="plan-card__info">
          <h2 class="plan-card__title">${escapeHtml(exercise.name || "Untitled Exercise")}</h2>
          <p class="plan-card__subtitle">${escapeHtml(`${typeLabel} / Default ${defaultTrackingLabel} / ${movementLabel}`)}</p>
        </div>
      </div>

      <div class="plan-card__label-row">
        <span class="plan-card__tag">${escapeHtml(typeLabel)}</span>
        <span class="plan-card__tag">${escapeHtml(supportedTrackingLabel)}</span>
      </div>

      <div class="plan-card__mission">
        <div class="plan-card__mission-label">Primary targets</div>
        <h3 class="plan-card__mission-title">${escapeHtml(targetSummary)}</h3>
        <p class="plan-card__mission-note">${escapeHtml(missionNote)}</p>
      </div>

      <div class="plan-card__progress">
        <div class="plan-card__progress-title">Execution profile</div>
        <div class="plan-card__progress-text">${escapeHtml(buildExerciseProfile(exercise))}</div>
      </div>

      <button
        class="button button--primary plan-card__cta"
        data-action="select-exercise"
        data-exercise-id="${exercise.id}"
        type="button"
        style="background: ${theme.accent}; color: #000; border: none; box-shadow: 0 10px 24px ${theme.accent}55;"
      >
        View detail
      </button>
    </article>
  `;
}

function renderExerciseDetail(exercise) {
  if (!exercise) {
    return `
      <section class="panel panel--section">
        <div class="panel__body">
          <div class="empty-state">
            <h3>No exercise selected</h3>
            <p>Select an exercise from the catalog to inspect muscles, purpose, and source details.</p>
          </div>
        </div>
      </section>
    `;
  }

  const detailMeta = [
    toTitleCase(resolveExerciseType(exercise)),
    `Default ${toTitleCase(getExerciseDefaultTrackingType(exercise))}`,
    toTitleCase(exercise.movementPattern || "general"),
  ].join(" / ");

  return `
    <div class="detail-shell detail-shell--sidebar-left">
      <div class="detail-main">
        <section class="panel panel--hero panel--section">
          <div class="panel__header">
            <div>
              <span class="eyebrow">Exercise record</span>
              <h2 class="panel__title" style="margin-top: 8px;">${escapeHtml(exercise.name)}</h2>
              <p class="panel__copy">${escapeHtml(detailMeta)}</p>
            </div>
          </div>
          <div class="panel__body stack">
            <div class="field field--full">
              <label>Summary</label>
              <div class="read-block">${escapeHtml(exercise.description || exercise.summary || "No summary yet.")}</div>
            </div>
            <div class="field field--full">
              <label>Why it helps</label>
              <div class="read-block">${escapeHtml(exercise.whyItHelps || "No context yet.")}</div>
            </div>
            <div class="field field--full">
              <label>Source</label>
              <div class="read-block">
                <div>${escapeHtml(exercise.sourceName || "Internal record")}</div>
                ${exercise.sourceUrl ? `<div style="margin-top: 12px;"><a class="source-link" href="${escapeHtml(exercise.sourceUrl)}" target="_blank" rel="noreferrer">Open source reference</a></div>` : ""}
                ${exercise.notes ? `<div style="margin-top: 12px;">${escapeHtml(exercise.notes)}</div>` : ""}
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside class="detail-sidebar">
        <section class="panel panel--section">
          <div class="panel__header">
            <div>
              <h3 class="panel__title">Targets</h3>
              <p class="panel__copy">Muscle groups and context linked to this exercise record.</p>
            </div>
          </div>
          <div class="panel__body stack">
            <div class="field field--full">
              <label>Body targets</label>
              ${renderPills((exercise.bodyTargets?.length ? exercise.bodyTargets : exercise.primaryMuscles) || [], formatBodyTargetLabel)}
            </div>
            <div class="field field--full">
              <label>Secondary muscles</label>
              ${renderPills(exercise.secondaryMuscles, formatBodyTargetLabel)}
            </div>
          </div>
        </section>

        <section class="panel panel--section">
          <div class="panel__header">
            <div>
              <h3 class="panel__title">Execution profile</h3>
              <p class="panel__copy">What routines inherit when they reference this exercise.</p>
            </div>
          </div>
          <div class="panel__body stack">
            <div class="field field--full">
              <label>Equipment</label>
              ${renderPills(exercise.equipment)}
            </div>
            <div class="field field--full">
              <label>Supported tracking modes</label>
              ${renderPills(getExerciseSupportedTrackingModes(exercise), toTitleCase)}
            </div>
            <div class="field field--full">
              <label>Aliases</label>
              ${renderPills(exercise.aliases)}
            </div>
          </div>
        </section>
      </aside>
    </div>
  `;
}

export function renderExerciseView(container, { state, actions }) {
  const selectedExercise = state.selectedExerciseId
    ? state.exercises.find((exercise) => exercise.id === state.selectedExerciseId)
    : null;

  if (!selectedExercise) {
    container.innerHTML = `
      <section class="page page-single">
        <div class="library-header">
          <div class="library-header__copy">
            <h1>Exercise Library</h1>
            <p>Master records for the movements your plans and routines resolve at runtime.</p>
          </div>
          <div class="library-header__actions">
            <button class="button button--ghost" data-action="import-exercises" type="button">Import Catalog</button>
            <button class="button" data-action="export-exercises" type="button">Export Catalog</button>
            <input class="hidden" data-role="exercise-import-input" type="file" accept=".csv,.json,text/csv,application/json">
          </div>
        </div>

        ${state.exercises.length === 0 ? `
          <section class="panel">
            <div class="panel__body">
              <div class="empty-state">
                <h3>No exercises found</h3>
                <p>Import a catalog or seed a few exercises to start building routines and plans.</p>
              </div>
            </div>
          </section>
        ` : `
          <div class="plan-card-grid">
            ${state.exercises.map((exercise) => renderExerciseLibraryCard(exercise)).join("")}
          </div>
        `}
      </section>
    `;
  } else {
    container.innerHTML = `
      <section class="page page-single page-single--narrow">
        <div class="library-header">
          <div class="library-header__copy">
            <button class="button button--ghost" data-action="back-to-list" type="button">Back to Exercises</button>
            <h1 style="margin-top: 14px;">Exercise Record</h1>
            <p>Inspect the movement, why it helps, and the reference data your routines resolve at render time.</p>
          </div>
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

  container.querySelector('[data-action="back-to-list"]')?.addEventListener("click", () => {
    actions.selectExercise(null);
  });

  container.querySelectorAll('[data-action="exercise-card"]').forEach((card) => {
    card.addEventListener("click", () => {
      actions.selectExercise(card.dataset.exerciseId);
    });
  });

  container.querySelectorAll('[data-action="select-exercise"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.selectExercise(button.dataset.exerciseId);
    });
  });
}
