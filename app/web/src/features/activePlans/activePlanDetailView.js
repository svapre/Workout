/**
 * Active Plan Detail View
 * 
 * Detailed breakdown of a specific active plan instance.
 */

import { getNextRoutine } from "./activePlanUtils.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderActivePlanDetailView(container, { state, actions }) {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const id = hash.split('/')[1];
  const plan = state.activePlans.find(p => p.id === id);

  container.innerHTML = "";

  const section = document.createElement("section");
  section.className = "page page-single";

  if (!plan) {
    section.innerHTML = `
      <div class="panel" style="padding: 40px; text-align: center;">
        <h1 style="color: var(--danger);">Plan Not Found</h1>
        <p style="color: var(--soft); margin-bottom: 24px;">The active plan you are looking for does not exist or has been removed.</p>
        <button class="button button--ghost" onclick="window.location.hash='#active-plans'">Back to Dashboard</button>
      </div>
    `;
    container.appendChild(section);
    return;
  }

  const stageIndex = plan.currentStageIndex ?? 0;
  const currentStage = plan.stages?.[stageIndex] || { name: "Unknown Stage", milestone: {} };
  const nextRoutine = getNextRoutine(plan, state.routines);
  const nextRoutineName = nextRoutine ? nextRoutine.name : "Rest Day";
  const theme = plan.theme || { color: "#4FD1C5", icon: "💪", code: "PLN" };
  const stagesRemaining = Math.max(0, (plan.stages?.length ?? 0) - stageIndex - 1);
  const stagesRemainingWord = stagesRemaining === 1 ? "stage" : "stages";

  section.innerHTML = `
    <button class="button button--primary" style="width: 100%; margin-bottom: 32px; padding: 18px; font-size: 1.1rem; font-weight: 800; background: ${theme.color}; color: #000; text-transform: uppercase; border-radius: 999px;" onclick="window.location.hash='#workout-player/${plan.id}'">
        RESUME WORKOUT
    </button>

    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
      <div>
        <button class="button button--ghost" onclick="window.location.hash='#active-plans'" style="margin-bottom: 24px;">← Back to Dashboard</button>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size: 2rem;">${theme.icon}</span>
            <span style="font-size: 0.9rem; color: ${theme.color}; font-weight: 800; letter-spacing: 0.15em; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px;">${theme.code}</span>
        </div>
        <h1 style="font-size: 2.2rem; color: var(--text); margin: 0 0 8px; line-height: 1;">${escapeHtml(plan.name)}</h1>
        <p style="color: var(--soft); font-size: 1.1rem; max-width: 700px;">${escapeHtml(plan.description || "Training for excellence.")}</p>
      </div>
    </div>


    <div class="panel" style="padding: 32px; margin-bottom: 32px; border: 1px solid rgba(255,255,255,0.05);">
        <h3 style="margin: 0 0 24px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);">Plan Status</h3>
        
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <!-- 1. Stage Name (Largest) -->
            <div style="font-size: 2.5rem; font-weight: 800; color: var(--text); line-height: 1.1;">${escapeHtml(currentStage.name)}</div>
            
            <!-- 2. Cycle Position (Medium) -->
            <div style="font-size: 1.4rem; color: var(--text); font-weight: 600;">Day ${plan.currentDayInCycle || 1} of ${currentStage.schedule?.length || 0}</div>
            
            <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 4px;">
                <!-- 3. Milestone Progress (Small) -->
                <div style="font-size: 1rem; color: var(--soft);">Milestone: ${plan.currentCycleCount || 0} / ${currentStage.milestone?.target || 1} cycles</div>
                
                <!-- 4. Target (Small, Amber) -->
                <div style="font-size: 1rem; color: #F6AD55; font-weight: 700;">Target: ${escapeHtml(currentStage.milestone?.description || "Complete the current training cycle to advance.")}</div>
                
                <!-- 5. Streak (Smallest, Muted) -->
                <div style="font-size: 0.85rem; color: var(--muted); margin-top: 8px;">Streak: ${plan.streakDays || 0} Days</div>
            </div>
        </div>
    </div>

    ${(!plan.stages || plan.stages.length === 0) ? "" : `
    <div class="panel" style="padding: 32px; margin-bottom: 32px; border: 1px solid rgba(255,255,255,0.05);">
        <h3 style="margin: 0 0 24px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);">STAGE ROADMAP</h3>
        
        <div style="display: flex; align-items: center; margin-bottom: 24px;">
            ${plan.stages.map((s, idx) => {
                let circleStyle = "width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; box-sizing: border-box; ";
                
                if (idx < stageIndex) {
                    circleStyle += "background: #2DD4BF;";
                } else if (idx === stageIndex) {
                    circleStyle += "background: #2DD4BF; border: 3px solid white; box-shadow: 0 0 0 3px #2DD4BF;";
                } else {
                    circleStyle += "background: transparent; border: 2px solid #4B5563;";
                }
                
                const circle = `<div style="${circleStyle}"></div>`;
                const line = idx < plan.stages.length - 1 ? `<div style="flex: 1; height: 1px; border-top: 1px solid #374151; align-self: center;"></div>` : "";
                
                return circle + line;
            }).join("")}
        </div>

        <div>
            <div style="font-size: 1.2rem; font-weight: bold; color: #FFF; margin-bottom: 4px;">${escapeHtml(currentStage.name)}</div>
            <div style="font-size: 0.95rem; color: #F6AD55; margin-bottom: 12px;">${escapeHtml(currentStage.milestone?.description || "Complete this stage to advance.")}</div>
            <div style="font-size: 0.85rem; color: var(--muted);">${stagesRemaining} ${stagesRemainingWord} remaining</div>
        </div>
    </div>
    `}
  `;

  container.appendChild(section);
}
