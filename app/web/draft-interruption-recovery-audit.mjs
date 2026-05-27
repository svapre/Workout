import { mkdirSync } from "fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/draft-interruption-recovery";
const BLUEPRINT_NAME = "Grounded Strength Path";
const LIVE_PLAN_NAME = "Draft Guard Live";
const LIVE_PLAN_UNSAVED_NAME = "Draft Guard Live / Unsaved";
const BLUEPRINT_UNSAVED_NAME = "Grounded Strength Path / Unsaved";
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

async function takeScreenshot(page, name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
  console.log(`  Screenshot: ${name}.png`);
}

async function visibleLocator(page, selector) {
  const candidates = page.locator(selector);
  const count = await candidates.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }
  throw new Error(`No visible element found for selector: ${selector}`);
}

async function clickVisible(page, selector) {
  const locator = await visibleLocator(page, selector);
  await forceClick(locator);
}

async function navigateWithinApp(page, route) {
  await page.evaluate((nextRoute) => {
    window.appActions.navigate(nextRoute);
  }, route);
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
  await forceClick(page.locator('[data-action="modal-confirm"]').first());
  await page.waitForURL(/#\/active-plans/);

  const activePlanId = await page.evaluate((targetName) => {
    const plans = JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}").active_plans || [];
    return plans.find((plan) => plan.displayName === targetName)?.id || null;
  }, instanceName);
  assert(activePlanId, `Could not find active plan "${instanceName}" after activation.`);
  return activePlanId;
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

async function triggerReloadAndHandleDialog(page, action) {
  const dialogPromise = page.waitForEvent("dialog", { timeout: 3000 });
  const reloadPromise = page.reload({ waitUntil: "domcontentloaded" }).catch(() => null);
  const dialog = await dialogPromise;
  const type = dialog.type();
  if (action === "accept") {
    await dialog.accept();
  } else {
    await dialog.dismiss();
  }
  await reloadPromise;
  await page.waitForTimeout(250);
  return type;
}

async function runLivePlanScenario(page) {
  const planId = await activateBlueprint(page, LIVE_PLAN_NAME);

  await page.goto(`${BASE}/#/active-plan/${planId}`, { waitUntil: "networkidle" });
  await openPlanTools(page);
  await forceClick(page.locator('[data-action="apd-edit"]').first());
  await page.waitForURL(new RegExp(`#\\/active-plan-edit\\/${planId}`));

  const liveTitle = page.locator('[data-field="displayName"]').first();
  await liveTitle.fill(LIVE_PLAN_UNSAVED_NAME);
  await liveTitle.dispatchEvent("change");
  await takeScreenshot(page, "01-live-plan-unsaved-draft");

  await navigateWithinApp(page, 'plans');
  await page.locator('[data-action="modal-cancel"]').first().waitFor({ state: "visible" });
  await takeScreenshot(page, "02-live-plan-leave-modal");
  await forceClick(page.locator('[data-action="modal-cancel"]').first());
  await page.waitForTimeout(200);

  assert(page.url().includes(`#/active-plan-edit/${planId}`), "Staying in the live-plan editor should keep the current edit route open.");
  assert((await liveTitle.inputValue()) === LIVE_PLAN_UNSAVED_NAME, "Live-plan draft value was lost after choosing Stay.");

  const dismissedType = await triggerReloadAndHandleDialog(page, "dismiss");
  assert(dismissedType === "beforeunload", `Expected a beforeunload dialog for live-plan refresh, got "${dismissedType}".`);
  assert(page.url().includes(`#/active-plan-edit/${planId}`), "Dismissing the refresh warning should keep the live-plan editor open.");
  assert((await page.locator('[data-field="displayName"]').first().inputValue()) === LIVE_PLAN_UNSAVED_NAME, "Live-plan draft value was lost after dismissing the refresh warning.");
  await takeScreenshot(page, "03-live-plan-refresh-dismissed");

  const acceptedType = await triggerReloadAndHandleDialog(page, "accept");
  assert(acceptedType === "beforeunload", `Expected a beforeunload dialog when accepting live-plan refresh, got "${acceptedType}".`);
  await takeScreenshot(page, "04-live-plan-after-refresh-accepted");

  await page.goto(`${BASE}/#/active-plan/${planId}`, { waitUntil: "networkidle" });
  const detailText = await page.locator("body").textContent();
  assert(detailText?.includes(LIVE_PLAN_NAME), "Saved live-plan detail did not keep the original title after accepting a refresh with unsaved edits.");
  assert(!detailText?.includes(LIVE_PLAN_UNSAVED_NAME), "Unsaved live-plan draft leaked into saved detail after refresh.");
}

async function runBlueprintScenario(page) {
  await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
  const card = page.locator(".plan-card").filter({ hasText: BLUEPRINT_NAME }).first();
  assert(await card.count(), `Could not find blueprint card for "${BLUEPRINT_NAME}".`);
  await forceClick(card.locator('[data-action="select-plan"]'));

  await page.waitForSelector('[data-action="edit-blueprint"]');
  await forceClick(page.locator('[data-action="edit-blueprint"]').first());
  await page.waitForSelector('[data-action="save-blueprint"]');

  const blueprintTitle = page.locator('[data-field="name"]').first();
  await blueprintTitle.fill(BLUEPRINT_UNSAVED_NAME);
  await blueprintTitle.dispatchEvent("change");
  await takeScreenshot(page, "05-blueprint-unsaved-draft");

  await navigateWithinApp(page, 'active-plans');
  await page.locator('[data-action="modal-stay"]').first().waitFor({ state: "visible" });
  await takeScreenshot(page, "06-blueprint-leave-modal");
  await forceClick(page.locator('[data-action="modal-stay"]').first());
  await page.waitForTimeout(200);

  assert(page.url().includes("#/plans"), "Staying in the blueprint editor should keep the Plans route open.");
  assert((await page.locator('[data-field="name"]').first().inputValue()) === BLUEPRINT_UNSAVED_NAME, "Blueprint draft value was lost after choosing Stay.");

  const dismissedType = await triggerReloadAndHandleDialog(page, "dismiss");
  assert(dismissedType === "beforeunload", `Expected a beforeunload dialog for blueprint refresh, got "${dismissedType}".`);
  assert(page.url().includes("#/plans"), "Dismissing the refresh warning should keep the blueprint editor route open.");
  assert((await page.locator('[data-field="name"]').first().inputValue()) === BLUEPRINT_UNSAVED_NAME, "Blueprint draft value was lost after dismissing the refresh warning.");
  await takeScreenshot(page, "07-blueprint-refresh-dismissed");

  const acceptedType = await triggerReloadAndHandleDialog(page, "accept");
  assert(acceptedType === "beforeunload", `Expected a beforeunload dialog when accepting blueprint refresh, got "${acceptedType}".`);
  await takeScreenshot(page, "08-blueprint-after-refresh-accepted");

  await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
  const detailCard = page.locator(".plan-card").filter({ hasText: BLUEPRINT_NAME }).first();
  assert(await detailCard.count(), `Original blueprint card "${BLUEPRINT_NAME}" is missing after accepted refresh.`);
  assert(!(await page.locator(`text=${BLUEPRINT_UNSAVED_NAME}`).first().isVisible().catch(() => false)), "Unsaved blueprint title leaked into the saved library after refresh.");
}

async function run() {
  const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 150 : 0 });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();
  const errors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      if (message.text().includes("ERR_NETWORK_CHANGED")) {
        return;
      }
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
    console.log("\n=== Draft Interruption / Recovery ===");
    await resetToFreshInstall(page);
    await runLivePlanScenario(page);
    await resetToFreshInstall(page);
    await runBlueprintScenario(page);

    if (errors.length) {
      throw new Error(`Browser reported errors:\n${errors.join("\n")}`);
    }

    console.log(`Draft interruption/recovery audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
