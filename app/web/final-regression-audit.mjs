import { mkdirSync, readFileSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/final-regression";

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
        sets: 2,
        reps: 10,
        durationSeconds: null,
        weight: null,
        resistance: null,
        restSeconds: 30,
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
        sets: 2,
        reps: null,
        durationSeconds: 45,
        weight: null,
        resistance: null,
        restSeconds: 20,
        notes: "",
      },
    ],
  },
];

const blueprints = [
  {
    id: "plan_custom_focus_strength",
    version: "1.0",
    name: "Custom Focus Strength",
    description: "Custom blueprint that should survive boot without master-seed reinjection.",
    goal: "Preserve my local library state.",
    theme: { color: "#4FD1C5", icon: "CF", code: "custom-focus" },
    createdAt: "2026-05-08T06:00:00.000Z",
    stages: [
      {
        id: "stage_blueprint_base",
        name: "Blueprint Base",
        predecessorStageId: null,
        schedule: [{ type: "routine", routineId: "routine_strength" }, { type: "rest", routineId: null }],
        milestone: {
          description: "Complete one cycle.",
          eligibility: { type: "cycles", target: 1, requiresContinuous: false },
          test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
];

const activePlans = [
  {
    id: "active_ready_plan",
    name: "Custom Focus Strength",
    displayName: "Custom Focus Strength",
    description: "Live plan before hardening regression.",
    goal: "Stay adaptive.",
    theme: { color: "#4FD1C5", icon: "CF", code: "custom-focus" },
    version: "1.0",
    versionHistory: [{ version: "1.0", modifiedAt: "2026-05-08T06:00:00.000Z", modifiedBy: "user", changeSummary: "Activated from blueprint" }],
    blueprintId: "plan_custom_focus_strength",
    blueprintVersion: "1.0",
    startedAt: "2026-05-08T06:00:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 1,
    currentCycleCount: 0,
    streakDays: 0,
    lastSessionDate: null,
    stageHistory: [{ stageId: "stage_live_base", stageName: "Foundation", startedAt: "2026-05-08T06:00:00.000Z", completedAt: null, completedVia: null, failureCount: 0 }],
    sessions: [],
    stages: [
      {
        id: "stage_live_base",
        name: "Foundation",
        predecessorStageId: null,
        schedule: [{ type: "routine", routineId: "routine_strength" }, { type: "rest", routineId: null }],
        milestone: {
          description: "Complete two cycles.",
          eligibility: { type: "cycles", target: 2, requiresContinuous: false },
          test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
      {
        id: "stage_live_peak",
        name: "Peak",
        predecessorStageId: "stage_live_base",
        schedule: [{ type: "routine", routineId: "routine_focus" }, { type: "routine", routineId: "routine_strength" }],
        milestone: {
          description: "Clear the final cycle.",
          eligibility: { type: "cycles", target: 1, requiresContinuous: false },
          test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "manual",
      },
    ],
  },
];

async function seedState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ nextBodyTargets, nextExercises, nextRoutines, nextBlueprints, nextActivePlans }) => {
    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: nextBodyTargets }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: nextExercises }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: nextRoutines }));
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: [] }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: nextActivePlans }));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: nextBlueprints }));
    localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
  }, {
    nextBodyTargets: bodyTargets,
    nextExercises: exercises,
    nextRoutines: routines,
    nextBlueprints: blueprints,
    nextActivePlans: activePlans,
  });
}

async function forceClick(locator) {
  await locator.evaluate((element) => element.click());
}

async function commitFieldChange(locator, value) {
  await locator.evaluate((element, nextValue) => {
    element.value = nextValue;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function readState(page) {
  return page.evaluate(() => ({
    bodyMap: JSON.parse(localStorage.getItem("workout-app.bodymap.v1") || "{}"),
    exercises: JSON.parse(localStorage.getItem("workout-app.exercises.v1") || "{}"),
    routines: JSON.parse(localStorage.getItem("workout-app.state.v1") || "{}"),
    workouts: JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}"),
    activePlans: JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}"),
    plans: JSON.parse(localStorage.getItem("workout-app.plans.v1") || "{}"),
  }));
}

async function runWorkoutSession(page) {
  await forceClick(page.locator('[data-action="apd-resume"]'));
  await page.waitForURL(/#\/workout-player\/active_ready_plan/);

  const startButton = page.locator('[data-action="start"]');
  if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await forceClick(startButton);
  }

  for (let i = 0; i < 12; i += 1) {
    const action = await page.evaluate(() => {
      const continueJourney = document.querySelector('[data-action="continue-journey"]');
      const difficulty = document.querySelector('[data-difficulty]');
      const skipRest = document.querySelector('[data-action="skip-rest"]');
      const complete = document.querySelector('[data-action="complete"]');
      if (continueJourney) return "continue";
      if (difficulty) return "difficulty";
      if (skipRest) return "rest";
      if (complete) return "complete";
      return "none";
    });

    if (action === "continue" || action === "difficulty") {
      break;
    }

    if (action === "rest") {
      await forceClick(page.locator('[data-action="skip-rest"]'));
      await page.waitForTimeout(150);
      continue;
    }

    if (action === "complete") {
      const repsInput = page.locator('#log-reps');
      if (await repsInput.isVisible({ timeout: 250 }).catch(() => false)) {
        await repsInput.fill("10");
      }
      await forceClick(page.locator('[data-action="complete"]'));
      await page.waitForTimeout(150);
      continue;
    }

    await page.waitForTimeout(200);
  }

  await forceClick(page.locator('[data-action="continue-journey"]'));
  await page.waitForTimeout(250);
  await forceClick(page.locator('[data-difficulty="normal"]'));
  await page.waitForURL(/#\/active-plan\/active_ready_plan/);
}

const browser = await chromium.launch({ headless: false, slowMo: 150 });
const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(message.text());
  }
});
page.on("pageerror", (error) => {
  errors.push(error.message);
});

