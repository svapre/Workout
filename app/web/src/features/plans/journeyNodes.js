function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function parseApproxMinutes(summary) {
  const match = String(summary || "").match(/~(\d+)\s*min/i);
  return match ? Number(match[1]) : null;
}

function roundToNearestFive(value) {
  return Math.max(5, Math.round(value / 5) * 5);
}

function formatCycleEstimate(scheduleSteps = []) {
  const activeMinutes = scheduleSteps.reduce((sum, step) => sum + (parseApproxMinutes(step.routine?.durationSummary) || 0), 0);
  const activeSummary = activeMinutes ? `~${roundToNearestFive(activeMinutes)} min active` : "";
  const stepCount = scheduleSteps.length;
  const cycleSummary = stepCount
    ? `${stepCount} ordered step${stepCount === 1 ? "" : "s"}`
    : "";
  return [activeSummary, cycleSummary].filter(Boolean).join(" / ") || "Cycle estimate varies";
}

function normalizeSegmentLabel(step) {
  if (!step) {
    return "Step";
  }
  if (step.type === "rest") {
    return "Rest day";
  }

  return String(step.title || step.routine?.name || `Step ${step.stepIndex || ""}`)
    .replace(/^Step\s+\d+\s*[-:Ãƒâ€šÃ‚Â·]?\s*/i, "")
    .trim();
}

function buildCycleSegments(scheduleSteps = [], limit = 4) {
  const segments = scheduleSteps.slice(0, limit).map((step) => ({
    key: step.key,
    order: step.stepIndex,
    label: normalizeSegmentLabel(step),
    type: step.type === "rest" ? "rest" : "routine",
    routineId: step.type === "rest" ? "" : step.routine?.id || step.routineId || "",
  }));

  if (scheduleSteps.length > limit) {
    segments.push({
      key: "more",
      label: `+${scheduleSteps.length - limit} more`,
      type: "more",
      routineId: "",
    });
  }

  return segments;
}

export function enhanceStageJourneyModel(model, options = {}) {
  if (!model) {
    return null;
  }

  return {
    ...model,
    sequenceIndex: options.sequenceIndex ?? model.sequenceIndex ?? 1,
    pathState: options.pathState || model.pathState || "upcoming",
    stateLabel: options.stateLabel ?? model.stateLabel ?? "",
    objectiveLine: model.guidance || "No stage objective written yet.",
    milestoneLine: model.milestoneSummary || "No milestone written yet.",
    cycleSegments: buildCycleSegments(model.scheduleSteps || []),
    cycleEstimate: formatCycleEstimate(model.scheduleSteps || []),
  };
}

function renderCycleSegments(model, options = {}) {
  const {
    compact = false,
    interactiveSegments = false,
    segmentActionName = "",
  } = options;
  const segments = model.cycleSegments || [];
  if (!segments.length) {
    return "";
  }

  return `
    <div class="journey-sequence ${compact ? "journey-sequence--compact" : ""} ${interactiveSegments ? "journey-sequence--interactive" : ""}">
      ${segments.map((segment, index) => {
        const canNavigate = interactiveSegments && segment.type === "routine" && segment.routineId && segmentActionName;
        const segmentClass = `journey-sequence__segment journey-sequence__segment--${segment.type}${canNavigate ? " journey-sequence__segment--interactive" : ""}`;
        const segmentBody = `
          ${segment.order ? `<span class="journey-sequence__order">${escapeHtml(segment.order)}</span>` : ""}
          <span class="journey-sequence__label">${escapeHtml(segment.label)}</span>
          ${canNavigate ? '<span class="journey-sequence__nav" aria-hidden="true">&rsaquo;</span>' : ""}
        `;

        return `
          ${index > 0 ? '<span class="journey-sequence__connector" aria-hidden="true">&rarr;</span>' : ""}
          ${canNavigate
            ? `<button class="${segmentClass}" type="button" data-action="${escapeHtml(segmentActionName)}" data-routine-id="${escapeHtml(segment.routineId)}">${segmentBody}</button>`
            : `<span class="${segmentClass}">${segmentBody}</span>`}
        `;
      }).join("")}
    </div>
  `;
}

