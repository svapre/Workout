import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/living-plan-revision";

mkdirSync(OUT_DIR, { recursive: true });

const seedBodyTargets = [
  { id: "bm_chest", name: "Chest", category: "muscle", isCustom: false },
  { id: "bm_core", name: "Core", category: "muscle", isCustom: false },
];

const seedExercises = [
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
    whyItHelps: "Simple pressing benchmark.",
    isCustom: false,
  },
];

const seedRoutines = [
  {
    id: "routine_strength",
    name: "Strength Session",
    description: "Simple pressing block.",
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
];

const seedActivePlans = [
  {
    id: "active_strength_base",
    name: "Strength Base",
    displayName: "Strength Base",
    description: "Base plan before revision.",
    goal: "Keep moving.",
    theme: { color: "#4FD1C5", icon: "SB", code: "strength-base" },
    version: "1.0.0",
    versionHistory: [{ version: "1.0.0", modifiedAt: "2026-05-08T06:00:00.000Z", modifiedBy: "user", changeSummary: "Activated from blueprint" }],
    blueprintId: "plan_strength_base",
    blueprintVersion: "1.0.0",
    startedAt: "2026-05-08T06:00:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 1,
    currentCycleCount: 1,
    streakDays: 2,
    lastSessionDate: "2026-05-08",
    stageHistory: [{ stageId: "stage_base", stageName: "Foundation", startedAt: "2026-05-08T06:00:00.000Z", completedAt: null, completedVia: null, failureCount: 0 }],
    sessions: ["session_1"],
    stages: [
      {
        id: "stage_base",
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
        id: "stage_build",
        name: "Build",
        predecessorStageId: "stage_base",
        schedule: [{ type: "routine", routineId: "routine_strength" }, { type: "rest", routineId: null }],
        milestone: {
          description: "Complete two more cycles.",
          eligibility: { type: "cycles", target: 2, requiresContinuous: false },
          test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
];

const seedWorkouts = [
  {
    id: "session_1",
    activePlanId: "active_strength_base",
    activePlanVersion: "1.0.0",
    routineId: "routine_strength",
    stageId: "stage_base",
    startedAt: "2026-05-08T06:00:00.000Z",
    completedAt: "2026-05-08T06:24:00.000Z",
    sessionType: "routine",
    milestoneTest: null,
    reflectionRating: "normal",
    sets: [{ exerciseId: "ex_pushup", setNumber: 1, status: "completed", actualReps: 10, actualDurationSec: null, actualWeightKg: null, actualResistance: null }],
  },
];

async function seedState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ bodyTargets, exercises, routines, activePlans, workouts }) => {
    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: bodyTargets }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines }));
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: activePlans }));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: [] }));
    localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
  }, { bodyTargets: seedBodyTargets, exercises: seedExercises, routines: seedRoutines, activePlans: seedActivePlans, workouts: seedWorkouts });
}

function makeHappyRevision() {
  return {
    exportVersion: "1.0",
    exportedAt: "2026-05-08T07:00:00.000Z",
    activePlan: {
      ...seedActivePlans[0],
      displayName: "Strength + Focus",
      description: "Revised with a mental reset block.",
      goal: "Blend strength work with calm focus practice.",
      theme: { color: "#F6AD55", icon: "SF", code: "strength-focus" },
      stages: [
        {
          ...seedActivePlans[0].stages[0],
          name: "Foundation Reloaded",
          schedule: [{ type: "routine", routineId: "routine_strength" }, { type: "routine", routineId: "routine_focus" }, { type: "rest", routineId: null }],
        },
        {
          ...seedActivePlans[0].stages[1],
          name: "Focus Build",
          schedule: [{ type: "routine", routineId: "routine_focus" }, { type: "routine", routineId: "routine_strength" }, { type: "rest", routineId: null }],
        },
      ],
    },
    sessions: seedWorkouts,
    bodyTargets: [...seedBodyTargets, { id: "bm_focus", name: "Focus", category: "mental", isCustom: true }],
    exercises: [...seedExercises, { id: "ex_breath_hold", slug: "box-breath", name: "Box Breath", description: "Timed breathing block.", type: "mental", trackingType: "duration", bodyTargets: ["bm_focus"], equipment: [], cues: ["Long exhale"], restSeconds: 30, aliases: [], movementPattern: "breathe", whyItHelps: "Adds a mental anchor.", isCustom: true }],
    routines: [...seedRoutines, { id: "routine_focus", name: "Focus Reset", description: "Short mental reset.", notes: "", difficultyScore: 1, createdAt: "2026-05-08T07:00:00.000Z", updatedAt: "2026-05-08T07:00:00.000Z", isCustom: true, entries: [{ id: "entry_breath", exerciseId: "ex_breath_hold", order: 1, sets: 3, reps: null, durationSeconds: 60, weight: null, resistance: null, restSeconds: 30, notes: "" }] }],
  };
}

