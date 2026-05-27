import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/basic-ready-audit";
const EXPECTED_BLUEPRINTS = [
  "Grounded Strength Path",
  "Steady Balance Flow",
  "Posture Rebuild Path",
  "Ten-Stage Attention Training",
];

mkdirSync(OUT_DIR, { recursive: true });

async function forceClick(locator) {
  await locator.evaluate((element) => element.click());
}

async function readState(page) {
  return page.evaluate(() => ({
    meta: JSON.parse(localStorage.getItem("workout-app.meta.v1") || "{}"),
    bodyMap: JSON.parse(localStorage.getItem("workout-app.bodymap.v1") || "{}"),
    exercises: JSON.parse(localStorage.getItem("workout-app.exercises.v1") || "{}"),
    routines: JSON.parse(localStorage.getItem("workout-app.state.v1") || "{}"),
    workouts: JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}"),
    activePlans: JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}"),
    plans: JSON.parse(localStorage.getItem("workout-app.plans.v1") || "{}"),
    archivedPlans: JSON.parse(localStorage.getItem("workout-app.archivedPlans.v1") || "[]"),
  }));
}

async function resetToFreshInstall(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
}

async function activateBlueprint(page, blueprintName, instanceName) {
  await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
  const card = page.locator(".plan-card").filter({ hasText: blueprintName }).first();
  await forceClick(card.locator('[data-action="select-plan"]'));
  await page.waitForSelector('[data-action="start-plan"]');
  await forceClick(page.locator('[data-action="start-plan"]'));
  await page.waitForSelector("#modal-prompt-input");
  await page.locator("#modal-prompt-input").fill(instanceName);
  await forceClick(page.locator('[data-action="modal-confirm"]'));
  await page.waitForURL(/#\/active-plans/);

  const state = await readState(page);
  const activePlan = (state.activePlans.active_plans || []).find((plan) => plan.displayName === instanceName);
  if (!activePlan) {
    throw new Error(`Could not find active plan "${instanceName}" after activating "${blueprintName}".`);
  }
  return activePlan;
}

async function runSessionForPlan(page, planId, screenshotName) {
  await page.goto(`${BASE}/#/active-plan/${planId}`, { waitUntil: "networkidle" });
  await forceClick(page.locator('[data-action="apd-resume"]'));
  await page.waitForURL(new RegExp(`#\\/workout-player\\/${planId}`));

  const startButton = page.locator('[data-action="start"]');
  if (await startButton.isVisible({ timeout: 1500 }).catch(() => false)) {
    await forceClick(startButton);
  }

  for (let i = 0; i < 32; i += 1) {
    const action = await page.evaluate(() => {
      if (document.querySelector('[data-action="continue-journey"]')) return "continue";
      if (document.querySelector('[data-difficulty="normal"]')) return "difficulty";
      if (document.querySelector('[data-action="skip-rest"]')) return "rest";
      if (document.querySelector('[data-action="complete"]')) return "complete";
      return "none";
    });

    if (action === "continue") {
      await forceClick(page.locator('[data-action="continue-journey"]'));
      await page.waitForTimeout(150);
      continue;
    }

    if (action === "difficulty") {
      await forceClick(page.locator('[data-difficulty="normal"]'));
      break;
    }

    if (action === "rest") {
      await forceClick(page.locator('[data-action="skip-rest"]'));
      await page.waitForTimeout(120);
      continue;
    }

    if (action === "complete") {
      const repsInput = page.locator("#log-reps");
      if (await repsInput.isVisible({ timeout: 250 }).catch(() => false)) {
        const current = await repsInput.inputValue();
        await repsInput.fill(current && current !== "0" ? current : "10");
      }
      const durationInput = page.locator("#log-duration");
      if (await durationInput.isVisible({ timeout: 250 }).catch(() => false)) {
        const current = await durationInput.inputValue();
        await durationInput.fill(current && current !== "0" ? current : "45");
      }
      await forceClick(page.locator('[data-action="complete"]'));
      await page.waitForTimeout(120);
      continue;
    }

    await page.waitForTimeout(180);
  }

  await page.waitForURL(new RegExp(`#\\/active-plan\\/${planId}`));
  await page.screenshot({ path: `${OUT_DIR}/${screenshotName}.png`, fullPage: true });
}

const browser = await chromium.launch({ headless: false, slowMo: 140 });
const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
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

await resetToFreshInstall(page);
await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT_DIR}/01-starter-blueprints.png`, fullPage: true });

if (await page.locator('[data-action="restore-starter-content"]').count()) {
  throw new Error("Plans screen still exposes a separate starter-content button.");
}

let state = await readState(page);
const starterExercises = state.exercises.exercises || [];
const starterRoutines = state.routines.routines || [];
const starterPlans = state.plans.plan_blueprints || [];

if (starterExercises.length < 29) {
  throw new Error(`Expected at least 29 starter exercises, found ${starterExercises.length}.`);
}
if (starterRoutines.length < 19) {
  throw new Error(`Expected at least 19 starter routines, found ${starterRoutines.length}.`);
}
if (starterPlans.length !== 4) {
  throw new Error(`Expected 4 starter blueprints, found ${starterPlans.length}.`);
}
for (const blueprintName of EXPECTED_BLUEPRINTS) {
  if (!starterPlans.some((plan) => plan.name === blueprintName)) {
    throw new Error(`Missing starter blueprint "${blueprintName}".`);
  }
}
if ((state.workouts.workouts || []).length !== 0) {
  throw new Error("Fresh starter install should not seed fake workout history anymore.");
}

await forceClick(page.locator(".plan-card").filter({ hasText: "Ten-Stage Attention Training" }).first().locator('[data-action="select-plan"]'));
await page.waitForSelector("text=Stage map");
await page.screenshot({ path: `${OUT_DIR}/01b-ten-stage-blueprint-detail.png`, fullPage: true });
if ((await page.locator("h3").filter({ hasText: "Stage 10: Carry Stability Forward" }).count()) < 1) {
  throw new Error("Ten-stage meditation blueprint detail did not show the full stage ladder.");
}
await forceClick(page.locator("summary").filter({ hasText: "Stage 5: Sharpen Clarity" }).first());
if (!(await page.locator("text=The stage asks for more vivid, less foggy attention").isVisible())) {
  throw new Error("Blueprint stage chapters did not expose the detailed stage guidance.");
}
await forceClick(page.locator('[data-action="back-to-list"]'));
await page.waitForURL(/#\/plans/);

await page.evaluate(() => {
  const exercises = JSON.parse(localStorage.getItem("workout-app.exercises.v1") || "{}");
  exercises.exercises = (exercises.exercises || []).filter((exercise) => exercise.id !== "ex_open_awareness_sit");
  localStorage.setItem("workout-app.exercises.v1", JSON.stringify(exercises));

  const routines = JSON.parse(localStorage.getItem("workout-app.state.v1") || "{}");
  routines.routines = (routines.routines || []).filter((routine) => routine.id !== "rt_attention_equanimity");
  localStorage.setItem("workout-app.state.v1", JSON.stringify(routines));

  const plans = JSON.parse(localStorage.getItem("workout-app.plans.v1") || "{}");
  plans.plan_blueprints = (plans.plan_blueprints || []).filter((plan) => plan.id !== "plan_ten_stage_attention_training");
  localStorage.setItem("workout-app.plans.v1", JSON.stringify(plans));

  const meta = JSON.parse(localStorage.getItem("workout-app.meta.v1") || "{}");
  meta.starterContentVersion = "outdated";
  localStorage.setItem("workout-app.meta.v1", JSON.stringify(meta));
});
state = await readState(page);
if (
  (state.exercises.exercises || []).length !== starterExercises.length - 1 ||
  (state.routines.routines || []).length !== starterRoutines.length - 1 ||
  (state.plans.plan_blueprints || []).length !== starterPlans.length - 1
) {
  throw new Error("Starter-content removal setup for the restore test did not take effect.");
}

await page.reload({ waitUntil: "networkidle" });

await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT_DIR}/02-restored-starter-content.png`, fullPage: true });

