import assert from "node:assert/strict";

import {
  EXERCISE_METADATA_REGISTRY,
  buildExerciseDetailModel,
  buildRoutineCompactModel,
  buildStageStudyModel,
} from "./src/features/library/displayModels.js";

const exercise = {
  id: "ex_test_balance_hold",
  slug: "test-balance-hold",
  name: "Test Balance Hold",
  type: "mobility",
  description: "Short drill for validating compact metadata propagation.",
  bodyTargets: ["bm_core", "bm_glutes"],
  equipment: ["Mat"],
  trackingType: "duration",
  supportedTrackingModes: ["duration"],
  movementPattern: "stability",
  sideBalance: "Left / Right",
};

const routine = {
  id: "rt_test_balance_flow",
  name: "Balance Flow",
  entries: [
    {
      id: "entry_balance_hold",
      exerciseId: exercise.id,
      order: 1,
      durationSeconds: 30,
      sets: 2,
      notes: "Stay even on both sides.",
    },
  ],
};

const stage = {
  id: "stage_balance_check",
  name: "Balance Stage",
  guidance: "A simple stage for validating study rollups.",
  schedule: [{ type: "routine", routineId: routine.id }],
  milestone: {
    eligibility: { type: "sessions", target: 1, requiresContinuous: false },
    test: { type: "none" },
  },
};

const detailBefore = buildExerciseDetailModel(exercise);
assert(
  detailBefore.detailFields.some(
    (field) => field.key === "sideBalance" && field.items.some((item) => item.label === "Left / Right"),
  ),
  "Synthetic exercise metadata should appear on Exercise Detail by default.",
);

const routineBefore = buildRoutineCompactModel(routine, [exercise]);
assert(
  !routineBefore.aggregateFields.some((field) => field.key === "sideBalance"),
  "Synthetic exercise metadata should not roll into routine compact by default.",
);

const stageBefore = buildStageStudyModel(stage, [routine], [exercise]);
assert(
  !stageBefore.scheduleSteps[0].routine.aggregateFields.some((field) => field.key === "sideBalance"),
  "Synthetic exercise metadata should not roll into stage study by default.",
);

const registryField = {
  key: "sideBalance",
  label: "Side balance",
  primitive: "badge-list",
  showOnDetail: true,
  showOnCompact: true,
  rollup: true,
  resolve(candidate) {
    return candidate?.sideBalance ? [{ value: candidate.sideBalance, label: String(candidate.sideBalance) }] : [];
  },
};

EXERCISE_METADATA_REGISTRY.push(registryField);

try {
  const routineAfter = buildRoutineCompactModel(routine, [exercise]);
  assert(
    routineAfter.aggregateFields.some(
      (field) => field.key === "sideBalance" && field.items.some((item) => item.label === "Left / Right"),
    ),
    "Registry-promoted metadata should flow into routine compact automatically.",
  );

  const stageAfter = buildStageStudyModel(stage, [routine], [exercise]);
  assert(
    stageAfter.scheduleSteps[0].routine.aggregateFields.some(
      (field) => field.key === "sideBalance" && field.items.some((item) => item.label === "Left / Right"),
    ),
    "Registry-promoted metadata should flow into stage study automatically.",
  );
} finally {
  EXERCISE_METADATA_REGISTRY.pop();
}

console.log("base-to-journey model checks passed");

