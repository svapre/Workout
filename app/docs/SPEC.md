# Data Specification
Last updated: 2026-05-08
Version: 1.2

Any AI working on this project MUST read this file before
touching any data layer code.
These schemas are locked.
Do not modify field names or types without:
1. Discussing with the human owner
2. Getting explicit approval
3. Updating this file in the same commit

---

## BODY MAP ENTRY
{
  id: string,           // e.g. "bm_quads"
  name: string,
  category: "muscle" | "joint" | "neural" | "mental" | "custom",
  isCustom: boolean
}
Pre-populated with 14 muscle groups:
bm_chest, bm_back, bm_shoulders, bm_biceps, bm_triceps,
bm_forearms, bm_core, bm_lower_back, bm_glutes, bm_quads,
bm_hamstrings, bm_calves, bm_hip_flexors, bm_neck

---

## EXERCISE
{
  id: string,
  slug: string,
  name: string,
  description: string,
  type: "physical" | "mobility" | "mental" | "custom",
  trackingType: "reps" | "duration" | "weight" | "resistance", // default / preferred mode
  supportedTrackingModes: ["reps" | "duration" | "weight" | "resistance"],
  bodyTargets: [bodyMapId],
  equipment: [string],
  cues: [string],
  restSeconds: number,
  aliases: [string],
  movementPattern: string,
  whyItHelps: string,
  isCustom: boolean
}
Rule: `trackingType` is the exercise's default/preferred tracking mode.
`supportedTrackingModes` defines the valid tracking modes the exercise can
be prescribed or tested with. Exact reps/duration/weight/resistance values
still live on routine entries or milestone tests, not on the base exercise.
Rule: if a variation changes the movement or benchmark meaningfully,
create a separate exercise instead of overloading one exercise record
with unrelated variants.

---

## ROUTINE
{
  id: string,
  name: string,
  description: string,
  notes: string,
  difficultyScore: number,
  createdAt: timestamp,
  updatedAt: timestamp,
  isCustom: boolean,
  entries: [
    {
      id: string,
      exerciseId: string,
      order: number,
      sets: number,
      reps: number | null,
      durationSeconds: number | null,
      weight: number | null,
      resistance: string | null,
      restSeconds: number | null,
      notes: string
    }
  ]
}

---

## PLAN BLUEPRINT
Static template. Locked at creation. Not modified during use.
{
  id: string,
  version: string,
  name: string,
  description: string,
  goal: string,
  theme: { color, icon, code },
  createdAt: timestamp,
  stages: [
    {
      id: string,
      name: string,
      predecessorStageId: string | null,
      schedule: [
        { type: "routine" | "rest", routineId: string | null }
      ],
      milestone: {
        description: string,
        eligibility: {
          type: "none" | "cycles" | "sessions",
          target: number | null,
          requiresContinuous: boolean
        },
        test: {
          type: "none" | "exercise",
          source: "stage_entry" | "custom",
          exerciseId: string | null,
          metric: "reps" | "duration" | null,
          target: number | null,
          routineId: string | null,
          routineEntryId: string | null,
          weight: number | null,
          resistance: string | null,
          restSeconds: number | null,
          notes: string
        },
        onFailure: {
          action: "restart_stage" | "goto_stage" | "none",
          targetStageId: string | null
        }
      },
      transitionRule: "prompt_user" | "manual"
    }
  ]
}

Milestone model:
- `eligibility` decides when a stage is unlocked for completion or for taking a test
- `test.type === "none"` means stage completion is driven by eligibility alone
- `test.type === "exercise"` means the stage is only complete after an explicit milestone test is passed
- `source: "stage_entry"` means the test inherits exercise details from a routine entry already in the stage schedule
- `source: "custom"` means the test defines its own exercise details directly in the milestone
- `weight` and `resistance` are pass conditions for the test, while `metric` stays limited to `reps` or `duration`

---

## ACTIVE PLAN
The living document. Evolves independently from blueprint.
NO activeState nested object. All fields are top-level.
{
  id: string,
  name: string,
  displayName: string,   // user-visible instance name
  description: string,
  goal: string,
  theme: { color, icon, code },
  version: string,
  versionHistory: [
    {
      version: string,
      modifiedAt: timestamp,
      modifiedBy: "user" | "import",
      changeSummary: string
    }
  ],
  blueprintId: string | null,
  blueprintVersion: string | null,
  startedAt: timestamp,
  currentStageIndex: number,
  currentDayInCycle: number,
  currentCycleCount: number,
  streakDays: number,
  lastSessionDate: string | null,
  stageHistory: [
    {
      stageId: string,
      stageName: string,
      startedAt: timestamp,
      completedAt: timestamp | null,
      completedVia: "milestone" | "user_override" | null,
      failureCount: number
    }
  ],
  sessions: [sessionId],
  stages: [ ...same schema as blueprint stages ]
}

CRITICAL: No activeState nested object anywhere.
If you see activeState.* in any code, that is a bug.
Report it immediately. Do not work around it.

---

## WORKOUT SESSION
Stored in workoutRepository only.
Active plan stores session IDs in sessions array only.
{
  id: string,
  activePlanId: string,
  activePlanVersion: string,
  routineId: string | null,
  stageId: string,
  startedAt: timestamp,
  completedAt: timestamp,
  sessionType: "routine" | "milestone_test",
  milestoneTest: {
    exerciseId: string | null,
    metric: "reps" | "duration" | null,
    target: number | null,
    result: "passed" | "failed" | null
  } | null,
  reflectionRating: "strong" | "normal" | "difficult" | null,
  sets: [
    {
      exerciseId: string,
      setNumber: number,
      status: "completed" | "failed" | "partial" | "skipped",
      actualReps: number | null,
      actualDurationSec: number | null,
      actualWeightKg: number | null,
      actualResistance: string | null
    }
  ]
}

---

## EXPORT PACKAGE
{
  exportVersion: "1.0",
  exportedAt: timestamp,
  activePlan: { ...full active plan },
  sessions: [ ...all session records including reflectionRating ],
  exercises: [ ...referenced exercises ],
  routines: [ ...referenced routines ],
  bodyTargets: [ ...referenced body map entries ]
}

---

## LOCALSTORAGE KEYS
workout-app.state.v1       → { routines }
workout-app.exercises.v1   → { exercises }
workout-app.workouts.v1    → { workouts (sessions) }
workout-app.plans.v1       → { plan_blueprints }
workout-app.activePlans.v1 → { active_plans }
workout-app.archivedPlans.v1 → archived plan array
workout-app.bodymap.v1     → { bodyMap entries }
---
