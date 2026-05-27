import { mkdirSync } from "fs";
import { chromium } from "playwright";
import { STARTER_CONTENT_VERSION } from "./src/data/starterContent.js";
import { createActivePlanFromBlueprint } from "./src/data/schemaMigration.js";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/exercise-reference-protection";
const HEADED = process.argv.includes("--headed");

mkdirSync(OUT_DIR, { recursive: true });

const bodyTargets = [
  { id: "bm_chest", name: "Chest", category: "muscle", isCustom: false },
  { id: "bm_core", name: "Core", category: "muscle", isCustom: false },
];

const exercises = [
  {
    id: "ex_protected",
    slug: "protected-activity",
    name: "Protected Activity",
    description: "Referenced by saved content.",
    type: "physical",
    trackingType: "reps",
    supportedTrackingModes: ["reps"],
    bodyTargets: ["bm_chest", "bm_core"],
    equipment: ["Bodyweight"],
    cues: ["Brace", "Keep tempo steady"],
    restSeconds: 45,
    aliases: [],
    movementPattern: "push",
    whyItHelps: "Keeps the protected routine grounded.",
    isCustom: true,
  },
  {
    id: "ex_unused",
    slug: "unused-activity",
    name: "Unused Activity",
    description: "Safe to remove.",
    type: "physical",
    trackingType: "reps",
    supportedTrackingModes: ["reps"],
    bodyTargets: ["bm_core"],
    equipment: ["Bodyweight"],
    cues: ["Stay tall"],
    restSeconds: 30,
    aliases: [],
    movementPattern: "stability",
    whyItHelps: "Used only for cleanup checks.",
    isCustom: true,
  },
];

const routines = [
  {
    id: "routine_protected_activity",
    name: "Protected Activity Routine",
    description: "Still depends on the protected activity.",
    notes: "",
    difficultyScore: 3,
    createdAt: "2026-05-14T12:00:00.000Z",
    updatedAt: "2026-05-14T12:00:00.000Z",
    isCustom: true,
    entries: [
      {
        id: "entry_protected_activity",
        exerciseId: "ex_protected",
        order: 1,
        sets: 3,
        reps: 8,
        durationSeconds: null,
        weight: null,
        resistance: null,
        restSeconds: 45,
        notes: "",
      },
    ],
  },
];

const blueprint = {
  id: "plan_exercise_guard",
  version: "1.0",
  name: "Exercise Guard Blueprint",
  description: "Protect saved content when activity library items are cleaned up.",
  goal: "Keep routines and plans intact when custom activities are deleted.",
  theme: { color: "#63B3ED", icon: "EG", code: "exercise-guard" },
  createdAt: "2026-05-14T12:10:00.000Z",
  stages: [
    {
      id: "stage_foundation",
      name: "Foundation",
      predecessorStageId: null,
      schedule: [{ type: "routine", routineId: "routine_protected_activity" }],
      milestone: {
        description: "Hit the anchor cleanly once.",
        eligibility: { type: "sessions", target: 1, requiresContinuous: false },
        test: {
          type: "exercise",
          source: "stage_entry",
          exerciseId: "ex_protected",
          metric: "reps",
          target: 8,
          routineId: "routine_protected_activity",
          routineEntryId: "entry_protected_activity",
          weight: null,
          resistance: null,
          restSeconds: 45,
          notes: "",
        },
        onFailure: { action: "none", targetStageId: null },
      },
      transitionRule: "prompt_user",
    },
  ],
};

const activePlan = createActivePlanFromBlueprint(blueprint, {
  displayName: "Exercise Guard Live",
  blueprintId: blueprint.id,
});
activePlan.startedAt = "2026-05-14T12:15:00.000Z";
activePlan.displayName = "Exercise Guard Live";

