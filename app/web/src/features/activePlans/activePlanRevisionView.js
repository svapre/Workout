function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function renderIssues(title, items, borderColor, textColor) {
  if (!items?.length) {
    return "";
  }

  return `
    <div class="panel panel--section" style="border-color: ${borderColor};">
      <div class="panel__body">
        <h2 class="journey-section-title" style="color: ${textColor}; margin-bottom: 12px;">${escapeHtml(title)}</h2>
        <ul class="timeline-list">
          ${items
            .map((item) => `<li class="timeline-item"><div class="read-block">${escapeHtml(item.message || item)}</div></li>`)
            .join("")}
        </ul>
      </div>
    </div>
  `;
}

function renderMetadataChanges(changes, afterLabel = "Imported") {
  if (!changes?.length) {
    return '<div class="read-block">No metadata changes detected.</div>';
  }

  return `
    <ul class="timeline-list">
      ${changes
        .map(
          (change) => `
            <li class="timeline-item">
              <div class="timeline-item__row">
                <strong>${escapeHtml(change.label)}</strong>
              </div>
              <div class="field-grid">
                <div class="read-block"><strong>Current</strong><br>${escapeHtml(change.before || "Empty")}</div>
                <div class="read-block"><strong>${escapeHtml(afterLabel)}</strong><br>${escapeHtml(change.after || "Empty")}</div>
              </div>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderDependencyList(title, items) {
  if (!items?.length) {
    return "";
  }

  return `
    <div class="read-block">
      <strong>${escapeHtml(title)}</strong><br>
      ${items.map((item) => escapeHtml(item.name || item.id || item.localId || "Item")).join(", ")}
    </div>
  `;
}

function renderDependencySummary(summary) {
  const groups = [
    renderDependencyList("New body areas", summary.addedBodyTargets),
    renderDependencyList("New activities", summary.addedExercises),
    renderDependencyList("Copied activities for this plan", summary.forkedExercises),
    renderDependencyList("New routines", summary.addedRoutines),
    renderDependencyList("Copied routines for this plan", summary.forkedRoutines),
  ].filter(Boolean);

  if (!groups.length) {
    return '<div class="read-block">No shared library copies are needed for this save.</div>';
  }

  return `<div class="field-grid">${groups.join("")}</div>`;
}

function hasDependencyChanges(summary) {
  return [
    summary?.addedBodyTargets,
    summary?.addedExercises,
    summary?.forkedExercises,
    summary?.addedRoutines,
    summary?.forkedRoutines,
  ].some((items) => Array.isArray(items) && items.length > 0);
}

function renderStageMappingCallout(review) {
  if (!review.stageMapping.requiresManualAnchor) {
    return "";
  }

  const selectedStage = review.stageMapping.candidateStages.find(
    (stage) => stage.id === review.selectedStageAnchorId,
  );
  const note = selectedStage
    ? `The live plan will reopen at "${selectedStage.name}" after you save this update.`
    : "Choose where the live plan should reopen after this update. Save stays locked until you pick a stage.";

  return `
    <div class="revision-required">
      <span class="revision-required__eyebrow">Required before saving</span>
      <h3 class="revision-required__title">Choose the stage this live plan should reopen on</h3>
      <p class="revision-required__copy">${escapeHtml(note)}</p>
    </div>
  `;
}

function renderCurrentStageChange(change, afterLabel = "Imported") {
  if (!change) {
    return '<div class="read-block">Choose the stage above to preview where the live plan will reopen after this save.</div>';
  }

  return `
    <div class="field-grid">
      <div class="read-block"><strong>Current</strong><br>${escapeHtml(change.beforeSummary)}</div>
      <div class="read-block"><strong>${escapeHtml(afterLabel)}</strong><br>${escapeHtml(change.afterSummary)}</div>
    </div>
    <div class="read-block" style="margin-top: 12px;">
      ${change.changed ? `Changed fields: ${escapeHtml(change.changedFields.join(", "))}` : "No current-stage changes."}
    </div>
  `;
}

function renderCompletedStageNotice(count) {
  const total = Math.max(0, Number(count || 0));

  if (total === 0) {
    return '<div class="read-block" style="margin-top: 16px;">Completed stages stay unchanged so recorded history is preserved.</div>';
  }

  return `
    <div class="read-block" style="margin-top: 16px;">
      Changes that touched ${total} completed stage${total === 1 ? "" : "s"} will be skipped so recorded history stays accurate.
    </div>
  `;
}

function renderFutureStageChanges(changes) {
  if (!changes?.length) {
    return '<div class="read-block">No future-stage additions, removals, or updates detected.</div>';
  }

  return `
    <ul class="timeline-list">
      ${changes
        .map(
          (change) => `
            <li class="timeline-item">
              <div class="timeline-item__row">
                <strong>${escapeHtml(change.name)}</strong>
                <span style="color: var(--soft); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.78rem;">${escapeHtml(change.type)}</span>
              </div>
              <div class="read-block">${escapeHtml(change.summary)}</div>
              ${change.beforeSummary ? `<div class="read-block" style="margin-top: 12px;"><strong>Previous</strong><br>${escapeHtml(change.beforeSummary)}</div>` : ""}
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

export function renderActivePlanRevisionView(container, { state, actions }) {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const planId = hash.split("/")[1];
  const review = state.pendingActivePlanRevision;
  const matchesRoute = review?.targetPlanId === planId;

  container.innerHTML = "";

  const section = document.createElement("section");
  section.className = "page page-single";

  if (!matchesRoute) {
    section.innerHTML = `
      <div class="panel panel--section">
        <div class="panel__body" style="padding: 32px;">
          <h1 style="margin-top: 0;">Plan update review unavailable</h1>
          <p style="color: var(--muted); margin-bottom: 20px;">Open an active plan and import a plan update package to review it here.</p>
          <button class="button button--ghost" type="button" data-action="apr-back">Back to active plans</button>
        </div>
      </div>
    `;
    container.appendChild(section);
    section.querySelector('[data-action="apr-back"]')?.addEventListener("click", () => {
      actions.navigate("active-plans");
    });
    return;
  }

  const applyBlocked =
    review.blockingIssues.length > 0 ||
    (review.stageMapping.requiresManualAnchor && !review.selectedStageAnchorId) ||
    (review.staleVersion && !review.staleAcknowledged) ||
    !String(review.changeSummary || "").trim();
  const isEditorReview = review.reviewMode === "editor";
  const headerEyebrow = isEditorReview ? "Review before saving" : "Review before applying update";
  const metadataAfterLabel = isEditorReview ? "Edited draft" : "Imported";
  const applyTitle = isEditorReview ? "Apply live plan changes" : "Apply plan update";
  const applyButtonLabel = isEditorReview
    ? "Save live plan"
    : (review.staleVersion ? "Apply plan update anyway" : "Apply plan update");
  const showMetadataPanel = (review.metadataChanges || []).length > 0;
  const showDependencyPanel = hasDependencyChanges(review.dependencySummary);
  const showFutureStagePanel = (review.futureStageChanges || []).length > 0;
  const saveLockReason = review.blockingIssues.length > 0
    ? "Resolve the blocking warnings above before saving."
    : review.stageMapping.requiresManualAnchor && !review.selectedStageAnchorId
      ? "Choose the stage above to unlock save."
      : review.staleVersion && !review.staleAcknowledged
        ? "Acknowledge the older exported version before saving."
        : !String(review.changeSummary || "").trim()
          ? "Add a short change summary before saving."
          : "";
  const visibleApplyButtonLabel = applyBlocked
    ? review.blockingIssues.length > 0
      ? "Resolve warnings to save"
      : review.stageMapping.requiresManualAnchor && !review.selectedStageAnchorId
        ? "Choose stage to save"
        : review.staleVersion && !review.staleAcknowledged
          ? "Acknowledge to save"
          : !String(review.changeSummary || "").trim()
            ? "Add summary to save"
            : applyButtonLabel
    : applyButtonLabel;

  section.innerHTML = `
    <div class="library-header">
      <div class="library-header__copy">
        <p class="plan-card__eyebrow">${escapeHtml(headerEyebrow)}</p>
        <h1>Review ${escapeHtml(review.targetPlanLabel)}</h1>
        <p>${isEditorReview
          ? `Draft version ${escapeHtml(review.importedPlanVersion || "unknown")} / current live version ${escapeHtml(review.localPlanVersion || "unknown")}`
          : `Exported ${escapeHtml(formatDateTime(review.exportedAt))} / package version ${escapeHtml(review.importedPlanVersion || "unknown")} / current live version ${escapeHtml(review.localPlanVersion || "unknown")}`}</p>
      </div>
      <div class="library-header__actions">
        <button class="button button--ghost" type="button" data-action="apr-cancel">Cancel</button>
      </div>
    </div>

    ${renderIssues("Blocking warnings", review.blockingIssues, "rgba(245, 101, 101, 0.35)", "var(--danger)")}
    ${renderIssues("Review warnings", review.warnings, "rgba(246, 173, 85, 0.35)", "#f6ad55")}

    <div class="panel panel--section revision-panel--priority">
      <div class="panel__body">
        <h2 class="journey-section-title">Stage mapping</h2>
        ${renderStageMappingCallout(review)}
        ${review.stageMapping.requiresManualAnchor ? `
          <div class="field revision-required__field" style="margin-top: 16px;">
            <label for="revision-anchor">Choose the current stage after this update</label>
            <select id="revision-anchor" data-action="apr-anchor">
              <option value="">Choose a stage before saving</option>
              ${review.stageMapping.candidateStages
                .map(
                  (stage) => `
                    <option value="${escapeHtml(stage.id)}" ${review.selectedStageAnchorId === stage.id ? "selected" : ""}>
                      ${escapeHtml(stage.name)}
                    </option>
                  `,
                )
                .join("")}
            </select>
            <p class="revision-required__copy">This stage becomes the live plan's current anchor after the save is applied.</p>
          </div>
        ` : ""}
        <div class="read-block">${escapeHtml(review.stageMapping.message)}</div>
        ${renderCompletedStageNotice(review.completedStageEditsIgnored)}
      </div>
    </div>

    <div class="panel panel--section">
      <div class="panel__body">
        <h2 class="journey-section-title">Preview after save</h2>
        ${renderCurrentStageChange(review.currentStageChange, metadataAfterLabel)}
      </div>
    </div>

    ${showMetadataPanel ? `
      <div class="panel panel--section">
        <div class="panel__body">
          <h2 class="journey-section-title">Metadata changes</h2>
          ${renderMetadataChanges(review.metadataChanges, metadataAfterLabel)}
        </div>
      </div>
    ` : ""}

    ${showFutureStagePanel ? `
      <div class="panel panel--section">
        <div class="panel__body">
          <h2 class="journey-section-title">Future stage changes</h2>
          ${renderFutureStageChanges(review.futureStageChanges)}
        </div>
      </div>
    ` : ""}

    ${showDependencyPanel ? `
      <div class="panel panel--section">
        <div class="panel__body">
          <h2 class="journey-section-title">Shared library impact</h2>
          ${renderDependencySummary(review.dependencySummary)}
        </div>
      </div>
    ` : ""}

    <div class="panel panel--section">
      <div class="panel__body">
        <h2 class="journey-section-title">${escapeHtml(applyTitle)}</h2>
        <div class="field">
          <label for="revision-summary">Change summary</label>
          <textarea id="revision-summary" data-action="apr-summary">${escapeHtml(review.changeSummary)}</textarea>
        </div>
        ${saveLockReason ? `<div class="revision-save-lock">${escapeHtml(saveLockReason)}</div>` : ""}
        ${review.staleVersion ? `
          <label style="display: flex; gap: 12px; align-items: flex-start; color: var(--soft); margin-top: 16px;">
            <input type="checkbox" data-action="apr-stale" ${review.staleAcknowledged ? "checked" : ""} style="margin-top: 4px;">
            <span>I understand this plan update was exported from an older active-plan version and still want to apply it.</span>
          </label>
        ` : ""}
        <div class="form-actions">
          <button class="button button--ghost" type="button" data-action="apr-back">${isEditorReview ? "Back to editor" : "Back to plan"}</button>
          <button class="button button--primary" type="button" data-action="apr-apply" ${applyBlocked ? "disabled" : ""}>${escapeHtml(visibleApplyButtonLabel)}</button>
        </div>
      </div>
    </div>
  `;

  container.appendChild(section);

  section.querySelector('[data-action="apr-back"]')?.addEventListener("click", () => {
    actions.cancelActivePlanRevisionReview(planId);
  });
  section.querySelector('[data-action="apr-cancel"]')?.addEventListener("click", () => {
    actions.cancelActivePlanRevisionReview(planId);
  });
  section.querySelector('[data-action="apr-apply"]')?.addEventListener("click", () => {
    actions.applyActivePlanRevisionReview();
  });
  section.querySelector('[data-action="apr-anchor"]')?.addEventListener("change", (event) => {
    actions.updateActivePlanRevisionReview({ selectedStageAnchorId: event.target.value || null });
  });
  section.querySelector('[data-action="apr-summary"]')?.addEventListener("input", (event) => {
    actions.updateActivePlanRevisionReview({ changeSummary: event.target.value });
  });
  section.querySelector('[data-action="apr-stale"]')?.addEventListener("change", (event) => {
    actions.updateActivePlanRevisionReview({ staleAcknowledged: event.target.checked });
  });
}
