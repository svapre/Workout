import { mkdirSync } from "fs";
import { chromium } from "playwright";
import { STARTER_CONTENT_VERSION } from "./src/data/starterContent.js";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/custom-library-roundtrip";
const HEADED = process.argv.includes("--headed");

const importedExercisePayload = {
  exercises: [
    {
      name: "Balance Reach",
      category: "mobility",
      type: "physical",
      trackingType: "reps",
      supportedTrackingModes: ["reps"],
      movementPattern: "balance",
      description: "Single-leg balance with a forward reach.",
      whyItHelps: "Builds control and lower-body stability without a heavy load.",
      cues: ["Stay tall", "Reach slowly"],
      equipment: ["Bodyweight"],
      restSeconds: 30,
    },
  ],
};

mkdirSync(OUT_DIR, { recursive: true });

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

async function setFieldValue(page, selector, value) {
  const field = page.locator(selector).first();
  await field.fill(value);
  await field.dispatchEvent("change");
}

async function seedState(page) {
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
  await page.goto(`${BASE}/?seed=custom-library-roundtrip`, { waitUntil: "networkidle" });
}

async function readExercises(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.exercises.v1") || "{}").exercises || []);
}

async function readRoutines(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.state.v1") || "{}").routines || []);
}

async function readBlueprints(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.plans.v1") || "{}").plan_blueprints || []);
}

async function readActivePlans(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}").active_plans || []);
}