const workouts = [
  {
    id: "workout_protected_activity",
    activePlanId: activePlan.id,
    activePlanVersion: activePlan.version || "1.0",
    routineId: "routine_protected_activity",
    stageId: "stage_foundation",
    startedAt: "2026-05-14T12:20:00.000Z",
    completedAt: "2026-05-14T12:24:00.000Z",
    sessionType: "routine",
    sets: [
      {
        exerciseId: "ex_protected",
        setNumber: 1,
        status: "completed",
        actualReps: 8,
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

async function readExercises(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.exercises.v1") || "{}").exercises || []);
}

async function readRoutines(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.state.v1") || "{}").routines || []);
}

async function readPlans(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.plans.v1") || "{}").plan_blueprints || []);
}

async function readActivePlans(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}").active_plans || []);
}

async function readWorkouts(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}").workouts || []);
}

async function seedState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ nextBodyTargets, nextExercises, nextRoutines, nextBlueprint, nextActivePlan, nextWorkouts, starterVersion }) => {
    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: nextBodyTargets }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: nextExercises }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: nextRoutines }));
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: nextWorkouts }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: [nextActivePlan] }));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: [nextBlueprint] }));
    localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
    localStorage.setItem(
      "workout-app.meta.v1",
      JSON.stringify({ starterContentVersion: starterVersion, starterContentSyncedAt: new Date().toISOString() }),
    );
  }, {
    nextBodyTargets: bodyTargets,
    nextExercises: exercises,
    nextRoutines: routines,
    nextBlueprint: blueprint,
    nextActivePlan: activePlan,
    nextWorkouts: workouts,
    starterVersion: STARTER_CONTENT_VERSION,
  });
  await page.reload({ waitUntil: "networkidle" });
}

async function openExerciseDetail(page, exerciseId) {
  await page.goto(`${BASE}/#/exercise/${exerciseId}`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-action="delete-catalog-exercise"]');
}

async function attemptDeleteExercise(page) {
  await forceClick(page.locator('[data-action="delete-catalog-exercise"]').first());
  await page.waitForSelector('.modal-content');
  await forceClick(page.locator('.modal-content button').filter({ hasText: /^Delete$/ }).first());
  await page.waitForSelector('.status-message');
}

async function main() {
  console.log("\n=== Exercise Reference Protection Audit ===");
  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  try {
    await seedState(page);

    await openExerciseDetail(page, "ex_protected");
    await takeScreenshot(page, "01-protected-activity-detail");

    await attemptDeleteExercise(page);
    const blockedNotice = (await page.locator('.status-message').textContent())?.trim() || "";
    assert(/Can't delete "Protected Activity"/i.test(blockedNotice), `Expected blocked delete notice, received: ${blockedNotice}`);
    assert(/1 routine/i.test(blockedNotice), `Blocked delete notice should mention routine usage. Received: ${blockedNotice}`);
    assert(/1 active plan/i.test(blockedNotice), `Blocked delete notice should mention active-plan usage. Received: ${blockedNotice}`);
    assert(/1 blueprint/i.test(blockedNotice), `Blocked delete notice should mention blueprint usage. Received: ${blockedNotice}`);
    assert(/1 logged session/i.test(blockedNotice), `Blocked delete notice should mention logged-session usage. Received: ${blockedNotice}`);

    const afterBlockedExercises = await readExercises(page);
    assert(afterBlockedExercises.some((exercise) => exercise.id === "ex_protected"), "Protected activity should remain in the library after blocked delete.");
    assert((await readRoutines(page)).some((routine) => routine.id === "routine_protected_activity"), "Dependent routine should remain intact after blocked activity delete.");
    assert((await readPlans(page)).some((plan) => plan.id === blueprint.id), "Blueprint should remain intact after blocked activity delete.");
    assert((await readActivePlans(page)).some((plan) => plan.id === activePlan.id), "Active plan should remain intact after blocked activity delete.");
    assert((await readWorkouts(page)).some((workout) => workout.id === "workout_protected_activity"), "Workout history should remain intact after blocked activity delete.");
    await takeScreenshot(page, "02-protected-activity-blocked");

    await openExerciseDetail(page, "ex_unused");
    await attemptDeleteExercise(page);
    const successNotice = (await page.locator('.status-message').textContent())?.trim() || "";
    assert(/Deleted "Unused Activity"\./i.test(successNotice), `Expected success delete notice, received: ${successNotice}`);

    const afterDeleteExercises = await readExercises(page);
    assert(!afterDeleteExercises.some((exercise) => exercise.id === "ex_unused"), "Unused activity should be removed after delete.");
    assert(afterDeleteExercises.some((exercise) => exercise.id === "ex_protected"), "Protected activity should still exist after deleting the unused activity.");
    await takeScreenshot(page, "03-unused-activity-deleted");

    await page.goto(`${BASE}/#/active-plans`, { waitUntil: "networkidle" });
    assert(await page.getByText("Exercise Guard Live").first().isVisible({ timeout: 1000 }).catch(() => false), "Protected active plan should still be visible after exercise protection checks.");
    await takeScreenshot(page, "04-active-plan-still-healthy");

    console.log(`Exercise reference protection audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
