import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const VIEWPORT = { width: 442, height: 983 };
const DEVICE_SCALE_FACTOR = 2.75;
const STARTER_CONTENT_VERSION = "2026-05-09.5";
const OUT_DIR = "screenshots/poco-x6-deep-audit";

mkdirSync(OUT_DIR, { recursive: true });

const consoleIssues = [];
const failures = [];

const bodyMaps = [
  { id: "bm_chest", name: "Chest", category: "muscle", isCustom: false },
  { id: "bm_back", name: "Back", category: "muscle", isCustom: false },
  { id: "bm_core", name: "Core", category: "muscle", isCustom: false },
  { id: "bm_quads", name: "Quadriceps", category: "muscle", isCustom: false },
  { id: "bm_hamstrings", name: "Hamstrings", category: "muscle", isCustom: false },
  { id: "bm_shoulders", name: "Shoulders", category: "muscle", isCustom: false },
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
    id: "ex_single_arm_row",
    slug: "single-arm-dumbbell-row",
    name: "Single-Arm Dumbbell Row With Pause",
    description: "Single-arm pulling work with a deliberate top pause and stable trunk.",
    type: "physical",
    trackingType: "weight",
    bodyTargets: ["bm_back", "bm_shoulders"],
    equipment: ["Dumbbell", "Bench"],
    cues: ["Pull elbow to hip", "Pause at the top"],
    restSeconds: 90,
    aliases: ["One-Arm Row"],
    movementPattern: "pull",
    whyItHelps: "Balances pressing volume and makes load progression explicit.",
    isCustom: false,
  },
  {
    id: "ex_split_squat",
    slug: "split-squat",
    name: "Front-Foot Split Squat",
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
  {
    id: "ex_dead_bug_press",
    slug: "dead-bug-band-press",
    name: "Dead Bug Band Press",
    description: "Trunk control drill that forces a steady ribcage while the arms drive tension.",
    type: "mobility",
    trackingType: "duration",
    bodyTargets: ["bm_core"],
    equipment: ["Band", "Mat"],
    cues: ["Exhale as you reach", "Keep the low back quiet"],
    restSeconds: 45,
    movementPattern: "brace",
    whyItHelps: "Works as a low-friction bridge between rehab and full lifting days.",
    isCustom: false,
  },
  {
    id: "ex_side_plank_reach",
    slug: "side-plank-reach",
    name: "Side Plank Reach",
    description: "Anti-rotation side plank with a forward reach to stress the trunk and shoulder together.",
    type: "mobility",
    trackingType: "duration",
    bodyTargets: ["bm_core", "bm_shoulders"],
    equipment: ["Mat"],
    cues: ["Stack the ribs", "Stay long through the top arm"],
    restSeconds: 45,
    movementPattern: "brace",
    whyItHelps: "Stresses the UI on a longer descriptive movement card.",
    isCustom: false,
  },
  {
    id: "ex_box_breathing",
    slug: "box-breathing",
    name: "Box Breathing Reset",
    description: "Four-step breath pacing practice for settling attention and smoothing recovery between efforts.",
    type: "mental",
    trackingType: "duration",
    bodyTargets: [],
    equipment: ["None"],
    cues: ["Breathe through the nose", "Keep the pace even"],
    restSeconds: 0,
    aliases: ["4-4-4-4 Breathing"],
    movementPattern: "breathwork",
    whyItHelps: "Verifies that non-body-target activities still read clearly on mobile.",
    isCustom: false,
  },
];

