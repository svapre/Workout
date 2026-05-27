import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/live-plan-editor";
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

const activePlans = [
  {
    id: "active_living_plan",
    name: "Strength and Focus",
    displayName: "Strength and Focus",
    description: "Original active plan.",
    goal: "Stay consistent.",
    theme: { color: "#4FD1C5", icon: "SF", code: "sf-base" },
    version: "1.0",
    versionHistory: [
      {
        version: "1.0",
        modifiedAt: "2026-05-08T06:00:00.000Z",
        modifiedBy: "user",
        changeSummary: "Activated from blueprint",
      },
    ],
    blueprintId: "plan_strength_focus",
    blueprintVersion: "1.0",
    startedAt: "2026-05-08T06:00:00.000Z",
    currentStageIndex: 1,
    currentDayInCycle: 2,
    currentCycleCount: 3,
    streakDays: 4,
    lastSessionDate: "2026-05-08",
    stageHistory: [
      {
        stageId: "stage_base",
        stageName: "Base",
        startedAt: "2026-05-08T06:00:00.000Z",
        completedAt: "2026-05-09T06:00:00.000Z",
        completedVia: "milestone",
        failureCount: 0,
      },
      {
        stageId: "stage_build",
        stageName: "Build",
        startedAt: "2026-05-09T06:00:00.000Z",
        completedAt: null,
        completedVia: null,
        failureCount: 0,
      },
    ],
    sessions: [],
    stages: [
      {
        id: "stage_base",
        name: "Base",
        predecessorStageId: null,
        schedule: [{ type: "routine", routineId: "routine_strength" }],
        milestone: {
          description: "Complete one cycle",
          eligibility: { type: "cycles", target: 1, requiresContinuous: false },
          test: {
            type: "none",
            source: "custom",
            exerciseId: null,
            metric: null,
            target: null,
            routineId: null,
            routineEntryId: null,
            weight: null,
            resistance: null,
            restSeconds: null,
            notes: "",
          },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
      {
        id: "stage_build",
        name: "Build",
        predecessorStageId: "stage_base",
        schedule: [
          { type: "routine", routineId: "routine_strength" },
          { type: "rest", routineId: null },
        ],
        milestone: {
          description: "Earn the focus test",
          eligibility: { type: "sessions", target: 2, requiresContinuous: false },
          test: {
            type: "exercise",
            source: "custom",
            exerciseId: "ex_box_breath",
            metric: "duration",
            target: 60,
            routineId: null,
            routineEntryId: null,
            weight: null,
            resistance: null,
            restSeconds: 30,
            notes: "",
          },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
      {
        id: "stage_peak",
        name: "Peak",
        predecessorStageId: "stage_build",
        schedule: [
          { type: "routine", routineId: "routine_focus" },
          { type: "routine", routineId: "routine_strength" },
        ],
        milestone: {
          description: "Clear the final cycle",
          eligibility: { type: "cycles", target: 2, requiresContinuous: false },
          test: {
            type: "none",
            source: "custom",
            exerciseId: null,
            metric: null,
            target: null,
            routineId: null,
            routineEntryId: null,
            weight: null,
            resistance: null,
            restSeconds: null,
            notes: "",
          },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "manual",
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
  await page.evaluate(({ nextBodyTargets, nextExercises, nextRoutines, nextActivePlans }) => {
    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: nextBodyTargets }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: nextExercises }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: nextRoutines }));
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: [] }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: nextActivePlans }));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: [] }));
    localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
  }, {
    nextBodyTargets: bodyTargets,
    nextExercises: exercises,
    nextRoutines: routines,
    nextActivePlans: activePlans,
  });
}

async function readActivePlan(page) {
  return page.evaluate(() => (JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}").active_plans || [])[0]);
}

async function readWorkouts(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}").workouts || []);
}

async function openPlanTools(page) {
  const disclosure = page.locator("details.journey-advanced").first();
  await disclosure.waitFor({ state: "visible" });
  const isOpen = await disclosure.evaluate((element) => element.hasAttribute("open"));
  if (!isOpen) {
    await forceClick(disclosure.locator("summary"));
    await page.waitForTimeout(250);
  }
}

