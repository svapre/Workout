/**
 * Plan Blueprints View
 * 
 * Manages the CRUD lifecycle of static training templates (Blueprints).
 */

import { confirmAction } from "../../ui/modal.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createLocalId(prefix) {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

export function renderPlansView(container, { state, actions }) {
  const { plans, routines, exercises, selectedPlanId, planEditMode, draftBlueprint, stageDraft } = state;
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  // Clear container to prevent memory leaks and ensure clean mount
  container.innerHTML = "";

  const section = document.createElement("section");
  section.className = "page page-single";

  if (!selectedPlan) {
    renderList(section, plans, actions);
  } else if (planEditMode && draftBlueprint) {
    if (stageDraft) {
      renderStageEditor(section, stageDraft, routines, exercises, actions, state);
    } else {
      renderBlueprintEditor(section, draftBlueprint, routines, exercises, actions, state);
    }
  } else {
    renderDetail(section, selectedPlan, routines, actions);
  }

  container.appendChild(section);
}

function renderList(container, plans, actions) {
  container.innerHTML = `
    <div class="library-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px;">
      <div>
        <h1 style="font-size: 2.5rem; color: var(--text); margin: 0 0 8px;">Plan Blueprints</h1>
        <p style="color: var(--soft);">Static templates for your training journeys.</p>
      </div>
      <div style="display: flex; gap: 12px;">
        <input type="file" id="plan-import-input" accept=".json" style="display: none;">
        <button class="button button--ghost" onclick="document.getElementById('plan-import-input').click()">Import Blueprint</button>
        <button class="button button--primary" data-action="create-blueprint">Create New Blueprint</button>
      </div>
    </div>

    <div class="card-grid">
      ${plans.length === 0 ? '<p class="muted">No blueprints found. Start by creating one!</p>' : plans.map(plan => {
        const stageCount = plan.stages?.length || 0;
        return `
          <div class="panel blueprint-card" style="padding: 24px; cursor: pointer; display: flex; flex-direction: column; transition: transform 0.2s, border-color 0.2s;" data-action="select-plan" data-plan-id="${plan.id}">
            <h3 style="margin: 0 0 12px; color: var(--brand); font-size: 1.3rem;">${escapeHtml(plan.name)}</h3>
            <p style="color: var(--soft); font-size: 0.95rem; line-height: 1.5; flex-grow: 1; margin-bottom: 20px;">
              ${escapeHtml(plan.description ? (plan.description.length > 100 ? plan.description.slice(0, 100) + '...' : plan.description) : "No description provided.")}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(143, 168, 210, 0.1); padding-top: 16px;">
              <span style="font-size: 0.85rem; color: var(--soft); font-weight: 600;">${stageCount} Stage${stageCount === 1 ? '' : 's'}</span>
              <span class="button button--ghost" style="padding: 6px 12px; font-size: 0.8rem;">View Details</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.querySelector('[data-action="create-blueprint"]')?.addEventListener('click', () => {
    actions.createBlueprint();
  });

  // Bind Import Plan
  const importInput = container.querySelector('#plan-import-input');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          actions.importFullPlan(data);
          alert("Blueprint imported successfully!");
          actions.navigate('plans'); // Refresh
        } catch (err) {
          alert("Error: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  container.querySelectorAll('[data-action="select-plan"]').forEach(card => {
    card.addEventListener('click', () => {
      actions.selectPlan(card.dataset.planId);
    });
  });
}

