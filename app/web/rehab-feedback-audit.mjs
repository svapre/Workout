import { mkdirSync } from "fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/rehab-feedback-audit";

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

async function getStoredWorkoutForPlan(page, planId) {
  return page.evaluate((targetPlanId) => {
    const workouts = JSON.parse(localStorage.getItem("workout-app.workouts.v1") || "{}");
    return (workouts.workouts || []).find((workout) => workout.activePlanId === targetPlanId) || null;
  }, planId);
}

async function fillVisibleMetricInputs(page) {
  const reps = page.locator("#log-reps");
  if (await reps.isVisible().catch(() => false)) {
    await reps.fill("8");
  }

  const duration = page.locator("#log-duration");
  if (await duration.isVisible().catch(() => false)) {
    await duration.fill("30");
  }

  const weight = page.locator("#log-weight");
  if (await weight.isVisible().catch(() => false)) {
    await weight.fill("5");
  }
}

async function completeCurrentRoutineSession(page) {
  await forceClick(page.locator('[data-action="apd-primary"], [data-action="apd-resume"]').first());
  await page.waitForURL(/#\/workout-player\//);

  const startButton = page.locator('[data-action="start"]');
  if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await forceClick(startButton);
  }

  for (let index = 0; index < 32; index += 1) {
    const action = await page.evaluate(() => {
      if (document.querySelector('[data-action="continue-journey"]')) return "continue";
      if (document.querySelector('[data-difficulty]')) return "reflection";
      if (document.querySelector('[data-action="skip-rest"]')) return "rest";
      if (document.querySelector('[data-action="complete"]')) return "complete";
      return "none";
    });

    if (action === "continue" || action === "reflection") {
      return;
    }

    if (action === "rest") {
      await forceClick(page.locator('[data-action="skip-rest"]'));
      await page.waitForTimeout(180);
      continue;
    }

    if (action === "complete") {
      await fillVisibleMetricInputs(page);
      await forceClick(page.locator('[data-action="complete"]'));
      await page.waitForTimeout(180);
      continue;
    }

    await page.waitForTimeout(180);
  }

  throw new Error("Workout session did not reach the completion/reflection flow.");
}

const browser = await chromium.launch({ headless: false, slowMo: 120 });
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

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });

await page.goto(`${BASE}/#/plans`, { waitUntil: "networkidle" });
const rehabPlanCard = page.locator(".plan-card").filter({ hasText: "Posture Rebuild Path" }).first();
await forceClick(rehabPlanCard.locator('[data-action="select-plan"]'));
await page.waitForSelector('[data-action="study-blueprint"]');
await page.screenshot({ path: `${OUT_DIR}/01-rehab-blueprint-detail.png`, fullPage: true });

await forceClick(page.locator('[data-action="study-blueprint"]'));
await page.waitForURL(/#\/plan-study\/plan_posture_rebuild_path/);
await page.waitForSelector("text=Check-ins");
await page.screenshot({ path: `${OUT_DIR}/02-rehab-blueprint-study.png`, fullPage: true });

assert.ok(
  await page.locator("text=How did numbness, tingling, or irritation feel after this session?").count(),
  "Blueprint study should show the seeded symptom feedback prompt.",
);
assert.ok(
  await page.locator("text=What felt easier or harder in daily life today?").count(),
  "Blueprint study should show the seeded function feedback prompt.",
);

await forceClick(page.locator(".back-button"));
await page.waitForURL(/#\/plans/);

await forceClick(page.locator('[data-action="start-plan"]'));
await page.waitForSelector("#modal-prompt-input");
await page.locator("#modal-prompt-input").fill("Rehab Feedback Audit");
await forceClick(page.locator('[data-action="modal-confirm"]'));
await page.waitForURL(/#\/active-plans/);

const activePlanId = await getActivePlanId(page, "Rehab Feedback Audit");
assert.ok(activePlanId, "Expected the rehab starter plan to activate.");

await page.goto(`${BASE}/#/active-plan/${activePlanId}`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT_DIR}/03-rehab-active-plan-detail.png`, fullPage: true });

await forceClick(page.locator('[data-action="study-plan"]'));
await page.waitForURL(new RegExp(`#\\/active-plan-study\\/${activePlanId}`));
await page.waitForSelector("text=Check-ins");
await page.screenshot({ path: `${OUT_DIR}/04-rehab-active-plan-study.png`, fullPage: true });

assert.ok(
  await page.locator("text=How did numbness, tingling, or irritation feel after this session?").count(),
  "Active plan study should show the live-stage feedback prompt.",
);

await forceClick(page.locator(".back-button"));
await page.waitForURL(new RegExp(`#\\/active-plan\\/${activePlanId}`));

await completeCurrentRoutineSession(page);

await forceClick(page.locator('[data-action="continue-journey"]'));
await page.waitForSelector('[data-feedback-prompt-id="fb_posture_reset_symptoms"]');
await page.locator('[data-feedback-prompt-id="fb_posture_reset_symptoms"]').fill("Less tingling in the hand after the session, with no flare-up during the floor work.");
await page.locator('[data-feedback-prompt-id="fb_posture_reset_function"]').fill("Typing felt a little easier afterward, but long sitting still made the arm feel heavy.");
await page.screenshot({ path: `${OUT_DIR}/05-rehab-reflection-feedback.png`, fullPage: true });

await forceClick(page.locator('[data-difficulty="normal"]'));
await page.waitForURL(new RegExp(`#\\/active-plan\\/${activePlanId}`));

const storedWorkout = await getStoredWorkoutForPlan(page, activePlanId);
assert.ok(storedWorkout, "Expected the rehab session to be stored.");
assert.equal(storedWorkout.reflectionRating, "normal", "Expected the rehab session to retain the reflection rating.");
assert.equal(storedWorkout.feedbackResponses?.length, 2, "Expected both rehab feedback responses to be stored.");
assert.equal(storedWorkout.feedbackResponses?.[0]?.promptId, "fb_posture_reset_symptoms");
assert.equal(storedWorkout.feedbackResponses?.[1]?.promptId, "fb_posture_reset_function");

await forceClick(page.locator('[data-action="apd-history"]'));
await page.waitForURL(/#\/workouts/);
await page.waitForSelector('[data-role="workout-detail"]');
await page.screenshot({ path: `${OUT_DIR}/06-rehab-history-feedback.png`, fullPage: true });

assert.ok(
  await page.locator("text=Session feedback").count(),
  "History detail should show the session feedback section.",
);
assert.ok(
  await page.locator("text=Less tingling in the hand after the session").count(),
  "History detail should show the stored symptom response.",
);
assert.ok(
  await page.locator("text=Typing felt a little easier afterward").count(),
  "History detail should show the stored function response.",
);

if (errors.length) {
  throw new Error(`Console/page errors detected during rehab feedback audit: ${errors.join(" | ")}`);
}

await browser.close();
console.log(`rehab feedback audit passed. Screenshots: ${OUT_DIR}`);