export function renderJourneyNode(model, options = {}) {
  if (!model) {
    return "";
  }

  const {
    actionName = "",
    interactive = false,
    actionKind = interactive ? "select" : "static",
    compact = false,
    selected = false,
    showStateBadge = true,
    showSequence = true,
    showMilestone = true,
    showEstimate = true,
    showIndex = true,
    showObjective = true,
    interactiveSegments = false,
    segmentActionName = "",
    inlineDetailHtml = "",
    affordanceLabel = actionKind === "navigate" ? "Study" : "",
    selectAffordanceLabel = selected ? "Viewing" : "View stage",
    selectHintLabel = "Tap this stage to view its steps",
    actionHintLabel = "",
  } = options;

  const stateClass = model.pathState ? `journey-node--${model.pathState}` : "";
  const selectedClass = selected ? "journey-node--selected" : "";
  const interactiveClass = interactive ? "journey-node--interactive" : "";
  const actionClass = actionKind && actionKind !== "static" ? `journey-node--action-${actionKind}` : "";
  const actionAttr = interactive && actionName
    ? ` role="button" tabindex="0" data-action="${escapeHtml(actionName)}" data-stage-id="${escapeHtml(model.id)}"`
    : "";
  const stateBadge = model.stateLabel || "";
  const affordance = actionKind === "navigate"
    ? `<span class="journey-node__affordance journey-node__affordance--navigate" aria-hidden="true"><span class="journey-node__affordance-label">${escapeHtml(affordanceLabel || "Study")}</span><span class="journey-node__affordance-mark">&rsaquo;</span></span>`
    : actionKind === "select"
      ? `<span class="journey-node__affordance journey-node__affordance--select${selected ? " journey-node__affordance--select-active" : ""}" aria-hidden="true"><span class="journey-node__select-label">${escapeHtml(selectAffordanceLabel)}</span><span class="journey-node__select-ring"></span></span>`
      : "";
  const resolvedActionHintLabel = actionHintLabel
    || (actionKind === "select" && interactive && !selected && !compact ? selectHintLabel : "");
  const actionHint = interactive && resolvedActionHintLabel
    ? `<div class="journey-node__action-hint journey-node__action-hint--${escapeHtml(actionKind || "static")}">${escapeHtml(resolvedActionHintLabel)}</div>`
    : "";

  return `
    <div class="journey-node ${stateClass} ${selectedClass} ${interactiveClass} ${actionClass} ${compact ? "journey-node--compact" : ""}"${actionAttr}>
      <div class="journey-node__content">
        <div class="journey-node__top">
          <div>
            ${showIndex ? `<div class="journey-node__eyebrow">${escapeHtml(`Stage ${model.sequenceIndex}`)}</div>` : ""}
            <h3 class="journey-node__title">${escapeHtml(model.name)}</h3>
          </div>
          <div class="journey-node__top-actions">
            ${showStateBadge && stateBadge ? `<span class="journey-node__badge">${escapeHtml(stateBadge)}</span>` : ""}
            ${affordance}
          </div>
        </div>
        ${showObjective ? `<p class="journey-node__desc">${escapeHtml(model.objectiveLine)}</p>` : ""}
        ${showMilestone ? `<div class="journey-node__milestone"><span class="journey-node__milestone-mark" aria-hidden="true"></span><span>${escapeHtml(model.milestoneLine)}</span></div>` : ""}
        ${showSequence ? renderCycleSegments(model, { compact, interactiveSegments, segmentActionName }) : ""}
        ${showEstimate ? `<div class="journey-node__estimate">${escapeHtml(model.cycleEstimate)}</div>` : ""}
        ${actionHint}
        ${inlineDetailHtml ? `<div class="journey-node__detail journey-node__detail--inline">${inlineDetailHtml}</div>` : ""}
      </div>
    </div>
  `;
}