await seedState(page);
await page.reload({ waitUntil: "networkidle" });

await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT_DIR}/01-no-reseed-boot.png`, fullPage: true });
const bootState = await readState(page);
if ((bootState.plans.plan_blueprints || []).length !== 1 || bootState.plans.plan_blueprints[0]?.id !== "plan_custom_focus_strength") {
  throw new Error("Blueprint boot state was mutated unexpectedly.");
}
if ((bootState.routines.routines || []).length !== 2 || (bootState.exercises.exercises || []).length !== 2) {
  throw new Error("Library state was unexpectedly reseeded or replaced during boot.");
}
if ((bootState.plans.plan_blueprints || []).some((plan) => plan.id === "plan_master_rehab_strength")) {
  throw new Error("Master-seed blueprint should not be auto-injected over existing local data.");
}

await page.goto(`${BASE}/#/active-plan/active_ready_plan`, { waitUntil: "networkidle" });
await forceClick(page.locator('[data-action="apd-edit"]'));
await page.waitForURL(/#\/active-plan-edit\/active_ready_plan/);
await commitFieldChange(page.locator('[data-field="displayName"]'), "Custom Focus Strength / Ready");
await forceClick(page.locator('[data-action="save-live-plan"]'));
await page.waitForURL(/#\/active-plan\/active_ready_plan/);
await page.screenshot({ path: `${OUT_DIR}/02-live-edit-saved.png`, fullPage: true });

let state = await readState(page);
let activePlan = state.activePlans.active_plans[0];
if (activePlan.displayName !== "Custom Focus Strength / Ready" || activePlan.version !== "1.1") {
  throw new Error("Direct live-plan edit did not save expected metadata or version.");
}

await runWorkoutSession(page);
await page.screenshot({ path: `${OUT_DIR}/03-post-session.png`, fullPage: true });

state = await readState(page);
activePlan = state.activePlans.active_plans[0];
const workouts = state.workouts.workouts || [];
const savedWorkout = workouts.find((workout) => workout.activePlanId === "active_ready_plan");
if (!savedWorkout || savedWorkout.reflectionRating !== "normal") {
  throw new Error("Workout session did not save with reflectionRating.");
}
if (activePlan.currentDayInCycle !== 2 || (activePlan.sessions || []).length !== 1) {
  throw new Error("Routine execution did not advance the live plan correctly.");
}

const [download] = await Promise.all([
  page.waitForEvent("download"),
  forceClick(page.locator('[data-action="apd-export"]')),
]);
const downloadPath = await download.path();
const exportedPackage = JSON.parse(readFileSync(downloadPath, "utf8"));
if (exportedPackage.sessions?.length !== 1 || exportedPackage.sessions[0]?.reflectionRating !== "normal") {
  throw new Error("Active-plan export did not include the logged session with reflectionRating.");
}

const revisedPackage = structuredClone(exportedPackage);
revisedPackage.activePlan.displayName = "Coach Revised Journey";
revisedPackage.activePlan.description = "Revised after reviewing the first session.";
revisedPackage.activePlan.goal = "Keep the plan responsive without losing the journey.";
revisedPackage.activePlan.theme = { color: "#F6AD55", icon: "CR", code: "coach-revised" };
revisedPackage.activePlan.stages[1].name = "Peak Plus";

await page.locator('[data-action="apd-import-file"]').setInputFiles({
  name: "coach-revision.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(revisedPackage, null, 2)),
});
await page.waitForURL(/#\/active-plan-revision\/active_ready_plan/);
await page.screenshot({ path: `${OUT_DIR}/04-import-review.png`, fullPage: true });
await forceClick(page.locator('[data-action="apr-apply"]'));
await page.waitForURL(/#\/active-plan\/active_ready_plan/);
await page.screenshot({ path: `${OUT_DIR}/05-post-import.png`, fullPage: true });

state = await readState(page);
activePlan = state.activePlans.active_plans[0];
if (activePlan.displayName !== "Coach Revised Journey" || activePlan.version !== "1.2") {
  throw new Error("Revision import did not apply expected metadata or version changes.");
}
if ((activePlan.sessions || []).length !== 1) {
  throw new Error("Revision import should not overwrite local session ownership.");
}
if (activePlan.currentDayInCycle !== 2) {
  throw new Error("Revision import should preserve the mapped current day when stage mapping is clean.");
}

await forceClick(page.locator('[data-action="apd-resume"]'));
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT_DIR}/06-after-rest-complete.png`, fullPage: true });

state = await readState(page);
activePlan = state.activePlans.active_plans[0];
if (activePlan.currentDayInCycle !== 1 || activePlan.currentCycleCount !== 1) {
  throw new Error("Rest-step continuation after revision did not roll the schedule forward correctly.");
}

if (errors.length) {
  throw new Error(`Console/page errors detected during regression audit: ${errors.join(" | ")}`);
}

console.log(`Final regression audit passed. Screenshots: ${OUT_DIR}`);
await browser.close();
