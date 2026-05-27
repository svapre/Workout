/**
 * LEGACY MIGRATION ONLY
 * activeState is a deprecated schema pattern.
 * This file is the only permitted location for activeState reads.
 * Do not reference activeState anywhere else in the codebase.
 * Do not extend this pattern.
 *
 * Legacy to locked schema migrations (local-first, idempotent where possible).
 */

import { createId } from "../core/uid.js";

export const PRIMARY_MUSCLE_NAME_TO_BODY_MAP_ID = {
  Core: "bm_core",
  Glutes: "bm_glutes",
  Chest: "bm_chest",
  Back: "bm_back",
  Triceps: "bm_triceps",
  Biceps: "bm_biceps",
  Shoulders: "bm_shoulders",
  Forearms: "bm_forearms",
  "Lower Back": "bm_lower_back",
  Quadriceps: "bm_quads",
  Hamstrings: "bm_hamstrings",
  Calves: "bm_calves",
  "Hip Flexors": "bm_hip_flexors",
  Neck: "bm_neck",
  Lats: "bm_back",
  "Upper Back": "bm_back",
};

export const TRACKING_MODES = ["reps", "duration", "weight", "resistance"];
export const ACTIVITY_DOMAINS = ["physical", "mental"];
export const EXECUTION_UNIT_TYPES = ["rep", "timed", "cycle"];
export const ROUTINE_BLOCK_METRIC_TYPES = ["reps", "duration"];
export const ROUTINE_BLOCK_SIDES = ["left", "right", "both", "alternating"];

function normalizeExecutionUnitType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "rep" || normalized === "repetition" || normalized === "reps") {
    return "rep";
  }
  if (
    normalized === "timed"
    || normalized === "time"
    || normalized === "duration"
    || normalized === "hold"
    || normalized === "session"
  ) {
    return "timed";
  }
  if (
    normalized === "cycle"
    || normalized === "breath"
    || normalized === "round"
    || normalized === "loop"
  ) {
    return "cycle";
  }

  return null;
}

function normalizeRoutineBlockMetricType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized === "duration"
    || normalized === "time"
    || normalized === "timed"
    || normalized === "hold"
    || normalized === "seconds"
  ) {
    return "duration";
  }

  if (
    normalized === "rep"
    || normalized === "reps"
    || normalized === "repetition"
    || normalized === "count"
  ) {
    return "reps";
  }

  return null;
}

export function getRoutineBlockMetricType(block, fallbackTrackingType = "reps") {
  const explicit = normalizeRoutineBlockMetricType(
    block?.metricType ?? block?.targetType ?? block?.metric,
  );
  if (explicit) {
    return explicit;
  }

  const duration = normalizeNumberOrNull(block?.durationSeconds ?? block?.durationSec);
  if (duration != null) {
    return "duration";
  }

  const reps = normalizeNumberOrNull(block?.reps);
  if (reps != null) {
    return "reps";
  }

  return mapTrackingType(fallbackTrackingType) === "duration" ? "duration" : "reps";
}

export function normalizeRoutineEntrySideMode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  if (
    normalized === "each_side_then_switch"
    || normalized === "each_side"
    || normalized === "per_side"
    || normalized === "per-side"
    || normalized === "single_side"
  ) {
    return "each_side_then_switch";
  }

  if (normalized === "alternating" || normalized === "alternate") {
    return "alternating";
  }

  return "";
}

function inferLegacyRoutineEntrySideMode(entry) {
  const explicit = normalizeRoutineEntrySideMode(entry?.sideMode);
  if (explicit) {
    return explicit;
  }

  const notes = String(entry?.notes ?? "").trim().toLowerCase();
  if (notes.startsWith("each side")) {
    return "each_side_then_switch";
  }

  return "";
}

function normalizeRoutineBlockSide(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "left" || normalized === "l") {
    return "left";
  }
  if (normalized === "right" || normalized === "r") {
    return "right";
  }
  if (
    normalized === "both"
    || normalized === "bilateral"
    || normalized === "double"
    || normalized === "together"
  ) {
    return "both";
  }
  if (normalized === "alternating" || normalized === "alternate" || normalized === "alt") {
    return "alternating";
  }

  return null;
}

function inferExerciseExecutionUnitType(raw = {}, trackingType = null) {
  const explicit = normalizeExecutionUnitType(
    raw.executionUnitType ?? raw.executionUnit ?? raw.unitType,
  );
  if (explicit) {
    return explicit;
  }

  const category = String(raw.category ?? "").trim().toLowerCase();
  const movementPattern = String(raw.movementPattern ?? "").trim().toLowerCase();
  const name = String(raw.name ?? "").trim().toLowerCase();
  const resolvedTrackingType = mapTrackingType(trackingType ?? raw.trackingType ?? raw.mode ?? "reps");

  if (
    category === "breathwork"
    || movementPattern.includes("breath")
    || name.includes("breathing")
  ) {
    return "cycle";
  }

  if (resolvedTrackingType === "duration") {
    return "timed";
  }

  return "rep";
}

export function getExerciseExecutionUnitType(exercise) {
  return inferExerciseExecutionUnitType(
    exercise ?? {},
    exercise?.trackingType ?? exercise?.mode ?? "reps",
  );
}

export function getExecutionUnitLabel(value) {
  const normalized = normalizeExecutionUnitType(value) ?? "rep";
  if (normalized === "cycle") {
    return "Cycle-based";
  }
  if (normalized === "timed") {
    return "Timed interval";
  }
  return "Rep-based";
}

function addNormalizedDomain(target, rawValue) {
  const value = String(rawValue ?? "").trim().toLowerCase();
  if (!value) {
    return;
  }

  if (value === "mind-body" || value === "mind_body" || value === "mindbody") {
    addNormalizedDomain(target, "physical");
    addNormalizedDomain(target, "mental");
    return;
  }

  if (ACTIVITY_DOMAINS.includes(value) && !target.includes(value)) {
    target.push(value);
  }
}

function inferExerciseDomains(raw = {}) {
  const type = String(raw.type ?? "").trim().toLowerCase();
  const category = String(raw.category ?? "").trim().toLowerCase();

  if (category === "yoga" || type === "mind-body" || type === "mind_body") {
    return ["physical", "mental"];
  }

  if (
    type === "mental"
    || category === "mental"
    || category === "meditation"
    || category === "breathwork"
  ) {
    return ["mental"];
  }

  return ["physical"];
}

export function normalizeActivityDomains(domains, raw = {}) {
  const normalized = [];
  const rawDomains = Array.isArray(domains)
    ? domains
    : typeof domains === "string"
      ? domains.split(/[|,]/)
      : [];

  rawDomains.forEach((domain) => addNormalizedDomain(normalized, domain));

  if (!normalized.length) {
    inferExerciseDomains(raw).forEach((domain) => addNormalizedDomain(normalized, domain));
  }

  return normalized.length ? normalized : ["physical"];
}

