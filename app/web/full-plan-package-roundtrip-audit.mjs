import { mkdirSync, readFileSync } from "fs";
import { chromium } from "playwright";
import { STARTER_CONTENT_VERSION } from "./src/data/starterContent.js";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/full-plan-package-roundtrip";
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
  await page.goto(`${BASE}/?seed=full-plan-package`, { waitUntil: "networkidle" });
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

async function authorCustomBlueprint(page) {
  const importedExerciseName = "Balance Reach";
  const routineName = "Balance Builder Routine";
  const blueprintName = "Balance Builder Export Path";
  const stageName = "Balance Start";

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
  assert(importedExercise, "Imported custom exercise was not persisted before package export.");

  await page.goto(`${BASE}/#/routines`, { waitUntil: "networkidle" });
  const initialRoutineIds = new Set((await readRoutines(page)).map((routine) => routine.id));
  await forceClick(page.locator('[data-action="create-routine"]').first());
  await page.waitForTimeout(300);

  const createdRoutine = (await readRoutines(page)).find((routine) => !initialRoutineIds.has(routine.id));
  assert(createdRoutine, "Could not create a new routine before export.");
  await forceClick(page.locator('[data-action="routine-card"]').filter({ hasText: createdRoutine.name }).first());
  await page.waitForURL(new RegExp(`#\\/routine\\/${createdRoutine.id}`));
  await forceClick(page.locator('[data-action="edit-routine"]').first());
  await page.waitForURL(/#\/routines/);

  await setFieldValue(page, '[data-routine-field="name"]', routineName);
  await setFieldValue(page, '[data-routine-field="notes"]', "Created to verify export and re-import across clean app states.");
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
  await forceClick(page.locator('[data-action="save-routine"]').first());
  await page.waitForURL(new RegExp(`#\\/routine\\/${createdRoutine.id}`));
  await takeScreenshot(page, "02-routine-detail-saved");

  const savedRoutine = (await readRoutines(page)).find((routine) => routine.id === createdRoutine.id);
  assert(savedRoutine?.entries?.[0]?.exerciseId === importedExercise.id, "Custom routine did not persist imported exercise before export.");

  await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
  const initialBlueprintCount = (await readBlueprints(page)).length;
  await forceClick(page.locator('[data-action="create-blueprint"]').first());
  await forceClick(page.locator('[data-action="edit-blueprint"]').first());
  await page.locator('[data-field="name"]').first().waitFor({ timeout: 3000 });
  await setFieldValue(page, '[data-field="name"]', blueprintName);
  await setFieldValue(page, '[data-field="goal"]', "Export and re-import a blueprint package that depends on custom activity content.");
  await setFieldValue(page, '[data-field="description"]', "The package should carry everything needed to recreate the plan in a starter-only app state.");
  await forceClick(page.locator('[data-action="edit-stage"]').first());
  await setFieldValue(page, '[data-stage-field="name"]', stageName);
  await page.locator('[data-action="update-day"][data-day-index="0"]').selectOption({ label: routineName });
  await forceClick(page.locator('[data-action="commit-stage-editor"]').first());
  await forceClick(page.locator('[data-action="save-blueprint"]').first());
  await page.waitForTimeout(400);
  await takeScreenshot(page, "03-blueprint-detail-ready-to-export");

  const blueprints = await readBlueprints(page);
  assert(blueprints.length === initialBlueprintCount + 1, "Blueprint count did not increase before export.");
  const authoredBlueprint = blueprints.find((entry) => entry.name === blueprintName);
  assert(authoredBlueprint, "Authored blueprint was not found before export.");

  return { importedExercise, savedRoutine, authoredBlueprint, routineName, blueprintName, importedExerciseName };
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
    console.log("\n=== Full Plan Package Roundtrip ===");

    await seedCleanState(page);
    const authored = await authorCustomBlueprint(page);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      forceClick(page.locator('[data-action="export-blueprint"]').first()),
    ]);
    const downloadPath = `${OUT_DIR}/exported-blueprint.json`;
    await download.saveAs(downloadPath);
    const exportedPackage = JSON.parse(readFileSync(downloadPath, "utf8"));

    assert(exportedPackage.plan?.name === authored.blueprintName, "Exported package did not contain the authored blueprint plan.");
    assert(Array.isArray(exportedPackage.routines) && exportedPackage.routines.some((routine) => routine.id === authored.savedRoutine.id), "Exported package did not include the authored routine.");
    assert(
      Array.isArray(exportedPackage.exercises) && exportedPackage.exercises.some((exercise) => exercise.id === authored.importedExercise.id),
      "Exported package did not include the referenced custom exercise.",
    );
    await takeScreenshot(page, "04-blueprint-detail-exported");

    await seedCleanState(page);
    await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });

    const dialogPromise = page.waitForEvent("dialog");
    await page.locator('#plan-import-input').setInputFiles(downloadPath);
    const dialog = await dialogPromise;
    const dialogMessage = dialog.message();
    await dialog.accept();
    assert(dialogMessage === "Blueprint imported successfully!", `Expected successful blueprint import dialog, got: ${dialogMessage}`);
    await page.waitForTimeout(500);
    await takeScreenshot(page, "05-blueprint-list-imported");

    const importedExercises = await readExercises(page);
    assert(
      importedExercises.some((exercise) => exercise.name === authored.importedExerciseName),
      "Imported package did not restore the custom exercise into the exercise library.",
    );
    const importedBlueprints = await readBlueprints(page);
    const importedBlueprint = importedBlueprints.find((entry) => entry.name === authored.blueprintName);
    assert(importedBlueprint, "Imported package did not recreate the blueprint in the plan library.");

    if (!(await isVisible(page, '[data-action="start-plan"]'))) {
      await forceClick(page.locator(`[data-action="select-plan"][data-plan-id="${importedBlueprint.id}"]`).first());
      await page.waitForTimeout(300);
    }
    await forceClick(page.locator('[data-action="start-plan"]').first());
    await page.locator('#modal-prompt-input').waitFor({ timeout: 3000 });
    await page.locator('#modal-prompt-input').fill('Imported Balance Builder Live');
    await forceClick(page.locator('[data-action="modal-confirm"]').first());
    await page.waitForURL(/#\/active-plans/);
    await takeScreenshot(page, "06-active-plans-after-import-activate");

    const activePlans = await readActivePlans(page);
    const activePlan = activePlans.find((plan) => plan.displayName === 'Imported Balance Builder Live');
    assert(activePlan, "Imported blueprint did not activate into a live plan.");

    await forceClick(page.locator('[data-action="plan-card"]').filter({ hasText: 'Imported Balance Builder Live' }).first());
    await page.waitForURL(new RegExp(`#\\/active-plan\\/${activePlan.id}`));
    await forceClick(page.locator('[data-action="apd-primary"]').first());
    await page.waitForURL(new RegExp(`#\\/workout-player\\/${activePlan.id}`));
    const playerText = await page.locator('body').textContent();
    assert(playerText?.includes(authored.routineName), "Imported package workout player did not show the authored routine name.");
    assert(playerText?.includes(authored.importedExerciseName), "Imported package workout player did not show the imported exercise name.");
    await takeScreenshot(page, "07-player-after-import");

    const sessionResult = await completeCurrentSession(page, activePlan.id);
    assert(sessionResult.sawCompleteAction, "Imported blueprint session never reached a logged workout step.");

    if (!page.url().includes(`#/active-plan/${activePlan.id}`)) {
      await page.goto(`${BASE}/#/active-plan/${activePlan.id}`, { waitUntil: "networkidle" });
    }
    await forceClick(page.locator('[data-action="apd-history"]').first());
    await page.waitForURL(/#\/workouts/);
    await takeScreenshot(page, "08-history-after-imported-session");

    const workouts = await readWorkouts(page);
    assert(workouts.some((workout) => workout.activePlanId === activePlan.id), "Imported active plan workout was not persisted into history.");

    if (pageErrors.length) {
      throw new Error(`Browser reported page errors:\n${pageErrors.join("\n")}`);
    }

    console.log(`Full plan package roundtrip audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
