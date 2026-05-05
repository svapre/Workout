import { evaluateStageProgress } from '../plans/progressionEngine.js';

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderActivePlansView(container, { state, actions }) {
  const activePlans = state.activePlans || [];

  if (activePlans.length === 0) {
    container.innerHTML = `
      <section class="page page-single">
        <section class="panel" style="max-width: 600px; margin: 60px auto;">
          <div class="panel__header" style="border-bottom: 1px solid rgba(143,168,210,0.1); padding-bottom: 20px;">
            <div>
              <h2 class="panel__title" style="font-size: 1.8rem; color: var(--brand-2);">No Active Roadmap</h2>
            </div>
          </div>
          <div class="panel__body stack" style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 4rem; margin-bottom: 20px;">🗺️</div>
            <h3 style="font-size: 1.4rem; margin-bottom: 12px;">Your journey starts here.</h3>
            <p style="color: var(--soft); margin-bottom: 32px; line-height: 1.6;">
              You haven't activated any plans yet. Navigate to your library of plans, find your target journeys, and click "Activate Plan" to begin tracking your progress.
            </p>
            <button class="button button--primary" data-action="go-to-plans" type="button" style="padding: 12px 32px; font-size: 1.1rem;">Explore Plans</button>
          </div>
        </section>
      </section>
    `;
    
    container.querySelector('[data-action="go-to-plans"]')?.addEventListener('click', () => {
      actions.navigate('plans');
    });
    return;
  }

  let allPlansHtml = '';

  activePlans.forEach((activePlan, planIndex) => {
    const goals = activePlan.goals || [];
    const stages = activePlan.stages || [];
    
    let pathHtml = '';
    
    const unlinkedStages = stages.filter(s => !s.linkedGoalId || !goals.some(g => g.id === s.linkedGoalId));
    
    if (unlinkedStages.length > 0) {
      pathHtml += renderMilestoneGroup(null, unlinkedStages, activePlan, state);
    }

    goals.forEach(goal => {
      const linkedStages = stages.filter(s => s.linkedGoalId === goal.id);
      pathHtml += renderMilestoneGroup(goal, linkedStages, activePlan, state);
    });

    const divider = planIndex > 0 ? '<hr style="border: 0; border-top: 1px solid rgba(143,168,210,0.1); margin: 60px 0;">' : '';

    allPlansHtml += `
      ${divider}
      <div class="active-plan-section" style="margin-bottom: 80px;">
        <div class="dashboard-header" style="text-align: center; margin-bottom: 40px; padding: 40px 20px 0;">
          <div style="display: inline-block; padding: 6px 16px; background: rgba(79, 209, 197, 0.1); border: 1px solid rgba(79, 209, 197, 0.3); border-radius: 999px; color: var(--brand); font-size: 0.85rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px;">
            Active Roadmap
          </div>
          <h1 style="font-size: clamp(2rem, 5vw, 3.5rem); color: var(--text); margin: 0 0 16px; line-height: 1.1;">${escapeHtml(activePlan.name)}</h1>
          <p style="color: var(--soft); max-width: 600px; margin: 0 auto; font-size: 1.1rem; line-height: 1.6;">${escapeHtml(activePlan.description)}</p>
          <div style="margin-top: 16px;">
             <button class="button button--danger button--ghost" data-action="abandon-plan" data-plan-id="${activePlan.id}" type="button">Abandon Plan</button>
          </div>
        </div>
        
        <div class="winding-path-container">
          ${pathHtml || '<p class="muted" style="text-align:center;">No milestones or stages defined in this plan.</p>'}
        </div>
      </div>
    `;
  });

  container.innerHTML = `
    <section class="page page-single">
      ${allPlansHtml}
    </section>
  `;

  container.querySelectorAll('[data-action="navigate-routine"]').forEach(btn => {
    btn.addEventListener('click', () => {
      actions.selectRoutine(btn.dataset.routineId);
      actions.navigate('routines');
    });
  });

  container.querySelectorAll('[data-action="set-active-stage"]').forEach(btn => {
    btn.addEventListener('click', () => {
      actions.updateActivePlan(btn.dataset.planId, { currentStageId: btn.dataset.stageId });
    });
  });

  container.querySelectorAll('[data-action="abandon-plan"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Are you sure you want to abandon this active plan?')) {
        actions.deleteActivePlan(btn.dataset.planId);
      }
    });
  });
}

