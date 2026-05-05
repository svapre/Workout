import { evaluateStageProgress } from './progressionEngine.js';

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

function renderRoadmap(plan, state) {
  const goalsHtml = Array.isArray(plan.goals) && plan.goals.length > 0 
    ? plan.goals.map(g => `
        <div class="milestone-chip">
          <span class="milestone-chip__target">${escapeHtml(g.target)} ${escapeHtml(g.title)}</span>
          ${g.timeframe ? `<span class="milestone-chip__timeframe">${escapeHtml(g.timeframe)}</span>` : ''}
        </div>
      `).join('')
    : '<span class="muted" style="font-size: 0.9rem;">No milestones defined. Edit plan to add some!</span>';

  let hasFoundActive = false;
  const stagesHtml = Array.isArray(plan.stages) && plan.stages.length > 0
    ? plan.stages.map((s, index) => {
        const isActive = s.id === plan.currentStageId;
        const isPast = !isActive && !hasFoundActive && plan.currentStageId !== null;
        if (isActive) hasFoundActive = true;
        
        let modifierClass = '';
        if (isActive) modifierClass = 'timeline-node--active';
        else if (isPast) modifierClass = 'timeline-node--past';

        const linkedRoutine = s.routineId ? state.routines.find(r => r.id === s.routineId) : null;
        const routineHtml = linkedRoutine 
          ? `<div style="margin-top: 8px;">
               <button class="mini-button" data-action="navigate-routine" data-routine-id="${linkedRoutine.id}" type="button">
                 Run Routine: ${escapeHtml(linkedRoutine.name)}
               </button>
             </div>`
          : '';

        const progressResult = evaluateStageProgress(s, state.workouts, state.routines);
        const { isUnlocked, displayStr } = progressResult;

        const badgeHtml = displayStr ? `<span class="badge" style="margin-right: 8px; font-size: 0.75rem; background: rgba(0,0,0,0.2);">${escapeHtml(displayStr)}</span>` : '';

        const activeBtnHtml = !isActive 
          ? `<button class="mini-button" data-action="set-active-stage" data-stage-id="${s.id}" type="button" style="margin-left: 12px; font-size: 0.75rem;" ${!isUnlocked ? 'disabled' : ''}>${!isUnlocked ? '🔒 Locked' : 'Set Active'}</button>`
          : `<span class="badge" style="margin-left: 12px; color: var(--brand); font-weight: bold; font-size: 0.75rem; letter-spacing: 0.05em;">CURRENT</span>`;

        return `
          <div class="timeline-node ${modifierClass}">
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <h4 class="timeline-node__title" style="margin: 0;">${escapeHtml(s.name || "Unnamed Stage")}</h4>
              ${activeBtnHtml}
            </div>
            ${s.condition ? `<p class="timeline-node__condition" style="margin-bottom: 8px;">${escapeHtml(s.condition)}</p>` : ''}
            <div>${badgeHtml}</div>
            ${routineHtml}
          </div>
        `;
      }).join('')
    : '<p class="muted" style="font-size: 0.9rem;">No progression stages defined. Map out your journey in edit mode.</p>';

  return `
    <section class="panel">
      <div class="panel__header" style="border-bottom: 1px solid rgba(143,168,210,0.1); padding-bottom: 20px; margin-bottom: 24px;">
        <div>
          <h2 class="panel__title" style="font-size: 1.8rem; margin-bottom: 8px;">${escapeHtml(plan.name || "Untitled Plan")}</h2>
          <p class="panel__copy" style="max-width: 600px;">${escapeHtml(plan.description || "No description provided.")}</p>
        </div>
        <div class="toolbar" style="display: flex; gap: 8px;">
          <button class="button button--danger" data-action="delete-plan" type="button">Delete</button>
          <button class="button" data-action="toggle-edit-mode" type="button">Edit Plan</button>
        </div>
      </div>
      <div class="panel__body stack">
        
        <div style="margin-bottom: 32px;">
          <h3 style="margin-bottom: 16px; font-size: 0.85rem; color: var(--brand); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800;">Target Milestones</h3>
          <div class="milestone-chips">
            ${goalsHtml}
          </div>
        </div>

        <div>
          <h3 style="margin-bottom: 24px; font-size: 0.85rem; color: var(--brand); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800;">Progression Path</h3>
          <div class="roadmap-timeline">
            ${stagesHtml}
          </div>
        </div>
        
      </div>
    </section>
  `;
}