function makeManualAnchorRevision() {
  const revision = makeHappyRevision();
  revision.activePlan.stages = [
    { ...revision.activePlan.stages[0], id: "stage_reentry", name: "Reentry", schedule: [{ type: "routine", routineId: "routine_focus" }, { type: "rest", routineId: null }] },
    { ...revision.activePlan.stages[1], id: "stage_build_v2", predecessorStageId: "stage_reentry" },
  ];
  return revision;
}

function makeConflictRevision() {
  const revision = makeHappyRevision();
  revision.bodyTargets = [{ id: "bm_core", name: "Mind Core", category: "mental", isCustom: true }];
  return revision;
}

async function importRevision(page, revision) {
  await page.goto(`${BASE}/#/active-plan/active_strength_base`, { waitUntil: "networkidle" });
  await page.locator('[data-action="apd-import-file"]').setInputFiles({
    name: "revision.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(revision, null, 2)),
  });
}

async function readActivePlans(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}").active_plans || []);
}

const browser = await chromium.launch({ headless: false, slowMo: 150 });
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

await seedState(page);
await page.reload({ waitUntil: "networkidle" });

await importRevision(page, makeHappyRevision());
await page.screenshot({ path: `${OUT_DIR}/01-happy-review.png`, fullPage: true });
await page.locator('[data-action="apr-apply"]').click();
await page.waitForURL(/#\/active-plan\/active_strength_base/);
await page.screenshot({ path: `${OUT_DIR}/02-happy-applied.png`, fullPage: true });
const happyPlans = await readActivePlans(page);
if (happyPlans[0].displayName !== "Strength + Focus" || happyPlans[0].version !== "1.0.1") {
  throw new Error("Happy-path revision did not apply expected metadata/version changes.");
}

await importRevision(page, makeHappyRevision());
await page.screenshot({ path: `${OUT_DIR}/03-stale-warning.png`, fullPage: true });
if (!(await page.locator('[data-action="apr-apply"]').isDisabled())) {
  throw new Error("Stale revision should require acknowledgement before apply.");
}
await page.locator('[data-action="apr-stale"]').check();
if (await page.locator('[data-action="apr-apply"]').isDisabled()) {
  throw new Error("Stale acknowledgement did not unlock apply.");
}
await page.locator('[data-action="apr-cancel"]').click();

await seedState(page);
await page.reload({ waitUntil: "networkidle" });
await importRevision(page, makeManualAnchorRevision());
await page.screenshot({ path: `${OUT_DIR}/04-manual-anchor-review.png`, fullPage: true });
if (!(await page.locator('[data-action="apr-apply"]').isDisabled())) {
  throw new Error("Manual-anchor revision should block apply until a stage is chosen.");
}
await page.locator('[data-action="apr-anchor"]').selectOption("stage_reentry");
await page.locator('[data-action="apr-apply"]').click();
const manualPlans = await readActivePlans(page);
if (manualPlans[0].currentDayInCycle !== 1 || manualPlans[0].currentCycleCount !== 0) {
  throw new Error("Manual-anchor apply did not reset day/cycle state.");
}
if (manualPlans[0].stageHistory.at(-1)?.stageId !== "stage_reentry") {
  throw new Error("Manual-anchor apply did not open the selected stage history entry.");
}

await seedState(page);
await page.reload({ waitUntil: "networkidle" });
await importRevision(page, makeConflictRevision());
await page.screenshot({ path: `${OUT_DIR}/05-blocking-conflict.png`, fullPage: true });
if (!(await page.locator('[data-action="apr-apply"]').isDisabled())) {
  throw new Error("Blocking conflict should disable apply.");
}

console.log(`Living-plan revision audit passed. Screenshots: ${OUT_DIR}`);
await browser.close();
