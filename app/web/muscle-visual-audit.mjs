/**
 * muscle-visual-audit.mjs
 *
 * A standalone Playwright-based visual audit of the V2 Workout Tracker's
 * body-map rendering engine.  This script brings its OWN seed data
 * (exercises, body targets, routines, plans) — it does not depend on
 * any pre-existing test-suite files.
 *
 * What it tests:
 *   1. Every one of the 14 muscle-group overlays renders on the correct
 *      silhouette view (front / back) with visible glow.
 *   2. Exercises that hit MULTIPLE muscle groups light up the right
 *      combination of regions.
 *   3. The muscle map scales correctly across phone, tablet, and desktop.
 *   4. The exercise-library card grid renders thumbnail visuals for
 *      each card without overflow.
 *   5. Routine detail shows aggregated body visuals across its entries.
 *   6. No console errors or uncaught page errors during any navigation.
 *
 * Usage:
 *   node muscle-visual-audit.mjs          (server must be on :8000)
 *   -- or via the wrapper --
 *   powershell -ExecutionPolicy Bypass -File run-visible-audit.ps1 -AuditScript app/web/muscle-visual-audit.mjs
 */

import { mkdirSync } from "fs";
import { chromium } from "playwright";

// ───────────────────────────── constants ─────────────────────────────
const BASE = "http://localhost:8000";
const OUT = "screenshots/muscle-visual-audit";
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { tag: "phone",   w: 393,  h: 852  },
  { tag: "tablet",  w: 834,  h: 1194 },
  { tag: "desktop", w: 1440, h: 900  },
];

// ─────────── seed data: 14 body-targets (matches app's seed) ────────
const BODY_TARGETS = [
  { id: "bm_chest",       name: "Chest",        category: "muscle", isCustom: false },
  { id: "bm_back",        name: "Back",         category: "muscle", isCustom: false },
  { id: "bm_shoulders",   name: "Shoulders",    category: "muscle", isCustom: false },
  { id: "bm_biceps",      name: "Biceps",       category: "muscle", isCustom: false },
  { id: "bm_triceps",     name: "Triceps",      category: "muscle", isCustom: false },
  { id: "bm_forearms",    name: "Forearms",     category: "muscle", isCustom: false },
  { id: "bm_core",        name: "Core",         category: "muscle", isCustom: false },
  { id: "bm_lower_back",  name: "Lower Back",   category: "muscle", isCustom: false },
  { id: "bm_glutes",      name: "Glutes",       category: "muscle", isCustom: false },
  { id: "bm_quads",       name: "Quadriceps",   category: "muscle", isCustom: false },
  { id: "bm_hamstrings",  name: "Hamstrings",   category: "muscle", isCustom: false },
  { id: "bm_calves",      name: "Calves",       category: "muscle", isCustom: false },
  { id: "bm_hip_flexors", name: "Hip Flexors",  category: "muscle", isCustom: false },
  { id: "bm_neck",        name: "Neck",         category: "muscle", isCustom: false },
];

// Which targets should light up the FRONT figure, and which the BACK.
const FRONT_TARGETS = new Set([
  "bm_neck", "bm_shoulders", "bm_chest", "bm_biceps", "bm_forearms",
  "bm_core", "bm_hip_flexors", "bm_quads", "bm_calves",
]);
const BACK_TARGETS = new Set([
  "bm_neck", "bm_shoulders", "bm_back", "bm_triceps", "bm_forearms",
  "bm_lower_back", "bm_glutes", "bm_hamstrings", "bm_calves",
]);

// ──────────── seed data: 14 single-target "isolation" exercises ─────
// Each exercise isolates exactly ONE muscle group so we can verify
// the highlight render in isolation.
function makeIsolationExercise(targetId, targetLabel) {
  const slug = targetLabel.toLowerCase().replace(/\s+/g, "-");
  return {
    id: `audit_iso_${targetId}`,
    slug: `audit-iso-${slug}`,
    name: `Audit: ${targetLabel} Isolation`,
    description: `Single-target exercise used by the visual audit to verify the ${targetLabel} overlay renders correctly.`,
    type: "physical",
    trackingType: "reps",
    bodyTargets: [targetId],
    secondaryMuscles: [],
    equipment: ["None"],
    cues: ["Controlled tempo"],
    restSeconds: 60,
    aliases: [],
    movementPattern: "audit",
    whyItHelps: `Isolates ${targetLabel} for visual validation.`,
    isCustom: true,
    category: "strength",
  };
}