function renderMilestoneGroup(goal, stages, plan, state) {
  let html = '';
  
  if (goal) {
    html += `
      <div class="milestone-hub">
        <div class="milestone-hub__icon">🏆</div>
        <div class="milestone-hub__content">
          <h2 class="milestone-hub__title">${escapeHtml(goal.title)}</h2>
          <div class="milestone-hub__meta">
            <span class="badge" style="background: rgba(79,209,197,0.15); color: var(--brand); border: 1px solid rgba(79,209,197,0.3);">Target: ${escapeHtml(goal.target)}</span>
            ${goal.timeframe ? `<span class="badge" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">${escapeHtml(goal.timeframe)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  } else if (stages.length > 0) {
     html += `
       <div class="milestone-hub milestone-hub--unlinked">
         <div class="milestone-hub__icon">🚀</div>
         <div class="milestone-hub__content">
           <h2 class="milestone-hub__title">Journey Begins</h2>
         </div>
       </div>
     `;
  }

  stages.forEach((s, index) => {
    const isActive = s.id === plan.currentStageId;
    const progressResult = evaluateStageProgress(s, state.workouts, state.routines);
    const { isUnlocked, displayStr } = progressResult;
    
    const alignment = index % 2 === 0 ? 'left' : 'right';
    
    let statusClass = 'locked';
    let icon = '🔒';
    if (isActive) {
      statusClass = 'active';
      icon = '🔥';
    } else if (isUnlocked) {
      statusClass = 'completed';
      icon = '✅';
    }

    const linkedRoutine = s.routineId ? state.routines.find(r => r.id === s.routineId) : null;
    const routineHtml = linkedRoutine 
      ? `<button class="button button--ghost" data-action="navigate-routine" data-routine-id="${linkedRoutine.id}" type="button" style="width: 100%; margin-top: 16px; font-size: 0.9rem; padding: 10px;">
           Run: ${escapeHtml(linkedRoutine.name)}
         </button>`
      : '';

    const badgeHtml = displayStr ? `<div style="margin-top: 12px;"><span class="badge" style="background: rgba(0,0,0,0.4); font-size: 0.8rem; padding: 6px 12px;">${escapeHtml(displayStr)}</span></div>` : '';

    const activeBtnHtml = !isActive 
      ? `<button class="button button--primary" data-action="set-active-stage" data-plan-id="${plan.id}" data-stage-id="${s.id}" type="button" style="width: 100%; margin-top: 10px; font-size: 0.9rem; padding: 10px;" ${!isUnlocked ? 'disabled' : ''}>${!isUnlocked ? 'Locked' : 'Set Active'}</button>`
      : `<div style="margin-top: 12px; text-align: center; padding: 8px; background: rgba(246, 173, 85, 0.1); border-radius: var(--radius-sm); border: 1px solid rgba(246, 173, 85, 0.2);"><span style="color: var(--brand-2); font-weight: 800; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase;">Current Stage</span></div>`;

    html += `
      <div class="winding-stage winding-stage--${alignment} winding-stage--${statusClass}">
        <div class="winding-stage__marker">${icon}</div>
        <div class="winding-stage__card panel">
          <h4 style="margin: 0 0 10px; font-size: 1.25rem; color: var(--text);">${escapeHtml(s.name || "Unnamed Stage")}</h4>
          ${s.condition ? `<p style="margin: 0; color: var(--soft); font-size: 0.95rem; line-height: 1.5;">${escapeHtml(s.condition)}</p>` : ''}
          ${badgeHtml}
          ${routineHtml}
          ${activeBtnHtml}
        </div>
      </div>
    `;
  });

  return html;
}
