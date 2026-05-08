/**
 * LEGACY MIGRATION ONLY
 * activeState is a deprecated schema pattern.
 * This file is the only permitted location for activeState reads.
 * Do not reference activeState anywhere else in the codebase.
 * Do not extend this pattern.
 *
 * Legacy to locked schema migrations (local-first, idempotent where possible).
 */

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
  const hasWeight = entry?.weight != null && entry?.weight !== "";
  const hasDuration = entry?.durationSeconds != null && entry?.durationSeconds !== "";
  const hasReps = entry?.reps != null && entry?.reps !== "";
  const hasResistance = entry?.resistance != null && entry?.resistance !== "";
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
  const hasReps = hasStructuredValue(entry?.reps ?? entry?.targetReps);
  const hasDuration = hasStructuredValue(entry?.durationSeconds ?? entry?.targetDurationSec);
  const hasWeight = hasStructuredValue(entry?.weight ?? entry?.targetWeightKg);
  const hasResistance = hasStructuredValue(entry?.resistance);
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

  const next = {
    ...raw,
    slug: raw.slug ?? "",
    name: raw.name ?? "",
    description,
    type: raw.type ?? mapExerciseTypeFromCategory(raw.category),
    trackingType,
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

  if ("sets" in entry && !("targetSets" in entry)) {
    return {
      id: entry.id,
      exerciseId,
      order: entry.order,
      sets: entry.sets ?? 0,
      reps: entry.reps ?? null,
      durationSeconds: entry.durationSeconds ?? null,
      weight: entry.weight ?? null,
      resistance: entry.resistance ?? null,
      restSeconds: entry.restSeconds ?? entry.restSec ?? null,
      notes: entry.notes ?? "",
    };
  }

  return {
    id: entry.id,
    exerciseId,
    order: entry.order,
    sets: entry.sets ?? entry.targetSets ?? 0,
    reps: entry.reps ?? entry.targetReps ?? null,
    durationSeconds: entry.durationSeconds ?? entry.targetDurationSec ?? null,
    weight: entry.weight ?? entry.targetWeightKg ?? null,
    resistance: entry.resistance ?? null,
    restSeconds: entry.restSeconds ?? entry.restSec ?? null,
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
    });
  }

  if (ms.eligibility || ms.test) {
    return createDefaultMilestone({
      description: ms.description ?? "",
      eligibility: normalizeMilestoneEligibility(ms.eligibility),
      test: normalizeMilestoneTest(ms.test),
      onFailure: normalizeMilestoneFailure(ms.onFailure),
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
    sets,
  };
}
