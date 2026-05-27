/**
 * Master Seed Data Defaults
 *
 * Injects starter exercises, routines, and plans that are broad enough
 * to exercise physical and mental journeys in realistic ways.
 */

import { createDefaultMilestone } from "./schemaMigration.js";

function createRoutineEntry({
  id,
  exerciseId,
  order,
  sets,
  reps = null,
  durationSeconds = null,
  weight = null,
  resistance = null,
  restSeconds = 45,
  sideMode = "",
  tempoMode = null,
  tempoSecondsPerRep = null,
  tempoDownSeconds = null,
  tempoBottomHoldSeconds = null,
  tempoUpSeconds = null,
  tempoTopHoldSeconds = null,
  tempoLabel = null,
  transitionAfterSeconds = null,
  transitionLabel = "",
  entryBlocks = [],
  notes = "",
}) {
  return {
    id,
    exerciseId,
    order,
    sets,
    reps,
    durationSeconds,
    weight,
    resistance,
    restSeconds,
    sideMode,
    tempoMode,
    tempoSecondsPerRep,
    tempoDownSeconds,
    tempoBottomHoldSeconds,
    tempoUpSeconds,
    tempoTopHoldSeconds,
    tempoLabel,
    transitionAfterSeconds,
    transitionLabel,
    entryBlocks,
    notes,
  };
}

function createRoutine({ id, name, description, notes, difficultyScore, entries }, timestamp) {
  return {
    id,
    name,
    description,
    notes,
    difficultyScore,
    createdAt: timestamp,
    updatedAt: timestamp,
    isCustom: false,
    entries,
  };
}

function routineStep(routineId) {
  return { type: "routine", routineId };
}

function restStep() {
  return { type: "rest", routineId: null };
}

function createStage(
  { id, name, guidance = "", predecessorStageId = null, transitionRule = "prompt_user", schedule, milestone },
  timestamp,
) {
  void timestamp;
  return {
    id,
    name,
    guidance,
    predecessorStageId,
    transitionRule,
    schedule,
    milestone: createDefaultMilestone(milestone),
  };
}

function createPlan({ id, version = "1.0", name, description, goal, theme, stages }, timestamp) {
  return {
    id,
    version,
    name,
    description,
    goal,
    theme,
    createdAt: timestamp,
    stages,
  };
}

