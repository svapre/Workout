/**
 * Plan Blueprints View
 *
 * Manages the CRUD lifecycle of static training templates (Blueprints).
 */

import { confirmAction } from "../../ui/modal.js";
import {
  createDefaultMilestone,
  getExerciseDefaultTrackingType,
  getExerciseSupportedTestMetrics,
} from "../../data/schemaMigration.js";

function normalizeUiCopy(value) {
  return String(value ?? "")
    .replace(/Â·/g, "/")
    .replace(/â€™/g, "'")
    .replace(/â†’/g, "/")
    .replace(/ðŸ’ª/g, "PL");
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

function truncate(value, maxLength = 150) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function resolvePlanTheme(plan) {
  return {
    color: plan.theme?.color || "#4FD1C5",
    icon: normalizeUiCopy(plan.theme?.icon || "PL"),
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
      const exerciseName = exercise?.name || entry.exerciseId || "Exercise";
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
        label: `Day ${dayIndex + 1} · ${routine?.name || "Routine"} · ${exerciseName} · ${valueLabel}${loadLabel}`,
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
      "Exercise";
    const metricLabel = milestone.test.metric === "duration" ? "seconds" : "reps";
    return `${exerciseName} test - ${milestone.test.target ?? 1} ${metricLabel}`;
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
  const continuityLabel = milestone.eligibility.requiresContinuous ? " consecutive" : "";
  return `Unlock after ${target}${continuityLabel} cycle${target === 1 ? "" : "s"}`;
}

function summarizeBlueprintGoal(plan) {
  const stageCount = plan.stages?.length || 0;
  if (plan.goal) {
    return plan.goal;
  }
  if (stageCount > 0) {
    return `${stageCount} stage${stageCount === 1 ? "" : "s"} of structured progression`;
  }
  return "Structured progression blueprint";
}

function summarizeBlueprintStructure(plan) {
  const stageCount = plan.stages?.length || 0;
  const firstStageDays = plan.stages?.[0]?.schedule?.length || 0;
  const firstMilestone = plan.stages?.[0]?.milestone?.description;
  const parts = [];

  parts.push(`${stageCount} stage${stageCount === 1 ? "" : "s"}`);
  if (firstStageDays) {
    parts.push(`${firstStageDays}-day opening cycle`);
  }
  if (firstMilestone) {
    parts.push(firstMilestone);
  }

  return parts.join(" / ");
}

function renderBlueprintCard(plan) {
  const theme = resolvePlanTheme(plan);
  const stageCount = plan.stages?.length || 0;
  const missionNote = truncate(plan.description || "No description provided yet.", 150);

  return `
    <article class="plan-card" style="--plan-color: ${theme.color};" data-action="blueprint-card" data-plan-id="${plan.id}">
      <div class="plan-card__top">
        <div class="plan-card__icon">${escapeHtml(theme.icon)}</div>
        <div class="plan-card__info">
          <h2 class="plan-card__title">${escapeHtml(plan.name || "Untitled Blueprint")}</h2>
          <p class="plan-card__subtitle">${escapeHtml(stageCount === 0 ? "Blueprint draft" : "Static plan template")}</p>
        </div>
      </div>

      <div class="plan-card__label-row">
        <span class="plan-card__tag">${escapeHtml(`${stageCount} stage${stageCount === 1 ? "" : "s"}`)}</span>
        <span class="plan-card__tag">${escapeHtml(plan.version || "v1")}</span>
      </div>

      <div class="plan-card__mission">
        <div class="plan-card__mission-label">Blueprint goal</div>
        <h3 class="plan-card__mission-title">${escapeHtml(summarizeBlueprintGoal(plan))}</h3>
        <p class="plan-card__mission-note">${escapeHtml(missionNote)}</p>
      </div>

      <div class="plan-card__progress">
        <div class="plan-card__progress-title">Structure</div>
        <div class="plan-card__progress-text">${escapeHtml(summarizeBlueprintStructure(plan) || "No stages defined yet.")}</div>
      </div>

      <button
        class="button button--primary plan-card__cta"
        data-action="select-plan"
        data-plan-id="${plan.id}"
        type="button"
        style="background: ${theme.color}; color: #000; border: none; box-shadow: 0 10px 24px ${theme.color}55;"
      >
        View blueprint
      </button>
    </article>
  `;
}

export function renderPlansView(container, { state, actions }) {
  const { plans, routines, exercises, selectedPlanId, planEditMode, draftBlueprint, stageDraft } = state;
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  container.innerHTML = "";

  const section = document.createElement("section");
  section.className = "page page-single";

  if (!selectedPlan) {
    renderList(section, plans, actions);
  } else if (planEditMode && draftBlueprint) {
    if (stageDraft) {
      renderStageEditor(section, stageDraft, routines, exercises, draftBlueprint?.stages || [], actions);
    } else {
      renderBlueprintEditor(section, draftBlueprint, actions);
    }
  } else {
    renderDetail(section, selectedPlan, actions, exercises);
  }

  container.appendChild(section);
}

function renderList(container, plans, actions) {
  container.innerHTML = `
    <div class="library-header">
      <div class="library-header__copy">
        <h1>Plan Blueprints</h1>
        <p>Static templates for your training journeys.</p>
      </div>
      <div class="library-header__actions">
        <input type="file" id="plan-import-input" accept=".json" style="display: none;">
        <button class="button button--ghost" data-action="open-plan-import" type="button">Import Blueprint</button>
        <button class="button button--primary" data-action="create-blueprint" type="button">Create New Blueprint</button>
      </div>
    </div>

    ${plans.length === 0 ? `
      <section class="panel panel--section">
        <div class="panel__body">
          <div class="empty-state">
            <h3>No blueprints found</h3>
            <p>Create a blueprint or import one from JSON to start structuring active plans.</p>
          </div>
        </div>
      </section>
    ` : `
      <div class="plan-card-grid">
        ${plans.map((plan) => renderBlueprintCard(plan)).join("")}
      </div>
    `}
  `;

  container.querySelector('[data-action="create-blueprint"]')?.addEventListener("click", () => {
    actions.createBlueprint();
  });

  const importInput = container.querySelector("#plan-import-input");
  container.querySelector('[data-action="open-plan-import"]')?.addEventListener("click", () => {
    importInput?.click();
  });

  if (importInput) {
    importInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        try {
          const data = JSON.parse(loadEvent.target.result);
          actions.importFullPlan(data);
          alert("Blueprint imported successfully!");
          actions.navigate("plans");
        } catch (error) {
          alert(`Error: ${error.message}`);
        }
      };
      reader.readAsText(file);
    });
  }

  container.querySelectorAll('[data-action="blueprint-card"]').forEach((card) => {
    card.addEventListener("click", () => {
      actions.selectPlan(card.dataset.planId);
    });
  });

  container.querySelectorAll('[data-action="select-plan"]').forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.selectPlan(button.dataset.planId);
    });
  });
}