const routines = [
  {
    id: "routine_strength_foundation",
    name: "Strength Foundation A",
    description: "Primary push, pull, and brace block with one lower-body driver.",
    notes: "This should be the first session the audit lands on.",
    difficultyScore: 6,
    createdAt: "2026-05-08T06:00:00.000Z",
    updatedAt: "2026-05-08T06:00:00.000Z",
    isCustom: false,
    entries: [
      { id: "entry_pushup", exerciseId: "ex_pushup", order: 1, sets: 4, reps: 10, durationSeconds: null, weight: null, resistance: null, restSeconds: 75, notes: "" },
      { id: "entry_row", exerciseId: "ex_single_arm_row", order: 2, sets: 4, reps: 8, durationSeconds: null, weight: 20, resistance: null, restSeconds: 90, notes: "" },
      { id: "entry_dead_bug", exerciseId: "ex_dead_bug_press", order: 3, sets: 3, reps: null, durationSeconds: 40, weight: null, resistance: null, restSeconds: 45, notes: "" },
      { id: "entry_split_squat", exerciseId: "ex_split_squat", order: 4, sets: 3, reps: 10, durationSeconds: null, weight: null, resistance: null, restSeconds: 75, notes: "" },
    ],
  },
  {
    id: "routine_recovery_reset",
    name: "Recovery Reset With Trunk Control",
    description: "Support session with slower pace, lower decision load, and short trunk holds.",
    notes: "Useful for card density and detail layouts.",
    difficultyScore: 4,
    createdAt: "2026-05-08T06:30:00.000Z",
    updatedAt: "2026-05-08T06:30:00.000Z",
    isCustom: false,
    entries: [
      { id: "entry_side_plank", exerciseId: "ex_side_plank_reach", order: 1, sets: 3, reps: null, durationSeconds: 30, weight: null, resistance: null, restSeconds: 45, notes: "" },
      { id: "entry_breathing", exerciseId: "ex_box_breathing", order: 2, sets: 2, reps: null, durationSeconds: 60, weight: null, resistance: null, restSeconds: 15, notes: "" },
      { id: "entry_split_squat_light", exerciseId: "ex_split_squat", order: 3, sets: 2, reps: 12, durationSeconds: null, weight: null, resistance: null, restSeconds: 60, notes: "" },
    ],
  },
  {
    id: "routine_upper_restore",
    name: "Upper Restore and Shoulder Capacity",
    description: "Shoulder-friendly secondary session with a clearer recovery tone.",
    notes: "Used to force a second active plan and history split.",
    difficultyScore: 5,
    createdAt: "2026-05-08T07:00:00.000Z",
    updatedAt: "2026-05-08T07:00:00.000Z",
    isCustom: false,
    entries: [
      { id: "entry_row_restore", exerciseId: "ex_single_arm_row", order: 1, sets: 3, reps: 10, durationSeconds: null, weight: 16, resistance: null, restSeconds: 75, notes: "" },
      { id: "entry_pushup_restore", exerciseId: "ex_pushup", order: 2, sets: 3, reps: 8, durationSeconds: null, weight: null, resistance: null, restSeconds: 60, notes: "" },
      { id: "entry_breathing_restore", exerciseId: "ex_box_breathing", order: 3, sets: 1, reps: null, durationSeconds: 90, weight: null, resistance: null, restSeconds: 0, notes: "" },
    ],
  },
];