function inferPrimaryDomain(raw = {}, domains = []) {
  const explicit = String(raw.primaryDomain ?? "").trim().toLowerCase();
  if (explicit && domains.includes(explicit)) {
    return explicit;
  }

  const type = String(raw.type ?? "").trim().toLowerCase();
  if (type === "mental" && domains.includes("mental")) {
    return "mental";
  }
  if ((type === "physical" || type === "mobility") && domains.includes("physical")) {
    return "physical";
  }

  return domains[0] ?? "physical";
}

export function getExerciseDomains(exercise) {
  return normalizeActivityDomains(exercise?.domains, exercise ?? {});
}

export function getExercisePrimaryDomain(exercise) {
  const domains = getExerciseDomains(exercise);
  return inferPrimaryDomain(exercise ?? {}, domains);
}

export function isMindBodyExercise(exercise) {
  const domains = getExerciseDomains(exercise);
  return domains.includes("physical") && domains.includes("mental");
}

export function mapTrackingType(mode) {
  const m = String(mode ?? "reps").trim().toLowerCase();
  if (m === "reps-only" || m === "reps") return "reps";
  if (m === "duration") return "duration";
  if (m === "weight") return "weight";
  if (m === "resistance") return "resistance";
  return "reps";
}

export function normalizeTrackingModes(modes, fallbackMode = "reps") {
  const normalized = [];
  const rawModes = Array.isArray(modes)
    ? modes
    : typeof modes === "string"
      ? modes.split(/[|,]/)
      : [];

  rawModes.forEach((mode) => {
    const mapped = mapTrackingType(mode);
    if (!normalized.includes(mapped)) {
      normalized.push(mapped);
    }
  });

  const fallback = mapTrackingType(fallbackMode);
  if (!normalized.includes(fallback)) {
    normalized.unshift(fallback);
  }

  return normalized.filter((mode, index, list) => TRACKING_MODES.includes(mode) && list.indexOf(mode) === index);
}

export function getExerciseSupportedTrackingModes(exercise) {
  return normalizeTrackingModes(
    exercise?.supportedTrackingModes ?? exercise?.supported_tracking_modes,
    exercise?.trackingType ?? exercise?.mode ?? "reps",
  );
}

export function getExerciseDefaultTrackingType(exercise) {
  const fallback = mapTrackingType(exercise?.trackingType ?? exercise?.mode ?? "reps");
  const modes = getExerciseSupportedTrackingModes(exercise);
  return modes.includes(fallback) ? fallback : modes[0] ?? "reps";
}

export function inferRoutineEntryTrackingType(entry, exercise = null) {
  const supportedModes = getExerciseSupportedTrackingModes(exercise);
  const defaultMode = getExerciseDefaultTrackingType(exercise);
  const primaryWorkBlock = getRoutineEntryBlocks(entry).find((block) => block.type === "work") || null;
  const hasWeight = (primaryWorkBlock?.weight ?? entry?.weight) != null && (primaryWorkBlock?.weight ?? entry?.weight) !== "";
  const hasDuration =
    (primaryWorkBlock?.durationSeconds ?? entry?.durationSeconds) != null
    && (primaryWorkBlock?.durationSeconds ?? entry?.durationSeconds) !== "";
  const hasReps = (primaryWorkBlock?.reps ?? entry?.reps) != null && (primaryWorkBlock?.reps ?? entry?.reps) !== "";
  const hasResistance =
    (primaryWorkBlock?.resistance ?? entry?.resistance) != null
    && (primaryWorkBlock?.resistance ?? entry?.resistance) !== "";
  const explicitMode = entry?.trackingType != null ? mapTrackingType(entry.trackingType) : null;

  if (explicitMode && supportedModes.includes(explicitMode)) {
    return explicitMode;
  }
  if (hasWeight && supportedModes.includes("weight")) {
    return "weight";
  }
  if (hasDuration && !hasReps && supportedModes.includes("duration")) {
    return "duration";
  }
  if (hasResistance && supportedModes.includes("resistance")) {
    return "resistance";
  }
  if (hasReps && supportedModes.includes("reps")) {
    return "reps";
  }
  if (hasDuration && supportedModes.includes("duration")) {
    return "duration";
  }
  return defaultMode;
}

export function getExerciseSupportedTestMetrics(exercise) {
  const supportedModes = getExerciseSupportedTrackingModes(exercise);
  const metrics = supportedModes.filter((mode) => mode === "reps" || mode === "duration");
  if (metrics.length) {
    return metrics;
  }

  const fallback = getExerciseDefaultTrackingType(exercise) === "duration" ? "duration" : "reps";
  return [fallback];
}

function hasStructuredValue(value) {
  return value != null && value !== "";
}

export function validateRoutineEntryAgainstExercise(entry, exercise) {
  const supportedModes = getExerciseSupportedTrackingModes(exercise);
  const explicitMode = entry?.trackingType != null ? mapTrackingType(entry.trackingType) : null;
  const workBlocks = getRoutineEntryBlocks(entry).filter((block) => block.type === "work");
  const hasReps = workBlocks.length
    ? workBlocks.some((block) => hasStructuredValue(block.reps))
    : hasStructuredValue(entry?.reps ?? entry?.targetReps);
  const hasDuration = workBlocks.length
    ? workBlocks.some((block) => hasStructuredValue(block.durationSeconds))
    : hasStructuredValue(entry?.durationSeconds ?? entry?.targetDurationSec);
  const hasWeight = workBlocks.length
    ? workBlocks.some((block) => hasStructuredValue(block.weight))
    : hasStructuredValue(entry?.weight ?? entry?.targetWeightKg);
  const hasResistance = workBlocks.length
    ? workBlocks.some((block) => hasStructuredValue(block.resistance))
    : hasStructuredValue(entry?.resistance);
  const issues = [];

  if (explicitMode && !supportedModes.includes(explicitMode)) {
    issues.push({
      code: "UNSUPPORTED_ROUTINE_MODE",
      message: `Tracking mode "${explicitMode}" is not supported by this exercise.`,
    });
  }

  if (hasDuration && (hasReps || hasWeight || hasResistance)) {
    issues.push({
      code: "MULTI_MODE_ROUTINE_ENTRY",
      message: "Routine entries must choose one primary tracking mode at a time.",
    });
  }

  if (hasWeight && hasResistance) {
    issues.push({
      code: "MULTI_LOAD_ROUTINE_ENTRY",
      message: "Routine entries cannot require weight and resistance at the same time.",
    });
  }

  if (hasWeight && !hasReps) {
    issues.push({
      code: "WEIGHT_MODE_REQUIRES_REPS",
      message: "Weight-based routine entries must also define reps.",
    });
  }

  if (hasResistance && !hasReps) {
    issues.push({
      code: "RESISTANCE_MODE_REQUIRES_REPS",
      message: "Resistance-based routine entries must also define reps.",
    });
  }

  const inferredMode = inferRoutineEntryTrackingType(entry, exercise);
  if ((hasReps || hasDuration || hasWeight || hasResistance) && !supportedModes.includes(inferredMode)) {
    issues.push({
      code: "UNSUPPORTED_ROUTINE_PRESCRIPTION",
      message: `This routine entry uses "${inferredMode}" data, but the exercise only supports ${supportedModes.join(", ")}.`,
    });
  }

  if (hasDuration && !supportedModes.includes("duration")) {
    issues.push({
      code: "UNSUPPORTED_DURATION_MODE",
      message: "This exercise does not support duration prescriptions.",
    });
  }

  if (hasWeight && !supportedModes.includes("weight")) {
    issues.push({
      code: "UNSUPPORTED_WEIGHT_MODE",
      message: "This exercise does not support weight prescriptions.",
    });
  }

  if (hasResistance && !supportedModes.includes("resistance")) {
    issues.push({
      code: "UNSUPPORTED_RESISTANCE_MODE",
      message: "This exercise does not support resistance prescriptions.",
    });
  }

  if (explicitMode && hasStructuredValue(inferredMode) && explicitMode !== inferredMode) {
    issues.push({
      code: "ROUTINE_MODE_CONFLICT",
      message: `Tracking mode "${explicitMode}" does not match the entry's configured prescription fields.`,
    });
  }

  return {
    supportedModes,
    inferredMode,
    issues,
  };
}

