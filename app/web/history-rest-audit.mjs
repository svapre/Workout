import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/history-rest-audit";

mkdirSync(OUT_DIR, { recursive: true });

const bodyTargets = [
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
    bodyTargets: ["bm_core"],
    equipment: ["Bodyweight"],
    cues: ["Brace"],
    restSeconds: 30,
    aliases: [],
    movementPattern: "push",
    whyItHelps: "Simple strength anchor.",
    isCustom: false,
  },
  {
    id: "ex_breath",
    slug: "box-breath",
    name: "Box Breath",
    description: "Breathing reset.",
    type: "mental",
    trackingType: "duration",
    bodyTargets: ["bm_focus"],
    equipment: [],
    cues: ["Long exhale"],
    restSeconds: 20,
    aliases: [],
    movementPattern: "breathe",
    whyItHelps: "Mental reset anchor.",
    isCustom: true,
  },
];

const routines = [
  {
    id: "routine_strength",
    name: "Strength Session",
    description: "Simple push-up work.",
    notes: "",
    difficultyScore: 2,
    createdAt: "2026-05-08T06:00:00.000Z",
    updatedAt: "2026-05-08T06:00:00.000Z",
    isCustom: false,
    entries: [
      {
        id: "entry_pushup",
        exerciseId: "ex_pushup",
        order: 1,
        sets: 1,
        reps: 12,
        durationSeconds: null,
        weight: null,
        resistance: null,
        restSeconds: 20,
        notes: "",
      },
    ],
  },
  {
    id: "routine_focus",
    name: "Focus Reset",
    description: "Short breathing reset.",
    notes: "",
    difficultyScore: 1,
    createdAt: "2026-05-08T06:00:00.000Z",
    updatedAt: "2026-05-08T06:00:00.000Z",
    isCustom: true,
    entries: [
      {
        id: "entry_breath",
        exerciseId: "ex_breath",
        order: 1,
        sets: 1,
        reps: null,
        durationSeconds: 45,
        weight: null,
        resistance: null,
        restSeconds: 15,
        notes: "",
      },
    ],
  },
];

