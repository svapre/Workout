/**
 * Master Seed Data Defaults
 *
 * Injects strictly linked Routines and Plans.
 */

import { createDefaultMilestone } from "./schemaMigration.js";

export function createSeedRoutines() {
  return [
    {
      id: "rt_rehab_core",
      name: "Posture & Core Rehab",
      description: "Focus on control and stability.",
      notes: "Focus on control and stability.",
      isCustom: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      difficultyScore: 1,
      entries: [
        {
          id: "inst_1",
          exerciseId: "ex_bird_dog",
          order: 1,
          sets: 3,
          reps: null,
          durationSeconds: 60,
          weight: null,
          resistance: null,
          restSeconds: 30,
          notes: "Focus on anti-rotation.",
        },
        {
          id: "inst_2",
          exerciseId: "ex_glute_bridge",
          order: 2,
          sets: 3,
          reps: 15,
          durationSeconds: null,
          weight: null,
          resistance: null,
          restSeconds: 30,
          notes: "Drive through heels.",
        },
      ],
    },
    {
      id: "rt_upper_base",
      name: "Upper Body Base",
      description: "Compound pushing and pulling.",
      notes: "Compound pushing and pulling.",
      isCustom: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      difficultyScore: 1,
      entries: [
        {
          id: "inst_3",
          exerciseId: "ex_pushup",
          order: 1,
          sets: 3,
          reps: 10,
          durationSeconds: null,
          weight: null,
          resistance: null,
          restSeconds: 60,
          notes: "Strict form, no sagging.",
        },
        {
          id: "inst_4",
          exerciseId: "ex_band_row",
          order: 2,
          sets: 3,
          reps: 15,
          durationSeconds: null,
          weight: null,
          resistance: null,
          restSeconds: 45,
          notes: "Squeeze shoulder blades.",
        },
      ],
    },
  ];
}

export function createSeedPlans() {
  return [
    {
      id: "plan_master_rehab_strength",
      version: "1.0",
      name: "Phase 1: Posture & Base Strength",
      description:
        "Build core stability for long sitting hours and baseline pushing strength.",
      goal: "",
      theme: {
        color: "#4FD1C5",
        icon: "🧘",
        code: "RHB",
      },
      createdAt: new Date().toISOString(),
      stages: [
        {
          id: "stg_1_core",
          name: "Stage 1: Core Activation",
          predecessorStageId: null,
          transitionRule: "prompt_user",
          schedule: [
            { type: "routine", routineId: "rt_rehab_core" },
            { type: "routine", routineId: "rt_rehab_core" },
          ],
          milestone: createDefaultMilestone({
            description: "Pass the Bird Dog control test to move on.",
            eligibility: { type: "none", target: null, requiresContinuous: false },
            test: {
              type: "exercise",
              source: "stage_entry",
              exerciseId: "ex_bird_dog",
              metric: "duration",
              target: 60,
              routineId: "rt_rehab_core",
              routineEntryId: "inst_1",
            },
          }),
        },
        {
          id: "stg_2_strength",
          name: "Stage 2: Integration",
          predecessorStageId: null,
          transitionRule: "prompt_user",
          schedule: [
            { type: "routine", routineId: "rt_upper_base" },
            { type: "routine", routineId: "rt_rehab_core" },
          ],
          milestone: createDefaultMilestone({
            description: "Pass the push-up benchmark to unlock the next phase.",
            eligibility: { type: "sessions", target: 4, requiresContinuous: false },
            test: {
              type: "exercise",
              source: "stage_entry",
              exerciseId: "ex_pushup",
              metric: "reps",
              target: 20,
              routineId: "rt_upper_base",
              routineEntryId: "inst_3",
            },
          }),
        },
      ],
    },
  ];
}