export function validateMilestoneTestAgainstExercise(test, exercise, routineEntry = null) {
  const normalizedTest = normalizeMilestoneTest(test);
  if (normalizedTest.type !== "exercise" || !exercise) {
    return {
      test: normalizedTest,
      supportedMetrics: [],
      resolvedMetric: normalizedTest.metric,
      issues: [],
    };
  }

  const supportedModes = getExerciseSupportedTrackingModes(exercise);
  const supportedMetrics = getExerciseSupportedTestMetrics(exercise);
  const inferredMetric = routineEntry?.durationSeconds != null
    ? "duration"
    : getExerciseDefaultTrackingType(exercise) === "duration"
      ? "duration"
      : "reps";
  const issues = [];

  if (normalizedTest.metric && !supportedMetrics.includes(normalizedTest.metric)) {
    issues.push({
      code: "UNSUPPORTED_MILESTONE_METRIC",
      message: `Milestone metric "${normalizedTest.metric}" is not supported by this exercise.`,
    });
  }

  if (normalizedTest.weight != null && !supportedModes.includes("weight")) {
    issues.push({
      code: "UNSUPPORTED_MILESTONE_WEIGHT",
      message: "This exercise does not support weight-constrained milestone tests.",
    });
  }

  if (normalizedTest.resistance != null && !supportedModes.includes("resistance")) {
    issues.push({
      code: "UNSUPPORTED_MILESTONE_RESISTANCE",
      message: "This exercise does not support resistance-constrained milestone tests.",
    });
  }

  if (normalizedTest.weight != null && normalizedTest.resistance != null) {
    issues.push({
      code: "MULTI_LOAD_MILESTONE_TEST",
      message: "Milestone tests cannot require weight and resistance at the same time.",
    });
  }

  const resolvedMetric = supportedMetrics.includes(normalizedTest.metric)
    ? normalizedTest.metric
    : supportedMetrics.includes(inferredMetric)
      ? inferredMetric
      : supportedMetrics[0];

  return {
    test: {
      ...normalizedTest,
      metric: resolvedMetric ?? normalizedTest.metric,
    },
    supportedMetrics,
    resolvedMetric,
    issues,
  };
}

export function mapExerciseTypeFromCategory(category) {
  const c = String(category ?? "").toLowerCase();
  if (c === "rehab" || c === "mobility") return "mobility";
  if (c === "mental") return "mental";
  if (c === "custom") return "custom";
  return "physical";
}

function mapPrimaryMusclesToBodyTargets(primaryMuscles) {
  if (!Array.isArray(primaryMuscles)) return [];
  const ids = [];
  for (const name of primaryMuscles) {
    const id = PRIMARY_MUSCLE_NAME_TO_BODY_MAP_ID[name];
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function normalizeEquipmentArray(equipment) {
  if (Array.isArray(equipment)) return equipment.map(String);
  if (equipment == null || equipment === "") return [];
  return [String(equipment)];
}

function normalizeNumberOrNull(value) {
  if (value == null || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeRoutineEntryBlockType(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "rest") return "rest";
  if (raw === "switch_side" || raw === "switch-side" || raw === "switch side") return "switch_side";
  return "work";
}

function normalizeRoutineBlockTempoMode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "cadence" || normalized === "per_rep" || normalized === "per-rep") {
    return "cadence";
  }
  if (
    normalized === "phased"
    || normalized === "phases"
    || normalized === "phase"
    || normalized === "four_phase"
    || normalized === "4-phase"
  ) {
    return "phased";
  }
  return null;
}

function formatTempoPart(value) {
  if (!Number.isFinite(Number(value))) {
    return "";
  }
  const numeric = Number(value);
  return Number.isInteger(numeric)
    ? String(numeric)
    : String(Number(numeric.toFixed(1)));
}

function resolveRoutineBlockTempoMode(block) {
  const explicit = normalizeRoutineBlockTempoMode(block?.tempoMode);
  if (explicit) {
    return explicit;
  }

  const cadence = normalizeNumberOrNull(
    block?.tempoSecondsPerRep ?? block?.secondsPerRep ?? block?.cadenceSeconds,
  );
  if (cadence != null) {
    return "cadence";
  }

  const phasedParts = [
    block?.tempoDownSeconds ?? block?.downSeconds ?? block?.eccentricSeconds,
    block?.tempoBottomHoldSeconds ?? block?.bottomHoldSeconds ?? block?.pauseBottomSeconds,
    block?.tempoUpSeconds ?? block?.upSeconds ?? block?.concentricSeconds,
    block?.tempoTopHoldSeconds ?? block?.topHoldSeconds ?? block?.pauseTopSeconds,
  ].map((value) => normalizeNumberOrNull(value));

  if (phasedParts.some((value) => value != null)) {
    return "phased";
  }

  return null;
}

export function getRoutineBlockTempoPresentation(block) {
  const label = block?.tempoLabel == null || block?.tempoLabel === ""
    ? block?.tempo == null || block?.tempo === ""
      ? ""
      : String(block.tempo).trim()
    : String(block.tempoLabel).trim();
  const mode = resolveRoutineBlockTempoMode(block);

  if (mode === "cadence") {
    const secondsPerRep = normalizeNumberOrNull(
      block?.tempoSecondsPerRep ?? block?.secondsPerRep ?? block?.cadenceSeconds,
    );
    if (secondsPerRep != null) {
      const value = `${formatTempoPart(secondsPerRep)}s`;
      return {
        mode,
        toneLabel: label || "",
        steps: [{ kind: "cadence", label: "Each rep", value }],
        summary: `Each rep ${value}`,
      };
    }
  } else if (mode === "phased") {
    const parts = [
      normalizeNumberOrNull(block?.tempoDownSeconds ?? block?.downSeconds ?? block?.eccentricSeconds),
      normalizeNumberOrNull(block?.tempoBottomHoldSeconds ?? block?.bottomHoldSeconds ?? block?.pauseBottomSeconds),
      normalizeNumberOrNull(block?.tempoUpSeconds ?? block?.upSeconds ?? block?.concentricSeconds),
      normalizeNumberOrNull(block?.tempoTopHoldSeconds ?? block?.topHoldSeconds ?? block?.pauseTopSeconds),
    ];
    const lastIndex = parts.reduce((found, value, index) => (value != null ? index : found), -1);
    if (lastIndex >= 0) {
      const phaseDefinitions = [
        { kind: "down", label: "Down" },
        { kind: "bottom_hold", label: "Bottom hold" },
        { kind: "up", label: "Up" },
        { kind: "top_hold", label: "Top hold" },
      ];
      const steps = phaseDefinitions.slice(0, lastIndex + 1).map((definition, index) => ({
        ...definition,
        value: `${formatTempoPart(parts[index] ?? 0)}s`,
      }));
      return {
        mode,
        toneLabel: label || "",
        steps,
        summary: steps.map((step) => `${step.label} ${step.value}`).join(" / "),
      };
    }
  }

  if (label) {
    return {
      mode: null,
      toneLabel: label,
      steps: [{ kind: "label", label: "Tempo", value: label }],
      summary: label,
    };
  }

  return null;
}

export function getRoutineBlockTempoSummary(block) {
  return getRoutineBlockTempoPresentation(block)?.summary || "";
}

const ROUTINE_REP_TARGET_MODES = new Set(["exact", "max", "minimum_plus"]);

function normalizeRoutineBlockEffort(value, { metricType = "reps" } = {}) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "amrap" && metricType === "reps") {
    return null;
  }
  return normalized;
}

