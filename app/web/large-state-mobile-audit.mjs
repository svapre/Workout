import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/large-state-mobile";
const HEADED = process.argv.includes("--headed");

const PLAN_INSTANCES = [
  { blueprint: "Grounded Strength Path", name: "Large State / Strength" },
  { blueprint: "Steady Balance Flow", name: "Large State / Balance" },
  { blueprint: "Posture Rebuild Path", name: "Large State / Posture" },
  { blueprint: "Ten-Stage Attention Training", name: "Large State / Attention" },
];

mkdirSync(OUT_DIR, { recursive: true });

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function forceClick(locator) {
  await locator.evaluate((element) => element.click());
}

async function takeScreenshot(page, name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
  console.log(`  Screenshot: ${name}.png`);
}

async function isVisible(page, selector) {
  return page.locator(selector).first().isVisible({ timeout: 200 }).catch(() => false);
}

async function resetToFreshInstall(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
}

async function readState(page) {
  return page.evaluate(() => ({
    activePlans: JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}").active_plans || [],
    archivedPlans: JSON.parse(localStorage.getItem("workout-app.archivedPlans.v1") || "[]"),
    workouts: JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}").workouts || [],
  }));
}

async function activateBlueprint(page, blueprintName, instanceName) {
  await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-action="select-plan"]');

  const card = page.locator(".plan-card").filter({ hasText: blueprintName }).first();
  assert(await card.count(), `Could not find blueprint card for "${blueprintName}".`);
  await forceClick(card.locator('[data-action="select-plan"]'));

  await page.waitForSelector('[data-action="start-plan"]');
  await forceClick(page.locator('[data-action="start-plan"]'));
  await page.waitForSelector("#modal-prompt-input");
  await page.locator("#modal-prompt-input").fill(instanceName);
  await forceClick(page.locator('[data-action="modal-confirm"]').first());
  await page.waitForURL(/#\/active-plans/);

  const state = await readState(page);
  const activePlan = state.activePlans.find((plan) => plan.displayName === instanceName);
  assert(activePlan, `Could not find active plan "${instanceName}" after activation.`);
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
    if (!page.url().includes("#/workout-player/")) {
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

async function runSessionForPlan(page, planId) {
  await page.goto(`${BASE}/#/active-plan/${planId}`, { waitUntil: "networkidle" });
  await page.locator('[data-action="apd-primary"]').first().waitFor({ state: "visible" });
  await forceClick(page.locator('[data-action="apd-primary"]').first());
  await page.waitForURL(new RegExp(`#\\/workout-player\\/${planId}`));
  const result = await completeCurrentSession(page, planId);
  assert(result.sawCompleteAction, `Plan ${planId} never reached a logged workout step.`);
}

async function openLifecycleDisclosure(page) {
  const disclosure = page.locator("details.journey-advanced.journey-advanced--danger").first();
  await disclosure.waitFor({ state: "visible" });
  const isOpen = await disclosure.evaluate((element) => element.hasAttribute("open"));
  if (!isOpen) {
    await forceClick(disclosure.locator("summary"));
    await page.waitForTimeout(250);
  }
}

async function archivePlan(page, planId) {
  await page.goto(`${BASE}/#/active-plan/${planId}`, { waitUntil: "networkidle" });
  await openLifecycleDisclosure(page);
  await forceClick(page.locator('[data-action="apd-archive"]').first());
  await page.locator('[data-action="modal-confirm"]').first().waitFor({ state: "visible" });
  await forceClick(page.locator('[data-action="modal-confirm"]').first());
  await page.waitForURL(/#\/active-plans/);
}

async function seedExtraHistory(page, planId, count) {
  await page.evaluate(({ targetPlanId, extraCount }) => {
    const workoutStore = JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}");
    const activeStore = JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}");
    const workouts = Array.isArray(workoutStore.workouts) ? workoutStore.workouts : [];
    const plans = Array.isArray(activeStore.active_plans) ? activeStore.active_plans : [];
    const plan = plans.find((entry) => entry.id === targetPlanId);
    if (!plan) {
      return;
    }

    const existingForPlan = workouts.filter((entry) => entry.activePlanId === targetPlanId);
    const template = existingForPlan[existingForPlan.length - 1];
    if (!template) {
      return;
    }

    const nextWorkouts = [...workouts];
    const nextSessionIds = Array.isArray(plan.sessions) ? [...plan.sessions] : [];

    for (let index = 0; index < extraCount; index += 1) {
      const ts = new Date(Date.parse(template.completedAt || template.startedAt || new Date().toISOString()) - (index + 1) * 86400000).toISOString();
      const cloneId = `${template.id}_seed_${index + 1}`;
      nextWorkouts.push({
        ...template,
        id: cloneId,
        startedAt: ts,
        completedAt: ts,
      });
      nextSessionIds.push(cloneId);
    }

    plan.sessions = nextSessionIds;
    plan.lastSessionDate = template.completedAt || template.startedAt || plan.lastSessionDate || null;

    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: nextWorkouts }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: plans }));
  }, { targetPlanId: planId, extraCount: count });
  await page.reload({ waitUntil: "networkidle" });
}