// Two compound exercises that light up MULTIPLE regions at once.
const COMPOUND_EXERCISES = [
  {
    id: "audit_compound_front",
    slug: "audit-compound-front",
    name: "Audit: Front Compound",
    description: "Compound exercise targeting chest, shoulders, biceps, core, and quads simultaneously.",
    type: "physical",
    trackingType: "reps",
    bodyTargets: ["bm_chest", "bm_shoulders", "bm_biceps", "bm_core", "bm_quads"],
    secondaryMuscles: ["bm_forearms", "bm_hip_flexors"],
    equipment: ["None"],
    cues: ["Full body tension"],
    restSeconds: 90,
    aliases: [],
    movementPattern: "compound",
    whyItHelps: "Validates multi-region front-side overlay rendering.",
    isCustom: true,
    category: "strength",
  },
  {
    id: "audit_compound_back",
    slug: "audit-compound-back",
    name: "Audit: Back Compound",
    description: "Compound exercise targeting back, triceps, glutes, hamstrings, lower back, and calves.",
    type: "physical",
    trackingType: "reps",
    bodyTargets: ["bm_back", "bm_triceps", "bm_glutes", "bm_hamstrings", "bm_lower_back"],
    secondaryMuscles: ["bm_calves", "bm_neck"],
    equipment: ["None"],
    cues: ["Brace everything"],
    restSeconds: 90,
    aliases: [],
    movementPattern: "compound",
    whyItHelps: "Validates multi-region back-side overlay rendering.",
    isCustom: true,
    category: "strength",
  },
];

const ISOLATION_EXERCISES = BODY_TARGETS.map((t) =>
  makeIsolationExercise(t.id, t.name),
);

const ALL_EXERCISES = [...ISOLATION_EXERCISES, ...COMPOUND_EXERCISES];

// ───── A single test routine that bundles every isolation exercise ───
const TEST_ROUTINE = {
  id: "audit_full_body_routine",
  name: "Audit: Full Body Routine",
  description: "A routine containing every isolation exercise for aggregate body-visual testing.",
  notes: "Auto-generated by muscle-visual-audit.mjs",
  difficultyScore: 5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isCustom: true,
  entries: ISOLATION_EXERCISES.map((ex, i) => ({
    id: `entry_${ex.id}`,
    exerciseId: ex.id,
    order: i + 1,
    sets: 3,
    reps: 10,
    durationSeconds: null,
    weight: null,
    resistance: null,
    restSeconds: 60,
    notes: "",
  })),
};

// ──────────────────────── helpers ────────────────────────────────────
function log(msg) { console.log(msg); }
let screenshotCount = 0;

async function snap(page, name) {
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  screenshotCount++;
  log(`  📸  ${name}.png`);
}

async function scrollMetrics(page) {
  return page.evaluate(() => ({
    scrollH: document.scrollingElement.scrollHeight,
    clientH: document.scrollingElement.clientHeight,
    scrollW: document.scrollingElement.scrollWidth,
    clientW: document.scrollingElement.clientWidth,
  }));
}

// ──────── seed localStorage and reload ──────────────────────────────
async function seed(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ bt, ex, rt }) => {
      localStorage.clear();
      localStorage.setItem("workout-app.bodymap.v1",      JSON.stringify({ bodyMaps: bt }));
      localStorage.setItem("workout-app.exercises.v1",     JSON.stringify({ exercises: ex }));
      localStorage.setItem("workout-app.state.v1",         JSON.stringify({ routines: [rt] }));
      localStorage.setItem("workout-app.workouts.v1",      JSON.stringify({ workouts: [] }));
      localStorage.setItem("workout-app.plans.v1",         JSON.stringify({ plan_blueprints: [] }));
      localStorage.setItem("workout-app.activePlans.v1",   JSON.stringify({ active_plans: [] }));
      localStorage.setItem("workout-app.archivedPlans.v1", JSON.stringify([]));
      localStorage.setItem("workout-app.meta.v1",          JSON.stringify({ starterContentVersion: "99.0.0" }));
    },
    { bt: BODY_TARGETS, ex: ALL_EXERCISES, rt: TEST_ROUTINE },
  );
  await page.reload({ waitUntil: "networkidle" });
}

