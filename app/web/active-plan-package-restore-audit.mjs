import { mkdirSync, readFileSync } from "fs";
import { chromium } from "playwright";
import { STARTER_CONTENT_VERSION } from "./src/data/starterContent.js";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/active-plan-package-restore";
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
      {
        exerciseId: "ex_balance_reach",
        setNumber: 2,
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

async function isVisible(page, selector) {
  return page.locator(selector).first().isVisible({ timeout: 200 }).catch(() => false);
}

async function takeScreenshot(page, name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
  console.log(`  Screenshot: ${name}.png`);
}

async function seedSourceState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ starterVersion, nextBodyTargets, nextExercises, nextRoutines, nextActivePlan, nextWorkouts }) => {
    localStorage.clear();
    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: nextBodyTargets }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: nextExercises }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: nextRoutines }));
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: nextWorkouts }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: [nextActivePlan] }));
    localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
    localStorage.setItem(
      "workout-app.meta.v1",
      JSON.stringify({ starterContentVersion: starterVersion, starterContentSyncedAt: new Date().toISOString() }),
    );
  }, {
    starterVersion: STARTER_CONTENT_VERSION,
    nextBodyTargets: bodyTargets,
    nextExercises: exercises,
    nextRoutines: routines,
    nextActivePlan: activePlan,
    nextWorkouts: workouts,
  });
  await page.goto(`${BASE}/?seed=active-plan-restore-source`, { waitUntil: "networkidle" });
}

async function seedCleanState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ starterVersion }) => {
    localStorage.clear();
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: [] }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: [] }));
    localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
    localStorage.setItem(
      "workout-app.meta.v1",
      JSON.stringify({ starterContentVersion: starterVersion, starterContentSyncedAt: new Date().toISOString() }),
    );
  }, { starterVersion: STARTER_CONTENT_VERSION });
  await page.goto(`${BASE}/?seed=active-plan-restore-clean`, { waitUntil: "networkidle" });
}

async function readActivePlans(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}").active_plans || []);
}

async function readWorkouts(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}").workouts || []);
}

async function readExercises(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.exercises.v1") || "{}").exercises || []);
}

async function fillVisibleWorkoutInputs(page) {
  const values = [
    ["#log-reps", "8"],
    ["#log-weight", "8"],
    ["#log-duration", "60"],
  ];

  for (const [selector, fallbackValue] of values) {
    const input = page.locator(selector).first();
    if (await input.isVisible({ timeout: 100 }).catch(() => false)) {
      const current = await input.inputValue();
      await input.fill(current && current !== "0" ? current : fallbackValue);
    }
  }
}

