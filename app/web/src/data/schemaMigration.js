/**
 * Legacy → locked schema migrations (local-first, idempotent where possible).
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

export function mapTrackingType(mode) {
  const m = String(mode ?? "reps").trim().toLowerCase();
  if (m === "reps-only" || m === "reps") return "reps";
  if (m === "duration") return "duration";
  if (m === "weight") return "weight";
  if (m === "resistance") return "resistance";
  return "reps";
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

export function migrateExercise(raw) {
  if (!raw || typeof raw !== "object") return raw;
  if (
    raw.description != null &&
    raw.summary == null &&
    raw.trackingType != null &&
    !raw.mode
  ) {
    return {
      ...raw,
      equipment: normalizeEquipmentArray(raw.equipment),
      cues: Array.isArray(raw.cues) ? raw.cues : [],
      restSeconds: Number.isFinite(Number(raw.restSeconds)) ? Number(raw.restSeconds) : 60,
    };
  }

  const trackingType = mapTrackingType(raw.trackingType ?? raw.mode);
  const description = raw.description ?? raw.summary ?? "";
  const equipment = normalizeEquipmentArray(raw.equipment);
  const bodyTargets =
    Array.isArray(raw.bodyTargets) && raw.bodyTargets.length
      ? [...raw.bodyTargets]
      : mapPrimaryMusclesToBodyTargets(raw.primaryMuscles);

  const next = {
    ...raw,
    slug: raw.slug ?? "",
    name: raw.name ?? "",
    description,
    type: raw.type ?? mapExerciseTypeFromCategory(raw.category),
    trackingType,
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
  return next;
}

function normalizeEquipmentArray(equipment) {
  if (Array.isArray(equipment)) return equipment.map(String);
  if (equipment == null || equipment === "") return [];
  return [String(equipment)];
}

function resolveExerciseIdFromCatalog(entry, catalog) {
  if (entry.exerciseId) return entry.exerciseId;
  const slug = (entry.exerciseSlug || "").trim().toLowerCase();
  if (!slug || !catalog?.length) return entry.exerciseId || "";
  const found = catalog.find(
    (e) => e.slug === slug || String(e.slug).toLowerCase() === slug,
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
  const entries = sourceEntries.map((e) => migrateRoutineEntry(e, catalog));

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

function mapMilestoneType(t) {
  if (t === "manual" || t === "consistency") return "cycles";
  if (t === "exercise" || t === "exercise_target") return "exercise_target";
  if (t === "sessions") return "sessions";
  if (t === "cycles") return "cycles";
  return "cycles";
}

function migrateMilestone(m) {
  const ms = m && typeof m === "object" ? m : {};
  const wasManual = ms.type === "manual";
  const type = mapMilestoneType(ms.type);
  let target =
    ms.target != null
      ? Number(ms.target)
      : ms.targetValue != null
        ? Number(ms.targetValue)
        : wasManual
          ? 0
          : 1;
  if (!Number.isFinite(target)) target = wasManual ? 0 : 1;
  const exerciseId = ms.exerciseId ?? ms.targetExerciseId ?? null;
  const requiresContinuous = Boolean(ms.requiresContinuous) || ms.type === "consistency";
  const onFailure = ms.onFailure &&
    typeof ms.onFailure === "object" &&
    ms.onFailure.action
    ? ms.onFailure
    : { action: "none", targetStageId: null };

  return {
    description: ms.description ?? "",
    type,
    target,
    requiresContinuous,
    exerciseId,
    metric: ms.metric ?? null,
    onFailure,
  };
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
  return schedule.map((e) => migrateScheduleEntry(e));
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
    .map((g) => (typeof g === "string" ? g : g?.title ?? ""))
    .filter(Boolean)
    .join("; ");
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
    theme: plan.theme ?? { color: "#4FD1C5", icon: "💪", code: "PLN" },
    createdAt: plan.createdAt ?? new Date().toISOString(),
    stages: (plan.stages || []).map(migrateStage),
  };

  delete next.goals;
  delete next.updatedAt;
  return next;
}

export function migrateActivePlan(plan) {
  if (!plan || typeof plan !== "object") return plan;
  if (!plan.activeState && plan.currentStageIndex != null) {
    return {
      ...plan,
      stages: (plan.stages || []).map(migrateStage),
      sessions: Array.isArray(plan.sessions) ? plan.sessions : [],
      stageHistory: Array.isArray(plan.stageHistory) ? plan.stageHistory : [],
      versionHistory: Array.isArray(plan.versionHistory) ? plan.versionHistory : [],
    };
  }

  const as = plan.activeState || {};
  const ts = plan.startedAt || plan.activatedAt || as.startDate || new Date().toISOString();
  const blueprintId = plan.blueprintId ?? plan.templateId ?? null;
  const name = plan.name || plan.displayName || "Active Plan";

  const migratedStages = (plan.stages || []).map(migrateStage);

  const next = {
    id: plan.id,
    name,
    description: plan.description ?? "",
    goal: plan.goal != null ? String(plan.goal) : joinGoals(plan.goals),
    theme: plan.theme ?? { color: "#4FD1C5", icon: "💪", code: "PLN" },
    version: plan.version ?? "1.0",
    versionHistory: Array.isArray(plan.versionHistory) && plan.versionHistory.length
      ? plan.versionHistory
      : [
          {
            version: plan.version ?? "1.0",
            modifiedAt: ts,
            modifiedBy: "user",
            changeSummary: "Migrated active plan",
          },
        ],
    blueprintId,
    blueprintVersion: plan.blueprintVersion ?? "1.0",
    startedAt: ts,
    currentStageIndex: as.currentStageIndex ?? plan.currentStageIndex ?? 0,
    currentDayInCycle: as.currentDayInCycle ?? plan.currentDayInCycle ?? 1,
    currentCycleCount: plan.currentCycleCount ?? as.currentCycleCount ?? 0,
    streakDays: as.streakDays ?? plan.streakDays ?? 0,
    lastSessionDate: plan.lastSessionDate ?? null,
    stageHistory: Array.isArray(plan.stageHistory) ? plan.stageHistory : [],
    sessions: Array.isArray(plan.sessions) ? plan.sessions : [],
    stages: migratedStages,
  };

  delete next.activeState;
  delete next.displayName;
  delete next.templateId;
  delete next.isActive;
  delete next.activatedAt;
  delete next.goals;
  delete next.createdAt;
  delete next.updatedAt;
  delete next.dailyLogs;

  return next;
}

function mapSetStatus(status) {
  const s = String(status ?? "completed").toLowerCase();
  if (s === "success" || s === "completed") return "completed";
  if (s === "failed" || s === "fail") return "failed";
  if (s === "partial") return "partial";
  if (s === "skipped" || s === "skip") return "skipped";
  return "completed";
}

export function createActivePlanFromBlueprint(blueprint, { name, blueprintId }) {
  const ts = new Date().toISOString();
  const bp = migrateBlueprint(structuredClone(blueprint));
  return {
    id: `active_${Date.now()}`,
    name,
    description: bp.description ?? "",
    goal: bp.goal ?? "",
    theme: bp.theme ?? { color: "#4FD1C5", icon: "💪", code: "PLN" },
    version: "1.0",
    versionHistory: [
      {
        version: "1.0",
        modifiedAt: ts,
        modifiedBy: "user",
        changeSummary: "Activated from blueprint",
      },
    ],
    blueprintId: blueprintId ?? bp.id ?? null,
    blueprintVersion: bp.version ?? "1.0",
    startedAt: ts,
    currentStageIndex: 0,
    currentDayInCycle: 1,
    currentCycleCount: 0,
    streakDays: 0,
    lastSessionDate: null,
    stageHistory: [],
    sessions: [],
    stages: structuredClone(bp.stages),
  };
}

export function migrateWorkoutSession(raw) {
  if (!raw || typeof raw !== "object") return raw;
  if (raw.completedAt && raw.sets?.[0]?.status && ["completed", "failed", "partial", "skipped"].includes(raw.sets[0].status)) {
    return {
      ...raw,
      sets: raw.sets.map((s) => ({
        exerciseId: s.exerciseId ?? "",
        setNumber: s.setNumber,
        status: s.status,
        actualReps: s.actualReps ?? null,
        actualDurationSec: s.actualDurationSec ?? null,
        actualWeightKg: s.actualWeightKg ?? null,
        actualResistance: s.actualResistance ?? null,
      })),
    };
  }

  const sets = (raw.sets || []).map((s) => ({
    exerciseId: s.exerciseId ?? "",
    setNumber: s.setNumber,
    status: mapSetStatus(s.status),
    actualReps: s.actualReps ?? null,
    actualDurationSec: s.actualDurationSec ?? s.setDurationSec ?? null,
    actualWeightKg: s.actualWeightKg ?? s.actualWeight ?? null,
    actualResistance: s.actualResistance ?? null,
  }));

  return {
    id: raw.id,
    activePlanId: raw.activePlanId ?? null,
    activePlanVersion: raw.activePlanVersion ?? "1.0",
    routineId: raw.routineId ?? null,
    stageId: raw.stageId ?? null,
    startedAt: raw.startedAt ?? `${raw.workoutDate ?? ""}T00:00:00`,
    completedAt: raw.completedAt ?? raw.endedAt ?? new Date().toISOString(),
    sets,
  };
}
