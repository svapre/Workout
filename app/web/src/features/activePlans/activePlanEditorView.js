import { confirmAction } from "../../ui/modal.js";
import {
  createDefaultMilestone,
  getExerciseDefaultTrackingType,
  getExerciseSupportedTestMetrics,
} from "../../data/schemaMigration.js";

function normalizeUiCopy(value) {
  return String(value ?? "")
    .replace(/Ãƒâ€šÃ‚Â·/g, "/")
    .replace(/ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢/g, "'")
    .replace(/ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢/g, "/")
    .replace(/ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Âª/g, "PL");
}

function escapeHtml(str) {
  return normalizeUiCopy(String(str ?? ""))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createLocalId(prefix) {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

function resolvePlanTheme(plan) {
  return {
    color: plan.theme?.color || "#4FD1C5",
    icon: normalizeUiCopy(plan.theme?.icon || "PL"),
    code: plan.theme?.code || "PLN",
  };
}

function inferMetricFromExerciseEntry(entry, exercise) {
  if (entry?.durationSeconds != null) {
    return "duration";
  }
  return getExerciseDefaultTrackingType(exercise) === "duration" ? "duration" : "reps";
}

function buildStageEntryOptions(schedule, routines, exercises) {
  const options = [];

  (schedule || []).forEach((scheduleEntry, dayIndex) => {
    if (scheduleEntry?.type !== "routine" || !scheduleEntry.routineId) {
      return;
    }

    const routine = routines.find((item) => item.id === scheduleEntry.routineId);
    (routine?.entries || []).forEach((entry) => {
      const exercise = exercises.find((item) => item.id === entry.exerciseId);
      const exerciseName = exercise?.name || entry.exerciseId || "Activity";
      const entryMetric = inferMetricFromExerciseEntry(entry, exercise);
      const valueLabel = entryMetric === "duration"
        ? `${entry.durationSeconds ?? 0}s`
        : `${entry.reps ?? 0} reps`;
      const loadLabel = entry.weight != null
        ? ` @ ${entry.weight}kg`
        : entry.resistance
          ? ` @ ${entry.resistance}`
          : "";

      options.push({
        id: `${scheduleEntry.routineId}::${entry.id}`,
        routineId: scheduleEntry.routineId,
        routineName: routine?.name || "Routine",
        entryId: entry.id,
        exerciseId: entry.exerciseId,
        exerciseName,
        entry,
        exercise,
        defaultMetric: entryMetric,
        label: `Day ${dayIndex + 1} / ${routine?.name || "Routine"} / ${exerciseName} / ${valueLabel}${loadLabel}`,
      });
    });
  });

  return options;
}

function buildStageEntryTest(option, currentTest = {}) {
  const supportedMetrics = getExerciseSupportedTestMetrics(option.exercise);
  const fallbackMetric = supportedMetrics.includes(option.defaultMetric)
    ? option.defaultMetric
    : supportedMetrics[0];
  const metric = supportedMetrics.includes(currentTest.metric) ? currentTest.metric : fallbackMetric;
  return {
    ...currentTest,
    type: "exercise",
    source: "stage_entry",
    exerciseId: option.exerciseId,
    routineId: option.routineId,
    routineEntryId: option.entryId,
    metric,
    target:
      currentTest.target ??
      (metric === "duration" ? option.entry.durationSeconds : option.entry.reps) ??
      1,
    weight: option.entry.weight ?? currentTest.weight ?? null,
    resistance: option.entry.resistance ?? currentTest.resistance ?? null,
    restSeconds: option.entry.restSeconds ?? option.exercise?.restSeconds ?? currentTest.restSeconds ?? null,
    notes: option.entry.notes ?? currentTest.notes ?? "",
  };
}

function renderMetricOptions(metrics, selectedMetric) {
  return metrics.map((metric) => `
    <option value="${metric}" ${selectedMetric === metric ? "selected" : ""}>${escapeHtml(metric === "duration" ? "Duration" : "Reps")}</option>
  `).join("");
}

function formatMilestoneSummary(stage, exercises = []) {
  const milestone = createDefaultMilestone(stage?.milestone || {});

  if (milestone.description) {
    return milestone.description;
  }

  if (milestone.test.type === "exercise" && milestone.test.exerciseId) {
    const exerciseName =
      exercises.find((exercise) => exercise.id === milestone.test.exerciseId)?.name ||
      "Activity";
    const metricLabel = milestone.test.metric === "duration" ? "seconds" : "reps";
    return `${exerciseName} test / ${milestone.test.target ?? 1} ${metricLabel}`;
  }

  if (milestone.eligibility.type === "none") {
    return stage?.transitionRule === "manual"
      ? "Manual advancement stage"
      : "Advance any time";
  }

  if (milestone.eligibility.type === "sessions") {
    const target = milestone.eligibility.target ?? 1;
    return `Unlock after ${target} session${target === 1 ? "" : "s"}`;
  }

  const target = milestone.eligibility.target ?? 1;
  if (milestone.eligibility.requiresContinuous) {
    return `Unlock after ${target} consecutive cycle completion${target === 1 ? "" : "s"}`;
  }
  return `Unlock after ${target} cycle completion${target === 1 ? "" : "s"}`;
}

function renderFeedbackPromptEditor(prompts) {
  const items = Array.isArray(prompts) ? prompts : [];

  return `
    <div class="field field--full">
      <label>Session Feedback Prompts</label>
      <p class="panel__copy" style="margin: 0 0 12px;">Optional check-ins shown after each session in this stage. Use them for symptoms, function changes, or rehab-style notes that matter to later review.</p>
      <div class="stack stack--tight">
        ${items.length ? items.map((prompt, index) => `
          <div style="padding: 14px; border-radius: 18px; border: 1px solid rgba(143,168,210,0.16); background: rgba(255,255,255,0.02);">
            <div class="field-grid">
              <div class="field">
                <label>Prompt</label>
                <input
                  type="text"
                  data-feedback-prompt-field="label"
                  data-feedback-prompt-index="${index}"
                  value="${escapeHtml(prompt.label || "")}"
                  placeholder="e.g. How does numbness feel after this session?"
                >
              </div>
              <div class="field">
                <label>Placeholder</label>
                <input
                  type="text"
                  data-feedback-prompt-field="placeholder"
                  data-feedback-prompt-index="${index}"
                  value="${escapeHtml(prompt.placeholder || "")}"
                  placeholder="e.g. Less tingling in the hand, same as before, or worse."
                >
              </div>
            </div>
            <div class="page-actions__group" style="margin-top: 10px;">
              <button class="button button--ghost button--compact button--danger" type="button" data-action="remove-feedback-prompt" data-feedback-prompt-index="${index}">Remove prompt</button>
            </div>
          </div>
        `).join("") : `
          <div class="read-block">No session feedback prompts yet.</div>
        `}
        <button class="button button--ghost button--compact" data-action="add-feedback-prompt" type="button">Add Feedback Prompt</button>
      </div>
    </div>
  `;
}

function stageStateLabel(index, currentStageIndex) {
  if (index < currentStageIndex) {
    return { label: "Completed / frozen", tone: "rgba(255,255,255,0.08)" };
  }
  if (index === currentStageIndex) {
    return { label: "Current stage", tone: "rgba(79, 209, 197, 0.14)" };
  }
  return { label: "Future stage", tone: "rgba(143,168,210,0.08)" };
}

function renderEditorUnavailable(container, planId, actions) {
  container.innerHTML = `
    <div class="panel panel--section">
      <div class="panel__body" style="padding: 32px;">
        <h1 style="margin-top: 0;">Live editor unavailable</h1>
        <p style="color: var(--muted); margin-bottom: 20px;">Open the active plan detail screen and start editing again to create a fresh draft.</p>
        <div class="page-actions__group">
          <button class="button button--ghost" type="button" data-action="ape-back">Back to plan</button>
          <button class="button button--primary" type="button" data-action="ape-reopen">Reopen editor</button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('[data-action="ape-back"]')?.addEventListener("click", () => {
    actions.navigate(planId ? `active-plan/${planId}` : "active-plans");
  });
  container.querySelector('[data-action="ape-reopen"]')?.addEventListener("click", () => {
    if (planId) {
      actions.beginActivePlanEdit(planId);
    }
  });
}

function renderLivePlanEditor(container, plan, exercises, actions) {
  const stages = plan.stages || [];
  const theme = resolvePlanTheme(plan);
  const currentStageIndex = Math.max(0, Number(plan.currentStageIndex ?? 0));

  container.innerHTML = `
    <div class="editor-shell">
      <div class="library-header">
        <div class="library-header__copy">
          <h1>Live Plan Editor</h1>
          <p>Editing active plan: ${escapeHtml(plan.displayName || plan.name || "Untitled Plan")}.</p>
        </div>
      </div>

      <section class="panel panel--section">
        <div class="panel__header">
          <div>
            <span class="eyebrow">Live plan identity</span>
            <h3 class="panel__title" style="margin-top: 8px;">Current journey metadata</h3>
            <p class="panel__copy">Edit the live plan instance without touching workout history or completed stages.</p>
          </div>
        </div>
        <div class="panel__body">
          <div class="field-grid">
            <div class="field">
              <label>Live plan title</label>
              <input type="text" data-field="displayName" value="${escapeHtml(plan.displayName || "")}" placeholder="e.g. Shivam / Morning Strength">
            </div>
            <div class="field field--full">
              <label>Goal</label>
              <input type="text" data-field="goal" value="${escapeHtml(plan.goal || "")}" placeholder="Short goal or outcome">
            </div>
            <div class="field field--full">
              <label>Description</label>
              <textarea data-field="description" style="min-height: 100px;">${escapeHtml(plan.description || "")}</textarea>
            </div>
            <div class="field field--full">
              <label>Built from</label>
              <div class="read-block">${escapeHtml(plan.name || "Unnamed template")}</div>
              <p class="field-hint">Editing this live plan changes only this active copy. The original template stays the same.</p>
            </div>
            <div class="field">
              <label>Accent color</label>
              <input type="text" data-theme-field="color" value="${escapeHtml(theme.color)}" placeholder="#4FD1C5">
              <p class="field-hint">Used on this plan card and key actions.</p>
            </div>
            <div class="field">
              <label>Badge text</label>
              <input type="text" data-theme-field="icon" value="${escapeHtml(theme.icon)}" maxlength="8" placeholder="SF">
              <p class="field-hint">Short letters shown on the plan badge.</p>
            </div>
            <div class="field field--full">
              <label>Current progress</label>
              <div class="readonly-status-card">
                <span class="readonly-status-card__eyebrow">Read-only</span>
                <strong class="readonly-status-card__value">Stage ${currentStageIndex + 1} / Day ${Math.max(1, Number(plan.currentDayInCycle ?? 1))} / Cycle ${Math.max(0, Number(plan.currentCycleCount ?? 0))}</strong>
                <p class="readonly-status-card__copy">This reflects the live plan's current progress. Change the stage map below if you want to alter what comes next.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="panel panel--section">
        <div class="panel__header">
          <div>
            <span class="eyebrow">Stage timeline</span>
            <h3 class="panel__title" style="margin-top: 8px;">Editable stage map</h3>
            <p class="panel__copy">Completed stages are frozen. Current and future stages can be edited, removed, or extended.</p>
          </div>
          <div class="panel__header-actions">
            <button class="button button--ghost" data-action="add-live-stage" type="button">Add Stage</button>
          </div>
        </div>
        <div class="panel__body">
          <ul class="stage-list">
            ${stages.length === 0 ? '<p class="muted" style="text-align: center; padding: 20px;">No stages defined.</p>' : stages.map((stage, index) => {
              const stageState = stageStateLabel(index, currentStageIndex);
              const isFrozen = index < currentStageIndex;
              return `
                <li class="stage-list__item">
                  <div class="stage-list__row">
                    <div class="stage-list__identity">
                      <div class="timeline-item__badges">
                        <span class="stage-list__index">${index + 1}</span>
                        <span class="stage-list__name">${escapeHtml(stage.name || "Untitled Stage")}</span>
                        <span class="badge" style="background: ${stageState.tone}; font-size: 0.75rem;">${escapeHtml(stageState.label)}</span>
                        <span class="badge" style="background: rgba(143,168,210,0.05); font-size: 0.75rem;">${stage.schedule?.length || 0} ordered step${(stage.schedule?.length || 0) === 1 ? "" : "s"}</span>
                      </div>
                      ${stage.guidance ? `<p class="stage-list__summary">${escapeHtml(stage.guidance)}</p>` : ""}
                    </div>
                    <div class="page-actions__group">
                      ${isFrozen ? `
                        <span class="badge" style="background: rgba(255,255,255,0.04); color: var(--muted);">Read-only after use</span>
                      ` : `
                        <button class="button button--ghost" style="padding: 8px 14px; min-height: 40px;" data-action="edit-live-stage" data-stage-id="${stage.id}" type="button">Edit</button>
                        <button class="button button--ghost button--danger" style="padding: 8px 14px; min-height: 40px;" data-action="remove-live-stage" data-stage-id="${stage.id}" type="button">Delete</button>
                      `}
                    </div>
                  </div>
                  <div class="read-block" style="margin-top: 12px;">${escapeHtml(formatMilestoneSummary(stage, exercises))}</div>
                </li>
              `;
            }).join("")}
          </ul>
        </div>
      </section>

      <div class="form-actions">
        <button class="button button--ghost" data-action="exit-live-editor" type="button">Discard Changes</button>
        <button class="button button--primary" data-action="save-live-plan" type="button" style="background: ${theme.color}; color: #000; border: none; box-shadow: 0 10px 24px ${theme.color}55;">Save Live Plan</button>
      </div>
    </div>
  `;

  container.querySelector('[data-action="exit-live-editor"]')?.addEventListener("click", () => {
    actions.leaveActivePlanEditorToDetail(plan.id);
  });
  container.querySelector('[data-action="save-live-plan"]')?.addEventListener("click", () => {
    actions.saveActivePlanDraft();
  });
  container.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("change", () => {
      actions.updateActivePlanDraft({ [input.dataset.field]: input.value });
    });
  });
  container.querySelectorAll("[data-theme-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const field = input.dataset.themeField;
      actions.updateActivePlanDraft({
        theme: {
          ...(plan.theme || {}),
          [field]: input.value,
        },
      });
    });
  });
  container.querySelector('[data-action="add-live-stage"]')?.addEventListener("click", () => {
    const newId = createLocalId("stage");
      const newStage = {
        id: newId,
        name: "New Stage",
        guidance: "",
        predecessorStageId: null,
        transitionRule: "prompt_user",
        schedule: [{ type: "rest", routineId: null }],
        milestone: createDefaultMilestone(),
      };
    actions.updateActivePlanDraft({ stages: [...stages, newStage] });
    actions.setEditingActivePlanStageId(newId);
  });
  container.querySelectorAll('[data-action="edit-live-stage"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.setEditingActivePlanStageId(button.dataset.stageId);
    });
  });
  container.querySelectorAll('[data-action="remove-live-stage"]').forEach((button) => {
    button.addEventListener("click", () => {
      const stageId = button.dataset.stageId;
      const stage = stages.find((entry) => entry.id === stageId);
      confirmAction(document.body, {
        title: "Remove stage?",
        message: `Remove "${stage?.name || "this stage"}" from the live plan? Completed stages stay frozen, but deleting the current stage may require a remap review before saving.`,
        confirmText: "Remove Stage",
        onConfirm: () => {
          actions.updateActivePlanDraft({
            stages: stages.filter((entry) => entry.id !== stageId),
          });
        },
      });
    });
  });
}

function renderLiveStageEditor(container, stageDraft, routines, allExercises, allStages, actions) {
  const stage = stageDraft;
  const schedule = stage.schedule || [];
  const milestone = createDefaultMilestone(stage.milestone || {});
  const stageEntryOptions = buildStageEntryOptions(schedule, routines, allExercises);
  const matchingStageEntry = stageEntryOptions.find((option) =>
    option.routineId === milestone.test.routineId && option.entryId === milestone.test.routineEntryId,
  ) || stageEntryOptions.find((option) =>
    milestone.test.source === "stage_entry" && option.exerciseId === milestone.test.exerciseId,
  ) || null;
  const selectedExercise = allExercises.find((exercise) => exercise.id === milestone.test.exerciseId) || null;
  const supportedMetrics = getExerciseSupportedTestMetrics(matchingStageEntry?.exercise || selectedExercise);
  const inferredMetric = inferMetricFromExerciseEntry(matchingStageEntry?.entry, selectedExercise);
  const resolvedMetric = supportedMetrics.includes(milestone.test.metric)
    ? milestone.test.metric
    : supportedMetrics.includes(inferredMetric)
      ? inferredMetric
      : supportedMetrics[0];
  const testTargetLabel = resolvedMetric === "duration" ? "Target Seconds" : "Target Reps";
  const stageTargetOptions = allStages.filter((entry) => entry.id !== stage.id);

  container.innerHTML = `
    <div class="editor-shell">
      <div class="library-header">
        <div class="library-header__copy">
          <h1>Live Stage Configuration</h1>
          <p>Editing ${escapeHtml(stage.name || "Untitled Stage")} inside the active plan.</p>
        </div>
      </div>

      <section class="panel panel--section stage-builder" style="background: rgba(0,0,0,0.15); border: 1px solid rgba(143, 168, 210, 0.15);">
        <div class="panel__header">
          <div>
            <span class="eyebrow">Stage setup</span>
            <h3 class="panel__title" style="margin-top: 8px;">Schedule and milestone gate</h3>
            <p class="panel__copy">Adjust the current or future stage without touching completed history.</p>
          </div>
        </div>
        <div class="panel__body">
          <div class="field-grid">
            <div class="field">
              <label>Stage Name</label>
              <input type="text" data-stage-field="name" value="${escapeHtml(stage.name)}" placeholder="e.g. The Foundation">
            </div>
            <div class="field">
              <label>Transition Rule</label>
              <select data-stage-field="transitionRule">
                <option value="prompt_user" ${stage.transitionRule !== "manual" ? "selected" : ""}>Prompt When Cleared</option>
                <option value="manual" ${stage.transitionRule === "manual" ? "selected" : ""}>Manual Advance Later</option>
              </select>
            </div>
            <div class="field field--full">
              <label>Stage Guidance</label>
              <textarea data-stage-field="guidance" style="min-height: 110px;" placeholder="Describe what the user should understand about this stage, its focus, and any preparation notes.">${escapeHtml(stage.guidance || "")}</textarea>
            </div>

            <div class="field field--full" style="margin-top: 8px;">
              <label style="margin-bottom: 12px; display: block; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);">Schedule</label>
              <div class="schedule-builder">
                ${schedule.map((entry, dayIndex) => `
                  <div class="schedule-row">
                    <div class="schedule-row__index">Day ${dayIndex + 1}</div>
                    <select style="flex: 1 1 220px;" data-action="update-live-day" data-day-index="${dayIndex}">
                      <option value="">-- Rest Step --</option>
                      ${routines.map((routine) => `<option value="${routine.id}" ${entry.type === "routine" && routine.id === entry.routineId ? "selected" : ""}>${escapeHtml(routine.name)}</option>`).join("")}
                    </select>
                    <button class="mini-button" data-action="remove-live-day" data-day-index="${dayIndex}" style="padding: 8px;" type="button">Remove</button>
                  </div>
                `).join("")}
                <button class="button button--ghost" data-action="add-live-day" style="margin-top: 8px; width: fit-content; padding: 8px 16px; font-size: 0.85rem;" type="button">Add Step</button>
              </div>
            </div>

            <div class="field field--full" style="margin-top: 40px; border-top: 1px dashed rgba(143,168,210,0.2); padding-top: 32px;">
              <h5 style="color: var(--brand); margin-bottom: 16px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Milestone Gate</h5>
              <div class="field-grid">
                <div class="field field--full">
                  <label>Milestone Description</label>
                  <input type="text" data-milestone-field="description" value="${escapeHtml(milestone.description)}" placeholder="e.g. Earn the pull-up test, then pass it to unlock the next stage">
                </div>

                <div class="field">
                  <label>Eligibility</label>
                  <select data-milestone-eligibility-field="type">
                    <option value="none" ${milestone.eligibility.type === "none" ? "selected" : ""}>No unlock requirement</option>
                    <option value="cycles" ${milestone.eligibility.type === "cycles" ? "selected" : ""}>Cycles</option>
                    <option value="sessions" ${milestone.eligibility.type === "sessions" ? "selected" : ""}>Sessions</option>
                  </select>
                </div>

                ${milestone.eligibility.type !== "none" ? `
                  <div class="field">
                    <label>${milestone.eligibility.type === "sessions" ? "Required Sessions" : "Required Cycles"}</label>
                    <input type="number" data-milestone-eligibility-field="target" value="${milestone.eligibility.target ?? 1}" min="1">
                  </div>
                  <div class="field field--full">
                    <label style="display: flex; align-items: center; gap: 8px;">
                      <input type="checkbox" data-milestone-eligibility-field="requiresContinuous" ${milestone.eligibility.requiresContinuous ? "checked" : ""}>
                      Require continuous adherence
                    </label>
                  </div>
                ` : ""}

                <div class="field">
                  <label>Milestone Test</label>
                  <select data-milestone-test-field="type">
                    <option value="none" ${milestone.test.type !== "exercise" ? "selected" : ""}>No separate test</option>
                    <option value="exercise" ${milestone.test.type === "exercise" ? "selected" : ""}>Activity test</option>
                  </select>
                </div>

                ${milestone.test.type === "exercise" ? `
                  <div class="field">
                    <label>Test Source</label>
                    <select data-milestone-test-field="source">
                      <option value="stage_entry" ${milestone.test.source === "stage_entry" ? "selected" : ""}>Use stage routine activity</option>
                      <option value="custom" ${milestone.test.source !== "stage_entry" ? "selected" : ""}>Standalone activity test</option>
                    </select>
                  </div>

                  ${milestone.test.source === "stage_entry" ? `
                    <div class="field field--full">
                      <label>Routine activity entry</label>
                      <select data-milestone-test-field="stageEntry">
                        <option value="">-- Select stage activity --</option>
                        ${stageEntryOptions.map((option) => `<option value="${option.id}" ${matchingStageEntry?.id === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                      </select>
                    </div>
                  ` : `
                    <div class="field field--full">
                      <label>Test activity</label>
                      <select data-milestone-test-field="exerciseId">
                        <option value="">-- Select activity --</option>
                        ${allExercises.map((exercise) => `<option value="${exercise.id}" ${milestone.test.exerciseId === exercise.id ? "selected" : ""}>${escapeHtml(exercise.name)}</option>`).join("")}
                      </select>
                    </div>
                  `}

                  <div class="field">
                    <label>Pass Metric</label>
                    <select data-milestone-test-field="metric">
                      ${renderMetricOptions(supportedMetrics, resolvedMetric)}
                    </select>
                  </div>
                  <div class="field">
                    <label>${testTargetLabel}</label>
                    <input type="number" data-milestone-test-field="target" value="${milestone.test.target ?? ""}" min="1">
                  </div>
                  <div class="field">
                    <label>Required Weight (kg)</label>
                    <input type="number" data-milestone-test-field="weight" value="${milestone.test.weight ?? ""}" step="0.5" min="0">
                  </div>
                  <div class="field">
                    <label>Required Resistance</label>
                    <input type="text" data-milestone-test-field="resistance" value="${escapeHtml(milestone.test.resistance || "")}" placeholder="Optional band / cable setting">
                  </div>
                  <div class="field">
                    <label>Rest Between Attempts</label>
                    <input type="number" data-milestone-test-field="restSeconds" value="${milestone.test.restSeconds ?? ""}" min="0">
                  </div>
                  <div class="field field--full">
                    <label>Test Notes</label>
                    <input type="text" data-milestone-test-field="notes" value="${escapeHtml(milestone.test.notes || "")}" placeholder="e.g. one strict rep with full hang">
                  </div>
                ` : ""}

                <div class="field">
                  <label>On Failed Test</label>
                  <select data-milestone-failure-field="action">
                    <option value="none" ${milestone.onFailure.action === "none" ? "selected" : ""}>Stay In Current Stage</option>
                    <option value="restart_stage" ${milestone.onFailure.action === "restart_stage" ? "selected" : ""}>Restart Current Stage</option>
                    <option value="goto_stage" ${milestone.onFailure.action === "goto_stage" ? "selected" : ""}>Go To Another Stage</option>
                  </select>
                </div>
                ${milestone.onFailure.action === "goto_stage" ? `
                  <div class="field">
                    <label>Failure Target Stage</label>
                    <select data-milestone-failure-field="targetStageId">
                      <option value="">-- Select stage --</option>
                      ${stageTargetOptions.map((entry) => `<option value="${entry.id}" ${milestone.onFailure.targetStageId === entry.id ? "selected" : ""}>${escapeHtml(entry.name || entry.id)}</option>`).join("")}
                    </select>
                  </div>
                ` : ""}
                ${renderFeedbackPromptEditor(milestone.feedbackPrompts)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="form-actions">
        <button class="button button--ghost" data-action="cancel-live-stage-editor" type="button">Discard Changes</button>
        <button class="button button--primary" data-action="commit-live-stage-editor" type="button">Save Changes</button>
      </div>
    </div>
  `;

  container.querySelector('[data-action="cancel-live-stage-editor"]')?.addEventListener("click", () => {
    actions.setEditingActivePlanStageId(null);
  });
  container.querySelector('[data-action="commit-live-stage-editor"]')?.addEventListener("click", () => {
    actions.commitActivePlanStageDraft();
  });

  container.querySelectorAll("[data-stage-field]").forEach((input) => {
    input.addEventListener("change", () => {
      actions.updateActivePlanStageDraft({ [input.dataset.stageField]: input.value });
    });
  });

  container.querySelector('[data-action="add-live-day"]')?.addEventListener("click", () => {
    const nextSchedule = stage.schedule || [];
    actions.updateActivePlanStageDraft({ schedule: [...nextSchedule, { type: "rest", routineId: null }] });
  });

  container.querySelectorAll('[data-action="remove-live-day"]').forEach((button) => {
    button.addEventListener("click", () => {
      const dayIndex = Number.parseInt(button.dataset.dayIndex, 10);
      const nextSchedule = (stage.schedule || []).filter((_, index) => index !== dayIndex);
      actions.updateActivePlanStageDraft({ schedule: nextSchedule });
    });
  });

  container.querySelectorAll('[data-action="update-live-day"]').forEach((select) => {
    select.addEventListener("change", () => {
      const dayIndex = Number.parseInt(select.dataset.dayIndex, 10);
      const nextSchedule = [...(stage.schedule || [])];
      nextSchedule[dayIndex] = select.value
        ? { type: "routine", routineId: select.value }
        : { type: "rest", routineId: null };
      actions.updateActivePlanStageDraft({ schedule: nextSchedule });
    });
  });

  container.querySelectorAll("[data-milestone-field]").forEach((input) => {
    input.addEventListener("change", () => {
      actions.updateActivePlanStageDraft({
        milestone: createDefaultMilestone({
          ...milestone,
          [input.dataset.milestoneField]: input.value,
        }),
      });
    });
  });

  container.querySelectorAll("[data-milestone-eligibility-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const field = input.dataset.milestoneEligibilityField;
      const rawValue = input.type === "checkbox" ? input.checked : input.value;
      const nextEligibility = {
        ...milestone.eligibility,
        [field]: field === "target"
          ? (rawValue === "" ? null : Number(rawValue))
          : field === "requiresContinuous"
            ? Boolean(rawValue)
            : rawValue,
      };

      if (field === "type" && rawValue === "none") {
        nextEligibility.target = null;
        nextEligibility.requiresContinuous = false;
      }
      if (field === "type" && rawValue !== "none" && nextEligibility.target == null) {
        nextEligibility.target = 1;
      }

      actions.updateActivePlanStageDraft({
        milestone: createDefaultMilestone({
          ...milestone,
          eligibility: nextEligibility,
        }),
      });
    });
  });

  container.querySelectorAll("[data-milestone-test-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const field = input.dataset.milestoneTestField;
      const rawValue = input.value;
      let nextTest = { ...milestone.test };

      if (field === "type") {
        nextTest = rawValue === "exercise"
          ? {
              ...createDefaultMilestone().test,
              type: "exercise",
              source: "stage_entry",
            }
          : { ...createDefaultMilestone().test };
      } else if (field === "source") {
        nextTest = {
          ...nextTest,
          source: rawValue,
          routineId: null,
          routineEntryId: null,
        };
      } else if (field === "stageEntry") {
        const option = stageEntryOptions.find((entry) => entry.id === rawValue);
        nextTest = option ? buildStageEntryTest(option, nextTest) : nextTest;
      } else if (field === "exerciseId") {
        const exercise = allExercises.find((entry) => entry.id === rawValue);
        const supportedMetrics = getExerciseSupportedTestMetrics(exercise);
        nextTest = {
          ...nextTest,
          exerciseId: rawValue || null,
          routineId: null,
          routineEntryId: null,
          metric: supportedMetrics.includes(nextTest.metric) ? nextTest.metric : supportedMetrics[0],
        };
      } else if (field === "target" || field === "weight" || field === "restSeconds") {
        nextTest = {
          ...nextTest,
          [field]: rawValue === "" ? null : Number(rawValue),
        };
      } else {
        nextTest = {
          ...nextTest,
          [field]: rawValue || null,
        };
      }

      actions.updateActivePlanStageDraft({
        milestone: createDefaultMilestone({
          ...milestone,
          test: nextTest,
        }),
      });
    });
  });

  container.querySelectorAll("[data-milestone-failure-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const field = input.dataset.milestoneFailureField;
      const rawValue = input.value;
      const nextFailure = {
        ...milestone.onFailure,
        [field]: rawValue || null,
      };

      if (field === "action" && rawValue !== "goto_stage") {
        nextFailure.targetStageId = null;
      }

      actions.updateActivePlanStageDraft({
        milestone: createDefaultMilestone({
          ...milestone,
          onFailure: nextFailure,
        }),
      });
    });
  });

  container.querySelector('[data-action="add-feedback-prompt"]')?.addEventListener("click", () => {
    actions.updateActivePlanStageDraft({
      milestone: createDefaultMilestone({
        ...milestone,
        feedbackPrompts: [
          ...(milestone.feedbackPrompts || []),
          {
            id: createLocalId("feedback"),
            label: "",
            placeholder: "",
          },
        ],
      }),
    });
  });

  container.querySelectorAll("[data-feedback-prompt-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const promptIndex = Number.parseInt(input.dataset.feedbackPromptIndex, 10);
      const field = input.dataset.feedbackPromptField;
      const nextPrompts = (milestone.feedbackPrompts || []).map((prompt, index) =>
        index === promptIndex
          ? {
              ...prompt,
              [field]: input.value,
            }
          : prompt,
      );

      actions.updateActivePlanStageDraft({
        milestone: createDefaultMilestone({
          ...milestone,
          feedbackPrompts: nextPrompts,
        }),
      });
    });
  });

  container.querySelectorAll('[data-action="remove-feedback-prompt"]').forEach((button) => {
    button.addEventListener("click", () => {
      const promptIndex = Number.parseInt(button.dataset.feedbackPromptIndex, 10);
      actions.updateActivePlanStageDraft({
        milestone: createDefaultMilestone({
          ...milestone,
          feedbackPrompts: (milestone.feedbackPrompts || []).filter((_, index) => index !== promptIndex),
        }),
      });
    });
  });
}

export function renderActivePlanEditorView(container, { state, actions }) {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const planId = hash.split("/")[1];
  const draftPlan = state.draftActivePlan?.id === planId ? state.draftActivePlan : null;
  const livePlan = state.activePlans.find((entry) => entry.id === planId) || null;

  container.innerHTML = "";

  const section = document.createElement("section");
  section.className = "page page-single";

  if (!draftPlan || !livePlan) {
    renderEditorUnavailable(section, planId, actions);
    container.appendChild(section);
    return;
  }

  if (state.activePlanStageDraft) {
    renderLiveStageEditor(
      section,
      state.activePlanStageDraft,
      state.routines || [],
      state.exercises || [],
      draftPlan.stages || [],
      actions,
    );
  } else {
    renderLivePlanEditor(section, draftPlan, state.exercises || [], actions);
  }

  container.appendChild(section);
}
