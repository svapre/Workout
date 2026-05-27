import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/multi-active-plan-isolation";
const BLUEPRINT_NAME = "Grounded Strength Path";
const PLAN_A_NAME = "Isolation Strength A";
const PLAN_B_NAME = "Isolation Strength B";
const PLAN_B_REVISED_NAME = "Isolation Strength B / Revised";
const HEADED = process.argv.includes("--headed");

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

async function takeScreenshot(page, name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
  console.log(`  Screenshot: ${name}.png`);
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

async function activateBlueprint(page, instanceName) {
  await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-action="select-plan"]');

  const card = page.locator(".plan-card").filter({ hasText: BLUEPRINT_NAME }).first();
  assert(await card.count(), `Could not find blueprint card for "${BLUEPRINT_NAME}".`);
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

async function openPlanFromDashboard(page, planId) {
  await page.goto(`${BASE}/#/active-plans`, { waitUntil: "networkidle" });
  await page.locator(`[data-action="open-plan"][data-plan-id="${planId}"]`).first().waitFor({ state: "visible" });
  await forceClick(page.locator(`[data-action="open-plan"][data-plan-id="${planId}"]`).first());
  await page.waitForURL(new RegExp(`#\\/active-plan\\/${planId}`));
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

async function runSessionForPlan(page, plan, screenshotStem) {
  await openPlanFromDashboard(page, plan.id);
  await takeScreenshot(page, `${screenshotStem}-detail-before`);

  await page.locator('[data-action="apd-primary"]').first().waitFor({ state: "visible" });
  await forceClick(page.locator('[data-action="apd-primary"]').first());
  await page.waitForURL(new RegExp(`#\\/workout-player\\/${plan.id}`));

  const result = await completeCurrentSession(page, plan.id);
  assert(result.sawCompleteAction, `${plan.displayName} never reached a logged workout step.`);

  if (!page.url().includes(`#/active-plan/${plan.id}`)) {
    await page.goto(`${BASE}/#/active-plan/${plan.id}`, { waitUntil: "networkidle" });
  }
  await takeScreenshot(page, `${screenshotStem}-detail-after`);
}

async function openPlanTools(page) {
  const disclosure = page.locator("details.journey-advanced").first();
  await disclosure.waitFor({ state: "visible" });
  const isOpen = await disclosure.evaluate((element) => element.hasAttribute("open"));
  if (!isOpen) {
    await forceClick(disclosure.locator("summary"));
    await page.waitForTimeout(250);
  }
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

async function revisePlanName(page, planId, nextName) {
  await page.goto(`${BASE}/#/active-plan/${planId}`, { waitUntil: "networkidle" });
  await openPlanTools(page);
  await forceClick(page.locator('[data-action="apd-edit"]').first());
  await page.waitForURL(new RegExp(`#\\/active-plan-edit\\/${planId}`));

  const field = page.locator('[data-field="displayName"]').first();
  await field.fill(nextName);
  await field.dispatchEvent("change");
  await takeScreenshot(page, "04-plan-b-editor-before-save");

  await forceClick(page.locator('[data-action="save-live-plan"]').first());
  await page.waitForURL(new RegExp(`#\\/active-plan\\/${planId}`));
  await takeScreenshot(page, "05-plan-b-detail-after-save");
}

async function archivePlan(page, planId) {
  await page.goto(`${BASE}/#/active-plan/${planId}`, { waitUntil: "networkidle" });
  await openLifecycleDisclosure(page);
  await takeScreenshot(page, "06-plan-a-before-archive");
  await forceClick(page.locator('[data-action="apd-archive"]').first());
  await page.locator('[data-action="modal-confirm"]').first().waitFor({ state: "visible" });
  await forceClick(page.locator('[data-action="modal-confirm"]').first());
  await page.waitForURL(/#\/active-plans/);
  await takeScreenshot(page, "07-dashboard-after-archive-a");
}

async function assertHistoryFilter(page, { planId, title, expectedSessionButtons, expectedStatusText, screenshotName, expectedQueueCopy = null }) {
  await page.goto(`${BASE}/#/workouts`, { waitUntil: "networkidle" });
  await page.locator(`[data-action="select-history-plan"][data-plan-id="${planId}"]`).first().waitFor({ state: "visible" });
  await forceClick(page.locator(`[data-action="select-history-plan"][data-plan-id="${planId}"]`).first());
  await page.waitForTimeout(300);
  await takeScreenshot(page, screenshotName);

  const bodyText = await page.locator("body").textContent();
  assert(bodyText?.includes(title), `History filter did not show the expected plan title "${title}".`);
  assert(bodyText?.includes(expectedStatusText), `History filter for "${title}" did not show status text "${expectedStatusText}".`);
  if (expectedQueueCopy) {
    assert(bodyText?.includes(expectedQueueCopy), `History filter for "${title}" did not show queue copy "${expectedQueueCopy}".`);
  }
  assert(bodyText?.includes("Stage history timeline"), `History filter for "${title}" is missing stage history.`);
  assert(bodyText?.includes("Revision history"), `History filter for "${title}" is missing revision history.`);
  assert(bodyText?.includes("Session timeline"), `History filter for "${title}" is missing session timeline.`);

  const workoutButtons = await page.locator('[data-action="select-workout"]').count();
  assert(
    workoutButtons === expectedSessionButtons,
    `History filter for "${title}" should show ${expectedSessionButtons} workout entries, got ${workoutButtons}.`,
  );
}

async function run() {
  const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 200 : 0 });
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
    await resetToFreshInstall(page);

    console.log("\n=== Multi-Active-Plan Isolation ===");
    const planA = await activateBlueprint(page, PLAN_A_NAME);
    const planB = await activateBlueprint(page, PLAN_B_NAME);
    await page.goto(`${BASE}/#/active-plans`, { waitUntil: "networkidle" });
    await takeScreenshot(page, "01-dashboard-two-active-plans");

    await runSessionForPlan(page, planA, "02-plan-a-first-session");

    let state = await readState(page);
    let livePlanA = state.activePlans.find((entry) => entry.id === planA.id);
    let livePlanB = state.activePlans.find((entry) => entry.id === planB.id);
    assert(livePlanA && livePlanB, "Both active plans should still exist after the first session." );
    assert((livePlanA.sessions || []).length === 1, `${PLAN_A_NAME} should have exactly 1 logged session after its first run.`);
    assert((livePlanB.sessions || []).length === 0, `${PLAN_B_NAME} should still have 0 sessions before it is run.`);

    const planAProgressSnapshot = {
      currentStageIndex: livePlanA.currentStageIndex,
      currentDayInCycle: livePlanA.currentDayInCycle,
      currentCycleCount: livePlanA.currentCycleCount,
      versionHistoryLength: (livePlanA.versionHistory || []).length,
    };

    await runSessionForPlan(page, planB, "03-plan-b-first-session");

    state = await readState(page);
    livePlanA = state.activePlans.find((entry) => entry.id === planA.id);
    livePlanB = state.activePlans.find((entry) => entry.id === planB.id);
    assert((livePlanA.sessions || []).length === 1, `${PLAN_A_NAME} session count changed after running ${PLAN_B_NAME}.`);
    assert((livePlanB.sessions || []).length === 1, `${PLAN_B_NAME} should have exactly 1 logged session after its first run.`);
    assert(livePlanA.currentStageIndex === planAProgressSnapshot.currentStageIndex, `${PLAN_A_NAME} current stage changed after running ${PLAN_B_NAME}.`);
    assert(livePlanA.currentDayInCycle === planAProgressSnapshot.currentDayInCycle, `${PLAN_A_NAME} day-in-cycle changed after running ${PLAN_B_NAME}.`);
    assert(livePlanA.currentCycleCount === planAProgressSnapshot.currentCycleCount, `${PLAN_A_NAME} cycle count changed after running ${PLAN_B_NAME}.`);
    assert((livePlanA.versionHistory || []).length === planAProgressSnapshot.versionHistoryLength, `${PLAN_A_NAME} version history changed after running ${PLAN_B_NAME}.`);

    await revisePlanName(page, planB.id, PLAN_B_REVISED_NAME);

    state = await readState(page);
    livePlanA = state.activePlans.find((entry) => entry.id === planA.id);
    livePlanB = state.activePlans.find((entry) => entry.id === planB.id);
    assert((livePlanA.versionHistory || []).length === 1, `${PLAN_A_NAME} revision history changed after revising ${PLAN_B_NAME}.`);
    assert((livePlanB.versionHistory || []).length === 2, `${PLAN_B_NAME} should have 2 revision entries after the direct save.`);
    assert(livePlanB.displayName === PLAN_B_REVISED_NAME, `${PLAN_B_NAME} did not keep its revised display name.`);
    assert(livePlanA.displayName === PLAN_A_NAME, `${PLAN_A_NAME} display name changed after revising ${PLAN_B_NAME}.`);

    await archivePlan(page, planA.id);

    state = await readState(page);
    livePlanA = state.activePlans.find((entry) => entry.id === planA.id);
    livePlanB = state.activePlans.find((entry) => entry.id === planB.id);
    const archivedPlanA = state.archivedPlans.find((entry) => entry.id === planA.id);
    assert(!livePlanA, `${PLAN_A_NAME} should not remain in the active queue after archive.`);
    assert(livePlanB, `${PLAN_B_REVISED_NAME} should remain active after archiving ${PLAN_A_NAME}.`);
    assert(archivedPlanA?.historyStatus === "archived", `${PLAN_A_NAME} archived snapshot was not preserved correctly.`);
    assert((archivedPlanA.sessions || []).length === 1, `${PLAN_A_NAME} archived snapshot should preserve its single session.`);

    await runSessionForPlan(page, livePlanB, "08-plan-b-second-session-after-archive");

    state = await readState(page);
    livePlanB = state.activePlans.find((entry) => entry.id === planB.id);
    const archivedPlanAAfter = state.archivedPlans.find((entry) => entry.id === planA.id);
    const workoutsA = state.workouts.filter((entry) => entry.activePlanId === planA.id);
    const workoutsB = state.workouts.filter((entry) => entry.activePlanId === planB.id);

    assert((livePlanB.sessions || []).length === 2, `${PLAN_B_REVISED_NAME} should have 2 sessions after continuing it post-archive.`);
    assert((livePlanB.versionHistory || []).length === 2, `${PLAN_B_REVISED_NAME} revision history changed unexpectedly after another session.`);
    assert(workoutsA.length === 1, `${PLAN_A_NAME} workout count changed after continuing ${PLAN_B_REVISED_NAME}.`);
    assert(workoutsB.length === 2, `${PLAN_B_REVISED_NAME} should have 2 workout records after two sessions.`);
    assert((archivedPlanAAfter.sessions || []).length === 1, `${PLAN_A_NAME} archived snapshot changed after continuing ${PLAN_B_REVISED_NAME}.`);

    await assertHistoryFilter(page, {
      planId: planA.id,
      title: PLAN_A_NAME,
      expectedSessionButtons: 1,
      expectedStatusText: "Archived",
      expectedQueueCopy: "Archived snapshot preserved for later review.",
      screenshotName: "09-history-archived-plan-a",
    });
    await assertHistoryFilter(page, {
      planId: planB.id,
      title: PLAN_B_REVISED_NAME,
      expectedSessionButtons: 2,
      expectedStatusText: "Active",
      expectedQueueCopy: "Still available in the active queue.",
      screenshotName: "10-history-active-plan-b",
    });

    if (errors.length) {
      throw new Error(`Browser reported errors:\n${errors.join("\n")}`);
    }

    console.log(`Multi-active-plan isolation audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
