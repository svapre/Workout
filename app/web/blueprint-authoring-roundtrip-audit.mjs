import { mkdirSync } from "fs";
import { chromium } from "playwright";
import { STARTER_CONTENT_VERSION } from "./src/data/starterContent.js";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/blueprint-authoring-roundtrip";
const HEADED = process.argv.includes("--headed");

mkdirSync(OUT_DIR, { recursive: true });

const bodyTargets = [
  { id: "bm_chest", name: "Chest", category: "muscle", isCustom: false },
  { id: "bm_core", name: "Core", category: "muscle", isCustom: false },
  { id: "bm_focus", name: "Focus", category: "mental", isCustom: true },
];

const exercises = [
  {
    id: "ex_pushup",
    slug: "push-up",
    name: "Push-Up",
    description: "Pressing anchor.",
    type: "physical",
    trackingType: "reps",
    bodyTargets: ["bm_chest", "bm_core"],
    equipment: ["Bodyweight"],
    cues: ["Brace"],
    restSeconds: 60,
    aliases: [],
    movementPattern: "push",
    whyItHelps: "Simple strength anchor.",
    isCustom: false,
  },
  {
    id: "ex_box_breath",
    slug: "box-breath",
    name: "Box Breath",
    description: "Breathing reset block.",
    type: "mental",
    trackingType: "duration",
    bodyTargets: ["bm_focus"],
    equipment: [],
    cues: ["Long exhale"],
    restSeconds: 30,
    aliases: [],
    movementPattern: "breathe",
    whyItHelps: "Calm focus anchor.",
    isCustom: true,
  },
];