function renderDetail(container, plan, routines, actions) {
  const stages = plan.stages || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <button class="button button--ghost" data-action="back-to-list">← Back to Library</button>
      <div style="display: flex; gap: 12px;">
        <button class="button button--danger button--ghost" data-action="delete-blueprint">Delete Blueprint</button>
        <button class="button button--ghost" data-action="export-blueprint">Export Blueprint</button>
        <button class="button" data-action="edit-blueprint">Edit Blueprint</button>
      </div>
    </div>

    <div class="panel" style="padding: 40px; margin-bottom: 32px;">
      <div style="margin-bottom: 40px; border-bottom: 1px solid rgba(143, 168, 210, 0.1); padding-bottom: 32px;">
        <h1 style="font-size: 2.8rem; color: var(--text); margin: 0 0 16px; line-height: 1.1;">${escapeHtml(plan.name)}</h1>
        <p style="color: var(--soft); font-size: 1.2rem; line-height: 1.6; max-width: 800px;">${escapeHtml(plan.description)}</p>
      </div>

      <div style="margin-bottom: 48px;">
        <h2 style="font-size: 1.1rem; color: var(--brand); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 24px; font-weight: 800;">Progression Architecture</h2>
        
        <div class="stages-timeline" style="display: flex; flex-direction: column; gap: 32px;">
          ${stages.length === 0 ? '<p class="muted">No stages defined for this template.</p>' : stages.map((s, idx) => {
            const schedule = s.schedule || [];
            const milestone = s.milestone || { type: 'manual', description: 'Manual advancement' };
            
            return `
              <div class="stage-entry" style="display: flex; gap: 24px;">
                <div style="flex: 0 0 40px; height: 40px; background: rgba(79, 209, 197, 0.1); color: var(--brand); border: 1px solid rgba(79, 209, 197, 0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">
                  ${idx + 1}
                </div>
                <div style="flex-grow: 1;">
                  <h3 style="margin: 0 0 8px; font-size: 1.2rem; color: var(--text);">${escapeHtml(s.name || "Untitled Stage")}</h3>
                  <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                    <span class="badge" style="background: rgba(255,255,255,0.05); color: var(--soft);">
                      ${schedule.length}-Day Cycle
                    </span>
                    <span class="badge" style="background: rgba(246, 173, 85, 0.1); color: var(--brand-2); border: 1px solid rgba(246, 173, 85, 0.2);">
                      Milestone: ${escapeHtml(milestone.description || milestone.type)}
                    </span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div style="padding: 40px; background: linear-gradient(135deg, rgba(79, 209, 197, 0.1), rgba(79, 209, 197, 0.02)); border: 1px solid rgba(79, 209, 197, 0.2); border-radius: var(--radius-lg); text-align: center;">
        <h3 style="font-size: 1.6rem; margin-bottom: 12px;">Activate This Blueprint</h3>
        <p style="color: var(--soft); margin-bottom: 32px; max-width: 500px; margin-left: auto; margin-right: auto;">Ready to start tracking? This will create a live instance on your dashboard without affecting this template.</p>
        <button class="button button--primary" data-action="start-plan" style="padding: 14px 48px; font-size: 1.2rem; box-shadow: 0 8px 20px rgba(79, 209, 197, 0.2);">
          🚀 Start This Plan
        </button>
      </div>
    </div>
  `;

  container.querySelector('[data-action="back-to-list"]').addEventListener('click', () => {
    actions.selectPlan(null);
  });

  container.querySelector('[data-action="edit-blueprint"]').addEventListener('click', () => {
    actions.togglePlanEditMode(true);
  });

  container.querySelector('[data-action="export-blueprint"]').addEventListener('click', () => {
    actions.exportFullPlan(plan.id);
  });

  container.querySelector('[data-action="delete-blueprint"]').addEventListener('click', () => {
    confirmAction(document.body, {
      title: "Delete Blueprint?",
      message: `Are you sure you want to delete "${plan.name}"? This will permanently remove the template and all its stages.`,
      confirmText: "Delete Template",
      onConfirm: () => {
        actions.deleteBlueprint(plan.id);
      }
    });
  });

  container.querySelector('[data-action="start-plan"]').addEventListener('click', () => {
    import("../../ui/modal.js").then(({ promptAction }) => {
      promptAction(document.body, {
        title: "Name Your Training Journey",
        message: "Give this instance a name to distinguish it on your dashboard.",
        defaultValue: plan.name,
        confirmText: "Activate Plan",
        onConfirm: (customName) => {
          const success = actions.instantiatePlan(plan.id, customName);
          if (success) {
            actions.navigate('active-plans');
          }
        }
      });
    });
  });
}

function renderBlueprintEditor(container, plan, routines, allExercises, actions, state) {
  const stages = plan.stages || [];

  container.innerHTML = `
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0; color: var(--brand); font-size: 2rem;">Blueprint Editor</h2>
      <p style="color: var(--soft);">Architecting: ${escapeHtml(plan.name || "New Plan")}</p>
    </div>

    <div class="panel" style="padding: 32px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 24px; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);">General Information</h3>
      <div class="field-grid">
        <div class="field">
          <label>Plan Title</label>
          <input type="text" data-field="name" value="${escapeHtml(plan.name)}" placeholder="e.g. 100 Pushup Challenge">
        </div>
        <div class="field field--full">
          <label>Description & Philosophy</label>
          <textarea data-field="description" style="min-height: 100px;">${escapeHtml(plan.description)}</textarea>
        </div>
      </div>
    </div>

    <div class="panel" style="padding: 32px; margin-bottom: 100px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h3 style="margin: 0; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);">Progression Stages</h3>
        <button class="button button--ghost" data-action="add-stage">+ Add Stage</button>
      </div>

      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px;">
        ${stages.length === 0 ? '<p class="muted" style="text-align: center; padding: 20px;">No stages yet.</p>' : stages.map((s, idx) => `
          <li style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(143,168,210,0.1); border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; gap: 16px;">
              <span style="font-weight: 800; color: var(--brand); opacity: 0.5;">${idx + 1}</span>
              <span style="font-weight: 600;">${escapeHtml(s.name || "Untitled Stage")}</span>
              <span class="badge" style="background: rgba(143,168,210,0.05); font-size: 0.75rem;">${s.schedule?.length || 0}-Day Cycle</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="button button--ghost" style="padding: 6px 12px; font-size: 0.8rem;" data-action="edit-stage" data-stage-id="${s.id}">Edit</button>
              <button class="button button--ghost button--danger" style="padding: 6px 12px; font-size: 0.8rem;" data-action="remove-stage" data-stage-id="${s.id}">Delete</button>
            </div>
          </li>
        `).join('')}
      </ul>
    </div>

    <!-- Standardized Action Bar -->
    <div class="form-actions" style="position: fixed; bottom: 0; left: 0; right: 0; background: rgba(9, 17, 31, 0.95); backdrop-filter: blur(10px); border-top: 1px solid rgba(143, 168, 210, 0.2); padding: 20px; z-index: 100; display: flex; justify-content: center; gap: 20px;">
      <button class="button button--ghost" data-action="exit-editor" style="min-width: 180px;">Discard Changes</button>
      <button class="button button--primary" data-action="save-blueprint" style="min-width: 180px;">Save Changes</button>
    </div>
  `;

  // Bind Main Editor Listeners
  container.querySelector('[data-action="exit-editor"]').addEventListener('click', () => {
    actions.togglePlanEditMode(false);
    actions.selectPlan(plan.id); 
  });
  
  container.querySelector('[data-action="save-blueprint"]').addEventListener('click', () => {
    actions.saveBlueprint();
  });

  container.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('change', () => {
      actions.updateBlueprint({ [input.dataset.field]: input.value });
    });
  });

  container.querySelector('[data-action="add-stage"]').addEventListener('click', () => {
    const newId = createLocalId("stage");
    const newStage = {
      id: newId,
      name: "New Stage",
      predecessorStageId: null,
      transitionRule: "prompt_user",
      schedule: [{ type: "rest", routineId: null }],
      milestone: {
        type: "cycles",
        target: 1,
        description: "",
        requiresContinuous: false,
        exerciseId: null,
        metric: null,
        onFailure: { action: "none", targetStageId: null },
      },
    };
    actions.updateBlueprint({ stages: [...stages, newStage] });
    actions.setEditingStageId(newId);
  });

  container.querySelectorAll('[data-action="edit-stage"]').forEach(btn => {
    btn.addEventListener('click', () => actions.setEditingStageId(btn.dataset.stageId));
  });

  container.querySelectorAll('[data-action="remove-stage"]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmAction(document.body, {
        title: "Remove Stage?",
        message: "Are you sure you want to remove this stage? This will delete its schedule and milestone data.",
        confirmText: "Remove Stage",
        onConfirm: () => {
          const filtered = stages.filter(s => s.id !== btn.dataset.stageId);
          actions.updateBlueprint({ stages: filtered });
        }
      });
    });
  });
}