export function normalizeRoutineRepTargetMode(value, options = {}) {
  const metricType = String(options.metricType ?? "reps").trim().toLowerCase();
  if (metricType !== "reps") {
    return null;
  }

  const normalized = String(value ?? "").trim().toLowerCase();
  if (ROUTINE_REP_TARGET_MODES.has(normalized)) {
    return normalized;
  }

  const legacyEffort = String(options.effort ?? "").trim().toLowerCase();
  if (legacyEffort === "amrap") {
    const reps = normalizeNumberOrNull(options.reps);
    return reps != null && reps > 0 ? "minimum_plus" : "max";
  }

  return options.defaultExact ? "exact" : null;
}

function normalizeRoutineEntryBlock(block, index = 0) {
  if (!block || typeof block !== "object") {
    return null;
  }

  const type = normalizeRoutineEntryBlockType(block.type);
  const metricType = type === "work" ? getRoutineBlockMetricType(block) : null;
  const side = normalizeRoutineBlockSide(block.side ?? block.toSide ?? block.targetSide);
  const label = String(block.label ?? "").trim();
  const notes = String(block.notes ?? "").trim();
  const reps = normalizeNumberOrNull(block.reps);
  const effort = normalizeRoutineBlockEffort(block.effort, { metricType });
  const normalized = {
    id: block.id ?? createId("entry_block"),
    type,
    label,
    metricType,
    side,
    repTargetMode:
      type === "work"
        ? normalizeRoutineRepTargetMode(block.repTargetMode, {
          metricType,
          reps,
          effort: block.effort,
          defaultExact: true,
        })
        : null,
    reps,
    durationSeconds: normalizeNumberOrNull(block.durationSeconds ?? block.durationSec),
    weight: normalizeNumberOrNull(block.weight ?? block.weightKg),
    resistance: block.resistance == null || block.resistance === "" ? null : String(block.resistance),
    seconds: normalizeNumberOrNull(block.seconds ?? block.restSeconds),
    holdSeconds: normalizeNumberOrNull(block.holdSeconds ?? block.holdSec),
    tempoMode: type === "work" ? resolveRoutineBlockTempoMode(block) : null,
    tempoSecondsPerRep: normalizeNumberOrNull(
      block.tempoSecondsPerRep ?? block.secondsPerRep ?? block.cadenceSeconds,
    ),
    tempoDownSeconds: normalizeNumberOrNull(
      block.tempoDownSeconds ?? block.downSeconds ?? block.eccentricSeconds,
    ),
    tempoBottomHoldSeconds: normalizeNumberOrNull(
      block.tempoBottomHoldSeconds ?? block.bottomHoldSeconds ?? block.pauseBottomSeconds,
    ),
    tempoUpSeconds: normalizeNumberOrNull(
      block.tempoUpSeconds ?? block.upSeconds ?? block.concentricSeconds,
    ),
    tempoTopHoldSeconds: normalizeNumberOrNull(
      block.tempoTopHoldSeconds ?? block.topHoldSeconds ?? block.pauseTopSeconds,
    ),
    tempoLabel:
      block.tempoLabel == null || block.tempoLabel === ""
        ? block.tempo == null || block.tempo === ""
          ? null
          : String(block.tempo).trim()
        : String(block.tempoLabel).trim(),
    effort,
    notes,
    order: Number.isFinite(Number(block.order)) ? Number(block.order) : index + 1,
  };

  if (type === "rest") {
    return {
      ...normalized,
      label: normalized.label || "Rest",
      metricType: null,
      side: null,
      repTargetMode: null,
      seconds: normalized.seconds ?? 0,
      reps: null,
      durationSeconds: null,
      weight: null,
      resistance: null,
      holdSeconds: null,
      tempoMode: null,
      tempoSecondsPerRep: null,
      tempoDownSeconds: null,
      tempoBottomHoldSeconds: null,
      tempoUpSeconds: null,
      tempoTopHoldSeconds: null,
      tempoLabel: null,
      effort: null,
    };
  }

  if (type === "switch_side") {
    return {
      ...normalized,
      label: normalized.label || (normalized.side ? `Switch to ${normalized.side} side` : "Switch sides"),
      metricType: null,
      repTargetMode: null,
      seconds: null,
      reps: null,
      durationSeconds: null,
      weight: null,
      resistance: null,
      holdSeconds: null,
      tempoMode: null,
      tempoSecondsPerRep: null,
      tempoDownSeconds: null,
      tempoBottomHoldSeconds: null,
      tempoUpSeconds: null,
      tempoTopHoldSeconds: null,
      tempoLabel: null,
      effort: null,
    };
  }

  return {
    ...normalized,
    label: normalized.label || `Set ${index + 1}`,
    seconds: null,
  };
}

export function normalizeRoutineEntryBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    return [];
  }

  return blocks
    .map((block, index) => normalizeRoutineEntryBlock(block, index))
    .filter(Boolean)
    .sort((left, right) => Number(left.order ?? 0) - Number(right.order ?? 0));
}

