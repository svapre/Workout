import { mkdirSync } from "fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/execution-stress-audit";

mkdirSync(OUT_DIR, { recursive: true });

async function forceClick(locator) {
  await locator.evaluate((element) => element.click());
}

async function getActivePlanId(page, displayName) {
  return page.evaluate((targetDisplayName) => {
    const active = JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}");
    return (active.active_plans || []).find((plan) => plan.displayName === targetDisplayName)?.id || "";
  }, displayName);
}

async function waitForActivePlanId(page, displayName) {
  await page.waitForFunction((targetDisplayName) => {
    const active = JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}");
    return Boolean((active.active_plans || []).find((plan) => plan.displayName === targetDisplayName)?.id);
  }, displayName);
  return getActivePlanId(page, displayName);
}

async function injectStressContent(page) {
  await page.evaluate(() => {
    const routineStore = JSON.parse(localStorage.getItem("workout-app.state.v1") || "{}");
    const planStore = JSON.parse(localStorage.getItem("workout-app.plans.v1") || "{}");
    const timestamp = new Date().toISOString();

    const stressRoutine = {
      id: "rt_execution_stress",
      name: "Execution Stress Routine",
      description:
        "A deliberate stress test for routine-as-player-script behavior across variable load, side changes, timed holds, and between-activity resets.",
      notes:
        "Audit routine: the player should be able to run this without the user having to infer side order, timing, or the next step.",
      difficultyScore: 6,
      createdAt: timestamp,
      updatedAt: timestamp,
      isCustom: true,
      entries: [
        {
          id: "entry_split_squat_stress",
          exerciseId: "ex_split_squat",
          order: 1,
          sets: 3,
          reps: null,
          durationSeconds: null,
          weight: null,
          resistance: null,
          restSeconds: 30,
          transitionAfterSeconds: 20,
          transitionLabel: "Walk to floor for Bird Dog",
          notes: "",
          entryBlocks: [
            { type: "work", label: "Left round 1", metricType: "reps", side: "left", reps: 12, weight: 8 },
            { type: "switch_side", label: "Switch to right side", side: "right" },
            { type: "work", label: "Right round 1", metricType: "reps", side: "right", reps: 12, weight: 8 },
            { type: "rest", label: "Reset", seconds: 30 },
            { type: "work", label: "Left round 2", metricType: "reps", side: "left", reps: 10, weight: 10 },
            { type: "switch_side", label: "Switch to right side", side: "right" },
            { type: "work", label: "Right round 2", metricType: "reps", side: "right", reps: 10, weight: 10 },
            { type: "rest", label: "Reset", seconds: 30 },
            { type: "work", label: "Left round 3", metricType: "reps", side: "left", reps: 8, weight: 12 },
            { type: "switch_side", label: "Switch to right side", side: "right" },
            { type: "work", label: "Right round 3", metricType: "reps", side: "right", reps: 8, weight: 12 },
          ],
        },
        {
          id: "entry_bird_dog_stress",
          exerciseId: "ex_bird_dog",
          order: 2,
          sets: 1,
          reps: null,
          durationSeconds: null,
          weight: null,
          resistance: null,
          restSeconds: 20,
          transitionAfterSeconds: 30,
          transitionLabel: "Stand up for Band Row",
          notes: "",
          entryBlocks: [
            { type: "work", label: "Left reach", metricType: "reps", side: "left", reps: 6, holdSeconds: 2 },
            { type: "switch_side", label: "Switch to right reach", side: "right" },
            { type: "work", label: "Right reach", metricType: "reps", side: "right", reps: 6, holdSeconds: 2 },
            { type: "rest", label: "Reset", seconds: 20 },
            {
              type: "work",
              label: "Alternating pattern",
              metricType: "duration",
              side: "alternating",
              durationSeconds: 6,
              holdSeconds: 2,
              tempoMode: "cadence",
              tempoSecondsPerRep: 4,
              tempoLabel: "Slow control",
            },
          ],
        },
        {
          id: "entry_band_row_stress",
          exerciseId: "ex_band_row",
          order: 3,
          sets: 3,
          reps: null,
          durationSeconds: null,
          weight: null,
          resistance: null,
          restSeconds: 20,
          transitionAfterSeconds: 15,
          transitionLabel: "Set up at the wall",
          notes: "",
          entryBlocks: [
            { type: "work", label: "Set 1", metricType: "reps", reps: 12, resistance: "Light" },
            { type: "rest", label: "Reset", seconds: 20 },
            {
              type: "work",
              label: "Set 2",
              metricType: "reps",
              reps: 10,
              resistance: "Medium",
              tempoMode: "phased",
              tempoDownSeconds: 3,
              tempoUpSeconds: 1,
            },
            { type: "rest", label: "Reset", seconds: 20 },
            { type: "work", label: "Set 3", metricType: "reps", reps: 8, resistance: "Heavy" },
          ],
        },
        {
          id: "entry_wall_sit_stress",
          exerciseId: "ex_wall_sit",
          order: 4,
          sets: 2,
          reps: null,
          durationSeconds: null,
          weight: null,
          resistance: null,
          restSeconds: 30,
          transitionAfterSeconds: 0,
          transitionLabel: "",
          notes: "",
          entryBlocks: [
            { type: "work", label: "Hold 1", metricType: "duration", side: "both", durationSeconds: 6, tempoLabel: "Steady breath" },
            { type: "rest", label: "Reset", seconds: 30 },
            { type: "work", label: "Hold 2", metricType: "duration", side: "both", durationSeconds: 4, tempoLabel: "Ribs stacked" },
          ],
        },
      ],
    };

    const stressPlan = {
      id: "plan_execution_stress",
      version: "1.0",
      name: "Execution Stress Blueprint",
      description:
        "A one-stage blueprint used to stress-test the routine as executable source of truth for the player.",
      goal: "Verify that the routine communicates side order, timing, load changes, and transitions without hidden assumptions.",
      theme: { color: "#F6AD55", icon: "EX", code: "EXEC" },
      createdAt: timestamp,
      stages: [
        {
          id: "stg_execution_stress",
          name: "Stage 1: Execution Stress",
          guidance:
            "Run the stress routine exactly as authored and inspect whether every screen transition and block meaning feels explicit.",
          predecessorStageId: null,
          transitionRule: "prompt_user",
          schedule: [{ type: "routine", routineId: "rt_execution_stress" }],
          milestone: {
            type: "sessions",
            target: 1,
            description: "One fully guided session is enough for this audit stage.",
          },
        },
      ],
    };

    const parameterRoutine = {
      id: "rt_parameter_extremes",
      name: "Parameter Extremes Routine",
      description:
        "Focused stress routine for one maxed-out execution block and one minimal single-metric block.",
      notes:
        "Use this to verify whether dense execution metadata stays readable and whether minimal blocks remain simple.",
      difficultyScore: 5,
      createdAt: timestamp,
      updatedAt: timestamp,
      isCustom: true,
      entries: [
        {
          id: "entry_precision_split_squat_extreme",
          exerciseId: "ex_split_squat",
          order: 1,
          sets: 1,
          reps: null,
          durationSeconds: null,
          weight: null,
          resistance: null,
          restSeconds: 20,
          transitionAfterSeconds: 10,
          transitionLabel: "Reset before quiet wall sit",
          notes: "",
          entryBlocks: [
            {
              type: "work",
              label: "Left precision",
              metricType: "reps",
              side: "left",
              reps: 6,
              repTargetMode: "minimum_plus",
              weight: 14,
              holdSeconds: 2,
              tempoMode: "phased",
              tempoDownSeconds: 3,
              tempoBottomHoldSeconds: 1,
              tempoUpSeconds: 1,
              tempoTopHoldSeconds: 1,
              tempoLabel: "Controlled",
              notes: "Stay braced and keep the front foot heavy.",
            },
            {
              type: "switch_side",
              label: "Switch to right side",
              side: "right",
            },
            {
              type: "work",
              label: "Right precision",
              metricType: "reps",
              side: "right",
              reps: 6,
              repTargetMode: "minimum_plus",
              weight: 14,
              holdSeconds: 2,
              tempoMode: "phased",
              tempoDownSeconds: 3,
              tempoBottomHoldSeconds: 1,
              tempoUpSeconds: 1,
              tempoTopHoldSeconds: 1,
              tempoLabel: "Controlled",
              notes: "Stay braced and keep the front foot heavy.",
            },
            { type: "rest", label: "Reset", seconds: 20 },
          ],
        },
        {
          id: "entry_quiet_wall_sit_extreme",
          exerciseId: "ex_wall_sit",
          order: 2,
          sets: 1,
          reps: null,
          durationSeconds: null,
          weight: null,
          resistance: null,
          restSeconds: 0,
          transitionAfterSeconds: 0,
          transitionLabel: "",
          notes: "",
          entryBlocks: [
            {
              type: "work",
              label: "Quiet hold",
              metricType: "duration",
              durationSeconds: 5,
            },
          ],
        },
      ],
    };

    const parameterPlan = {
      id: "plan_parameter_extremes",
      version: "1.0",
      name: "Parameter Extremes Blueprint",
      description:
        "A compact audit plan that isolates max-density and minimum-density execution blocks.",
      goal: "Verify the player and routine detail stay clear at both extremes of the execution contract.",
      theme: { color: "#4FD1C5", icon: "PX", code: "PX" },
      createdAt: timestamp,
      stages: [
        {
          id: "stg_parameter_extremes",
          name: "Stage 1: Parameter Extremes",
          guidance:
            "Check whether all surfaced parameters stay readable on the max block and whether the minimal block feels appropriately lightweight.",
          predecessorStageId: null,
          transitionRule: "prompt_user",
          schedule: [{ type: "routine", routineId: "rt_parameter_extremes" }],
          milestone: {
            type: "sessions",
            target: 1,
            description: "One run is enough for this focused parameter audit stage.",
          },
        },
      ],
    };

    const existingRoutines = Array.isArray(routineStore.routines) ? routineStore.routines : [];
    const existingPlans = Array.isArray(planStore.plan_blueprints) ? planStore.plan_blueprints : [];

    routineStore.routines = [
      ...existingRoutines.filter((routine) => routine.id !== stressRoutine.id && routine.id !== parameterRoutine.id),
      stressRoutine,
      parameterRoutine,
    ];
    planStore.plan_blueprints = [
      ...existingPlans.filter((plan) => plan.id !== stressPlan.id && plan.id !== parameterPlan.id),
      stressPlan,
      parameterPlan,
    ];

    localStorage.setItem("workout-app.state.v1", JSON.stringify(routineStore));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify(planStore));
  });
}

