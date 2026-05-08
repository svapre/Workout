/**
 * Narrative Service
 * 
 * A deterministic engine for grounded, observant journey messaging.
 * Avoids repetition and provides context-aware guidance without hype.
 */

const NARRATIVE_POOLS = {
  recovery: [
    "Today's scheduled rest is part of the journey.",
    "Intentional rest is keeping your progress steady.",
    "The journey continues with a lighter step today.",
    "A deliberate pause before the next step.",
    "Scheduled rest keeps the rhythm of the plan intact.",
  ],
  momentum: [
    "Your momentum is building, guided by the plan's steady pace.",
    "A consistent rhythm is forming as you move through this stage.",
    "The journey remains steady and intentional.",
    "Each session adds to the collective weight of your progress.",
    "Steady execution is building a reliable foundation.",
  ],
  difficult_session_recovery: [
    "Yesterday's demanding session makes today's rest especially useful.",
    "A lighter step helps balance a demanding session.",
    "This rest step gives the plan room to settle after a challenge.",
    "The demanding pace of yesterday is balanced by today's scheduled pause.",
    "Honoring the effort of the last session with deliberate rest.",
  ],
  consistency: [
    "Maintaining a steady rhythm across recent sessions.",
    "The strength of the journey is found in its repetition.",
    "Consistent execution is the engine of transformation.",
    "Reliable progress is built one session at a time.",
    "Your commitment to the schedule is clearly visible.",
  ],
  steady_rhythm: [
    "You've established a strong rhythm with recent sessions.",
    "A reliable pattern of work is emerging.",
    "The plan is becoming a natural part of your week.",
    "Rhythm and consistency are the hallmarks of this stage.",
    "Steady progress continues as planned.",
  ],
  milestone_progression: [
    "Moving steadily toward the next stage of the journey.",
    "Each cycle brings the next milestone closer.",
    "Progression is a gradual unfolding of capability.",
    "The next phase of training is appearing on the horizon.",
    "Approaching the completion of this stage's objectives.",
  ],
  return_after_gap: [
    "Today's session returns you to your planned rhythm.",
    "Resuming the journey after a necessary pause.",
    "Finding the rhythm again as you step back into the plan.",
    "The plan remained steady; today you rejoin it.",
    "A calm return to the discipline of the journey.",
  ],
  early_stage_encouragement: [
    "Building the foundation of the journey, one set at a time.",
    "Initial progress is about establishing the habit of execution.",
    "The first stage is where the deepest roots are grown.",
    "Establishing the baseline for all that follows.",
    "Focusing on the mechanics and rhythm of the new plan.",
  ],
  late_stage_reinforcement: [
    "Reinforcing the capacity you've built throughout this stage.",
    "Final cycles in this phase prepare you for the next transformation.",
    "The stage is nearly complete; maintain the focus of the early days.",
    "Capability is highest as you approach the stage milestone.",
    "The journey's arc is clearly visible from this vantage point.",
  ],
  strong_session_momentum: [
    "You're building strong momentum; your capability is expanding.",
    "Channeling the strength of recent sessions into the next step.",
    "A period of high capability and focused execution.",
    "The plan is meeting your expanding capacity.",
    "Strong sessions are reinforcing the journey's upward path.",
    "Momentum is rising as your rhythm becomes more natural.",
    "Harnessing recent strength to drive the journey forward.",
    "A distinct phase of growth is visible in your execution.",
  ],
  difficult_pace_awareness: [
    "The current pace is demanding; focus on consistent, steady effort.",
    "Managing the intensity with deliberate, calm execution.",
    "A challenging phase that requires focus and patience.",
    "Respecting the difficulty while maintaining the rhythm.",
    "Demanding sessions are part of the transformational arc.",
    "Navigating a period of increased resistance with steady intent.",
    "The journey's depth is often discovered in its more difficult sessions.",
    "Maintaining form and focus through a demanding schedule.",
  ],
  session_complete_subline: [
    "You have executed today's planned path.",
    "Another session placed with intention.",
    "The schedule for today is complete.",
    "Execution is finished; the journey continues.",
    "Today's work is recorded in the arc of the plan.",
    "Today's path has been traveled as intended.",
    "Rhythm maintained. Focus shifted to recovery.",
    "The requirements for today have been met.",
  ],
  milestone_reached_subline: [
    "The objectives for this stage have been met.",
    "A meaningful milestone in the training journey.",
    "You have moved through this stage with consistency.",
    "Ready for the next phase of progression.",
    "Target reached through persistent execution.",
    "A transformation is complete; the path widens.",
    "The foundational work of this stage is now solid.",
    "Consistency has led you to this milestone.",
  ],
};

/**
 * Deterministically select a message from a pool based on a seed.
 */
function selectDeterministic(pool, seed) {
  if (!pool || pool.length === 0) return null;
  // Simple hash for string/number seed
  const s = String(seed);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}

export function getNarrative(poolKey, context = {}) {
  const pool = NARRATIVE_POOLS[poolKey];
  if (!pool) return null;

  // Create a seed that changes with session count but is stable for a given session index
  // We include the poolKey to ensure different pools don't always pick the same index
  const seed = `${context.planId || 'default'}-${context.sessionCount || 0}-${poolKey}`;
  
  return selectDeterministic(pool, seed);
}

/**
 * High-level helper to resolve the best pool for a recovery insight.
 */
export function getRecoveryInsight(context) {
  if (context.lastDiff === 'difficult') {
    return getNarrative('difficult_session_recovery', context);
  }
  return getNarrative('recovery', context);
}

/**
 * High-level helper to resolve the best pool for momentum.
 */
export function getMomentumMessage(context) {
  if (context.isFeelingStrong) {
    return getNarrative('strong_session_momentum', context);
  }
  if (context.isFeelingDifficult) {
    return getNarrative('difficult_pace_awareness', context);
  }
  
  const stageIndex = context.stageIndex ?? 0;
  const stageCount = context.stageCount ?? 1;
  
  if (stageIndex === 0) {
    return getNarrative('early_stage_encouragement', context);
  }
  if (stageIndex >= stageCount - 1 && stageCount > 1) {
    return getNarrative('late_stage_reinforcement', context);
  }
  
  return getNarrative('momentum', context);
}
