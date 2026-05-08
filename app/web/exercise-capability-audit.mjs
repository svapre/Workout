import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/exercise-capability-audit";

mkdirSync(OUT_DIR, { recursive: true });

const bodyTargets = [
  { id: "bm_core", name: "Core", category: "muscle", isCustom: false },
  { id: "bm_lower_back", name: "Lower Back", category: "muscle", isCustom: false },
  { id: "bm_shoulders", name: "Shoulders", category: "muscle", isCustom: false },
];

const exercises = [
  {
    id: "ex_bird_dog",
    slug: "bird-dog",
    name: "Bird Dog",
    description: "Cross-body trunk stability drill.",
    type: "mobility",
    trackingType: "reps",
    supportedTrackingModes: ["reps", "duration"],
    bodyTargets: ["bm_core", "bm_lower_back", "bm_shoulders"],
    equipment: [],
    cues: ["Stay long through the spine"],
    restSeconds: 30,
    aliases: [],
    movementPattern: "stability",
    whyItHelps: "Builds trunk control without heavy loading.",
    isCustom: false,
  },
  {
    id: "ex_pushup",
    slug: "push-up",
    name: "Push-Up",
    description: "Simple upper-body press.",
    type: "physical",
    trackingType: "reps",
    supportedTrackingModes: ["reps"],
    bodyTargets: ["bm_core", "bm_shoulders"],
    equipment: [],
    cues: ["Brace the trunk"],
    restSeconds: 45,
    aliases: [],
    movementPattern: "push",
    whyItHelps: "Basic pressing benchmark.",
    isCustom: false,
  },
];

const routines = [
  {
    id: "routine_bird_duration",
    name: "Bird Dog Holds",
    description: "Timed trunk-control work.",
    notes: "",
    difficultyScore: 2,
    createdAt: "2026-05-08T08:00:00.000Z",
    updatedAt: "2026-05-08T08:00:00.000Z",
    isCustom: true,
    entries: [
      {
        id: "entry_bird",
        exerciseId: "ex_bird_dog",
        order: 1,
        sets: 2,
        reps: null,
        durationSeconds: 30,
        weight: null,
        resistance: null,
        restSeconds: 30,
        notes: "Hold each side with a level pelvis.",
      },
    ],
  },
];

const blueprints = [
  {
    id: "plan_bird_capability",
    version: "1.0",
    name: "Bird Dog Capability Plan",
    description: "Tests supported tracking modes cleanly.",
    goal: "Validate exercise mode flexibility.",
    theme: { color: "#4FD1C5", icon: "BD", code: "bird" },
    createdAt: "2026-05-08T08:00:00.000Z",
    stages: [
      {
        id: "stage_foundation",
        name: "Foundation",
        predecessorStageId: null,
        schedule: [{ type: "routine", routineId: "routine_bird_duration" }],
        milestone: {
          description: "Bird Dog duration test",
          eligibility: { type: "sessions", target: 1, requiresContinuous: false },
          test: {
            type: "exercise",
            source: "stage_entry",
            exerciseId: "ex_bird_dog",
            metric: "duration",
            target: 30,
            routineId: "routine_bird_duration",
            routineEntryId: "entry_bird",
            weight: null,
            resistance: null,
            restSeconds: 30,
            notes: "",
          },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
];

const activePlans = [
  {
    id: "active_bird_capability",
    name: "Bird Dog Capability Plan",
    displayName: "Bird Dog Capability Plan",
    description: "Live version for execution checks.",
    goal: "Validate player tracking behavior.",
    theme: { color: "#4FD1C5", icon: "BD", code: "bird" },
    version: "1.0",
    versionHistory: [
      { version: "1.0", modifiedAt: "2026-05-08T08:00:00.000Z", modifiedBy: "user", changeSummary: "Activated from blueprint" },
    ],
    blueprintId: "plan_bird_capability",
    blueprintVersion: "1.0",
    startedAt: "2026-05-08T08:00:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 1,
    currentCycleCount: 0,
    streakDays: 0,
    lastSessionDate: null,
    stageHistory: [
      {
        stageId: "stage_foundation",
        stageName: "Foundation",
        startedAt: "2026-05-08T08:00:00.000Z",
        completedAt: null,
        completedVia: null,
        failureCount: 0,
      },
    ],
    sessions: [],
    stages: [
      {
        id: "stage_foundation",
        name: "Foundation",
        predecessorStageId: null,
        schedule: [{ type: "routine", routineId: "routine_bird_duration" }],
        milestone: {
          description: "Bird Dog duration test",
          eligibility: { type: "sessions", target: 1, requiresContinuous: false },
          test: {
            type: "exercise",
            source: "stage_entry",
            exerciseId: "ex_bird_dog",
            metric: "duration",
            target: 30,
            routineId: "routine_bird_duration",
            routineEntryId: "entry_bird",
            weight: null,
            resistance: null,
            restSeconds: 30,
            notes: "",
          },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
];

async function seedState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ nextBodyTargets, nextExercises, nextRoutines, nextPlans, nextActivePlans }) => {
    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: nextBodyTargets }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: nextExercises }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: nextRoutines }));
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: [] }));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: nextPlans }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: nextActivePlans }));
    localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
  }, {
    nextBodyTargets: bodyTargets,
    nextExercises: exercises,
    nextRoutines: routines,
    nextPlans: blueprints,
    nextActivePlans: activePlans,
  });
}

