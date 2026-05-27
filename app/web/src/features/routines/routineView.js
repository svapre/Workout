/**
 * Routine Editor View
 * 
 * Manages the ordered list of exercises for a specific routine.
 */

import { confirmAction } from "../../ui/modal.js";
import { createId } from "../../core/uid.js";
import { buildRoutineCompactModel } from "../library/displayModels.js";
import { renderPrimaryVisual } from "../library/primaryVisuals.js";
import {
  getExerciseDefaultTrackingType,
  getExecutionUnitLabel,
  getExerciseExecutionUnitType,
  getRoutineBlockTempoSummary,
  getRoutineEntryBlocks,
  getExerciseSupportedTrackingModes,
  inferRoutineEntryTrackingType,
} from "../../data/schemaMigration.js";
import {
  formatEffortLabel,
  formatRepGoalLabel,
} from "./executionFlow.js";

function formatExerciseCount(count) {
  return `${count} activit${count === 1 ? "y" : "ies"}`;
}
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function summarizeRoutineFocus(routine, state) {
  const entries = routine.entries || routine.exercises || [];
  const names = entries
    .map((entry) => state.exercises.find((exercise) => exercise.id === entry.exerciseId)?.name)
    .filter(Boolean)
    .slice(0, 3);

  if (names.length === 0) {
    return "No activities yet";
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

function formatDurationToken(totalSeconds) {
  const numeric = Number(totalSeconds);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }
  if (numeric % 60 === 0) {
    return `${numeric / 60} min`;
  }
  if (numeric >= 60) {
    const mins = Math.floor(numeric / 60);
    const secs = numeric % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  }
  return `${numeric}s`;
}

function formatSideLabel(side) {
  const normalized = String(side ?? "").trim().toLowerCase();
  if (!normalized) return "None";
  if (normalized === "left") return "Left";
  if (normalized === "right") return "Right";
  if (normalized === "both") return "Both";
  if (normalized === "alternating") return "Alternating";
  return normalized;
}

function isEmptyValue(value) {
  return value == null || value === "";
}

function createEditorBlock(type = "work", overrides = {}) {
  const base = {
    id: createId("entry_block"),
    type,
    label: "",
    metricType: type === "work" ? "reps" : null,
    side: null,
    repTargetMode: type === "work" ? "exact" : null,
    reps: null,
    durationSeconds: null,
    weight: null,
    resistance: null,
    seconds: null,
    holdSeconds: null,
    tempoMode: null,
    tempoSecondsPerRep: null,
    tempoDownSeconds: null,
    tempoBottomHoldSeconds: null,
    tempoUpSeconds: null,
    tempoTopHoldSeconds: null,
    tempoLabel: null,
    effort: null,
    notes: "",
    order: 0,
  };

  if (type === "rest") {
    return {
      ...base,
      label: "Rest",
      seconds: 30,
      ...overrides,
      type: "rest",
      metricType: null,
      side: null,
      repTargetMode: null,
      reps: null,
      durationSeconds: null,
      weight: null,
      resistance: null,
      holdSeconds: null,
      tempoMode: null,
      tempoSecondsPerRep: null,
      tempoDownSeconds: null,
      tempoBottomHoldSeconds: null,
      tempoUpSeconds: null,
      tempoTopHoldSeconds: null,
      tempoLabel: null,
      effort: null,
    };
  }

  if (type === "switch_side") {
    return {
      ...base,
      label: "Switch sides",
      side: "right",
      ...overrides,
      type: "switch_side",
      metricType: null,
      repTargetMode: null,
      reps: null,
      durationSeconds: null,
      weight: null,
      resistance: null,
      seconds: null,
      holdSeconds: null,
      tempoMode: null,
      tempoSecondsPerRep: null,
      tempoDownSeconds: null,
      tempoBottomHoldSeconds: null,
      tempoUpSeconds: null,
      tempoTopHoldSeconds: null,
      tempoLabel: null,
      effort: null,
    };
  }

  return {
    ...base,
    label: "Work block",
    reps: 10,
    ...overrides,
    type: "work",
    metricType: overrides.metricType ?? base.metricType,
  };
}

function renumberBlocks(blocks = []) {
  return blocks.map((block, index) => ({
    ...block,
    order: index + 1,
  }));
}

function summarizeBlock(block) {
  if (block.type === "rest") {
    return `Rest / ${formatDurationToken(block.seconds) || "0s"}`;
  }
  if (block.type === "switch_side") {
    return `Switch / ${block.side ? `${formatSideLabel(block.side)} side` : "Other side"}`;
  }

  const parts = [];
  if (!isEmptyValue(block.label)) parts.push(block.label);
  if (block.metricType === "duration") {
    parts.push(formatDurationToken(block.durationSeconds) || "Timed");
  } else {
    parts.push(formatRepGoalLabel(block));
  }
  if (!isEmptyValue(block.weight)) parts.push(`${block.weight}kg`);
  if (!isEmptyValue(block.resistance)) parts.push(String(block.resistance));
  if (!isEmptyValue(block.side)) parts.push(formatSideLabel(block.side));
  if (!isEmptyValue(block.holdSeconds)) parts.push(`Hold ${formatDurationToken(block.holdSeconds)} per rep`);
  const tempoSummary = getRoutineBlockTempoSummary(block);
  if (tempoSummary) parts.push(tempoSummary);
  const effortLabel = String(block.effort ?? "").trim().toLowerCase() === "amrap"
    ? ""
    : formatEffortLabel(block.effort);
  if (effortLabel) parts.push(effortLabel);
  return parts.join(" / ");
}

function parseDraftNumeric(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBlockFieldValue(field, value) {
  const numericFields = new Set([
    "reps",
    "durationSeconds",
    "weight",
    "seconds",
    "holdSeconds",
    "tempoSecondsPerRep",
    "tempoDownSeconds",
    "tempoBottomHoldSeconds",
    "tempoUpSeconds",
    "tempoTopHoldSeconds",
  ]);

  if (numericFields.has(field)) {
    return parseDraftNumeric(value);
  }

  if (["metricType", "side", "tempoMode", "effort", "repTargetMode"].includes(field)) {
    return value || null;
  }

  if (["resistance", "tempoLabel", "notes"].includes(field)) {
    return value === "" ? null : String(value);
  }

  return String(value);
}

function coerceBlockType(block, nextType) {
  const current = block || {};
  if (nextType === "rest") {
    return createEditorBlock("rest", {
      id: current.id,
      order: current.order,
      label: current.label === "Work block" ? "Rest" : current.label,
      seconds: current.seconds ?? 30,
      notes: current.notes ?? "",
    });
  }

  if (nextType === "switch_side") {
    return createEditorBlock("switch_side", {
      id: current.id,
      order: current.order,
      label: current.label === "Work block" ? "Switch sides" : current.label,
      side: current.side ?? "right",
      notes: current.notes ?? "",
    });
  }

  const nextMetricType = current.metricType === "duration" ? "duration" : "reps";
  return createEditorBlock("work", {
    id: current.id,
    order: current.order,
    label: current.label,
    metricType: nextMetricType,
    side: current.side ?? null,
    repTargetMode: nextMetricType === "reps" ? current.repTargetMode ?? "exact" : null,
    reps: nextMetricType === "duration" ? null : current.reps ?? 10,
    durationSeconds: nextMetricType === "duration" ? current.durationSeconds ?? 30 : null,
    weight: nextMetricType === "duration" ? null : current.weight ?? null,
    resistance: nextMetricType === "duration" ? null : current.resistance ?? null,
    holdSeconds: current.holdSeconds ?? null,
    tempoMode: current.tempoMode ?? null,
    tempoSecondsPerRep: current.tempoSecondsPerRep ?? null,
    tempoDownSeconds: current.tempoDownSeconds ?? null,
    tempoBottomHoldSeconds: current.tempoBottomHoldSeconds ?? null,
    tempoUpSeconds: current.tempoUpSeconds ?? null,
    tempoTopHoldSeconds: current.tempoTopHoldSeconds ?? null,
    tempoLabel: current.tempoLabel ?? null,
    effort: current.effort ?? null,
    notes: current.notes ?? "",
  });
}

function applyMetricTypeToBlock(block, metricType) {
  const nextMetricType = metricType || "reps";
  if (nextMetricType === "duration") {
    return {
      ...block,
      metricType: "duration",
      repTargetMode: null,
      durationSeconds: block.durationSeconds ?? 30,
      reps: null,
      weight: null,
      resistance: null,
    };
  }

  return {
    ...block,
    metricType: "reps",
    repTargetMode: block.repTargetMode ?? "exact",
    reps: block.reps ?? 10,
    durationSeconds: null,
  };
}

function applyRepTargetModeToBlock(block, repTargetMode) {
  const nextMode = repTargetMode || "exact";
  if (nextMode === "max") {
    return {
      ...block,
      repTargetMode: "max",
      reps: null,
    };
  }

  return {
    ...block,
    repTargetMode: nextMode,
    reps: block.reps ?? 10,
  };
}

function applyTempoModeToSource(source, tempoMode) {
  const nextMode = tempoMode || null;
  if (nextMode === "cadence") {
    return {
      ...source,
      tempoMode: "cadence",
      tempoSecondsPerRep: source.tempoSecondsPerRep ?? 4,
      tempoDownSeconds: null,
      tempoBottomHoldSeconds: null,
      tempoUpSeconds: null,
      tempoTopHoldSeconds: null,
    };
  }

  if (nextMode === "phased") {
    return {
      ...source,
      tempoMode: "phased",
      tempoSecondsPerRep: null,
      tempoDownSeconds: source.tempoDownSeconds ?? 3,
      tempoBottomHoldSeconds: source.tempoBottomHoldSeconds ?? null,
      tempoUpSeconds: source.tempoUpSeconds ?? 1,
      tempoTopHoldSeconds: source.tempoTopHoldSeconds ?? null,
    };
  }

  return {
    ...source,
    tempoMode: null,
    tempoSecondsPerRep: null,
    tempoDownSeconds: null,
    tempoBottomHoldSeconds: null,
    tempoUpSeconds: null,
    tempoTopHoldSeconds: null,
  };
}

function renderTempoFields(source, attrName) {
  const tempoMode = source.tempoMode ?? "";
  const bind = (field) => `${attrName}="${field}"`;

  return `
    <div class="field">
      <label>Tempo mode</label>
      <select ${bind("tempoMode")}>
        <option value="" ${tempoMode === "" ? "selected" : ""}>None</option>
        <option value="cadence" ${tempoMode === "cadence" ? "selected" : ""}>Cadence</option>
        <option value="phased" ${tempoMode === "phased" ? "selected" : ""}>Phased</option>
      </select>
    </div>

    <div class="field field--full">
      <label>Tempo label</label>
      <input ${bind("tempoLabel")} type="text" value="${escapeHtml(source.tempoLabel ?? "")}" placeholder="e.g. Slow control">
    </div>

    ${tempoMode === "cadence" ? `
      <div class="field">
        <label>Tempo per rep (sec)</label>
        <input ${bind("tempoSecondsPerRep")} type="number" min="0" step="0.5" value="${source.tempoSecondsPerRep ?? ""}">
      </div>
    ` : ""}

    ${tempoMode === "phased" ? `
      <div class="field">
        <label>Down (sec)</label>
        <input ${bind("tempoDownSeconds")} type="number" min="0" step="0.5" value="${source.tempoDownSeconds ?? ""}">
      </div>
      <div class="field">
        <label>Bottom hold (sec)</label>
        <input ${bind("tempoBottomHoldSeconds")} type="number" min="0" step="0.5" value="${source.tempoBottomHoldSeconds ?? ""}">
      </div>
      <div class="field">
        <label>Up (sec)</label>
        <input ${bind("tempoUpSeconds")} type="number" min="0" step="0.5" value="${source.tempoUpSeconds ?? ""}">
      </div>
      <div class="field">
        <label>Top hold (sec)</label>
        <input ${bind("tempoTopHoldSeconds")} type="number" min="0" step="0.5" value="${source.tempoTopHoldSeconds ?? ""}">
      </div>
    ` : ""}
  `;
}

function renderBlockEditor(block, index, total) {
  const isWork = block.type === "work";
  const isRest = block.type === "rest";
  const metricType = block.metricType ?? "reps";
  const repTargetMode = block.repTargetMode ?? "exact";

  return `
    <div class="routine-block-editor__item routine-block-editor__item--${escapeHtml(block.type)}" data-block-id="${block.id}">
      <div class="routine-block-editor__item-top">
        <div class="stack stack--tight">
          <span class="section-eyebrow">Block ${index + 1} of ${total}</span>
          <h4 class="routine-block-editor__title">${escapeHtml(block.label || (isRest ? "Rest" : block.type === "switch_side" ? "Switch sides" : "Work block"))}</h4>
          <p class="routine-block-editor__summary">${escapeHtml(summarizeBlock(block))}</p>
        </div>
        <div class="exercise-card__actions">
          <button class="mini-button" data-action="block-up" type="button" ${index === 0 ? "disabled" : ""}>Up</button>
          <button class="mini-button" data-action="block-down" type="button" ${index === total - 1 ? "disabled" : ""}>Down</button>
          <button class="mini-button mini-button--danger" data-action="block-delete" type="button">Delete</button>
        </div>
      </div>

      <div class="field-grid routine-block-editor__grid">
        <div class="field">
          <label>Block type</label>
          <select data-block-field="type">
            <option value="work" ${block.type === "work" ? "selected" : ""}>Work</option>
            <option value="rest" ${block.type === "rest" ? "selected" : ""}>Rest</option>
            <option value="switch_side" ${block.type === "switch_side" ? "selected" : ""}>Switch side</option>
          </select>
        </div>

        <div class="field">
          <label>Label</label>
          <input data-block-field="label" type="text" value="${escapeHtml(block.label ?? "")}">
        </div>

        ${isWork ? `
          <div class="field">
            <label>Metric</label>
            <select data-block-field="metricType">
              <option value="reps" ${metricType === "reps" ? "selected" : ""}>Reps</option>
              <option value="duration" ${metricType === "duration" ? "selected" : ""}>Duration</option>
            </select>
          </div>

          <div class="field">
            <label>Side</label>
            <select data-block-field="side">
              <option value="" ${!block.side ? "selected" : ""}>None</option>
              <option value="left" ${block.side === "left" ? "selected" : ""}>Left</option>
              <option value="right" ${block.side === "right" ? "selected" : ""}>Right</option>
              <option value="both" ${block.side === "both" ? "selected" : ""}>Both</option>
              <option value="alternating" ${block.side === "alternating" ? "selected" : ""}>Alternating</option>
            </select>
          </div>

          ${metricType === "duration" ? `
            <div class="field">
              <label>Duration (sec)</label>
              <input data-block-field="durationSeconds" type="number" min="0" step="1" value="${block.durationSeconds ?? ""}">
            </div>
          ` : `
            <div class="field">
              <label>Rep goal</label>
              <select data-block-field="repTargetMode">
                <option value="exact" ${repTargetMode === "exact" ? "selected" : ""}>Exact reps</option>
                <option value="max" ${repTargetMode === "max" ? "selected" : ""}>Max reps</option>
                <option value="minimum_plus" ${repTargetMode === "minimum_plus" ? "selected" : ""}>Minimum then max</option>
              </select>
              <p class="field-hint">${repTargetMode === "minimum_plus"
                ? "Hit the minimum first, then keep going for as many clean reps as possible."
                : repTargetMode === "max"
                  ? "The player will ask you to log the actual reps completed."
                  : "Use an exact rep count when the set should stop at a fixed number."}</p>
            </div>

            ${repTargetMode !== "max" ? `
              <div class="field">
                <label>${repTargetMode === "minimum_plus" ? "Minimum reps" : "Reps"}</label>
                <input data-block-field="reps" type="number" min="0" step="1" value="${block.reps ?? ""}">
              </div>
            ` : ""}

            <div class="field">
              <label>Weight (kg)</label>
              <input data-block-field="weight" type="number" min="0" step="0.5" value="${block.weight ?? ""}">
            </div>

            <div class="field">
              <label>Resistance</label>
              <input data-block-field="resistance" type="text" value="${escapeHtml(block.resistance ?? "")}" placeholder="Optional">
            </div>
          `}

          <div class="field">
            <label>Hold per rep (sec)</label>
            <input data-block-field="holdSeconds" type="number" min="0" step="0.5" value="${block.holdSeconds ?? ""}">
          </div>

          <div class="field">
            <label>Effort</label>
            <select data-block-field="effort">
              <option value="" ${!block.effort ? "selected" : ""}>None</option>
              <option value="failure" ${block.effort === "failure" ? "selected" : ""}>To failure</option>
            </select>
            <p class="field-hint">Use effort only when the set should end by feel, not by the rep goal itself.</p>
          </div>

          ${renderTempoFields(block, "data-block-field")}
        ` : ""}

        ${isRest ? `
          <div class="field">
            <label>Rest (sec)</label>
            <input data-block-field="seconds" type="number" min="0" step="1" value="${block.seconds ?? ""}">
          </div>
        ` : ""}

        ${block.type === "switch_side" ? `
          <div class="field">
            <label>Next side</label>
            <select data-block-field="side">
              <option value="left" ${block.side === "left" ? "selected" : ""}>Left</option>
              <option value="right" ${block.side === "right" ? "selected" : ""}>Right</option>
              <option value="both" ${block.side === "both" ? "selected" : ""}>Both</option>
              <option value="alternating" ${block.side === "alternating" ? "selected" : ""}>Alternating</option>
            </select>
          </div>
        ` : ""}

        <div class="field field--full">
          <label>Block notes</label>
          <textarea data-block-field="notes">${escapeHtml(block.notes ?? "")}</textarea>
        </div>
      </div>
    </div>
  `;
}

function renderAdvancedBlockEditor(instance) {
  const blocks = Array.isArray(instance.entryBlocks) ? instance.entryBlocks : [];
  return `
    <div class="routine-block-editor">
      <div class="routine-block-editor__toolbar">
        <div class="stack stack--tight">
          <span class="section-eyebrow">Advanced script</span>
          <p class="routine-block-editor__copy">These blocks are the exact flow the player will execute for this entry.</p>
        </div>
        <div class="routine-block-editor__toolbar-actions">
          <button class="mini-button" data-action="add-block" data-block-type="work" type="button">+ Work</button>
          <button class="mini-button" data-action="add-block" data-block-type="rest" type="button">+ Rest</button>
          <button class="mini-button" data-action="add-block" data-block-type="switch_side" type="button">+ Switch</button>
        </div>
      </div>
      ${blocks.length ? `
        <div class="routine-block-editor__list">
          ${blocks.map((block, index) => renderBlockEditor(block, index, blocks.length)).join("")}
        </div>
      ` : `
        <div class="read-block">No explicit blocks yet. Add work, rest, or switch blocks to define the player script directly.</div>
      `}
    </div>
  `;
}

function renderRoutineLibraryCard(routine, state) {
  const model = buildRoutineCompactModel(routine, state.exercises);
  const theme = getRoutineTheme(routine);
  const routineTags = [
    formatExerciseCount(model.entryCount),
    model.durationSummary,
    model.formatSummary,
  ].filter(Boolean);

  return `
    <article class="plan-card" style="--plan-color: ${theme.accent};" data-action="routine-card" data-routine-id="${routine.id}">
      <div class="plan-card__top">
        <div class="plan-card__icon" style="background: ${theme.accent}22; border-color: ${theme.accent}44; color: ${theme.accent}; font-size: 0.82rem; font-weight: 800;">
          ${theme.icon}
        </div>
        <div class="plan-card__info">
          <h2 class="plan-card__title">${escapeHtml(routine.name || "Untitled Routine")}</h2>
        </div>
      </div>

      <div class="plan-card__label-row">
        ${routineTags.map((tag) => `<span class="plan-card__tag">${escapeHtml(tag)}</span>`).join("")}
      </div>

      <div class="plan-card__mission routine-library-card__mission">
        <div class="routine-library-card__visual">
          ${renderPrimaryVisual(model.primaryVisual, { size: "compact" })}
        </div>
        <div class="routine-library-card__copy">
          <div class="plan-card__mission-label">Target areas</div>
          <h3 class="plan-card__mission-title">${escapeHtml(model.focusSummary || summarizeRoutineFocus(routine, state))}</h3>
        </div>
      </div>

      <button
        class="button button--primary plan-card__cta"
        data-action="open-routine"
        data-routine-id="${routine.id}"
        type="button"
        style="background: ${theme.accent}; color: #000; border: none; box-shadow: 0 10px 24px ${theme.accent}55;"
      >
        Open routine
      </button>
    </article>
  `;
}

function renderExerciseCard(instance, state) {
  const catalogEntry = state.exercises.find(e => e.id === instance.exerciseId);
  const name = catalogEntry?.name || "Unknown activity";
  const supportedModes = getExerciseSupportedTrackingModes(catalogEntry);
  const mode = inferRoutineEntryTrackingType(instance, catalogEntry);
  const executionUnitLabel = catalogEntry
    ? getExecutionUnitLabel(getExerciseExecutionUnitType(catalogEntry))
    : "Execution TBD";
  const hasExplicitBlocks = Array.isArray(instance.entryBlocks) && instance.entryBlocks.length > 0;

  const showReps = mode === "reps" || mode === "weight" || (mode === "resistance" && instance.durationSeconds == null);
  const showDuration = mode === "duration";
  const showWeight = mode === "weight" || instance.weight != null;
  const showResistance = mode === "resistance" || instance.resistance != null;

  return `
    <details class="exercise-card" data-instance-id="${instance.id}" ${state.expandedExerciseIds.has(instance.id) ? "open" : ""}>
      <summary class="exercise-card__top">
        <div class="exercise-card__summary-copy">
          <h3 class="exercise-card__title">${escapeHtml(name)}</h3>
          <p class="exercise-card__subtitle">Entry ${instance.order} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ${escapeHtml(executionUnitLabel)} ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Mode: ${escapeHtml(mode)}</p>
        </div>
        <div class="exercise-card__actions">
          <button class="mini-button" data-action="exercise-up" type="button">Move Earlier</button>
          <button class="mini-button" data-action="exercise-down" type="button">Move Later</button>
          <button class="mini-button mini-button--danger" data-action="exercise-delete" type="button">Remove</button>
        </div>
      </summary>

      <div class="field-grid">
        <div class="field field--full">
          <label>Editing mode</label>
          <div class="routine-entry-mode">
            <button class="mini-button ${hasExplicitBlocks ? "" : "is-active"}" data-action="entry-use-simple" type="button">Simple</button>
            <button class="mini-button ${hasExplicitBlocks ? "is-active" : ""}" data-action="entry-use-advanced" type="button">Advanced blocks</button>
          </div>
          <div class="read-block">${hasExplicitBlocks
            ? "This entry is using explicit work, rest, and switch blocks as the player script."
            : "This entry is using repeated-set defaults. Switch to advanced blocks when the flow needs explicit steps."}</div>
        </div>

        ${hasExplicitBlocks ? `
          <div class="field field--full">
            <label>Block script</label>
            ${renderAdvancedBlockEditor(instance)}
          </div>
        ` : `
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

          <div class="field field--full">
            <label>Side execution</label>
            <select data-field="sideMode">
              <option value="" ${!instance.sideMode ? "selected" : ""}>Standard / bilateral</option>
              <option value="each_side_then_switch" ${instance.sideMode === "each_side_then_switch" ? "selected" : ""}>Each side then switch</option>
              <option value="alternating" ${instance.sideMode === "alternating" ? "selected" : ""}>Alternating</option>
            </select>
          </div>

          <div class="field">
            <label>Set rest (sec)</label>
            <input data-field="restSeconds" type="number" min="0" step="1" value="${instance.restSeconds ?? instance.restSec ?? ""}">
          </div>

          ${renderTempoFields(instance, "data-field")}
        `}

        <div class="field">
          <label>After entry (sec)</label>
          <input data-field="transitionAfterSeconds" type="number" min="0" step="1" value="${instance.transitionAfterSeconds ?? instance.transitionSec ?? ""}" placeholder="Blank = follow set rest">
        </div>

        <div class="field field--full">
          <label>Next cue</label>
          <input data-field="transitionLabel" type="text" value="${escapeHtml(instance.transitionLabel ?? instance.transitionCue ?? "")}" placeholder="e.g. Switch sides or Walk and reset">
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
  
  modalOverlay.innerHTML = `
    <div class="modal-content panel picker-modal__content">
      <div class="picker-modal__header">
        <h2 class="panel__title">Browse Activities</h2>
        <input type="text" id="exercise-search" placeholder="Search activities..." autofocus>
      </div>
      <div id="exercise-list" class="picker-modal__list">
        <!-- List populated dynamically -->
      </div>
      <div class="picker-modal__footer">
        <button class="button button--ghost" data-action="close-picker">Cancel</button>
      </div>
    </div>
  `;

  const searchInput = modalOverlay.querySelector('#exercise-search');
  const listContainer = modalOverlay.querySelector('#exercise-list');

  const renderList = (filter = "") => {
    const filtered = exercises.filter(ex => ex.name.toLowerCase().includes(filter.toLowerCase()));
    listContainer.innerHTML = filtered.map(ex => `
      <div class="picker-item" data-id="${ex.id}">
        <div class="picker-item__name">${escapeHtml(ex.name)}</div>
        <div class="picker-item__meta">Tracking: ${escapeHtml(getExerciseSupportedTrackingModes(ex).join(", "))}</div>
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
        <div class="library-header__copy stack stack--tight">
          <button class="button button--ghost" data-action="back-to-list" type="button">Back to Routines</button>
          <span class="section-eyebrow">Routine editor</span>
          <h1>Routine Editor</h1>
          <p>Editing routine: ${escapeHtml(routine.name || "Untitled")}</p>
        </div>
        <div class="library-header__actions">
          <button class="button button--primary" data-action="open-picker" type="button">Add Activity</button>
        </div>
      </div>

      <section class="panel panel--section">
        <div class="panel__header">
          <div>
            <span class="panel__eyebrow">Routine configuration</span>
            <h3 class="panel__title">Template settings</h3>
            <p class="panel__copy">Define the reusable session block, then arrange the activity entries below.</p>
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
            <span class="panel__eyebrow">Activity flow</span>
            <h3 class="panel__title">Ordered routine entries</h3>
            <p class="panel__copy">Each entry is the specific activity setup this routine will execute.</p>
          </div>
        </div>
        <div class="panel__body">
          <div class="exercise-list">
            ${entries.length === 0 ? '<p class="muted editor-empty">No activities yet. Use "Add Activity" to start building.</p>' : entries.map((exercise) => renderExerciseCard(exercise, state)).join("")}
          </div>
        </div>
      </section>

      <section class="support-panel support-panel--danger">
        <div>
          <p class="section-eyebrow">Actions</p>
          <h3 class="support-panel__title">Routine actions</h3>
          <p class="support-panel__copy">Delete the reusable template only when you no longer want it available in the planning library.</p>
        </div>
        <div class="support-panel__actions">
          <button class="button button--danger" data-action="delete-routine" type="button">Delete Routine</button>
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

  if (!selectedRoutine || !draftRoutine) {
    container.innerHTML = `
      <section class="page page-single">
        <div class="library-header">
          <div class="library-header__copy">
            <h1>Routine Library</h1>
            <p>Reusable sessions you can plug into stages and plans.</p>
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
                <p>Create a reusable routine to start assembling plan stages and active plans.</p>
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
    card.addEventListener("click", () => actions.openRoutineDetail(card.dataset.routineId, "routines"));
  });
  container.querySelectorAll('[data-action="open-routine"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.openRoutineDetail(button.dataset.routineId, "routines");
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
      message: `Are you sure you want to delete "${selectedRoutine.name}"? This will permanently remove the template and its activity setup.`,
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
    const getCurrentEntry = () =>
      ((state.draftRoutine?.entries || state.draftRoutine?.exercises || []).find((entry) => entry.id === instanceId)) || null;
    const refreshEntrySummary = () => {
      const currentEntry = getCurrentEntry();
      const currentCatalogEntry = state.exercises.find((exercise) => exercise.id === currentEntry?.exerciseId);
      const summary = currentEntry
        ? `Entry ${currentEntry.order} / ${currentCatalogEntry ? getExecutionUnitLabel(getExerciseExecutionUnitType(currentCatalogEntry)) : "Execution TBD"} / Mode: ${inferRoutineEntryTrackingType(currentEntry, currentCatalogEntry)}`
        : "";
      exerciseCard.querySelector(".exercise-card__subtitle")?.replaceChildren(summary);
    };
    refreshEntrySummary();

    exerciseCard.querySelectorAll("[data-field]").forEach((field) => {
      field.addEventListener("change", () => {
        const currentEntry = getCurrentEntry() || {};
        if (field.dataset.field === "trackingMode") {
          const selectedMode = field.value;
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
        if (field.dataset.field === "tempoMode") {
          actions.updateExercise(instanceId, applyTempoModeToSource(currentEntry, field.value));
          return;
        }
        actions.updateExercise(instanceId, { [field.dataset.field]: field.value });
      });
    });

    exerciseCard.querySelector('[data-action="entry-use-advanced"]')?.addEventListener("click", () => {
      const currentEntry = getCurrentEntry();
      if (!currentEntry || (Array.isArray(currentEntry.entryBlocks) && currentEntry.entryBlocks.length)) {
        return;
      }
      const nextBlocks = renumberBlocks(
        getRoutineEntryBlocks(currentEntry).map((block) => ({
          ...block,
          id: createId("entry_block"),
        })),
      );
      actions.updateExercise(instanceId, { entryBlocks: nextBlocks });
    });

    exerciseCard.querySelector('[data-action="entry-use-simple"]')?.addEventListener("click", () => {
      const currentEntry = getCurrentEntry();
      if (!currentEntry || !Array.isArray(currentEntry.entryBlocks) || !currentEntry.entryBlocks.length) {
        return;
      }
      confirmAction(document.body, {
        title: "Switch Back To Simple Mode?",
        message: "This will remove the explicit block script for this entry and fall back to repeated-set defaults.",
        confirmText: "Use simple mode",
        onConfirm: () => actions.updateExercise(instanceId, { entryBlocks: [] }),
      });
    });

    exerciseCard.querySelectorAll('[data-action="add-block"]').forEach((button) => {
      button.addEventListener("click", () => {
        const currentEntry = getCurrentEntry();
        if (!currentEntry) {
          return;
        }
        const blocks = Array.isArray(currentEntry.entryBlocks) ? currentEntry.entryBlocks : [];
        actions.updateExercise(instanceId, {
          entryBlocks: renumberBlocks([...blocks, createEditorBlock(button.dataset.blockType)]),
        });
      });
    });

    exerciseCard.querySelectorAll("[data-block-id]").forEach((blockCard) => {
      const { blockId } = blockCard.dataset;

      blockCard.querySelectorAll("[data-block-field]").forEach((field) => {
        field.addEventListener("change", () => {
          const currentEntry = getCurrentEntry();
          if (!currentEntry) {
            return;
          }
          const blocks = Array.isArray(currentEntry.entryBlocks) ? currentEntry.entryBlocks : [];
          const nextBlocks = renumberBlocks(blocks.map((block) => {
            if (block.id !== blockId) {
              return block;
            }
            if (field.dataset.blockField === "type") {
              return coerceBlockType(block, field.value);
            }
            if (field.dataset.blockField === "metricType") {
              return applyMetricTypeToBlock(block, field.value);
            }
            if (field.dataset.blockField === "repTargetMode") {
              return applyRepTargetModeToBlock(block, field.value);
            }
            if (field.dataset.blockField === "tempoMode") {
              return applyTempoModeToSource(block, field.value);
            }
            return {
              ...block,
              [field.dataset.blockField]: parseBlockFieldValue(field.dataset.blockField, field.value),
            };
          }));
          actions.updateExercise(instanceId, { entryBlocks: nextBlocks });
        });
      });

      blockCard.querySelector('[data-action="block-delete"]')?.addEventListener("click", () => {
        const currentEntry = getCurrentEntry();
        if (!currentEntry) {
          return;
        }
        const blocks = Array.isArray(currentEntry.entryBlocks) ? currentEntry.entryBlocks : [];
        actions.updateExercise(instanceId, {
          entryBlocks: renumberBlocks(blocks.filter((block) => block.id !== blockId)),
        });
      });

      blockCard.querySelector('[data-action="block-up"]')?.addEventListener("click", () => {
        const currentEntry = getCurrentEntry();
        if (!currentEntry) {
          return;
        }
        const blocks = Array.isArray(currentEntry.entryBlocks) ? [...currentEntry.entryBlocks] : [];
        const index = blocks.findIndex((block) => block.id === blockId);
        if (index <= 0) {
          return;
        }
        [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
        actions.updateExercise(instanceId, { entryBlocks: renumberBlocks(blocks) });
      });

      blockCard.querySelector('[data-action="block-down"]')?.addEventListener("click", () => {
        const currentEntry = getCurrentEntry();
        if (!currentEntry) {
          return;
        }
        const blocks = Array.isArray(currentEntry.entryBlocks) ? [...currentEntry.entryBlocks] : [];
        const index = blocks.findIndex((block) => block.id === blockId);
        if (index < 0 || index >= blocks.length - 1) {
          return;
        }
        [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
        actions.updateExercise(instanceId, { entryBlocks: renumberBlocks(blocks) });
      });
    });

    exerciseCard.querySelector('[data-action="exercise-delete"]')?.addEventListener("click", () => {
      confirmAction(document.body, {
        title: "Remove Activity?",
        message: "Are you sure you want to remove this activity from the routine?",
        confirmText: "Remove",
        onConfirm: () => actions.deleteExercise(instanceId)
      });
    });
    
    exerciseCard.querySelector('[data-action="exercise-up"]')?.addEventListener("click", () => actions.moveExercise(instanceId, "up"));
    exerciseCard.querySelector('[data-action="exercise-down"]')?.addEventListener("click", () => actions.moveExercise(instanceId, "down"));
    exerciseCard.addEventListener("toggle", (event) => actions.toggleExerciseExpansion(instanceId, event.target.open));
  });
}