const routines = [
  {
    id: "routine_strength",
    name: "Strength Session",
    description: "Push-up work.",
    notes: "",
    difficultyScore: 4,
    createdAt: "2026-05-08T06:00:00.000Z",
    updatedAt: "2026-05-08T06:00:00.000Z",
    isCustom: false,
    entries: [
      {
        id: "entry_pushup",
        exerciseId: "ex_pushup",
        order: 1,
        sets: 3,
        reps: 10,
        durationSeconds: null,
        weight: null,
        resistance: null,
        restSeconds: 60,
        notes: "",
      },
    ],
  },
  {
    id: "routine_focus",
    name: "Focus Reset",
    description: "Breathing reset.",
    notes: "",
    difficultyScore: 1,
    createdAt: "2026-05-08T06:00:00.000Z",
    updatedAt: "2026-05-08T06:00:00.000Z",
    isCustom: true,
    entries: [
      {
        id: "entry_breath",
        exerciseId: "ex_box_breath",
        order: 1,
        sets: 3,
        reps: null,
        durationSeconds: 60,
        weight: null,
        resistance: null,
        restSeconds: 30,
        notes: "",
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

async function setFieldValue(page, selector, value) {
  const field = page.locator(selector).first();
  await field.fill(value);
  await field.dispatchEvent("change");
}

async function seedState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ nextBodyTargets, nextExercises, nextRoutines, starterVersion }) => {
    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: nextBodyTargets }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: nextExercises }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: nextRoutines }));
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: [] }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: [] }));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: [] }));
    localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
    localStorage.setItem(
      "workout-app.meta.v1",
      JSON.stringify({ starterContentVersion: starterVersion, starterContentSyncedAt: new Date().toISOString() }),
    );
  }, {
    nextBodyTargets: bodyTargets,
    nextExercises: exercises,
    nextRoutines: routines,
    starterVersion: STARTER_CONTENT_VERSION,
  });
  await page.goto(`${BASE}/?seed=blueprint-authoring`, { waitUntil: "networkidle" });
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
    ["#log-reps", "10"],
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
  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  try {
    console.log("\n=== Blueprint Authoring Roundtrip ===");
    await seedState(page);
    await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
    const initialBlueprintCount = (await readBlueprints(page)).length;

    await forceClick(page.locator('[data-action="create-blueprint"]').first());
    await page.waitForTimeout(400);
    await takeScreenshot(page, "01-blueprint-detail-new");

    await forceClick(page.locator('[data-action="edit-blueprint"]').first());
    await page.waitForTimeout(400);
    await takeScreenshot(page, "02-blueprint-editor-start");

    await setFieldValue(page, '[data-field="name"]', "Authoring Roundtrip Path");
    await setFieldValue(page, '[data-field="goal"]', "Build a repeatable strength start with a calmer finish.");
    await setFieldValue(page, '[data-field="description"]', "Best for someone who wants to edit a blueprint, activate it, and run the authored plan immediately.");

    await forceClick(page.locator('[data-action="edit-stage"]').first());
    await page.waitForTimeout(350);
    await setFieldValue(page, '[data-stage-field="name"]', "Strength Start");
    await setFieldValue(page, '[data-stage-field="guidance"]', "Open with a single strength session so the first live workout matches the authored intent.");
    await page.locator('[data-action="update-day"][data-day-index="0"]').selectOption({ label: "Strength Session" });
    await forceClick(page.locator('[data-action="commit-stage-editor"]').first());
    await page.waitForTimeout(350);

    await forceClick(page.locator('[data-action="add-stage"]').first());
    await page.waitForTimeout(350);
    await takeScreenshot(page, "03-stage-editor-second-stage");
    await setFieldValue(page, '[data-stage-field="name"]', "Focus Finish");
    await setFieldValue(page, '[data-stage-field="guidance"]', "Use a calmer breathing reset as the follow-up stage once the strength foundation is in place.");
    await page.locator('[data-action="update-day"][data-day-index="0"]').selectOption({ label: "Focus Reset" });
    await forceClick(page.locator('[data-action="commit-stage-editor"]').first());
    await page.waitForTimeout(350);
    await takeScreenshot(page, "04-blueprint-editor-ready-to-save");

    await forceClick(page.locator('[data-action="save-blueprint"]').first());
    await page.waitForTimeout(500);
    await takeScreenshot(page, "05-blueprint-detail-saved");

    const blueprints = await readBlueprints(page);
    assert(
      blueprints.length === initialBlueprintCount + 1,
      `Expected blueprint count to grow by 1 after authoring, started with ${initialBlueprintCount} and got ${blueprints.length}.`,
    );
    const blueprint = blueprints.find((entry) => entry.name === "Authoring Roundtrip Path");
    assert(blueprint, "Could not find the authored blueprint in storage after save.");
    assert(blueprint.name === "Authoring Roundtrip Path", `Blueprint title did not persist, got ${blueprint.name}.`);
    assert(blueprint.stages.length === 2, `Expected 2 authored stages, got ${blueprint.stages.length}.`);
    assert(blueprint.stages[0]?.name === "Strength Start", `Stage 1 name did not persist, got ${blueprint.stages[0]?.name}.`);
    assert(blueprint.stages[0]?.schedule?.[0]?.routineId === "routine_strength", "Stage 1 routine schedule did not persist the strength routine.");
    assert(blueprint.stages[1]?.name === "Focus Finish", `Stage 2 name did not persist, got ${blueprint.stages[1]?.name}.`);
    assert(blueprint.stages[1]?.schedule?.[0]?.routineId === "routine_focus", "Stage 2 routine schedule did not persist the focus routine.");

    await forceClick(page.locator('[data-action="start-plan"]').first());
    await page.locator('#modal-prompt-input').waitFor({ timeout: 3000 });
    await page.locator('#modal-prompt-input').fill('Authoring Roundtrip Live');
    await forceClick(page.locator('[data-action="modal-confirm"]').first());
    await page.waitForURL(/#\/active-plans/);
    await page.waitForTimeout(400);
    await takeScreenshot(page, "06-active-plans-after-activate");

    const activePlans = await readActivePlans(page);
    assert(activePlans.length === 1, `Expected 1 active plan after activation, got ${activePlans.length}.`);
    const activePlan = activePlans[0];
    assert(activePlan.displayName === "Authoring Roundtrip Live", `Active plan displayName did not persist, got ${activePlan.displayName}.`);
    assert(activePlan.blueprintId === blueprint.id, "Active plan was not instantiated from the authored blueprint.");
    assert(activePlan.stages[0]?.name === "Strength Start", `Active plan Stage 1 name mismatch: ${activePlan.stages[0]?.name}.`);
    assert(activePlan.stages[1]?.name === "Focus Finish", `Active plan Stage 2 name mismatch: ${activePlan.stages[1]?.name}.`);

    await forceClick(page.locator('[data-action="plan-card"]').filter({ hasText: "Authoring Roundtrip Live" }).first());
    await page.waitForURL(new RegExp(`#\\/active-plan\\/${activePlan.id}`));
    await page.waitForTimeout(400);
    await takeScreenshot(page, "07-active-plan-detail");

    assert(await page.locator('text=Strength Start').first().isVisible({ timeout: 1500 }).catch(() => false), "Active plan detail did not show the authored current stage name.");
    assert(await page.locator('text=Focus Finish').first().isVisible({ timeout: 1500 }).catch(() => false), "Active plan detail did not show the authored later stage name.");

    await forceClick(page.locator('[data-action="apd-primary"]').first());
    await page.waitForURL(new RegExp(`#\\/workout-player\\/${activePlan.id}`));
    await takeScreenshot(page, "08-player-authored-session");

    const sessionResult = await completeCurrentSession(page, activePlan.id);
    assert(sessionResult.sawCompleteAction, "The authored plan never reached a logged workout step.");

    if (!page.url().includes(`#/active-plan/${activePlan.id}`)) {
      await page.goto(`${BASE}/#/active-plan/${activePlan.id}`, { waitUntil: "networkidle" });
    }
    await takeScreenshot(page, "09-detail-after-session");

    const workouts = await readWorkouts(page);
    assert(workouts.length >= 1, "No workout session was persisted after running the authored active plan.");
    const latestWorkout = workouts[0];
    assert(latestWorkout.activePlanId === activePlan.id, "The authored session was not tied to the activated plan.");
    assert(latestWorkout.routineId === "routine_strength", `Expected the first authored session to use routine_strength, got ${latestWorkout.routineId}.`);

    await forceClick(page.locator('[data-action="apd-history"]').first());
    await page.waitForURL(/#\/workouts/);
    await takeScreenshot(page, "10-history-after-authored-session");

    assert(
      await page.locator('[data-action="select-history-plan"]').filter({ hasText: "Authoring Roundtrip Live" }).first().isVisible({ timeout: 2000 }).catch(() => false),
      "Workout history did not list the authored active plan.",
    );
    assert(
      await page.locator('[data-action="select-workout"]').filter({ hasText: "Strength Session" }).first().isVisible({ timeout: 2000 }).catch(() => false),
      "Workout history did not show the authored session entry.",
    );

    if (errors.length) {
      throw new Error(`Browser reported errors:\n${errors.join("\n")}`);
    }

    console.log(`Blueprint authoring roundtrip audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
