import { buildStageStudyModel } from "./stageStudy.js";
import { evaluateStageProgress } from "./progressionEngine.js";
import { renderEmptyState } from "../library/metadataPrimitives.js";
import { enhanceStageJourneyModel, renderJourneyNode } from "./journeyNodes.js";
import {
  getStageStepKindLabel,
  getStageStepSummary,
  getStageStepTitle,
  isRoutineStageStep,
} from "./stageStepViews.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseStudyRoute(route) {
  const parts = String(route || "").split("/");
  return {
    resourceId: parts[1] || "",
    stageId: parts[2] || "",
  };
}

function truncateText(value, maxLength = 96) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function bindJourneyNode(node, handler) {
  node.addEventListener("click", handler);
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler();
    }
  });
}

function renderSelectedStageDetail(model, header = {}, options = {}) {
  const compactInline = Boolean(options.compactInline);
  const detailEyebrow = header.mode === "blueprint"
    ? `Stage ${model.sequenceIndex}`
    : model.isCurrent
      ? "Current stage"
      : `Stage ${model.sequenceIndex}`;
  const supportLine = model.supportSummary || "";
  const scheduleMarkup = `
    <ol class="study-schedule ${compactInline ? "study-schedule--inline" : ""}">
      ${model.scheduleSteps.map((step) => `
            <li class="study-schedule__item study-schedule__item--${step.type === "routine" ? "routine" : "rest"}">
              <div class="study-schedule__row">
                <div class="study-schedule__top">
                  <span class="study-schedule__index">${escapeHtml(`Step ${step.stepIndex}`)}</span>
                  <span class="study-schedule__kind">${escapeHtml(getStageStepKindLabel(step))}</span>
                </div>
                ${isRoutineStageStep(step)
                  ? `<button class="button button--ghost button--compact study-schedule__title study-schedule__title--link" type="button" data-action="open-routine" data-routine-id="${step.routine?.id || ""}"><span class="study-schedule__title-text">${escapeHtml(getStageStepTitle(step))}</span><span class="study-schedule__nav" aria-hidden="true">&rsaquo;</span></button>`
                  : `<div class="study-schedule__title study-schedule__title--static">${escapeHtml(getStageStepTitle(step))}</div>`}
                <p class="study-schedule__summary">${escapeHtml(getStageStepSummary(step, { compact: compactInline }))}</p>
              </div>
            </li>
          `).join("")}
    </ol>
  `;

  if (compactInline) {
    return `
      <div class="study-inline-script">
        ${scheduleMarkup}
        ${supportLine ? `<p class="study-detail-card__hint study-detail-card__hint--support study-detail-card__hint--inline">${escapeHtml(supportLine)}</p>` : ""}
      </div>
    `;
  }

  return `
    <article class="study-detail-card study-detail-card--${escapeHtml(header.mode || "blueprint")} ${model.isCurrent ? "study-detail-card--current" : ""}">
      <div class="study-detail-card__header">
        <span class="panel__eyebrow">${escapeHtml(detailEyebrow)}</span>
        <h2 class="study-detail-card__title">${escapeHtml(model.name)}</h2>
      </div>
      <div class="study-detail-card__section">
        <span class="section-eyebrow">Ordered steps</span>
        ${scheduleMarkup}
      </div>
      ${supportLine ? `<p class="study-detail-card__hint study-detail-card__hint--support">${escapeHtml(supportLine)}</p>` : ""}
    </article>
  `;
}

function buildStudyModels(stages, routines, exercises, options = {}) {
  return (stages || []).map((stage, index) =>
    enhanceStageJourneyModel(buildStageStudyModel(stage, routines, exercises, {
      isCurrent: index === options.currentStageIndex,
      stateLabel:
        options.currentStageIndex == null
          ? (index === 0 ? "Starting stage" : "Later stage")
          : index < options.currentStageIndex
            ? "Completed"
            : index === options.currentStageIndex
              ? "Current"
              : "Locked",
      }), {
      sequenceIndex: index + 1,
      pathState:
        options.currentStageIndex == null
          ? "upcoming"
          : index < options.currentStageIndex
            ? "complete"
            : index === options.currentStageIndex
              ? "current"
              : "locked",
    }),
  );
}

