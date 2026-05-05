export function renderDashboardView(container, { state, actions }) {
  const activePlans = state.activePlans || [];

  // Summary cards
  const totalRoutines = state.routines?.length ?? 0;
  const totalExercises = state.exercises?.length ?? 0;
  const totalWorkouts = state.workouts?.length ?? 0;
  const totalActivePlans = activePlans.length;

  container.innerHTML = `
    <section class="page page-single">
      <div style="text-align: center; margin-bottom: 48px; padding-top: 20px;">
        <h1 style="font-size: clamp(2rem, 5vw, 3rem); color: var(--text); margin: 0 0 12px;">Dashboard</h1>
        <p style="color: var(--soft); font-size: 1.1rem; max-width: 600px; margin: 0 auto;">Your training overview at a glance.</p>
      </div>

      <div class="card-grid" style="margin-bottom: 48px;">
        <div class="panel" style="text-align: center; padding: 24px;">
          <div style="font-size: 2.5rem; font-weight: 800; color: var(--brand);">${totalActivePlans}</div>
          <div style="font-size: 0.85rem; color: var(--soft); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;">Active Plans</div>
        </div>
        <div class="panel" style="text-align: center; padding: 24px;">
          <div style="font-size: 2.5rem; font-weight: 800; color: var(--brand-2);">${totalWorkouts}</div>
          <div style="font-size: 0.85rem; color: var(--soft); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;">Workouts Logged</div>
        </div>
        <div class="panel" style="text-align: center; padding: 24px;">
          <div style="font-size: 2.5rem; font-weight: 800; color: var(--text);">${totalRoutines}</div>
          <div style="font-size: 0.85rem; color: var(--soft); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;">Routines</div>
        </div>
        <div class="panel" style="text-align: center; padding: 24px;">
          <div style="font-size: 2.5rem; font-weight: 800; color: var(--text);">${totalExercises}</div>
          <div style="font-size: 0.85rem; color: var(--soft); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;">Exercises</div>
        </div>
      </div>

      ${activePlans.length === 0 ? `
        <div class="panel" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 40px 24px;">
          <div style="font-size: 3rem; margin-bottom: 16px;">🗺️</div>
          <h3 style="margin-bottom: 12px;">No Active Roadmaps</h3>
          <p style="color: var(--soft); margin-bottom: 24px;">Go to the Plans library and activate a plan to start tracking your progress.</p>
          <button class="button button--primary" data-action="go-to-plans" type="button" style="padding: 10px 24px;">Explore Plans</button>
        </div>
      ` : `
        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 1.4rem; margin-bottom: 24px; color: var(--text);">Active Roadmaps</h2>
          <div class="card-grid">
            ${activePlans.map(plan => {
              const stageCount = plan.stages?.length ?? 0;
              const currentStage = plan.stages?.find(s => s.id === plan.currentStageId);
              const currentStageName = currentStage?.name || 'Not started';
              const milestoneCount = plan.goals?.length ?? 0;
              return `
                <div class="panel" style="padding: 24px; display: flex; flex-direction: column;">
                  <div style="display: inline-block; padding: 4px 10px; background: rgba(79, 209, 197, 0.1); border: 1px solid rgba(79, 209, 197, 0.25); border-radius: 999px; color: var(--brand); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px; width: fit-content;">Active</div>
                  <h3 style="font-size: 1.2rem; margin: 0 0 8px; color: var(--text);">${escapeHtml(plan.name)}</h3>
                  <p style="color: var(--soft); font-size: 0.9rem; margin-bottom: 16px; flex-grow: 1;">${escapeHtml(plan.description ? plan.description.slice(0, 100) : '')}</p>
                  <div style="display: flex; gap: 12px; font-size: 0.85rem; color: var(--soft); margin-bottom: 12px;">
                    <span>🏆 ${milestoneCount} milestone${milestoneCount !== 1 ? 's' : ''}</span>
                    <span>📍 ${stageCount} stage${stageCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div style="padding: 8px 12px; background: rgba(246, 173, 85, 0.08); border: 1px solid rgba(246, 173, 85, 0.2); border-radius: var(--radius-sm); font-size: 0.85rem; margin-bottom: 16px;">
                    <span style="color: var(--brand-2); font-weight: 700;">Current:</span> <span style="color: var(--text);">${escapeHtml(currentStageName)}</span>
                  </div>
                  <button class="button button--ghost" data-action="go-to-active-plans" type="button" style="padding: 8px;">View Roadmap →</button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `}
    </section>
  `;

  container.querySelector('[data-action="go-to-plans"]')?.addEventListener('click', () => {
    actions.navigate('plans');
  });

  container.querySelectorAll('[data-action="go-to-active-plans"]').forEach(btn => {
    btn.addEventListener('click', () => {
      actions.navigate('active-plans');
    });
  });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
