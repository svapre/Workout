import { parseTrainingPlanImport } from "./src/data/import/trainingPlanImport.js";
import { createPlanService } from "./src/features/plans/planService.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const exerciseCatalog = [
  {
    id: "ex_pushup",
    slug: "push-up",
    name: "Push-Up",
    type: "physical",
    trackingType: "reps",
    supportedTrackingModes: ["reps"],
    bodyTargets: [],
    equipment: [],
    cues: [],
    restSeconds: 60,
    aliases: [],
    movementPattern: "push",
    whyItHelps: "",
    isCustom: false,
  },
  {
    id: "ex_bird_dog",
    slug: "bird-dog",
    name: "Bird Dog",
    type: "mobility",
    trackingType: "reps",
    supportedTrackingModes: ["reps", "duration"],
    bodyTargets: [],
    equipment: [],
    cues: [],
    restSeconds: 30,
    aliases: [],
    movementPattern: "stability",
    whyItHelps: "",
    isCustom: false,
  },
];

const invalidTrainingPlan = JSON.stringify({
  type: "training_plan",
  planName: "Invalid Push-Up Duration",
  exerciseCatalog: [],
  routines: [
    {
      id: "rt_invalid",
      name: "Invalid Routine",
      entries: [
        {
          id: "entry_invalid",
          exerciseId: "ex_pushup",
          sets: 3,
          reps: null,
          durationSeconds: 30,
        },
      ],
    },
  ],
  stages: [
    {
      id: "stage_invalid",
      name: "Stage Invalid",
      schedule: [{ type: "routine", routineId: "rt_invalid" }],
      milestone: {
        description: "Bad test",
        test: {
          type: "exercise",
          source: "custom",
          exerciseId: "ex_pushup",
          metric: "duration",
          target: 30,
        },
      },
    },
  ],
});

let parserFailed = false;
try {
  parseTrainingPlanImport(invalidTrainingPlan, {
    existingExercises: exerciseCatalog,
    usedExerciseSlugs: new Set(exerciseCatalog.map((exercise) => exercise.slug)),
  });
} catch (error) {
  parserFailed = error.code === "INVALID_ROUTINE_ENTRY_MODE" || error.code === "INVALID_MILESTONE_TEST";
}
assert(parserFailed, "parseTrainingPlanImport should reject unsupported routine or milestone mode combinations.");

function createArrayRepo(initial = []) {
  let items = JSON.parse(JSON.stringify(initial));
  return {
    list() {
      return JSON.parse(JSON.stringify(items));
    },
    replaceAll(next) {
      items = JSON.parse(JSON.stringify(next));
    },
  };
}

const blueprintRepo = createArrayRepo([]);
const activeRepo = createArrayRepo([]);
const exerciseRepo = createArrayRepo(exerciseCatalog);
const routineRepo = createArrayRepo([]);
const bodyMapRepo = createArrayRepo([]);
const routineService = {
  importPrepared(routines) {
    const current = routineRepo.list();
    routineRepo.replaceAll([...current, ...routines]);
    return { count: routines.length };
  },
};

const planService = createPlanService(blueprintRepo, activeRepo, {
  exerciseRepository: exerciseRepo,
  routineRepository: routineRepo,
  bodyMapRepository: bodyMapRepo,
  workoutRepository: createArrayRepo([]),
});

const invalidFullPlan = {
  plan: {
    id: "plan_invalid",
    version: "1.0",
    name: "Invalid Full Import",
    description: "",
    goal: "",
    theme: { color: "#4FD1C5", icon: "IV", code: "inv" },
    createdAt: "2026-05-08T00:00:00.000Z",
    stages: [
      {
        id: "stage_invalid",
        name: "Stage Invalid",
        predecessorStageId: null,
        schedule: [{ type: "routine", routineId: "rt_invalid" }],
        milestone: {
          description: "Bad test",
          test: {
            type: "exercise",
            source: "custom",
            exerciseId: "ex_pushup",
            metric: "duration",
            target: 30,
          },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
  routines: [
    {
      id: "rt_invalid",
      name: "Invalid Routine",
      entries: [
        {
          id: "entry_invalid",
          exerciseId: "ex_pushup",
          order: 1,
          sets: 3,
          reps: null,
          durationSeconds: 30,
          weight: null,
          resistance: null,
          restSeconds: 30,
          notes: "",
        },
      ],
    },
  ],
};

let fullImportFailed = false;
try {
  planService.importFullPlan(invalidFullPlan, routineService, exerciseCatalog);
} catch (error) {
  fullImportFailed = error.code === "INVALID_ROUTINE_ENTRY_MODE" || error.code === "INVALID_MILESTONE_TEST";
}

assert(fullImportFailed, "importFullPlan should reject unsupported routine or milestone mode combinations.");
assert(routineRepo.list().length === 0, "Invalid full-plan import must not partially write routines.");
assert(blueprintRepo.list().length === 0, "Invalid full-plan import must not partially write blueprints.");

console.log("Import mode hardening check passed.");