async function readStoredRoutine(page) {
  return page.evaluate(() => (JSON.parse(localStorage.getItem("workout-app.state.v1") || "{}").routines || [])[0]);
}

const browser = await chromium.launch({ headless: false, slowMo: 150 });
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
const consoleErrors = [];
const pageErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(message.text());
  }
});
page.on("pageerror", (error) => {
  pageErrors.push(error.message);
});

await seedState(page);
await page.reload({ waitUntil: "networkidle" });

await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT_DIR}/01-exercise-library.png`, fullPage: true });
const birdDogCardText = await page.locator("body").textContent();
if (!birdDogCardText.includes("Reps, Duration")) {
  throw new Error("Exercise library should show Bird Dog supported modes.");
}

await page.goto(`${BASE}/#/routines`, { waitUntil: "networkidle" });
await page.locator('[data-action="select-routine"][data-routine-id="routine_bird_duration"]').click();
await page.waitForURL(/#\/routines/);
await page.locator('[data-instance-id="entry_bird"]').evaluate((node) => {
  node.open = true;
});
await page.locator('[data-instance-id="entry_bird"] select[data-field="trackingMode"]').selectOption("duration");
await page.screenshot({ path: `${OUT_DIR}/02-routine-duration-mode.png`, fullPage: true });
await page.locator('[data-action="save-routine"]').click();
const savedRoutine = await readStoredRoutine(page);
const savedEntry = savedRoutine.entries[0];
if (savedEntry.reps !== null || savedEntry.durationSeconds !== 30) {
  throw new Error("Saving a duration-mode Bird Dog entry should persist durationSeconds and clear reps.");
}
if (Object.hasOwn(savedEntry, "trackingType")) {
  throw new Error("Routine entries should stay schema-clean and not persist a trackingType field.");
}

await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
await page.locator('[data-action="select-plan"][data-plan-id="plan_bird_capability"]').click();
await page.locator('[data-action="edit-blueprint"]').click();
await page.locator('[data-action="edit-stage"][data-stage-id="stage_foundation"]').click();
const stageEntryMetrics = await page.locator('[data-milestone-test-field="metric"] option').allTextContents();
if (stageEntryMetrics.length !== 2 || !stageEntryMetrics.includes("Reps") || !stageEntryMetrics.includes("Duration")) {
  throw new Error(`Stage-entry Bird Dog test should offer Reps and Duration, got: ${stageEntryMetrics.join(", ")}`);
}
if (await page.locator('[data-milestone-test-field="metric"]').inputValue() !== "duration") {
  throw new Error("Stage-entry Bird Dog test should default to Duration for the duration-prescribed entry.");
}
await page.locator('[data-milestone-test-field="source"]').selectOption("custom");
await page.locator('[data-milestone-test-field="exerciseId"]').selectOption("ex_pushup");
const pushupMetrics = await page.locator('[data-milestone-test-field="metric"] option').allTextContents();
if (pushupMetrics.length !== 1 || pushupMetrics[0] !== "Reps") {
  throw new Error(`Push-Up custom test should only allow Reps, got: ${pushupMetrics.join(", ")}`);
}
await page.screenshot({ path: `${OUT_DIR}/03-blueprint-stage-metrics.png`, fullPage: true });

await page.goto(`${BASE}/#/active-plan/active_bird_capability`, { waitUntil: "networkidle" });
await page.locator('[data-action="apd-edit"]').click();
await page.waitForURL(/#\/active-plan-edit\/active_bird_capability/);
await page.locator('[data-action="edit-live-stage"][data-stage-id="stage_foundation"]').click();
await page.locator('[data-milestone-test-field="source"]').selectOption("custom");
await page.locator('[data-milestone-test-field="exerciseId"]').selectOption("ex_bird_dog");
const liveMetrics = await page.locator('[data-milestone-test-field="metric"] option').allTextContents();
if (liveMetrics.length !== 2 || !liveMetrics.includes("Reps") || !liveMetrics.includes("Duration")) {
  throw new Error(`Live stage editor should mirror Bird Dog supported metrics, got: ${liveMetrics.join(", ")}`);
}
await page.screenshot({ path: `${OUT_DIR}/04-live-stage-metrics.png`, fullPage: true });

await page.goto(`${BASE}/#/active-plan/active_bird_capability`, { waitUntil: "networkidle" });
await page.goto(`${BASE}/#/workout-player/active_bird_capability`, { waitUntil: "networkidle" });
await page.locator('[data-action="start"]').click();
await page.screenshot({ path: `${OUT_DIR}/05-player-duration-input.png`, fullPage: true });
if ((await page.locator("#log-duration").count()) !== 1) {
  throw new Error("Duration-prescribed Bird Dog should show a duration input in the workout player.");
}
if ((await page.locator("#log-reps").count()) !== 0) {
  throw new Error("Duration-prescribed Bird Dog should not show a reps input in the workout player.");
}

if (consoleErrors.length || pageErrors.length) {
  throw new Error(`Browser errors detected.\nConsole: ${consoleErrors.join("\n")}\nPage: ${pageErrors.join("\n")}`);
}

console.log(`Exercise capability audit passed. Screenshots: ${OUT_DIR}`);
await browser.close();