const activePlans = [
  {
    id: "active_final_rest",
    name: "Quiet Finish",
    displayName: "Quiet Finish",
    description: "Single-stage rest boundary plan.",
    goal: "Finish with a deliberate rest step.",
    theme: { color: "#4FD1C5", icon: "QF", code: "quiet-finish" },
    version: "1.0",
    versionHistory: [{ version: "1.0", modifiedAt: "2026-05-08T06:00:00.000Z", modifiedBy: "user", changeSummary: "Seeded" }],
    blueprintId: null,
    blueprintVersion: null,
    startedAt: "2026-05-08T06:00:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 1,
    currentCycleCount: 0,
    streakDays: 0,
    lastSessionDate: null,
    stageHistory: [{ stageId: "stage_final_rest", stageName: "Quiet Close", startedAt: "2026-05-08T06:00:00.000Z", completedAt: null, completedVia: null, failureCount: 0 }],
    sessions: [],
    stages: [
      {
        id: "stage_final_rest",
        name: "Quiet Close",
        predecessorStageId: null,
        schedule: [{ type: "rest", routineId: null }],
        milestone: {
          description: "Complete one rest step.",
          eligibility: { type: "cycles", target: 1, requiresContinuous: false },
          test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
  {
    id: "active_boundary",
    name: "Boundary Flow",
    displayName: "Boundary Flow",
    description: "Rest step should unlock stage advancement.",
    goal: "Advance cleanly after rest.",
    theme: { color: "#F6AD55", icon: "BF", code: "boundary-flow" },
    version: "1.0",
    versionHistory: [{ version: "1.0", modifiedAt: "2026-05-08T06:00:00.000Z", modifiedBy: "user", changeSummary: "Seeded" }],
    blueprintId: null,
    blueprintVersion: null,
    startedAt: "2026-05-08T06:00:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 2,
    currentCycleCount: 0,
    streakDays: 0,
    lastSessionDate: null,
    stageHistory: [{ stageId: "stage_boundary_foundation", stageName: "Foundation", startedAt: "2026-05-08T06:00:00.000Z", completedAt: null, completedVia: null, failureCount: 0 }],
    sessions: [],
    stages: [
      {
        id: "stage_boundary_foundation",
        name: "Foundation",
        predecessorStageId: null,
        schedule: [
          { type: "routine", routineId: "routine_strength" },
          { type: "rest", routineId: null },
        ],
        milestone: {
          description: "Complete one cycle.",
          eligibility: { type: "cycles", target: 1, requiresContinuous: false },
          test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
      {
        id: "stage_boundary_build",
        name: "Build",
        predecessorStageId: "stage_boundary_foundation",
        schedule: [{ type: "routine", routineId: "routine_focus" }],
        milestone: {
          description: "Complete one focus cycle.",
          eligibility: { type: "cycles", target: 1, requiresContinuous: false },
          test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
  {
    id: "active_remove_me",
    name: "Remove Me",
    displayName: "Remove Me",
    description: "Used to verify explicit removal from the active queue.",
    goal: "Keep the session history even if the active snapshot is removed.",
    theme: { color: "#63B3ED", icon: "RM", code: "remove-me" },
    version: "1.0",
    versionHistory: [{ version: "1.0", modifiedAt: "2026-05-08T06:00:00.000Z", modifiedBy: "user", changeSummary: "Seeded" }],
    blueprintId: null,
    blueprintVersion: null,
    startedAt: "2026-05-08T06:00:00.000Z",
    currentStageIndex: 0,
    currentDayInCycle: 1,
    currentCycleCount: 0,
    streakDays: 0,
    lastSessionDate: "2026-05-08",
    stageHistory: [{ stageId: "stage_remove", stageName: "Base", startedAt: "2026-05-08T06:00:00.000Z", completedAt: null, completedVia: null, failureCount: 0 }],
    sessions: ["sess_remove_1"],
    stages: [
      {
        id: "stage_remove",
        name: "Base",
        predecessorStageId: null,
        schedule: [{ type: "routine", routineId: "routine_strength" }],
        milestone: {
          description: "Complete one cycle.",
          eligibility: { type: "cycles", target: 1, requiresContinuous: false },
          test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
];

const archivedPlans = [
  {
    id: "archived_focus",
    name: "Archived Focus",
    displayName: "Archived Focus",
    description: "Already completed and archived.",
    goal: "Review later.",
    theme: { color: "#9F7AEA", icon: "AF", code: "archived-focus" },
    version: "1.2",
    versionHistory: [
      { version: "1.0", modifiedAt: "2026-05-05T06:00:00.000Z", modifiedBy: "user", changeSummary: "Activated" },
      { version: "1.1", modifiedAt: "2026-05-06T06:00:00.000Z", modifiedBy: "import", changeSummary: "Coach revision" },
      { version: "1.2", modifiedAt: "2026-05-07T06:00:00.000Z", modifiedBy: "user", changeSummary: "Final tweak" },
    ],
    blueprintId: null,
    blueprintVersion: null,
    startedAt: "2026-05-05T06:00:00.000Z",
    currentStageIndex: 1,
    currentDayInCycle: 1,
    currentCycleCount: 1,
    streakDays: 0,
    lastSessionDate: "2026-05-07",
    completedAt: "2026-05-07T08:00:00.000Z",
    stageHistory: [
      { stageId: "stage_archived_base", stageName: "Base", startedAt: "2026-05-05T06:00:00.000Z", completedAt: "2026-05-06T06:00:00.000Z", completedVia: "milestone", failureCount: 0 },
      { stageId: "stage_archived_peak", stageName: "Peak", startedAt: "2026-05-06T06:00:00.000Z", completedAt: "2026-05-07T08:00:00.000Z", completedVia: "milestone", failureCount: 0 },
    ],
    sessions: ["sess_archived_1"],
    stages: [
      {
        id: "stage_archived_base",
        name: "Base",
        predecessorStageId: null,
        schedule: [{ type: "routine", routineId: "routine_strength" }],
        milestone: {
          description: "Complete one cycle.",
          eligibility: { type: "cycles", target: 1, requiresContinuous: false },
          test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
      {
        id: "stage_archived_peak",
        name: "Peak",
        predecessorStageId: "stage_archived_base",
        schedule: [{ type: "routine", routineId: "routine_focus" }],
        milestone: {
          description: "Complete one cycle.",
          eligibility: { type: "cycles", target: 1, requiresContinuous: false },
          test: { type: "none", source: "custom", exerciseId: null, metric: null, target: null, routineId: null, routineEntryId: null, weight: null, resistance: null, restSeconds: null, notes: "" },
          onFailure: { action: "none", targetStageId: null },
        },
        transitionRule: "prompt_user",
      },
    ],
  },
];

const workouts = [
  {
    id: "sess_remove_1",
    activePlanId: "active_remove_me",
    activePlanVersion: "1.0",
    routineId: "routine_strength",
    stageId: "stage_remove",
    startedAt: "2026-05-08T06:20:00.000Z",
    completedAt: "2026-05-08T06:26:00.000Z",
    reflectionRating: "normal",
    sets: [
      {
        exerciseId: "ex_pushup",
        setNumber: 1,
        status: "completed",
        actualReps: 12,
        actualDurationSec: null,
        actualWeightKg: null,
        actualResistance: null,
      },
    ],
  },
  {
    id: "sess_archived_1",
    activePlanId: "archived_focus",
    activePlanVersion: "1.2",
    routineId: "routine_focus",
    stageId: "stage_archived_peak",
    startedAt: "2026-05-07T07:30:00.000Z",
    completedAt: "2026-05-07T08:00:00.000Z",
    reflectionRating: "strong",
    sets: [
      {
        exerciseId: "ex_breath",
        setNumber: 1,
        status: "completed",
        actualReps: null,
        actualDurationSec: 45,
        actualWeightKg: null,
        actualResistance: null,
      },
    ],
  },
];

async function seedState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ nextBodyTargets, nextExercises, nextRoutines, nextActivePlans, nextArchivedPlans, nextWorkouts }) => {
    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: nextBodyTargets }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: nextExercises }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: nextRoutines }));
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: nextWorkouts }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: nextActivePlans }));
    localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify(nextArchivedPlans));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: [] }));
  }, {
    nextBodyTargets: bodyTargets,
    nextExercises: exercises,
    nextRoutines: routines,
    nextActivePlans: activePlans,
    nextArchivedPlans: archivedPlans,
    nextWorkouts: workouts,
  });
}