state = await readState(page);
const restoredExercises = state.exercises.exercises || [];
const restoredRoutines = state.routines.routines || [];
const restoredPlans = state.plans.plan_blueprints || [];
if (
  restoredExercises.length !== starterExercises.length ||
  restoredRoutines.length !== starterRoutines.length ||
  restoredPlans.length !== starterPlans.length
) {
  throw new Error("Versioned starter-content sync did not restore the missing starter items.");
}
if (new Set(restoredExercises.map((item) => item.id)).size !== restoredExercises.length) {
  throw new Error("Starter-content sync duplicated starter exercises.");
}
if (new Set(restoredRoutines.map((item) => item.id)).size !== restoredRoutines.length) {
  throw new Error("Starter-content sync duplicated starter routines.");
}
if (new Set(restoredPlans.map((item) => item.id)).size !== restoredPlans.length) {
  throw new Error("Starter-content sync duplicated starter blueprints.");
}
for (const blueprintName of EXPECTED_BLUEPRINTS) {
  if (!restoredPlans.some((plan) => plan.name === blueprintName)) {
    throw new Error(`Starter-content restore did not preserve "${blueprintName}".`);
  }
}

const physicalPlan = await activateBlueprint(page, "Grounded Strength Path", "Strength Path / Audit");
const yogaPlan = await activateBlueprint(page, "Steady Balance Flow", "Balance Flow / Audit");
const rehabPlan = await activateBlueprint(page, "Posture Rebuild Path", "Posture Path / Audit");
const meditationPlan = await activateBlueprint(page, "Ten-Stage Attention Training", "Attention Ladder / Audit");

