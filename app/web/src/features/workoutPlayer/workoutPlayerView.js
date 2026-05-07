/**
 * Workout Player View
 * 
 * The live execution engine for a specific workout session.
 * Features: Set Queue, Active/Rest states, Countdown Timers, HUD, Pause System, and Persistence.
 */

import { confirmAction } from "../../ui/modal.js";

let currentSession = null;
let restTimerInterval = null;
let sessionTimerInterval = null;

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function clearAllIntervals() {
  if (restTimerInterval) {
    clearInterval(restTimerInterval);
    restTimerInterval = null;
  }
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
  }
}

function cleanupImmersiveMode() {
  document.body.classList.remove('workout-active');
  clearAllIntervals();
}

export function renderWorkoutPlayerView(container, { state, actions }) {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const id = hash.split('/')[1];
  const plan = state.activePlans.find(p => p.id === id);

  if (!plan) {
    cleanupImmersiveMode();
    container.innerHTML = `
      <section class="page page-single">
        <div class="panel" style="padding: 40px; text-align: center;">
          <h1 style="color: var(--danger);">Session Not Found</h1>
          <p style="color: var(--soft); margin-bottom: 24px;">Unable to load the workout session for this plan.</p>
          <button class="button button--ghost" onclick="window.location.hash='#active-plans'">Back to Dashboard</button>
        </div>
      </section>
    `;
    return;
  }

  // Initialize Session if not already active or if switched plans
  if (!currentSession || currentSession.planId !== id) {
    initSession(plan, state);
  }

  // Enter Immersive Mode
  document.body.classList.add('workout-active');

  renderUI(container, actions, state);
}

function initSession(plan, state) {
  const stageIndex = plan.currentStageIndex ?? 0;
  const stage = plan.stages?.[stageIndex];
  const dayInCycle = plan.currentDayInCycle ?? 1;

  if (!stage) return;

  const schedule = stage.schedule || [];
  const scheduleEntry = schedule[dayInCycle - 1];
  const routineId = scheduleEntry?.type === "routine" ? scheduleEntry.routineId : null;
  const routine = routineId ? state.routines.find((r) => r.id === routineId) : null;

  if (!routine) {
    currentSession = { planId: plan.id, status: "no-routine" };
    return;
  }

  const sets = [];
  const entries = routine.entries || routine.exercises || [];
  entries.forEach((exInstance) => {
    const refId = exInstance.exerciseId || "";
    const catalogEntry =
      state.exercises.find((e) => e.id === refId) ||
      state.exercises.find((e) => e.slug === refId) ||
      state.exercises.find((e) => e.name?.toLowerCase() === refId.toLowerCase());

    if (!catalogEntry) {
      console.warn("Unresolved exercise reference:", exInstance);
    }

    const resolvedName =
      catalogEntry?.name || catalogEntry?.title || exInstance.name || refId || "Unknown Exercise";
    const resolvedCues = catalogEntry?.cues || [];

    const setCount = parseInt(exInstance.sets ?? exInstance.targetSets ?? 1, 10);
    for (let i = 1; i <= setCount; i++) {
      sets.push({
        id: `set_${sets.length}_${Date.now()}`,
        exerciseId: catalogEntry?.id || refId,
        exerciseName: resolvedName,
        exerciseCues: resolvedCues,
        trackingType: catalogEntry?.trackingType || "reps",
        setNumber: i,
        totalSets: setCount,
        targetReps: exInstance.reps ?? exInstance.targetReps,
        targetWeightKg: exInstance.weight ?? exInstance.targetWeightKg,
        targetDurationSec: exInstance.durationSeconds ?? exInstance.targetDurationSec,
        restSec:
          exInstance.restSeconds ??
          exInstance.restSec ??
          catalogEntry?.restSeconds ??
          60,
        notes: exInstance.notes,
      });
    }
  });

  currentSession = {
    planId: plan.id,
    stageId: stage.id,
    routineId,
    stageName: stage.name,
    stageIndex: stageIndex + 1,
    routineName: routine.name,
    sets,
    currentIndex: 0,
    status: "pre-workout",
    restRemaining: 0,
    sessionSeconds: 0,
    isPaused: false,
    sessionStartedAtIso: null,
    theme: plan.theme || { color: "#4FD1C5", icon: "💪", code: "PLN" },
    logs: [],
  };
}

