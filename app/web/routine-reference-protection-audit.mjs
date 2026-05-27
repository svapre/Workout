import { mkdirSync } from "fs";
import { chromium } from "playwright";
import { STARTER_CONTENT_VERSION } from "./src/data/starterContent.js";
import { createActivePlanFromBlueprint } from "./src/data/schemaMigration.js";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/routine-reference-protection";
const HEADED = process.argv.includes("--headed");

mkdirSync(OUT_DIR, { recursive: true });

const bodyTargets = [
  { id: "bm_chest", name: "Chest", category: "muscle", isCustom: false },
  { id: "bm_core", name: "Core", category: "muscle", isCustom: false },
];

const exercises = [
  {
    id: "ex_pushup",
    slug: "push-up",
    name: "Push-Up",
    description: "Simple pressing anchor.",
    type: "physical",
    trackingType: "reps",
    supportedTrackingModes: ["reps"],
    bodyTargets: ["bm_chest", "bm_core"],
    equipment: ["Bodyweight"],
    cues: ["Brace", "Press evenly"],
    restSeconds: 45,
    aliases: [],
    movementPattern: "push",
    whyItHelps: "Builds repeatable pushing strength.",
    isCustom: false,
  },
];

const routines = [
  {
    id: "routine_protected",
    name: "Protected Routine",
    description: "Still used by saved plans.",
    notes: "",
    difficultyScore: 3,
    createdAt: "2026-05-14T08:00:00.000Z",
    updatedAt: "2026-05-14T08:00:00.000Z",
    isCustom: true,
    entries: [
      {
        id: "entry_pushup_protected",
        exerciseId: "ex_pushup",
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
  {
    id: "routine_unused",
    name: "Unused Routine",
    description: "Safe to delete.",
    notes: "",
    difficultyScore: 2,
    createdAt: "2026-05-14T08:05:00.000Z",
    updatedAt: "2026-05-14T08:05:00.000Z",
    isCustom: true,
    entries: [
      {
        id: "entry_pushup_unused",
        exerciseId: "ex_pushup",
        order: 1,
        sets: 2,
        reps: 6,
        durationSeconds: null,
        weight: null,
        resistance: null,
        restSeconds: 30,
        notes: "",
      },
    ],
  },
];

const blueprint = {
  id: "plan_routine_guard",
  version: "1.0",
  name: "Routine Guard Blueprint",
  description: "Protect referenced routines from accidental deletion.",
  goal: "Keep saved plans safe when library routines are cleaned up.",
  theme: { color: "#4FD1C5", icon: "RG", code: "routine-guard" },
  createdAt: "2026-05-14T08:10:00.000Z",
  stages: [
    {
      id: "stage_foundation",
      name: "Foundation",
      predecessorStageId: null,
      schedule: [{ type: "routine", routineId: "routine_protected" }],
      milestone: {
        description: "Complete the routine once with clean execution.",
        eligibility: { type: "sessions", target: 1, requiresContinuous: false },
        test: {
          type: "exercise",
          source: "stage_entry",
          exerciseId: "ex_pushup",
          metric: "reps",
          target: 8,
          routineId: "routine_protected",
          routineEntryId: "entry_pushup_protected",
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
  displayName: "Routine Guard Live",
  blueprintId: blueprint.id,
});
activePlan.startedAt = "2026-05-14T08:15:00.000Z";
activePlan.displayName = "Routine Guard Live";

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

async function readRoutines(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.state.v1") || "{}").routines || []);
}

async function readPlans(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.plans.v1") || "{}").plan_blueprints || []);
}

async function readActivePlans(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}").active_plans || []);
}

async function seedState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ nextBodyTargets, nextExercises, nextRoutines, nextBlueprint, nextActivePlan, starterVersion }) => {
    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: nextBodyTargets }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: nextExercises }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: nextRoutines }));
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: [] }));
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
    starterVersion: STARTER_CONTENT_VERSION,
  });
  // Reload so the SPA boots from the seeded localStorage instead of the
  // in-memory defaults created during the first page load.
  await page.reload({ waitUntil: "networkidle" });
  await page.goto(`${BASE}/#/routines`, { waitUntil: "networkidle" });
}

async function openRoutineFromLibrary(page, routineId) {
  await page.waitForSelector(`[data-action="open-routine"][data-routine-id="${routineId}"]`);
  await forceClick(page.locator(`[data-action="open-routine"][data-routine-id="${routineId}"]`).first());
  await page.waitForURL(new RegExp(`#\/routine\/${routineId}$`));
}

async function reopenRoutineLibrary(page) {
  await page.goto(`${BASE}/#/routines`, { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "networkidle" });
}

async function openRoutineEditor(page) {
  await forceClick(page.locator('[data-action="edit-routine"]').first());
  await page.waitForURL(/#\/routines/);
  await page.waitForSelector('[data-action="delete-routine"]');
}

async function attemptDeleteRoutine(page) {
  await forceClick(page.locator('[data-action="delete-routine"]').first());
  await page.waitForSelector('.modal-content');
  await forceClick(page.locator('.modal-content button').filter({ hasText: /^Delete$/ }).first());
  await page.waitForSelector('.status-message');
}

async function main() {
  console.log("\n=== Routine Reference Protection Audit ===");
  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  try {
    await seedState(page);
    await openRoutineFromLibrary(page, "routine_protected");
    await openRoutineEditor(page);
    await takeScreenshot(page, "01-protected-routine-editor");

    await attemptDeleteRoutine(page);
    const blockedNotice = (await page.locator('.status-message').textContent())?.trim() || "";
    assert(/Can't delete "Protected Routine"/i.test(blockedNotice), `Expected blocked delete notice, received: ${blockedNotice}`);
    assert(/1 active plan/i.test(blockedNotice), `Blocked delete notice should mention the active plan usage. Received: ${blockedNotice}`);
    assert(/1 blueprint/i.test(blockedNotice), `Blocked delete notice should mention the blueprint usage. Received: ${blockedNotice}`);

    const afterBlockedRoutines = await readRoutines(page);
    assert(afterBlockedRoutines.some((routine) => routine.id === "routine_protected"), "Protected routine should remain in the library after blocked delete.");
    assert((await readPlans(page)).some((plan) => plan.id === blueprint.id), "Blueprint should remain intact after blocked routine delete.");
    assert((await readActivePlans(page)).some((plan) => plan.id === activePlan.id), "Active plan should remain intact after blocked routine delete.");
    await takeScreenshot(page, "02-protected-routine-blocked");

    await reopenRoutineLibrary(page);
    await openRoutineFromLibrary(page, "routine_unused");
    await openRoutineEditor(page);

    await attemptDeleteRoutine(page);
    const successNotice = (await page.locator('.status-message').textContent())?.trim() || "";
    assert(/Deleted "Unused Routine"\./i.test(successNotice), `Expected success delete notice, received: ${successNotice}`);

    const afterDeleteRoutines = await readRoutines(page);
    assert(!afterDeleteRoutines.some((routine) => routine.id === "routine_unused"), "Unused routine should be removed after delete.");
    assert(afterDeleteRoutines.some((routine) => routine.id === "routine_protected"), "Protected routine should still exist after deleting the unused routine.");
    await takeScreenshot(page, "03-unused-routine-deleted");

    await page.goto(`${BASE}/#/active-plans`, { waitUntil: "networkidle" });
    assert(await page.getByText("Routine Guard Live").first().isVisible({ timeout: 1000 }).catch(() => false), "Protected active plan should still be visible after routine protection checks.");
    await takeScreenshot(page, "04-active-plan-still-healthy");

    console.log(`Routine reference protection audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