await runSessionForPlan(page, physicalPlan.id, "03-physical-session");
await runSessionForPlan(page, yogaPlan.id, "04-yoga-session");
await runSessionForPlan(page, rehabPlan.id, "05-rehab-session");
await runSessionForPlan(page, meditationPlan.id, "06-meditation-session");

await page.goto(`${BASE}/#/active-plan/${meditationPlan.id}`, { waitUntil: "networkidle" });
await forceClick(page.locator("summary").filter({ hasText: "Stage 5: Sharpen Clarity" }).first());
await page.screenshot({ path: `${OUT_DIR}/06b-meditation-stage-guide.png`, fullPage: true });
if ((await page.locator("text=Equipment: Chair / Cushion").count()) < 1) {
  throw new Error("Active-plan stage chapters did not surface stage equipment guidance.");
}

state = await readState(page);
if ((state.workouts.workouts || []).length < 4) {
  throw new Error("Expected at least four logged sessions after running the starter plans.");
}

await page.goto(`${BASE}/#/active-plan/${yogaPlan.id}`, { waitUntil: "networkidle" });
await forceClick(page.locator('[data-action="apd-history"]'));
await page.waitForURL(/#\/workouts/);
await page.screenshot({ path: `${OUT_DIR}/07-yoga-history-link.png`, fullPage: true });
await page.locator('[data-action="select-history-plan"][data-plan-id="' + yogaPlan.id + '"]').waitFor({ state: "attached" });

await page.goto(`${BASE}/#/active-plan/${physicalPlan.id}`, { waitUntil: "networkidle" });
await forceClick(page.locator('[data-action="apd-archive"]'));
await forceClick(page.locator('[data-action="modal-confirm"]'));
await page.waitForURL(/#\/active-plans/);

await page.goto(`${BASE}/#/active-plan/${meditationPlan.id}`, { waitUntil: "networkidle" });
await forceClick(page.locator('[data-action="apd-remove"]'));
await forceClick(page.locator('[data-action="modal-confirm"]'));
await page.waitForURL(/#\/active-plans/);

state = await readState(page);
const historicalPlans = state.archivedPlans || [];
const archivedSnapshot = historicalPlans.find((plan) => plan.historyStatus === "archived" && (plan.displayName || plan.name) === "Strength Path / Audit");
const removedSnapshot = historicalPlans.find((plan) => plan.historyStatus === "removed" && (plan.displayName || plan.name) === "Attention Ladder / Audit");
if (!archivedSnapshot) {
  throw new Error("Archived plan snapshot was not preserved in history.");
}
if (!removedSnapshot) {
  throw new Error("Removed plan snapshot was not preserved in history.");
}

await page.goto(`${BASE}/#/workouts`, { waitUntil: "networkidle" });
await forceClick(page.locator('[data-action="select-history-plan"][data-plan-id="' + physicalPlan.id + '"]'));
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT_DIR}/08-archived-journey-review.png`, fullPage: true });
const archivedReviewPanel = page
  .locator("section.panel.panel--section")
  .filter({ hasText: "Strength Path / Audit" })
  .filter({ hasText: "Plan snapshot" });
const archivedStatus = await archivedReviewPanel
  .locator(".metric-card")
  .filter({ hasText: "Status" })
  .locator(".metric-card__value")
  .first()
  .textContent();
if (!archivedStatus?.includes("Archived")) {
  throw new Error("Archived journey review did not surface the archived status.");
}
if (!(await archivedReviewPanel.locator("text=Stage history timeline").isVisible())) {
  throw new Error("Journey review is missing the stage-history section.");
}
if (!(await archivedReviewPanel.locator("text=Revision history").isVisible())) {
  throw new Error("Journey review is missing the version-history section.");
}
if (!(await archivedReviewPanel.locator("text=Session timeline").isVisible())) {
  throw new Error("Journey review is missing the session-timeline section.");
}

await forceClick(page.locator('[data-action="select-history-plan"][data-plan-id="' + meditationPlan.id + '"]'));
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT_DIR}/09-removed-journey-review.png`, fullPage: true });
const removedReviewPanel = page
  .locator("section.panel.panel--section")
  .filter({ hasText: "Attention Ladder / Audit" })
  .filter({ hasText: "Plan snapshot" });
const removedStatus = await removedReviewPanel
  .locator(".metric-card")
  .filter({ hasText: "Status" })
  .locator(".metric-card__value")
  .first()
  .textContent();
if (!removedStatus?.includes("Removed")) {
  throw new Error("Removed journey review did not surface the removed status.");
}

if (errors.length) {
  throw new Error(`Console/page errors detected during basic-ready audit: ${errors.join(" | ")}`);
}

console.log(`Basic-ready audit passed. Screenshots: ${OUT_DIR}`);
await browser.close();
