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
    return `<div class="read-block">${escapeHtml(title)}: none</div>`;
  }

  return `
    <div class="read-block">
      <strong>${escapeHtml(title)}</strong><br>
      ${items.map((item) => escapeHtml(item.name || item.id || item.localId || "Item")).join(", ")}
    </div>
  `;
}

function renderCurrentStageChange(change, afterLabel = "Imported") {
  if (!change) {
    return '<div class="read-block">Choose a current-stage anchor to preview the revised current stage.</div>';
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
          <h1 style="margin-top: 0;">Revision review unavailable</h1>
          <p style="color: var(--muted); margin-bottom: 20px;">Open an active plan and import a revision package to review it here.</p>
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
  const headerEyebrow = isEditorReview ? "Live Plan Save Review" : "Living Plan Revision";
  const headerCopy = isEditorReview
    ? `Draft version ${escapeHtml(review.importedPlanVersion || "unknown")} / local version ${escapeHtml(review.localPlanVersion || "unknown")}`
    : `Exported ${escapeHtml(formatDateTime(review.exportedAt))} / imported version ${escapeHtml(review.importedPlanVersion || "unknown")} / local version ${escapeHtml(review.localPlanVersion || "unknown")}`;
  const metadataAfterLabel = isEditorReview ? "Edited draft" : "Imported";
  const applyTitle = isEditorReview ? "Apply live plan changes" : "Apply revision";
  const applyButtonLabel = isEditorReview
    ? "Save live plan"
    : (review.staleVersion ? "Apply revision anyway" : "Apply revision");

  section.innerHTML = `
    <div class="library-header">
      <div class="library-header__copy">
        <p class="plan-card__eyebrow">${escapeHtml(headerEyebrow)}</p>
        <h1>Review ${escapeHtml(review.targetPlanLabel)}</h1>
        <p>${headerCopy}</p>
      </div>
      <div class="library-header__actions">
        <button class="button button--ghost" type="button" data-action="apr-cancel">Cancel</button>
      </div>
    </div>

    ${renderIssues("Blocking warnings", review.blockingIssues, "rgba(245, 101, 101, 0.35)", "var(--danger)")}
    ${renderIssues("Review warnings", review.warnings, "rgba(246, 173, 85, 0.35)", "#f6ad55")}

    <div class="panel panel--section">
      <div class="panel__body">
        <h2 class="journey-section-title">Metadata changes</h2>
        ${renderMetadataChanges(review.metadataChanges, metadataAfterLabel)}
      </div>
    </div>

    <div class="panel panel--section">
      <div class="panel__body">
        <h2 class="journey-section-title">Shared library impact</h2>
        <div class="field-grid">
          ${renderDependencyList("New body targets", review.dependencySummary.addedBodyTargets)}
          ${renderDependencyList("New exercises", review.dependencySummary.addedExercises)}
          ${renderDependencyList("Forked exercises", review.dependencySummary.forkedExercises)}
          ${renderDependencyList("New routines", review.dependencySummary.addedRoutines)}
          ${renderDependencyList("Forked routines", review.dependencySummary.forkedRoutines)}
        </div>
      </div>
    </div>

    <div class="panel panel--section">
      <div class="panel__body">
        <h2 class="journey-section-title">Stage mapping</h2>
        <div class="read-block">${escapeHtml(review.stageMapping.message)}</div>
        ${review.stageMapping.requiresManualAnchor ? `
          <div class="field" style="margin-top: 16px;">
            <label for="revision-anchor">New current-stage anchor</label>
            <select id="revision-anchor" data-action="apr-anchor">
              <option value="">Choose a current stage</option>
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
          </div>
        ` : ""}
        <div class="read-block" style="margin-top: 16px;">Completed-stage edits ignored: ${review.completedStageEditsIgnored}</div>
      </div>
    </div>

    <div class="panel panel--section">
      <div class="panel__body">
        <h2 class="journey-section-title">Current stage changes</h2>
        ${renderCurrentStageChange(review.currentStageChange, metadataAfterLabel)}
      </div>
    </div>

    <div class="panel panel--section">
      <div class="panel__body">
        <h2 class="journey-section-title">Future stage changes</h2>
        ${renderFutureStageChanges(review.futureStageChanges)}
      </div>
    </div>

    <div class="panel panel--section">
      <div class="panel__body">
        <h2 class="journey-section-title">${escapeHtml(applyTitle)}</h2>
        <div class="field">
          <label for="revision-summary">Change summary</label>
          <textarea id="revision-summary" data-action="apr-summary">${escapeHtml(review.changeSummary)}</textarea>
        </div>
        ${review.staleVersion ? `
          <label style="display: flex; gap: 12px; align-items: flex-start; color: var(--soft); margin-top: 16px;">
            <input type="checkbox" data-action="apr-stale" ${review.staleAcknowledged ? "checked" : ""} style="margin-top: 4px;">
            <span>I understand this revision was exported from an older active-plan version and still want to apply it.</span>
          </label>
        ` : ""}
        <div class="form-actions">
          <button class="button button--ghost" type="button" data-action="apr-back">${isEditorReview ? "Back to editor" : "Back to plan"}</button>
          <button class="button button--primary" type="button" data-action="apr-apply" ${applyBlocked ? "disabled" : ""}>${escapeHtml(applyButtonLabel)}</button>
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
