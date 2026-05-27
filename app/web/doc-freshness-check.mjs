/**
 * doc-freshness-check.mjs
 *
 * Documentation freshness enforcement for the Workout app.
 *
 * Validates that key documentation files are kept up to date
 * when source code changes. Enforces the rule from REVIEW_PROTOCOL.md:
 *   "docs update in the same commit as the code change"
 *
 * Usage:
 *   node doc-freshness-check.mjs              # check staged/uncommitted changes
 *   node doc-freshness-check.mjs --full       # full audit of docs vs source tree
 *   node doc-freshness-check.mjs --ci         # strict mode for CI (exit 1 on any warning)
 *
 * What it checks:
 *   1. If source files changed, did the required docs also change?
 *   2. Does ARCHITECTURE.md list all real source directories/files?
 *   3. Does SPEC.md reference all localStorage keys actually used?
 *   4. Is ONBOARDING.md "Last updated" date reasonably recent?
 *   5. Does CHANGELOG.md have an entry near the latest commit date?
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, relative, basename } from "path";

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
const DOCS_DIR = join(ROOT, "app", "docs");
const SRC_DIR = join(ROOT, "app", "web", "src");

const isCI = process.argv.includes("--ci");
const isFull = process.argv.includes("--full") || isCI;

const warnings = [];
const passes = [];

function warn(msg) {
  warnings.push(msg);
  console.log(`  ⚠  ${msg}`);
}

function pass(msg) {
  passes.push(msg);
  console.log(`  ✓  ${msg}`);
}

function readDoc(name) {
  const p = join(DOCS_DIR, name);
  if (!existsSync(p)) {
    warn(`${name} does not exist`);
    return "";
  }
  return readFileSync(p, "utf-8");
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function walkDir(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".git") continue;
      walkDir(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

// ─── Check 1: Source-change to doc-change correlation ───────────────────

function checkSourceDocCorrelation() {
  console.log("\n── Check 1: Source changes require doc updates ──");

  const diffOutput = git("diff --name-only HEAD") || git("diff --name-only --cached");
  if (!diffOutput) {
    pass("No uncommitted changes to check.");
    return;
  }

  const changedFiles = diffOutput.split("\n").filter(Boolean);
  const srcChanges = changedFiles.filter((f) => f.startsWith("app/web/src/"));
  const docChanges = changedFiles.filter((f) => f.startsWith("app/docs/"));

  if (srcChanges.length === 0) {
    pass("No source changes detected.");
    return;
  }

  // Rule: if source files changed, at least CHANGELOG should be updated
  const changelogUpdated = docChanges.some((f) => f.includes("CHANGELOG.md"));
  if (!changelogUpdated) {
    warn(
      `${srcChanges.length} source file(s) changed but CHANGELOG.md was not updated. ` +
      `Rule: docs update in the same commit as the code change.`
    );
  } else {
    pass(`CHANGELOG.md updated alongside ${srcChanges.length} source change(s).`);
  }

  // Rule: if schema-related files changed, SPEC.md should be updated
  const schemaFiles = [
    "schemaMigration.js",
    "defaults.js",
    "defaultExerciseCatalog.js",
    "starterContent.js",
    "historySnapshot.js",
  ];
  const schemaChanged = srcChanges.some((f) => schemaFiles.some((sf) => f.endsWith(sf)));
  const specUpdated = docChanges.some((f) => f.includes("SPEC.md"));
  if (schemaChanged && !specUpdated) {
    warn(
      `Schema-related files changed but SPEC.md was not updated. ` +
      `Review whether schema fields were added or modified.`
    );
  } else if (schemaChanged) {
    pass("SPEC.md updated alongside schema-related changes.");
  }

  // Rule: if new feature folders appeared, ARCHITECTURE.md should reflect them
  const featureDirs = new Set(
    srcChanges
      .filter((f) => f.startsWith("app/web/src/features/"))
      .map((f) => f.split("/")[4])
  );
  const archUpdated = docChanges.some((f) => f.includes("ARCHITECTURE.md"));
  if (featureDirs.size > 0 && !archUpdated) {
    warn(
      `Feature directories touched (${[...featureDirs].join(", ")}) but ARCHITECTURE.md was not updated. ` +
      `Verify the file structure section is still accurate.`
    );
  }
}

// ─── Check 2: ARCHITECTURE.md file structure accuracy ───────────────────

function checkArchitectureAccuracy() {
  console.log("\n── Check 2: ARCHITECTURE.md file structure accuracy ──");

  const arch = readDoc("ARCHITECTURE.md");
  if (!arch) return;

  // Check that all top-level src/ directories are mentioned
  const srcEntries = existsSync(SRC_DIR) ? readdirSync(SRC_DIR) : [];
  for (const entry of srcEntries) {
    const full = join(SRC_DIR, entry);
    if (statSync(full).isDirectory()) {
      if (!arch.includes(entry + "/")) {
        warn(`Directory "src/${entry}/" exists but is not mentioned in ARCHITECTURE.md`);
      } else {
        pass(`src/${entry}/ is documented in ARCHITECTURE.md`);
      }
    }
  }

  // Check that feature subdirectories are listed
  const featuresDir = join(SRC_DIR, "features");
  if (existsSync(featuresDir)) {
    for (const feat of readdirSync(featuresDir)) {
      const full = join(featuresDir, feat);
      if (statSync(full).isDirectory()) {
        if (!arch.includes(feat)) {
          warn(`Feature "${feat}" exists but is not mentioned in ARCHITECTURE.md`);
        } else {
          pass(`Feature "${feat}" is documented`);
        }
      }
    }
  }
}

// ─── Check 3: SPEC.md localStorage key coverage ────────────────────────

function checkSpecLocalStorageKeys() {
  console.log("\n── Check 3: SPEC.md localStorage key coverage ──");

  const spec = readDoc("SPEC.md");
  if (!spec) return;

  // Find all localStorage keys actually used in source
  const allSourceFiles = walkDir(SRC_DIR).filter((f) => f.endsWith(".js"));
  const foundKeys = new Set();

  for (const file of allSourceFiles) {
    const content = readFileSync(file, "utf-8");
    const matches = content.matchAll(/["']workout-app\.[^"']+["']/g);
    for (const m of matches) {
      foundKeys.add(m[0].replace(/["']/g, ""));
    }
  }

  for (const key of foundKeys) {
    if (spec.includes(key)) {
      pass(`localStorage key "${key}" documented in SPEC.md`);
    } else {
      warn(`localStorage key "${key}" found in source but not in SPEC.md`);
    }
  }
}

// ─── Check 4: ONBOARDING.md freshness ──────────────────────────────────

function checkOnboardingFreshness() {
  console.log("\n── Check 4: ONBOARDING.md freshness ──");

  const onboarding = readDoc("ONBOARDING.md");
  if (!onboarding) return;

  const dateMatch = onboarding.match(/Last updated:\s*(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) {
    warn("ONBOARDING.md is missing a 'Last updated' date");
    return;
  }

  const lastUpdated = new Date(dateMatch[1]);
  const now = new Date();
  const daysSince = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));

  if (daysSince > 30) {
    warn(
      `ONBOARDING.md was last updated ${daysSince} days ago (${dateMatch[1]}). ` +
      `Consider reviewing the Current State section.`
    );
  } else {
    pass(`ONBOARDING.md updated ${daysSince} day(s) ago (${dateMatch[1]})`);
  }
}

// ─── Check 5: CHANGELOG.md recency ─────────────────────────────────────

function checkChangelogRecency() {
  console.log("\n── Check 5: CHANGELOG.md recency ──");

  const changelog = readDoc("CHANGELOG.md");
  if (!changelog) return;

  // Find the most recent entry date (normalize CRLF for reliable ^ matching)
  const normalizedLog = changelog.replace(/\r\n/g, "\n");
  const dateMatches = [...normalizedLog.matchAll(/^## (\d{4}-\d{2}-\d{2})/gm)];
  if (dateMatches.length === 0) {
    warn("CHANGELOG.md has no dated entries");
    return;
  }

  // Sort to find the most recent date (don't assume file ordering)
  const sortedDates = dateMatches.map((m) => m[1]).sort().reverse();
  const latestDate = sortedDates[0];
  const latest = new Date(latestDate);
  const now = new Date();
  const daysSince = Math.floor((now - latest) / (1000 * 60 * 60 * 24));

  if (daysSince > 14) {
    warn(
      `CHANGELOG.md latest entry is ${daysSince} days old (${latestDate}). ` +
      `If work has been done since then, it should be logged.`
    );
  } else {
    pass(`CHANGELOG.md latest entry is ${daysSince} day(s) old (${latestDate})`);
  }
}

// ─── Check 6: Key doc files exist ──────────────────────────────────────

function checkRequiredDocsExist() {
  console.log("\n── Check 6: Required documentation files exist ──");

  const required = [
    "VISION.md",
    "SPEC.md",
    "ARCHITECTURE.md",
    "ONBOARDING.md",
    "DECISIONS.md",
    "CHANGELOG.md",
    "REVIEW_PROTOCOL.md",
    "UI_FRAMEWORK.md",
    "SCREEN_CONTRACTS.md",
  ];

  for (const doc of required) {
    if (existsSync(join(DOCS_DIR, doc))) {
      pass(`${doc} exists`);
    } else {
      warn(`Required doc ${doc} is missing`);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────

console.log("╔══════════════════════════════════════════════════╗");
console.log("║      Documentation Freshness Check              ║");
console.log("╚══════════════════════════════════════════════════╝");

checkSourceDocCorrelation();

if (isFull) {
  checkArchitectureAccuracy();
  checkSpecLocalStorageKeys();
}

checkOnboardingFreshness();
checkChangelogRecency();
checkRequiredDocsExist();

console.log("\n══════════════════════════════════════════════════");
console.log(`  Results: ${passes.length} passed, ${warnings.length} warning(s)`);

if (warnings.length > 0) {
  console.log("\n  Warnings:");
  warnings.forEach((w) => console.log(`    • ${w}`));
}

console.log("══════════════════════════════════════════════════\n");

if (isCI && warnings.length > 0) {
  console.error("CI mode: exiting with code 1 due to documentation warnings.");
  process.exit(1);
}