const plans = [
  {
    id: "plan_strength_base",
    version: "1.0.0",
    name: "Strength Base",
    description: "Build a repeatable strength rhythm with one main day and one support day.",
    goal: "Complete the first stage with clean execution and minimal friction.",
    theme: { color: "#4FD1C5", icon: "SB", code: "strength-base" },
    createdAt: "2026-05-08T07:00:00.000Z",
    stages: [
      {
        id: "stage_foundation",
        name: "Foundation",
        predecessorStageId: null,
        schedule: [
          { type: "routine", routineId: "routine_strength_foundation" },
          { type: "rest", routineId: null },
          { type: "routine", routineId: "routine_recovery_reset" },
        ],
        milestone: {
          description: "Complete 4 cycles with steady form.",
          type: "cycles",
          target: 4,
          requiresContinuous: false,
          exerciseId: null,
          metric: null,
          feedbackPrompts: [
            { id: "symptoms", label: "Any symptoms worth noting?", placeholder: "Short note about what stood out." },
          ],
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
      {
        id: "stage_build",
        name: "Build",
        predecessorStageId: "stage_foundation",
        schedule: [
          { type: "routine", routineId: "routine_strength_foundation" },
          { type: "routine", routineId: "routine_upper_restore" },
          { type: "rest", routineId: null },
        ],
        milestone: {
          description: "Log 8 completed sessions.",
          type: "sessions",
          target: 8,
          requiresContinuous: false,
          exerciseId: null,
          metric: null,
          feedbackPrompts: [],
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
  {
    id: "plan_desk_reset",
    version: "1.0.0",
    name: "Desk Reset and Trunk Control",
    description: "Shorter reset-oriented blueprint with a time-based anchor and explicit recovery days.",
    goal: "Rehearse a calm recovery rhythm without deciding what comes next.",
    theme: { color: "#F6AD55", icon: "DR", code: "desk-reset" },
    createdAt: "2026-05-08T07:30:00.000Z",
    stages: [
      {
        id: "stage_reset",
        name: "Reset",
        predecessorStageId: null,
        schedule: [
          { type: "routine", routineId: "routine_recovery_reset" },
          { type: "rest", routineId: null },
          { type: "routine", routineId: "routine_upper_restore" },
        ],
        milestone: {
          description: "Accumulate 180 seconds on Side Plank Reach.",
          type: "exercise_target",
          target: 180,
          requiresContinuous: false,
          exerciseId: "ex_side_plank_reach",
          metric: "duration",
          feedbackPrompts: [],
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
    routineId: "routine_strength_foundation",
    stageId: "stage_foundation",
    startedAt: "2026-05-07T06:00:00.000Z",
    completedAt: "2026-05-07T06:36:00.000Z",
    reflectionRating: "strong",
    sets: [
      { exerciseId: "ex_pushup", setNumber: 1, status: "completed", actualReps: 10, actualDurationSec: null, actualWeightKg: null, actualResistance: null },
      { exerciseId: "ex_pushup", setNumber: 2, status: "completed", actualReps: 10, actualDurationSec: null, actualWeightKg: null, actualResistance: null },
      { exerciseId: "ex_single_arm_row", setNumber: 1, status: "completed", actualReps: 8, actualDurationSec: null, actualWeightKg: 20, actualResistance: null },
      { exerciseId: "ex_dead_bug_press", setNumber: 1, status: "completed", actualReps: null, actualDurationSec: 40, actualWeightKg: null, actualResistance: null },
    ],
  },
  {
    id: "session_002",
    activePlanId: "active_strength_base",
    activePlanVersion: "1.0.0",
    routineId: "routine_recovery_reset",
    stageId: "stage_foundation",
    startedAt: "2026-05-05T06:00:00.000Z",
    completedAt: "2026-05-05T06:24:00.000Z",
    reflectionRating: "normal",
    sets: [
      { exerciseId: "ex_side_plank_reach", setNumber: 1, status: "completed", actualReps: null, actualDurationSec: 30, actualWeightKg: null, actualResistance: null },
      { exerciseId: "ex_box_breathing", setNumber: 1, status: "completed", actualReps: null, actualDurationSec: 60, actualWeightKg: null, actualResistance: null },
      { exerciseId: "ex_split_squat", setNumber: 1, status: "partial", actualReps: 10, actualDurationSec: null, actualWeightKg: null, actualResistance: null },
    ],
  },
  {
    id: "session_003",
    activePlanId: "active_desk_reset",
    activePlanVersion: "1.0.0",
    routineId: "routine_upper_restore",
    stageId: "stage_reset",
    startedAt: "2026-05-06T18:00:00.000Z",
    completedAt: "2026-05-06T18:21:00.000Z",
    reflectionRating: "difficult",
    sets: [
      { exerciseId: "ex_single_arm_row", setNumber: 1, status: "completed", actualReps: 10, actualDurationSec: null, actualWeightKg: 16, actualResistance: null },
      { exerciseId: "ex_pushup", setNumber: 1, status: "completed", actualReps: 8, actualDurationSec: null, actualWeightKg: null, actualResistance: null },
      { exerciseId: "ex_box_breathing", setNumber: 1, status: "completed", actualReps: null, actualDurationSec: 90, actualWeightKg: null, actualResistance: null },
    ],
  },
];

const activePlans = [
  {
    id: "active_strength_base",
    name: "Strength Base",
    displayName: "Strength Base",
    description: "Build a repeatable strength rhythm with one main day and one support day.",
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
    blueprintId: "plan_strength_base",
    blueprintVersion: "1.0.0",
    startedAt: "2026-05-08T07:00:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 1,
    currentCycleCount: 1,
    streakDays: 3,
    lastSessionDate: "2026-05-07",
    stageHistory: [
      {
        stageId: "stage_foundation",
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
    id: "active_desk_reset",
    name: "Desk Reset and Trunk Control",
    displayName: "Desk Reset and Trunk Control",
    description: "Shorter reset-oriented blueprint with a time-based anchor and explicit recovery days.",
    goal: "Rehearse a calm recovery rhythm without deciding what comes next.",
    theme: { color: "#F6AD55", icon: "DR", code: "desk-reset" },
    version: "1.0.0",
    versionHistory: [
      {
        version: "1.0.0",
        modifiedAt: "2026-05-08T07:30:00.000Z",
        modifiedBy: "user",
        changeSummary: "Activated from blueprint",
      },
    ],
    blueprintId: "plan_desk_reset",
    blueprintVersion: "1.0.0",
    startedAt: "2026-05-08T07:30:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 3,
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
    sessions: ["session_003"],
    stages: structuredClone(plans[1].stages),
  },
];

function expectCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForSettled(page, ms = 450) {
  await page.waitForTimeout(ms);
}

async function capture(page, name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
  console.log(`  screenshot: ${name}.png`);
}

async function scrollTop(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForSettled(page, 200);
}

async function scrollBottom(page) {
  await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));
  await waitForSettled(page, 250);
}

async function readMetrics(page) {
  return page.evaluate(() => {
    const scroller = document.scrollingElement;
    const mobileNavRect = document.querySelector(".mobile-nav")?.getBoundingClientRect() || null;
    const headerRect = document.querySelector(".app-header")?.getBoundingClientRect() || null;
    return {
      clientWidth: scroller?.clientWidth || document.documentElement.clientWidth || window.innerWidth,
      scrollWidth: scroller?.scrollWidth || document.documentElement.scrollWidth || window.innerWidth,
      clientHeight: scroller?.clientHeight || document.documentElement.clientHeight || window.innerHeight,
      scrollHeight: scroller?.scrollHeight || document.documentElement.scrollHeight || window.innerHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      mobileNavTop: mobileNavRect ? mobileNavRect.top : null,
      mobileNavHeight: mobileNavRect ? mobileNavRect.height : 0,
      headerBottom: headerRect ? headerRect.bottom : 0,
    };
  });
}

async function visibleBox(locator) {
  const count = await locator.count();
  if (!count) {
    return null;
  }
  const target = locator.first();
  if (!(await target.isVisible().catch(() => false))) {
    return null;
  }
  const box = await target.boundingBox();
  if (!box) {
    return null;
  }
  return {
    left: box.x,
    right: box.x + box.width,
    top: box.y,
    bottom: box.y + box.height,
    width: box.width,
    height: box.height,
  };
}

async function expectNoHorizontalOverflow(page, label) {
  const metrics = await readMetrics(page);
  expectCondition(
    metrics.scrollWidth <= metrics.clientWidth + 1,
    `${label}: horizontal overflow detected (${metrics.scrollWidth}px > ${metrics.clientWidth}px)`,
  );
}

async function expectTouchTargets(locator, label, minSize = 44) {
  const samples = await locator.evaluateAll((nodes) =>
    nodes.slice(0, 8).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        width: Number(rect.width.toFixed(1)),
        height: Number(rect.height.toFixed(1)),
        text: String(node.getAttribute("aria-label") || node.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
      };
    }),
  );

  expectCondition(samples.length > 0, `${label}: no touch targets matched`);
  const bad = samples.filter((sample) => sample.width < minSize || sample.height < minSize);
  expectCondition(
    bad.length === 0,
    `${label}: undersized touch targets ${bad.map((sample) => `"${sample.text}" ${sample.width}x${sample.height}`).join(", ")}`,
  );
}

async function expectVisibleAboveMobileNav(page, locator, label) {
  const box = await visibleBox(locator);
  expectCondition(box, `${label}: expected visible element`);
  const metrics = await readMetrics(page);
  const occlusionLimit = metrics.mobileNavTop ?? metrics.viewportHeight;
  expectCondition(
    box.bottom <= occlusionLimit - 8,
    `${label}: element bottom ${box.bottom.toFixed(1)} is too close to or behind mobile nav at ${occlusionLimit.toFixed(1)}`,
  );
}

async function expectElementInViewport(locator, label) {
  const box = await visibleBox(locator);
  expectCondition(box, `${label}: expected visible element`);
  expectCondition(box.top >= 0, `${label}: top clipped above viewport`);
}

async function expectWorkoutSummaryOrder(page, label) {
  const listBox = await visibleBox(page.locator('[data-role="workout-list"]'));
  const detailBox = await visibleBox(page.locator('[data-role="workout-detail"]'));
  expectCondition(listBox && detailBox, `${label}: expected workout list and detail columns`);
  expectCondition(listBox.top < detailBox.top, `${label}: workout list should appear before workout detail on mobile`);
}

async function openAndCaptureBottom(page, name) {
  await scrollBottom(page);
  await capture(page, `${name}-bottom`);
  await scrollTop(page);
}

async function seedLocalStorage(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ seedBodyMaps, seedExercises, seedRoutines, seedPlans, seedWorkouts, seedActivePlans, starterVersion }) => {
      localStorage.clear();
      localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: seedBodyMaps }));
      localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: seedExercises }));
      localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: seedRoutines }));
      localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: seedWorkouts }));
      localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: seedPlans }));
      localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: seedActivePlans }));
      localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
      localStorage.setItem(
        "workout-app.meta.v1",
        JSON.stringify({
          starterContentVersion: starterVersion,
          starterContentSyncedAt: "2026-05-09T12:00:00.000Z",
        }),
      );
    },
    {
      seedBodyMaps: bodyMaps,
      seedExercises: exercises,
      seedRoutines: routines,
      seedPlans: plans,
      seedWorkouts: workouts,
      seedActivePlans: activePlans,
      starterVersion: STARTER_CONTENT_VERSION,
    },
  );
  await page.reload({ waitUntil: "networkidle" });
  await waitForSettled(page, 500);
}

