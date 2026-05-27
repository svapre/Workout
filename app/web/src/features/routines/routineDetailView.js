import { buildRoutineDetailModel } from "../library/displayModels.js";
import {
  renderEmptyState,
  renderMetadataSummaryRow,
  renderSummaryStats,
} from "../library/metadataPrimitives.js";
import { renderPrimaryVisual } from "../library/primaryVisuals.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseRouteId(route) {
  return String(route || "").split("/")[1] || "";
}

function renderMetricGlyph(kind) {
  if (kind === "duration" || kind === "rest") {
    return `
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="5.25"></circle>
        <path d="M8 5.1v3.2l2.1 1.45"></path>
      </svg>
    `;
  }

  if (kind === "load") {
    return `
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2.5 6.4v3.2"></path>
        <path d="M4.4 5.4v5.2"></path>
        <path d="M11.6 5.4v5.2"></path>
        <path d="M13.5 6.4v3.2"></path>
        <path d="M4.4 8h7.2"></path>
      </svg>
    `;
  }

  if (kind === "effort") {
    return `
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 2.3l1.45 3.15 3.45.32-2.6 2.42.74 3.38L8 9.88 4.96 11.6l.74-3.38-2.6-2.42 3.45-.32z"></path>
      </svg>
    `;
  }

  if (kind === "side") {
    return `
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 3.25v9.5"></path>
        <path d="M4 3.25l-1.75 1.75"></path>
        <path d="M4 3.25l1.75 1.75"></path>
        <path d="M12 12.75v-9.5"></path>
        <path d="M12 12.75l-1.75-1.75"></path>
        <path d="M12 12.75l1.75-1.75"></path>
      </svg>
    `;
  }

  if (kind === "hold") {
    return `
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="4.25" y="3.5" width="2.5" height="9"></rect>
        <rect x="9.25" y="3.5" width="2.5" height="9"></rect>
      </svg>
    `;
  }

  if (kind === "tempo") {
    return `
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2.5 9.75c1.3 0 1.3-3.5 2.6-3.5s1.3 3.5 2.6 3.5 1.3-3.5 2.6-3.5 1.3 3.5 2.7 3.5"></path>
      </svg>
    `;
  }

  if (kind === "switch") {
    return `
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.5 4.5h7"></path>
        <path d="M8.5 2.75l2 1.75-2 1.75"></path>
        <path d="M12.5 11.5h-7"></path>
        <path d="M7.5 9.75l-2 1.75 2 1.75"></path>
      </svg>
    `;
  }

  if (kind === "next") {
    return `
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 8h8"></path>
        <path d="M8.75 4.75L12 8l-3.25 3.25"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 5.25h10"></path>
      <path d="M3 10.75h10"></path>
      <path d="M6.15 3.35L3.9 5.25l2.25 1.9"></path>
      <path d="M9.85 8.85l2.25 1.9-2.25 1.9"></path>
    </svg>
  `;
}

function getExecutionCellMap(row) {
  return new Map((row?.cells || []).map((cell) => [cell.kind, cell]));
}

function getWorkExecutionParts(row) {
  const cellMap = getExecutionCellMap(row);
  return {
    goal: cellMap.get("reps") || cellMap.get("duration") || null,
    load: cellMap.get("load") || null,
    modifiers: ["side", "hold", "tempo", "effort"]
      .map((kind) => cellMap.get(kind))
      .filter((item) => item?.value),
  };
}

function renderFlowMetric(item, { withLabel = false } = {}) {
  if (!item?.value) {
    return "";
  }

  return `
    <span class="routine-flow-token routine-flow-token--${escapeHtml(item.kind || "neutral")}">
      <span class="routine-flow-token__glyph">
        ${renderMetricGlyph(item.kind || "neutral")}
      </span>
      <span class="routine-flow-token__text">
        ${withLabel && item.label ? `<span class="routine-flow-token__label">${escapeHtml(item.label)}</span>` : ""}
        <span class="routine-flow-token__value">${escapeHtml(item.value)}</span>
      </span>
    </span>
  `;
}

function getTempoPhaseSymbol(kind) {
  if (kind === "down") {
    return "&darr;";
  }
  if (kind === "up") {
    return "&uarr;";
  }
  if (kind === "cadence") {
    return "&bull;";
  }
  if (kind === "bottom_hold") {
    return "B";
  }
  if (kind === "top_hold") {
    return "T";
  }
  return "~";
}

function renderTempoModifier(item) {
  const steps = item?.detail?.steps || [];
  if (!steps.length) {
    return "";
  }

  return `
    <span class="routine-flow-tempo-block" aria-label="${escapeHtml(item.detail?.summary || item.value || "Tempo")}">
      <span class="routine-flow-tempo-block__label">Tempo</span>
      <span class="routine-flow-tempo">
        ${steps.map((step) => `
          <span class="routine-flow-tempo__phase routine-flow-tempo__phase--${escapeHtml(step.kind || "neutral")}">
            <span class="routine-flow-tempo__symbol" aria-hidden="true">${getTempoPhaseSymbol(step.kind)}</span>
            <span class="routine-flow-tempo__copy">
              <span class="routine-flow-tempo__phase-label">${escapeHtml(step.label || "Tempo")}</span>
              <span class="routine-flow-tempo__phase-value">${escapeHtml(step.value || "")}</span>
            </span>
          </span>
        `).join("")}
      </span>
    </span>
  `;
}

function formatModifierText(item) {
  if (!item?.value) {
    return "";
  }

  const value = String(item.value).trim();
  if (!value) {
    return "";
  }

  if (item.kind === "hold") {
    return `Hold ${value}`;
  }
  if (item.kind === "tempo") {
    return `Tempo ${value}`;
  }
  if (item.kind === "effort") {
    return `Effort ${value}`;
  }
  if (item.kind === "side") {
    return `${value} side`;
  }

  return item.label ? `${item.label} ${value}` : value;
}

function renderFlowModifier(item) {
  if (item?.kind === "tempo" && item?.detail?.steps?.length) {
    return renderTempoModifier(item);
  }

  const text = formatModifierText(item);
  if (!text) {
    return "";
  }

  return `
    <span class="routine-flow-modifier routine-flow-modifier--${escapeHtml(item.kind || "neutral")}">
      <span class="routine-flow-modifier__glyph">
        ${renderMetricGlyph(item.kind || "neutral")}
      </span>
      <span class="routine-flow-modifier__text">${escapeHtml(text)}</span>
    </span>
  `;
}

function getSharedGroupNote(rows = []) {
  const workNotes = rows
    .filter((row) => row.type === "work")
    .map((row) => String(row.notes || "").trim())
    .filter(Boolean);

  if (workNotes.length < 2) {
    return "";
  }

  const [first] = workNotes;
  return workNotes.every((note) => note === first) ? first : "";
}

function renderWorkExecutionRow(row, sharedNote = "") {
  const { goal, load, modifiers } = getWorkExecutionParts(row);
  const primaryMetrics = [goal, load].filter((item) => item?.value);
  const secondaryModifiers = modifiers.filter((item) => item?.value);
  const note = row.notes && row.notes !== sharedNote ? row.notes : "";

  return `
    <div class="routine-flow-row routine-flow-row--work">
      <span class="routine-flow-row__kind">Work</span>
      <div class="routine-flow-row__body">
        <div class="routine-flow-row__primary">
          <span class="routine-flow-row__title">${escapeHtml(row.label || "Work")}</span>
          ${primaryMetrics.length
            ? `<div class="routine-flow-row__metrics">${primaryMetrics.map((item) => renderFlowMetric(item)).join("")}</div>`
            : ""}
        </div>
        ${secondaryModifiers.length
          ? `<div class="routine-flow-row__secondary">${secondaryModifiers.map((item) => renderFlowModifier(item)).join("")}</div>`
          : ""}
        ${note ? `<p class="routine-flow-row__note">${escapeHtml(note)}</p>` : ""}
      </div>
    </div>
  `;
}

function renderCommandExecutionRow(row) {
  const kindLabel = row.type === "rest" ? "Rest" : "Switch";
  const primaryCell = (row.cells || []).find((item) => item?.value) || null;
  const rowTitle = row.label || kindLabel;

  return `
    <div class="routine-flow-row routine-flow-row--${escapeHtml(row.type || "rest")}">
      <span class="routine-flow-row__kind">${escapeHtml(kindLabel)}</span>
      <div class="routine-flow-row__body">
        <div class="routine-flow-row__primary">
          <span class="routine-flow-row__title">${escapeHtml(rowTitle)}</span>
          ${primaryCell ? renderFlowMetric(primaryCell, { withLabel: row.type !== "rest" }) : ""}
        </div>
        ${row.notes ? `<p class="routine-flow-row__note">${escapeHtml(row.notes)}</p>` : ""}
      </div>
    </div>
  `;
}

function renderExecutionRow(row, sharedNote = "") {
  if (row.type === "work") {
    return renderWorkExecutionRow(row, sharedNote);
  }

  return renderCommandExecutionRow(row);
}

function renderFlowGroup(group, sharedNote = "") {
  const rows = group?.rows || [];
  if (!rows.length) {
    return "";
  }

  return `
    <section class="routine-flow-group">
      ${group?.label ? `
        <div class="routine-flow-group__header">
          <span class="routine-flow-group__label">${escapeHtml(group.label)}</span>
        </div>
      ` : ""}
      ${sharedNote ? `<p class="routine-flow-group__note">${escapeHtml(sharedNote)}</p>` : ""}
      <div class="routine-flow-group__lane">
        ${rows.map((row) => renderExecutionRow(row, sharedNote)).join("")}
      </div>
    </section>
  `;
}

function renderEntryBlock(block) {
  const rows = block.rows || [];
  const groups = Array.isArray(block.groups) && block.groups.length
    ? block.groups
    : [{ label: "", rows }];

  return `
    <div class="routine-block routine-block--sequence">
      <div class="routine-block__header">
        <span class="routine-block__label">${escapeHtml(block.label || "Execution flow")}</span>
        ${block.badge ? `<span class="badge badge--muted">${escapeHtml(block.badge)}</span>` : ""}
      </div>
      ${rows.length ? `
        <div class="routine-flow-lane">
          <div class="routine-flow-lane__body">
            ${groups.map((group) => renderFlowGroup(group, getSharedGroupNote(group.rows))).join("")}
          </div>
        </div>
      ` : ""}
      ${block.notes ? `<p class="routine-block__note">${escapeHtml(block.notes)}</p>` : ""}
    </div>
  `;
}

function renderEntry(entry) {
  const compact = entry.exerciseCompact;
  const topBadges = [
    `Entry ${entry.order}`,
    entry.sideBadgeLabel || "",
    ...(entry.traitBadges || []),
  ].filter(Boolean);
  const metaLineParts = [];

  if (entry.executionUnitLabel || compact?.recordKindLabel) {
    const executionLabel = [entry.executionUnitLabel, compact?.recordKindLabel ? String(compact.recordKindLabel).toLowerCase() : ""]
      .filter(Boolean)
      .join(" ");
    if (executionLabel) {
      metaLineParts.push(executionLabel);
    }
  }

  if (compact?.equipmentSummary) {
    metaLineParts.push(compact.equipmentSummary);
  }

  if (entry.modeSummary) {
    metaLineParts.push(entry.modeSummary);
  }

  return `
    <article class="routine-entry-card" data-action="open-exercise" data-exercise-id="${entry.exerciseId}">
      <div class="routine-entry-card__body">
        <div class="routine-entry-card__visual">
          ${compact?.primaryVisual ? renderPrimaryVisual(compact.primaryVisual, { size: "compact" }) : ""}
        </div>
        <div class="routine-entry-card__copy">
          <div class="routine-entry-card__top">
            ${topBadges.map((label) => `<span class="badge badge--muted">${escapeHtml(label)}</span>`).join("")}
          </div>
          <h3 class="routine-entry-card__title">${escapeHtml(entry.exerciseName)}</h3>
          <p class="routine-entry-card__focus">${escapeHtml(compact?.focusSummary || compact?.description || "Activity summary not available yet.")}</p>
          ${metaLineParts.length ? `<p class="routine-entry-card__meta-line">${escapeHtml(metaLineParts.join(" / "))}</p>` : ""}
          <div class="routine-entry-card__nested">
            <div class="routine-block-list">
              ${entry.displayBlocks?.map((block) => renderEntryBlock(block)).join("") || ""}
            </div>
          </div>
          ${entry.notes ? `<p class="routine-entry-card__note">${escapeHtml(entry.notes)}</p>` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderTransition(transition) {
  const resetValue = transition.seconds ? `${transition.seconds}s` : "No reset";
  const nextLabel = transition.nextName || "Next activity";

  return `
    <div class="routine-entry-transition" aria-label="${escapeHtml(`Transition to ${nextLabel}`)}">
      <div class="routine-entry-transition__rail">
        <span class="routine-entry-transition__dot"></span>
      </div>
      <div class="routine-entry-transition__body">
        <span class="routine-entry-transition__eyebrow">Transition</span>
        <div class="routine-entry-transition__reset">
          <span class="routine-entry-transition__reset-label">Reset</span>
          <span class="routine-entry-transition__metric">${escapeHtml(resetValue)}</span>
        </div>
        <div class="routine-entry-transition__next-row">
          <span class="routine-entry-transition__next-label">Next activity</span>
          <span class="routine-entry-transition__next">${escapeHtml(nextLabel)}</span>
        </div>
        ${transition.cue ? `<p class="routine-entry-transition__cue">${escapeHtml(transition.cue)}</p>` : ""}
      </div>
    </div>
  `;
}

function renderFlowItem(item) {
  if (item.kind === "transition") {
    return renderTransition(item.transition);
  }

  return renderEntry(item.entry);
}

function renderRoutineFlow(detail) {
  if (!detail.flowItems?.length) {
    return `<p class="muted">No entries configured yet.</p>`;
  }

  return `
    <div class="routine-flow">
      ${detail.flowItems.map((item) => renderFlowItem(item)).join("")}
    </div>
  `;
}

function bindEntryCards(container, actions, currentRoute) {
  container.querySelectorAll('[data-action="open-exercise"]').forEach((card) => {
    card.addEventListener("click", () => {
      actions.openExerciseDetail(card.dataset.exerciseId, currentRoute);
    });
  });
}

export function renderRoutineDetailView(container, { state, actions }) {
  const routineId = parseRouteId(state.route);
  const routine = (state.routines || []).find((item) => item.id === routineId) || null;
  const detail = buildRoutineDetailModel(routine, state.exercises || []);

  if (!detail) {
    container.innerHTML = `
      <section class="page page-single page-single--narrow">
        ${renderEmptyState(
          "Routine not found",
          "The routine you are trying to inspect no longer exists in the library.",
        )}
      </section>
    `;
    return;
  }

  container.innerHTML = `
      <section class="page page-single page-single--narrow">
        <div class="library-header">
          <div class="library-header__copy stack stack--tight">
            <span class="section-eyebrow">Routine detail</span>
            <h1>${escapeHtml(detail.name)}</h1>
            <p>See each activity, its target, and the reset between activities before you start.</p>
          </div>
        </div>

        <div class="content-stack">
        <section class="panel panel--hero panel--section">
          <div class="panel__body routine-detail-hero">
            <div class="routine-detail-hero__visual">
              ${renderPrimaryVisual(detail.primaryVisual, { size: "detail" })}
            </div>
            <div class="routine-detail-hero__copy">
              <div class="stack stack--tight">
                <span class="panel__eyebrow">Routine overview</span>
                <div class="routine-detail-hero__badges">
                  <span class="badge badge--muted">${escapeHtml(detail.recordSourceLabel)}</span>
                  <span class="badge badge--muted">${escapeHtml(`${detail.entryCount} entr${detail.entryCount === 1 ? "y" : "ies"}`)}</span>
                  ${detail.difficultyScore ? `<span class="badge badge--accent">Difficulty ${escapeHtml(detail.difficultyScore)}</span>` : ""}
                </div>
                <h2 class="panel__title">${escapeHtml(detail.name)}</h2>
                <p class="panel__copy">${escapeHtml(detail.description)}</p>
              </div>
              ${renderSummaryStats(detail.overviewStats, { className: "summary-stats summary-stats--detail" })}
              <p class="routine-detail-hero__summary">${escapeHtml(detail.overviewLine)}</p>
              <div class="action-row">
                <button class="button button--secondary" data-action="edit-routine" type="button">Edit Routine</button>
              </div>
            </div>
          </div>
        </section>

        <section class="panel panel--section">
          <div class="panel__header">
            <div>
              <span class="panel__eyebrow">Ordered routine flow</span>
              <h2 class="panel__title">Activity entries</h2>
              <p class="panel__copy">Follow the routine entry by entry, including work, side switches, rests, and resets between activities.</p>
            </div>
          </div>
          <div class="panel__body">
            ${renderRoutineFlow(detail)}
          </div>
        </section>

        <details class="journey-advanced">
          <summary class="journey-advanced__summary">Routine profile</summary>
          <div class="journey-advanced__content journey-advanced__content--spaced">
            ${renderSummaryStats(detail.overviewStats, { className: "summary-stats" })}
            <div class="summary-stats">
              <div class="summary-stat">
                <span class="summary-stat__label">Equipment</span>
                <span class="summary-stat__value">${escapeHtml(detail.equipmentSummary)}</span>
              </div>
              <div class="summary-stat">
                <span class="summary-stat__label">Tracking</span>
                <span class="summary-stat__value">${escapeHtml(detail.trackingSummary)}</span>
              </div>
              <div class="summary-stat">
                <span class="summary-stat__label">Transitions</span>
                <span class="summary-stat__value">${escapeHtml(detail.transitionSummary)}</span>
              </div>
              <div class="summary-stat">
                <span class="summary-stat__label">Session length</span>
                <span class="summary-stat__value">${escapeHtml(detail.durationSummary)}</span>
              </div>
            </div>
            <div class="stack">
              ${detail.aggregateFields.map((field) => renderMetadataSummaryRow(field.label, field.items)).join("")}
            </div>
            ${detail.notes ? `
              <div class="field field--full">
                <label>Routine notes</label>
                <div class="read-block">${escapeHtml(detail.notes)}</div>
              </div>
            ` : ""}
          </div>
        </details>
      </div>
    </section>
  `;

  container.querySelector('[data-action="edit-routine"]')?.addEventListener("click", () => {
    actions.editRoutineFromDetail(detail.id);
  });

  bindEntryCards(container, actions, state.route);
}