export function getRoutineEntryBlocks(entry) {
  const explicit = normalizeRoutineEntryBlocks(entry?.entryBlocks ?? entry?.blocks);
  if (explicit.length) {
    return explicit;
  }

  const setCount = Math.max(1, Number(entry?.sets ?? entry?.targetSets ?? 1) || 1);
  const restSeconds = normalizeNumberOrNull(entry?.restSeconds ?? entry?.restSec) ?? 0;
  const sideMode = inferLegacyRoutineEntrySideMode(entry);
  const metricType = getRoutineBlockMetricType(entry, entry?.trackingType ?? entry?.mode ?? "reps");
  const reps = normalizeNumberOrNull(entry?.reps ?? entry?.targetReps);
  const baseWork = {
    metricType,
    repTargetMode:
      metricType === "reps"
        ? normalizeRoutineRepTargetMode(entry?.repTargetMode, {
          metricType,
          reps,
          effort: entry?.effort,
          defaultExact: true,
        })
        : null,
    reps,
    durationSeconds: normalizeNumberOrNull(entry?.durationSeconds ?? entry?.targetDurationSec),
    weight: normalizeNumberOrNull(entry?.weight ?? entry?.targetWeightKg),
    resistance:
      entry?.resistance == null || entry?.resistance === "" ? null : String(entry.resistance),
    seconds: null,
    holdSeconds: null,
    tempoMode: resolveRoutineBlockTempoMode(entry),
    tempoSecondsPerRep: normalizeNumberOrNull(
      entry?.tempoSecondsPerRep ?? entry?.secondsPerRep ?? entry?.cadenceSeconds,
    ),
    tempoDownSeconds: normalizeNumberOrNull(
      entry?.tempoDownSeconds ?? entry?.downSeconds ?? entry?.eccentricSeconds,
    ),
    tempoBottomHoldSeconds: normalizeNumberOrNull(
      entry?.tempoBottomHoldSeconds ?? entry?.bottomHoldSeconds ?? entry?.pauseBottomSeconds,
    ),
    tempoUpSeconds: normalizeNumberOrNull(
      entry?.tempoUpSeconds ?? entry?.upSeconds ?? entry?.concentricSeconds,
    ),
    tempoTopHoldSeconds: normalizeNumberOrNull(
      entry?.tempoTopHoldSeconds ?? entry?.topHoldSeconds ?? entry?.pauseTopSeconds,
    ),
    tempoLabel:
      entry?.tempoLabel == null || entry?.tempoLabel === ""
        ? entry?.tempo == null || entry?.tempo === ""
          ? null
          : String(entry.tempo).trim()
        : String(entry.tempoLabel).trim(),
    effort: normalizeRoutineBlockEffort(entry?.effort, { metricType }),
    notes: "",
  };
  const blocks = [];

  const pushWorkBlock = ({ label, side = null }) => {
    blocks.push({
      id: `auto-work-${blocks.length + 1}`,
      type: "work",
      label,
      side,
      ...baseWork,
      order: blocks.length + 1,
    });
  };

  const pushRestBlock = () => {
    blocks.push({
      id: `auto-rest-${blocks.length + 1}`,
      type: "rest",
      label: "Rest",
      metricType: null,
      side: null,
      repTargetMode: null,
      reps: null,
      durationSeconds: null,
      weight: null,
      resistance: null,
      seconds: restSeconds,
      holdSeconds: null,
      tempoMode: null,
      tempoSecondsPerRep: null,
      tempoDownSeconds: null,
      tempoBottomHoldSeconds: null,
      tempoUpSeconds: null,
      tempoTopHoldSeconds: null,
      tempoLabel: null,
      effort: null,
      notes: "",
      order: blocks.length + 1,
    });
  };

  for (let index = 0; index < setCount; index += 1) {
    if (sideMode === "each_side_then_switch") {
      pushWorkBlock({ label: `Set ${index + 1}`, side: "left" });
      blocks.push({
        id: `auto-switch-${blocks.length + 1}`,
        type: "switch_side",
        label: "Switch to right side",
        metricType: null,
        side: "right",
        repTargetMode: null,
        reps: null,
        durationSeconds: null,
        weight: null,
        resistance: null,
        seconds: null,
        holdSeconds: null,
        tempoLabel: null,
        effort: null,
        notes: "",
        order: blocks.length + 1,
      });
      pushWorkBlock({ label: `Set ${index + 1}`, side: "right" });
    } else {
      pushWorkBlock({
        label: `Set ${index + 1}`,
        side: sideMode === "alternating" ? "alternating" : null,
      });
    }

    if (index < setCount - 1 && restSeconds > 0) {
      pushRestBlock();
    }
  }

  return blocks;
}

function createInitialStageHistory(stages, currentStageIndex, startedAt) {
  const stage = stages?.[currentStageIndex] ?? null;
  if (!stage?.id) return [];

  return [
    {
      stageId: stage.id,
      stageName: stage.name ?? `Stage ${currentStageIndex + 1}`,
      startedAt,
      completedAt: null,
      completedVia: null,
      failureCount: 0,
    },
  ];
}

function normalizeStageHistory({ currentStageIndex, startedAt, stageHistory, stages }) {
  return Array.isArray(stageHistory) && stageHistory.length
    ? stageHistory
    : createInitialStageHistory(stages, currentStageIndex, startedAt);
}

function normalizeVersionHistory(versionHistory, fallbackEntry) {
  return Array.isArray(versionHistory) && versionHistory.length
    ? versionHistory
    : [fallbackEntry];
}