async function screenshot(page, name, { fullPage = false } = {}) {
  await page.screenshot({ path: `${OUT_DIR}/${name}`, fullPage });
}

async function clickAndWait(page, locator, waitMs = 240) {
  await forceClick(locator);
  await page.waitForTimeout(waitMs);
}

async function clickCompleteIfVisible(page) {
  const complete = page.locator('[data-action="complete"]').first();
  await clickAndWait(page, complete);
}

async function clickContinueInstructionIfVisible(page) {
  const button = page.locator('[data-action="continue-rest-instruction"]').first();
  await clickAndWait(page, button);
}

async function clickSkipRestIfVisible(page) {
  const button = page.locator('[data-action="skip-rest"]').first();
  await clickAndWait(page, button);
}

const browser = await chromium.launch({ headless: false, slowMo: 120 });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(message.text());
  }
});
page.on("pageerror", (error) => {
  errors.push(error.message);
});

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await injectStressContent(page);
await page.reload({ waitUntil: "networkidle" });

await page.goto(`${BASE}/#/routine/rt_execution_stress`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Execution Stress Routine");
await screenshot(page, "01-routine-detail-desktop.png", { fullPage: true });

await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
const stressPlanCard = page.locator(".plan-card").filter({ hasText: "Execution Stress Blueprint" }).first();
await forceClick(stressPlanCard.locator('[data-action="select-plan"]'));
await page.waitForSelector('[data-action="start-plan"]');
await screenshot(page, "02-blueprint-detail-desktop.png", { fullPage: true });

await forceClick(page.locator('[data-action="start-plan"]'));
await page.waitForSelector("#modal-prompt-input");
await page.locator("#modal-prompt-input").fill("Execution Stress Audit");
await forceClick(page.locator('[data-action="modal-confirm"]'));
const activePlanId = await waitForActivePlanId(page, "Execution Stress Audit");
assert.ok(activePlanId, "Expected the execution stress plan to activate.");

await page.goto(`${BASE}/#/active-plan/${activePlanId}`, { waitUntil: "networkidle" });
await screenshot(page, "03-active-plan-detail-desktop.png", { fullPage: true });

await page.setViewportSize({ width: 430, height: 932 });
await page.goto(`${BASE}/#/active-plan/${activePlanId}`, { waitUntil: "networkidle" });

await forceClick(page.locator('[data-action="apd-primary"], [data-action="apd-resume"]').first());
await page.waitForURL(/#\/workout-player\//);
await screenshot(page, "04-player-pre-workout-phone.png");

await clickAndWait(page, page.locator('[data-action="start"]').first(), 300);
await page.waitForSelector("text=Split Squat");
await page.waitForSelector("text=Left round 1");
await page.waitForSelector("text=Round 1 of 3");
await screenshot(page, "05-player-split-squat-left-1-phone.png");

await clickCompleteIfVisible(page);
await page.waitForSelector("text=Instruction");
await page.waitForSelector("text=Switch to right side");
await page.waitForSelector("text=Resume with Split Squat · Right round 1");
await page.waitForSelector("text=Round 1 of 3");
await screenshot(page, "06-player-switch-right-phone.png");

await clickContinueInstructionIfVisible(page);
await page.waitForSelector("text=Right round 1");
await screenshot(page, "07-player-split-squat-right-1-phone.png");

await clickCompleteIfVisible(page);
await page.waitForSelector("text=Set Rest");
await page.waitForSelector("text=Left round 2");
await page.waitForSelector("text=Round 2 of 3");
await screenshot(page, "08-player-set-rest-phone.png");

await clickSkipRestIfVisible(page);
await page.waitForSelector("text=Left round 2");
await screenshot(page, "09-player-split-squat-left-2-phone.png");

await clickCompleteIfVisible(page);
await page.waitForSelector("text=Switch to right side");
await clickContinueInstructionIfVisible(page);
await page.waitForSelector("text=Right round 2");
await clickCompleteIfVisible(page);
await page.waitForSelector("text=Set Rest");
await clickSkipRestIfVisible(page);

await page.waitForSelector("text=Left round 3");
await clickCompleteIfVisible(page);
await page.waitForSelector("text=Switch to right side");
await clickContinueInstructionIfVisible(page);
await page.waitForSelector("text=Right round 3");
await clickCompleteIfVisible(page);
await page.waitForSelector("text=Transition");
await screenshot(page, "10-player-transition-to-bird-dog-phone.png");

await clickSkipRestIfVisible(page);
await page.waitForSelector("text=Bird Dog");
await page.waitForSelector("text=Left reach");
await page.waitForSelector("text=Step 1 of 3");
await screenshot(page, "11-player-bird-dog-left-reach-phone.png");

await clickCompleteIfVisible(page);
await page.waitForSelector("text=Switch to right reach");
await screenshot(page, "12-player-bird-dog-switch-right-phone.png");

await clickContinueInstructionIfVisible(page);
await page.waitForSelector("text=Right reach");
await clickCompleteIfVisible(page);
await page.waitForSelector("text=Set Rest");
await clickSkipRestIfVisible(page);

await page.waitForSelector("text=Alternating pattern");
await page.waitForSelector("text=Step 3 of 3");
await page.waitForSelector('[data-role="timed-work"]');
await screenshot(page, "13-player-bird-dog-alternating-duration-phone.png");

assert.equal(await page.locator("#log-reps").count(), 0, "Expected the alternating timed block to avoid a reps input.");
assert.equal(await page.locator("#work-timer").count(), 1, "Expected the alternating timed block to show a live work timer.");
assert.equal(await page.locator("#log-duration").count(), 0, "Expected the alternating timed block to auto-run instead of showing a manual duration input.");
assert.ok(await page.locator("text=Alternating pattern").count(), "Expected the alternating Bird Dog block to appear.");

await page.waitForSelector("text=Transition");
await page.waitForSelector("text=Band Row");
await screenshot(page, "14-player-auto-transition-after-timed-work-phone.png");

await forceClick(page.locator('[data-action="exit"]').first());
await page.waitForSelector('[data-action="modal-confirm"]');
await forceClick(page.locator('[data-action="modal-confirm"]').first());
await page.waitForURL(/#\/active-plans/);

await page.goto(`${BASE}/#/routine/rt_parameter_extremes`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Parameter Extremes Routine");
await screenshot(page, "15-parameter-extremes-routine-phone.png", { fullPage: true });

await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
const parameterPlanCard = page.locator(".plan-card").filter({ hasText: "Parameter Extremes Blueprint" }).first();
await forceClick(parameterPlanCard.locator('[data-action="select-plan"]'));
await page.waitForSelector('[data-action="start-plan"]');
await screenshot(page, "16-parameter-blueprint-detail-phone.png", { fullPage: true });

await forceClick(page.locator('[data-action="start-plan"]'));
await page.waitForSelector("#modal-prompt-input");
await page.locator("#modal-prompt-input").fill("Parameter Extremes Audit");
await forceClick(page.locator('[data-action="modal-confirm"]'));
const parameterActivePlanId = await waitForActivePlanId(page, "Parameter Extremes Audit");
assert.ok(parameterActivePlanId, "Expected the parameter extremes plan to activate.");

await page.goto(`${BASE}/#/active-plan/${parameterActivePlanId}`, { waitUntil: "networkidle" });
await forceClick(page.locator('[data-action="apd-primary"], [data-action="apd-resume"]').first());
await page.waitForURL(/#\/workout-player\//);
await clickAndWait(page, page.locator('[data-action="start"]').first(), 300);

await page.waitForSelector("text=Split Squat");
await page.waitForSelector("text=Left precision");
await page.waitForSelector("text=Down 3s");
await page.waitForSelector("text=2s / rep");
await screenshot(page, "17-player-max-params-left-phone.png");

assert.equal(await page.locator("#log-reps").count(), 1, "Expected the max-parameter work block to collect reps.");
assert.equal(await page.locator("#log-weight").count(), 1, "Expected the max-parameter work block to collect weight.");
assert.equal(await page.locator("#log-duration").count(), 0, "Expected the max-parameter work block to avoid a duration input.");

await clickCompleteIfVisible(page);
await page.waitForSelector("text=Switch to right side");
await clickContinueInstructionIfVisible(page);

await page.waitForSelector("text=Right precision");
await screenshot(page, "18-player-max-params-right-phone.png");
await clickCompleteIfVisible(page);

await page.waitForSelector("text=Set Rest");
await page.waitForSelector("text=Transition");
await page.waitForSelector("text=10s to Wall Sit");
await screenshot(page, "19-player-max-params-rest-phone.png");
await clickSkipRestIfVisible(page);

await page.waitForSelector("text=Transition");
await page.waitForSelector("text=Wall Sit");
await clickSkipRestIfVisible(page);

await page.waitForSelector("text=Wall Sit");
await page.waitForSelector("text=Quiet hold");
await page.waitForSelector('[data-role="timed-work"]');
await screenshot(page, "20-player-minimal-duration-phone.png");

assert.equal(await page.locator("#log-reps").count(), 0, "Expected the minimal duration block to avoid a reps input.");
assert.equal(await page.locator("#log-weight").count(), 0, "Expected the minimal duration block to avoid a weight input.");
assert.equal(await page.locator("#log-duration").count(), 0, "Expected the minimal duration block to auto-run instead of showing a manual duration input.");
assert.equal(await page.locator("#work-timer").count(), 1, "Expected the minimal duration block to show the work timer.");

const smallContext = await browser.newContext({
  viewport: { width: 320, height: 568 },
  storageState: await context.storageState(),
  acceptDownloads: true,
});
const smallPage = await smallContext.newPage();
await smallPage.goto(`${BASE}/#/active-plan/${parameterActivePlanId}`, { waitUntil: "networkidle" });
await forceClick(smallPage.locator('[data-action="apd-primary"], [data-action="apd-resume"]').first());
await smallPage.waitForURL(/#\/workout-player\//);
await clickAndWait(smallPage, smallPage.locator('[data-action="start"]').first(), 300);
await smallPage.waitForSelector("text=Split Squat");
await smallPage.waitForSelector("text=Left precision");
await screenshot(smallPage, "21-player-max-params-320-phone.png");

const compactViewportHeight = smallPage.viewportSize()?.height ?? 568;
const compactRepsBox = await smallPage.locator("#log-reps").boundingBox();
const compactWeightBox = await smallPage.locator("#log-weight").boundingBox();
const compactCompleteBox = await smallPage.locator('[data-action="complete"]').boundingBox();

assert.ok(compactRepsBox && compactRepsBox.y + compactRepsBox.height <= compactViewportHeight, "Expected Actual reps to stay above the fold at 320px width.");
assert.ok(compactWeightBox && compactWeightBox.y + compactWeightBox.height <= compactViewportHeight, "Expected Weight to stay above the fold at 320px width.");
assert.ok(compactCompleteBox && compactCompleteBox.y + compactCompleteBox.height <= compactViewportHeight, "Expected the complete CTA to stay above the fold at 320px width.");

await smallContext.close();

if (errors.length) {
  throw new Error(`Console/page errors detected during execution stress audit: ${errors.join(" | ")}`);
}

await browser.close();
console.log(`execution stress audit passed. Screenshots: ${OUT_DIR}`);
