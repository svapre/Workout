import { mkdirSync, readFileSync } from "fs";
import { chromium } from "playwright";
import { STARTER_CONTENT_VERSION } from "./src/data/starterContent.js";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/active-plan-import-conflict";
const HEADED = process.argv.includes("--headed");

mkdirSync(OUT_DIR, { recursive: true });

const bodyTargets = [
  { id: "bm_core", name: "Core", category: "muscle", isCustom: false },
  { id: "bm_balance", name: "Balance", category: "skill", isCustom: true },
];

const exercises = [
  {
    id: "ex_balance_reach",
    slug: "balance-reach",
    name: "Balance Reach",
    description: "Single-leg balance with a forward reach.",
    type: "physical",
    trackingType: "reps",
    supportedTrackingModes: ["reps"],
    bodyTargets: ["bm_core", "bm_balance"],
    equipment: ["Bodyweight"],
    cues: ["Stay tall", "Reach slowly"],
    restSeconds: 30,
    aliases: [],
    movementPattern: "balance",
    whyItHelps: "Builds control and stability without heavy loading.",
    isCustom: true,
  },
];

const conflictingExercises = [
  {
    id: "ex_balance_reach",
    slug: "balance-reach",
    name: "Balance Reach Variant",
    description: "A different local definition for the same custom exercise id.",
    type: "physical",
    trackingType: "reps",
    supportedTrackingModes: ["reps"],
    bodyTargets: ["bm_core", "bm_balance"],
    equipment: ["Bodyweight"],
    cues: ["Hold still"],
    restSeconds: 45,
    aliases: [],
    movementPattern: "balance",
    whyItHelps: "Conflicting local catalog entry.",
    isCustom: true,
  },
];

const routines = [
  {
    id: "routine_balance_reset",
    name: "Balance Reset",
    description: "Reset stance and control.",
    notes: "",
    difficultyScore: 2,
    createdAt: "2026-05-08T08:00:00.000Z",
    updatedAt: "2026-05-09T08:00:00.000Z",
    isCustom: true,
    entries: [
      {
        id: "entry_balance_reach",
        exerciseId: "ex_balance_reach",
        order: 1,
        sets: 2,
        reps: 8,
        durationSeconds: null,
        weight: null,
        resistance: null,
        restSeconds: 20,
        notes: "Reach under control.",
      },
    ],
  },
];

const activePlan = {
  id: "active_balance_restore",
  name: "Balance Recovery Path",
  displayName: "Balance Recovery Path",
  description: "Restored active plan package candidate.",
  goal: "Keep a live plan moving while preserving its accumulated history.",
  theme: { color: "#4FD1C5", icon: "BR", code: "balance-restore" },
  version: "1.1",
  versionHistory: [
    {
      version: "1.0",
      modifiedAt: "2026-05-08T08:00:00.000Z",
      modifiedBy: "user",
      changeSummary: "Activated from blueprint",
    },
    {
      version: "1.1",
      modifiedAt: "2026-05-09T08:00:00.000Z",
      modifiedBy: "user",
      changeSummary: "Adjusted balance-stage guidance",
    },
  ],
  blueprintId: "plan_balance_blueprint",
  blueprintVersion: "1.0",
  startedAt: "2026-05-08T08:00:00.000Z",
  currentStageIndex: 1,
  currentDayInCycle: 1,
  currentCycleCount: 0,
  streakDays: 1,
  lastSessionDate: "2026-05-09T08:30:00.000Z",
  stageHistory: [
    {
      stageId: "stage_reset",
      stageName: "Reset Foundation",
      startedAt: "2026-05-08T08:00:00.000Z",
      completedAt: "2026-05-09T08:00:00.000Z",
      completedVia: "milestone_pass",
      failureCount: 0,
    },
    {
      stageId: "stage_build",
      stageName: "Balance Build",
      startedAt: "2026-05-09T08:00:00.000Z",
      completedAt: null,
      completedVia: null,
      failureCount: 0,
    },
  ],
  sessions: ["workout_restore_1"],
  stages: [
    {
      id: "stage_reset",
      name: "Reset Foundation",
      predecessorStageId: null,
      schedule: [{ type: "routine", routineId: "routine_balance_reset" }],
      milestone: {
        description: "Complete the reset session cleanly.",
        eligibility: { type: "sessions", target: 1, requiresContinuous: false },
        test: {
          type: "exercise",
          source: "stage_entry",
          exerciseId: "ex_balance_reach",
          metric: "reps",
          target: 8,
          routineId: "routine_balance_reset",
          routineEntryId: "entry_balance_reach",
          weight: null,
          resistance: null,
          restSeconds: 20,
          notes: "",
        },
        onFailure: { action: "none", targetStageId: null },
      },
      transitionRule: "prompt_user",
    },
    {
      id: "stage_build",
      name: "Balance Build",
      predecessorStageId: "stage_reset",
      schedule: [{ type: "routine", routineId: "routine_balance_reset" }],
      milestone: {
        description: "Repeat the balance session with steadier control.",
        eligibility: { type: "sessions", target: 2, requiresContinuous: false },
        test: {
          type: "exercise",
          source: "stage_entry",
          exerciseId: "ex_balance_reach",
          metric: "reps",
          target: 10,
          routineId: "routine_balance_reset",
          routineEntryId: "entry_balance_reach",
          weight: null,
          resistance: null,
          restSeconds: 20,
          notes: "",
        },
        onFailure: { action: "none", targetStageId: null },
      },
      transitionRule: "prompt_user",
    },
  ],
};

