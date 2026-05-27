import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/plan-lifecycle-audit";
const BLUEPRINT_NAME = "Grounded Strength Path";
const ARCHIVE_INSTANCE = "Archive Lifecycle / Audit";
const REMOVE_INSTANCE = "Remove Lifecycle / Audit";
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

async function readState(page) {
  return page.evaluate(() => ({
    workouts: JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}"),
    activePlans: JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}"),
    archivedPlans: JSON.parse(localStorage.getItem("workout-app.archivedPlans.v1") || "[]"),
    plans: JSON.parse(localStorage.getItem("workout-app.plans.v1") || "{}"),
  }));
}

async function resetToFreshInstall(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
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
  await forceClick(page.locator('[data-action="modal-confirm"]'));
  await page.waitForURL(/#\/active-plans/);

  const state = await readState(page);
  const activePlan = (state.activePlans.active_plans || []).find((plan) => plan.displayName === instanceName);
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

async function runOneSession(page, plan, screenshotStem) {
  await page.goto(`${BASE}/#/active-plan/${plan.id}`, { waitUntil: "networkidle" });
  await page.locator('[data-action="apd-primary"]').first().waitFor({ state: "visible" });
  await takeScreenshot(page, `${screenshotStem}-detail-before-session`);
  await forceClick(page.locator('[data-action="apd-primary"]').first());
  await page.waitForURL(new RegExp(`#\\/workout-player\\/${plan.id}`));
  await takeScreenshot(page, `${screenshotStem}-player`);

  const sessionResult = await completeCurrentSession(page, plan.id);
  assert(sessionResult.sawCompleteAction, `${plan.displayName} never reached a logged workout step.`);

  if (!page.url().includes(`#/active-plan/${plan.id}`)) {
    await page.goto(`${BASE}/#/active-plan/${plan.id}`, { waitUntil: "networkidle" });
  }

  await takeScreenshot(page, `${screenshotStem}-detail-after-session`);
}

async function openLifecycleDisclosure(page) {
  const disclosure = page.locator("details.journey-advanced--danger").first();
  await disclosure.waitFor({ state: "visible" });
  const isOpen = await disclosure.evaluate((element) => element.hasAttribute("open"));
  if (!isOpen) {
    await forceClick(disclosure.locator("summary"));
    await page.waitForTimeout(250);
  }
}

async function archivePlan(page, plan, screenshotStem) {
  await page.goto(`${BASE}/#/active-plan/${plan.id}`, { waitUntil: "networkidle" });
  await openLifecycleDisclosure(page);
  await takeScreenshot(page, `${screenshotStem}-before-archive`);
  await forceClick(page.locator('[data-action="apd-archive"]').first());
  await page.locator('[data-action="modal-confirm"]').first().waitFor({ state: "visible" });
  await forceClick(page.locator('[data-action="modal-confirm"]').first());
  await page.waitForURL(/#\/active-plans/);
  await takeScreenshot(page, `${screenshotStem}-after-archive`);
}

async function removePlan(page, plan, screenshotStem) {
  await page.goto(`${BASE}/#/active-plan/${plan.id}`, { waitUntil: "networkidle" });
  await openLifecycleDisclosure(page);
  await takeScreenshot(page, `${screenshotStem}-before-remove`);
  await forceClick(page.locator('[data-action="apd-remove"]').first());
  await page.locator('[data-action="modal-confirm"]').first().waitFor({ state: "visible" });
  await forceClick(page.locator('[data-action="modal-confirm"]').first());
  await page.waitForURL(/#\/active-plans/);
  await takeScreenshot(page, `${screenshotStem}-after-remove`);
}

async function assertSnapshotInHistory(page, plan, expectedStatus, screenshotName) {
  await page.goto(`${BASE}/#/workouts`, { waitUntil: "networkidle" });
  await page.locator(`[data-action="select-history-plan"][data-plan-id="${plan.id}"]`).first().waitFor({ state: "visible" });
  await forceClick(page.locator(`[data-action="select-history-plan"][data-plan-id="${plan.id}"]`).first());
  await page.waitForTimeout(300);
  await takeScreenshot(page, screenshotName);

  const snapshotPanel = page
    .locator("section.panel.panel--section")
    .filter({ hasText: plan.displayName || plan.name })
    .filter({ hasText: "Plan snapshot" })
    .first();
  await snapshotPanel.waitFor({ state: "visible" });

  const statusText = (await snapshotPanel
    .locator(".metric-card")
    .filter({ hasText: "Status" })
    .locator(".metric-card__value")
    .first()
    .textContent()) || "";

  assert(
    statusText.toLowerCase().includes(expectedStatus.toLowerCase()),
    `${plan.displayName} history snapshot should show status "${expectedStatus}", but got "${statusText.trim()}".`,
  );

  assert(await snapshotPanel.getByText("Stage history timeline", { exact: true }).isVisible(), `${plan.displayName} history snapshot is missing stage history.`);
  assert(await snapshotPanel.getByText("Revision history", { exact: true }).isVisible(), `${plan.displayName} history snapshot is missing revision history.`);
  assert(await snapshotPanel.getByText("Session timeline", { exact: true }).isVisible(), `${plan.displayName} history snapshot is missing session timeline.`);
  assert(!(await snapshotPanel.getByText("No sessions yet", { exact: true }).isVisible().catch(() => false)), `${plan.displayName} history snapshot lost its session timeline.`);
  assert(await page.locator('[data-action="select-workout"]').first().isVisible({ timeout: 1500 }).catch(() => false), `${plan.displayName} filtered history did not show any workout entries.`);
}

async function run() {
  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: HEADED ? 200 : 0,
  });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
  });
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

    const starterState = await readState(page);
    assert((starterState.plans.plan_blueprints || []).length > 0, "Starter blueprints did not seed after reset.");

    console.log("\n=== Plan Lifecycle Flow ===");
    const archivePlanInstance = await activateBlueprint(page, ARCHIVE_INSTANCE);
    const removePlanInstance = await activateBlueprint(page, REMOVE_INSTANCE);
    await takeScreenshot(page, "01-active-plans-after-create");

    await runOneSession(page, archivePlanInstance, "02-archive-plan");
    await runOneSession(page, removePlanInstance, "03-remove-plan");

    await archivePlan(page, archivePlanInstance, "04-archive-plan");
    await removePlan(page, removePlanInstance, "05-remove-plan");

    const stateAfterLifecycle = await readState(page);
    const activePlans = stateAfterLifecycle.activePlans.active_plans || [];
    const archivedPlans = stateAfterLifecycle.archivedPlans || [];

    assert(!activePlans.some((plan) => plan.id === archivePlanInstance.id), `${ARCHIVE_INSTANCE} is still in the active queue after archiving.`);
    assert(!activePlans.some((plan) => plan.id === removePlanInstance.id), `${REMOVE_INSTANCE} is still in the active queue after removal.`);

    const archivedSnapshot = archivedPlans.find((plan) => plan.id === archivePlanInstance.id);
    const removedSnapshot = archivedPlans.find((plan) => plan.id === removePlanInstance.id);

    assert(archivedSnapshot?.historyStatus === "archived", `${ARCHIVE_INSTANCE} snapshot was not preserved as archived.`);
    assert(removedSnapshot?.historyStatus === "removed", `${REMOVE_INSTANCE} snapshot was not preserved as removed.`);
    assert(Array.isArray(archivedSnapshot?.sessions) && archivedSnapshot.sessions.length >= 1, `${ARCHIVE_INSTANCE} snapshot did not preserve its session references.`);
    assert(Array.isArray(removedSnapshot?.sessions) && removedSnapshot.sessions.length >= 1, `${REMOVE_INSTANCE} snapshot did not preserve its session references.`);

    await assertSnapshotInHistory(page, archivePlanInstance, "Archived", "06-history-archived-plan");
    await assertSnapshotInHistory(page, removePlanInstance, "Removed", "07-history-removed-plan");

    if (errors.length) {
      throw new Error(`Browser reported errors:\n${errors.join("\n")}`);
    }

    console.log("Plan lifecycle audit passed.");
    console.log(`Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
