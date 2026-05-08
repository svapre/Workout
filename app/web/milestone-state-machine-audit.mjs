import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const BASE = "http://localhost:8000";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "screenshots-e2e", "milestone-state-machine");
const HEADED = process.argv.includes("--headed");

mkdirSync(OUT_DIR, { recursive: true });

function nowIso(offsetMinutes = 0) {
  return new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString();
}

function createMilestone({
  description,
  eligibilityType = "cycles",
  eligibilityTarget = 1,
  requiresContinuous = false,
  test = null,
  onFailureAction = "none",
  targetStageId = null,
} = {}) {
  return {
    description: description || "",
    eligibility: {
      type: eligibilityType,
      target: eligibilityType === "none" ? null : eligibilityTarget,
      requiresContinuous,
    },
    test: test || {
      type: "none",
      source: "custom",
      exerciseId: null,
      metric: null,
      target: null,
      routineId: null,
      routineEntryId: null,
      weight: null,
      resistance: null,
      restSeconds: null,
      notes: "",
    },
    onFailure: {
      action: onFailureAction,
      targetStageId,
    },
  };
}

function createStage({
  id,
  name,
  predecessorStageId = null,
  schedule,
  milestone,
  transitionRule = "prompt_user",
}) {
  return {
    id,
    name,
    predecessorStageId,
    schedule,
    milestone,
    transitionRule,
  };
}

function createStageHistoryEntry(stageId, stageName, startedAt, completedAt = null, completedVia = null, failureCount = 0) {
  return {
    stageId,
    stageName,
    startedAt,
    completedAt,
    completedVia,
    failureCount,
  };
}

function createActivePlan({
  id,
  name,
  displayName,
  description,
  goal,
  theme,
  currentStageIndex,
  currentDayInCycle,
  currentCycleCount,
  stages,
  stageHistory,
}) {
  const startedAt = stageHistory[0]?.startedAt || nowIso(-240);
  return {
    id,
    name,
    displayName,
    description,
    goal,
    theme,
    version: "1.0",
    versionHistory: [
      {
        version: "1.0",
        modifiedAt: startedAt,
        modifiedBy: "user",
        changeSummary: "Seeded for milestone audit",
      },
    ],
    blueprintId: null,
    blueprintVersion: null,
    startedAt,
    currentStageIndex,
    currentDayInCycle,
    currentCycleCount,
    streakDays: 0,
    lastSessionDate: null,
    stageHistory,
    sessions: [],
    stages,
  };
}

function createExercise(id, name, trackingType) {
  return {
    id,
    slug: id.replace(/^ex_/, ""),
    name,
    description: "",
    type: "physical",
    trackingType,
    bodyTargets: [],
    equipment: [],
    cues: [],
    restSeconds: 5,
    aliases: [],
    movementPattern: "",
    whyItHelps: "",
    isCustom: true,
  };
}

function createRoutine(id, name, entries) {
  const ts = nowIso(-180);
  return {
    id,
    name,
    description: "",
    notes: "",
    difficultyScore: 1,
    createdAt: ts,
    updatedAt: ts,
    isCustom: true,
    entries,
  };
}

