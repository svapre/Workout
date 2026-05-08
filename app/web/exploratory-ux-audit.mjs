import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/exploratory-ux-audit";

mkdirSync(OUT_DIR, { recursive: true });

const bodyTargets = [
  { id: "bm_core", name: "Core", category: "muscle", isCustom: false },
  { id: "bm_back", name: "Back", category: "muscle", isCustom: false },
  { id: "bm_focus", name: "Focus", category: "mental", isCustom: true },
];

const exercises = [
  {
    id: "ex_pushup",
    slug: "push-up",
    name: "Push-Up",
    description: "Simple push anchor.",
    type: "physical",
    trackingType: "reps",
    bodyTargets: ["bm_core"],
    equipment: ["Bodyweight"],
    cues: ["Brace"],
    restSeconds: 20,
    aliases: [],
    movementPattern: "push",
    whyItHelps: "Simple test movement.",
    isCustom: false,
  },
  {
    id: "ex_bird_dog",
    slug: "bird-dog",
    name: "Bird Dog",
    description: "Alternating trunk-control drill.",
    type: "mobility",
    trackingType: "duration",
    bodyTargets: ["bm_core", "bm_back"],
    equipment: ["Mat"],
    cues: ["Reach long", "Stay stable"],
    restSeconds: 20,
    aliases: [],
    movementPattern: "brace",
    whyItHelps: "Builds trunk control and positional awareness.",
    isCustom: false,
  },
  {
    id: "ex_box_breath",
    slug: "box-breath",
    name: "Box Breath",
    description: "Breathing reset.",
    type: "mental",
    trackingType: "duration",
    bodyTargets: ["bm_focus"],
    equipment: [],
    cues: ["Long exhale"],
    restSeconds: 15,
    aliases: [],
    movementPattern: "breathe",
    whyItHelps: "Simple mental anchor.",
    isCustom: true,
  },
];

const routines = [
  {
    id: "routine_strength",
    name: "Strength Session",
    description: "Quick pushing block.",
    notes: "",
    difficultyScore: 3,
    createdAt: "2026-05-08T06:00:00.000Z",
    updatedAt: "2026-05-08T06:00:00.000Z",
    isCustom: false,
    entries: [
      {
        id: "entry_pushup",
        exerciseId: "ex_pushup",
        order: 1,
        sets: 1,
        reps: 10,
        durationSeconds: null,
        weight: null,
        resistance: null,
        restSeconds: 10,
        notes: "",
      },
    ],
  },
  {
    id: "routine_bird_dog",
    name: "Bird Dog Flow",
    description: "Alternating reps with a hold.",
    notes: "Intentionally includes both reps and duration to probe mixed tracking behavior.",
    difficultyScore: 2,
    createdAt: "2026-05-08T06:00:00.000Z",
    updatedAt: "2026-05-08T06:00:00.000Z",
    isCustom: true,
    entries: [
      {
        id: "entry_bird_dog",
        exerciseId: "ex_bird_dog",
        order: 1,
        sets: 1,
        reps: 8,
        durationSeconds: 30,
        weight: null,
        resistance: null,
        restSeconds: 10,
        notes: "30 seconds each side alternating through 8 reps.",
      },
    ],
  },
  {
    id: "routine_focus",
    name: "Focus Reset",
    description: "Quick breathing block.",
    notes: "",
    difficultyScore: 1,
    createdAt: "2026-05-08T06:00:00.000Z",
    updatedAt: "2026-05-08T06:00:00.000Z",
    isCustom: true,
    entries: [
      {
        id: "entry_box_breath",
        exerciseId: "ex_box_breath",
        order: 1,
        sets: 1,
        reps: null,
        durationSeconds: 45,
        weight: null,
        resistance: null,
        restSeconds: 10,
        notes: "",
      },
    ],
  },
];

