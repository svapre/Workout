import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://localhost:8000";
const VIEWPORT = { width: 390, height: 844 };
const OUT_DIR = "screenshots/mobile-ui-audit";

mkdirSync(OUT_DIR, { recursive: true });

const bodyMaps = [
  { id: "bm_chest", name: "Chest", category: "muscle", isCustom: false },
  { id: "bm_back", name: "Back", category: "muscle", isCustom: false },
  { id: "bm_core", name: "Core", category: "muscle", isCustom: false },
  { id: "bm_quads", name: "Quadriceps", category: "muscle", isCustom: false },
  { id: "bm_hamstrings", name: "Hamstrings", category: "muscle", isCustom: false },
];

const exercises = [
  {
    id: "ex_pushup",
    slug: "push-up",
    name: "Push-Up",
    description: "Press from the floor with a steady tempo and clean shoulder position.",
    type: "physical",
    trackingType: "reps",
    bodyTargets: ["bm_chest", "bm_core"],
    equipment: ["Bodyweight"],
    cues: ["Brace first", "Own the bottom"],
    restSeconds: 75,
    aliases: ["Press-up"],
    movementPattern: "push",
    whyItHelps: "Builds pressing tolerance without equipment.",
    isCustom: false,
  },
  {
    id: "ex_plank",
    slug: "front-plank",
    name: "Front Plank",
    description: "Low-friction trunk stability work for warm-ups, recovery days, and time-based blocks.",
    type: "mobility",
    trackingType: "duration",
    bodyTargets: ["bm_core"],
    equipment: ["Mat"],
    cues: ["Ribs down", "Glutes on"],
    restSeconds: 45,
    aliases: ["Forearm Plank"],
    movementPattern: "brace",
    whyItHelps: "Gives the execution engine a clean duration-based anchor movement.",
    isCustom: false,
  },
  {
    id: "ex_row",
    slug: "dumbbell-row",
    name: "Dumbbell Row",
    description: "Single-arm row with deliberate elbow path and stable trunk.",
    type: "physical",
    trackingType: "weight",
    bodyTargets: ["bm_back"],
    equipment: ["Dumbbell", "Bench"],
    cues: ["Pull elbow to hip", "Pause at the top"],
    restSeconds: 90,
    aliases: ["One-Arm Row"],
    movementPattern: "pull",
    whyItHelps: "Balances pushing volume and makes load progression explicit.",
    isCustom: false,
  },
  {
    id: "ex_split_squat",
    slug: "split-squat",
    name: "Split Squat",
    description: "Lower-body unilateral work with stable pacing and clear rep targets.",
    type: "physical",
    trackingType: "reps",
    bodyTargets: ["bm_quads", "bm_hamstrings"],
    equipment: ["Bodyweight"],
    cues: ["Stay tall", "Track the front knee"],
    restSeconds: 75,
    aliases: ["Static Lunge"],
    movementPattern: "squat",
    whyItHelps: "Adds leg volume without complicating setup.",
    isCustom: false,
  },
];

const routines = [
  {
    id: "routine_full_body_a",
    name: "Full Body A",
    description: "Simple push, pull, and brace block.",
    notes: "Primary strength day with a short trunk finisher.",
    difficultyScore: 6,
    createdAt: "2026-05-08T06:00:00.000Z",
    updatedAt: "2026-05-08T06:00:00.000Z",
    isCustom: false,
    entries: [
      {
        id: "entry_pushup",
        exerciseId: "ex_pushup",
        order: 1,
        sets: 4,
        reps: 10,
        durationSeconds: null,
        weight: null,
        resistance: null,
        restSeconds: 75,
        notes: "",
      },
      {
        id: "entry_row",
        exerciseId: "ex_row",
        order: 2,
        sets: 4,
        reps: 8,
        durationSeconds: null,
        weight: 20,
        resistance: null,
        restSeconds: 90,
        notes: "",
      },
      {
        id: "entry_plank",
        exerciseId: "ex_plank",
        order: 3,
        sets: 3,
        reps: null,
        durationSeconds: 45,
        weight: null,
        resistance: null,
        restSeconds: 45,
        notes: "",
      },
    ],
  },
  {
    id: "routine_lower_reset",
    name: "Lower Reset",
    description: "Lighter support day with one lower-body driver and a timed brace.",
    notes: "Good second-session test for card density and mobile editor length.",
    difficultyScore: 4,
    createdAt: "2026-05-08T06:30:00.000Z",
    updatedAt: "2026-05-08T06:30:00.000Z",
    isCustom: false,
    entries: [
      {
        id: "entry_split_squat",
        exerciseId: "ex_split_squat",
        order: 1,
        sets: 3,
        reps: 12,
        durationSeconds: null,
        weight: null,
        resistance: null,
        restSeconds: 75,
        notes: "",
      },
      {
        id: "entry_reset_plank",
        exerciseId: "ex_plank",
        order: 2,
        sets: 3,
        reps: null,
        durationSeconds: 30,
        weight: null,
        resistance: null,
        restSeconds: 45,
        notes: "",
      },
    ],
  },
];

