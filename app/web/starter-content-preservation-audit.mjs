import { mkdirSync } from "fs";
import { chromium } from "playwright";
import { createStarterContentBundle, STARTER_CONTENT_VERSION } from "./src/data/starterContent.js";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/starter-content-preservation";
const HEADED = process.argv.includes("--headed");

mkdirSync(OUT_DIR, { recursive: true });

const customBodyTarget = {
  id: "bt_custom_flow",
  name: "Custom Flow Zone",
  category: "muscle",
  isCustom: true,
};

const customExercise = {
  id: "ex_custom_flow",
  slug: "custom-flow-press",
  name: "Custom Flow Press",
  description: "User-imported pressing activity.",
  type: "physical",
  trackingType: "reps",
  supportedTrackingModes: ["reps"],
  bodyTargets: [customBodyTarget.id],
  equipment: ["Bodyweight"],
  cues: ["Brace", "Keep pace steady"],
  restSeconds: 40,
  aliases: [],
  movementPattern: "push",
  whyItHelps: "Verifies starter sync does not wipe imported activities.",
  isCustom: true,
};

const customRoutine = {
  id: "routine_custom_flow",
  name: "Custom Flow Routine",
  description: "User-authored session that should survive starter restore.",
  notes: "",
  difficultyScore: 3,
  createdAt: "2026-05-14T16:00:00.000Z",
  updatedAt: "2026-05-14T16:00:00.000Z",
  isCustom: true,
  entries: [
    {
      id: "entry_custom_flow_press",
      exerciseId: customExercise.id,
      order: 1,
      sets: 3,
      reps: 8,
      durationSeconds: null,
      weight: null,
      resistance: null,
      restSeconds: 40,
      notes: "",
    },
  ],
};

const customBlueprint = {
  id: "plan_custom_flow",
  version: "1.0",
  name: "Custom Flow Blueprint",
  description: "User-authored blueprint that should survive starter restore.",
  goal: "Prove starter sync restores starter content without touching custom plans.",
  theme: { color: "#4FD1C5", icon: "CF", code: "custom-flow" },
  createdAt: "2026-05-14T16:05:00.000Z",
  stages: [
    {
      id: "stage_custom_flow",
      name: "Flow Start",
      predecessorStageId: null,
      schedule: [{ type: "routine", routineId: customRoutine.id }],
      milestone: {
        description: "Complete the custom routine once.",
        eligibility: { type: "sessions", target: 1, requiresContinuous: false },
        test: {
          type: "exercise",
          source: "stage_entry",
          exerciseId: customExercise.id,
          metric: "reps",
          target: 8,
          routineId: customRoutine.id,
          routineEntryId: "entry_custom_flow_press",
          weight: null,
          resistance: null,
          restSeconds: 40,
          notes: "",
        },
        onFailure: { action: "none", targetStageId: null },
      },
      transitionRule: "prompt_user",
    },
  ],
};

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

async function readState(page) {
  return page.evaluate(() => ({
    meta: JSON.parse(localStorage.getItem("workout-app.meta.v1") || "{}"),
    bodyTargets: JSON.parse(localStorage.getItem("workout-app.bodymap.v1") || "{}").bodyMaps || [],
    exercises: JSON.parse(localStorage.getItem("workout-app.exercises.v1") || "{}").exercises || [],
    routines: JSON.parse(localStorage.getItem("workout-app.state.v1") || "{}").routines || [],
    plans: JSON.parse(localStorage.getItem("workout-app.plans.v1") || "{}").plan_blueprints || [],
  }));
}

async function seedCustomAndOutdatedState(page) {
  const starter = createStarterContentBundle();

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  await page.evaluate(({ starterVersion, nextCustomBodyTarget, nextCustomExercise, nextCustomRoutine, nextCustomBlueprint }) => {
    const starterBodyTargets = JSON.parse(localStorage.getItem("workout-app.bodymap.v1") || "null");
    const starterExercises = JSON.parse(localStorage.getItem("workout-app.exercises.v1") || "null");
    const starterRoutines = JSON.parse(localStorage.getItem("workout-app.state.v1") || "null");
    const starterPlans = JSON.parse(localStorage.getItem("workout-app.plans.v1") || "null");

    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({
      bodyMaps: [...(starterBodyTargets?.bodyMaps || []), nextCustomBodyTarget],
    }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({
      exercises: [...(starterExercises?.exercises || []), nextCustomExercise],
    }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({
      routines: [...(starterRoutines?.routines || []), nextCustomRoutine],
    }));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify({
      plan_blueprints: [...(starterPlans?.plan_blueprints || []), nextCustomBlueprint],
    }));

    localStorage.setItem("workout-app.meta.v1", JSON.stringify({
      starterContentVersion: `${starterVersion}-outdated`,
      starterContentSyncedAt: new Date().toISOString(),
    }));
  }, {
    starterVersion: STARTER_CONTENT_VERSION,
    nextCustomBodyTarget: customBodyTarget,
    nextCustomExercise: customExercise,
    nextCustomRoutine: customRoutine,
    nextCustomBlueprint: customBlueprint,
  });

  await page.reload({ waitUntil: "networkidle" });

  // Remove one starter item from each collection and mark starter content stale again.
  await page.evaluate(() => {
    const bodyPayload = JSON.parse(localStorage.getItem("workout-app.bodymap.v1") || "{}");
    const exercisePayload = JSON.parse(localStorage.getItem("workout-app.exercises.v1") || "{}");
    const routinePayload = JSON.parse(localStorage.getItem("workout-app.state.v1") || "{}");
    const planPayload = JSON.parse(localStorage.getItem("workout-app.plans.v1") || "{}");

    bodyPayload.bodyMaps = (bodyPayload.bodyMaps || []).filter((item) => item.id !== "bm_back");
    exercisePayload.exercises = (exercisePayload.exercises || []).filter((item) => item.id !== "ex_pushup");
    routinePayload.routines = (routinePayload.routines || []).filter((item) => item.id !== "rt_upper_base");
    planPayload.plan_blueprints = (planPayload.plan_blueprints || []).filter((item) => item.id !== "plan_grounded_strength_path");

    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify(bodyPayload));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify(exercisePayload));
    localStorage.setItem("workout-app.state.v1", JSON.stringify(routinePayload));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify(planPayload));

    const meta = JSON.parse(localStorage.getItem("workout-app.meta.v1") || "{}");
    meta.starterContentVersion = "stale-again";
    localStorage.setItem("workout-app.meta.v1", JSON.stringify(meta));
  });

  return starter;
}