const plans = [
  {
    id: "active_rest_boundary",
    name: "Recovery Boundary",
    displayName: "Recovery Boundary",
    description: "Used to inspect rest-day stage progression.",
    goal: "See what recovery actually does.",
    theme: { color: "#4FD1C5", icon: "RB", code: "rb" },
    version: "1.0",
    versionHistory: [{ version: "1.0", modifiedAt: "2026-05-08T06:00:00.000Z", modifiedBy: "user", changeSummary: "Seeded" }],
    blueprintId: null,
    blueprintVersion: null,
    startedAt: "2026-05-08T06:00:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 2,
    currentCycleCount: 0,
    streakDays: 0,
    lastSessionDate: null,
    stageHistory: [{ stageId: "stage_rb_1", stageName: "Foundation", startedAt: "2026-05-08T06:00:00.000Z", completedAt: null, completedVia: null, failureCount: 0 }],
    sessions: [],
    stages: [
      {
        id: "stage_rb_1",
        name: "Foundation",
        predecessorStageId: null,
        schedule: [
          { type: "routine", routineId: "routine_strength" },
          { type: "rest", routineId: null },
        ],
        milestone: {
          description: "Complete one cycle.",
          eligibility: { type: "cycles", target: 1, requiresContinuous: false },
          test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
      {
        id: "stage_rb_2",
        name: "Build",
        predecessorStageId: "stage_rb_1",
        schedule: [{ type: "routine", routineId: "routine_focus" }],
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
  {
    id: "active_finish_flow",
    name: "Finish Flow",
    displayName: "Finish Flow",
    description: "Used to inspect completion and leave confirmation.",
    goal: "Finish a routine and try leaving.",
    theme: { color: "#F6AD55", icon: "FF", code: "ff" },
    version: "1.0",
    versionHistory: [{ version: "1.0", modifiedAt: "2026-05-08T06:00:00.000Z", modifiedBy: "user", changeSummary: "Seeded" }],
    blueprintId: null,
    blueprintVersion: null,
    startedAt: "2026-05-08T06:00:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 1,
    currentCycleCount: 0,
    streakDays: 0,
    lastSessionDate: null,
    stageHistory: [{ stageId: "stage_ff_1", stageName: "Base", startedAt: "2026-05-08T06:00:00.000Z", completedAt: null, completedVia: null, failureCount: 0 }],
    sessions: [],
    stages: [
      {
        id: "stage_ff_1",
        name: "Base",
        predecessorStageId: null,
        schedule: [{ type: "routine", routineId: "routine_strength" }],
        milestone: {
          description: "Complete two cycles.",
          eligibility: { type: "cycles", target: 2, requiresContinuous: false },
          test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
  {
    id: "active_bird_dog_flow",
    name: "Bird Dog Study",
    displayName: "Bird Dog Study",
    description: "Used to inspect mixed tracking behavior.",
    goal: "See how Bird Dog is rendered.",
    theme: { color: "#63B3ED", icon: "BD", code: "bd" },
    version: "1.0",
    versionHistory: [{ version: "1.0", modifiedAt: "2026-05-08T06:00:00.000Z", modifiedBy: "user", changeSummary: "Seeded" }],
    blueprintId: null,
    blueprintVersion: null,
    startedAt: "2026-05-08T06:00:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 1,
    currentCycleCount: 0,
    streakDays: 0,
    lastSessionDate: null,
    stageHistory: [{ stageId: "stage_bd_1", stageName: "Base", startedAt: "2026-05-08T06:00:00.000Z", completedAt: null, completedVia: null, failureCount: 0 }],
    sessions: [],
    stages: [
      {
        id: "stage_bd_1",
        name: "Base",
        predecessorStageId: null,
        schedule: [{ type: "routine", routineId: "routine_bird_dog" }],
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

async function seedState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ nextBodyTargets, nextExercises, nextRoutines, nextPlans }) => {
    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: nextBodyTargets }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: nextExercises }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: nextRoutines }));
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: [] }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: nextPlans }));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: [] }));
    localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
  }, {
    nextBodyTargets: bodyTargets,
    nextExercises: exercises,
    nextRoutines: routines,
    nextPlans: plans,
  });
}

async function readActivePlan(page, planId) {
  return page.evaluate((targetPlanId) => {
    const activePlans = JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}").active_plans || [];
    return activePlans.find((plan) => plan.id === targetPlanId) || null;
  }, planId);
}

async function forceClick(locator) {
  await locator.evaluate((element) => element.click());
}

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
const observations = [];
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

await page.goto(`${BASE}/#/active-plan/active_rest_boundary`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT_DIR}/01-recovery-before.png`, fullPage: true });
const recoveryButtonBefore = (await page.locator('[data-action="apd-resume"]').textContent())?.trim() || "";
const recoveryHashBefore = await page.evaluate(() => window.location.hash);
await forceClick(page.locator('[data-action="apd-resume"]'));
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT_DIR}/02-recovery-after.png`, fullPage: true });
const recoveryHashAfter = await page.evaluate(() => window.location.hash);
const recoveryButtonAfter = (await page.locator('[data-action="apd-resume"]').textContent())?.trim() || "";
const recoverySecondaryText = (await page.locator('[data-action="apd-secondary"]').textContent().catch(() => ""))?.trim() || "";
const restPlanAfter = await readActivePlan(page, "active_rest_boundary");
observations.push({
  area: "Recovery flow",
  beforeHash: recoveryHashBefore,
  afterHash: recoveryHashAfter,
  beforeButton: recoveryButtonBefore,
  afterButton: recoveryButtonAfter,
  secondaryButton: recoverySecondaryText,
  currentStageIndex: restPlanAfter?.currentStageIndex,
  currentDayInCycle: restPlanAfter?.currentDayInCycle,
  currentCycleCount: restPlanAfter?.currentCycleCount,
  note:
    recoveryButtonAfter.startsWith("Advance to") && recoverySecondaryText === "Continue current stage"
      ? "Rest-step completion now keeps the user on the detail screen, marks the cycle complete, and makes stage advancement the clear primary action."
      : "Rest-step completion differed from the expected explicit stage-ready state.",
});

