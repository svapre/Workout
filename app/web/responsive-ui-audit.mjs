import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://localhost:8000";
const OUT_DIR = "screenshots/responsive-ui-audit";

mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { id: "phone-landscape", viewport: { width: 844, height: 390 }, desktopSmokeOnly: false },
  { id: "tablet-portrait", viewport: { width: 834, height: 1194 }, desktopSmokeOnly: false },
  { id: "tablet-landscape", viewport: { width: 1194, height: 834 }, desktopSmokeOnly: false },
  { id: "desktop", viewport: { width: 1440, height: 900 }, desktopSmokeOnly: true },
];

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

function log(message) {
  console.log(message);
}

async function capture(page, name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
  log(`  screenshot: ${name}.png`);
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
  if (!box) return null;
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
  log(`  ${label}: ${scrollable ? "scrollable" : "fits"} / horizontal overflow: ${horizontalOverflow ? "yes" : "no"}`);
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

async function navState(page) {
  return page.evaluate(() => ({
    desktopNav: getComputedStyle(document.querySelector(".desktop-nav")).display !== "none",
    compactNav: getComputedStyle(document.querySelector(".mobile-header-nav")).display !== "none",
    mobileNav: getComputedStyle(document.querySelector(".mobile-nav")).display !== "none",
  }));
}

async function runViewportAudit(browser, config) {
  log(`\n=== ${config.id} (${config.viewport.width}x${config.viewport.height}) ===`);
  const context = await browser.newContext({ viewport: config.viewport });
  const page = await context.newPage();
  const consoleIssues = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleIssues.push(`Console error: ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleIssues.push(`Page error: ${error.message}`);
  });

  await seedLocalStorage(page);

  await page.goto(`${BASE}/#/active-plans`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await capture(page, `${config.id}-01-home`);
  await logScrollState(page, "Home");
  const nav = await navState(page);
  log(`  nav: desktop=${nav.desktopNav} compact=${nav.compactNav} mobile=${nav.mobileNav}`);
  log(`  plan cards: ${await page.locator(".plan-card").count()}`);

  await page.locator('[data-action="plan-card"]').first().click();
  await page.waitForTimeout(600);
  await capture(page, `${config.id}-02-active-plan-detail`);
  const detailScroll = await logScrollState(page, "Active plan detail");
  const activeCta = await visibleBox(page.locator('[data-action="apd-resume"]'));
  log(`  active plan CTA bottom: ${activeCta?.bottom ?? "hidden"} / clientHeight: ${detailScroll.metrics.clientHeight}`);

  await page.goto(`${BASE}/#/routines`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.locator('[data-action="select-routine"]').first().click();
  await page.waitForTimeout(600);
  await capture(page, `${config.id}-03-routine-editor`);
  await logScrollState(page, "Routine editor");

  await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.locator('[data-action="select-plan"]').first().click();
  await page.waitForTimeout(500);
  await capture(page, `${config.id}-04-plan-detail`);
  await logScrollState(page, "Plan detail");

  if (!config.desktopSmokeOnly) {
    await page.locator('[data-action="edit-blueprint"]').click();
    await page.waitForTimeout(500);
    await capture(page, `${config.id}-05-blueprint-editor`);
    await logScrollState(page, "Blueprint editor");
    await page.locator('[data-action="edit-stage"]').first().click();
    await page.waitForTimeout(500);
    await capture(page, `${config.id}-06-stage-editor`);
    await logScrollState(page, "Stage editor");

    await page.goto(`${BASE}/#/workouts`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await capture(page, `${config.id}-07-workouts`);
    await logScrollState(page, "Workout history");
  } else {
    await page.goto(`${BASE}/#/workouts`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await capture(page, `${config.id}-05-workouts`);
    await logScrollState(page, "Workout history");
  }

  if (consoleIssues.length === 0) {
    log("  console/page issues: none");
  } else {
    log(`  console/page issues: ${consoleIssues.length}`);
    consoleIssues.forEach((issue) => log(`  - ${issue}`));
  }

  await context.close();
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  for (const config of VIEWPORTS) {
    await runViewportAudit(browser, config);
  }
  log(`\nScreenshots: ${OUT_DIR}`);
  await browser.close();
}

main().catch((error) => {
  console.error("FAILED:", error);
  process.exit(1);
});