function renderGoalCard(goal) {
  return `
    <div class="exercise-card" style="margin-bottom: 12px; padding: 12px;">
      <div class="exercise-card__top" style="margin-bottom: 8px;">
        <h4 class="exercise-card__title" style="font-size: 0.9rem;">Milestone</h4>
        <button class="mini-button" data-action="delete-goal" data-goal-id="${goal.id}" type="button">Delete</button>
      </div>
      <div class="field-grid" style="grid-template-columns: 2fr 1fr 1fr;">
        <div class="field">
          <label>Title (e.g. Pushups)</label>
          <input data-goal-field="title" data-goal-id="${goal.id}" type="text" value="${escapeHtml(goal.title)}">
        </div>
        <div class="field">
          <label>Target (e.g. 30)</label>
          <input data-goal-field="target" data-goal-id="${goal.id}" type="text" value="${escapeHtml(goal.target)}">
        </div>
        <div class="field">
          <label>Timeframe (e.g. Week 2)</label>
          <input data-goal-field="timeframe" data-goal-id="${goal.id}" type="text" value="${escapeHtml(goal.timeframe)}">
        </div>
      </div>
    </div>
  `;
}

function renderStageCard(stage, routines, goals = []) {
  const routineOptions = routines.map(r => `
    <option value="${r.id}" ${stage.routineId === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>
  `).join('');

  const goalOptions = goals.map(g => `
    <option value="${g.id}" ${stage.linkedGoalId === g.id ? 'selected' : ''}>${escapeHtml(g.title)}</option>
  `).join('');

  const rule = stage.rule || { type: 'MANUAL' };

  let dynamicRuleHtml = '';
  if (rule.type === 'ROUTINE_COUNT') {
    const targetRoutineOptions = routines.map(r => `
      <option value="${r.id}" ${rule.routineId === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>
    `).join('');
    dynamicRuleHtml = `
      <div class="field">
        <label>Target Routine</label>
        <select data-rule-field="routineId" data-stage-id="${stage.id}" style="background: var(--panel-2); color: var(--text); border: 1px solid rgba(143, 168, 210, 0.2); padding: 8px; border-radius: var(--radius-sm);">
          <option value="">-- Select Routine --</option>
          ${targetRoutineOptions}
        </select>
      </div>
      <div class="field">
        <label>Times Completed</label>
        <input data-rule-field="targetValue" data-stage-id="${stage.id}" type="number" min="1" value="${escapeHtml(rule.targetValue || 1)}">
      </div>
    `;
  } else if (rule.type === 'EXERCISE_METRIC') {
    dynamicRuleHtml = `
      <div class="field">
        <label>Exercise Name</label>
        <input data-rule-field="exerciseName" data-stage-id="${stage.id}" type="text" value="${escapeHtml(rule.exerciseName || '')}" placeholder="e.g. Pull-up">
      </div>
      <div class="field">
        <label>Metric</label>
        <select data-rule-field="metric" data-stage-id="${stage.id}" style="background: var(--panel-2); color: var(--text); border: 1px solid rgba(143, 168, 210, 0.2); padding: 8px; border-radius: var(--radius-sm);">
          <option value="REPS" ${rule.metric === 'REPS' ? 'selected' : ''}>Reps</option>
          <option value="WEIGHT" ${rule.metric === 'WEIGHT' ? 'selected' : ''}>Weight (kg)</option>
        </select>
      </div>
      <div class="field">
        <label>Target Value</label>
        <input data-rule-field="targetValue" data-stage-id="${stage.id}" type="number" min="1" value="${escapeHtml(rule.targetValue || 1)}">
      </div>
    `;
  }

  return `
    <div class="exercise-card" style="margin-bottom: 12px; padding: 12px;">
      <div class="exercise-card__top" style="margin-bottom: 8px;">
        <h4 class="exercise-card__title" style="font-size: 0.9rem;">Stage</h4>
        <button class="mini-button" data-action="delete-stage" data-stage-id="${stage.id}" type="button">Delete</button>
      </div>
      <div class="field-grid">
        <div class="field field--full">
          <label>Stage Name (e.g. Foundation)</label>
          <input data-stage-field="name" data-stage-id="${stage.id}" type="text" value="${escapeHtml(stage.name)}">
        </div>
        <div class="field field--full">
          <label>Linked Routine (Primary routine for this stage)</label>
          <select data-stage-field="routineId" data-stage-id="${stage.id}" style="background: var(--panel-2); color: var(--text); border: 1px solid rgba(143, 168, 210, 0.2); padding: 8px; border-radius: var(--radius-sm);">
            <option value="">-- No routine linked --</option>
            ${routineOptions}
          </select>
        </div>
        <div class="field field--full">
          <label>Linked Milestone (Goal)</label>
          <select data-stage-field="linkedGoalId" data-stage-id="${stage.id}" style="background: var(--panel-2); color: var(--text); border: 1px solid rgba(143, 168, 210, 0.2); padding: 8px; border-radius: var(--radius-sm);">
            <option value="">-- No milestone linked --</option>
            ${goalOptions}
          </select>
        </div>
        <div class="field field--full">
          <label>Progression Condition Text</label>
          <input data-stage-field="condition" data-stage-id="${stage.id}" type="text" value="${escapeHtml(stage.condition)}" placeholder="Describe what must be achieved to advance">
        </div>
        
        <div class="field field--full" style="margin-top: 12px; border-top: 1px dashed rgba(143,168,210,0.2); padding-top: 12px;">
          <h5 style="color: var(--brand); margin-bottom: 8px;">Gating Rule (Automated Unlock)</h5>
          <div class="field-grid">
            <div class="field field--full">
              <label>Rule Type</label>
              <select data-rule-field="type" data-stage-id="${stage.id}" style="background: var(--panel-2); color: var(--text); border: 1px solid rgba(143, 168, 210, 0.2); padding: 8px; border-radius: var(--radius-sm);">
                <option value="MANUAL" ${rule.type === 'MANUAL' ? 'selected' : ''}>Manual (Always Unlocked)</option>
                <option value="ROUTINE_COUNT" ${rule.type === 'ROUTINE_COUNT' ? 'selected' : ''}>Complete Routine X Times</option>
                <option value="EXERCISE_METRIC" ${rule.type === 'EXERCISE_METRIC' ? 'selected' : ''}>Achieve Exercise Metric</option>
              </select>
            </div>
            ${dynamicRuleHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEditor(plan, routines) {
  const goalsHtml = Array.isArray(plan.goals) && plan.goals.length > 0 
    ? plan.goals.map(renderGoalCard).join("") 
    : "<p class='panel__copy'>No goals set. Break your main goal down into milestones!</p>";

  const stagesHtml = Array.isArray(plan.stages) && plan.stages.length > 0 
    ? plan.stages.map(s => renderStageCard(s, routines, plan.goals)).join("") 
    : "<p class='panel__copy'>No stages set.</p>";

  return `
    <section class="panel">
      <div class="panel__header">
        <div>
          <h2 class="panel__title">Editing: ${escapeHtml(plan.name || "Plan")}</h2>
        </div>
        <div class="toolbar" style="display: flex; gap: 8px;">
          <button class="button button--danger" data-action="delete-plan" type="button">Delete</button>
          <button class="button button--primary" data-action="toggle-edit-mode" type="button">Done</button>
        </div>
      </div>
      <div class="panel__body stack">
        <div class="field-grid">
          <div class="field">
            <label>Plan Name</label>
            <input data-plan-field="name" type="text" value="${escapeHtml(plan.name)}">
          </div>
          <div class="field field--full">
            <label>Description & Philosophy</label>
            <textarea data-plan-field="description">${escapeHtml(plan.description)}</textarea>
          </div>
        </div>

        <details class="editor-section" open>
          <summary style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 12px 0; border-top: 1px solid rgba(143,168,210,0.1); outline: none;">
            <h3 style="margin: 0; pointer-events: none;">Milestones & Goals</h3>
            <span style="font-size: 0.8rem; color: var(--soft);">Click to toggle</span>
          </summary>
          <div style="margin-bottom: 12px; display: flex; justify-content: flex-end;">
            <button class="button" data-action="add-goal" type="button">Add Milestone</button>
          </div>
          <div style="padding-bottom: 24px;">
            ${goalsHtml}
          </div>
        </details>

        <details class="editor-section">
          <summary style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 12px 0; border-top: 1px solid rgba(143,168,210,0.1); outline: none;">
            <h3 style="margin: 0; pointer-events: none;">Progression Stages</h3>
            <span style="font-size: 0.8rem; color: var(--soft);">Click to toggle</span>
          </summary>
          <div style="margin-bottom: 12px; display: flex; justify-content: flex-end;">
            <button class="button" data-action="add-stage" type="button">Add Stage</button>
          </div>
          <div style="padding-bottom: 24px;">
            ${stagesHtml}
          </div>
        </details>
      </div>
    </section>
  `;
}

export function renderPlansView(container, { state, actions }) {
  const { plans, selectedPlanId, planEditMode } = state;
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  if (!selectedPlan) {
    container.innerHTML = `
      <section class="page page-single">
        <div class="panel">
          <div class="panel__header">
            <div>
              <h2 class="panel__title">Plans</h2>
              <p class="panel__copy">Define dynamic goals and stages.</p>
            </div>
            <div class="toolbar">
              <button class="button button--primary" data-action="create-plan" type="button">New Plan</button>
            </div>
          </div>
          <div class="panel__body">
            ${plans.length === 0 ? '<p class="muted">No plans found. Create one!</p>' : `
              <div class="card-grid">
                ${plans.map(plan => `
                  <div class="exercise-card" style="display: flex; flex-direction: column;">
                    <div class="exercise-card__top" style="margin-bottom: 8px;">
                      <h3 class="exercise-card__title" style="font-size: 1.1rem; color: var(--brand);">${escapeHtml(plan.name || "Untitled Plan")}</h3>
                    </div>
                    <p class="muted" style="font-size: 0.9rem; margin-bottom: 24px; flex-grow: 1;">${escapeHtml(plan.description ? plan.description.slice(0, 120) + '...' : "No description")}</p>
                    <div style="display: flex; gap: 8px; margin-top: auto; flex-direction: column;">
                      <div style="display: flex; gap: 8px;">
                        <button class="button button--ghost" data-action="select-plan" data-plan-id="${plan.id}" type="button" style="flex: 1; padding: 8px;">View / Edit</button>
                        <button class="button button--danger" data-action="delete-plan" data-plan-id="${plan.id}" type="button" style="padding: 8px;">Delete</button>
                      </div>
                      <button class="button button--primary" data-action="activate-plan" data-plan-id="${plan.id}" type="button" style="padding: 8px;">🚀 Activate Plan</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </section>
    `;

    // Bind List Listeners
    container.querySelectorAll('[data-action="select-plan"]').forEach(btn => {
      btn.addEventListener('click', () => actions.selectPlan(btn.dataset.planId));
    });
    container.querySelector('[data-action="create-plan"]')?.addEventListener('click', () => actions.createPlan());
    container.querySelectorAll('[data-action="delete-plan"]').forEach(btn => {
      btn.addEventListener('click', () => actions.deletePlan(btn.dataset.planId));
    });
    container.querySelectorAll('[data-action="activate-plan"]').forEach(btn => {
      btn.addEventListener('click', () => actions.activatePlan(btn.dataset.planId));
    });
    return;
  }

  const mainContent = planEditMode ? renderEditor(selectedPlan, state.routines) : renderRoadmap(selectedPlan, state);

  container.innerHTML = `
    <section class="page page-single">
      <div style="margin-bottom: 16px;">
        <button class="button button--ghost" data-action="back-to-list" type="button">⬅ Back to Plans</button>
      </div>
      ${mainContent}
    </section>
  `;

  // Bind Detail Listeners
  container.querySelector('[data-action="back-to-list"]')?.addEventListener('click', () => actions.selectPlan(null));

  // Toggle Edit Mode
  container.querySelectorAll('[data-action="toggle-edit-mode"]').forEach(btn => {
    btn.addEventListener('click', () => actions.togglePlanEditMode());
  });

  // Roadmap actions
  container.querySelectorAll('[data-action="navigate-routine"]').forEach(btn => {
    btn.addEventListener('click', () => {
      actions.selectRoutine(btn.dataset.routineId);
      actions.navigate('routines');
    });
  });

  container.querySelectorAll('[data-action="set-active-stage"]').forEach(btn => {
    btn.addEventListener('click', () => {
      actions.updatePlan(selectedPlan.id, { currentStageId: btn.dataset.stageId });
    });
  });

  // Plan actions (Global to both views)
  container.querySelectorAll('[data-action="delete-plan"]').forEach(btn => {
    btn.addEventListener('click', () => actions.deletePlan(selectedPlan.id));
  });

  if (!planEditMode) return; // Skip binding editor listeners if not in edit mode
  
  container.querySelectorAll('[data-plan-field]').forEach(field => {
    field.addEventListener('change', () => {
      actions.updatePlan(selectedPlan.id, { [field.dataset.planField]: field.value });
    });
  });

  // Goal actions
  container.querySelector('[data-action="add-goal"]')?.addEventListener('click', () => {
    const goals = Array.isArray(selectedPlan.goals) ? [...selectedPlan.goals] : [];
    goals.push({ id: createLocalId("goal"), title: "", target: "", timeframe: "" });
    actions.updatePlan(selectedPlan.id, { goals });
  });

  container.querySelectorAll('[data-action="delete-goal"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const goals = selectedPlan.goals.filter(g => g.id !== btn.dataset.goalId);
      actions.updatePlan(selectedPlan.id, { goals });
    });
  });

  container.querySelectorAll('[data-goal-field]').forEach(field => {
    field.addEventListener('change', () => {
      const goalId = field.dataset.goalId;
      const key = field.dataset.goalField;
      const goals = selectedPlan.goals.map(g => g.id === goalId ? { ...g, [key]: field.value } : g);
      actions.updatePlan(selectedPlan.id, { goals });
    });
  });

  // Stage actions
  container.querySelector('[data-action="add-stage"]')?.addEventListener('click', () => {
    const stages = Array.isArray(selectedPlan.stages) ? [...selectedPlan.stages] : [];
    stages.push({ id: createLocalId("stage"), name: "", condition: "" });
    actions.updatePlan(selectedPlan.id, { stages });
  });

  container.querySelectorAll('[data-action="delete-stage"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const stages = selectedPlan.stages.filter(s => s.id !== btn.dataset.stageId);
      actions.updatePlan(selectedPlan.id, { stages });
    });
  });

  container.querySelectorAll('[data-stage-field]').forEach(field => {
    field.addEventListener('change', () => {
      const stageId = field.dataset.stageId;
      const key = field.dataset.stageField;
      const stages = selectedPlan.stages.map(s => s.id === stageId ? { ...s, [key]: field.value } : s);
      actions.updatePlan(selectedPlan.id, { stages });
    });
  });

  container.querySelectorAll('[data-rule-field]').forEach(field => {
    field.addEventListener('change', () => {
      const stageId = field.dataset.stageId;
      const key = field.dataset.ruleField;
      const stages = selectedPlan.stages.map(s => {
        if (s.id !== stageId) return s;
        const rule = s.rule || { type: 'MANUAL' };
        return { ...s, rule: { ...rule, [key]: field.value } };
      });
      actions.updatePlan(selectedPlan.id, { stages });
    });
  });
}
