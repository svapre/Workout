import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/live-plan-editor";

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
    entries: [{ id: "entry_pushup", exerciseId: "ex_pushup", order: 1, sets: 3, reps: 10, durationSeconds: null, weight: null, resistance: null, restSeconds: 60, notes: "" }],
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
    entries: [{ id: "entry_breath", exerciseId: "ex_box_breath", order: 1, sets: 3, reps: null, durationSeconds: 60, weight: null, resistance: null, restSeconds: 30, notes: "" }],
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
    versionHistory: [{ version: "1.0", modifiedAt: "2026-05-08T06:00:00.000Z", modifiedBy: "user", changeSummary: "Activated from blueprint" }],
    blueprintId: "plan_strength_focus",
    blueprintVersion: "1.0",
    startedAt: "2026-05-08T06:00:00.000Z",
    currentStageIndex: 1,
    currentDayInCycle: 2,
    currentCycleCount: 3,
    streakDays: 4,
    lastSessionDate: "2026-05-08",
    stageHistory: [
      { stageId: "stage_base", stageName: "Base", startedAt: "2026-05-08T06:00:00.000Z", completedAt: "2026-05-09T06:00:00.000Z", completedVia: "milestone", failureCount: 0 },
      { stageId: "stage_build", stageName: "Build", startedAt: "2026-05-09T06:00:00.000Z", completedAt: null, completedVia: null, failureCount: 0 },
    ],
    sessions: [],
    stages: [
      {
        id: "stage_base",
        name: "Base",
        predecessorStageId: null,
        schedule: [{ type: "routine", routineId: "routine_strength" }],
        milestone: { description: "Complete one cycle", eligibility: { type: "cycles", target: 1, requiresContinuous: false }, test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" }, onFailure: { action: "none", targetStageId: null } },
        transitionRule: "prompt_user",
      },
      {
        id: "stage_build",
        name: "Build",
        predecessorStageId: "stage_base",
        schedule: [{ type: "routine", routineId: "routine_strength" }, { type: "rest", routineId: null }],
        milestone: { description: "Earn the focus test", eligibility: { type: "sessions", target: 2, requiresContinuous: false }, test: { type: "exercise", source: "custom", exerciseId: "ex_box_breath", metric: "duration", target: 60, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: 30, notes: "" }, onFailure: { action: "none", targetStageId: null } },
        transitionRule: "prompt_user",
      },
      {
        id: "stage_peak",
        name: "Peak",
        predecessorStageId: "stage_build",
        schedule: [{ type: "routine", routineId: "routine_focus" }, { type: "routine", routineId: "routine_strength" }],
        milestone: { description: "Clear the final cycle", eligibility: { type: "cycles", target: 2, requiresContinuous: false }, test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" }, onFailure: { action: "none", targetStageId: null } },
        transitionRule: "manual",
      },
    ],
  },
];

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
  }, { nextBodyTargets: bodyTargets, nextExercises: exercises, nextRoutines: routines, nextActivePlans: activePlans });
}

async function readActivePlan(page) {
  return page.evaluate(() => (JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}").active_plans || [])[0]);
}

const browser = await chromium.launch({ headless: false, slowMo: 150 });
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

await seedState(page);
await page.reload({ waitUntil: "networkidle" });
await page.goto(`${BASE}/#/active-plan/active_living_plan`, { waitUntil: "networkidle" });
await page.locator('[data-action="apd-edit"]').click();
await page.waitForURL(/#\/active-plan-edit\/active_living_plan/);
await page.screenshot({ path: `${OUT_DIR}/01-editor-start.png`, fullPage: true });

const editButtons = await page.locator('[data-action="edit-live-stage"]').count();
if (editButtons !== 2) {
  throw new Error(`Expected only current/future stages to be editable, found ${editButtons} edit buttons.`);
}

await page.locator('[data-field="displayName"]').fill("Strength and Focus / Revised");
await page.locator('[data-field="goal"]').fill("Keep the journey adaptive.");
await page.locator('[data-action="save-live-plan"]').click();
await page.waitForURL(/#\/active-plan\/active_living_plan/);
await page.screenshot({ path: `${OUT_DIR}/02-direct-save.png`, fullPage: true });

let savedPlan = await readActivePlan(page);
if (savedPlan.displayName !== "Strength and Focus / Revised" || savedPlan.version !== "1.1") {
  throw new Error("Direct live-plan save did not persist metadata or version.");
}
if (savedPlan.versionHistory.at(-1)?.modifiedBy !== "user") {
  throw new Error("Direct live-plan save should append version history with modifiedBy=user.");
}

await page.locator('[data-action="apd-edit"]').click();
await page.waitForURL(/#\/active-plan-edit\/active_living_plan/);
await page.locator('[data-action="edit-live-stage"][data-stage-id="stage_build"]').click();
await page.locator('[data-action="update-live-day"][data-day-index="1"]').selectOption("routine_focus");
await page.locator('[data-action="commit-live-stage-editor"]').click();
await page.locator('[data-action="save-live-plan"]').click();
await page.waitForURL(/#\/active-plan-revision\/active_living_plan/);
await page.screenshot({ path: `${OUT_DIR}/03-remap-review.png`, fullPage: true });

await page.locator('[data-action="apr-back"]').click();
await page.waitForURL(/#\/active-plan-edit\/active_living_plan/);
if ((await page.locator('[data-action="edit-live-stage"]').count()) !== 2) {
  throw new Error("Returning from remap review should preserve the live-plan draft.");
}

await page.locator('[data-action="save-live-plan"]').click();
await page.waitForURL(/#\/active-plan-revision\/active_living_plan/);
await page.locator('[data-action="apr-anchor"]').selectOption("stage_build");
await page.locator('[data-action="apr-apply"]').click();
await page.waitForURL(/#\/active-plan\/active_living_plan/);
await page.screenshot({ path: `${OUT_DIR}/04-remap-applied.png`, fullPage: true });

savedPlan = await readActivePlan(page);
if (savedPlan.currentDayInCycle !== 1 || savedPlan.currentCycleCount !== 0) {
  throw new Error("Manual remap should reset current day and cycle counters.");
}
if (savedPlan.stageHistory.at(-1)?.stageId !== "stage_build" || savedPlan.stageHistory.at(-2)?.completedVia !== "user_override") {
  throw new Error("Manual remap should close the old history entry and open a new one.");
}
if (savedPlan.version !== "1.2") {
  throw new Error("Manual remap save should increment the active-plan version again.");
}

console.log(`Live-plan editor audit passed. Screenshots: ${OUT_DIR}`);
await browser.close();