function normalizeMilestoneTarget(rawTarget, fallback = 1) {
  if (rawTarget == null || rawTarget === "") {
    return fallback;
  }

  const numeric = Number(rawTarget);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeMilestoneMetric(metric) {
  if (metric === "duration" || metric === "reps") {
    return metric;
  }
  return null;
}

function normalizeMilestoneAction(action) {
  if (action === "restart_stage" || action === "goto_stage" || action === "none") {
    return action;
  }
  return "none";
}

function normalizeMilestoneFailure(onFailure) {
  return {
    action: normalizeMilestoneAction(onFailure?.action),
    targetStageId: onFailure?.targetStageId ?? null,
  };
}

function normalizeMilestoneFeedbackPrompt(prompt, index = 0) {
  const raw = prompt && typeof prompt === "object" ? prompt : {};
  const label = String(raw.label ?? raw.prompt ?? "").trim();

  return {
    id: raw.id ?? `feedback_${index + 1}`,
    label: label || `Feedback prompt ${index + 1}`,
    placeholder: String(raw.placeholder ?? raw.helpText ?? "").trim(),
  };
}

function normalizeMilestoneFeedbackPrompts(prompts) {
  if (!Array.isArray(prompts)) {
    return [];
  }

  return prompts
    .map((prompt, index) => normalizeMilestoneFeedbackPrompt(prompt, index))
    .filter(Boolean);
}

function normalizeWorkoutFeedbackResponse(response, index = 0) {
  const raw = response && typeof response === "object" ? response : {};
  const promptId = String(raw.promptId ?? raw.id ?? `feedback_${index + 1}`).trim();
  const label = String(raw.label ?? raw.promptLabel ?? raw.prompt ?? "").trim();
  const value = String(raw.response ?? raw.value ?? "").trim();

  if (!label && !value) {
    return null;
  }

  return {
    promptId: promptId || `feedback_${index + 1}`,
    label: label || `Feedback ${index + 1}`,
    response: value,
  };
}

function normalizeWorkoutFeedbackResponses(responses) {
  if (!Array.isArray(responses)) {
    return [];
  }

  return responses
    .map((response, index) => normalizeWorkoutFeedbackResponse(response, index))
    .filter((response) => response && response.response);
}

export function createDefaultMilestone(overrides = {}) {
  const base = {
    description: "",
    eligibility: {
      type: "cycles",
      target: 1,
      requiresContinuous: false,
    },
    test: {
      type: "none",
      source: "custom",
      exerciseId: null,
      metric: null,
      target: null,
      routineId: null,
      routineEntryId: null,
      weight: null,
      resistance: null,
      restSeconds: null,
      notes: "",
    },
    onFailure: {
      action: "none",
      targetStageId: null,
    },
    feedbackPrompts: [],
  };

  return {
    ...base,
    ...overrides,
    eligibility: {
      ...base.eligibility,
      ...(overrides.eligibility || {}),
    },
    test: {
      ...base.test,
      ...(overrides.test || {}),
    },
    onFailure: {
      ...base.onFailure,
      ...(overrides.onFailure || {}),
    },
    feedbackPrompts: normalizeMilestoneFeedbackPrompts(
      overrides.feedbackPrompts ?? base.feedbackPrompts,
    ),
  };
}

function normalizeMilestoneEligibility(eligibility) {
  const raw = eligibility && typeof eligibility === "object" ? eligibility : {};
  const type = raw.type === "sessions" || raw.type === "none" ? raw.type : "cycles";

  return {
    type,
    target: type === "none" ? null : normalizeMilestoneTarget(raw.target, 1),
    requiresContinuous: Boolean(raw.requiresContinuous),
  };
}

function normalizeMilestoneTest(test) {
  const raw = test && typeof test === "object" ? test : {};
  const type = raw.type === "exercise" ? "exercise" : "none";
  const weight = raw.weight == null || raw.weight === "" ? null : Number(raw.weight);
  const restSeconds = raw.restSeconds == null || raw.restSeconds === "" ? null : Number(raw.restSeconds);

  return {
    type,
    source: raw.source === "stage_entry" ? "stage_entry" : "custom",
    exerciseId: raw.exerciseId ?? null,
    metric: normalizeMilestoneMetric(raw.metric),
    target: type === "exercise" ? normalizeMilestoneTarget(raw.target, 1) : null,
    routineId: raw.routineId ?? null,
    routineEntryId: raw.routineEntryId ?? null,
    weight: Number.isFinite(weight) ? weight : null,
    resistance: raw.resistance ?? null,
    restSeconds: Number.isFinite(restSeconds) ? restSeconds : null,
    notes: raw.notes ?? "",
  };
}

export function migrateExercise(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const trackingType = mapTrackingType(raw.trackingType ?? raw.mode);
  const description = raw.description ?? raw.summary ?? "";
  const equipment = normalizeEquipmentArray(raw.equipment);
  const bodyTargets =
    Array.isArray(raw.bodyTargets) && raw.bodyTargets.length
      ? [...raw.bodyTargets]
      : mapPrimaryMusclesToBodyTargets(raw.primaryMuscles);
  const supportedTrackingModes = normalizeTrackingModes(
    raw.supportedTrackingModes ?? raw.supported_tracking_modes,
    trackingType,
  );
  const domains = normalizeActivityDomains(raw.domains, raw);
  const primaryDomain = inferPrimaryDomain(raw, domains);

  const next = {
    ...raw,
    slug: raw.slug ?? "",
    name: raw.name ?? "",
    description,
    type: raw.type ?? mapExerciseTypeFromCategory(raw.category),
    primaryDomain,
    domains,
    trackingType,
    executionUnitType: inferExerciseExecutionUnitType(raw, trackingType),
    supportedTrackingModes,
    bodyTargets,
    equipment,
    cues: Array.isArray(raw.cues) ? raw.cues : [],
    restSeconds: Number.isFinite(Number(raw.restSeconds)) ? Number(raw.restSeconds) : 60,
    aliases: Array.isArray(raw.aliases) ? raw.aliases : [],
    movementPattern: raw.movementPattern ?? "",
    whyItHelps: raw.whyItHelps ?? "",
    isCustom: Boolean(raw.isCustom),
  };

  delete next.mode;
  delete next.summary;
  delete next.supported_tracking_modes;
  return next;
}

function resolveExerciseIdFromCatalog(entry, catalog) {
  if (entry.exerciseId) return entry.exerciseId;
  const slug = (entry.exerciseSlug || "").trim().toLowerCase();
  if (!slug || !catalog?.length) return entry.exerciseId || "";
  const found = catalog.find(
    (exercise) => exercise.slug === slug || String(exercise.slug).toLowerCase() === slug,
  );
  return found?.id ?? "";
}

export function migrateRoutineEntry(entry, catalog) {
  if (!entry || typeof entry !== "object") return entry;

  let exerciseId = entry.exerciseId || "";
  if (!exerciseId && catalog) exerciseId = resolveExerciseIdFromCatalog(entry, catalog);
  const entryBlocks = normalizeRoutineEntryBlocks(entry.entryBlocks ?? entry.blocks);

  if ("sets" in entry && !("targetSets" in entry)) {
    return {
      id: entry.id,
      exerciseId,
      order: entry.order,
      sets: entry.sets ?? 0,
      reps: entry.reps ?? null,
      repTargetMode: normalizeRoutineRepTargetMode(entry.repTargetMode, {
        metricType: getRoutineBlockMetricType(entry, entry?.trackingType ?? entry?.mode ?? "reps"),
        reps: entry.reps ?? entry.targetReps ?? null,
        effort: entry.effort,
        defaultExact: true,
      }),
      durationSeconds: entry.durationSeconds ?? null,
      weight: entry.weight ?? null,
      resistance: entry.resistance ?? null,
      restSeconds: normalizeNumberOrNull(entry.restSeconds ?? entry.restSec),
      sideMode: inferLegacyRoutineEntrySideMode(entry),
      tempoMode: resolveRoutineBlockTempoMode(entry),
      tempoSecondsPerRep: normalizeNumberOrNull(
        entry?.tempoSecondsPerRep ?? entry?.secondsPerRep ?? entry?.cadenceSeconds,
      ),
      tempoDownSeconds: normalizeNumberOrNull(
        entry?.tempoDownSeconds ?? entry?.downSeconds ?? entry?.eccentricSeconds,
      ),
      tempoBottomHoldSeconds: normalizeNumberOrNull(
        entry?.tempoBottomHoldSeconds ?? entry?.bottomHoldSeconds ?? entry?.pauseBottomSeconds,
      ),
      tempoUpSeconds: normalizeNumberOrNull(
        entry?.tempoUpSeconds ?? entry?.upSeconds ?? entry?.concentricSeconds,
      ),
      tempoTopHoldSeconds: normalizeNumberOrNull(
        entry?.tempoTopHoldSeconds ?? entry?.topHoldSeconds ?? entry?.pauseTopSeconds,
      ),
      tempoLabel: String(entry.tempoLabel ?? entry.tempo ?? "").trim() || null,
      transitionAfterSeconds: normalizeNumberOrNull(
        entry.transitionAfterSeconds ?? entry.transitionSec,
      ),
      transitionLabel: String(entry.transitionLabel ?? entry.transitionCue ?? "").trim(),
      entryBlocks,
      notes: entry.notes ?? "",
    };
  }

  return {
    id: entry.id,
    exerciseId,
    order: entry.order,
    sets: entry.sets ?? entry.targetSets ?? 0,
    reps: entry.reps ?? entry.targetReps ?? null,
    repTargetMode: normalizeRoutineRepTargetMode(entry.repTargetMode, {
      metricType: getRoutineBlockMetricType(entry, entry?.trackingType ?? entry?.mode ?? "reps"),
      reps: entry.reps ?? entry.targetReps ?? null,
      effort: entry.effort,
      defaultExact: true,
    }),
    durationSeconds: entry.durationSeconds ?? entry.targetDurationSec ?? null,
    weight: entry.weight ?? entry.targetWeightKg ?? null,
    resistance: entry.resistance ?? null,
    restSeconds: normalizeNumberOrNull(entry.restSeconds ?? entry.restSec),
    sideMode: inferLegacyRoutineEntrySideMode(entry),
    tempoMode: resolveRoutineBlockTempoMode(entry),
    tempoSecondsPerRep: normalizeNumberOrNull(
      entry?.tempoSecondsPerRep ?? entry?.secondsPerRep ?? entry?.cadenceSeconds,
    ),
    tempoDownSeconds: normalizeNumberOrNull(
      entry?.tempoDownSeconds ?? entry?.downSeconds ?? entry?.eccentricSeconds,
    ),
    tempoBottomHoldSeconds: normalizeNumberOrNull(
      entry?.tempoBottomHoldSeconds ?? entry?.bottomHoldSeconds ?? entry?.pauseBottomSeconds,
    ),
    tempoUpSeconds: normalizeNumberOrNull(
      entry?.tempoUpSeconds ?? entry?.upSeconds ?? entry?.concentricSeconds,
    ),
    tempoTopHoldSeconds: normalizeNumberOrNull(
      entry?.tempoTopHoldSeconds ?? entry?.topHoldSeconds ?? entry?.pauseTopSeconds,
    ),
    tempoLabel: String(entry.tempoLabel ?? entry.tempo ?? "").trim() || null,
    transitionAfterSeconds: normalizeNumberOrNull(
      entry.transitionAfterSeconds ?? entry.transitionSec,
    ),
    transitionLabel: String(entry.transitionLabel ?? entry.transitionCue ?? "").trim(),
    entryBlocks,
    notes: entry.notes ?? "",
  };
}

export function migrateRoutine(raw, catalog) {
  if (!raw || typeof raw !== "object") return raw;
  const sourceEntries = raw.entries ?? raw.exercises ?? [];
  const entries = sourceEntries.map((entry) => migrateRoutineEntry(entry, catalog));

  const notes = raw.notes ?? "";
  const next = {
    ...raw,
    description: raw.description ?? notes,
    notes,
    isCustom: Boolean(raw.isCustom),
    entries,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    difficultyScore: raw.difficultyScore ?? 1,
  };

  delete next.exercises;
  return next;
}

function mapMilestoneType(type) {
  if (type === "manual" || type === "consistency") return "cycles";
  if (type === "exercise" || type === "exercise_target") return "exercise_target";
  if (type === "sessions") return "sessions";
  if (type === "cycles") return "cycles";
  return "cycles";
}

function migrateMilestone(milestone) {
  const ms = milestone && typeof milestone === "object" ? milestone : {};

  if (ms.type === "manual") {
    return createDefaultMilestone({
      description: ms.description ?? "",
      eligibility: {
        type: "none",
        target: null,
        requiresContinuous: false,
      },
      onFailure: normalizeMilestoneFailure(ms.onFailure),
      feedbackPrompts: normalizeMilestoneFeedbackPrompts(ms.feedbackPrompts),
    });
  }

  if (ms.eligibility || ms.test) {
    return createDefaultMilestone({
      description: ms.description ?? "",
      eligibility: normalizeMilestoneEligibility(ms.eligibility),
      test: normalizeMilestoneTest(ms.test),
      onFailure: normalizeMilestoneFailure(ms.onFailure),
      feedbackPrompts: normalizeMilestoneFeedbackPrompts(ms.feedbackPrompts),
    });
  }

  const type = mapMilestoneType(ms.type);
  const exerciseId = ms.exerciseId ?? ms.targetExerciseId ?? null;
  const requiresContinuous = Boolean(ms.requiresContinuous) || ms.type === "consistency";
  const target = normalizeMilestoneTarget(ms.target ?? ms.targetValue, 1);
  const onFailure = normalizeMilestoneFailure(ms.onFailure);

  if (type === "exercise_target") {
    return createDefaultMilestone({
      description: ms.description ?? "",
      eligibility: {
        type: "none",
        target: null,
        requiresContinuous: false,
      },
      test: {
        type: "exercise",
        source: "custom",
        exerciseId,
        metric: normalizeMilestoneMetric(ms.metric),
        target,
      },
      onFailure,
      feedbackPrompts: normalizeMilestoneFeedbackPrompts(ms.feedbackPrompts),
    });
  }

  return createDefaultMilestone({
    description: ms.description ?? "",
    eligibility: {
      type,
      target,
      requiresContinuous,
    },
    onFailure,
    feedbackPrompts: normalizeMilestoneFeedbackPrompts(ms.feedbackPrompts),
  });
}

export function migrateScheduleEntry(entry) {
  if (entry && (entry.type === "routine" || entry.type === "rest")) {
    const routineId = entry.routineId || null;
    if (entry.type === "rest" || !routineId) {
      return { type: "rest", routineId: null };
    }
    return { type: "routine", routineId };
  }

  const routineId = entry?.routineId || null;
  const type = routineId ? "routine" : "rest";
  return { type, routineId: type === "routine" ? routineId : null };
}

export function migrateSchedule(schedule) {
  if (!Array.isArray(schedule)) return [];
  return schedule.map((entry) => migrateScheduleEntry(entry));
}

export function migrateStage(stage) {
  if (!stage || typeof stage !== "object") return stage;
  return {
    ...stage,
    guidance: stage.guidance ?? stage.summary ?? stage.focus ?? "",
    predecessorStageId: stage.predecessorStageId ?? null,
    schedule: migrateSchedule(stage.schedule || []),
    milestone: migrateMilestone(stage.milestone || {}),
    transitionRule: stage.transitionRule === "manual" ? "manual" : "prompt_user",
  };
}

export function joinGoals(goals) {
  if (goals == null) return "";
  if (typeof goals === "string") return goals;
  if (!Array.isArray(goals)) return "";
  return goals
    .map((goal) => (typeof goal === "string" ? goal : goal?.title ?? ""))
    .filter(Boolean)
    .join("; ");
}

function normalizeTheme(theme) {
  const resolved = theme && typeof theme === "object" ? theme : {};
  const rawIcon = String(resolved.icon ?? "PL");
  const sanitizedIcon = /Ã°|ð/.test(rawIcon) ? "PL" : rawIcon;

  return {
    color: resolved.color || "#4FD1C5",
    icon: sanitizedIcon || "PL",
    code: resolved.code || "PLN",
  };
}

export function migrateBlueprint(plan) {
  if (!plan || typeof plan !== "object") return plan;
  const goal = plan.goal != null ? String(plan.goal) : joinGoals(plan.goals);
  const next = {
    id: plan.id,
    version: plan.version ?? "1.0",
    name: plan.name ?? "",
    description: plan.description ?? "",
    goal,
    theme: plan.theme ?? { color: "#4FD1C5", icon: "ðŸ’ª", code: "PLN" },
    createdAt: plan.createdAt ?? new Date().toISOString(),
    stages: (plan.stages || []).map(migrateStage),
  };

  next.theme = normalizeTheme(next.theme);
  delete next.goals;
  delete next.updatedAt;
  return next;
}

export function migrateActivePlan(plan) {
  if (!plan || typeof plan !== "object") return plan;

  const as = plan.activeState || {};
  const hasLegacyActiveState = Boolean(plan.activeState);
  const startedAt = plan.startedAt || plan.activatedAt || as.startDate || new Date().toISOString();
  const currentStageIndex = hasLegacyActiveState
    ? as.currentStageIndex ?? plan.currentStageIndex ?? 0
    : plan.currentStageIndex ?? 0;
  const name = plan.name || plan.displayName || "Active Plan";
  const displayName = plan.displayName || name;
  const stages = (plan.stages || []).map(migrateStage);
  const version = plan.version ?? "1.0";

  const next = {
    id: plan.id,
    name,
    displayName,
    description: plan.description ?? "",
    goal: plan.goal != null ? String(plan.goal) : joinGoals(plan.goals),
    theme: plan.theme ?? { color: "#4FD1C5", icon: "ðŸ’ª", code: "PLN" },
    version,
    versionHistory: normalizeVersionHistory(plan.versionHistory, {
      version,
      modifiedAt: startedAt,
      modifiedBy: "user",
      changeSummary: "Migrated active plan",
    }),
    blueprintId: plan.blueprintId ?? plan.templateId ?? null,
    blueprintVersion: plan.blueprintVersion ?? "1.0",
    startedAt,
    currentStageIndex,
    currentDayInCycle: hasLegacyActiveState
      ? as.currentDayInCycle ?? plan.currentDayInCycle ?? 1
      : plan.currentDayInCycle ?? 1,
    currentCycleCount: hasLegacyActiveState
      ? plan.currentCycleCount ?? as.currentCycleCount ?? 0
      : plan.currentCycleCount ?? 0,
    streakDays: hasLegacyActiveState
      ? as.streakDays ?? plan.streakDays ?? 0
      : plan.streakDays ?? 0,
    lastSessionDate: plan.lastSessionDate ?? null,
    stageHistory: normalizeStageHistory({
      currentStageIndex,
      startedAt,
      stageHistory: plan.stageHistory,
      stages,
    }),
    sessions: Array.isArray(plan.sessions) ? plan.sessions : [],
    stages,
  };

  next.theme = normalizeTheme(next.theme);
  return next;
}

function mapSetStatus(status) {
  const normalized = String(status ?? "completed").toLowerCase();
  if (normalized === "success" || normalized === "completed") return "completed";
  if (normalized === "failed" || normalized === "fail") return "failed";
  if (normalized === "partial") return "partial";
  if (normalized === "skipped" || normalized === "skip") return "skipped";
  return "completed";
}

export function createActivePlanFromBlueprint(blueprint, { displayName, blueprintId }) {
  const timestamp = new Date().toISOString();
  const migratedBlueprint = migrateBlueprint(structuredClone(blueprint));
  const name = migratedBlueprint.name || "Active Plan";
  const instanceName = displayName || name;

  const next = {
    id: `active_${Date.now()}`,
    name,
    displayName: instanceName,
    description: migratedBlueprint.description ?? "",
    goal: migratedBlueprint.goal ?? "",
    theme: migratedBlueprint.theme ?? { color: "#4FD1C5", icon: "ðŸ’ª", code: "PLN" },
    version: "1.0",
    versionHistory: [
      {
        version: "1.0",
        modifiedAt: timestamp,
        modifiedBy: "user",
        changeSummary: "Activated from blueprint",
      },
    ],
    blueprintId: blueprintId ?? migratedBlueprint.id ?? null,
    blueprintVersion: migratedBlueprint.version ?? "1.0",
    startedAt: timestamp,
    currentStageIndex: 0,
    currentDayInCycle: 1,
    currentCycleCount: 0,
    streakDays: 0,
    lastSessionDate: null,
    stageHistory: createInitialStageHistory(migratedBlueprint.stages, 0, timestamp),
    sessions: [],
    stages: structuredClone(migratedBlueprint.stages),
  };

  next.theme = normalizeTheme(next.theme);
  return next;
}

export function migrateWorkoutSession(raw) {
  if (!raw || typeof raw !== "object") return raw;

  const sets = (raw.sets || []).map((set) => ({
    exerciseId: set.exerciseId ?? "",
    setNumber: set.setNumber,
    status: mapSetStatus(set.status),
    actualReps: set.actualReps ?? null,
    actualDurationSec: set.actualDurationSec ?? set.setDurationSec ?? null,
    actualWeightKg: set.actualWeightKg ?? set.actualWeight ?? null,
    actualResistance: set.actualResistance ?? null,
  }));

  return {
    id: raw.id,
    activePlanId: raw.activePlanId ?? null,
    activePlanVersion: raw.activePlanVersion ?? "1.0",
    routineId: raw.routineId ?? null,
    stageId: raw.stageId ?? null,
    startedAt: raw.startedAt ?? `${raw.workoutDate ?? ""}T00:00:00`,
    completedAt: raw.completedAt ?? raw.endedAt ?? new Date().toISOString(),
    sessionType: raw.sessionType === "milestone_test" || raw.milestoneTest ? "milestone_test" : "routine",
    milestoneTest:
      raw.milestoneTest && typeof raw.milestoneTest === "object"
        ? {
          exerciseId: raw.milestoneTest.exerciseId ?? null,
          metric: normalizeMilestoneMetric(raw.milestoneTest.metric),
          target: raw.milestoneTest.target == null ? null : normalizeMilestoneTarget(raw.milestoneTest.target, 1),
          result: raw.milestoneTest.result === "passed" || raw.milestoneTest.result === "failed"
            ? raw.milestoneTest.result
            : null,
        }
        : null,
    reflectionRating: raw.reflectionRating ?? raw.perceivedDifficulty ?? null,
    feedbackResponses: normalizeWorkoutFeedbackResponses(
      raw.feedbackResponses ?? raw.feedback ?? raw.checkInResponses,
    ),
    sets,
  };
}