function startSessionTimer(container) {
    if (sessionTimerInterval) return;
    sessionTimerInterval = setInterval(() => {
        if (currentSession && !currentSession.isPaused && currentSession.status !== 'pre-workout') {
            currentSession.sessionSeconds++;
            updateHUD(container);
        }
    }, 1000);
}

function updateHUD(container) {
    const clock = container.querySelector('#session-clock');
    if (clock) clock.textContent = formatTime(currentSession.sessionSeconds);
    
    // Update Node Tracker
    const nodes = container.querySelectorAll('.progress-node');
    nodes.forEach((node, idx) => {
        node.style.flex = idx === currentSession.currentIndex ? "2" : "1";
        if (idx < currentSession.currentIndex) {
            node.style.background = "var(--brand)";
        } else if (idx === currentSession.currentIndex) {
            node.style.background = "var(--brand-2)";
        } else {
            node.style.background = "rgba(255,255,255,0.1)";
        }
    });
}

function renderUI(container, actions, state) {
  if (!currentSession) return;

  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); color: var(--text); position: relative;";

  if (currentSession.status === 'no-routine') {
    renderNoRoutine(wrapper);
  } else if (currentSession.status === 'complete') {
    renderComplete(wrapper, actions, state);
  } else if (currentSession.status === 'pre-workout') {
    renderPreWorkout(wrapper, container, actions, state);
  } else {
    renderHUD(wrapper, container);
    const content = document.createElement("div");
    content.style.flexGrow = "1";
    content.style.display = "flex";
    content.style.flexDirection = "column";

    if (currentSession.status === 'resting') {
      renderResting(content, container, actions, state);
    } else {
      renderActiveSet(content, container, actions, state);
    }
    wrapper.appendChild(content);

    if (currentSession.isPaused) {
        renderPauseOverlay(wrapper, container, actions, state);
    }
  }

  container.appendChild(wrapper);
}

