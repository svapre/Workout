import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/core-loop-audit";
const BLUEPRINT_NAME = "Grounded Strength Path";
const INSTANCE_NAME = "Core Loop / Audit";

mkdirSync(OUT_DIR, { recursive: true });

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function forceClick(locator) {
  await locator.evaluate((element) => element.click());
}

async function isVisible(page, selector) {
  return page.locator(selector).first().isVisible({ timeout: 200 }).catch(() => false);
}

async function readState(page) {
  return page.evaluate(() => ({
    workouts: JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}"),
    activePlans: JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}"),
    plans: JSON.parse(localStorage.getItem("workout-app.plans.v1") || "{}"),
  }));
}

async function resetToFreshInstall(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
}

async function getProgressText(page, planName) {
  const card = page.locator('[data-action="plan-card"]').filter({ hasText: planName }).first();
  await card.waitFor({ state: "visible" });
  return card.locator(".plan-card__adoption-item").nth(1).locator(".plan-card__adoption-value").innerText();
}

async function activateBlueprint(page) {
  await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-action="select-plan"]');

  const card = page.locator(".plan-card").filter({ hasText: BLUEPRINT_NAME }).first();
  assert(await card.count(), `Could not find blueprint card for "${BLUEPRINT_NAME}".`);
  await forceClick(card.locator('[data-action="select-plan"]'));

  await page.waitForSelector('[data-action="start-plan"]');
  await page.screenshot({ path: `${OUT_DIR}/01-blueprint-detail.png`, fullPage: true });

  await forceClick(page.locator('[data-action="start-plan"]'));
  await page.waitForSelector("#modal-prompt-input");
  await page.locator("#modal-prompt-input").fill(INSTANCE_NAME);
  await forceClick(page.locator('[data-action="modal-confirm"]'));
  await page.waitForURL(/#\/active-plans/);

  const state = await readState(page);
  const activePlan = (state.activePlans.active_plans || []).find((plan) => plan.displayName === INSTANCE_NAME);
  assert(activePlan, `Could not find active plan "${INSTANCE_NAME}" after activation.`);

  return activePlan;
}

async function fillVisibleWorkoutInputs(page) {
  const values = [
    ["#log-reps", "10"],
    ["#log-weight", "8"],
    ["#log-duration", "45"],
  ];

  for (const [selector, fallbackValue] of values) {
    const input = page.locator(selector).first();
    if (await input.isVisible({ timeout: 100 }).catch(() => false)) {
      const current = await input.inputValue();
      await input.fill(current && current !== "0" ? current : fallbackValue);
    }
  }
}

async function completeCurrentSession(page, planId) {
  let sawCompleteAction = false;

  for (let step = 0; step < 80; step += 1) {
    const url = page.url();
    if (!url.includes("#/workout-player/")) {
      return { sawCompleteAction };
    }

    if (await isVisible(page, '[data-action="start"]')) {
      await forceClick(page.locator('[data-action="start"]').first());
      await page.waitForTimeout(150);
      continue;
    }

    if (await isVisible(page, '[data-action="continue-rest-instruction"]')) {
      await forceClick(page.locator('[data-action="continue-rest-instruction"]').first());
      await page.waitForTimeout(120);
      continue;
    }

    if (await isVisible(page, '[data-action="complete-rest"]')) {
      await forceClick(page.locator('[data-action="complete-rest"]').first());
      await page.waitForTimeout(150);
      continue;
    }

    if (await isVisible(page, '[data-action="complete"]')) {
      sawCompleteAction = true;
      await fillVisibleWorkoutInputs(page);
      await forceClick(page.locator('[data-action="complete"]').first());
      await page.waitForTimeout(180);
      continue;
    }

    if (await isVisible(page, '[data-action="skip-rest"]')) {
      await forceClick(page.locator('[data-action="skip-rest"]').first());
      await page.waitForTimeout(150);
      continue;
    }

    if (await isVisible(page, '[data-action="skip-reflection"]')) {
      await forceClick(page.locator('[data-action="skip-reflection"]').first());
      await page.waitForTimeout(200);
      continue;
    }

    if (await isVisible(page, '[data-action="continue-current-stage"]')) {
      await forceClick(page.locator('[data-action="continue-current-stage"]').first());
      await page.waitForTimeout(200);
      continue;
    }

    if (await isVisible(page, '[data-action="begin-next-stage"]')) {
      await forceClick(page.locator('[data-action="begin-next-stage"]').first());
      await page.waitForTimeout(200);
      continue;
    }

    if (await isVisible(page, '[data-difficulty="normal"]')) {
      await forceClick(page.locator('[data-difficulty="normal"]').first());
      await page.waitForTimeout(200);
      continue;
    }

    if (await isVisible(page, '[data-action="continue-journey"]')) {
      await forceClick(page.locator('[data-action="continue-journey"]').first());
      await page.waitForTimeout(200);
      continue;
    }

    if (await isVisible(page, '[data-action="resume"]')) {
      await forceClick(page.locator('[data-action="resume"]').first());
      await page.waitForTimeout(120);
      continue;
    }

    if (await isVisible(page, '[data-action="skip"]')) {
      await forceClick(page.locator('[data-action="skip"]').first());
      await page.waitForTimeout(150);
      continue;
    }

    await page.waitForTimeout(180);
  }

  throw new Error(`Workout player did not settle back to the app flow for active plan ${planId}.`);
}