function renderStageEditor(container, stageDraft, routines, allExercises, actions, state) {
  const s = stageDraft;
  const schedule = s.schedule || [];
  const milestone = s.milestone || { type: 'manual' };
  
  const usedRoutineIds = [...new Set(schedule.map(entry => entry.routineId).filter(id => id))];
  const availableExercises = [];
  const exerciseIdsSet = new Set();
  usedRoutineIds.forEach(rid => {
    const r = routines.find(rout => rout.id === rid);
    const rentries = r?.entries || r?.exercises || [];
    rentries.forEach(re => {
      if (!exerciseIdsSet.has(re.exerciseId)) {
        exerciseIdsSet.add(re.exerciseId);
        const ex = allExercises.find(e => e.id === re.exerciseId);
        if (ex) availableExercises.push(ex);
      }
    });
  });

  const selectedExercise = allExercises.find(e => e.id === milestone.exerciseId);
  let unitLabel = "Target Value";
  let hasTargetExercise = !!selectedExercise;

  if (selectedExercise) {
    if (selectedExercise.trackingType === 'duration') unitLabel = "Target Seconds";
    if (selectedExercise.trackingType === 'reps') unitLabel = "Target Reps";
    if (selectedExercise.trackingType === 'weight') unitLabel = "Target kg";
  }

  container.innerHTML = `
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0; color: var(--brand); font-size: 2rem;">Stage Configuration</h2>
      <p style="color: var(--soft);">Refining: ${escapeHtml(s.name || "New Stage")}</p>
    </div>

    <div class="panel stage-builder" style="background: rgba(0,0,0,0.15); border: 1px solid rgba(143, 168, 210, 0.15); padding: 32px; margin-bottom: 100px;">
      <div class="field-grid">
        <div class="field field--full">
          <label>Stage Name</label>
          <input type="text" data-stage-field="name" value="${escapeHtml(s.name)}" placeholder="e.g. The Foundation">
        </div>

        <div class="field field--full" style="margin-top: 24px;">
          <label style="margin-bottom: 12px; display: block; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);">Day-Wise Schedule Cycle</label>
          <div class="schedule-builder" style="display: flex; flex-direction: column; gap: 12px;">
            ${schedule.map((entry, dayIdx) => `
              <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: var(--radius-sm);">
                <div style="flex: 0 0 60px; font-size: 0.8rem; color: var(--soft); font-weight: 700;">Day ${dayIdx + 1}</div>
                <select style="flex-grow: 1;" data-action="update-day" data-day-index="${dayIdx}">
                  <option value="">-- Rest Day --</option>
                  ${routines.map(r => `<option value="${r.id}" ${entry.type === 'routine' && r.id === entry.routineId ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}
                </select>
                <button class="mini-button" data-action="remove-day" data-day-index="${dayIdx}" style="padding: 8px;">✕</button>
              </div>
            `).join('')}
            <button class="button button--ghost" data-action="add-day" style="margin-top: 8px; width: fit-content; padding: 8px 16px; font-size: 0.85rem;">+ Add Day to Cycle</button>
          </div>
        </div>

        <div class="field field--full" style="margin-top: 40px; border-top: 1px dashed rgba(143,168,210,0.2); padding-top: 32px;">
          <h5 style="color: var(--brand); margin-bottom: 16px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em;">Milestone Setup</h5>
          <div class="field-grid" style="grid-template-columns: 1fr 1fr 1fr;">
            <div class="field">
              <label>Milestone Type</label>
              <select data-milestone-field="type">
                <option value="cycles" ${milestone.type === 'cycles' || milestone.type === 'manual' || milestone.type === 'consistency' ? 'selected' : ''}>Cycles</option>
                <option value="sessions" ${milestone.type === 'sessions' ? 'selected' : ''}>Sessions</option>
                <option value="exercise_target" ${milestone.type === 'exercise_target' || milestone.type === 'exercise' ? 'selected' : ''}>Exercise Target</option>
              </select>
            </div>

            ${milestone.type === 'cycles' || milestone.type === 'manual' || milestone.type === 'consistency' ? `
              <div class="field">
                <label>Target Cycles / Days</label>
                <input type="number" data-milestone-field="target" value="${milestone.target ?? milestone.targetValue ?? 1}" min="0">
              </div>
              <div class="field field--full">
                <label style="display: flex; align-items: center; gap: 8px;">
                  <input type="checkbox" data-milestone-field="requiresContinuous" ${milestone.requiresContinuous || milestone.type === 'consistency' ? 'checked' : ''}>
                  Require consecutive days (streak)
                </label>
              </div>
            ` : milestone.type === 'exercise_target' || milestone.type === 'exercise' ? `
              <div class="field">
                <label>Target Exercise</label>
                <select data-milestone-field="exerciseId">
                  <option value="">-- Select Exercise --</option>
                  ${availableExercises.map(ex => `<option value="${ex.id}" ${(milestone.exerciseId === ex.id || milestone.targetExerciseId === ex.id) ? 'selected' : ''}>${escapeHtml(ex.name)}</option>`).join('')}
                </select>
              </div>
              <div class="field" style="${hasTargetExercise ? '' : 'display: none;'}">
                <label>${unitLabel}</label>
                <input type="number" data-milestone-field="target" value="${hasTargetExercise ? (milestone.target ?? milestone.targetValue ?? 1) : ""}" min="1">
              </div>
            ` : milestone.type === 'sessions' ? `
              <div class="field">
                <label>Target Sessions</label>
                <input type="number" data-milestone-field="target" value="${milestone.target ?? milestone.targetValue ?? 1}" min="1">
              </div>
            ` : ''}

            <div class="field field--full">
              <label>Display Milestone Description</label>
              <input type="text" data-milestone-field="description" value="${escapeHtml(milestone.description || '')}" placeholder="e.g. Complete 5 consecutive days">
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Standardized Action Bar -->
    <div class="form-actions" style="position: fixed; bottom: 0; left: 0; right: 0; background: rgba(9, 17, 31, 0.95); backdrop-filter: blur(10px); border-top: 1px solid rgba(143, 168, 210, 0.2); padding: 20px; z-index: 100; display: flex; justify-content: center; gap: 20px;">
      <button class="button button--ghost" data-action="cancel-stage-editor" style="min-width: 180px;">Discard Changes</button>
      <button class="button button--primary" data-action="commit-stage-editor" style="min-width: 180px;">Save Changes</button>
    </div>
  `;

  // FORCE INITIAL UI CHECK: Hide Target Value if no exercise is selected on load
  const dropdown = container.querySelector('[data-milestone-field="exerciseId"]');
  const targetValueContainer = container.querySelector('[data-milestone-field="target"]')?.closest('.field');
  if (dropdown && targetValueContainer) {
    if (!dropdown.value || dropdown.value === "" || dropdown.value.includes("Select Exercise")) {
      targetValueContainer.style.display = 'none';
    } else {
      targetValueContainer.style.display = 'block';
    }
  }

  // Bind Stage Editor Listeners
  container.querySelector('[data-action="cancel-stage-editor"]').addEventListener('click', () => actions.setEditingStageId(null));
  container.querySelector('[data-action="commit-stage-editor"]').addEventListener('click', () => actions.commitStageDraft());
  
  container.querySelectorAll('[data-stage-field]').forEach(input => {
    input.addEventListener('change', () => {
      actions.updateStageDraft({ [input.dataset.stageField]: input.value });
    });
  });

  container.querySelector('[data-action="add-day"]').addEventListener('click', () => {
    const sch = s.schedule || [];
    actions.updateStageDraft({ schedule: [...sch, { type: "rest", routineId: null }] });
  });

  container.querySelectorAll('[data-action="remove-day"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dayIdx = parseInt(btn.dataset.dayIndex, 10);
      const sch = (s.schedule || []).filter((_, idx) => idx !== dayIdx);
      actions.updateStageDraft({ schedule: sch });
    });
  });

  container.querySelectorAll('[data-action="update-day"]').forEach(select => {
    select.addEventListener('change', () => {
      const dayIdx = parseInt(select.dataset.dayIndex, 10);
      const sch = [...(s.schedule || [])];
      const val = select.value;
      sch[dayIdx] = val
        ? { type: "routine", routineId: val }
        : { type: "rest", routineId: null };
      actions.updateStageDraft({ schedule: sch });
    });
  });

  container.querySelectorAll('[data-milestone-field]').forEach(input => {
    input.addEventListener('change', () => {
      const field = input.dataset.milestoneField;
      const m = s.milestone || { type: "cycles" };
      const rawVal = input.type === "checkbox" ? input.checked : input.value;

      if (field === "type" && rawVal !== m.type) {
        actions.updateStageDraft({
          milestone: {
            type: rawVal,
            description: m.description,
            target: 1,
            exerciseId: null,
            requiresContinuous: false,
            metric: null,
            onFailure: { action: "none", targetStageId: null },
          },
        });
      } else if (field === "exerciseId") {
        const patch = { ...m, exerciseId: rawVal };
        if (!rawVal) patch.target = null;
        else if (patch.target == null) patch.target = 1;
        actions.updateStageDraft({ milestone: patch });
      } else if (field === "requiresContinuous") {
        actions.updateStageDraft({ milestone: { ...m, requiresContinuous: Boolean(rawVal) } });
      } else if (field === "target") {
        const num = rawVal === "" ? null : Number(rawVal);
        actions.updateStageDraft({ milestone: { ...m, target: num } });
      } else {
        actions.updateStageDraft({ milestone: { ...m, [field]: rawVal } });
      }
    });
  });
}
