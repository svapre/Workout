import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://localhost:8000";
const VIEWPORT = { width: 440, height: 976 }; // Poco X6 representative CSS Viewport
const OUT_DIR = "screenshots/poco-x6";

mkdirSync(OUT_DIR, { recursive: true });

const bodyMaps = [
  { id: "bm_chest", name: "Chest", category: "muscle", isCustom: false },
  { id: "bm_back", name: "Back", category: "muscle", isCustom: false },
  { id: "bm_core", name: "Core", category: "muscle", isCustom: false },
];

const exercises = [
  {
    id: "ex_pushup",
    slug: "push-up",
    name: "Push-Up",
    description: "Press from the floor with a steady tempo.",
    type: "physical",
    trackingType: "reps",
    bodyTargets: ["bm_chest", "bm_core"],
    equipment: ["Bodyweight"],
    cues: ["Brace first"],
    restSeconds: 75,
    isCustom: false,
  },
  {
    id: "ex_plank",
    slug: "front-plank",
    name: "Front Plank",
    description: "Low-friction trunk stability work.",
    type: "mobility",
    trackingType: "duration",
    bodyTargets: ["bm_core"],
    equipment: ["Mat"],
    cues: ["Ribs down"],
    restSeconds: 45,
    isCustom: false,
  }
];

const routines = [
  {
    id: "routine_full_body_a",
    name: "Full Body A",
    description: "Simple push, pull, and brace block.",
    notes: "Primary strength day.",
    difficultyScore: 6,
    isCustom: false,
    entries: [
      {
        id: "entry_pushup",
        exerciseId: "ex_pushup",
        order: 1,
        sets: 4,
        reps: 10,
        restSeconds: 75,
      },
      {
        id: "entry_plank",
        exerciseId: "ex_plank",
        order: 2,
        sets: 3,
        durationSeconds: 45,
        restSeconds: 45,
      }
    ]
  }
];

const plans = [
  {
    id: "plan_master_rehab_strength",
    version: "1.0.0",
    name: "Strength Base",
    description: "Build a repeatable strength rhythm.",
    goal: "Complete with clean execution.",
    theme: { color: "#4FD1C5", icon: "SB", code: "strength-base" },
    createdAt: "2026-05-08T07:00:00.000Z",
    stages: [
      {
        id: "stage_base",
        name: "Foundation",
        schedule: [
          { type: "routine", routineId: "routine_full_body_a" },
        ],
        milestone: {
          description: "Complete 4 cycles.",
          type: "cycles",
          target: 4,
        },
        transitionRule: "prompt_user",
      }
    ]
  }
];

const activePlans = [
  {
    id: "active_strength_base",
    name: "Strength Base",
    displayName: "Strength Base",
    description: "Build a repeatable strength rhythm.",
    goal: "Complete with clean execution.",
    theme: { color: "#4FD1C5", icon: "SB", code: "strength-base" },
    version: "1.0.0",
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
      }
    ],
    sessions: [],
    stages: structuredClone(plans[0].stages),
  }
];

async function seedLocalStorage(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ seedBodyMaps, seedExercises, seedRoutines, seedPlans, seedActivePlans }) => {
      localStorage.clear();
      localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: seedBodyMaps }));
      localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: seedExercises }));
      localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: seedRoutines }));
      localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: [] }));
      localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: seedPlans }));
      localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: seedActivePlans }));
      localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
    },
    {
      seedBodyMaps: bodyMaps,
      seedExercises: exercises,
      seedRoutines: routines,
      seedPlans: plans,
      seedActivePlans: activePlans,
    }
  );
  await page.reload({ waitUntil: "networkidle" });
}

async function capture(page, name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
  console.log(`Captured Poco X6 screenshot: ${name}.png`);
}

async function main() {
  console.log("Starting custom Poco X6 UI/UX audit at 440 x 976 viewport...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  await seedLocalStorage(page);

  // 1. Home / Active Plans
  await page.goto(`${BASE}/#/active-plans`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await capture(page, "01-active-plans");

  // 2. Active Plan Detail
  await page.goto(`${BASE}/#/active-plan/active_strength_base`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await capture(page, "02-active-plan-detail");

  // 3. Exercise Library
  await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await capture(page, "03-exercise-library");

  // 4. Exercise Detail
  await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
  await page.locator('[data-action="exercise-card"]').first().click();
  await page.waitForTimeout(500);
  await capture(page, "04-exercise-detail");

  // 5. Routines List
  await page.goto(`${BASE}/#/routines`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await capture(page, "05-routines-library");

  // 6. Workout Player (Pre-workout)
  await page.goto(`${BASE}/#/active-plan/active_strength_base`, { waitUntil: "networkidle" });
  await page.locator('[data-action="apd-primary"]').first().click();
  await page.waitForTimeout(500);
  await capture(page, "06-workout-player-pre");

  // 7. Workout Player (Active Workout Set)
  await page.locator('[data-action="start"]').click();
  await page.waitForTimeout(500);
  await capture(page, "07-workout-player-active");

  // 8. History / Workouts
  await page.goto(`${BASE}/#/workouts`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await capture(page, "08-workout-history");

  console.log("Poco X6 UI/UX audit finished successfully!");
  await browser.close();
}

main().catch(console.error);
