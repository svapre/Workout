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
  {
    id: "ex_box_breathing",
    slug: "box-breathing",
    name: "Box Breathing",
    description: "Four-step breath pacing practice for settling attention and building smoother recovery between efforts.",
    type: "mental",
    trackingType: "duration",
    bodyTargets: [],
    equipment: ["None"],
    cues: ["Breathe through the nose", "Keep the pace even"],
    restSeconds: 0,
    aliases: ["4-4-4-4 Breathing"],
    movementPattern: "breathwork",
    whyItHelps: "Makes the compact/detail contract prove itself on a non-body-target practice too.",
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
  try {
    await locator.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    return null;
  }

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

function expectCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertActivePlanIndex(page, label, expectBoard) {
  const homeCards = page.locator(".plan-card--index");
  expectCondition(await homeCards.count() > 0, `${label}: expected active plan index cards`);
  const firstText = await homeCards.first().textContent().catch(() => "");
  expectCondition(/Current stage/i.test(firstText || ""), `${label}: expected compare-first runtime facts`);
  expectCondition(!/STEP\s+\d+\s+OF\s+\d+/i.test(firstText || ""), `${label}: index cards should not repeat a second progress bar label`);
  expectCondition(!/Day 1/i.test(firstText || ""), `${label}: active plan index should use step-based language`);
  if (expectBoard) {
    const sections = page.locator(".dashboard-section--panel");
    expectCondition(await sections.count() >= 2, `${label}: expected split dashboard panels when multiple plan buckets exist`);
  }
}

async function assertBlueprintListCompareCards(page, label) {
  const listCard = page.locator(".plan-card--blueprint").first();
  await listCard.waitFor({ state: "visible", timeout: 5000 });
  const cardText = await listCard.textContent().catch(() => "");
  expectCondition(/Best for/i.test(cardText || ""), `${label}: expected compare-first blueprint guidance`);
  expectCondition(/Why choose this plan/i.test(cardText || ""), `${label}: expected blueprint goal framing`);
  expectCondition(/Opening cycle/i.test(cardText || ""), `${label}: expected lightweight opening-cycle hint`);
  expectCondition(!/Starts with/i.test(cardText || ""), `${label}: blueprint list should not repeat opening-stage labels`);
  expectCondition(await listCard.locator(".plan-card__journey-preview .journey-node").count() === 0, `${label}: blueprint list should not show full opening-stage nodes`);
  expectCondition(await listCard.locator('[data-action="open-routine"]').count() === 0, `${label}: blueprint list should keep opening-cycle hints static`);
}
async function assertCompactJourneyPreview(page, label) {
  const pathPanel = page.locator("section.panel").filter({ hasText: "Later stages" }).first();
  await pathPanel.waitFor({ state: "visible", timeout: 5000 });
  const nodeCount = await pathPanel.locator(".journey-node").count();
  expectCondition(nodeCount > 0, `${label}: expected journey preview nodes`);
  const sequenceCount = await pathPanel.locator(".journey-sequence").count();
  const estimateCount = await pathPanel.locator(".journey-node__estimate").count();
  const objectiveCount = await pathPanel.locator(".journey-node__desc").count();
  const affordanceCount = await pathPanel.locator(".journey-node__affordance--navigate").count();
  const selectAffordanceCount = await pathPanel.locator(".journey-node__affordance--select").count();
  expectCondition(sequenceCount === 0, `${label}: path preview should not show sequence strips`);
  expectCondition(estimateCount === 0, `${label}: path preview should not show cycle estimates`);
  expectCondition(objectiveCount >= Math.max(0, nodeCount - 1), `${label}: light path preview should keep later-stage goal cues without duplicating the owner module`);
  expectCondition(affordanceCount === nodeCount, `${label}: every preview node should advertise navigation`);
  expectCondition(selectAffordanceCount === 0, `${label}: detail-path preview nodes should not look like in-place stage selectors`);
}

async function assertRoadmapTapSelectsStage(page, label, actionName) {
  const stageNodes = page.locator(`[data-action="${actionName}"]`);
  const nodeCount = await stageNodes.count();
  expectCondition(nodeCount > 0, `${label}: expected at least one tappable roadmap node`);
  const target = stageNodes.nth(Math.max(0, nodeCount - 1));
  const expectedTitle = (await target.locator(".journey-node__title").textContent().catch(() => "")).trim();
  await target.click();
  await page.waitForTimeout(600);
  const selectedTitle = (await page.locator(".journey-node--selected .journey-node__title").first().textContent().catch(() => "")).trim();
  expectCondition(Boolean(expectedTitle && selectedTitle && selectedTitle.includes(expectedTitle)), `${label}: tapping a roadmap node should open Study with that stage selected`);
}

async function assertStudyExpansionMode(page, label, expectInline) {
  const selectedNode = page.locator(".journey-node--selected").first();
  await selectedNode.waitFor({ state: "visible", timeout: 5000 });
  expectCondition(await selectedNode.locator(".journey-node__affordance--select").count() > 0, `${label}: study stage nodes should advertise in-place selection, not navigation`);
  const inlineDetail = selectedNode.locator(".journey-node__detail--inline");
  const inlineVisible = await inlineDetail.isVisible().catch(() => false);
  const paneVisible = await page.locator(".study-map__detail").isVisible().catch(() => false);
  if (expectInline) {
    expectCondition(inlineVisible, `${label}: selected node should expand inline at this viewport`);
    expectCondition(!paneVisible, `${label}: separate study detail pane should be hidden at this viewport`);
    const inlineText = await inlineDetail.textContent().catch(() => "");
    expectCondition(!/Selected stage schedule/i.test(inlineText || ""), `${label}: inline expansion should not restart with a schedule sub-header`);
    expectCondition(!/Milestone gate/i.test(inlineText || ""), `${label}: inline expansion should not repeat milestone blocks`);
    expectCondition(await inlineDetail.locator(".stage-step-preview__routine").count() === 0, `${label}: inline schedule should stay script-like, not expand routine previews`);
    expectCondition(await selectedNode.locator(".journey-sequence").count() === 0, `${label}: selected stage nodes should not show routine chips in compact form`);
    expectCondition(await selectedNode.locator(".journey-node__desc").count() > 0, `${label}: selected stage node should summarize the stage goal`);
    expectCondition(await inlineDetail.locator(".study-schedule__nav").count() > 0, `${label}: routine rows should show a navigation affordance`);
  } else {
    expectCondition(!inlineVisible, `${label}: inline selected-stage detail should be hidden at this viewport`);
    expectCondition(paneVisible, `${label}: separate study detail pane should be visible at this viewport`);
    const stagesBox = await visibleBox(page.locator(".study-map__stages"));
    const paneBox = await visibleBox(page.locator(".study-map__detail"));
    expectCondition(Boolean(stagesBox && paneBox), `${label}: expected visible study rail and detail pane boxes`);
    expectCondition(paneBox.left >= stagesBox.right - 24, `${label}: desktop detail pane should sit beside the rail, not below it`);
    expectCondition(paneBox.top < stagesBox.bottom - 40, `${label}: desktop detail pane should begin within the rail band, not after it`);
    expectCondition(await selectedNode.locator(".journey-sequence").count() === 0, `${label}: selected stage nodes should keep process in the detail pane`);
    expectCondition(await selectedNode.locator(".journey-node__desc").count() > 0, `${label}: selected stage node should summarize the stage goal`);
    expectCondition(await page.locator(".study-map__detail .study-schedule__nav").count() > 0, `${label}: routine rows should show a navigation affordance`);
  }
}

async function assertBlueprintEditorStageStructure(page, label) {
  const stageList = page.locator(".stage-list--editor").first();
  await stageList.waitFor({ state: "visible", timeout: 5000 });
  expectCondition(await stageList.locator(".journey-node").count() > 0, `${label}: expected stage preview nodes in the editor`);
  const stageText = await stageList.locator(".stage-list__item--preview").first().textContent().catch(() => "");
  expectCondition(/Stage 1/i.test(stageText || ""), `${label}: expected stage numbering in stage previews`);
  expectCondition(!/~\d+\s*min active/i.test(stageText || ""), `${label}: stage previews should leave process timing to the detailed script`);
  const editorText = await page.locator('.editor-shell').textContent().catch(() => '');
  expectCondition(/Why someone should start this blueprint/i.test(editorText || ""), `${label}: expected explicit blueprint adoption thesis input`);
  expectCondition(/Who this blueprint is for/i.test(editorText || ""), `${label}: expected explicit blueprint audience input`);
}

async function assertStageEditorBuilder(page, label, expectSplit) {
  const preview = page.locator(".stage-preview-panel").first();
  await preview.waitFor({ state: "visible", timeout: 5000 });
  const previewText = await preview.textContent().catch(() => "");
  expectCondition(/How this stage will read/i.test(previewText || ""), `${label}: expected live stage preview`);
  expectCondition(/Step 1/i.test(previewText || ""), `${label}: expected step-based preview language`);
  const editorText = await page.locator(".stage-editor-shell").textContent().catch(() => "");
  expectCondition(/Ordered steps/i.test(editorText || ""), `${label}: expected ordered step builder heading`);
  expectCondition(!/Day 1/i.test(editorText || ""), `${label}: stage editor should not use day-based language`);
  expectCondition(/Session check-ins/i.test(editorText || ""), `${label}: stage editor should expose session check-ins separately from the milestone gate`);
  if (expectSplit) {
    const sidebarBox = await visibleBox(page.locator(".stage-editor-sidebar"));
    const mainBox = await visibleBox(page.locator(".stage-editor-main"));
    expectCondition(Boolean(sidebarBox && mainBox), `${label}: expected visible stage editor sidebar and main panes`);
    expectCondition(mainBox.left >= sidebarBox.right - 24, `${label}: stage preview should sit beside the authoring pane at this viewport`);
  }
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
  const activeCta = await visibleBox(page.locator('[data-action="apd-primary"], [data-action="apd-resume"]'));
  const activeProgress = await visibleBox(page.locator('.journey-progress--secondary'));
  log(`  active plan CTA bottom: ${activeCta?.bottom ?? "hidden"} / clientHeight: ${detailScroll.metrics.clientHeight}`);
  log(`  active plan progress top: ${activeProgress?.top ?? "hidden"}`);
  expectCondition(activeCta, `Active plan detail (${config.id}): expected visible primary CTA`);
  expectCondition(!activeProgress, `Active plan detail (${config.id}): standalone progress slab should be removed once progress is folded into the current node`);
  const activeNowMeta = await page.locator('.journey-now-card__meta').textContent().catch(() => '');
  expectCondition(!/Stage\s+\d+\s+of\s+\d+/i.test(activeNowMeta || ''), `Active plan detail (${config.id}): stage position should not sit as a separate meta row below the node`);
  await assertCompactJourneyPreview(page, `Active plan detail (${config.id})`);
  expectCondition(await page.locator('.journey-now-card .journey-sequence').count() === 0, `Active plan detail (${config.id}): current-stage card should keep process out of the compact runtime block`);
  await assertRoadmapTapSelectsStage(page, `Active plan detail (${config.id})`, 'open-active-plan-study');
  await page.goBack();
  await page.waitForTimeout(500);
  await page.locator('[data-action="study-plan"]').click();
  await page.waitForTimeout(600);
  await capture(page, `${config.id}-02b-active-plan-study`);
  await logScrollState(page, "Active plan study");
  await assertStudyExpansionMode(page, `Active plan study (${config.id})`, config.viewport.width < 960);

  await page.goto(`${BASE}/#/routines`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.locator('[data-action="open-routine"]').first().click();
  await page.waitForTimeout(600);
  await capture(page, `${config.id}-03-routine-detail`);
  await logScrollState(page, "Routine detail");

  await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await capture(page, `${config.id}-04-exercise-library`);
  await logScrollState(page, "Exercise library");
  await page.locator('[data-action="exercise-card"]').first().click();
  await page.waitForTimeout(600);
  await capture(page, `${config.id}-05-exercise-detail`);
  await logScrollState(page, "Exercise detail");

  await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.locator('[data-action="exercise-card"]').filter({ hasText: "Box Breathing" }).first().click();
  await page.waitForTimeout(600);
  await capture(page, `${config.id}-05b-exercise-detail-mental`);
  await logScrollState(page, "Exercise detail (mental)");

  await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.locator('[data-action="select-plan"]').first().click();
  await page.waitForTimeout(500);
  await capture(page, `${config.id}-06-plan-detail`);
  await logScrollState(page, "Plan detail");
  await assertCompactJourneyPreview(page, `Blueprint detail (${config.id})`);
  expectCondition(await page.locator('.plan-card__journey-preview .journey-sequence').count() === 0, `Blueprint detail (${config.id}): opening-stage preview should stay compact and goal-first`);
  await assertRoadmapTapSelectsStage(page, `Blueprint detail (${config.id})`, 'open-blueprint-study');
  await page.goBack();
  await page.waitForTimeout(500);
  await page.locator('[data-action="study-blueprint"]').click();
  await page.waitForTimeout(600);
  await capture(page, `${config.id}-06b-plan-study`);
  await logScrollState(page, "Blueprint study");
  await assertStudyExpansionMode(page, `Blueprint study (${config.id})`, config.viewport.width < 960);

  await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  if (!config.desktopSmokeOnly) {
    await page.locator('[data-action="edit-blueprint"]').click();
    await page.waitForTimeout(500);
    await capture(page, `${config.id}-07-blueprint-editor`);
    await assertBlueprintEditorStageStructure(page, `Blueprint editor (${config.id})`);
    await logScrollState(page, "Blueprint editor");
    await page.locator('[data-action="edit-stage"]').first().click();
    await page.waitForTimeout(500);
    await capture(page, `${config.id}-08-stage-editor`);
    await assertStageEditorBuilder(page, `Stage editor (${config.id})`, config.viewport.width > 980);
    await logScrollState(page, "Stage editor");

    await page.goto(`${BASE}/#/workouts`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await capture(page, `${config.id}-09-workouts`);
    await logScrollState(page, "Workout history");
  } else {
    await page.goto(`${BASE}/#/workouts`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await capture(page, `${config.id}-07-workouts`);
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