async function completeCurrentSession(page, planId) {
  let sawCompleteAction = false;

  for (let step = 0; step < 80; step += 1) {
    if (!page.url().includes("#/workout-player/")) {
      return { sawCompleteAction };
    }

    if (await isVisible(page, '[data-action="start"]')) {
      await forceClick(page.locator('[data-action="start"]').first());
      await page.waitForTimeout(150);
      continue;
    }

    if (await isVisible(page, '[data-action="continue-rest-instruction"]')) {
      await forceClick(page.locator('[data-action="continue-rest-instruction"]').first());
      await page.waitForTimeout(120);
      continue;
    }

    if (await isVisible(page, '[data-action="complete-rest"]')) {
      await forceClick(page.locator('[data-action="complete-rest"]').first());
      await page.waitForTimeout(150);
      continue;
    }

    if (await isVisible(page, '[data-action="complete"]')) {
      sawCompleteAction = true;
      await fillVisibleWorkoutInputs(page);
      await forceClick(page.locator('[data-action="complete"]').first());
      await page.waitForTimeout(180);
      continue;
    }

    if (await isVisible(page, '[data-action="skip-rest"]')) {
      await forceClick(page.locator('[data-action="skip-rest"]').first());
      await page.waitForTimeout(150);
      continue;
    }

    if (await isVisible(page, '[data-action="skip-reflection"]')) {
      await forceClick(page.locator('[data-action="skip-reflection"]').first());
      await page.waitForTimeout(200);
      continue;
    }

    if (await isVisible(page, '[data-action="continue-current-stage"]')) {
      await forceClick(page.locator('[data-action="continue-current-stage"]').first());
      await page.waitForTimeout(200);
      continue;
    }

    if (await isVisible(page, '[data-difficulty="normal"]')) {
      await forceClick(page.locator('[data-difficulty="normal"]').first());
      await page.waitForTimeout(200);
      continue;
    }

    if (await isVisible(page, '[data-action="continue-journey"]')) {
      await forceClick(page.locator('[data-action="continue-journey"]').first());
      await page.waitForTimeout(200);
      continue;
    }

    if (await isVisible(page, '[data-action="resume"]')) {
      await forceClick(page.locator('[data-action="resume"]').first());
      await page.waitForTimeout(120);
      continue;
    }

    if (await isVisible(page, '[data-action="skip"]')) {
      await forceClick(page.locator('[data-action="skip"]').first());
      await page.waitForTimeout(150);
      continue;
    }

    await page.waitForTimeout(180);
  }

  throw new Error(`Workout player did not settle back to the app flow for active plan ${planId}.`);
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
    console.log("\n=== Active Plan Package Restore ===");

    await seedSourceState(page);
    await page.goto(`${BASE}/#/active-plan/${activePlan.id}`, { waitUntil: "networkidle" });
    await takeScreenshot(page, "01-source-active-plan-detail");

    await forceClick(page.locator('summary.journey-advanced__summary').filter({ hasText: 'Plan tools' }).first());
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      forceClick(page.locator('[data-action="apd-export"]').first()),
    ]);
    const downloadPath = `${OUT_DIR}/active-plan-export.json`;
    await download.saveAs(downloadPath);
    const exportedPackage = JSON.parse(readFileSync(downloadPath, "utf8"));

    assert(exportedPackage.activePlan?.id === activePlan.id, "Exported active-plan package did not contain the source active plan.");
    assert((exportedPackage.activePlan?.versionHistory || []).length === 2, "Exported active-plan package did not preserve revision history.");
    assert((exportedPackage.activePlan?.stageHistory || []).length === 2, "Exported active-plan package did not preserve stage history.");
    assert(Array.isArray(exportedPackage.sessions) && exportedPackage.sessions.length === 1, "Exported active-plan package did not preserve session history.");
    assert(Array.isArray(exportedPackage.exercises) && exportedPackage.exercises.some((entry) => entry.id === exercises[0].id), "Exported active-plan package did not include the referenced exercise.");
    await takeScreenshot(page, "02-source-plan-tools-exported");

    await seedCleanState(page);
    await page.goto(`${BASE}/#/active-plans`, { waitUntil: "networkidle" });
    await page.locator('[data-role="active-plan-import-input"]').setInputFiles(downloadPath);
    await page.waitForURL(new RegExp(`#\\/active-plan\\/${activePlan.id}`));
    await page.waitForTimeout(500);
    await takeScreenshot(page, "03-restored-active-plan-detail");

    const restoredPlans = await readActivePlans(page);
    const restoredPlan = restoredPlans.find((entry) => entry.id === activePlan.id);
    assert(restoredPlan, "Imported active-plan package did not restore the active plan into storage.");
    assert((restoredPlan.versionHistory || []).length === 2, `Expected restored version history length 2, got ${(restoredPlan.versionHistory || []).length}.`);
    assert((restoredPlan.stageHistory || []).length === 2, `Expected restored stage history length 2, got ${(restoredPlan.stageHistory || []).length}.`);
    assert((restoredPlan.sessions || []).length === 1, `Expected restored session list length 1, got ${(restoredPlan.sessions || []).length}.`);

    const restoredExercises = await readExercises(page);
    assert(restoredExercises.some((entry) => entry.id === exercises[0].id), "Restored active-plan package did not merge the referenced custom exercise into the library.");

    await forceClick(page.locator('[data-action="apd-primary"]').first());
    await page.waitForURL(new RegExp(`#\\/workout-player\\/${activePlan.id}`));
    const playerText = await page.locator('body').textContent();
    assert(playerText?.includes('Balance Reset'), "Restored workout player did not show the preserved routine name.");
    assert(playerText?.includes('Balance Reach'), "Restored workout player did not show the preserved exercise name.");
    await takeScreenshot(page, "04-restored-player");

    const sessionResult = await completeCurrentSession(page, activePlan.id);
    assert(sessionResult.sawCompleteAction, "Restored active plan never reached a logged workout step.");

    if (!page.url().includes(`#/active-plan/${activePlan.id}`)) {
      await page.goto(`${BASE}/#/active-plan/${activePlan.id}`, { waitUntil: "networkidle" });
    }
    await forceClick(page.locator('[data-action="apd-history"]').first());
    await page.waitForURL(/#\/workouts/);
    await takeScreenshot(page, "05-history-after-restore-run");

    const historyText = await page.locator('body').textContent();
    assert(historyText?.includes('Stage history'), "History view did not render the restored stage history summary.");
    assert(historyText?.includes('Version history'), "History view did not render the restored version history summary.");
    assert(historyText?.includes('2 recorded stage changes'), "History view did not preserve the restored stage-history count.");
    assert(historyText?.includes('2 saved plan updates'), "History view did not preserve the restored revision-history count.");
    assert(historyText?.includes('2 logged sessions'), "History view did not show both the restored session and the new post-restore session.");

    const restoredWorkouts = await readWorkouts(page);
    const restoredPlanWorkouts = restoredWorkouts.filter((entry) => entry.activePlanId === activePlan.id);
    assert(restoredPlanWorkouts.length === 2, `Expected 2 workouts tied to the restored active plan after running one more session, got ${restoredPlanWorkouts.length}.`);

    if (pageErrors.length) {
      throw new Error(`Browser reported page errors:\n${pageErrors.join("\n")}`);
    }

    console.log(`Active plan package restore audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