function renderDetail(container, plan, actions, exercises = []) {
  const stages = plan.stages || [];
  const theme = resolvePlanTheme(plan);
  const missionTitle = summarizeBlueprintGoal(plan);
  const missionNote = truncate(plan.description || "No description provided yet.", 170);
  const structureText = summarizeBlueprintStructure(plan) || "No stages defined yet.";

  container.innerHTML = `
    <div class="page-actions">
      <div class="page-actions__group">
        <button class="button button--ghost" data-action="back-to-list" type="button">Back to Blueprints</button>
      </div>
      <div class="page-actions__group">
        <button class="button button--danger button--ghost" data-action="delete-blueprint">Delete Blueprint</button>
        <button class="button button--ghost" data-action="export-blueprint">Export Blueprint</button>
        <button class="button" data-action="edit-blueprint">Edit Blueprint</button>
      </div>
    </div>

    <article class="plan-card" style="--plan-color: ${theme.color};">
      <div class="plan-card__top">
        <div class="plan-card__icon">${escapeHtml(theme.icon)}</div>
        <div class="plan-card__info">
          <h1 class="plan-card__title" style="font-size: 1.5rem;">${escapeHtml(plan.name)}</h1>
          <p class="plan-card__subtitle">Static blueprint template that spawns editable active plans.</p>
        </div>
      </div>

      <div class="plan-card__label-row">
        <span class="plan-card__tag">${escapeHtml(plan.version || "v1")}</span>
        <span class="plan-card__tag">${escapeHtml(`${stages.length} stage${stages.length === 1 ? "" : "s"}`)}</span>
      </div>

      <div class="plan-card__mission">
        <div class="plan-card__mission-label">Blueprint goal</div>
        <h2 class="plan-card__mission-title">${escapeHtml(missionTitle)}</h2>
        <p class="plan-card__mission-note">${escapeHtml(missionNote)}</p>
      </div>

      <div class="plan-card__progress">
        <div class="plan-card__progress-title">Structure</div>
        <div class="plan-card__progress-text">${escapeHtml(structureText)}</div>
      </div>

      <button
        class="button button--primary plan-card__cta"
        data-action="start-plan"
        type="button"
        style="background: ${theme.color}; color: #000; border: none; box-shadow: 0 10px 24px ${theme.color}55;"
      >
        Start this plan
      </button>
    </article>

    <section class="panel panel--section">
      <div class="panel__header">
        <div>
          <span class="eyebrow">Progression architecture</span>
          <h2 class="panel__title" style="margin-top: 8px;">Stage map</h2>
          <p class="panel__copy">Blueprint stages, schedule shapes, and the milestone gates that advance the journey.</p>
        </div>
      </div>
      <div class="panel__body">
        <div class="timeline-list">
          ${stages.length === 0 ? '<p class="muted">No stages defined for this template.</p>' : stages.map((stage, index) => {
            const schedule = stage.schedule || [];
            const milestoneSummary = formatMilestoneSummary(stage, exercises);

            return `
              <div class="timeline-item">
                <div class="timeline-item__row" style="justify-content: flex-start; gap: 16px;">
                  <div style="flex: 0 0 40px; height: 40px; background: rgba(79, 209, 197, 0.1); color: var(--brand); border: 1px solid rgba(79, 209, 197, 0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">
                    ${index + 1}
                  </div>
                  <div style="flex: 1 1 240px;">
                    <h3 style="margin: 0 0 8px; font-size: 1.2rem; color: var(--text);">${escapeHtml(stage.name || "Untitled Stage")}</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                      <span class="badge" style="background: rgba(255,255,255,0.05); color: var(--soft);">
                        ${schedule.length}-Step Cycle
                      </span>
                      <span class="badge" style="background: rgba(246, 173, 85, 0.1); color: var(--brand-2); border: 1px solid rgba(246, 173, 85, 0.2);">
                        Milestone: ${escapeHtml(milestoneSummary)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </section>
  `;

  container.querySelector('[data-action="back-to-list"]').addEventListener("click", () => {
    actions.leavePlanLibraryDetail();
  });

  container.querySelector('[data-action="edit-blueprint"]').addEventListener("click", () => {
    actions.togglePlanEditMode(true);
  });

  container.querySelector('[data-action="export-blueprint"]').addEventListener("click", () => {
    actions.exportFullPlan(plan.id);
  });

  container.querySelector('[data-action="delete-blueprint"]').addEventListener("click", () => {
    confirmAction(document.body, {
      title: "Delete Blueprint?",
      message: `Are you sure you want to delete "${plan.name}"? This will permanently remove the template and all its stages.`,
      confirmText: "Delete Template",
      onConfirm: () => {
        actions.deleteBlueprint(plan.id);
      },
    });
  });

  container.querySelector('[data-action="start-plan"]').addEventListener("click", () => {
    import("../../ui/modal.js").then(({ promptAction }) => {
      promptAction(document.body, {
        title: "Name Your Training Journey",
        message: "Give this instance a name to distinguish it on your dashboard.",
        defaultValue: plan.name,
        confirmText: "Activate Plan",
        onConfirm: (customName) => {
          const success = actions.instantiatePlan(plan.id, customName);
          if (success) {
            actions.navigate("active-plans");
          }
        },
      });
    });
  });
}

function renderBlueprintEditor(container, plan, actions) {
  const stages = plan.stages || [];

  container.innerHTML = `
    <div class="editor-shell">
      <div class="library-header">
        <div class="library-header__copy">
          <h1>Blueprint Editor</h1>
          <p>Architecting: ${escapeHtml(plan.name || "New Plan")}</p>
        </div>
      </div>

      <section class="panel panel--section">
        <div class="panel__header">
          <div>
            <span class="eyebrow">General information</span>
            <h3 class="panel__title" style="margin-top: 8px;">Blueprint identity</h3>
            <p class="panel__copy">Define the static template that later spawns editable active plans.</p>
          </div>
        </div>
        <div class="panel__body">
          <div class="field-grid">
            <div class="field">
              <label>Plan title</label>
              <input type="text" data-field="name" value="${escapeHtml(plan.name)}" placeholder="e.g. 100 Pushup Challenge">
            </div>
            <div class="field field--full">
              <label>Description and philosophy</label>
              <textarea data-field="description" style="min-height: 100px;">${escapeHtml(plan.description)}</textarea>
            </div>
          </div>
        </div>
      </section>

      <section class="panel panel--section">
        <div class="panel__header">
          <div>
            <span class="eyebrow">Progression stages</span>
            <h3 class="panel__title" style="margin-top: 8px;">Stage list</h3>
            <p class="panel__copy">Sequence the schedule blocks and milestone gates that define this blueprint.</p>
          </div>
          <div class="panel__header-actions">
            <button class="button button--ghost" data-action="add-stage" type="button">Add Stage</button>
          </div>
        </div>
        <div class="panel__body">
          <ul class="stage-list">
            ${stages.length === 0 ? '<p class="muted" style="text-align: center; padding: 20px;">No stages yet.</p>' : stages.map((stage, index) => `
              <li class="stage-list__item">
                <div class="stage-list__row">
                  <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                    <span style="font-weight: 800; color: var(--brand); opacity: 0.5;">${index + 1}</span>
                    <span style="font-weight: 600;">${escapeHtml(stage.name || "Untitled Stage")}</span>
                    <span class="badge" style="background: rgba(143,168,210,0.05); font-size: 0.75rem;">${stage.schedule?.length || 0}-step cycle</span>
                  </div>
                  <div class="page-actions__group">
                    <button class="button button--ghost" style="padding: 8px 14px; min-height: 40px;" data-action="edit-stage" data-stage-id="${stage.id}" type="button">Edit</button>
                    <button class="button button--ghost button--danger" style="padding: 8px 14px; min-height: 40px;" data-action="remove-stage" data-stage-id="${stage.id}" type="button">Delete</button>
                  </div>
                </div>
              </li>
            `).join("")}
          </ul>
        </div>
      </section>

      <div class="form-actions">
        <button class="button button--ghost" data-action="exit-editor">Discard Changes</button>
        <button class="button button--primary" data-action="save-blueprint">Save Changes</button>
      </div>
    </div>
  `;

  container.querySelector('[data-action="exit-editor"]').addEventListener("click", () => {
    actions.exitBlueprintEditorToDetail(plan.id);
  });

  container.querySelector('[data-action="save-blueprint"]').addEventListener("click", () => {
    actions.saveBlueprint();
  });

  container.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("change", () => {
      actions.updateBlueprint({ [input.dataset.field]: input.value });
    });
  });

  container.querySelector('[data-action="add-stage"]').addEventListener("click", () => {
    const newId = createLocalId("stage");
    const newStage = {
      id: newId,
      name: "New Stage",
      predecessorStageId: null,
      transitionRule: "prompt_user",
      schedule: [{ type: "rest", routineId: null }],
      milestone: createDefaultMilestone(),
    };
    actions.updateBlueprint({ stages: [...stages, newStage] });
    actions.setEditingStageId(newId);
  });

  container.querySelectorAll('[data-action="edit-stage"]').forEach((button) => {
    button.addEventListener("click", () => actions.setEditingStageId(button.dataset.stageId));
  });

  container.querySelectorAll('[data-action="remove-stage"]').forEach((button) => {
    button.addEventListener("click", () => {
      confirmAction(document.body, {
        title: "Remove Stage?",
        message: "Are you sure you want to remove this stage? This will delete its schedule and milestone data.",
        confirmText: "Remove Stage",
        onConfirm: () => {
          const filtered = stages.filter((stage) => stage.id !== button.dataset.stageId);
          actions.updateBlueprint({ stages: filtered });
        },
      });
    });
  });
}

function renderStageEditor(container, stageDraft, routines, allExercises, allStages, actions) {
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
          <h1>Stage Configuration</h1>
          <p>Refining: ${escapeHtml(stage.name || "New Stage")}</p>
        </div>
      </div>

      <section class="panel panel--section stage-builder" style="background: rgba(0,0,0,0.15); border: 1px solid rgba(143, 168, 210, 0.15);">
        <div class="panel__header">
          <div>
            <span class="eyebrow">Stage setup</span>
            <h3 class="panel__title" style="margin-top: 8px;">Schedule and milestone gate</h3>
            <p class="panel__copy">Define the stage flow, unlock rule, and what happens after a pass or failed test.</p>
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

        <div class="field field--full" style="margin-top: 8px;">
          <label style="margin-bottom: 12px; display: block; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);">Schedule</label>
          <div class="schedule-builder">
            ${schedule.map((entry, dayIndex) => `
              <div class="schedule-row">
                <div class="schedule-row__index">Day ${dayIndex + 1}</div>
                <select style="flex: 1 1 220px;" data-action="update-day" data-day-index="${dayIndex}">
                  <option value="">-- Rest Step --</option>
                  ${routines.map((routine) => `<option value="${routine.id}" ${entry.type === "routine" && routine.id === entry.routineId ? "selected" : ""}>${escapeHtml(routine.name)}</option>`).join("")}
                </select>
                <button class="mini-button" data-action="remove-day" data-day-index="${dayIndex}" style="padding: 8px;" type="button">Remove</button>
              </div>
            `).join("")}
            <button class="button button--ghost" data-action="add-day" style="margin-top: 8px; width: fit-content; padding: 8px 16px; font-size: 0.85rem;" type="button">Add Step</button>
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
                <option value="exercise" ${milestone.test.type === "exercise" ? "selected" : ""}>Exercise Test</option>
              </select>
            </div>

            ${milestone.test.type === "exercise" ? `
              <div class="field">
                <label>Test Source</label>
                <select data-milestone-test-field="source">
                  <option value="stage_entry" ${milestone.test.source === "stage_entry" ? "selected" : ""}>Use Stage Routine Exercise</option>
                  <option value="custom" ${milestone.test.source !== "stage_entry" ? "selected" : ""}>Standalone Exercise Test</option>
                </select>
              </div>

              ${milestone.test.source === "stage_entry" ? `
                <div class="field field--full">
                  <label>Routine Exercise Instance</label>
                  <select data-milestone-test-field="stageEntry">
                    <option value="">-- Select stage exercise --</option>
                    ${stageEntryOptions.map((option) => `<option value="${option.id}" ${matchingStageEntry?.id === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                  </select>
                </div>
              ` : `
                <div class="field field--full">
                  <label>Test Exercise</label>
                  <select data-milestone-test-field="exerciseId">
                    <option value="">-- Select exercise --</option>
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
          </div>
        </div>
          </div>
        </div>
      </section>

      <div class="form-actions">
        <button class="button button--ghost" data-action="cancel-stage-editor">Discard Changes</button>
        <button class="button button--primary" data-action="commit-stage-editor">Save Changes</button>
      </div>
    </div>
  `;

  container.querySelector('[data-action="cancel-stage-editor"]').addEventListener("click", () => actions.setEditingStageId(null));
  container.querySelector('[data-action="commit-stage-editor"]').addEventListener("click", () => actions.commitStageDraft());

  container.querySelectorAll("[data-stage-field]").forEach((input) => {
    input.addEventListener("change", () => {
      actions.updateStageDraft({ [input.dataset.stageField]: input.value });
    });
  });

  container.querySelector('[data-action="add-day"]').addEventListener("click", () => {
    const nextSchedule = stage.schedule || [];
    actions.updateStageDraft({ schedule: [...nextSchedule, { type: "rest", routineId: null }] });
  });

  container.querySelectorAll('[data-action="remove-day"]').forEach((button) => {
    button.addEventListener("click", () => {
      const dayIndex = parseInt(button.dataset.dayIndex, 10);
      const nextSchedule = (stage.schedule || []).filter((_, index) => index !== dayIndex);
      actions.updateStageDraft({ schedule: nextSchedule });
    });
  });

  container.querySelectorAll('[data-action="update-day"]').forEach((select) => {
    select.addEventListener("change", () => {
      const dayIndex = parseInt(select.dataset.dayIndex, 10);
      const nextSchedule = [...(stage.schedule || [])];
      nextSchedule[dayIndex] = select.value
        ? { type: "routine", routineId: select.value }
        : { type: "rest", routineId: null };
      actions.updateStageDraft({ schedule: nextSchedule });
    });
  });

  container.querySelectorAll("[data-milestone-field]").forEach((input) => {
    input.addEventListener("change", () => {
      actions.updateStageDraft({
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

      actions.updateStageDraft({
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

      actions.updateStageDraft({
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

      actions.updateStageDraft({
        milestone: createDefaultMilestone({
          ...milestone,
          onFailure: nextFailure,
        }),
      });
    });
  });
}