const workouts = [
  {
    id: "workout_restore_1",
    activePlanId: "active_balance_restore",
    activePlanVersion: "1.0",
    routineId: "routine_balance_reset",
    stageId: "stage_reset",
    startedAt: "2026-05-09T08:15:00.000Z",
    completedAt: "2026-05-09T08:30:00.000Z",
    sessionType: "routine",
    reflectionRating: "normal",
    feedbackResponses: [],
    sets: [
      {
        exerciseId: "ex_balance_reach",
        setNumber: 1,
        status: "completed",
        actualReps: 8,
        actualDurationSec: null,
        actualWeightKg: null,
        actualResistance: null,
      },
    ],
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function forceClick(locator) {
  await locator.evaluate((element) => element.click());
}

async function takeScreenshot(page, name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
  console.log(`  Screenshot: ${name}.png`);
}

async function seedLocalState(page, {
  nextBodyTargets = [],
  nextExercises = [],
  nextRoutines = [],
  nextActivePlans = [],
  nextWorkouts = [],
  nextArchivedPlans = [],
  nextBlueprints = [],
}) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate((payload) => {
    localStorage.clear();
    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: payload.nextBodyTargets }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: payload.nextExercises }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: payload.nextRoutines }));
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: payload.nextWorkouts }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: payload.nextActivePlans }));
    localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify(payload.nextArchivedPlans));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: payload.nextBlueprints }));
    localStorage.setItem(
      "workout-app.meta.v1",
      JSON.stringify({ starterContentVersion: payload.starterVersion, starterContentSyncedAt: new Date().toISOString() }),
    );
  }, {
    starterVersion: STARTER_CONTENT_VERSION,
    nextBodyTargets,
    nextExercises,
    nextRoutines,
    nextActivePlans,
    nextWorkouts,
    nextArchivedPlans,
    nextBlueprints,
  });
  await page.goto(`${BASE}/?seed=active-plan-import-conflict`, { waitUntil: "networkidle" });
}

async function readState(page) {
  return page.evaluate(() => ({
    activePlans: JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}").active_plans || [],
    archivedPlans: JSON.parse(localStorage.getItem("workout-app.archivedPlans.v1") || "[]"),
    workouts: JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}").workouts || [],
    routines: JSON.parse(localStorage.getItem("workout-app.state.v1") || "{}").routines || [],
    exercises: JSON.parse(localStorage.getItem("workout-app.exercises.v1") || "{}").exercises || [],
    bodyTargets: JSON.parse(localStorage.getItem("workout-app.bodymap.v1") || "{}").bodyMaps || [],
  }));
}

async function exportSourcePackage(page) {
  await seedLocalState(page, {
    nextBodyTargets: bodyTargets,
    nextExercises: exercises,
    nextRoutines: routines,
    nextActivePlans: [activePlan],
    nextWorkouts: workouts,
  });

  await page.goto(`${BASE}/#/active-plan/${activePlan.id}`, { waitUntil: "networkidle" });
  await forceClick(page.locator('summary.journey-advanced__summary').filter({ hasText: 'Plan tools' }).first());
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    forceClick(page.locator('[data-action="apd-export"]').first()),
  ]);
  const downloadPath = `${OUT_DIR}/active-plan-export.json`;
  await download.saveAs(downloadPath);
  const exportedPackage = JSON.parse(readFileSync(downloadPath, "utf8"));
  assert(exportedPackage.activePlan?.id === activePlan.id, "Could not prepare the source active-plan package for conflict testing.");
  await takeScreenshot(page, "01-export-source-package");
  return downloadPath;
}

async function importFromDashboard(page, filePath) {
  await page.goto(`${BASE}/#/active-plans`, { waitUntil: "networkidle" });
  await page.locator('[data-role="active-plan-import-input"]').setInputFiles(filePath);
  await page.waitForTimeout(400);
}