function renderStudyScreen(container, models, header, actions, currentRoute, onSelectStage) {
  if (!models.length) {
    container.innerHTML = `
      <section class="page page-single page-single--narrow study-page study-page--${escapeHtml(header.mode || "blueprint")}">
        ${renderEmptyState("No stages available", "This journey does not have any readable stage chapters yet.")}
      </section>
    `;
    return;
  }

  const openStageId = header.selectedStageId && models.some((model) => model.id === header.selectedStageId)
    ? header.selectedStageId
    : models.find((model) => model.isCurrent)?.id || models[0].id;
  const selectedModel = models.find((model) => model.id === openStageId) || models[0];

  container.innerHTML = `
    <section class="page page-single page-single--narrow study-page study-page--${escapeHtml(header.mode || "blueprint")}">
      <div class="library-header">
        <div class="library-header__copy stack stack--tight">
          <span class="section-eyebrow">${escapeHtml(header.eyebrow)}</span>
          <h1>${escapeHtml(header.title)}</h1>
          ${header.copy ? `<p>${escapeHtml(header.copy)}</p>` : ""}
          ${header.summaryLine ? `<p class="study-header-summary">${escapeHtml(header.summaryLine)}</p>` : ""}
        </div>
      </div>

      ${header.summaryFacts?.length ? `
        <section class="study-summary-band study-summary-band--${escapeHtml(header.mode || "blueprint")}" aria-label="Study summary">
          ${header.summaryFacts.map((fact) => `
            <div class="study-summary-band__item">
              <span class="study-summary-band__label">${escapeHtml(fact.label)}</span>
              <span class="study-summary-band__value">${escapeHtml(fact.value)}</span>
            </div>
          `).join("")}
        </section>
      ` : ""}

      <section class="panel panel--section">
        <div class="panel__body">
          <div class="study-map study-map--${escapeHtml(header.mode || "blueprint")}">
            <div class="study-map__stages journey-path journey-path--study">
              ${models.map((model) => {
                const isSelected = model.id === openStageId;
                return renderJourneyNode(model, {
                  actionName: "select-study-stage",
                  interactive: true,
                  selected: isSelected,
                  showObjective: true,
                  showSequence: false,
                  showEstimate: false,
                  actionHintLabel: isSelected ? "" : "Tap this stage to view its steps",
                  inlineDetailHtml: isSelected ? renderSelectedStageDetail(model, header, { compactInline: true }) : "",
                });
              }).join("")}
            </div>
            <div class="study-map__detail">
              ${renderSelectedStageDetail(selectedModel, header)}
            </div>
          </div>
        </div>
      </section>
    </section>
  `;

  container.querySelectorAll('[data-action="select-study-stage"]').forEach((button) => {
    bindJourneyNode(button, () => {
      onSelectStage(button.dataset.stageId);
    });
  });

  container.querySelectorAll('[data-action="open-routine"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      actions.openRoutineDetail(button.dataset.routineId, currentRoute);
    });
  });
}

export function renderBlueprintStudyView(container, { state, actions }) {
  const { resourceId, stageId } = parseStudyRoute(state.route);
  const blueprint = (state.plans || []).find((plan) => plan.id === resourceId) || null;
  if (!blueprint) {
    container.innerHTML = `
      <section class="page page-single page-single--narrow study-page study-page--${escapeHtml(header.mode || "blueprint")}">
        ${renderEmptyState("Plan template not found", "This plan template no longer exists in the library.")}
      </section>
    `;
    return;
  }

  const models = buildStudyModels(blueprint.stages || [], state.routines || [], state.exercises || []);
  renderStudyScreen(
    container,
    models,
    {
      eyebrow: "Plan guide",
      title: blueprint.name || "Plan guide",
      copy: "Preview how this plan unfolds before you start it. Open any stage to see its repeating steps and unlock rule.",
      summaryLine: `${models.length} stage${models.length === 1 ? "" : "s"} / ${models[0]?.cycleEstimate || "Cadence varies"} / ${models.some((model) => /No milestone/i.test(model.milestoneLine)) ? "unlock rules vary" : "stage-by-stage milestone gates"}`,
      summaryFacts: [
        { label: "Structure", value: `${models.length} stage${models.length === 1 ? "" : "s"}` },
        { label: "Cadence", value: models[0]?.cycleEstimate || "Cadence varies" },
        {
          label: "Unlock pattern",
          value: models.some((model) => /No milestone/i.test(model.milestoneLine))
            ? "Rules vary by stage"
            : "Milestone gate each stage",
        },
      ],
      selectedStageId: stageId,
      mode: "blueprint",
    },
    actions,
    state.route,
    (selectedStageId) => actions.openBlueprintStudy(blueprint.id, selectedStageId, "plans"),
  );
}

export function renderActivePlanStudyView(container, { state, actions }) {
  const { resourceId, stageId } = parseStudyRoute(state.route);
  const activePlan = (state.activePlans || []).find((plan) => plan.id === resourceId) || null;
  if (!activePlan) {
    container.innerHTML = `
      <section class="page page-single page-single--narrow study-page study-page--${escapeHtml(header.mode || "blueprint")}">
        ${renderEmptyState("Active plan not found", "This active journey no longer exists in your live queue.")}
      </section>
    `;
    return;
  }

  const models = buildStudyModels(
    activePlan.stages || [],
    state.routines || [],
    state.exercises || [],
    { currentStageIndex: activePlan.currentStageIndex ?? 0 },
  );
  const currentStage = activePlan.stages?.[activePlan.currentStageIndex ?? 0] || null;
  const currentStageProgress = currentStage
    ? evaluateStageProgress(
        currentStage,
        state.workouts || [],
        state.routines || [],
        activePlan,
        state.exercises || [],
      )
    : null;
  const currentModel = models[activePlan.currentStageIndex ?? 0] || models[0] || null;
  renderStudyScreen(
    container,
    models,
    {
      eyebrow: "Plan guide",
      title: activePlan.displayName || activePlan.name || "Plan guide",
      copy: "Review the current stage, inspect what comes next, and open any routine step for more detail.",
      summaryLine: "",
      summaryFacts: [
        { label: "Current stage", value: currentStage?.name || "Unavailable" },
        { label: "Progress", value: currentStageProgress?.progressText || "In progress" },
        { label: "Cadence", value: truncateText(currentModel?.cycleEstimate || "Cadence varies", 42) },
      ],
      selectedStageId: stageId,
      mode: "active",
    },
    actions,
    state.route,
    (selectedStageId) => actions.openActivePlanStudy(activePlan.id, selectedStageId, state.detailNavigation?.returnRoute || `active-plan/${activePlan.id}`),
  );
}