async function run() {
  const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 150 : 0 });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();
  const errors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console:${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`pageerror:${error.message}`);
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.includes("fonts.gstatic.com") || url.includes("fonts.googleapis.com")) {
      return;
    }
    errors.push(`requestfailed:${url}`);
  });

  try {
    console.log("\n=== Large State Mobile Audit ===");
    await resetToFreshInstall(page);

    const plans = [];
    for (const entry of PLAN_INSTANCES) {
      plans.push(await activateBlueprint(page, entry.blueprint, entry.name));
    }

    await runSessionForPlan(page, plans[0].id);
    await runSessionForPlan(page, plans[1].id);
    await seedExtraHistory(page, plans[0].id, 4);
    await seedExtraHistory(page, plans[1].id, 2);
    await archivePlan(page, plans[2].id);

    const state = await readState(page);
    const activePlanA = state.activePlans.find((entry) => entry.id === plans[0].id);
    const activePlanB = state.activePlans.find((entry) => entry.id === plans[1].id);
    const activePlanD = state.activePlans.find((entry) => entry.id === plans[3].id);
    const archivedPlanC = state.archivedPlans.find((entry) => entry.id === plans[2].id);

    assert(state.activePlans.length === 3, `Expected 3 active plans after archiving one, got ${state.activePlans.length}.`);
    assert(activePlanA && activePlanB && activePlanD, "Expected the non-archived plans to remain active in large-state setup.");
    assert(archivedPlanC?.historyStatus === "archived", "Expected the archived plan snapshot to be preserved in large-state setup.");
    assert((activePlanA.sessions || []).length >= 5, `Expected the first large-state plan to carry at least 5 sessions, got ${(activePlanA.sessions || []).length}.`);
    assert((activePlanB.sessions || []).length >= 3, `Expected the second large-state plan to carry at least 3 sessions, got ${(activePlanB.sessions || []).length}.`);

    await page.goto(`${BASE}/#/active-plans`, { waitUntil: "networkidle" });
    await takeScreenshot(page, "01-dashboard-large-state.png");
    const dashboardCards = await page.locator('.plan-card--dashboard, .plan-card').evaluateAll((cards) => cards.length);
    assert(dashboardCards >= 3, `Expected at least 3 dashboard plan cards in large state, got ${dashboardCards}.`);

    await page.goto(`${BASE}/#/active-plan/${plans[1].id}`, { waitUntil: "networkidle" });
    await takeScreenshot(page, "02-active-plan-detail-large-state.png");
    const detailText = await page.locator('body').textContent();
    assert(detailText?.includes(PLAN_INSTANCES[1].name), "Large-state detail view did not open the expected selected plan.");

    await page.goto(`${BASE}/#/workouts`, { waitUntil: "networkidle" });
    await takeScreenshot(page, "03-history-overview-large-state.png");
    const historyButtons = await page.locator('[data-action="select-history-plan"]').count();
    assert(historyButtons >= 5, `Expected at least 5 history plan filters (all + 4 plans), got ${historyButtons}.`);

    await forceClick(page.locator(`[data-action="select-history-plan"][data-plan-id="${plans[2].id}"]`).first());
    await page.waitForTimeout(300);
    await takeScreenshot(page, "04-history-archived-filter-large-state.png");
    const archivedText = await page.locator('body').textContent();
    assert(archivedText?.includes('Archived'), "Large-state archived history filter did not show archived status.");
    assert(archivedText?.includes(PLAN_INSTANCES[2].name), "Large-state archived history filter did not show the archived plan title.");

    await forceClick(page.locator(`[data-action="select-history-plan"][data-plan-id="${plans[0].id}"]`).first());
    await page.waitForTimeout(300);
    await takeScreenshot(page, "05-history-active-filter-large-state.png");
    const activeHistoryText = await page.locator('body').textContent();
    assert(activeHistoryText?.includes(PLAN_INSTANCES[0].name), "Large-state active history filter did not show the selected active plan title.");
    assert(activeHistoryText?.includes('logged sessions'), "Large-state active history filter did not show session summary copy.");

    if (errors.length) {
      throw new Error(`Browser reported errors:\n${errors.join("\n")}`);
    }

    console.log(`Large-state mobile audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