const plans = [
  {
    id: "plan_master_rehab_strength",
    version: "1.0.0",
    name: "Strength Base",
    description: "Build a repeatable strength rhythm with one primary session and one support session.",
    goal: "Complete the first stage with clean execution and minimal friction.",
    theme: { color: "#4FD1C5", icon: "SB", code: "strength-base" },
    createdAt: "2026-05-08T07:00:00.000Z",
    stages: [
      {
        id: "stage_base",
        name: "Foundation",
        predecessorStageId: null,
        schedule: [
          { type: "routine", routineId: "routine_full_body_a" },
          { type: "rest", routineId: null },
          { type: "routine", routineId: "routine_lower_reset" },
        ],
        milestone: {
          description: "Complete 4 cycles with steady form.",
          type: "cycles",
          target: 4,
          requiresContinuous: false,
          exerciseId: null,
          metric: null,
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
      {
        id: "stage_build",
        name: "Build",
        predecessorStageId: "stage_base",
        schedule: [
          { type: "routine", routineId: "routine_full_body_a" },
          { type: "routine", routineId: "routine_lower_reset" },
          { type: "rest", routineId: null },
        ],
        milestone: {
          description: "Log 8 completed sessions.",
          type: "sessions",
          target: 8,
          requiresContinuous: false,
          exerciseId: null,
          metric: null,
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
  {
    id: "plan_mobility_reset",
    version: "1.0.0",
    name: "Mobility Reset",
    description: "Shorter reset-oriented blueprint with a time-based anchor and explicit recovery days.",
    goal: "Rehearse a calm recovery rhythm without deciding what comes next.",
    theme: { color: "#F6AD55", icon: "MR", code: "mobility-reset" },
    createdAt: "2026-05-08T07:30:00.000Z",
    stages: [
      {
        id: "stage_reset",
        name: "Reset",
        predecessorStageId: null,
        schedule: [
          { type: "routine", routineId: "routine_lower_reset" },
          { type: "rest", routineId: null },
        ],
        milestone: {
          description: "Accumulate 180 seconds on Front Plank.",
          type: "exercise_target",
          target: 180,
          requiresContinuous: false,
          exerciseId: "ex_plank",
          metric: "duration",
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
];

const workouts = [
  {
    id: "session_001",
    activePlanId: "active_strength_base",
    activePlanVersion: "1.0.0",
    routineId: "routine_full_body_a",
    stageId: "stage_base",
    startedAt: "2026-05-07T06:00:00.000Z",
    completedAt: "2026-05-07T06:32:00.000Z",
    reflectionRating: "strong",
    sets: [
      { exerciseId: "ex_pushup", setNumber: 1, status: "completed", actualReps: 10, actualDurationSec: null, actualWeightKg: null, actualResistance: null },
      { exerciseId: "ex_pushup", setNumber: 2, status: "completed", actualReps: 10, actualDurationSec: null, actualWeightKg: null, actualResistance: null },
      { exerciseId: "ex_row", setNumber: 1, status: "completed", actualReps: 8, actualDurationSec: null, actualWeightKg: 20, actualResistance: null },
      { exerciseId: "ex_plank", setNumber: 1, status: "completed", actualReps: null, actualDurationSec: 45, actualWeightKg: null, actualResistance: null },
    ],
  },
  {
    id: "session_002",
    activePlanId: "active_strength_base",
    activePlanVersion: "1.0.0",
    routineId: "routine_lower_reset",
    stageId: "stage_base",
    startedAt: "2026-05-06T06:00:00.000Z",
    completedAt: "2026-05-06T06:24:00.000Z",
    reflectionRating: "normal",
    sets: [
      { exerciseId: "ex_split_squat", setNumber: 1, status: "completed", actualReps: 12, actualDurationSec: null, actualWeightKg: null, actualResistance: null },
      { exerciseId: "ex_split_squat", setNumber: 2, status: "partial", actualReps: 10, actualDurationSec: null, actualWeightKg: null, actualResistance: null },
      { exerciseId: "ex_plank", setNumber: 1, status: "completed", actualReps: null, actualDurationSec: 30, actualWeightKg: null, actualResistance: null },
    ],
  },
];

const activePlans = [
  {
    id: "active_strength_base",
    name: "Strength Base",
    displayName: "Strength Base",
    description: "Build a repeatable strength rhythm with one primary session and one support session.",
    goal: "Complete the first stage with clean execution and minimal friction.",
    theme: { color: "#4FD1C5", icon: "SB", code: "strength-base" },
    version: "1.0.0",
    versionHistory: [
      {
        version: "1.0.0",
        modifiedAt: "2026-05-08T07:00:00.000Z",
        modifiedBy: "user",
        changeSummary: "Activated from blueprint",
      },
    ],
    blueprintId: "plan_master_rehab_strength",
    blueprintVersion: "1.0.0",
    startedAt: "2026-05-08T07:00:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 1,
    currentCycleCount: 0,
    streakDays: 2,
    lastSessionDate: "2026-05-07",
    stageHistory: [
      {
        stageId: "stage_base",
        stageName: "Foundation",
        startedAt: "2026-05-08T07:00:00.000Z",
        completedAt: null,
        completedVia: null,
        failureCount: 0,
      },
    ],
    sessions: ["session_001", "session_002"],
    stages: structuredClone(plans[0].stages),
  },
  {
    id: "active_mobility_reset",
    name: "Mobility Reset",
    displayName: "Mobility Reset",
    description: "Shorter reset-oriented blueprint with a time-based anchor and explicit recovery days.",
    goal: "Rehearse a calm recovery rhythm without deciding what comes next.",
    theme: { color: "#F6AD55", icon: "MR", code: "mobility-reset" },
    version: "1.0.0",
    versionHistory: [
      {
        version: "1.0.0",
        modifiedAt: "2026-05-08T07:30:00.000Z",
        modifiedBy: "user",
        changeSummary: "Activated from blueprint",
      },
    ],
    blueprintId: "plan_mobility_reset",
    blueprintVersion: "1.0.0",
    startedAt: "2026-05-08T07:30:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 2,
    currentCycleCount: 0,
    streakDays: 1,
    lastSessionDate: "2026-05-06",
    stageHistory: [
      {
        stageId: "stage_reset",
        stageName: "Reset",
        startedAt: "2026-05-08T07:30:00.000Z",
        completedAt: null,
        completedVia: null,
        failureCount: 0,
      },
    ],
    sessions: [],
    stages: structuredClone(plans[1].stages),
  },
];

const consoleIssues = [];

async function capture(page, name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
  console.log(`  screenshot: ${name}.png`);
}

async function getMetrics(page) {
  return page.evaluate(() => ({
    scrollHeight: document.scrollingElement.scrollHeight,
    clientHeight: document.scrollingElement.clientHeight,
    scrollWidth: document.scrollingElement.scrollWidth,
    clientWidth: document.scrollingElement.clientWidth,
  }));
}

async function visibleBox(locator) {
  await locator.waitFor({ state: "visible", timeout: 5000 });
  const box = await locator.boundingBox();
  if (!box) {
    return null;
  }

  return {
    top: Number(box.y.toFixed(1)),
    bottom: Number((box.y + box.height).toFixed(1)),
    left: Number(box.x.toFixed(1)),
    right: Number((box.x + box.width).toFixed(1)),
  };
}

async function logScrollState(page, label) {
  const metrics = await getMetrics(page);
  const scrollable = metrics.scrollHeight > metrics.clientHeight + 1;
  const horizontalOverflow = metrics.scrollWidth > metrics.clientWidth + 1;
  console.log(`  ${label}: ${scrollable ? "scrollable" : "fits on one screen"} / horizontal overflow: ${horizontalOverflow ? "yes" : "no"}`);
  return { scrollable, horizontalOverflow, metrics };
}

async function seedLocalStorage(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ seedBodyMaps, seedExercises, seedRoutines, seedPlans, seedWorkouts, seedActivePlans }) => {
      localStorage.clear();
      localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: seedBodyMaps }));
      localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: seedExercises }));
      localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: seedRoutines }));
      localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: seedWorkouts }));
      localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: seedPlans }));
      localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: seedActivePlans }));
      localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
    },
    {
      seedBodyMaps: bodyMaps,
      seedExercises: exercises,
      seedRoutines: routines,
      seedPlans: plans,
      seedWorkouts: workouts,
      seedActivePlans: activePlans,
    },
  );
  await page.reload({ waitUntil: "networkidle" });
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 250 });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleIssues.push(`Console error: ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleIssues.push(`Page error: ${error.message}`);
  });

  await seedLocalStorage(page);

  console.log("\n=== 1. Home / Active Plans ===");
  await page.goto(`${BASE}/#/active-plans`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await capture(page, "01-active-plans");
  await logScrollState(page, "Active plans");
  console.log(`  plan cards: ${await page.locator(".plan-card").count()}`);
  await page.locator('[data-action="plan-card"]').first().click();
  await page.waitForTimeout(700);
  await capture(page, "02-active-plan-detail");
  const detailCtaBox = await visibleBox(page.locator('[data-action="apd-resume"]'));
  console.log(`  active plan CTA bottom: ${detailCtaBox?.bottom ?? "hidden"}`);
  await logScrollState(page, "Active plan detail");

  console.log("\n=== 2. Exercise Library ===");
  await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await capture(page, "03-exercises-list");
  await logScrollState(page, "Exercise list");
  console.log(`  cards: ${await page.locator(".plan-card").count()}`);
  console.log(`  import visible: ${await page.locator('[data-action="import-exercises"]').isVisible()}`);
  await page.locator('[data-action="select-exercise"]').last().scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await capture(page, "04-exercises-bottom");
  await page.locator('[data-action="select-exercise"]').first().click();
  await page.waitForTimeout(500);
  await capture(page, "05-exercise-detail");
  await logScrollState(page, "Exercise detail");

  console.log("\n=== 3. Routine Library ===");
  await page.goto(`${BASE}/#/routines`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await capture(page, "06-routines-list");
  await logScrollState(page, "Routine list");
  await page.locator('[data-action="select-routine"]').first().click();
  await page.waitForTimeout(600);
  await capture(page, "07-routine-editor-top");
  const routineSaveInitial = await visibleBox(page.locator('[data-action="save-routine"]'));
  console.log(`  save routine initial bottom: ${routineSaveInitial?.bottom ?? "hidden"}`);
  await logScrollState(page, "Routine editor");
  await page.locator('[data-action="save-routine"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await capture(page, "08-routine-editor-bottom");

  console.log("\n=== 4. Plan Library ===");
  await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await capture(page, "09-plans-list");
  await logScrollState(page, "Plan list");
  await page.locator('[data-action="select-plan"]').first().click();
  await page.waitForTimeout(600);
  await capture(page, "10-plan-detail");
  const startPlanBox = await visibleBox(page.locator('[data-action="start-plan"]'));
  console.log(`  start plan button visible bottom: ${startPlanBox?.bottom ?? "hidden"}`);
  await logScrollState(page, "Plan detail");
  await page.locator('[data-action="edit-blueprint"]').click();
  await page.waitForTimeout(600);
  await capture(page, "11-blueprint-editor");
  const blueprintEditorState = await logScrollState(page, "Blueprint editor");
  await page.locator('[data-action="edit-stage"]').first().click();
  await page.waitForTimeout(600);
  await capture(page, "12-stage-editor");
  const stageEditorState = await logScrollState(page, "Stage editor");
  console.log(`  blueprint editor horizontal overflow: ${blueprintEditorState.horizontalOverflow}`);
  console.log(`  stage editor horizontal overflow: ${stageEditorState.horizontalOverflow}`);

  console.log("\n=== 5. Workout History ===");
  await page.goto(`${BASE}/#/workouts`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await capture(page, "13-workouts");
  await logScrollState(page, "Workout history");
  const detailBox = await visibleBox(page.locator('[data-role="workout-detail"]'));
  const listBox = await visibleBox(page.locator('[data-role="workout-list"]'));
  console.log(`  detail above list on mobile: ${detailBox.top < listBox.top}`);
  await page.locator('[data-action="select-workout"]').nth(1).click();
  await page.waitForTimeout(900);
  await capture(page, "14-workouts-second-selection");
  console.log(`  scrollY after selecting second workout: ${await page.evaluate(() => window.scrollY)}`);

  console.log("\n=== Summary ===");
  if (consoleIssues.length === 0) {
    console.log("  no console or page errors detected");
  } else {
    console.log(`  issues: ${consoleIssues.length}`);
    consoleIssues.forEach((issue) => console.log(`  - ${issue}`));
  }

  console.log(`  screenshots: ${OUT_DIR}`);
  await page.waitForTimeout(1200);
  await browser.close();
}

main().catch((error) => {
  console.error("FAILED:", error);
  process.exit(1);
});