function renderPreWorkout(wrapper, container, actions, state) {
    const uniqueExerciseCount = new Set(currentSession.sets.map(s => s.exerciseName)).size;
    const exerciseLabel = uniqueExerciseCount === 1 ? 'Exercise' : 'Exercises';
    wrapper.innerHTML = `
        <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center;">
            <div style="font-size: 1rem; color: ${currentSession.theme.color}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 12px;">Stage ${currentSession.stageIndex} → ${escapeHtml(currentSession.routineName)}</div>
            <h1 style="font-size: 3.5rem; margin: 0 0 16px; line-height: 1;">${escapeHtml(currentSession.routineName)}</h1>
            <p style="color: var(--soft); font-size: 1.2rem; margin-bottom: 48px;">
                ${currentSession.sets.length} Total Sets across ${uniqueExerciseCount} ${exerciseLabel}.
            </p>
            
            <div class="panel" style="width: 100%; max-width: 500px; padding: 24px; margin-bottom: 48px; background: rgba(255,255,255,0.03);">
                <div style="font-size: 0.9rem; color: var(--muted); text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.1em;">Session Summary</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${[...new Set(currentSession.sets.map(s => s.exerciseName))].map(name => `
                        <div style="display: flex; justify-content: space-between; font-size: 1.1rem; color: var(--text);">
                            <span>${escapeHtml(name)}</span>
                            <span style="color: var(--brand); font-weight: 700;">${currentSession.sets.filter(s => s.exerciseName === name).length} Sets</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <button class="button button--primary" style="padding: 24px 80px; font-size: 2rem; border-radius: 100px; background: ${currentSession.theme.color}; color: #000; box-shadow: 0 15px 40px ${currentSession.theme.color}66;" data-action="start">
                START ROUTINE
            </button>
            <button class="button button--ghost" style="margin-top: 24px;" onclick="window.location.hash='#active-plans'">Cancel</button>
        </div>
    `;

    wrapper.querySelector('[data-action="start"]').addEventListener('click', () => {
        currentSession.sessionStartedAtIso = new Date().toISOString();
        currentSession.status = 'active';
        startSessionTimer(container);
        renderUI(container, actions, state);
    });
}

function renderHUD(wrapper, container) {
    const hud = document.createElement("div");
    hud.style.cssText = "padding: 16px 20px; background: rgba(9, 17, 31, 0.9); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.1); position: sticky; top: 0; z-index: 100;";
    
    const nodeTracker = `
        <div style="display: flex; gap: 6px; height: 8px; margin-bottom: 16px;">
            ${currentSession.sets.map((_, idx) => {
                let color = "rgba(255,255,255,0.1)";
                let flex = "1";
                if (idx < currentSession.currentIndex) color = "var(--brand)";
                else if (idx === currentSession.currentIndex) {
                    color = "var(--brand-2)";
                    flex = "2";
                }
                return `<div class="progress-node" style="flex: ${flex}; background: ${color}; border-radius: 4px; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>`;
            }).join('')}
        </div>
    `;

    const statusRow = `
        <div class="player-hud">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 1.2rem;">${currentSession.theme.icon}</span>
                <span id="session-clock" style="font-family: monospace; font-size: 1.6rem; font-weight: 800; color: ${currentSession.theme.color}; font-variant-numeric: tabular-nums;">${formatTime(currentSession.sessionSeconds)}</span>
                <span style="color: var(--muted); font-size: 0.9rem; margin-left: 8px;">Stage ${currentSession.stageIndex} · ${escapeHtml(currentSession.routineName)}</span>
            </div>
            <button class="mini-button button--danger button--ghost" data-action="exit" style="padding: 6px 16px; font-size: 0.85rem; border-color: rgba(252, 129, 129, 0.3);">END SESSION</button>
        </div>
    `;

    hud.innerHTML = nodeTracker + statusRow;
    wrapper.appendChild(hud);

    hud.querySelector('[data-action="exit"]').addEventListener('click', () => {
        confirmAction(document.body, {
            title: "End Session Early?",
            message: "End workout session early? Progress will not be saved.",
            confirmText: "Yes, End Workout",
            onConfirm: () => {
                cleanupImmersiveMode();
                currentSession = null;
                window.location.hash = '#active-plans';
            }
        });
    });
}

function renderPauseOverlay(wrapper, container, actions, state) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position: absolute; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(8px); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center;";
    overlay.innerHTML = `
        <h2 style="font-size: 3rem; color: var(--brand-2); margin-bottom: 48px; letter-spacing: 0.15em; font-weight: 800;">SESSION PAUSED</h2>
        <button class="button button--primary" style="padding: 32px 100px; font-size: 2.2rem; border-radius: 100px; box-shadow: 0 0 60px rgba(79, 209, 197, 0.5);" data-action="resume">▶ RESUME</button>
    `;
    wrapper.appendChild(overlay);

    overlay.querySelector('[data-action="resume"]').addEventListener('click', () => {
        currentSession.isPaused = false;
        // Resume rest timer if needed
        if (currentSession.status === 'resting' && currentSession.restRemaining > 0) {
            startRestInterval(container, actions, state);
        }
        renderUI(container, actions, state);
    });
}

function renderNoRoutine(container) {
  container.innerHTML = `
    <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center;">
      <h2 style="color: var(--brand-2); margin-bottom: 16px;">Rest Day?</h2>
      <p style="color: var(--soft); margin-bottom: 32px;">No routine is scheduled for today. Take it easy or start a different plan!</p>
      <button class="button button--ghost" onclick="window.location.hash='#active-plans'">Exit Player</button>
    </div>
  `;
}

function renderActiveSet(content, container, actions, state) {
  const set = currentSession.sets[currentSession.currentIndex];
  if (!set) {
    currentSession.status = 'complete';
    renderUI(container, actions, state);
    return;
  }

  const showReps = set.trackingType === 'reps' || set.trackingType === 'weight';
  const showWeight = set.trackingType === 'weight';
  const showDuration = set.trackingType === 'duration';

  content.innerHTML = `
    <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center;">
      <h1 style="font-size: 4rem; margin: 0 0 12px; line-height: 1.1; font-weight: 800;">${escapeHtml(set.exerciseName)}</h1>
      <p style="font-size: 1.8rem; color: var(--brand); margin-bottom: 48px; font-weight: 700;">Set ${set.setNumber} of ${set.totalSets}</p>

      <div class="panel" style="width: 100%; max-width: 600px; padding: 40px; margin-bottom: 60px; background: rgba(255,255,255,0.03); border: 1px solid rgba(143,168,210,0.1);">
        <div style="font-size: 1rem; color: var(--muted); margin-bottom: 32px; text-transform: uppercase; letter-spacing: 0.15em;">Performance Data</div>
        
        <div style="display: flex; gap: 24px; justify-content: center;">
          ${showReps ? `
            <div style="flex: 1;">
              <label style="display: block; font-size: 0.9rem; color: var(--muted); margin-bottom: 12px;">Reps</label>
              <input type="number" id="log-reps" value="${set.targetReps || 0}" style="font-size: 3rem; text-align: center; padding: 20px; background: rgba(0,0,0,0.4); border: 2px solid rgba(143,168,210,0.25); border-radius: var(--radius-md); width: 100%; color: var(--text);">
            </div>
          ` : ""}
          ${showWeight ? `
            <div style="flex: 1;">
              <label style="display: block; font-size: 0.9rem; color: var(--muted); margin-bottom: 12px;">kg</label>
              <input type="number" id="log-weight" value="${set.targetWeightKg || 0}" step="0.5" style="font-size: 3rem; text-align: center; padding: 20px; background: rgba(0,0,0,0.4); border: 2px solid rgba(143,168,210,0.25); border-radius: var(--radius-md); width: 100%; color: var(--text);">
            </div>
          ` : ""}
          ${showDuration ? `
            <div style="flex: 1;">
              <label style="display: block; font-size: 0.9rem; color: var(--muted); margin-bottom: 12px;">Sec</label>
              <input type="number" id="log-duration" value="${set.targetDurationSec || 0}" style="font-size: 3rem; text-align: center; padding: 20px; background: rgba(0,0,0,0.4); border: 2px solid rgba(143,168,210,0.25); border-radius: var(--radius-md); width: 100%; color: var(--text);">
            </div>
          ` : ""}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; max-width: 600px;">
        <button class="button button--primary" style="grid-column: 1 / -1; font-size: 2.2rem; padding: 32px; border-radius: 100px; margin-bottom: 10px;" data-action="complete">COMPLETE SET</button>
        
        <button class="button" style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); font-size: 1.4rem; padding: 20px;" data-action="toggle-pause">II PAUSE</button>
        <button class="button" style="background: var(--brand-2); color: #000; font-size: 1.4rem; font-weight: 800; padding: 20px;" data-action="fail">FAIL / PARTIAL</button>
        
        <button class="button button--ghost" style="grid-column: 1 / -1; font-size: 1.4rem; border-color: rgba(143,168,210,0.2);" data-action="skip">SKIP SET</button>
      </div>
    </div>

    <div style="padding: 32px; text-align: center; color: var(--soft); font-size: 1.2rem; font-style: italic; opacity: 0.7;">
      ${set.notes ? `"${escapeHtml(set.notes)}"` : ""}
    </div>
  `;

  content.querySelector('[data-action="toggle-pause"]').addEventListener('click', () => {
      currentSession.isPaused = true;
      if (restTimerInterval) {
          clearInterval(restTimerInterval);
          restTimerInterval = null;
      }
      renderUI(container, actions, state);
  });

  content.querySelector('[data-action="complete"]').addEventListener('click', () => {
    logSet('success', content);
    startRest(container, actions, state);
  });

  content.querySelector('[data-action="fail"]').addEventListener('click', () => {
    logSet('failed', content);
    startRest(container, actions, state);
  });

  content.querySelector('[data-action="skip"]').addEventListener('click', () => {
    currentSession.currentIndex++;
    if (currentSession.currentIndex >= currentSession.sets.length) {
      currentSession.status = 'complete';
    }
    renderUI(container, actions, state);
  });
}

function normalizeLoggedStatus(status) {
  if (status === "success") return "completed";
  if (status === "failed" || status === "fail") return "failed";
  if (status === "partial") return "partial";
  if (status === "skipped" || status === "skip") return "skipped";
  return "completed";
}

function logSet(status, content) {
  const set = currentSession.sets[currentSession.currentIndex];
  const reps = content.querySelector("#log-reps")?.value;
  const weight = content.querySelector("#log-weight")?.value;
  const duration = content.querySelector("#log-duration")?.value;

  currentSession.logs.push({
    exerciseId: set.exerciseId,
    setNumber: set.setNumber,
    status: normalizeLoggedStatus(status),
    actualReps: reps ? parseInt(reps, 10) : null,
    actualWeightKg: weight ? parseFloat(weight) : null,
    actualDurationSec: duration ? parseInt(duration, 10) : null,
    actualResistance: null,
  });
}

function startRest(container, actions, state) {
  const set = currentSession.sets[currentSession.currentIndex];
  currentSession.status = 'resting';
  currentSession.restRemaining = set.restSec || 60;
  
  startRestInterval(container, actions, state);
  renderUI(container, actions, state);
}

function startRestInterval(container, actions, state) {
    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerInterval = setInterval(() => {
        if (!currentSession.isPaused) {
            currentSession.restRemaining--;
            if (currentSession.restRemaining <= 0) {
                finishRest(container, actions, state);
            } else {
                const timerDisplay = container.querySelector('#rest-timer');
                if (timerDisplay) timerDisplay.textContent = currentSession.restRemaining;
            }
        }
    }, 1000);
}

function finishRest(container, actions, state) {
  if (restTimerInterval) {
    clearInterval(restTimerInterval);
    restTimerInterval = null;
  }
  currentSession.currentIndex++;
  if (currentSession.currentIndex >= currentSession.sets.length) {
    currentSession.status = 'complete';
  } else {
    currentSession.status = 'active';
  }
  renderUI(container, actions, state);
}

function renderResting(content, container, actions, state) {
  const nextSet = currentSession.sets[currentSession.currentIndex + 1];

  content.innerHTML = `
    <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; background: linear-gradient(180deg, var(--bg) 0%, rgba(79, 209, 197, 0.05) 100%);">
      <div style="font-size: 1.4rem; color: var(--brand); font-weight: 800; text-transform: uppercase; letter-spacing: 0.3em; margin-bottom: 40px;">Recovery Interval</div>
      
      <div id="rest-timer" style="font-size: 8rem; font-weight: 900; line-height: 1; color: var(--brand); margin-bottom: 10px; font-variant-numeric: tabular-nums;">${currentSession.restRemaining ?? 60}</div>
      <div style="font-size: 1.5rem; color: var(--soft); margin-bottom: 40px; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 700;">Seconds Left</div>

      <div class="panel" style="width: 100%; max-width: 600px; padding: 32px; background: rgba(255,255,255,0.03); border: 1px solid rgba(79, 209, 197, 0.2); box-shadow: 0 0 30px rgba(79, 209, 197, 0.1);">
        <div style="font-size: 1rem; color: var(--muted); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.15em;">Next Challenge</div>
        ${nextSet ? `
          <div style="font-size: 2.5rem; font-weight: 800; color: var(--text);">${escapeHtml(nextSet.exerciseName)}</div>
          <div style="color: var(--brand); margin-top: 8px; font-size: 1.2rem; font-weight: 700;">Set ${nextSet.setNumber} of ${nextSet.totalSets}</div>
        ` : `
          <div style="font-size: 2.5rem; font-weight: 800; color: var(--brand);">Cool Down & Finalize</div>
        `}
      </div>

      <div style="margin-top: 60px; display: flex; gap: 20px;">
        <button class="button button--ghost" style="padding: 24px 60px; font-size: 1.6rem; border-radius: 100px;" data-action="skip-rest">Skip Rest</button>
        <button class="button" style="padding: 24px 40px; font-size: 1.6rem; border-radius: 100px; background: rgba(255,255,255,0.1);" data-action="toggle-pause">II PAUSE</button>
      </div>
    </div>
  `;

  content.querySelector('[data-action="skip-rest"]').addEventListener('click', () => {
    finishRest(container, actions, state);
  });

  content.querySelector('[data-action="toggle-pause"]').addEventListener('click', () => {
    currentSession.isPaused = true;
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
    }
    renderUI(container, actions, state);
  });
}

function renderComplete(wrapper, actions, state) {
  cleanupImmersiveMode();

  wrapper.innerHTML = `
    <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center;">
      <div style="width: 160px; height: 160px; background: var(--brand); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 6rem; margin-bottom: 40px; box-shadow: 0 0 60px rgba(79, 209, 197, 0.6);">✓</div>
      <h1 style="font-size: 4.5rem; margin-bottom: 16px; font-weight: 800;">VICTORY</h1>
      <p style="color: var(--soft); font-size: 1.5rem; margin-bottom: 60px; max-width: 600px; line-height: 1.5;">Session complete. You've cleared the entire routine. Click below to commit your performance and advance your training cycle.</p>
      
      <button class="button button--primary" style="padding: 28px 100px; font-size: 2rem; border-radius: 100px;" data-action="finish-and-save">FINISH & SAVE</button>
    </div>
  `;

  wrapper.querySelector('[data-action="finish-and-save"]').addEventListener('click', () => {
    saveWorkout(actions, state);
  });
}

function saveWorkout(actions, state) {
  const plan = state.activePlans.find((p) => p.id === currentSession.planId);
  if (!plan) return;

  const startedAt = currentSession.sessionStartedAtIso || new Date().toISOString();
  const completedAt = new Date().toISOString();
  const stage = plan.stages[plan.currentStageIndex ?? 0];
  const scheduleLength = stage?.schedule?.length || 1;
  const prevDay = plan.currentDayInCycle ?? 1;
  const nextDay = (prevDay % scheduleLength) + 1;
  let currentCycleCount = plan.currentCycleCount ?? 0;
  if (prevDay === scheduleLength && nextDay === 1) {
    currentCycleCount += 1;
  }

  const session = {
    id: `workout_${Date.now()}`,
    activePlanId: plan.id,
    activePlanVersion: plan.version ?? "1.0",
    routineId: currentSession.routineId,
    stageId: currentSession.stageId ?? stage?.id ?? "",
    startedAt,
    completedAt,
    sets: currentSession.logs.map((log) => ({
      exerciseId: log.exerciseId || "",
      setNumber: log.setNumber,
      status: log.status,
      actualReps: log.actualReps ?? null,
      actualDurationSec: log.actualDurationSec ?? null,
      actualWeightKg: log.actualWeightKg ?? null,
      actualResistance: log.actualResistance ?? null,
    })),
  };

  actions.recordCompletedSession({
    session,
    activePlanId: plan.id,
    planPatch: {
      streakDays: (plan.streakDays || 0) + 1,
      currentDayInCycle: nextDay,
      currentCycleCount,
      lastSessionDate: completedAt.slice(0, 10),
      sessions: [...(plan.sessions || []), session.id],
    },
  });

  currentSession = null;
  cleanupImmersiveMode();
  window.location.hash = "#active-plans";
}