async function openEditorFromDetail(page) {
  await page.goto(`${BASE}/#/active-plan/active_living_plan`, { waitUntil: "networkidle" });
  await openPlanTools(page);
  await forceClick(page.locator('[data-action="apd-edit"]').first());
  await page.waitForURL(/#\/active-plan-edit\/active_living_plan/);
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
  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: HEADED ? 150 : 0,
  });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();
  const errors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console:${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`pageerror:${error.message}`);
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.includes("fonts.gstatic.com") || url.includes("fonts.googleapis.com")) {
      return;
    }
    errors.push(`requestfailed:${url}`);
  });

  try {
    await seedState(page);
    await page.reload({ waitUntil: "networkidle" });

    console.log("\n=== Live Plan Edit + Apply Flow ===");

    await openEditorFromDetail(page);
    await takeScreenshot(page, "01-editor-start");

    const editButtons = await page.locator('[data-action="edit-live-stage"]').count();
    assert(editButtons === 2, `Expected only current/future stages to be editable, found ${editButtons} edit buttons.`);

    await setFieldValue(page, '[data-field="displayName"]', "Strength and Focus / Revised");
    await setFieldValue(page, '[data-field="goal"]', "Keep the journey adaptive.");
    await forceClick(page.locator('[data-action="save-live-plan"]').first());
    await page.waitForURL(/#\/active-plan\/active_living_plan/);
    await takeScreenshot(page, "02-direct-save");

    let savedPlan = await readActivePlan(page);
    assert(savedPlan.displayName === "Strength and Focus / Revised", "Direct live-plan save did not persist the display name.");
    assert(savedPlan.goal === "Keep the journey adaptive.", "Direct live-plan save did not persist the goal.");
    assert(savedPlan.version === "1.1", `Direct live-plan save should bump the version to 1.1, got ${savedPlan.version}.`);
    assert(savedPlan.versionHistory.at(-1)?.modifiedBy === "user", "Direct live-plan save should append version history with modifiedBy=user.");

    await openEditorFromDetail(page);
    await page.locator('[data-action="edit-live-stage"][data-stage-id="stage_build"]').click();
    await page.locator('[data-action="update-live-day"][data-day-index="0"]').selectOption("routine_focus");
    await page.locator('[data-action="update-live-day"][data-day-index="1"]').selectOption("routine_focus");
    await forceClick(page.locator('[data-action="commit-live-stage-editor"]').first());
    await forceClick(page.locator('[data-action="save-live-plan"]').first());
    await page.waitForURL(/#\/active-plan-revision\/active_living_plan/);
    await takeScreenshot(page, "03-remap-review");

    await forceClick(page.locator('[data-action="apr-back"]').first());
    await page.waitForURL(/#\/active-plan-edit\/active_living_plan/);
    assert((await page.locator('[data-action="edit-live-stage"]').count()) === 2, "Returning from remap review should preserve the live-plan draft.");

    await forceClick(page.locator('[data-action="save-live-plan"]').first());
    await page.waitForURL(/#\/active-plan-revision\/active_living_plan/);
    await page.locator('[data-action="apr-anchor"]').selectOption("stage_build");
    await forceClick(page.locator('[data-action="apr-apply"]').first());
    await page.waitForURL(/#\/active-plan\/active_living_plan/);
    await takeScreenshot(page, "04-remap-applied");

    savedPlan = await readActivePlan(page);
    assert(savedPlan.currentDayInCycle === 1, `Manual remap should reset current day to 1, got ${savedPlan.currentDayInCycle}.`);
    assert(savedPlan.currentCycleCount === 0, `Manual remap should reset current cycle count to 0, got ${savedPlan.currentCycleCount}.`);
    assert(savedPlan.stageHistory.at(-1)?.stageId === "stage_build", "Manual remap should reopen the selected stage as the active history entry.");
    assert(savedPlan.stageHistory.at(-2)?.completedVia === "user_override", "Manual remap should close the previous history entry with user_override.");
    assert(savedPlan.version === "1.2", `Manual remap save should increment the version to 1.2, got ${savedPlan.version}.`);
    assert(savedPlan.stages[1]?.schedule?.[0]?.routineId === "routine_focus", "Edited stage schedule did not persist the new first routine.");

    await forceClick(page.locator('[data-action="apd-primary"]').first());
    await page.waitForURL(/#\/workout-player\/active_living_plan/);
    await takeScreenshot(page, "05-player-after-apply");

    const sessionResult = await completeCurrentSession(page, "active_living_plan");
    assert(sessionResult.sawCompleteAction, "The revised live plan never reached a logged workout step.");

    if (!page.url().includes("#/active-plan/active_living_plan")) {
      await page.goto(`${BASE}/#/active-plan/active_living_plan`, { waitUntil: "networkidle" });
    }
    await takeScreenshot(page, "06-detail-after-session");

    const workouts = await readWorkouts(page);
    assert(workouts.length >= 1, "No workout session was persisted after running the revised live plan.");
    const latestWorkout = workouts[0];
    assert(latestWorkout.activePlanId === "active_living_plan", "The revised session was not tied to the edited active plan.");
    assert(latestWorkout.activePlanVersion === "1.2", `Expected revised session to log activePlanVersion 1.2, got ${latestWorkout.activePlanVersion}.`);
    assert(latestWorkout.routineId === "routine_focus", `Expected revised session to run the edited focus routine, got ${latestWorkout.routineId}.`);
    assert(await page.locator('[data-action="apd-session"]').first().isVisible({ timeout: 1500 }).catch(() => false), "Recent sessions did not update after running the revised live plan.");

    await forceClick(page.locator('[data-action="apd-history"]').first());
    await page.waitForURL(/#\/workouts/);
    await takeScreenshot(page, "07-history-after-revision");
    assert(
      await page.locator('[data-action="select-history-plan"]').filter({ hasText: "Strength and Focus / Revised" }).first().isVisible({ timeout: 2000 }).catch(() => false),
      "Workout history did not list the revised active plan after the edited session.",
    );
    assert(
      await page.locator('[data-action="select-workout"]').filter({ hasText: "Focus Reset" }).first().isVisible({ timeout: 2000 }).catch(() => false),
      "Workout history did not show the revised session entry.",
    );

    if (errors.length) {
      throw new Error(`Browser reported errors:\n${errors.join("\n")}`);
    }

    console.log(`Live-plan editor audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