async function readWorkouts(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}").workouts || []);
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
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    console.log("\n=== Custom Library Roundtrip ===");

    await seedState(page);

    const importedExerciseName = "Balance Reach";
    const routineName = "Balance Builder Routine";
    const blueprintName = "Balance Builder Path";
    const stageName = "Balance Start";
    const livePlanName = "Balance Builder Live";

    await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
    await page.locator('[data-role="exercise-import-input"]').setInputFiles({
      name: "custom-exercises.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(importedExercisePayload), "utf8"),
    });
    await page.locator(`text=${importedExerciseName}`).first().waitFor({ timeout: 4000 });
    await takeScreenshot(page, "01-exercise-library-imported");

    const exercises = await readExercises(page);
    const importedExercise = exercises.find((entry) => entry.name === importedExerciseName);
    assert(importedExercise, "Imported custom exercise was not persisted in the exercise catalog.");

    await page.goto(`${BASE}/#/routines`, { waitUntil: "networkidle" });
    const initialRoutineIds = new Set((await readRoutines(page)).map((routine) => routine.id));
    await forceClick(page.locator('[data-action="create-routine"]').first());
    await page.waitForTimeout(300);

    const routinesAfterCreate = await readRoutines(page);
    const newRoutine = routinesAfterCreate.find((routine) => !initialRoutineIds.has(routine.id));
    assert(newRoutine, "Could not find the new routine after creating it from the routine library.");
    await page.locator('[data-action="routine-card"]').filter({ hasText: newRoutine.name }).first().waitFor({ timeout: 3000 });
    await takeScreenshot(page, "02-routine-library-new-routine");

    await forceClick(page.locator('[data-action="routine-card"]').filter({ hasText: newRoutine.name }).first());
    await page.waitForURL(new RegExp(`#\\/routine\\/${newRoutine.id}`));
    await forceClick(page.locator('[data-action="edit-routine"]').first());
    await page.waitForURL(/#\/routines/);
    await page.waitForTimeout(300);

    await setFieldValue(page, '[data-routine-field="name"]', routineName);
    await setFieldValue(page, '[data-routine-field="notes"]', "Built from a custom imported balance activity.");
    await page.locator('[data-routine-field="difficultyScore"]').first().fill("3");
    await page.locator('[data-routine-field="difficultyScore"]').first().dispatchEvent("change");
    await forceClick(page.locator('[data-action="open-picker"]').first());
    await page.locator('#exercise-picker-modal').waitFor({ timeout: 3000 });
    await page.locator('#exercise-search').fill(importedExerciseName);
    await forceClick(page.locator('.picker-item').filter({ hasText: importedExerciseName }).first());
    await page.locator('[data-instance-id]').first().waitFor({ timeout: 3000 });
    await page.locator('[data-instance-id]').first().evaluate((node) => {
      node.open = true;
    });
    await page.locator('[data-instance-id]').first().locator('[data-field="sets"]').fill("2");
    await page.locator('[data-instance-id]').first().locator('[data-field="sets"]').dispatchEvent("change");
    await page.locator('[data-instance-id]').first().locator('[data-field="reps"]').fill("8");
    await page.locator('[data-instance-id]').first().locator('[data-field="reps"]').dispatchEvent("change");
    await page.locator('[data-instance-id]').first().locator('[data-field="restSeconds"]').fill("20");
    await page.locator('[data-instance-id]').first().locator('[data-field="restSeconds"]').dispatchEvent("change");
    await takeScreenshot(page, "03-routine-editor-imported-activity");

    await forceClick(page.locator('[data-action="save-routine"]').first());
    await page.waitForURL(new RegExp(`#\\/routine\\/${newRoutine.id}`));
    await page.waitForTimeout(300);
    await takeScreenshot(page, "04-routine-detail-saved");

    const savedRoutine = (await readRoutines(page)).find((routine) => routine.id === newRoutine.id);
    assert(savedRoutine?.name === routineName, `Custom routine name did not persist, got ${savedRoutine?.name}.`);
    assert(savedRoutine?.entries?.length === 1, `Expected 1 imported activity in the saved routine, got ${savedRoutine?.entries?.length}.`);
    assert(savedRoutine?.entries?.[0]?.exerciseId === importedExercise.id, "Saved routine did not persist the imported custom exercise reference.");

    await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
    const initialBlueprintCount = (await readBlueprints(page)).length;
    await forceClick(page.locator('[data-action="create-blueprint"]').first());
    await page.waitForTimeout(300);
    await forceClick(page.locator('[data-action="edit-blueprint"]').first());
    await page.waitForTimeout(300);

    await page.locator('[data-field="name"]').first().waitFor({ timeout: 3000 });
    await setFieldValue(page, '[data-field="name"]', blueprintName);
    await setFieldValue(page, '[data-field="goal"]', "Turn the imported balance activity into a reusable starter plan.");
    await setFieldValue(page, '[data-field="description"]', "Author a custom routine, slot it into a blueprint, then make sure it survives activation and execution.");
    await forceClick(page.locator('[data-action="edit-stage"]').first());
    await page.waitForTimeout(300);

    await setFieldValue(page, '[data-stage-field="name"]', stageName);
    await setFieldValue(page, '[data-stage-field="guidance"]', "Start with the imported balance reach routine so the first live workout proves the full custom-content path.");
    await page.locator('[data-action="update-day"][data-day-index="0"]').selectOption({ label: routineName });
    await takeScreenshot(page, "05-blueprint-stage-editor-custom-routine");
    await forceClick(page.locator('[data-action="commit-stage-editor"]').first());
    await page.waitForTimeout(300);

    await forceClick(page.locator('[data-action="save-blueprint"]').first());
    await page.waitForTimeout(400);
    await takeScreenshot(page, "06-blueprint-detail-saved");

    const blueprints = await readBlueprints(page);
    assert(
      blueprints.length === initialBlueprintCount + 1,
      `Expected blueprint count to grow by 1 after authoring, started with ${initialBlueprintCount} and got ${blueprints.length}.`,
    );
    const authoredBlueprint = blueprints.find((entry) => entry.name === blueprintName);
    assert(authoredBlueprint, "Could not find the authored custom blueprint in storage after save.");
    assert(authoredBlueprint.stages?.[0]?.name === stageName, `Blueprint stage name did not persist, got ${authoredBlueprint.stages?.[0]?.name}.`);
    assert(
      authoredBlueprint.stages?.[0]?.schedule?.[0]?.routineId === newRoutine.id,
      "Blueprint stage schedule did not persist the authored custom routine.",
    );

    await forceClick(page.locator('[data-action="start-plan"]').first());
    await page.locator('#modal-prompt-input').waitFor({ timeout: 3000 });
    await page.locator('#modal-prompt-input').fill(livePlanName);
    await forceClick(page.locator('[data-action="modal-confirm"]').first());
    await page.waitForURL(/#\/active-plans/);
    await page.waitForTimeout(400);
    await takeScreenshot(page, "07-active-plans-after-activate");

    const activePlans = await readActivePlans(page);
    assert(activePlans.length === 1, `Expected 1 active plan after activation, got ${activePlans.length}.`);
    const activePlan = activePlans[0];
    assert(activePlan.displayName === livePlanName, `Active plan displayName did not persist, got ${activePlan.displayName}.`);
    assert(activePlan.blueprintId === authoredBlueprint.id, "Active plan was not instantiated from the authored custom blueprint.");
    assert(activePlan.stages?.[0]?.schedule?.[0]?.routineId === newRoutine.id, "Active plan did not carry the authored custom routine into runtime.");

    await forceClick(page.locator('[data-action="plan-card"]').filter({ hasText: livePlanName }).first());
    await page.waitForURL(new RegExp(`#\\/active-plan\\/${activePlan.id}`));
    await page.waitForTimeout(400);
    await takeScreenshot(page, "08-active-plan-detail");

    await forceClick(page.locator('[data-action="apd-primary"]').first());
    await page.waitForURL(new RegExp(`#\\/workout-player\\/${activePlan.id}`));
    await takeScreenshot(page, "09-player-custom-routine");

    const playerText = await page.locator("body").textContent();
    assert(playerText?.includes(routineName), "Workout player did not show the authored custom routine name.");
    assert(playerText?.includes(importedExerciseName), "Workout player did not show the imported custom exercise name.");

    const sessionResult = await completeCurrentSession(page, activePlan.id);
    assert(sessionResult.sawCompleteAction, "The custom-content plan never reached a logged workout step.");

    if (!page.url().includes(`#/active-plan/${activePlan.id}`)) {
      await page.goto(`${BASE}/#/active-plan/${activePlan.id}`, { waitUntil: "networkidle" });
    }
    await takeScreenshot(page, "10-detail-after-session");

    const workouts = await readWorkouts(page);
    assert(workouts.length >= 1, "No workout session was persisted after running the custom-content active plan.");
    const latestWorkout = workouts[0];
    assert(latestWorkout.activePlanId === activePlan.id, "The custom-content session was not tied to the activated plan.");
    assert(latestWorkout.routineId === newRoutine.id, `Expected the first custom-content session to use ${newRoutine.id}, got ${latestWorkout.routineId}.`);

    await forceClick(page.locator('[data-action="apd-history"]').first());
    await page.waitForURL(/#\/workouts/);
    await takeScreenshot(page, "11-history-after-session");

    assert(
      await page.locator('[data-action="select-history-plan"]').filter({ hasText: livePlanName }).first().isVisible({ timeout: 2000 }).catch(() => false),
      "Workout history did not list the custom-content active plan.",
    );
    assert(
      await page.locator('[data-action="select-workout"]').filter({ hasText: routineName }).first().isVisible({ timeout: 2000 }).catch(() => false),
      "Workout history did not show the custom routine session entry.",
    );

    if (pageErrors.length) {
      throw new Error(`Browser reported page errors:\n${pageErrors.join("\n")}`);
    }

    console.log(`Custom library roundtrip audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