function buildSeedPayload() {
  const exercises = [
    createExercise("ex_assisted_pullup", "Assisted Pull-up", "reps"),
    createExercise("ex_pullup", "Strict Pull-up", "reps"),
    createExercise("ex_pushup", "Push-up", "reps"),
    createExercise("ex_deadlift", "Deadlift", "weight"),
    createExercise("ex_plank", "Plank", "duration"),
  ];

  const routines = [
    createRoutine("rt_assist_pull", "Assisted Pull Session", [
      {
        id: "entry_assist_1",
        exerciseId: "ex_assisted_pullup",
        order: 1,
        sets: 1,
        reps: 5,
        durationSeconds: null,
        weight: null,
        resistance: "green band",
        restSeconds: 5,
        notes: "Keep the pull smooth and controlled.",
      },
    ]),
    createRoutine("rt_pushup", "Push-up Builder", [
      {
        id: "entry_push_1",
        exerciseId: "ex_pushup",
        order: 1,
        sets: 1,
        reps: 5,
        durationSeconds: null,
        weight: null,
        resistance: null,
        restSeconds: 5,
        notes: "Own the bottom position.",
      },
    ]),
    createRoutine("rt_deadlift", "Deadlift Check", [
      {
        id: "entry_dead_1",
        exerciseId: "ex_deadlift",
        order: 1,
        sets: 1,
        reps: 5,
        durationSeconds: null,
        weight: 100,
        resistance: null,
        restSeconds: 5,
        notes: "Five clean reps at test load.",
      },
    ]),
    createRoutine("rt_plank", "Plank Hold", [
      {
        id: "entry_plank_1",
        exerciseId: "ex_plank",
        order: 1,
        sets: 1,
        reps: null,
        durationSeconds: 60,
        weight: null,
        resistance: null,
        restSeconds: 5,
        notes: "Hold steady breathing and braced position.",
      },
    ]),
  ];

  const guardBlueprint = {
    id: "plan_master_rehab_strength",
    version: "1.0",
    name: "Seed Guard",
    description: "",
    goal: "",
    theme: { color: "#4FD1C5", icon: "SG", code: "SG" },
    createdAt: nowIso(-300),
    stages: [
      createStage({
        id: "stage_seed_guard",
        name: "Seed Guard Stage",
        schedule: [{ type: "rest", routineId: null }],
        milestone: createMilestone({
          description: "Guard blueprint",
          eligibilityType: "none",
        }),
        transitionRule: "manual",
      }),
    ],
  };

  const passPlanStages = [
    createStage({
      id: "stage_pass_1",
      name: "Assisted Build",
      schedule: [{ type: "routine", routineId: "rt_assist_pull" }],
      milestone: createMilestone({
        description: "Complete one assisted session, then prove one strict pull-up.",
        eligibilityType: "sessions",
        eligibilityTarget: 1,
        test: {
          type: "exercise",
          source: "custom",
          exerciseId: "ex_pullup",
          metric: "reps",
          target: 1,
          routineId: null,
          routineEntryId: null,
          weight: null,
          resistance: null,
          restSeconds: 5,
          notes: "One strict rep from a dead hang.",
        },
      }),
    }),
    createStage({
      id: "stage_pass_2",
      name: "Recovery Hold",
      predecessorStageId: "stage_pass_1",
      schedule: [{ type: "rest", routineId: null }],
      milestone: createMilestone({
        description: "Hold this phase until you are ready for the next blueprint revision.",
        eligibilityType: "none",
      }),
      transitionRule: "manual",
    }),
  ];

  const restartPlanStages = [
    createStage({
      id: "stage_restart_1",
      name: "Push-up Reset Gate",
      schedule: [{ type: "routine", routineId: "rt_pushup" }],
      milestone: createMilestone({
        description: "Earn the test, then clear eight strict push-ups.",
        eligibilityType: "sessions",
        eligibilityTarget: 1,
        test: {
          type: "exercise",
          source: "stage_entry",
          exerciseId: "ex_pushup",
          metric: "reps",
          target: 8,
          routineId: "rt_pushup",
          routineEntryId: "entry_push_1",
          weight: null,
          resistance: null,
          restSeconds: 5,
          notes: "Eight strict reps.",
        },
        onFailureAction: "restart_stage",
      }),
    }),
    createStage({
      id: "stage_restart_2",
      name: "Push-up Progression",
      predecessorStageId: "stage_restart_1",
      schedule: [{ type: "routine", routineId: "rt_pushup" }],
      milestone: createMilestone({
        description: "Continue building from the reset gate.",
        eligibilityType: "sessions",
        eligibilityTarget: 2,
      }),
    }),
  ];

  const stayPlanStages = [
    createStage({
      id: "stage_stay_1",
      name: "Pull-up Choice Gate",
      schedule: [{ type: "routine", routineId: "rt_assist_pull" }],
      milestone: createMilestone({
        description: "Unlock the strict rep test, then choose whether to advance or stay.",
        eligibilityType: "sessions",
        eligibilityTarget: 1,
        test: {
          type: "exercise",
          source: "custom",
          exerciseId: "ex_pullup",
          metric: "reps",
          target: 1,
          routineId: null,
          routineEntryId: null,
          weight: null,
          resistance: null,
          restSeconds: 5,
          notes: "One strict rep from a dead hang.",
        },
      }),
    }),
    createStage({
      id: "stage_stay_2",
      name: "Unlocked But Optional",
      predecessorStageId: "stage_stay_1",
      schedule: [{ type: "routine", routineId: "rt_pushup" }],
      milestone: createMilestone({
        description: "Only advance here if the user chooses to move on.",
        eligibilityType: "sessions",
        eligibilityTarget: 1,
      }),
    }),
  ];

  const demotePlanStages = [
    createStage({
      id: "stage_demote_1",
      name: "Foundation Base",
      schedule: [{ type: "routine", routineId: "rt_pushup" }],
      milestone: createMilestone({
        description: "Base stage for rebuilding.",
        eligibilityType: "sessions",
        eligibilityTarget: 1,
      }),
    }),
    createStage({
      id: "stage_demote_2",
      name: "Deadlift Test Stage",
      predecessorStageId: "stage_demote_1",
      schedule: [{ type: "routine", routineId: "rt_deadlift" }],
      milestone: createMilestone({
        description: "Five clean deadlifts at 100 kg unlock the next block.",
        eligibilityType: "none",
        test: {
          type: "exercise",
          source: "stage_entry",
          exerciseId: "ex_deadlift",
          metric: "reps",
          target: 5,
          routineId: "rt_deadlift",
          routineEntryId: "entry_dead_1",
          weight: 100,
          resistance: null,
          restSeconds: 5,
          notes: "Hit the test load cleanly.",
        },
        onFailureAction: "goto_stage",
        targetStageId: "stage_demote_1",
      }),
    }),
  ];

  const restPlanStages = [
    createStage({
      id: "stage_rest_1",
      name: "Restore And Hold",
      schedule: [
        { type: "rest", routineId: null },
        { type: "routine", routineId: "rt_plank" },
      ],
      milestone: createMilestone({
        description: "Complete the recovery step, then hit the plank hold.",
        eligibilityType: "cycles",
        eligibilityTarget: 1,
      }),
    }),
  ];

  const activePlans = [
    createActivePlan({
      id: "plan_pass",
      name: "Pull-up Blueprint",
      displayName: "Pass Flow",
      description: "Custom exercise test that is not part of the routine.",
      goal: "Unlock the strict pull-up test and pass it.",
      theme: { color: "#4FD1C5", icon: "PF", code: "PF" },
      currentStageIndex: 0,
      currentDayInCycle: 1,
      currentCycleCount: 0,
      stages: passPlanStages,
      stageHistory: [
        createStageHistoryEntry("stage_pass_1", "Assisted Build", nowIso(-240)),
      ],
    }),
    createActivePlan({
      id: "plan_restart",
      name: "Push-up Blueprint",
      displayName: "Restart Flow",
      description: "Stage restart after a failed milestone test.",
      goal: "Unlock and clear the push-up gate.",
      theme: { color: "#F6AD55", icon: "RS", code: "RS" },
      currentStageIndex: 0,
      currentDayInCycle: 1,
      currentCycleCount: 0,
      stages: restartPlanStages,
      stageHistory: [
        createStageHistoryEntry("stage_restart_1", "Push-up Reset Gate", nowIso(-220)),
      ],
    }),
    createActivePlan({
      id: "plan_stay",
      name: "Pull-up Stay Blueprint",
      displayName: "Stay Flow",
      description: "Passing the test should still allow the user to stay in the same stage.",
      goal: "Pass the test but remain in the current stage.",
      theme: { color: "#B794F4", icon: "ST", code: "ST" },
      currentStageIndex: 0,
      currentDayInCycle: 1,
      currentCycleCount: 0,
      stages: stayPlanStages,
      stageHistory: [
        createStageHistoryEntry("stage_stay_1", "Pull-up Choice Gate", nowIso(-210)),
      ],
    }),
    createActivePlan({
      id: "plan_demote",
      name: "Deadlift Blueprint",
      displayName: "Demotion Flow",
      description: "Failing the test should demote back to the base stage.",
      goal: "Hold the deadlift gate before progressing.",
      theme: { color: "#FC8181", icon: "DM", code: "DM" },
      currentStageIndex: 1,
      currentDayInCycle: 1,
      currentCycleCount: 0,
      stages: demotePlanStages,
      stageHistory: [
        createStageHistoryEntry("stage_demote_1", "Foundation Base", nowIso(-300), nowIso(-260), "milestone", 0),
        createStageHistoryEntry("stage_demote_2", "Deadlift Test Stage", nowIso(-200)),
      ],
    }),
    createActivePlan({
      id: "plan_rest",
      name: "Recovery Blueprint",
      displayName: "Rest Flow",
      description: "Explicit rest day followed by a duration-based session.",
      goal: "Mark recovery, then complete the hold.",
      theme: { color: "#90CDF4", icon: "RF", code: "RF" },
      currentStageIndex: 0,
      currentDayInCycle: 1,
      currentCycleCount: 0,
      stages: restPlanStages,
      stageHistory: [
        createStageHistoryEntry("stage_rest_1", "Restore And Hold", nowIso(-180)),
      ],
    }),
  ];

  return {
    "workout-app.exercises.v1": { exercises },
    "workout-app.state.v1": { routines },
    "workout-app.workouts.v1": { workouts: [] },
    "workout-app.plans.v1": { plan_blueprints: [guardBlueprint] },
    "workout-app.activePlans.v1": { active_plans: activePlans },
    "workout-app.archivedPlans.v1": [],
  };
}

