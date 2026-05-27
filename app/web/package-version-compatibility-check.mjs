import { createPlanService } from "./src/features/plans/planService.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createArrayRepo(initial = []) {
  let items = JSON.parse(JSON.stringify(initial));
  return {
    list() {
      return JSON.parse(JSON.stringify(items));
    },
    replaceAll(next) {
      items = JSON.parse(JSON.stringify(next));
    },
    getAll() {
      return JSON.parse(JSON.stringify(items));
    },
  };
}

function createHarness({ activePlans = [], exercises = [], routines = [], bodyTargets = [], workouts = [], blueprints = [] } = {}) {
  const blueprintRepo = createArrayRepo(blueprints);
  const activeRepo = createArrayRepo(activePlans);
  const exerciseRepo = createArrayRepo(exercises);
  const routineRepo = createArrayRepo(routines);
  const bodyMapRepo = createArrayRepo(bodyTargets);
  const workoutRepo = createArrayRepo(workouts);
  const routineService = {
    importPrepared(importedRoutines) {
      const current = routineRepo.list();
      routineRepo.replaceAll([...current, ...importedRoutines]);
      return { count: importedRoutines.length };
    },
    getAll() {
      return routineRepo.list();
    },
  };

  const planService = createPlanService(blueprintRepo, activeRepo, {
    exerciseRepository: exerciseRepo,
    routineRepository: routineRepo,
    bodyMapRepository: bodyMapRepo,
    workoutRepository: workoutRepo,
  });

  return {
    planService,
    blueprintRepo,
    activeRepo,
    exerciseRepo,
    routineRepo,
    bodyMapRepo,
    workoutRepo,
    routineService,
  };
}

const legacyBlueprintPackage = {
  plan: {
    id: "plan_legacy_blueprint",
    version: "1.0",
    name: "Legacy Blueprint",
    description: "Older package without exportVersion.",
    goal: "Keep importing older blueprint packages safely.",
    theme: { color: "#4FD1C5", icon: "LG", code: "LEG" },
    createdAt: "2026-05-13T08:00:00.000Z",
    stages: [
      {
        id: "stage_legacy",
        name: "Stage 1: Legacy",
        predecessorStageId: null,
        schedule: [],
        milestone: {
          description: "Open legacy stage.",
          eligibility: { type: "none", target: 0, requiresContinuous: false },
          test: { type: "none" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
  routines: [],
};

const localActivePlan = {
  id: "active_revision_target",
  name: "Revision Target",
  displayName: "Revision Target",
  description: "Local active plan used for revision compatibility checks.",
  goal: "Test revision compatibility messaging.",
  theme: { color: "#4FD1C5", icon: "RT", code: "REV" },
  version: "1.0",
  versionHistory: [
    {
      version: "1.0",
      modifiedAt: "2026-05-13T08:00:00.000Z",
      modifiedBy: "user",
      changeSummary: "Activated from blueprint",
    },
  ],
  blueprintId: "plan_revision_target",
  blueprintVersion: "1.0",
  startedAt: "2026-05-13T08:00:00.000Z",
  currentStageIndex: 0,
  currentDayInCycle: 1,
  currentCycleCount: 0,
  streakDays: 0,
  lastSessionDate: null,
  stageHistory: [
    {
      stageId: "stage_revision",
      stageName: "Stage 1: Revision",
      startedAt: "2026-05-13T08:00:00.000Z",
      completedAt: null,
      completedVia: null,
      failureCount: 0,
    },
  ],
  sessions: [],
  stages: [
    {
      id: "stage_revision",
      name: "Stage 1: Revision",
      predecessorStageId: null,
      schedule: [],
      milestone: {
        description: "Open revision stage.",
        eligibility: { type: "none", target: 0, requiresContinuous: false },
        test: { type: "none" },
        onFailure: { action: "none", targetStageId: null },
      },
      transitionRule: "prompt_user",
    },
  ],
};

const unsupportedActivePlanPackage = {
  exportVersion: "2.0",
  exportedAt: "2026-05-13T08:30:00.000Z",
  activePlan: localActivePlan,
  sessions: [],
  exercises: [],
  routines: [],
  bodyTargets: [],
};

{
  const harness = createHarness();
  const planId = harness.planService.importFullPlan(legacyBlueprintPackage, harness.routineService, []);
  assert(planId === legacyBlueprintPackage.plan.id, "Legacy blueprint package without exportVersion should still import successfully.");
  assert(harness.blueprintRepo.list().some((entry) => entry.id === legacyBlueprintPackage.plan.id), "Legacy blueprint import did not persist the imported blueprint.");
}

{
  const harness = createHarness();
  let errorMessage = "";
  try {
    harness.planService.importFullPlan(
      {
        ...legacyBlueprintPackage,
        exportVersion: "2.0",
      },
      harness.routineService,
      [],
    );
  } catch (error) {
    errorMessage = error.message || "";
  }

  assert(
    errorMessage === 'Unsupported blueprint package version "2.0". Expected 1.0.',
    `Unsupported blueprint package version should fail with a clear message, got: ${errorMessage}`,
  );
  assert(harness.blueprintRepo.list().length === 0, "Unsupported blueprint package version should not write any blueprints.");
  assert(harness.routineRepo.list().length === 0, "Unsupported blueprint package version should not write any routines.");
}

{
  const harness = createHarness();
  let errorMessage = "";
  try {
    harness.planService.importActivePlanPackage(JSON.stringify(unsupportedActivePlanPackage));
  } catch (error) {
    errorMessage = error.message || "";
  }

  assert(
    errorMessage === 'Unsupported active-plan package version "2.0". Expected 1.0.',
    `Unsupported active-plan package version should fail with a clear message, got: ${errorMessage}`,
  );
  assert(harness.activeRepo.list().length === 0, "Unsupported active-plan package version should not write any active plans.");
  assert(harness.workoutRepo.list().length === 0, "Unsupported active-plan package version should not write any workouts.");
  assert(harness.routineRepo.list().length === 0, "Unsupported active-plan package version should not write any routines.");
  assert(harness.exerciseRepo.list().length === 0, "Unsupported active-plan package version should not write any exercises.");
}

{
  const harness = createHarness({ activePlans: [localActivePlan] });
  const review = harness.planService.prepareActivePlanRevision(
    localActivePlan.id,
    JSON.stringify(unsupportedActivePlanPackage),
  );

  const unsupportedIssue = (review.blockingIssues || []).find((issue) => issue.code === "UNSUPPORTED_EXPORT_VERSION");
  assert(unsupportedIssue, "Unsupported revision package version should create a blocking review issue.");
  assert(
    unsupportedIssue.message === 'Unsupported active-plan revision package version "2.0". Expected 1.0.',
    `Unsupported revision package version should use the clear revision-specific message, got: ${unsupportedIssue.message}`,
  );
  assert(harness.activeRepo.list()[0].version === localActivePlan.version, "Unsupported revision package must not mutate the live active plan.");
}

console.log("Package-version compatibility check passed.");
