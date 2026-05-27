import { mkdirSync } from "fs";
import { chromium } from "playwright";
import { STARTER_CONTENT_VERSION } from "./src/data/starterContent.js";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/body-target-reference-protection";
const HEADED = process.argv.includes("--headed");

mkdirSync(OUT_DIR, { recursive: true });

const bodyTargets = [
  { id: "bm_core", name: "Core", category: "muscle", isCustom: false },
  { id: "bt_protected", name: "Protected Target", category: "muscle", isCustom: true },
  { id: "bt_unused", name: "Unused Target", category: "muscle", isCustom: true },
];

const exercises = [
  {
    id: "ex_protected_target",
    slug: "protected-target-activity",
    name: "Protected Target Activity",
    description: "Uses the protected body target.",
    type: "physical",
    trackingType: "reps",
    supportedTrackingModes: ["reps"],
    bodyTargets: ["bt_protected"],
    equipment: ["Bodyweight"],
    cues: ["Brace", "Move smoothly"],
    restSeconds: 45,
    aliases: [],
    movementPattern: "stability",
    whyItHelps: "Confirms target dependencies stay intact.",
    isCustom: true,
  },
];

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

async function readBodyTargets(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.bodymap.v1") || "{}").bodyMaps || []);
}

async function readExercises(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("workout-app.exercises.v1") || "{}").exercises || []);
}

async function seedState(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(({ nextBodyTargets, nextExercises, starterVersion }) => {
    localStorage.setItem("workout-app.bodymap.v1", JSON.stringify({ bodyMaps: nextBodyTargets }));
    localStorage.setItem("workout-app.exercises.v1", JSON.stringify({ exercises: nextExercises }));
    localStorage.setItem("workout-app.state.v1", JSON.stringify({ routines: [] }));
    localStorage.setItem("workout-app.workouts.v1", JSON.stringify({ workouts: [] }));
    localStorage.setItem("workout-app.activePlans.v1", JSON.stringify({ active_plans: [] }));
    localStorage.setItem("workout-app.plans.v1", JSON.stringify({ plan_blueprints: [] }));
    localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
    localStorage.setItem(
      "workout-app.meta.v1",
      JSON.stringify({ starterContentVersion: starterVersion, starterContentSyncedAt: new Date().toISOString() }),
    );
  }, {
    nextBodyTargets: bodyTargets,
    nextExercises: exercises,
    starterVersion: STARTER_CONTENT_VERSION,
  });
  await page.reload({ waitUntil: "networkidle" });
}

async function attemptDeleteTarget(page) {
  await forceClick(page.locator('[data-action="delete-body-target"]').first());
  await page.waitForSelector('.modal-content');
  await forceClick(page.locator('.modal-content button').filter({ hasText: /^Delete$/ }).first());
  await page.waitForSelector('.status-message');
}

async function main() {
  console.log("\n=== Body Target Reference Protection Audit ===");
  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  try {
    await seedState(page);

    await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
    await forceClick(page.locator('[data-action="open-body-targets"]').first());
    await page.waitForURL(/#\/body-targets$/);
    await takeScreenshot(page, "01-body-target-library");

    await forceClick(page.locator('[data-action="body-target-card"][data-target-id="bt_unused"]').first());
    await page.waitForURL(/#\/body-target\/bt_unused$/);
    await attemptDeleteTarget(page);
    const deleteNotice = (await page.locator('.status-message').textContent())?.trim() || "";
    assert(/Deleted "Unused Target"\./i.test(deleteNotice), `Expected successful delete notice, received: ${deleteNotice}`);
    const remainingTargets = await readBodyTargets(page);
    assert(!remainingTargets.some((target) => target.id === "bt_unused"), "Unused target should be removed after delete.");
    await takeScreenshot(page, "02-unused-target-deleted");

    await page.goto(`${BASE}/#/exercise/ex_protected_target`, { waitUntil: "networkidle" });
    await forceClick(page.locator('.journey-advanced__summary').filter({ hasText: /Activity profile/i }).first());
    await page.waitForSelector('[data-action="open-body-target"][data-target-id="bt_protected"]');
    await takeScreenshot(page, "03-activity-detail-with-target-chip");

    await forceClick(page.locator('[data-action="open-body-target"][data-target-id="bt_protected"]').first());
    await page.waitForURL(/#\/body-target\/bt_protected$/);
    await takeScreenshot(page, "04-protected-target-detail");

    await attemptDeleteTarget(page);
    const blockedNotice = (await page.locator('.status-message').textContent())?.trim() || "";
    assert(/Can't delete "Protected Target"/i.test(blockedNotice), `Expected blocked delete notice, received: ${blockedNotice}`);
    assert(/1 activity/i.test(blockedNotice), `Blocked delete notice should mention activity usage. Received: ${blockedNotice}`);

    const afterBlockedTargets = await readBodyTargets(page);
    assert(afterBlockedTargets.some((target) => target.id === "bt_protected"), "Protected target should remain after blocked delete.");
    assert((await readExercises(page)).some((exercise) => exercise.id === "ex_protected_target"), "Protected activity should remain intact after blocked target delete.");
    await takeScreenshot(page, "05-protected-target-blocked");

    console.log(`Body target reference protection audit passed. Screenshots: ${OUT_DIR}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