async function takeScreenshot(page, name) {
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: true });
  console.log(`  Screenshot: ${name}.png`);
}

async function waitForApp(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

async function seedState(page) {
  const payload = buildSeedPayload();
  await page.goto(`${BASE}/#/active-plans`, { waitUntil: "domcontentloaded" });
  await page.evaluate((entries) => {
    window.localStorage.clear();
    Object.entries(entries).forEach(([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    });
  }, payload);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
}

async function click(locator) {
  await locator.click();
}

async function startPlayer(page) {
  const startButton = page.locator('[data-action="start"]');
  await startButton.waitFor({ timeout: 5000 });
  await click(startButton);
  await page.waitForTimeout(600);
}

async function finishSingleSetSession(page, values = {}) {
  if (values.reps != null) {
    const repsInput = page.locator("#log-reps");
    if (await repsInput.isVisible({ timeout: 500 }).catch(() => false)) {
      await repsInput.fill(String(values.reps));
    }
  }
  if (values.weight != null) {
    const weightInput = page.locator("#log-weight");
    if (await weightInput.isVisible({ timeout: 500 }).catch(() => false)) {
      await weightInput.fill(String(values.weight));
    }
  }
  if (values.duration != null) {
    const durationInput = page.locator("#log-duration");
    if (await durationInput.isVisible({ timeout: 500 }).catch(() => false)) {
      await durationInput.fill(String(values.duration));
    }
  }

  await click(page.locator('[data-action="complete"]'));
  await page.waitForTimeout(400);

  const skipRest = page.locator('[data-action="skip-rest"]');
  if (await skipRest.isVisible({ timeout: 3000 }).catch(() => false)) {
    await click(skipRest);
    await page.waitForTimeout(400);
  }
}

async function finishReflection(page, difficulty) {
  const continueButton = page.locator('[data-action="continue-journey"]');
  if (await continueButton.isVisible({ timeout: 4000 }).catch(() => false)) {
    await click(continueButton);
    await page.waitForTimeout(400);
  }
  const difficultyButton = page.locator(`[data-difficulty="${difficulty}"]`);
  await difficultyButton.waitFor({ timeout: 5000 });
  await click(difficultyButton);
  await page.waitForTimeout(800);
}

async function finishCeremonyAndReflection(page, beginNextStage, difficulty) {
  if (beginNextStage) {
    await click(page.locator('[data-action="begin-next-stage"]'));
  } else {
    await click(page.locator('[data-action="continue-current-stage"]'));
  }
  await page.waitForTimeout(400);
  await finishReflection(page, difficulty);
}

async function readActivePlanState(page, planId) {
  return page.evaluate((id) => {
    const raw = window.localStorage.getItem("workout-app.activePlans.v1");
    const payload = raw ? JSON.parse(raw) : {};
    return (payload.active_plans || []).find((plan) => plan.id === id) || null;
  }, planId);
}

async function runPassFlow(page) {
  console.log("\n=== Pass Flow ===");
  await page.goto(`${BASE}/#/active-plan/plan_pass`, { waitUntil: "networkidle" });
  await takeScreenshot(page, "01-pass-detail-initial");

  await click(page.locator('[data-action="apd-resume"]'));
  await startPlayer(page);
  await takeScreenshot(page, "02-pass-routine-active");
  await finishSingleSetSession(page, { reps: 5 });
  await finishReflection(page, "normal");

  await page.waitForURL(/#\/active-plan\/plan_pass/, { timeout: 5000 });
  await takeScreenshot(page, "03-pass-detail-test-unlocked");
  console.log(`  Test CTA visible: ${await page.locator('[data-action="apd-test"]').isVisible()}`);

  await click(page.locator('[data-action="apd-test"]'));
  await startPlayer(page);
  await takeScreenshot(page, "04-pass-test-active");
  await finishSingleSetSession(page, { reps: 1 });
  await takeScreenshot(page, "05-pass-milestone-ceremony");
  await finishCeremonyAndReflection(page, true, "strong");

  await page.waitForURL(/#\/active-plan\/plan_pass/, { timeout: 5000 });
  await takeScreenshot(page, "06-pass-detail-after-advance");
  const passState = await readActivePlanState(page, "plan_pass");
  console.log(`  Current stage after pass: ${passState.currentStageIndex}`);
  console.log(`  Stage history entries: ${passState.stageHistory.length}`);

  const downloadPromise = page.waitForEvent("download");
  await click(page.locator('[data-action="apd-export"]'));
  const download = await downloadPromise;
  console.log(`  Export download: ${download.suggestedFilename()}`);
}

async function runRestartFlow(page) {
  console.log("\n=== Restart Flow ===");
  await page.goto(`${BASE}/#/active-plan/plan_restart`, { waitUntil: "networkidle" });
  await takeScreenshot(page, "07-restart-detail-initial");

  await click(page.locator('[data-action="apd-resume"]'));
  await startPlayer(page);
  await finishSingleSetSession(page, { reps: 5 });
  await finishReflection(page, "normal");

  await page.waitForURL(/#\/active-plan\/plan_restart/, { timeout: 5000 });
  await takeScreenshot(page, "08-restart-detail-test-unlocked");

  await click(page.locator('[data-action="apd-test"]'));
  await startPlayer(page);
  await takeScreenshot(page, "09-restart-test-active");
  await finishSingleSetSession(page, { reps: 5 });
  await finishReflection(page, "difficult");

  await page.waitForURL(/#\/active-plan\/plan_restart/, { timeout: 5000 });
  await takeScreenshot(page, "10-restart-detail-after-fail");
  const restartState = await readActivePlanState(page, "plan_restart");
  console.log(`  Current day after restart: ${restartState.currentDayInCycle}`);
  console.log(`  Current stage history length: ${restartState.stageHistory.length}`);
  console.log(`  Progress text: ${await page.locator('.journey-progress__value').textContent()}`);
}

async function runStayFlow(page) {
  console.log("\n=== Stay Flow ===");
  await page.goto(`${BASE}/#/active-plan/plan_stay`, { waitUntil: "networkidle" });
  await takeScreenshot(page, "11-stay-detail-initial");

  await click(page.locator('[data-action="apd-resume"]'));
  await startPlayer(page);
  await finishSingleSetSession(page, { reps: 5 });
  await finishReflection(page, "normal");

  await page.waitForURL(/#\/active-plan\/plan_stay/, { timeout: 5000 });
  await click(page.locator('[data-action="apd-test"]'));
  await startPlayer(page);
  await takeScreenshot(page, "12-stay-test-active");
  await finishSingleSetSession(page, { reps: 1 });
  await takeScreenshot(page, "13-stay-milestone-ceremony");
  await finishCeremonyAndReflection(page, false, "strong");

  await page.waitForURL(/#\/active-plan\/plan_stay/, { timeout: 5000 });
  await takeScreenshot(page, "14-stay-detail-after-choice");
  const stayState = await readActivePlanState(page, "plan_stay");
  console.log(`  Current stage after stay choice: ${stayState.currentStageIndex}`);
  console.log(`  Advance CTA visible: ${await page.locator('[data-action="apd-advance"]').isVisible()}`);
}

async function runDemotionFlow(page) {
  console.log("\n=== Demotion Flow ===");
  await page.goto(`${BASE}/#/active-plan/plan_demote`, { waitUntil: "networkidle" });
  await takeScreenshot(page, "15-demote-detail-initial");

  await click(page.locator('[data-action="apd-test"]'));
  await startPlayer(page);
  await takeScreenshot(page, "16-demote-test-active");
  await finishSingleSetSession(page, { reps: 5, weight: 90 });
  await finishReflection(page, "normal");

  await page.waitForURL(/#\/active-plan\/plan_demote/, { timeout: 5000 });
  await takeScreenshot(page, "17-demote-detail-after-fail");
  const demoteState = await readActivePlanState(page, "plan_demote");
  console.log(`  Current stage after demotion: ${demoteState.currentStageIndex}`);
  console.log(`  Current stage label: ${await page.locator('.journey-hero__stage').textContent()}`);
}

async function runRestAndDurationFlow(page) {
  console.log("\n=== Rest + Duration Flow ===");
  await page.goto(`${BASE}/#/active-plan/plan_rest`, { waitUntil: "networkidle" });
  await takeScreenshot(page, "18-rest-detail-initial");

  await click(page.locator('[data-action="apd-resume"]'));
  await waitForApp(page);
  await takeScreenshot(page, "19-rest-detail-after-complete");
  console.log(`  Resume CTA after rest: ${await page.locator('[data-action="apd-resume"]').textContent()}`);

  await click(page.locator('[data-action="apd-resume"]'));
  await startPlayer(page);
  await takeScreenshot(page, "20-duration-session-active");
  console.log(`  Duration input visible: ${await page.locator('#log-duration').isVisible()}`);
  await finishSingleSetSession(page, { duration: 60 });
  await takeScreenshot(page, "21-duration-ceremony");
  await finishCeremonyAndReflection(page, false, "strong");

  await page.waitForURL(/#\/active-plan\/plan_rest/, { timeout: 5000 });
  await takeScreenshot(page, "22-rest-detail-after-duration");
  const restState = await readActivePlanState(page, "plan_rest");
  console.log(`  Current cycle count after duration flow: ${restState.currentCycleCount}`);
}

async function run() {
  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: HEADED ? 250 : 0,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`Console error: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => errors.push(`Page error: ${err.message}`));
  page.on("requestfailed", (request) => errors.push(`Request failed: ${request.url()}`));

  await seedState(page);
  await runPassFlow(page);
  await runRestartFlow(page);
  await runStayFlow(page);
  await runDemotionFlow(page);
  await runRestAndDurationFlow(page);

  console.log("\n========================================");
  console.log("MILESTONE AUDIT RESULTS");
  console.log("========================================");
  if (errors.length === 0) {
    console.log("No console, page, or request failures detected.");
  } else {
    console.log(`Issues captured (${errors.length}):`);
    errors.forEach((error) => console.log(`  - ${error}`));
  }
  console.log(`Screenshots saved to ${OUT_DIR}`);

  await browser.close();
}

run().catch((error) => {
  console.error("Milestone audit failed:", error);
  process.exit(1);
});