async function loadRoute(page, route) {
  await page.goto(`${BASE}/?audit=${Date.now()}#/${route}`, { waitUntil: "domcontentloaded" });
}

function cardFor(page, planId) {
  return page.locator(`.plan-card[data-plan-id="${planId}"]`).first();
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 250 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console:${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`pageerror:${error.message}`);
  });

  try {
    await seedState(page);
    await loadRoute(page, "active-plans");
    await page.locator(".plan-card").first().waitFor();
    await page.screenshot({ path: `${OUT_DIR}/01-dashboard-before.png`, fullPage: true });

    const quietFinishCard = cardFor(page, "active_final_rest");
    await quietFinishCard.getByRole("button", { name: "Complete rest step" }).click();
    await page.waitForTimeout(400);
    const quietFinishCta = await quietFinishCard.getByRole("button").innerText();
    const quietFinishMission = await quietFinishCard.locator(".plan-card__mission-label").innerText();

    const boundaryCard = cardFor(page, "active_boundary");
    await boundaryCard.getByRole("button", { name: "Complete rest step" }).click();
    await page.waitForTimeout(400);
    const boundaryAdvanceButton = boundaryCard.getByRole("button", { name: /Advance to Build/i });
    await boundaryAdvanceButton.waitFor();
    await page.screenshot({ path: `${OUT_DIR}/02-dashboard-after-rest.png`, fullPage: true });

    await quietFinishCard.click();
    await page.waitForURL(/#\/active-plan\/active_final_rest/);
    await page.screenshot({ path: `${OUT_DIR}/03-quiet-finish-detail.png`, fullPage: true });
    const detailPrimaryLabel = await page.locator('[data-action="apd-resume"]').innerText();
    await page.locator('[data-action="apd-resume"]').click();
    await page.locator("#global-modal-overlay").getByRole("button", { name: /^Archive plan$/i }).click();
    await page.waitForURL(/#\/active-plans/);
    await page.screenshot({ path: `${OUT_DIR}/04-after-archive.png`, fullPage: true });

    await cardFor(page, "active_remove_me").click();
    await page.waitForURL(/#\/active-plan\/active_remove_me/);
    await page.getByRole("button", { name: "Remove from active list" }).click();
    await page.locator("#global-modal-overlay").getByRole("button", { name: "Remove plan" }).click();
    await page.waitForURL(/#\/active-plans/);
    await page.screenshot({ path: `${OUT_DIR}/05-after-remove.png`, fullPage: true });

    await loadRoute(page, "workouts");
    await page.screenshot({ path: `${OUT_DIR}/06-history-overview.png`, fullPage: true });
    await page.locator('[data-action="select-history-plan"][data-plan-id="active_remove_me"]').click();
    await page.waitForTimeout(300);
    const removedPlanStatus = await page.getByText("Removed", { exact: true }).first().innerText();
    const removedPlanSummaryTitle = await page.locator(".panel__title").filter({ hasText: "Removed plan" }).first().innerText();
    await page.screenshot({ path: `${OUT_DIR}/07-history-removed-plan.png`, fullPage: true });

    await page.locator('[data-action="select-history-plan"][data-plan-id="archived_focus"]').click();
    await page.waitForTimeout(300);
    const archivedPlanStatus = await page.getByText("Archived", { exact: true }).first().innerText();
    await page.screenshot({ path: `${OUT_DIR}/08-history-archived-plan.png`, fullPage: true });

    const storageState = await page.evaluate(() => ({
      activePlans: JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}"),
      archivedPlans: JSON.parse(localStorage.getItem("workout-app.archivedPlans.v1") || "[]"),
    }));

    if (errors.length) {
      throw new Error(`Browser reported errors:\n${errors.join("\n")}`);
    }

    console.log(JSON.stringify({
      observations: [
        {
          area: "Dashboard final-stage rest card",
          missionLabel: quietFinishMission,
          cta: quietFinishCta,
        },
        {
          area: "Detail final-stage completion",
          primaryAction: detailPrimaryLabel,
        },
        {
          area: "History removed-plan slice",
          status: removedPlanStatus,
          summaryTitle: removedPlanSummaryTitle,
        },
        {
          area: "History archived-plan slice",
          status: archivedPlanStatus,
          archivedCount: Array.isArray(storageState.archivedPlans) ? storageState.archivedPlans.length : 0,
          activeCount: Array.isArray(storageState.activePlans?.active_plans) ? storageState.activePlans.active_plans.length : 0,
        },
      ],
      errors,
      screenshots: OUT_DIR,
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