export function createSeedRoutines() {
  const timestamp = new Date().toISOString();

  return [
    createRoutine(
      {
        id: "rt_rehab_core",
        name: "Posture & Core Reset",
        description: "Control-focused rehab work for trunk stability and hip support.",
        notes: "Move with control and keep each rep calm.",
        difficultyScore: 1,
        entries: [
          createRoutineEntry({
            id: "rrc_bird_dog",
            exerciseId: "ex_bird_dog",
            order: 1,
            sets: 3,
            durationSeconds: 45,
            restSeconds: 30,
            notes: "Reach long without rotating.",
          }),
          createRoutineEntry({
            id: "rrc_dead_bug",
            exerciseId: "ex_dead_bug",
            order: 2,
            sets: 3,
            reps: 10,
            restSeconds: 30,
            notes: "Alternate slowly with a quiet ribcage.",
          }),
          createRoutineEntry({
            id: "rrc_glute_bridge",
            exerciseId: "ex_glute_bridge",
            order: 3,
            sets: 3,
            reps: 12,
            restSeconds: 30,
            notes: "Drive through heels and finish tall.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_upper_base",
        name: "Upper Body Base",
        description: "Simple push-pull work for repeatable foundational strength.",
        notes: "Keep the reps smooth and controlled.",
        difficultyScore: 2,
        entries: [
          createRoutineEntry({
            id: "rub_pushup",
            exerciseId: "ex_pushup",
            order: 1,
            sets: 3,
            reps: 10,
            restSeconds: 60,
            notes: "Leave one clean rep in reserve.",
          }),
          createRoutineEntry({
            id: "rub_band_row",
            exerciseId: "ex_band_row",
            order: 2,
            sets: 3,
            reps: 12,
            restSeconds: 45,
            notes: "Pause at the back for a full squeeze.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_lower_base",
        name: "Lower Body Base",
        description: "Unilateral leg work and simple holds for lower-body capacity.",
        notes: "Treat each side with the same control and range.",
        difficultyScore: 2,
        entries: [
          createRoutineEntry({
            id: "rlb_split_squat",
            exerciseId: "ex_split_squat",
            order: 1,
            sets: 3,
            reps: 8,
            restSeconds: 45,
            notes: "Each side / move steadily.",
          }),
          createRoutineEntry({
            id: "rlb_glute_bridge",
            exerciseId: "ex_glute_bridge",
            order: 2,
            sets: 3,
            reps: 15,
            restSeconds: 30,
            notes: "Finish each rep fully.",
          }),
          createRoutineEntry({
            id: "rlb_wall_sit",
            exerciseId: "ex_wall_sit",
            order: 3,
            sets: 3,
            durationSeconds: 30,
            restSeconds: 30,
            notes: "Stay even through both feet.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_mobility_reset",
        name: "Mobility Reset",
        description: "Short posture and flexibility work for the spine and hips.",
        notes: "Use the breath to smooth out each position.",
        difficultyScore: 1,
        entries: [
          createRoutineEntry({
            id: "rmr_cat_cow",
            exerciseId: "ex_cat_cow",
            order: 1,
            sets: 2,
            reps: 8,
            restSeconds: 15,
            notes: "Move with one breath per rep.",
          }),
          createRoutineEntry({
            id: "rmr_hip_flexor",
            exerciseId: "ex_hip_flexor_stretch",
            order: 2,
            sets: 2,
            durationSeconds: 45,
            restSeconds: 15,
            notes: "Each side / stay tall.",
          }),
          createRoutineEntry({
            id: "rmr_childs_pose",
            exerciseId: "ex_childs_pose",
            order: 3,
            sets: 1,
            durationSeconds: 60,
            restSeconds: 15,
            notes: "Use long nasal exhales.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_yoga_balance",
        name: "Yoga Balance Flow",
        description: "Slow holds for posture, balance, and total-body length.",
        notes: "Stay calm and let the holds shape the session.",
        difficultyScore: 2,
        entries: [
          createRoutineEntry({
            id: "ryb_downward_dog",
            exerciseId: "ex_downward_dog",
            order: 1,
            sets: 2,
            durationSeconds: 45,
            restSeconds: 15,
            notes: "Press actively through the shoulders.",
          }),
          createRoutineEntry({
            id: "ryb_tree_pose",
            exerciseId: "ex_tree_pose",
            order: 2,
            sets: 2,
            durationSeconds: 30,
            restSeconds: 15,
            notes: "Each side / stay tall and quiet.",
          }),
          createRoutineEntry({
            id: "ryb_childs_pose",
            exerciseId: "ex_childs_pose",
            order: 3,
            sets: 1,
            durationSeconds: 60,
            restSeconds: 15,
            notes: "Return to steady breathing.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_breath_focus",
        name: "Breath Focus",
        description: "A simple guided breathwork block for calm focus.",
        notes: "Keep the pace smooth rather than forceful.",
        difficultyScore: 1,
        entries: [
          createRoutineEntry({
            id: "rbf_box",
            exerciseId: "ex_box_breathing",
            order: 1,
            sets: 1,
            durationSeconds: 180,
            restSeconds: 15,
            notes: "Even inhale, hold, exhale, hold rhythm.",
          }),
          createRoutineEntry({
            id: "rbf_mindful",
            exerciseId: "ex_mindful_breathing",
            order: 2,
            sets: 1,
            durationSeconds: 240,
            restSeconds: 15,
            notes: "Notice drift and return gently.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_body_scan_reset",
        name: "Body Scan Reset",
        description: "A longer nervous-system downshift session with stillness and awareness.",
        notes: "Stay patient and let attention keep settling.",
        difficultyScore: 1,
        entries: [
          createRoutineEntry({
            id: "rbs_body_scan",
            exerciseId: "ex_body_scan",
            order: 1,
            sets: 1,
            durationSeconds: 300,
            restSeconds: 15,
            notes: "Sweep attention slowly through the body.",
          }),
          createRoutineEntry({
            id: "rbs_focus_sit",
            exerciseId: "ex_focus_sit",
            order: 2,
            sets: 1,
            durationSeconds: 180,
            restSeconds: 15,
            notes: "Use one stable attention anchor.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_strength_push_pull_cycle",
        name: "Strength Foundation Circuit",
        description: "Repeatable full-body strength work with simple bodyweight and band patterns.",
        notes: "Keep every rep controlled and stop before form slips.",
        difficultyScore: 2,
        entries: [
          createRoutineEntry({
            id: "rsp_pushup",
            exerciseId: "ex_pushup",
            order: 1,
            sets: 3,
            reps: 8,
            restSeconds: 60,
            notes: "Elevate hands if needed so every rep stays clean.",
          }),
          createRoutineEntry({
            id: "rsp_band_row",
            exerciseId: "ex_band_row",
            order: 2,
            sets: 3,
            reps: 10,
            resistance: "Light Band",
            restSeconds: 45,
            notes: "Pause for one beat at the back.",
          }),
          createRoutineEntry({
            id: "rsp_split_squat",
            exerciseId: "ex_split_squat",
            order: 3,
            sets: 3,
            reps: 8,
            restSeconds: 45,
            notes: "Each side / stay tall and smooth.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_strength_loaded_cycle",
        name: "Loaded Strength Builder",
        description: "Simple dumbbell patterns that introduce stable external loading.",
        notes: "Keep the load honest enough to move well.",
        difficultyScore: 3,
        entries: [
          createRoutineEntry({
            id: "rsl_goblet_squat",
            exerciseId: "ex_goblet_squat",
            order: 1,
            sets: 3,
            reps: 8,
            weight: 12,
            restSeconds: 75,
            notes: "Brace before the descent and own the bottom position.",
          }),
          createRoutineEntry({
            id: "rsl_deadlift",
            exerciseId: "ex_dumbbell_deadlift",
            order: 2,
            sets: 3,
            reps: 8,
            weight: 16,
            restSeconds: 75,
            notes: "Keep the hinge clean rather than chasing range.",
          }),
          createRoutineEntry({
            id: "rsl_press",
            exerciseId: "ex_overhead_press",
            order: 3,
            sets: 3,
            reps: 8,
            weight: 8,
            restSeconds: 60,
            notes: "Press with ribs stacked over hips.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_strength_capacity_cycle",
        name: "Capacity & Control",
        description: "A higher-volume strength day that tests repeatable quality under fatigue.",
        notes: "Stay smooth, breathe between reps, and keep one clean rep in reserve.",
        difficultyScore: 3,
        entries: [
          createRoutineEntry({
            id: "rsc_pushup",
            exerciseId: "ex_pushup",
            order: 1,
            sets: 3,
            reps: 12,
            restSeconds: 60,
            notes: "Break the set only if the line of the body starts to collapse.",
          }),
          createRoutineEntry({
            id: "rsc_band_row",
            exerciseId: "ex_band_row",
            order: 2,
            sets: 3,
            reps: 12,
            resistance: "Medium Band",
            restSeconds: 45,
            notes: "Stay long through the neck as you row.",
          }),
          createRoutineEntry({
            id: "rsc_wall_sit",
            exerciseId: "ex_wall_sit",
            order: 3,
            sets: 3,
            durationSeconds: 40,
            restSeconds: 30,
            notes: "Stay even through both feet and keep breathing.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_parameter_extremes",
        name: "Parameter Extremes Routine",
        description: "A focused manual-check routine with one max-parameter block and one minimal timed block.",
        notes: "Use this routine to inspect the full execution contract in one place before testing player flow manually.",
        difficultyScore: 5,
        entries: [
          createRoutineEntry({
            id: "rpe_precision_split_squat",
            exerciseId: "ex_split_squat",
            order: 1,
            sets: 1,
            restSeconds: 20,
            transitionAfterSeconds: 10,
            transitionLabel: "Reset before quiet wall sit",
            entryBlocks: [
              {
                type: "work",
                label: "Left precision",
                metricType: "reps",
                side: "left",
                reps: 6,
                repTargetMode: "minimum_plus",
                weight: 14,
                holdSeconds: 2,
                tempoMode: "phased",
                tempoDownSeconds: 3,
                tempoBottomHoldSeconds: 1,
                tempoUpSeconds: 1,
                tempoTopHoldSeconds: 1,
                tempoLabel: "Controlled",
                notes: "Stay braced and keep the front foot heavy.",
              },
              {
                type: "switch_side",
                label: "Switch to right side",
                side: "right",
              },
              {
                type: "work",
                label: "Right precision",
                metricType: "reps",
                side: "right",
                reps: 6,
                repTargetMode: "minimum_plus",
                weight: 14,
                holdSeconds: 2,
                tempoMode: "phased",
                tempoDownSeconds: 3,
                tempoBottomHoldSeconds: 1,
                tempoUpSeconds: 1,
                tempoTopHoldSeconds: 1,
                tempoLabel: "Controlled",
                notes: "Stay braced and keep the front foot heavy.",
              },
              { type: "rest", label: "Reset", seconds: 20 },
            ],
          }),
          createRoutineEntry({
            id: "rpe_quiet_wall_sit",
            exerciseId: "ex_wall_sit",
            order: 2,
            sets: 1,
            entryBlocks: [
              {
                type: "work",
                label: "Quiet hold",
                metricType: "duration",
                durationSeconds: 5,
              },
            ],
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_max_reps_check",
        name: "Max Reps Check",
        description: "A manual-check routine that isolates a pure max-rep block so the player asks only for the reps you actually complete.",
        notes: "Use this routine to confirm that a pure open-ended rep goal reads clearly in both routine detail and the live player.",
        difficultyScore: 4,
        entries: [
          createRoutineEntry({
            id: "rmr_band_row_burnout",
            exerciseId: "ex_band_row",
            order: 1,
            sets: 1,
            restSeconds: 15,
            transitionAfterSeconds: 10,
            transitionLabel: "Reset before short wall sit",
            entryBlocks: [
              {
                type: "work",
                label: "Band row burnout",
                metricType: "reps",
                repTargetMode: "max",
                resistance: "Medium",
                tempoMode: "cadence",
                tempoSecondsPerRep: 3,
                tempoLabel: "Steady squeeze",
                notes: "Keep the ribs stacked and stop when the pull loses shape.",
              },
              { type: "rest", label: "Reset", seconds: 15 },
            ],
          }),
          createRoutineEntry({
            id: "rmr_wall_sit_reset",
            exerciseId: "ex_wall_sit",
            order: 2,
            sets: 1,
            entryBlocks: [
              {
                type: "work",
                label: "Short reset hold",
                metricType: "duration",
                durationSeconds: 5,
              },
            ],
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_yoga_grounding_flow",
        name: "Grounding Flow",
        description: "A calm sequence for posture, breathing, and easy spinal movement.",
        notes: "Let the breath set the pace for the whole flow.",
        difficultyScore: 1,
        entries: [
          createRoutineEntry({
            id: "ryg_mountain",
            exerciseId: "ex_mountain_pose",
            order: 1,
            sets: 1,
            durationSeconds: 60,
            restSeconds: 15,
            notes: "Feel the whole foot on the floor before moving on.",
          }),
          createRoutineEntry({
            id: "ryg_cat_cow",
            exerciseId: "ex_cat_cow",
            order: 2,
            sets: 2,
            reps: 8,
            restSeconds: 15,
            notes: "Match one slow breath to each repetition.",
          }),
          createRoutineEntry({
            id: "ryg_hip_flexor",
            exerciseId: "ex_hip_flexor_stretch",
            order: 3,
            sets: 2,
            durationSeconds: 45,
            restSeconds: 15,
            notes: "Each side / stay tall and soft through the jaw.",
          }),
          createRoutineEntry({
            id: "ryg_childs_pose",
            exerciseId: "ex_childs_pose",
            order: 4,
            sets: 1,
            durationSeconds: 60,
            restSeconds: 15,
            notes: "Use the exhale to soften the back body.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_yoga_balance_flow_plus",
        name: "Balance & Length Flow",
        description: "Standing yoga holds that blend steadiness, breath, and lower-body endurance.",
        notes: "Treat each hold as calm skill practice, not a race.",
        difficultyScore: 2,
        entries: [
          createRoutineEntry({
            id: "rybp_downward_dog",
            exerciseId: "ex_downward_dog",
            order: 1,
            sets: 2,
            durationSeconds: 45,
            restSeconds: 15,
            notes: "Press long through the side waist and shoulders.",
          }),
          createRoutineEntry({
            id: "rybp_tree_pose",
            exerciseId: "ex_tree_pose",
            order: 2,
            sets: 2,
            durationSeconds: 30,
            restSeconds: 15,
            notes: "Each side / fix the gaze and breathe steadily.",
          }),
          createRoutineEntry({
            id: "rybp_warrior_two",
            exerciseId: "ex_warrior_two",
            order: 3,
            sets: 2,
            durationSeconds: 45,
            restSeconds: 15,
            notes: "Each side / stay long through both arms.",
          }),
          createRoutineEntry({
            id: "rybp_forward_fold",
            exerciseId: "ex_forward_fold",
            order: 4,
            sets: 1,
            durationSeconds: 45,
            restSeconds: 15,
            notes: "Soften the neck and breathe into the back ribs.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_rehab_hip_support",
        name: "Hip Support Reset",
        description: "Hip and standing-balance work that supports more upright movement control.",
        notes: "Move quietly and own the position before increasing range.",
        difficultyScore: 2,
        entries: [
          createRoutineEntry({
            id: "rrh_clamshell",
            exerciseId: "ex_clamshell",
            order: 1,
            sets: 3,
            reps: 15,
            resistance: "Bodyweight",
            restSeconds: 30,
            notes: "Each side / keep the pelvis stacked.",
          }),
          createRoutineEntry({
            id: "rrh_single_leg_balance",
            exerciseId: "ex_single_leg_balance",
            order: 2,
            sets: 3,
            durationSeconds: 20,
            restSeconds: 30,
            notes: "Each side / use fingertip support if needed.",
          }),
          createRoutineEntry({
            id: "rrh_glute_bridge",
            exerciseId: "ex_glute_bridge",
            order: 3,
            sets: 3,
            reps: 12,
            restSeconds: 30,
            notes: "Drive evenly through both heels.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_rehab_upright_control",
        name: "Upright Control Builder",
        description: "Chair-based strength and balance work for durable everyday posture.",
        notes: "Make every rep look the same from start to finish.",
        difficultyScore: 2,
        entries: [
          createRoutineEntry({
            id: "rru_sit_to_stand",
            exerciseId: "ex_sit_to_stand",
            order: 1,
            sets: 3,
            reps: 10,
            restSeconds: 45,
            notes: "Stand fully tall before lowering back to the chair.",
          }),
          createRoutineEntry({
            id: "rru_bird_dog",
            exerciseId: "ex_bird_dog",
            order: 2,
            sets: 3,
            reps: 8,
            restSeconds: 30,
            notes: "Each side / pause briefly in the long reach.",
          }),
          createRoutineEntry({
            id: "rru_single_leg_balance",
            exerciseId: "ex_single_leg_balance",
            order: 3,
            sets: 3,
            durationSeconds: 30,
            restSeconds: 30,
            notes: "Each side / stay stacked and quiet.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_attention_arrival",
        name: "Attention Arrival",
        description: "A short seated practice that establishes posture, breath, and a reliable anchor.",
        notes: "Sit down, settle quickly, and return gently whenever attention drifts.",
        difficultyScore: 1,
        entries: [
          createRoutineEntry({
            id: "raa_counted_breathing",
            exerciseId: "ex_counted_breathing",
            order: 1,
            sets: 1,
            durationSeconds: 300,
            restSeconds: 15,
            notes: "Count each breath cycle from one to ten, then restart.",
          }),
          createRoutineEntry({
            id: "raa_mindful_breathing",
            exerciseId: "ex_mindful_breathing",
            order: 2,
            sets: 1,
            durationSeconds: 300,
            restSeconds: 15,
            notes: "Let the breath stay natural and keep returning without judgment.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_attention_continuity",
        name: "Continuity Sit",
        description: "A longer breath-and-body session that trains fewer breaks in attention.",
        notes: "Stay patient and keep extending the time spent truly with the practice.",
        difficultyScore: 1,
        entries: [
          createRoutineEntry({
            id: "rac_mindful_breathing",
            exerciseId: "ex_mindful_breathing",
            order: 1,
            sets: 1,
            durationSeconds: 480,
            restSeconds: 15,
            notes: "Feel the breath clearly enough that the mind has less room to wander.",
          }),
          createRoutineEntry({
            id: "rac_body_scan",
            exerciseId: "ex_body_scan",
            order: 2,
            sets: 1,
            durationSeconds: 420,
            restSeconds: 15,
            notes: "Sweep steadily from one region to the next without rushing.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_attention_walking",
        name: "Walking Attention Reset",
        description: "A moving meditation routine that keeps awareness continuous through each step.",
        notes: "Slow down enough that you can actually notice the movement.",
        difficultyScore: 1,
        entries: [
          createRoutineEntry({
            id: "raw_walking_meditation",
            exerciseId: "ex_walking_meditation",
            order: 1,
            sets: 1,
            durationSeconds: 480,
            restSeconds: 15,
            notes: "Track lift, move, and place with the feet.",
          }),
          createRoutineEntry({
            id: "raw_counted_breathing",
            exerciseId: "ex_counted_breathing",
            order: 2,
            sets: 1,
            durationSeconds: 240,
            restSeconds: 15,
            notes: "Finish with a shorter seated breath anchor.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_attention_stability",
        name: "Stability Sit",
        description: "Longer seated attention blocks that emphasize steadiness without strain.",
        notes: "Keep the body quiet enough that the mind has a chance to settle.",
        difficultyScore: 2,
        entries: [
          createRoutineEntry({
            id: "ras_focus_sit",
            exerciseId: "ex_focus_sit",
            order: 1,
            sets: 1,
            durationSeconds: 600,
            restSeconds: 15,
            notes: "Use one clear attention anchor for the whole sit.",
          }),
          createRoutineEntry({
            id: "ras_open_awareness",
            exerciseId: "ex_open_awareness_sit",
            order: 2,
            sets: 1,
            durationSeconds: 360,
            restSeconds: 15,
            notes: "Widen awareness without losing the seat or posture.",
          }),
        ],
      },
      timestamp,
    ),
    createRoutine(
      {
        id: "rt_attention_equanimity",
        name: "Equanimity Sit",
        description: "A longer meditation block that blends stable attention with a softer emotional tone.",
        notes: "Less forcing, more steadiness and patience.",
        difficultyScore: 2,
        entries: [
          createRoutineEntry({
            id: "rae_focus_sit",
            exerciseId: "ex_focus_sit",
            order: 1,
            sets: 1,
            durationSeconds: 900,
            restSeconds: 15,
            notes: "Stay with the anchor and let distractions settle on their own.",
          }),
          createRoutineEntry({
            id: "rae_loving_kindness",
            exerciseId: "ex_loving_kindness",
            order: 2,
            sets: 1,
            durationSeconds: 480,
            restSeconds: 15,
            notes: "Use simple phrases and a warm, steady tone.",
          }),
        ],
      },
      timestamp,
    ),
  ];
}

export function createSeedPlans() {
  const timestamp = new Date().toISOString();

  return [
    createPlan(
      {
        id: "plan_grounded_strength_path",
        name: "Grounded Strength Path",
        description:
          "A four-stage home strength blueprint that starts with repeatable form, introduces external load, and ends with a benchmark you can revisit whenever you need it.",
        goal: "Build a durable full-body strength base with clear load and capacity gates.",
        theme: {
          color: "#F6AD55",
          icon: "STR",
          code: "GSP",
        },
        stages: [
          createStage(
            {
              id: "stg_strength_habit",
              name: "Stage 1: Full-Body Habit",
              guidance:
                "Build a repeatable rhythm first. The goal of this stage is not intensity but showing up consistently, learning the routine order, and finishing each session with one or two clean reps still in reserve.",
              predecessorStageId: null,
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_strength_push_pull_cycle"),
                routineStep("rt_lower_base"),
                restStep(),
              ],
              milestone: {
                description: "Log four full-body sessions with consistent form so the training habit feels stable before load increases.",
                eligibility: { type: "sessions", target: 4, requiresContinuous: false },
                test: { type: "none" },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_strength_load",
              name: "Stage 2: Load Introduction",
              guidance:
                "Keep the same calm session structure while introducing external load. Treat the goblet squat as the anchor movement and keep the rest of the work supportive instead of rushed.",
              predecessorStageId: "stg_strength_habit",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_strength_loaded_cycle"),
                routineStep("rt_strength_push_pull_cycle"),
                restStep(),
              ],
              milestone: {
                description: "Earn two calm cycles, then clear the goblet squat benchmark at the session load before advancing.",
                eligibility: { type: "cycles", target: 2, requiresContinuous: false },
                test: {
                  type: "exercise",
                  source: "stage_entry",
                  exerciseId: "ex_goblet_squat",
                  metric: "reps",
                  target: 8,
                  routineId: "rt_strength_loaded_cycle",
                  routineEntryId: "rsl_goblet_squat",
                },
                onFailure: {
                  action: "none",
                  targetStageId: null,
                },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_strength_capacity",
              name: "Stage 3: Capacity Build",
              guidance:
                "Use this stage to make loaded work repeatable across more total sessions. The aim is posture under fatigue: rows stay organized, push-ups stay honest, and lower-body work does not get sloppy late in the week.",
              predecessorStageId: "stg_strength_load",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_strength_capacity_cycle"),
                routineStep("rt_strength_loaded_cycle"),
                restStep(),
              ],
              milestone: {
                description: "Stack five sessions, then clear the medium-band row benchmark without losing posture or control.",
                eligibility: { type: "sessions", target: 5, requiresContinuous: false },
                test: {
                  type: "exercise",
                  source: "stage_entry",
                  exerciseId: "ex_band_row",
                  metric: "reps",
                  target: 12,
                  routineId: "rt_strength_capacity_cycle",
                  routineEntryId: "rsc_band_row",
                },
                onFailure: {
                  action: "none",
                  targetStageId: null,
                },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_strength_repeatable",
              name: "Stage 4: Repeatable Strength",
              guidance:
                "This is the benchmark stage. Keep rotating the same two sessions, revisit the push-up test whenever you are ready, and treat a failed test as a signal to rebuild load tolerance instead of as a dead end.",
              predecessorStageId: "stg_strength_capacity",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_strength_capacity_cycle"),
                routineStep("rt_strength_loaded_cycle"),
                restStep(),
              ],
              milestone: {
                description: "This final benchmark is always available: pass 18 clean push-ups or loop back to the load stage for another build cycle.",
                eligibility: { type: "none", target: null, requiresContinuous: false },
                test: {
                  type: "exercise",
                  source: "stage_entry",
                  exerciseId: "ex_pushup",
                  metric: "reps",
                  target: 18,
                  routineId: "rt_strength_capacity_cycle",
                  routineEntryId: "rsc_pushup",
                },
                onFailure: {
                  action: "goto_stage",
                  targetStageId: "stg_strength_load",
                },
              },
            },
            timestamp,
          ),
        ],
      },
      timestamp,
    ),
    createPlan(
      {
        id: "plan_parameter_extremes",
        name: "Parameter Extremes Blueprint",
        description:
          "A tiny manual-check blueprint that isolates one max-density execution block and one minimal single-metric block.",
        goal: "Inspect whether routine detail and player stay clear at both ends of the execution contract.",
        theme: {
          color: "#4FD1C5",
          icon: "PX",
          code: "PXT",
        },
        stages: [
          createStage(
            {
              id: "stg_parameter_extremes",
              name: "Stage 1: Parameter Extremes",
              guidance:
                "Use this stage as a manual inspection harness. The first entry stresses rep goals, side, load, hold, tempo, switch, rest, and transition. The second entry proves the minimal timed case stays lightweight.",
              predecessorStageId: null,
              transitionRule: "prompt_user",
              schedule: [routineStep("rt_parameter_extremes")],
              milestone: {
                description: "This blueprint is for inspection only, so one clean guided session is enough.",
                eligibility: { type: "sessions", target: 1, requiresContinuous: false },
                test: { type: "none" },
              },
            },
            timestamp,
          ),
        ],
      },
      timestamp,
    ),
    createPlan(
      {
        id: "plan_max_reps_check",
        name: "Max Reps Check Blueprint",
        description:
          "A tiny manual-check blueprint that isolates a pure max-rep block so you can verify the player asks for actual completed reps instead of implying a fixed target.",
        goal: "Inspect whether a pure max-rep set reads clearly in routine detail and the live player.",
        theme: {
          color: "#F6AD55",
          icon: "MR",
          code: "MRX",
        },
        stages: [
          createStage(
            {
              id: "stg_max_reps_check",
              name: "Stage 1: Max Reps Check",
              guidance:
                "Use this stage as a manual inspection harness. The first entry is a pure max-rep block with no fixed rep count, and the second entry proves the routine can still flow cleanly into the next activity.",
              predecessorStageId: null,
              transitionRule: "prompt_user",
              schedule: [routineStep("rt_max_reps_check")],
              milestone: {
                description: "One guided session is enough to inspect the open-ended rep goal behavior.",
                eligibility: { type: "sessions", target: 1, requiresContinuous: false },
                test: { type: "none" },
              },
            },
            timestamp,
          ),
        ],
      },
      timestamp,
    ),
    createPlan(
      {
        id: "plan_steady_balance_flow",
        name: "Steady Balance Flow",
        description:
          "A mobility and yoga ladder that starts with grounding, then builds balance confidence and longer posture holds without relying on rest days.",
        goal: "Move from calm daily mobility into confident balance and posture endurance.",
        theme: {
          color: "#9F7AEA",
          icon: "YOG",
          code: "SBF",
        },
        stages: [
          createStage(
            {
              id: "stg_yoga_grounding",
              name: "Stage 1: Ground And Breathe",
              guidance:
                "Learn the sequence and let the breath set the pace. This stage is about comfort with the shapes, not depth or heroic balance, so every hold should still feel calm and organized.",
              predecessorStageId: null,
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_yoga_grounding_flow"),
                routineStep("rt_mobility_reset"),
              ],
              milestone: {
                description: "Accumulate four grounding sessions so posture and breath feel familiar before balance becomes the main challenge.",
                eligibility: { type: "sessions", target: 4, requiresContinuous: false },
                test: { type: "none" },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_yoga_tree",
              name: "Stage 2: Static Balance",
              guidance:
                "Now balance becomes the main training task. Use the grounding flow to arrive, then practice standing stability without gripping through the jaw or shoulders when Tree Pose gets demanding.",
              predecessorStageId: "stg_yoga_grounding",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_yoga_balance_flow_plus"),
                routineStep("rt_yoga_grounding_flow"),
              ],
              milestone: {
                description: "Earn two calm cycles, then hold Tree Pose long enough to prove the stance is steady rather than lucky.",
                eligibility: { type: "cycles", target: 2, requiresContinuous: false },
                test: {
                  type: "exercise",
                  source: "stage_entry",
                  exerciseId: "ex_tree_pose",
                  metric: "duration",
                  target: 45,
                  routineId: "rt_yoga_balance_flow_plus",
                  routineEntryId: "rybp_tree_pose",
                },
                onFailure: {
                  action: "none",
                  targetStageId: null,
                },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_yoga_length",
              name: "Stage 3: Flow Endurance",
              guidance:
                "Stay with longer holds and longer total sessions so balance is not just a lucky moment. The stage succeeds when breathing stays quiet while postures ask more from the hips and trunk.",
              predecessorStageId: "stg_yoga_tree",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_yoga_balance_flow_plus"),
                routineStep("rt_yoga_grounding_flow"),
              ],
              milestone: {
                description: "Add five more flow sessions so longer holds feel normal and breathing stays quiet under fatigue.",
                eligibility: { type: "sessions", target: 5, requiresContinuous: false },
                test: { type: "none" },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_yoga_confidence",
              name: "Stage 4: Stance Confidence",
              guidance:
                "Treat this final stage like a confidence block. Consecutive cycles matter here because the plan is checking whether stable balance and calm breathing can be repeated, not just achieved once.",
              predecessorStageId: "stg_yoga_length",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_yoga_balance_flow_plus"),
                routineStep("rt_yoga_grounding_flow"),
              ],
              milestone: {
                description: "String together two consecutive cycles, then hold Warrior II with calm breathing to finish the path.",
                eligibility: { type: "cycles", target: 2, requiresContinuous: true },
                test: {
                  type: "exercise",
                  source: "stage_entry",
                  exerciseId: "ex_warrior_two",
                  metric: "duration",
                  target: 60,
                  routineId: "rt_yoga_balance_flow_plus",
                  routineEntryId: "rybp_warrior_two",
                },
                onFailure: {
                  action: "restart_stage",
                  targetStageId: null,
                },
              },
            },
            timestamp,
          ),
        ],
      },
      timestamp,
    ),
    createPlan(
      {
        id: "plan_posture_rebuild_path",
        name: "Posture Rebuild Path",
        description:
          "A four-stage rehab-style journey that rebuilds trunk control, hip stability, and upright movement without turning the app into a therapy encyclopedia.",
        goal: "Rebuild posture-friendly control that carries into standing, balance, and everyday strength.",
        theme: {
          color: "#4FD1C5",
          icon: "RHB",
          code: "PRP",
        },
        stages: [
          createStage(
            {
              id: "stg_posture_reset",
              name: "Stage 1: Reset And Support",
              guidance:
                "Strip the work back to trunk control, hip support, and easy recovery spacing. The point is to create a reliable base that feels restorative enough to repeat without flare-ups or compensation.",
              predecessorStageId: null,
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_rehab_core"),
                restStep(),
                routineStep("rt_rehab_hip_support"),
              ],
              milestone: {
                description: "Log four restorative control sessions before longer standing work becomes the focus.",
                eligibility: { type: "sessions", target: 4, requiresContinuous: false },
                test: { type: "none" },
                feedbackPrompts: [
                  {
                    id: "fb_posture_reset_symptoms",
                    label: "How did numbness, tingling, or irritation feel after this session?",
                    placeholder: "e.g. Less tingling in the hand, no change, or more noticeable during the second routine.",
                  },
                  {
                    id: "fb_posture_reset_function",
                    label: "What felt easier or harder in daily life today?",
                    placeholder: "e.g. Sitting, typing, standing, gripping, or sleeping felt easier or still felt limited.",
                  },
                ],
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_posture_control",
              name: "Stage 2: Standing Control",
              guidance:
                "Move the same calm control into upright positions. This stage is about proving that balance, bracing, and hip support still hold together once you leave the floor and spend more time standing.",
              predecessorStageId: "stg_posture_reset",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_rehab_core"),
                routineStep("rt_rehab_upright_control"),
                restStep(),
              ],
              milestone: {
                description: "Earn two cycles, then hold single-leg balance long enough to show the hips can stabilize the trunk.",
                eligibility: { type: "cycles", target: 2, requiresContinuous: false },
                test: {
                  type: "exercise",
                  source: "stage_entry",
                  exerciseId: "ex_single_leg_balance",
                  metric: "duration",
                  target: 30,
                  routineId: "rt_rehab_upright_control",
                  routineEntryId: "rru_single_leg_balance",
                },
                onFailure: {
                  action: "none",
                  targetStageId: null,
                },
                feedbackPrompts: [
                  {
                    id: "fb_posture_control_balance",
                    label: "Did standing balance feel steadier, shakier, or about the same today?",
                    placeholder: "e.g. Left side still shaky, right side steadier, or balance felt calmer overall.",
                  },
                ],
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_posture_capacity",
              name: "Stage 3: Upright Capacity",
              guidance:
                "Build staying power in the new upright pattern. Sessions should feel like practice for daily life: smooth, repeatable, and calm enough that posture control survives more total work.",
              predecessorStageId: "stg_posture_control",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_rehab_hip_support"),
                routineStep("rt_rehab_upright_control"),
                restStep(),
              ],
              milestone: {
                description: "Accumulate five upright-control sessions so the new pattern feels normal in daily movement instead of fragile.",
                eligibility: { type: "sessions", target: 5, requiresContinuous: false },
                test: { type: "none" },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_posture_benchmark",
              name: "Stage 4: Everyday Benchmark",
              guidance:
                "Use this stage to prove the rebuild carries into a simple everyday movement benchmark. The sit-to-stand test should look smooth and tall rather than fast, and a failed test sends you back to rebuild standing control.",
              predecessorStageId: "stg_posture_capacity",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_rehab_upright_control"),
                routineStep("rt_rehab_core"),
                restStep(),
              ],
              milestone: {
                description: "After two consecutive cycles, pass a 15-rep sit-to-stand benchmark or return to the standing-control stage for another build block.",
                eligibility: { type: "cycles", target: 2, requiresContinuous: true },
                test: {
                  type: "exercise",
                  source: "custom",
                  exerciseId: "ex_sit_to_stand",
                  metric: "reps",
                  target: 15,
                  routineId: null,
                  routineEntryId: null,
                  weight: null,
                  resistance: null,
                  restSeconds: 30,
                  notes: "Use a chair height that lets every rep stay smooth and tall.",
                },
                onFailure: {
                  action: "goto_stage",
                  targetStageId: "stg_posture_control",
                },
              },
            },
            timestamp,
          ),
        ],
      },
      timestamp,
    ),
    createPlan(
      {
        id: "plan_ten_stage_attention_training",
        name: "Ten-Stage Attention Training",
        description:
          "A ten-stage meditation ladder that moves from establishing the daily sit into longer, calmer, and steadier attention practice.",
        goal: "Build a repeatable attention practice from habit formation to long, settled, equanimous sits.",
        theme: {
          color: "#68D391",
          icon: "CALM",
          code: "TAT",
        },
        stages: [
          createStage(
            {
              id: "stg_attn_establish",
              name: "Stage 1: Establish The Daily Sit",
              guidance:
                "Make the practice easy to begin and easy to repeat. Keep the sits short, use the same place and posture whenever possible, and let simply showing up be the whole success condition.",
              predecessorStageId: null,
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_attention_arrival"),
              ],
              milestone: {
                description: "Show up for five short sits so the habit exists before any deeper benchmark matters.",
                eligibility: { type: "sessions", target: 5, requiresContinuous: false },
                test: { type: "none" },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_attn_return",
              name: "Stage 2: Notice And Return",
              guidance:
                "The core skill here is recognizing drift without frustration. Short walking sessions help widen the practice so returning to the breath becomes gentle and regular instead of forceful.",
              predecessorStageId: "stg_attn_establish",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_attention_arrival"),
                routineStep("rt_attention_walking"),
              ],
              milestone: {
                description: "Log six sessions where noticing drift and gently returning becomes the real skill.",
                eligibility: { type: "sessions", target: 6, requiresContinuous: false },
                test: { type: "none" },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_attn_continuity",
              name: "Stage 3: Extend Continuous Attention",
              guidance:
                "Start lengthening the stretches of continuous attention. This stage is not about never wandering; it is about sustaining the breath as the primary object for longer before the next reset is needed.",
              predecessorStageId: "stg_attn_return",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_attention_continuity"),
                routineStep("rt_attention_arrival"),
              ],
              milestone: {
                description: "Earn two cycles, then complete an eight-minute focused sit to show attention can stay continuous for longer.",
                eligibility: { type: "cycles", target: 2, requiresContinuous: false },
                test: {
                  type: "exercise",
                  source: "custom",
                  exerciseId: "ex_focus_sit",
                  metric: "duration",
                  target: 480,
                  routineId: null,
                  routineEntryId: null,
                  weight: null,
                  resistance: null,
                  restSeconds: 30,
                  notes: "Stay with one clear breath anchor for the full sit.",
                },
                onFailure: {
                  action: "none",
                  targetStageId: null,
                },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_attn_stabilize",
              name: "Stage 4: Stabilize The Anchor",
              guidance:
                "Stay with the same anchor long enough that the sit begins to feel steadier from the beginning. Walking practice remains in the loop so attention quality does not depend on perfect stillness alone.",
              predecessorStageId: "stg_attn_continuity",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_attention_continuity"),
                routineStep("rt_attention_walking"),
              ],
              milestone: {
                description: "Log six more sessions so longer attention feels repeatable rather than occasional.",
                eligibility: { type: "sessions", target: 6, requiresContinuous: false },
                test: { type: "none" },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_attn_clarity",
              name: "Stage 5: Sharpen Clarity",
              guidance:
                "Now the work shifts from simply staying with the breath to perceiving it more clearly. The stage asks for more vivid, less foggy attention without sacrificing the gentleness you built in the earlier stages.",
              predecessorStageId: "stg_attn_stabilize",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_attention_continuity"),
                routineStep("rt_attention_stability"),
              ],
              milestone: {
                description: "After two full cycles, pass the ten-minute focused-sit benchmark from the stability routine.",
                eligibility: { type: "cycles", target: 2, requiresContinuous: false },
                test: {
                  type: "exercise",
                  source: "stage_entry",
                  exerciseId: "ex_focus_sit",
                  metric: "duration",
                  target: 600,
                  routineId: "rt_attention_stability",
                  routineEntryId: "ras_focus_sit",
                },
                onFailure: {
                  action: "none",
                  targetStageId: null,
                },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_attn_quiet",
              name: "Stage 6: Quiet Subtle Drift",
              guidance:
                "Use this stage to reduce the softer forms of wandering and restlessness. Sessions should feel quieter, less pushy, and more settled in the body even when attention is not perfectly continuous yet.",
              predecessorStageId: "stg_attn_clarity",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_attention_stability"),
                routineStep("rt_attention_walking"),
              ],
              milestone: {
                description: "Complete six sessions that reduce subtle drift and make the body feel more settled in stillness.",
                eligibility: { type: "sessions", target: 6, requiresContinuous: false },
                test: { type: "none" },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_attn_open",
              name: "Stage 7: Effortless Returning",
              guidance:
                "Begin loosening the effort around the practice. Open-awareness work appears here so the breath is still a home base, but awareness can widen without the posture collapsing or the mind dulling.",
              predecessorStageId: "stg_attn_quiet",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_attention_stability"),
                routineStep("rt_attention_continuity"),
              ],
              milestone: {
                description: "Earn two cycles, then hold open awareness for eight minutes without losing the seat or posture.",
                eligibility: { type: "cycles", target: 2, requiresContinuous: false },
                test: {
                  type: "exercise",
                  source: "custom",
                  exerciseId: "ex_open_awareness_sit",
                  metric: "duration",
                  target: 480,
                  routineId: null,
                  routineEntryId: null,
                  weight: null,
                  resistance: null,
                  restSeconds: 30,
                  notes: "Let awareness stay broad while the posture remains quiet and awake.",
                },
                onFailure: {
                  action: "restart_stage",
                  targetStageId: null,
                },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_attn_calm",
              name: "Stage 8: Deepen Calm And Ease",
              guidance:
                "Longer sessions matter more here than novelty. The point is to make calm and ease familiar enough that they show up reliably, rather than only in your best sessions.",
              predecessorStageId: "stg_attn_open",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_attention_stability"),
                routineStep("rt_attention_equanimity"),
              ],
              milestone: {
                description: "Log eight longer sessions so calmer attention becomes familiar and less effortful.",
                eligibility: { type: "sessions", target: 8, requiresContinuous: false },
                test: { type: "none" },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_attn_equanimity",
              name: "Stage 9: Joy And Equanimity",
              guidance:
                "Stay with the longer sits while reducing the urge to interfere with every sensation. This stage is about stable calm that can hold challenge, pleasantness, and boredom without breaking the seat.",
              predecessorStageId: "stg_attn_calm",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_attention_equanimity"),
                routineStep("rt_attention_stability"),
              ],
              milestone: {
                description: "String together two consecutive cycles, then complete the fifteen-minute focused sit to prove calm endurance.",
                eligibility: { type: "cycles", target: 2, requiresContinuous: true },
                test: {
                  type: "exercise",
                  source: "stage_entry",
                  exerciseId: "ex_focus_sit",
                  metric: "duration",
                  target: 900,
                  routineId: "rt_attention_equanimity",
                  routineEntryId: "rae_focus_sit",
                },
                onFailure: {
                  action: "goto_stage",
                  targetStageId: "stg_attn_open",
                },
              },
            },
            timestamp,
          ),
          createStage(
            {
              id: "stg_attn_carry",
              name: "Stage 10: Carry Stability Forward",
              guidance:
                "Treat the final stage as integration rather than graduation. The benchmark is longer, but the real aim is to carry steadiness, patience, and gentle returning into any future sit you choose to build from here.",
              predecessorStageId: "stg_attn_equanimity",
              transitionRule: "prompt_user",
              schedule: [
                routineStep("rt_attention_equanimity"),
                routineStep("rt_attention_walking"),
              ],
              milestone: {
                description: "The final benchmark is always available: complete a twenty-minute focused sit that ties steadiness, patience, and gentle return together.",
                eligibility: { type: "none", target: null, requiresContinuous: false },
                test: {
                  type: "exercise",
                  source: "custom",
                  exerciseId: "ex_focus_sit",
                  metric: "duration",
                  target: 1200,
                  routineId: null,
                  routineEntryId: null,
                  weight: null,
                  resistance: null,
                  restSeconds: 30,
                  notes: "Use the breath as the home base and keep returning without aggression.",
                },
                onFailure: {
                  action: "none",
                  targetStageId: null,
                },
              },
            },
            timestamp,
          ),
        ],
      },
      timestamp,
    ),
  ];
}
