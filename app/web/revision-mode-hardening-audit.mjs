import { mkdirSync, writeFileSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/revision-mode-hardening";

mkdirSync(OUT_DIR, { recursive: true });

const bodyTargets = [
  { id: "bm_core", name: "Core", category: "muscle", isCustom: false },
  { id: "bm_chest", name: "Chest", category: "muscle", isCustom: false },
];

const exercises = [
  {
    id: "ex_pushup",
    slug: "push-up",
    name: "Push-Up",
    description: "Pressing baseline.",
    type: "physical",
    trackingType: "reps",
    supportedTrackingModes: ["reps"],
    bodyTargets: ["bm_chest", "bm_core"],
    equipment: [],
    cues: [],
    restSeconds: 60,
    aliases: [],
    movementPattern: "push",
    whyItHelps: "",
    isCustom: false,
  },
  {
    id: "ex_bird_dog",
    slug: "bird-dog",
    name: "Bird Dog",
    description: "Stability drill.",
    type: "mobility",
    trackingType: "reps",
    supportedTrackingModes: ["reps", "duration"],
    bodyTargets: ["bm_core"],
    equipment: [],
    cues: [],
    restSeconds: 30,
    aliases: [],
    movementPattern: "stability",
    whyItHelps: "",
    isCustom: false,
  },
];

const routines = [
  {
    id: "routine_push",
    name: "Push Session",
    description: "",
    notes: "",
    difficultyScore: 2,
    createdAt: "2026-05-08T08:00:00.000Z",
    updatedAt: "2026-05-08T08:00:00.000Z",
    isCustom: false,
    entries: [
      {
        id: "entry_push",
        exerciseId: "ex_pushup",
        order: 1,
        sets: 3,
        reps: 10,
        durationSeconds: null,
        weight: null,
        resistance: null,
        restSeconds: 45,
        notes: "",
      },
    ],
  },
];

const activePlans = [
  {
    id: "active_revision_mode",
    name: "Revision Hardening Plan",
    displayName: "Revision Hardening Plan",
    description: "Base plan for import hardening.",
    goal: "Keep imports safe.",
    theme: { color: "#4FD1C5", icon: "RH", code: "rev" },
    version: "1.0",
    versionHistory: [
      { version: "1.0", modifiedAt: "2026-05-08T08:00:00.000Z", modifiedBy: "user", changeSummary: "Activated from blueprint" },
    ],
    blueprintId: "plan_revision_mode",
    blueprintVersion: "1.0",
    startedAt: "2026-05-08T08:00:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 1,
    currentCycleCount: 0,
    streakDays: 0,
    lastSessionDate: null,
    stageHistory: [
      {
        stageId: "stage_one",
        stageName: "Stage One",
        startedAt: "2026-05-08T08:00:00.000Z",
        completedAt: null,
        completedVia: null,
        failureCount: 0,
      },
    ],
    sessions: [],
    stages: [
      {
        id: "stage_one",
        name: "Stage One",
        predecessorStageId: null,
        schedule: [{ type: "routine", routineId: "routine_push" }],
        milestone: {
          description: "Push-up benchmark",
          eligibility: { type: "sessions", target: 1, requiresContinuous: false },
          test: {
            type: "exercise",
            source: "custom",
            exerciseId: "ex_pushup",
            metric: "reps",
            target: 20,
            routineId: null,
            routineEntryId: null,
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

const invalidRevision = {
  exportVersion: "1.0",
  exportedAt: "2026-05-08T09:00:00.000Z",
  activePlan: {
    ...activePlans[0],
    displayName: "Invalid Revision Attempt",
    stages: [
      {
        ...activePlans[0].stages[0],
        milestone: {
          ...activePlans[0].stages[0].milestone,
          test: {
            ...activePlans[0].stages[0].milestone.test,
            exerciseId: "ex_pushup",
            metric: "duration",
            target: 30,
          },
        },
      },
    ],
  },
  sessions: [],
  exercises,
  routines: [
    {
      ...routines[0],
      entries: [
        {
          ...routines[0].entries[0],
          reps: null,
          durationSeconds: 30,
        },
      ],
    },
  ],
  bodyTargets,
};

const validRevision = {
  exportVersion: "1.0",
  exportedAt: "2026-05-08T09:05:00.000Z",
  activePlan: {
    ...activePlans[0],
    displayName: "Revision Hardening Plan / Updated",
    stages: [
      {
        ...activePlans[0].stages[0],
        milestone: {
          ...activePlans[0].stages[0].milestone,
          description: "Bird Dog duration test",
          test: {
            ...activePlans[0].stages[0].milestone.test,
            exerciseId: "ex_bird_dog",
            metric: "duration",
            target: 30,
          },
        },
      },
    ],
  },
  sessions: [],
  exercises,
  routines,
  bodyTargets,
};

const invalidRevisionPath = `${OUT_DIR}/invalid-revision.json`;
const validRevisionPath = `${OUT_DIR}/valid-revision.json`;
writeFileSync(invalidRevisionPath, JSON.stringify(invalidRevision, null, 2));
writeFileSync(validRevisionPath, JSON.stringify(validRevision, null, 2));

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
  }, {
    nextBodyTargets: bodyTargets,
    nextExercises: exercises,
    nextRoutines: routines,
    nextActivePlans: activePlans,
  });
}

async function readActivePlan(page) {
  return page.evaluate(() => (JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}").active_plans || [])[0]);
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

await page.goto(`${BASE}/#/active-plan/active_revision_mode`, { waitUntil: "networkidle" });
await page.setInputFiles('[data-action="apd-import-file"]', invalidRevisionPath);
await page.waitForURL(/#\/active-plan-revision\/active_revision_mode/);
await page.screenshot({ path: `${OUT_DIR}/01-invalid-revision-blocked.png`, fullPage: true });

const invalidText = await page.locator("body").textContent();
if (!invalidText.includes("incompatible")) {
  throw new Error("Invalid revision should surface blocking compatibility warnings.");
}
const invalidApplyDisabled = await page.locator('[data-action="apr-apply"]').isDisabled();
if (!invalidApplyDisabled) {
  throw new Error("Invalid revision should keep the apply button disabled.");
}

await page.locator('[data-action="apr-back"]').click();
await page.waitForURL(/#\/active-plan\/active_revision_mode/);

await page.setInputFiles('[data-action="apd-import-file"]', validRevisionPath);
await page.waitForURL(/#\/active-plan-revision\/active_revision_mode/);
await page.screenshot({ path: `${OUT_DIR}/02-valid-revision-ready.png`, fullPage: true });

const validApplyDisabled = await page.locator('[data-action="apr-apply"]').isDisabled();
if (validApplyDisabled) {
  throw new Error("Valid revision should be applicable.");
}
await page.locator('[data-action="apr-apply"]').click();
await page.waitForURL(/#\/active-plan\/active_revision_mode/);
await page.screenshot({ path: `${OUT_DIR}/03-valid-revision-applied.png`, fullPage: true });

const updatedPlan = await readActivePlan(page);
if (updatedPlan.displayName !== "Revision Hardening Plan / Updated") {
  throw new Error("Valid revision should update the active plan.");
}
if (updatedPlan.stages[0]?.milestone?.test?.exerciseId !== "ex_bird_dog" || updatedPlan.stages[0]?.milestone?.test?.metric !== "duration") {
  throw new Error("Valid revision should preserve a supported Bird Dog duration milestone test.");
}

if (consoleErrors.length || pageErrors.length) {
  throw new Error(`Browser errors detected.\nConsole: ${consoleErrors.join("\n")}\nPage: ${pageErrors.join("\n")}`);
}

console.log(`Revision mode hardening audit passed. Screenshots: ${OUT_DIR}`);
await browser.close();
