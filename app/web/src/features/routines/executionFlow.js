import { normalizeRoutineRepTargetMode } from "../../data/schemaMigration.js";

function normalizeBlockSide(side) {
  const normalized = String(side ?? "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "left" || normalized === "right" || normalized === "both" || normalized === "alternating") {
    return normalized;
  }
  return normalized;
}

function isGenericWorkLabel(label) {
  const normalized = String(label ?? "").trim().toLowerCase();
  if (!normalized) return true;
  return (
    /^set\s+\d+$/.test(normalized)
    || /^hold\s+\d+$/.test(normalized)
    || normalized === "work"
    || normalized === "work block"
    || normalized === "work row"
  );
}

function analyzeExecutionMode(blocks = []) {
  const workBlocks = (blocks || []).filter((block) => block.type === "work");
  const sides = workBlocks.map((block) => normalizeBlockSide(block?.side));
  const hasSwitch = (blocks || []).some((block) => block.type === "switch_side");

  if (!workBlocks.length) {
    return "linear";
  }

  const allAlternating = sides.every((side) => side === "alternating");
  if (allAlternating) {
    return "alternating";
  }

  const sideTagged = sides.filter(Boolean);
  const allPairedSides = sideTagged.length === workBlocks.length
    && sideTagged.every((side) => side === "left" || side === "right");
  if (allPairedSides && hasSwitch) {
    return "each_side_then_switch";
  }

  const allLinear = sides.every((side) => !side || side === "both");
  if (allLinear) {
    return "linear";
  }

  return "mixed";
}

function formatSidePrefix(side) {
  if (side === "left") return "Left";
  if (side === "right") return "Right";
  if (side === "both") return "Both sides";
  if (side === "alternating") return "Alternating";
  return "";
}

function toTitleCase(value) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatEffortLabel(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "amrap") return "Max reps";
  if (normalized === "failure") return "To failure";
  return toTitleCase(normalized);
}

export function resolveRepTargetMode(source = {}) {
  const metricType = source?.metricType
    ?? (source?.durationSeconds != null || source?.targetDurationSec != null ? "duration" : "reps");
  return normalizeRoutineRepTargetMode(source?.repTargetMode, {
    metricType,
    reps: source?.reps ?? source?.targetReps ?? null,
    effort: source?.effort,
    defaultExact: true,
  });
}

export function formatRepGoalLabel(source = {}) {
  const metricType = source?.metricType
    ?? (source?.durationSeconds != null || source?.targetDurationSec != null ? "duration" : "reps");
  if (metricType !== "reps") {
    return "";
  }

  const mode = resolveRepTargetMode(source);
  const reps = source?.reps ?? source?.targetReps ?? null;

  if (mode === "max") {
    return "Max reps";
  }
  if (mode === "minimum_plus") {
    return reps != null && reps !== "" ? `${reps}+ reps` : "Max reps";
  }
  if (reps != null && reps !== "") {
    return `${reps} reps`;
  }
  return "Rep block";
}

export function usesOpenEndedRepGoal(source = {}) {
  const mode = resolveRepTargetMode(source);
  return mode === "max" || mode === "minimum_plus";
}

function buildFallbackDisplayTitle(block, mode, logicalIndex) {
  const side = normalizeBlockSide(block?.side);

  if (mode === "each_side_then_switch") {
    return side ? `${formatSidePrefix(side)} side` : "Side";
  }
  if (mode === "alternating") {
    return "Alternating sides";
  }
  if (mode === "linear") {
    return `Set ${logicalIndex}`;
  }
  return `Step ${logicalIndex}`;
}

function resolveDisplayTitle(block, mode, logicalIndex) {
  const explicitLabel = String(block?.label ?? "").trim();
  if (explicitLabel && !isGenericWorkLabel(explicitLabel)) {
    const metricType = String(block?.metricType ?? "").trim().toLowerCase();
    if (metricType === "duration" && /\bhold\b/i.test(explicitLabel)) {
      const side = formatSidePrefix(normalizeBlockSide(block?.side));
      return side ? `${side} timed hold` : "Timed hold";
    }
    return explicitLabel;
  }
  return buildFallbackDisplayTitle(block, mode, logicalIndex);
}

export function buildEntryWorkDisplayMap(blocks = []) {
  const workBlocks = (blocks || []).filter((block) => block.type === "work");
  const mode = analyzeExecutionMode(blocks);
  const displayMap = new Map();

  if (!workBlocks.length) {
    return {
      flowMode: mode,
      totalLogical: 0,
      displayMap,
    };
  }

  if (mode === "each_side_then_switch") {
    const totalLogical = Math.max(
      workBlocks.filter((block) => normalizeBlockSide(block?.side) === "left").length,
      workBlocks.filter((block) => normalizeBlockSide(block?.side) === "right").length,
      1,
    );
    let currentRound = 0;

    workBlocks.forEach((block) => {
      const side = normalizeBlockSide(block?.side);
      if (side === "left" || currentRound === 0) {
        currentRound += 1;
      }
      const logicalIndex = Math.max(1, Math.min(currentRound, totalLogical));
      displayMap.set(block.id, {
        logicalIndex,
        totalLogical,
        displayTitle: resolveDisplayTitle(block, mode, logicalIndex),
        progressLabel: totalLogical > 1 ? `Round ${logicalIndex} of ${totalLogical}` : "",
      });
    });

    return {
      flowMode: mode,
      totalLogical,
      displayMap,
    };
  }

  const totalLogical = workBlocks.length;
  workBlocks.forEach((block, workIndex) => {
    const logicalIndex = workIndex + 1;
    const progressPrefix = mode === "alternating"
      ? "Round"
      : mode === "linear"
        ? "Set"
        : "Step";

    displayMap.set(block.id, {
      logicalIndex,
      totalLogical,
      displayTitle: resolveDisplayTitle(block, mode, logicalIndex),
      progressLabel: totalLogical > 1 ? `${progressPrefix} ${logicalIndex} of ${totalLogical}` : "",
    });
  });

  return {
    flowMode: mode,
    totalLogical,
    displayMap,
  };
}