await page.goto(`${BASE}/#/active-plan/active_finish_flow`, { waitUntil: "networkidle" });
await forceClick(page.locator('[data-action="apd-resume"]'));
await page.waitForURL(/#\/workout-player\/active_finish_flow/);
await forceClick(page.locator('[data-action="start"]'));
await page.waitForTimeout(250);
if (await page.locator('#log-reps').isVisible().catch(() => false)) {
  await page.locator('#log-reps').fill("10");
}
await forceClick(page.locator('[data-action="complete"]'));
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT_DIR}/04-completion-before-reflection.png`, fullPage: true });
const savedBeforeReflection = await page.evaluate(() => {
  const workouts = JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}").workouts || [];
  return {
    count: workouts.length,
    latestReflection: workouts[0]?.reflectionRating ?? null,
  };
});
await page.evaluate(() => window.appActions.navigate("active-plans"));
await page.waitForTimeout(300);
const abandonPromptText = await page.locator('#global-modal-overlay p').textContent().catch(() => "");
const abandonPromptVisible = await page.locator('#global-modal-overlay').isVisible().catch(() => false);
observations.push({
  area: "Completion exit behavior",
  savedBeforeReflection,
  promptVisibleBeforeReflection: abandonPromptVisible,
  promptText: abandonPromptText || "",
  note: !abandonPromptVisible && savedBeforeReflection.count >= 4 && savedBeforeReflection.latestReflection == null
    ? "By the time the completion screen is visible, the session is already saved with a null reflection, so leaving no longer triggers an abandon-workout confirmation."
    : "Completion-screen exit behavior differed from the expected autosaved flow.",
});

await seedState(page);
await page.reload({ waitUntil: "networkidle" });
await page.goto(`${BASE}/#/active-plan/active_finish_flow`, { waitUntil: "networkidle" });
await forceClick(page.locator('[data-action="apd-resume"]'));
await page.waitForURL(/#\/workout-player\/active_finish_flow/);
await forceClick(page.locator('[data-action="start"]'));
await page.waitForTimeout(250);
if (await page.locator('#log-reps').isVisible().catch(() => false)) {
  await page.locator('#log-reps').fill("10");
}
await forceClick(page.locator('[data-action="complete"]'));
await page.waitForTimeout(250);
await forceClick(page.locator('[data-action="continue-journey"]'));
await page.waitForTimeout(200);
await forceClick(page.locator('[data-difficulty="normal"]'));
await page.waitForURL(/#\/active-plan\/active_finish_flow/);
await page.waitForTimeout(300);
const reflectionAfterSave = await page.evaluate(() => {
  const workouts = JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}").workouts || [];
  return workouts[0]?.reflectionRating ?? null;
});
observations.push({
  area: "Reflection update",
  reflectionAfterSave,
  note: reflectionAfterSave === "normal"
    ? "Optional reflection still updates the already-saved session correctly."
    : "Reflection update did not persist the expected value.",
});

await page.goto(`${BASE}/#/active-plan/active_bird_dog_flow`, { waitUntil: "networkidle" });
await forceClick(page.locator('[data-action="apd-resume"]'));
await page.waitForURL(/#\/workout-player\/active_bird_dog_flow/);
await forceClick(page.locator('[data-action="start"]'));
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT_DIR}/05-bird-dog-active-set.png`, fullPage: true });
const birdDogInputState = await page.evaluate(() => ({
  repsVisible: Boolean(document.querySelector('#log-reps')),
  durationVisible: Boolean(document.querySelector('#log-duration')),
}));
observations.push({
  area: "Bird Dog mixed tracking",
  ...birdDogInputState,
  note: birdDogInputState.durationVisible && !birdDogInputState.repsVisible
    ? "The routine entry carries both reps and duration, but the player only exposes duration because the exercise trackingType is single-valued."
    : "Bird Dog input behavior differed from the expected mixed-tracking limitation.",
});

console.log(JSON.stringify({
  observations,
  errors,
  screenshots: OUT_DIR,
}, null, 2));

await browser.close();
