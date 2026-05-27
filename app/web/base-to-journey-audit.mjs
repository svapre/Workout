import { mkdirSync } from "fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8000";
const OUT_DIR = "screenshots-e2e/base-to-journey-audit";

mkdirSync(OUT_DIR, { recursive: true });

async function forceClick(locator) {
  await locator.evaluate((element) => element.click());
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
await page.screenshot({ path: `${OUT_DIR}/01-plan-library.png`, fullPage: true });

const blueprintCard = page.locator(".plan-card").filter({ hasText: "Grounded Strength Path" }).first();
await forceClick(blueprintCard.locator('[data-action="select-plan"]'));
await page.waitForSelector('[data-action="study-blueprint"]');
await page.screenshot({ path: `${OUT_DIR}/02-blueprint-detail.png`, fullPage: true });

assert.equal(
  await page.locator(".panel__title").filter({ hasText: "Stage chapters" }).count(),
  0,
  "Blueprint detail should not inline stage chapters anymore.",
);
assert.equal(await page.locator("text=Compact roadmap").count(), 1, "Blueprint detail should show the compact roadmap.");

await forceClick(page.locator('[data-action="open-blueprint-study"]').first());
await page.waitForURL(/#\/plan-study\//);
await page.screenshot({ path: `${OUT_DIR}/03-blueprint-study.png`, fullPage: true });
assert.equal(await page.locator("text=Study the progression").count(), 1, "Blueprint study screen should render the study surface.");

await forceClick(page.locator('[data-action="open-routine"]').first());
await page.waitForURL(/#\/routine\//);
await page.screenshot({ path: `${OUT_DIR}/04-routine-detail.png`, fullPage: true });
assert.equal(await page.locator("text=Routine detail").count(), 1, "Routine detail screen should be the canonical read-only surface.");
assert.equal(await page.locator('[data-action="edit-routine"]').count(), 1, "Routine detail should expose editing as an explicit secondary action.");

await forceClick(page.locator('[data-action="open-exercise"]').first());
await page.waitForURL(/#\/exercise\//);
await page.screenshot({ path: `${OUT_DIR}/05-exercise-detail.png`, fullPage: true });
assert.equal(await page.locator("text=Exercise profile").count(), 1, "Exercise detail should expose the full owner profile as secondary metadata.");

await forceClick(page.locator(".back-button"));
await page.waitForURL(/#\/routine\//);
await forceClick(page.locator(".back-button"));
await page.waitForURL(/#\/plan-study\//);
await forceClick(page.locator(".back-button"));
await page.waitForURL(/#\/plans/);

await forceClick(page.locator('[data-action="start-plan"]'));
await page.waitForSelector("#modal-prompt-input");
await page.locator("#modal-prompt-input").fill("Architecture Audit / Strength");
await forceClick(page.locator('[data-action="modal-confirm"]'));
await page.waitForURL(/#\/active-plans/);
await page.screenshot({ path: `${OUT_DIR}/06-home-dashboard.png`, fullPage: true });

await page.goto(`${BASE}/#/active-plan/${await page.evaluate(() => {
  const active = JSON.parse(localStorage.getItem("workout-app.activePlans.v1") || "{}");
  return (active.active_plans || []).find((plan) => plan.displayName === "Architecture Audit / Strength")?.id || "";
})}`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT_DIR}/07-active-plan-detail.png`, fullPage: true });

assert.equal(await page.locator("text=Recent sessions").count(), 1, "Active plan detail should keep a compact recent sessions section.");
assert.equal(
  await page.locator(".panel__title").filter({ hasText: "Stage chapters" }).count(),
  0,
  "Active plan detail should not inline stage chapters anymore.",
);

await forceClick(page.locator('[data-action="open-active-plan-study"]').first());
await page.waitForURL(/#\/active-plan-study\//);
await page.screenshot({ path: `${OUT_DIR}/08-active-plan-study.png`, fullPage: true });
assert.equal(await page.locator("text=Active plan study").count(), 1, "Active plan study route should render.");

if (errors.length) {
  throw new Error(`Console/page errors detected:\n${errors.join("\n")}`);
}

await browser.close();
console.log("base-to-journey audit passed");
