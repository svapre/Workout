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
    whyItHelps: "Makes the detail surface prove itself on a non-body-target practice too.",
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
  try {
    await locator.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    return null;
  }

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

function expectCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertActivePlanIndex(page, label) {
  const homeCards = page.locator(".plan-card--index");
  expectCondition(await homeCards.count() > 0, `${label}: expected active plan index cards`);
  const firstText = await homeCards.first().textContent().catch(() => "");
  expectCondition(/Current stage/i.test(firstText || ""), `${label}: expected compare-first runtime facts`);
  expectCondition(!/STEP\s+\d+\s+OF\s+\d+/i.test(firstText || ""), `${label}: index cards should not repeat a second progress bar label`);
  expectCondition(!/Day 1/i.test(firstText || ""), `${label}: active plan index should use step-based language`);
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

async function assertMobileStudyInlineExpansion(page, label) {
  const selectedNode = page.locator(".journey-node--selected").first();
  await selectedNode.waitFor({ state: "visible", timeout: 5000 });
  expectCondition(await selectedNode.locator(".journey-node__affordance--select").count() > 0, `${label}: study stage nodes should advertise in-place selection, not navigation`);
  const inlineDetail = selectedNode.locator(".journey-node__detail--inline");
  expectCondition(await inlineDetail.isVisible(), `${label}: selected node should expand inline on mobile`);
  expectCondition(!(await page.locator(".study-map__detail").isVisible().catch(() => false)), `${label}: separate study detail pane should be hidden on mobile`);
  const inlineText = await inlineDetail.textContent().catch(() => "");
  expectCondition(!/Selected stage schedule/i.test(inlineText || ""), `${label}: inline expansion should not restart with a schedule sub-header`);
  expectCondition(!/Milestone gate/i.test(inlineText || ""), `${label}: inline expansion should not repeat milestone blocks`);
  expectCondition(await inlineDetail.locator(".stage-step-preview__routine").count() === 0, `${label}: inline schedule should stay script-like, not expand routine previews`);
  expectCondition(await selectedNode.locator(".journey-sequence").count() === 0, `${label}: selected stage nodes should not show routine chips in compact form`);
  expectCondition(await selectedNode.locator(".journey-node__desc").count() > 0, `${label}: selected stage node should summarize the stage goal`);
  expectCondition(await inlineDetail.locator(".study-schedule__nav").count() > 0, `${label}: routine rows should show a navigation affordance`);
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

async function assertStageEditorBuilder(page, label) {
  const preview = page.locator(".stage-preview-panel").first();
  await preview.waitFor({ state: "visible", timeout: 5000 });
  const previewText = await preview.textContent().catch(() => "");
  expectCondition(/How this stage will read/i.test(previewText || ""), `${label}: expected live stage preview`);
  expectCondition(/Step 1/i.test(previewText || ""), `${label}: expected step-based preview language`);
  const editorText = await page.locator(".stage-editor-shell").textContent().catch(() => "");
  expectCondition(/Ordered steps/i.test(editorText || ""), `${label}: expected ordered step builder heading`);
  expectCondition(!/Day 1/i.test(editorText || ""), `${label}: stage editor should not use day-based language`);
  expectCondition(/Session check-ins/i.test(editorText || ""), `${label}: stage editor should expose session check-ins separately from the milestone gate`);
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
  const detailCtaBox = await visibleBox(page.locator('[data-action="apd-primary"]'));
  const detailProgressBox = await visibleBox(page.locator('.journey-progress--secondary'));
  console.log(`  active plan CTA bottom: ${detailCtaBox?.bottom ?? "hidden"}`);
  console.log(`  active plan progress top: ${detailProgressBox?.top ?? "hidden"}`);
  await logScrollState(page, "Active plan detail");
  expectCondition(detailCtaBox, "Active plan detail: expected visible primary CTA on mobile");
  expectCondition(!detailProgressBox, "Active plan detail: standalone progress slab should be removed once progress is folded into the current node");
  const nowMetaText = await page.locator('.journey-now-card__meta').textContent().catch(() => '');
  expectCondition(!/Stage\s+\d+\s+of\s+\d+/i.test(nowMetaText || ''), "Active plan detail: stage position should not sit as a separate meta row below the node");
  await assertCompactJourneyPreview(page, "Active plan detail");
  expectCondition(await page.locator('.journey-now-card .journey-sequence').count() === 0, "Active plan detail: current-stage card should keep process out of the compact runtime block");
  await assertRoadmapTapSelectsStage(page, "Active plan detail", "open-active-plan-study");
  await page.goBack();
  await page.waitForTimeout(500);
  await page.locator('[data-action="study-plan"]').click();
  await page.waitForTimeout(700);
  await capture(page, "02b-active-plan-study");
  await logScrollState(page, "Active plan study");
  await assertMobileStudyInlineExpansion(page, "Active plan study");

  console.log("\n=== 2. Exercise Library ===");
  await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await capture(page, "03-exercises-list");
  await logScrollState(page, "Exercise list");
  console.log(`  cards: ${await page.locator(".plan-card").count()}`);
  console.log(`  import visible: ${await page.locator('[data-action="import-exercises"]').isVisible()}`);
  await page.locator('[data-action="exercise-card"]').last().scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await capture(page, "04-exercises-bottom");
  await page.locator('[data-action="exercise-card"]').first().click();
  await page.waitForTimeout(500);
  await capture(page, "05-exercise-detail");
  await logScrollState(page, "Exercise detail");

  await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.locator('[data-action="exercise-card"]').filter({ hasText: "Box Breathing" }).first().click();
  await page.waitForTimeout(500);
  await capture(page, "05b-exercise-detail-mental");
  await logScrollState(page, "Exercise detail (mental)");

  console.log("\n=== 3. Routine Library ===");
  await page.goto(`${BASE}/#/routines`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await capture(page, "06-routines-list");
  await logScrollState(page, "Routine list");
  await page.locator('[data-action="open-routine"]').first().click();
  await page.waitForTimeout(600);
  const editRoutineButton = page.locator('[data-action="edit-routine"]');
  await editRoutineButton.scrollIntoViewIfNeeded();
  await editRoutineButton.evaluate((element) => element.click());
  await page.waitForTimeout(600);
  await capture(page, "07-routine-editor-top");
  const routineSaveButton = page.locator('[data-action="save-routine"]');
  const routineSaveInitial = (await routineSaveButton.isVisible().catch(() => false))
    ? await visibleBox(routineSaveButton)
    : null;
  console.log(`  save routine initial bottom: ${routineSaveInitial?.bottom ?? "hidden"}`);
  await logScrollState(page, "Routine editor");
  await routineSaveButton.scrollIntoViewIfNeeded();
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
  await assertCompactJourneyPreview(page, "Blueprint detail");
  expectCondition(await page.locator('.plan-card__journey-preview .journey-sequence').count() === 0, "Blueprint detail: opening-stage preview should stay compact and goal-first");
  await assertRoadmapTapSelectsStage(page, "Blueprint detail", "open-blueprint-study");
  await page.goBack();
  await page.waitForTimeout(500);
  await page.locator('[data-action="study-blueprint"]').click();
  await page.waitForTimeout(700);
  await capture(page, "10b-plan-study");
  await logScrollState(page, "Blueprint study");
  await assertMobileStudyInlineExpansion(page, "Blueprint study");

  await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
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
  expectCondition(await page.locator('.history-week-rail').count() === 1, "Workout history: expected week strip calendar rail to render");
  const detailBox = await visibleBox(page.locator('[data-role="workout-detail"]'));
  const listBox = await visibleBox(page.locator('[data-role="workout-list"]'));
  expectCondition(Boolean(detailBox && listBox && listBox.top < detailBox.top), "Workout history: expected list/picker before selected detail on mobile");
  console.log(`  list above detail on mobile: ${listBox.top < detailBox.top}`);

  let workoutButtons = page.locator('[data-action="select-workout"]');
  let workoutButtonCount = await workoutButtons.count();
  if (workoutButtonCount < 2) {
    const alternateDate = await page.locator('[data-action="select-history-date"]').evaluateAll((buttons) => {
      return buttons
        .map((button) => ({
          date: button.getAttribute("data-date"),
          selected: button.classList.contains("is-selected"),
          empty: !!button.querySelector(".history-week-rail__marker--empty"),
        }))
        .find((button) => !button.selected && !button.empty)?.date || null;
    });
    if (alternateDate) {
      await page.locator(`[data-action="select-history-date"][data-date="${alternateDate}"]`).click();
      await page.waitForTimeout(700);
      workoutButtons = page.locator('[data-action="select-workout"]');
      workoutButtonCount = await workoutButtons.count();
    }
  }

  expectCondition(workoutButtonCount > 0, "Workout history: expected at least one visible session in the selected day slice");
  await workoutButtons.nth(Math.min(1, workoutButtonCount - 1)).click();
  await page.waitForTimeout(900);
  await capture(page, "14-workouts-second-selection");
  console.log(`  scrollY after selecting follow-up workout: ${await page.evaluate(() => window.scrollY)}`);

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