const browser = await chromium.launch({ headless: false, slowMo: 150 });
const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  acceptDownloads: true,
});
const page = await context.newPage();

page.on("console", (message) => {
  if (message.type() === "error") {
    console.error(`[console.${message.type()}] ${message.text()}`);
  }
});

try {
  await resetToFreshInstall(page);

  const starterState = await readState(page);
  assert((starterState.plans.plan_blueprints || []).length > 0, "Starter blueprints did not seed after reset.");

  const activePlan = await activateBlueprint(page);

  await page.screenshot({ path: `${OUT_DIR}/02-active-plans-after-create.png`, fullPage: true });
  const initialProgressText = await getProgressText(page, INSTANCE_NAME);

  const planCard = page.locator('[data-action="plan-card"]').filter({ hasText: INSTANCE_NAME }).first();
  await forceClick(planCard);
  await page.waitForURL(new RegExp(`#\\/active-plan\\/${activePlan.id}`));
  await page.screenshot({ path: `${OUT_DIR}/03-active-plan-detail-before-session.png`, fullPage: true });

  assert(await isVisible(page, '[data-action="apd-primary"]'), "Active plan detail did not show the primary start action.");
  await forceClick(page.locator('[data-action="apd-primary"]').first());
  await page.waitForURL(new RegExp(`#\\/workout-player\\/${activePlan.id}`));
  await page.screenshot({ path: `${OUT_DIR}/04-player-pre-start.png`, fullPage: true });

  const sessionResult = await completeCurrentSession(page, activePlan.id);
  assert(sessionResult.sawCompleteAction, "The workout player never reached a logged set completion step.");

  if (!page.url().includes(`#/active-plan/${activePlan.id}`)) {
    await page.goto(`${BASE}/#/active-plan/${activePlan.id}`, { waitUntil: "networkidle" });
  }

  await page.screenshot({ path: `${OUT_DIR}/05-active-plan-detail-after-session.png`, fullPage: true });

  const stateAfterSession = await readState(page);
  const loggedSessions = stateAfterSession.workouts.workouts || [];
  assert(loggedSessions.length >= 1, "No workout session was persisted after finishing the routine.");
  assert(
    loggedSessions.some((workout) => workout.activePlanId === activePlan.id),
    "The completed session was not tied to the activated plan.",
  );

  const recentSessionButton = page.locator('[data-action="apd-session"]').first();
  assert(await recentSessionButton.isVisible({ timeout: 2000 }).catch(() => false), "Recent sessions did not update on the active plan detail screen.");

  await page.goto(`${BASE}/#/active-plans`, { waitUntil: "networkidle" });
  const updatedProgressText = await getProgressText(page, INSTANCE_NAME);
  assert(
    updatedProgressText !== initialProgressText,
    `Plan progress did not change after completing a session. Before: "${initialProgressText}". After: "${updatedProgressText}".`,
  );
  await page.screenshot({ path: `${OUT_DIR}/06-active-plans-after-session.png`, fullPage: true });

  await page.goto(`${BASE}/#/active-plan/${activePlan.id}`, { waitUntil: "networkidle" });
  await forceClick(page.locator('[data-action="apd-history"]').first());
  await page.waitForURL(/#\/workouts/);
  await page.screenshot({ path: `${OUT_DIR}/07-history.png`, fullPage: true });

  assert(
    await page.locator('[data-action="select-history-plan"]').filter({ hasText: INSTANCE_NAME }).first().isVisible({ timeout: 2000 }).catch(() => false),
    "Workout history did not list the activated plan after a completed session.",
  );
  assert(
    await page.locator('[data-action="select-workout"]').first().isVisible({ timeout: 2000 }).catch(() => false),
    "Workout history did not show any recorded session entries after a completed session.",
  );

  console.log("Core loop audit passed.");
  console.log(`Screenshots: ${OUT_DIR}`);
} finally {
  await context.close();
  await browser.close();
}