async function main() {
  console.log("\n=== Starter Content Preservation Audit ===");
  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  try {
    const starter = await seedCustomAndOutdatedState(page);

    let state = await readState(page);
    assert(state.exercises.some((item) => item.id === customExercise.id), "Custom exercise should exist before starter restore.");
    assert(state.routines.some((item) => item.id === customRoutine.id), "Custom routine should exist before starter restore.");
    assert(state.plans.some((item) => item.id === customBlueprint.id), "Custom blueprint should exist before starter restore.");
    assert(state.bodyTargets.some((item) => item.id === customBodyTarget.id), "Custom body target should exist before starter restore.");

    await page.reload({ waitUntil: "networkidle" });
    await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
    await takeScreenshot(page, "01-blueprint-library-after-restore");

    state = await readState(page);

    assert(state.meta.starterContentVersion === STARTER_CONTENT_VERSION, `Starter content version should be current after restore, got ${state.meta.starterContentVersion}.`);
    assert(state.bodyTargets.some((item) => item.id === "bm_back"), "Missing starter body target should be restored.");
    assert(state.exercises.some((item) => item.id === "ex_pushup"), "Missing starter exercise should be restored.");
    assert(state.routines.some((item) => item.id === "rt_upper_base"), "Missing starter routine should be restored.");
    assert(state.plans.some((item) => item.id === "plan_grounded_strength_path"), "Missing starter blueprint should be restored.");

    assert(state.bodyTargets.some((item) => item.id === customBodyTarget.id), "Custom body target should remain after starter restore.");
    assert(state.exercises.some((item) => item.id === customExercise.id), "Custom exercise should remain after starter restore.");
    assert(state.routines.some((item) => item.id === customRoutine.id), "Custom routine should remain after starter restore.");
    assert(state.plans.some((item) => item.id === customBlueprint.id), "Custom blueprint should remain after starter restore.");

    assert(new Set(state.bodyTargets.map((item) => item.id)).size === state.bodyTargets.length, "Starter restore should not duplicate body targets.");
    assert(new Set(state.exercises.map((item) => item.id)).size === state.exercises.length, "Starter restore should not duplicate exercises.");
    assert(new Set(state.routines.map((item) => item.id)).size === state.routines.length, "Starter restore should not duplicate routines.");
    assert(new Set(state.plans.map((item) => item.id)).size === state.plans.length, "Starter restore should not duplicate blueprints.");

    assert(state.bodyTargets.length === starter.bodyTargets.length + 1, `Expected starter body targets plus one custom target, got ${state.bodyTargets.length}.`);
    assert(state.exercises.length === starter.exercises.length + 1, `Expected starter exercises plus one custom exercise, got ${state.exercises.length}.`);
    assert(state.routines.length === starter.routines.length + 1, `Expected starter routines plus one custom routine, got ${state.routines.length}.`);
    assert(state.plans.length === starter.plans.length + 1, `Expected starter blueprints plus one custom blueprint, got ${state.plans.length}.`);

    await page.goto(`${BASE}/#/exercise/${customExercise.id}`, { waitUntil: "networkidle" });
    await takeScreenshot(page, "02-custom-activity-still-present");

    await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
    const customCard = page.locator('.plan-card').filter({ hasText: customBlueprint.name }).first();
    assert(await customCard.isVisible({ timeout: 1500 }).catch(() => false), "Custom blueprint should still be visible in the library after starter restore.");
    await forceClick(customCard.locator('[data-action="select-plan"]').first());
    await page.waitForSelector('[data-action="start-plan"]');
    await takeScreenshot(page, "03-custom-blueprint-still-runnable");

    console.log(`Starter content preservation audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