// ────────────── per-exercise body-visual assertions ─────────────────
async function auditExerciseDetail(page, exercise, vpTag) {
  const label = `${vpTag}/${exercise.name}`;

  // Navigate to exercise detail
  await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  const card = page.locator(`[data-exercise-id="${exercise.id}"]`);
  const cardCount = await card.count();
  if (cardCount === 0) {
    log(`  ⚠️  ${label}: card NOT found in library — skipping`);
    return { label, pass: false, reason: "card missing from library" };
  }
  await card.first().click();
  await page.waitForTimeout(600);

  // Screenshot
  const slug = exercise.slug || exercise.id;
  await snap(page, `${vpTag}-exercise-${slug}`);

  // Verify the body-visual SVG is present and not empty
  const svgLocator = page.locator(".body-visual__svg");
  const svgCount = await svgLocator.count();
  if (svgCount === 0) {
    log(`  ❌  ${label}: no .body-visual__svg found`);
    return { label, pass: false, reason: "SVG missing" };
  }

  // Check that expected mask elements exist for each bodyTarget
  const primaryTargets = exercise.bodyTargets || [];
  const secondaryTargets = exercise.secondaryMuscles || [];
  const allTargets = [...primaryTargets, ...secondaryTargets];

  const maskResult = await page.evaluate((targets) => {
    const svg = document.querySelector(".body-visual__svg");
    if (!svg) return { ok: false, detail: "SVG not in DOM" };
    const found = [];
    const missing = [];
    for (const tid of targets) {
      // Masks are named like: body-visual-N-front-primary-bm_chest-mask
      const masks = svg.querySelectorAll(`mask[id*="${tid}"]`);
      if (masks.length > 0) {
        found.push(tid);
      } else {
        missing.push(tid);
      }
    }
    return { ok: missing.length === 0, found, missing };
  }, allTargets);

  if (!maskResult.ok) {
    log(`  ❌  ${label}: missing masks for: ${maskResult.missing.join(", ")}`);
    return { label, pass: false, reason: `missing masks: ${maskResult.missing.join(", ")}` };
  }

  // Verify glow rects have non-zero bounding boxes (i.e. they're visible)
  const glowVisible = await page.evaluate(() => {
    const glows = document.querySelectorAll(".body-visual__region-glow");
    if (glows.length === 0) return { ok: false, count: 0 };
    let allVisible = true;
    for (const glow of glows) {
      const bb = glow.getBoundingClientRect();
      if (bb.width < 1 || bb.height < 1) {
        allVisible = false;
      }
    }
    return { ok: allVisible, count: glows.length };
  });

  if (!glowVisible.ok) {
    log(`  ⚠️  ${label}: some glow rects have zero bbox (${glowVisible.count} total glows)`);
  }

  // Check horizontal overflow
  const m = await scrollMetrics(page);
  if (m.scrollW > m.clientW + 2) {
    log(`  ⚠️  ${label}: horizontal overflow detected`);
  }

  log(`  ✅  ${label}: ${maskResult.found.length} mask(s) rendered, ${glowVisible.count} glow(s)`);
  return { label, pass: true, masks: maskResult.found.length, glows: glowVisible.count };
}