async function runCheck(label, fn) {
  console.log(`\n=== ${label} ===`);
  try {
    await fn();
    console.log(`PASS: ${label}`);
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
    console.error(`FAIL: ${label}: ${error.message}`);
  }
}

async function main() {
  console.log(`Starting fresh Poco X6 audit at ${VIEWPORT.width} x ${VIEWPORT.height}...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; 2312DRA50G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
  });
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

  await runCheck("Active Plans Home", async () => {
    await page.goto(`${BASE}/#/active-plans`, { waitUntil: "networkidle" });
    await waitForSettled(page);
    await capture(page, "01-home-top");
    await openAndCaptureBottom(page, "01-home");
    await expectNoHorizontalOverflow(page, "Home");
    await expectTouchTargets(page.locator(".mobile-nav-button"), "Bottom nav");
    await expectTouchTargets(page.locator(".compact-nav-button"), "Header quick nav", 40);
    expectCondition((await page.locator('[data-action="plan-card"]').count()) >= 2, "Home: expected at least two active plan cards");
    const lastPrimary = page.locator('[data-action="start-workout"], [data-action="start-test"], [data-action="mark-rest"], [data-action="advance-stage"]').last();
    const lastSecondary = page.locator('[data-action="open-plan"]').last();
    await lastSecondary.scrollIntoViewIfNeeded();
    await waitForSettled(page, 250);
    await expectVisibleAboveMobileNav(page, lastPrimary, "Home last primary action");
    await expectVisibleAboveMobileNav(page, lastSecondary, "Home last secondary action");
  });

  await runCheck("Active Plan Detail", async () => {
    await page.goto(`${BASE}/#/active-plan/active_strength_base`, { waitUntil: "networkidle" });
    await waitForSettled(page);
    await capture(page, "02-active-plan-detail-top");
    await expectNoHorizontalOverflow(page, "Active plan detail");
    await expectElementInViewport(page.locator('[data-action="apd-primary"]'), "Active plan primary CTA");
    await expectVisibleAboveMobileNav(page, page.locator('[data-action="apd-primary"]'), "Active plan primary CTA");
    await expectTouchTargets(page.locator('[data-action="apd-primary"], [data-action="apd-secondary"], [data-action="study-plan"]'), "Active plan actions");
    await openAndCaptureBottom(page, "02-active-plan-detail");
  });

  await runCheck("Active Plan Study", async () => {
    await page.goto(`${BASE}/#/active-plan-study/active_strength_base`, { waitUntil: "networkidle" });
    await waitForSettled(page);
    await capture(page, "03-active-plan-study-top");
    await expectNoHorizontalOverflow(page, "Active plan study");
    expectCondition((await page.locator('[data-action="select-study-stage"]').count()) >= 2, "Active plan study: expected multiple stage nodes");
    await page.locator('[data-action="select-study-stage"]').last().click();
    await waitForSettled(page, 500);
    expectCondition(await page.locator(".journey-node--selected .journey-node__detail--inline").isVisible(), "Active plan study: selected stage should expand inline on mobile");
    await openAndCaptureBottom(page, "03-active-plan-study");
  });

  await runCheck("Exercise Library And Detail", async () => {
    await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
    await waitForSettled(page);
    await capture(page, "04-exercises-top");
    await expectNoHorizontalOverflow(page, "Exercise library");
    await openAndCaptureBottom(page, "04-exercises");
    await page.locator('[data-action="exercise-card"]').filter({ hasText: "Single-Arm Dumbbell Row With Pause" }).first().click();
    await waitForSettled(page);
    await capture(page, "05-exercise-detail-top");
    await expectNoHorizontalOverflow(page, "Exercise detail");
    await openAndCaptureBottom(page, "05-exercise-detail");
  });

  await runCheck("Routine Detail And Editor", async () => {
    await page.goto(`${BASE}/#/routine/routine_strength_foundation`, { waitUntil: "networkidle" });
    await waitForSettled(page);
    await capture(page, "06-routine-detail-top");
    await expectNoHorizontalOverflow(page, "Routine detail");
    const editRoutine = page.locator('[data-action="edit-routine"]');
    await editRoutine.scrollIntoViewIfNeeded();
    await waitForSettled(page, 250);
    await capture(page, "06-routine-detail-bottom-expanded");
    await editRoutine.click();
    await waitForSettled(page, 500);
    await capture(page, "07-routine-editor-top");
    await expectNoHorizontalOverflow(page, "Routine editor");
    const saveRoutine = page.locator('[data-action="save-routine"]');
    await saveRoutine.scrollIntoViewIfNeeded();
    await waitForSettled(page, 250);
    await expectVisibleAboveMobileNav(page, saveRoutine, "Routine save action");
    await expectTouchTargets(saveRoutine, "Routine save action");
    await capture(page, "07-routine-editor-bottom");
  });

  await runCheck("Blueprint Detail, Editor, And Stage Editor", async () => {
    await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
    await waitForSettled(page);
    await capture(page, "08-plans-top");
    await expectNoHorizontalOverflow(page, "Plans list");
    await page.locator('[data-action="select-plan"]').first().click();
    await waitForSettled(page, 500);
    await capture(page, "09-plan-detail-top");
    await expectNoHorizontalOverflow(page, "Plan detail");
    await expectTouchTargets(page.locator('[data-action="start-plan"], [data-action="study-blueprint"], [data-action="edit-blueprint"]'), "Blueprint detail actions");
    await page.locator('[data-action="edit-blueprint"]').click();
    await waitForSettled(page, 500);
    await capture(page, "10-blueprint-editor-top");
    await expectNoHorizontalOverflow(page, "Blueprint editor");
    const saveBlueprint = page.locator('[data-action="save-blueprint"]');
    await saveBlueprint.scrollIntoViewIfNeeded();
    await waitForSettled(page, 250);
    await expectVisibleAboveMobileNav(page, saveBlueprint, "Blueprint save action");
    await capture(page, "10-blueprint-editor-bottom");
    await scrollTop(page);
    await page.locator('[data-action="edit-stage"]').first().click();
    await waitForSettled(page, 500);
    await capture(page, "11-stage-editor-top");
    await expectNoHorizontalOverflow(page, "Stage editor");
    const commitStage = page.locator('[data-action="commit-stage-editor"]');
    await commitStage.scrollIntoViewIfNeeded();
    await waitForSettled(page, 250);
    await expectVisibleAboveMobileNav(page, commitStage, "Stage editor save action");
    await capture(page, "11-stage-editor-bottom");
  });

  await runCheck("Workout History", async () => {
    await page.goto(`${BASE}/#/workouts`, { waitUntil: "networkidle" });
    await waitForSettled(page);
    await capture(page, "12-workouts-top");
    await expectNoHorizontalOverflow(page, "Workout history");
    expectCondition((await page.locator(".history-week-rail").count()) === 1, "Workout history: expected week rail");
    await expectWorkoutSummaryOrder(page, "Workout history");
    if ((await page.locator('[data-action="select-history-plan"]').count()) > 1) {
      await page.locator('[data-action="select-history-plan"]').nth(1).click();
      await waitForSettled(page, 700);
    }
    if ((await page.locator('[data-action="select-workout"]').count()) > 1) {
      await page.locator('[data-action="select-workout"]').nth(1).click();
      await waitForSettled(page, 700);
    }
    await capture(page, "12-workouts-after-selection");
    await openAndCaptureBottom(page, "12-workouts");
  });

  await runCheck("Workout Player Pre-Start", async () => {
    await page.goto(`${BASE}/#/workout-player/active_strength_base`, { waitUntil: "networkidle" });
    await waitForSettled(page, 700);
    await capture(page, "13-player-pre-top");
    await expectNoHorizontalOverflow(page, "Workout player pre-start");
    const startButton = page.locator('[data-action="start"]');
    await expectTouchTargets(startButton, "Workout player start action");
    await expectElementInViewport(startButton, "Workout player start action");
  });

  await runCheck("Workout Player Active Set", async () => {
    await page.locator('[data-action="start"]').click();
    await waitForSettled(page, 900);
    await capture(page, "14-player-active-top");
    await expectNoHorizontalOverflow(page, "Workout player active set");
    await expectTouchTargets(page.locator('[data-action="complete"], [data-action="toggle-pause"], [data-action="fail"], [data-action="skip"]'), "Workout player active controls");
    await expectElementInViewport(page.locator('[data-action="complete"]'), "Workout player complete action");
  });

  await runCheck("Workout Player Rest Step", async () => {
    await page.locator('[data-action="complete"]').click();
    await waitForSettled(page, 900);
    await capture(page, "15-player-rest-top");
    await expectNoHorizontalOverflow(page, "Workout player rest step");
    await expectTouchTargets(page.locator('[data-action="skip-rest"], [data-action="toggle-pause"]'), "Workout player rest controls");
  });

  if (consoleIssues.length) {
    failures.push(...consoleIssues);
  }

  console.log("\n=== Summary ===");
  if (failures.length) {
    console.log(`Findings: ${failures.length}`);
    failures.forEach((failure) => console.log(`- ${failure}`));
  } else {
    console.log("Findings: 0");
  }
  console.log(`Screenshots: ${OUT_DIR}`);

  await browser.close();

  if (failures.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("FAILED:", error);
  process.exit(1);
});