async function getNoticeText(page) {
  const notice = page.locator('.status-message').first();
  await notice.waitFor({ state: 'visible' });
  return (await notice.textContent()) || "";
}

async function run() {
  const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 120 : 0 });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    console.log("\n=== Active Plan Import Conflict Handling ===");
    const packagePath = await exportSourcePackage(page);

    console.log("- Scenario 1: duplicate active plan import is blocked");
    await seedLocalState(page, {
      nextBodyTargets: bodyTargets,
      nextExercises: exercises,
      nextRoutines: routines,
      nextActivePlans: [activePlan],
      nextWorkouts: workouts,
    });
    await importFromDashboard(page, packagePath);
    const duplicateNotice = await getNoticeText(page);
    await takeScreenshot(page, "02-duplicate-plan-import-blocked");
    assert(duplicateNotice.includes("already exists"), `Expected duplicate-plan import notice, got: ${duplicateNotice}`);
    let state = await readState(page);
    assert(state.activePlans.length === 1, `Duplicate-plan import should leave exactly 1 active plan, got ${state.activePlans.length}.`);
    assert(state.workouts.length === 1, `Duplicate-plan import should leave workout history unchanged, got ${state.workouts.length} entries.`);
    assert(state.exercises.length === 1, `Duplicate-plan import should leave exercises unchanged, got ${state.exercises.length} entries.`);
    assert(state.routines.length === 1, `Duplicate-plan import should leave routines unchanged, got ${state.routines.length} entries.`);

    console.log("- Scenario 2: exercise conflict blocks import without partial writes");
    await seedLocalState(page, {
      nextBodyTargets: bodyTargets,
      nextExercises: conflictingExercises,
      nextRoutines: [],
      nextActivePlans: [],
      nextWorkouts: [],
    });
    const exerciseConflictBaseline = await readState(page);
    await importFromDashboard(page, packagePath);
    const exerciseConflictNotice = await getNoticeText(page);
    await takeScreenshot(page, "03-exercise-conflict-import-blocked");
    assert(exerciseConflictNotice.includes("Exercise conflict"), `Expected exercise-conflict notice, got: ${exerciseConflictNotice}`);
    state = await readState(page);
    assert(state.activePlans.length === 0, `Exercise-conflict import should not add any active plans, got ${state.activePlans.length}.`);
    assert(state.workouts.length === exerciseConflictBaseline.workouts.length, `Exercise-conflict import should not add workouts, got ${state.workouts.length} entries.`);
    assert(state.routines.length === exerciseConflictBaseline.routines.length, `Exercise-conflict import should leave the local routine library unchanged, got ${state.routines.length} entries.`);
    assert(state.exercises.length === exerciseConflictBaseline.exercises.length, `Exercise-conflict import should leave the local exercise catalog unchanged, got ${state.exercises.length} entries.`);
    assert(state.exercises[0]?.name === conflictingExercises[0].name, "Exercise-conflict import overwrote the existing local exercise entry.");

    console.log("- Scenario 3: session-id conflict blocks import without partial writes");
    await seedLocalState(page, {
      nextBodyTargets: [],
      nextExercises: [],
      nextRoutines: [],
      nextActivePlans: [],
      nextWorkouts: [
        {
          ...workouts[0],
          activePlanId: "unrelated_existing_plan",
        },
      ],
    });
    const sessionConflictBaseline = await readState(page);
    await importFromDashboard(page, packagePath);
    const sessionConflictNotice = await getNoticeText(page);
    await takeScreenshot(page, "04-session-conflict-import-blocked");
    assert(sessionConflictNotice.includes("Workout history already contains session"), `Expected session-conflict notice, got: ${sessionConflictNotice}`);
    state = await readState(page);
    assert(state.activePlans.length === 0, `Session-conflict import should not add an active plan, got ${state.activePlans.length}.`);
    assert(state.workouts.length === sessionConflictBaseline.workouts.length, `Session-conflict import should leave the existing workout history unchanged, got ${state.workouts.length}.`);
    assert(state.exercises.length === sessionConflictBaseline.exercises.length, `Session-conflict import should not partially merge exercises, got ${state.exercises.length}.`);
    assert(state.routines.length === sessionConflictBaseline.routines.length, `Session-conflict import should not partially merge routines, got ${state.routines.length}.`);
    assert(state.bodyTargets.length === sessionConflictBaseline.bodyTargets.length, `Session-conflict import should not partially merge body targets, got ${state.bodyTargets.length}.`);

    if (pageErrors.length) {
      throw new Error(`Browser reported page errors:\n${pageErrors.join("\n")}`);
    }

    console.log(`Active-plan import conflict audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