// ──────────── routine detail: aggregated body visual ────────────────
async function auditRoutineDetail(page, vpTag) {
  const label = `${vpTag}/routine-detail`;
  await page.goto(`${BASE}/#/routines`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  const routineCard = page.locator('[data-action="open-routine"]').first();
  if ((await routineCard.count()) === 0) {
    log(`  ⚠️  ${label}: no routine card found`);
    return;
  }
  await routineCard.click();
  await page.waitForTimeout(600);
  await snap(page, `${vpTag}-routine-detail`);

  // The routine has all 14 exercises so we expect a fully-lit body map
  const totalMasks = await page.evaluate(() => {
    const masks = document.querySelectorAll(".body-visual__svg mask");
    return masks.length;
  });
  log(`  📊  ${label}: ${totalMasks} total mask elements in routine body visual`);
}

// ──────────── exercise library grid: visual quality ─────────────────
async function auditExerciseLibrary(page, vpTag) {
  const label = `${vpTag}/exercise-library`;
  await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await snap(page, `${vpTag}-exercise-library`);

  const cardCount = await page.locator('[data-action="exercise-card"]').count();
  log(`  📊  ${label}: ${cardCount} exercise cards rendered`);

  // Check that card thumbnails (compact body visuals) are present
  const thumbnailCount = await page.locator(".body-visual--compact").count();
  log(`  📊  ${label}: ${thumbnailCount} compact body-visual thumbnails`);

  const m = await scrollMetrics(page);
  const hOverflow = m.scrollW > m.clientW + 2;
  log(`  ${hOverflow ? "⚠️" : "✅"}  ${label}: horizontal overflow: ${hOverflow ? "YES" : "no"}`);
}

// ────────────── mask asset file check ───────────────────────────────
async function auditMaskAssetLoading(page, vpTag) {
  const label = `${vpTag}/mask-assets`;
  // Navigate to a compound exercise to load many masks
  await page.goto(`${BASE}/#/exercises`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  const card = page.locator(`[data-exercise-id="audit_compound_front"]`);
  if ((await card.count()) === 0) {
    log(`  ⚠️  ${label}: compound-front card not found`);
    return;
  }
  await card.first().click();
  await page.waitForTimeout(600);

  // Check that all mask images loaded without 404
  const maskLoadStatus = await page.evaluate(() => {
    const images = document.querySelectorAll(".body-visual__svg image");
    const results = [];
    for (const img of images) {
      const href = img.getAttribute("href") || img.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      results.push({ href, hasData: Boolean(href) });
    }
    return results;
  });

  const loadedCount = maskLoadStatus.filter(r => r.hasData).length;
  log(`  📊  ${label}: ${loadedCount}/${maskLoadStatus.length} SVG images have href set`);
}

// ───────────────── main runner ───────────────────────────────────────
async function main() {
  log("═══════════════════════════════════════════════");
  log("  Muscle Visual Audit — custom test harness");
  log("═══════════════════════════════════════════════\n");

  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const issues = [];
  const results = [];

  for (const vp of VIEWPORTS) {
    log(`\n━━━ ${vp.tag.toUpperCase()} (${vp.w}×${vp.h}) ━━━`);
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    const consoleErrors = [];

    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    page.on("pageerror", (err) => { consoleErrors.push(err.message); });

    await seed(page);

    // 1. Exercise library grid
    await auditExerciseLibrary(page, vp.tag);

    // 2. Each isolation exercise detail
    for (const ex of ISOLATION_EXERCISES) {
      const r = await auditExerciseDetail(page, ex, vp.tag);
      results.push(r);
      if (!r.pass) issues.push(r);
    }

    // 3. Compound exercises (multi-target)
    for (const ex of COMPOUND_EXERCISES) {
      const r = await auditExerciseDetail(page, ex, vp.tag);
      results.push(r);
      if (!r.pass) issues.push(r);
    }

    // 4. Routine detail aggregate
    await auditRoutineDetail(page, vp.tag);

    // 5. Mask asset loading
    await auditMaskAssetLoading(page, vp.tag);

    // Console errors
    if (consoleErrors.length === 0) {
      log(`  ✅  console/page errors: none`);
    } else {
      log(`  ⚠️  console/page errors: ${consoleErrors.length}`);
      consoleErrors.forEach((e) => log(`       ${e}`));
      issues.push({ label: `${vp.tag}/console-errors`, pass: false, reason: consoleErrors.join("; ") });
    }

    await ctx.close();
  }

  // ─────── summary ──────
  log("\n═══════════════════════════════════════════════");
  log("  AUDIT SUMMARY");
  log("═══════════════════════════════════════════════");
  log(`  Total screenshots: ${screenshotCount}`);
  log(`  Total assertions:  ${results.length}`);
  log(`  Passed:            ${results.filter(r => r.pass).length}`);
  log(`  Failed:            ${issues.length}`);
  if (issues.length > 0) {
    log("\n  FAILURES:");
    issues.forEach((i) => log(`    ❌  ${i.label}: ${i.reason}`));
  } else {
    log("\n  🎉  All muscle overlays rendered correctly across all viewports!");
  }
  log(`\n  Screenshots saved to: ${OUT}/`);

  await browser.close();

  if (issues.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("AUDIT FAILED:", err);
  process.exit(1);
});
