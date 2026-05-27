import { createId } from "../../core/uid.js";
import {
  getExerciseSupportedTrackingModes,
  migrateActivePlan,
  migrateExercise,
  migrateRoutine,
  migrateStage,
  validateMilestoneTestAgainstExercise,
  validateRoutineEntryAgainstExercise,
} from "../../data/schemaMigration.js";
import {
  createStageHistoryEntry,
  getCurrentStageHistoryEntry,
} from "./stageProgression.js";

const SUPPORTED_EXPORT_VERSION = "1.0";
const DEFAULT_CHANGE_SUMMARY = "Imported active plan revision";
const DEFAULT_EDITOR_CHANGE_SUMMARY = "Edited live plan";

function sc(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSlug(baseSlug, usedSlugs) {
  const seed = baseSlug || "exercise";
  if (!usedSlugs.has(seed)) {
    return seed;
  }

  let index = 2;
  let candidate = `${seed}-${index}`;
  while (usedSlugs.has(candidate)) {
    index += 1;
    candidate = `${seed}-${index}`;
  }
  return candidate;
}

function uniqueCopyName(baseName, existingNames) {
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let index = 2;
  let candidate = `${baseName} Copy`;
  while (existingNames.has(candidate)) {
    candidate = `${baseName} Copy ${index}`;
    index += 1;
  }

  return candidate;
}

function normalizeBodyTarget(entry) {
  return {
    id: entry?.id ?? "",
    name: entry?.name ?? "",
    category: entry?.category ?? "custom",
    isCustom: Boolean(entry?.isCustom),
  };
}

function stableStringify(value) {
  return JSON.stringify(value);
}

function canonicalBodyTarget(entry) {
  return {
    name: entry?.name ?? "",
    category: entry?.category ?? "custom",
    isCustom: Boolean(entry?.isCustom),
  };
}

function canonicalExercise(entry) {
  return {
    slug: entry?.slug ?? "",
    name: entry?.name ?? "",
    description: entry?.description ?? "",
    type: entry?.type ?? "physical",
    trackingType: entry?.trackingType ?? "reps",
    executionUnitType: entry?.executionUnitType ?? "",
    supportedTrackingModes: getExerciseSupportedTrackingModes(entry),
    bodyTargets: Array.isArray(entry?.bodyTargets) ? [...entry.bodyTargets] : [],
    equipment: Array.isArray(entry?.equipment) ? [...entry.equipment] : [],
    cues: Array.isArray(entry?.cues) ? [...entry.cues] : [],
    restSeconds: Number(entry?.restSeconds ?? 60),
    aliases: Array.isArray(entry?.aliases) ? [...entry.aliases] : [],
    movementPattern: entry?.movementPattern ?? "",
    whyItHelps: entry?.whyItHelps ?? "",
    isCustom: Boolean(entry?.isCustom),
  };
}

function canonicalRoutineEntry(entry) {
  return {
    exerciseId: entry?.exerciseId ?? "",
    order: Number(entry?.order ?? 0),
    sets: Number(entry?.sets ?? 0),
    reps: entry?.reps ?? null,
    repTargetMode: entry?.repTargetMode ?? null,
    durationSeconds: entry?.durationSeconds ?? null,
    weight: entry?.weight ?? null,
    resistance: entry?.resistance ?? null,
    restSeconds: entry?.restSeconds ?? null,
    sideMode: entry?.sideMode ?? "",
    tempoMode: entry?.tempoMode ?? null,
    tempoSecondsPerRep: entry?.tempoSecondsPerRep ?? null,
    tempoDownSeconds: entry?.tempoDownSeconds ?? null,
    tempoBottomHoldSeconds: entry?.tempoBottomHoldSeconds ?? null,
    tempoUpSeconds: entry?.tempoUpSeconds ?? null,
    tempoTopHoldSeconds: entry?.tempoTopHoldSeconds ?? null,
    tempoLabel: entry?.tempoLabel ?? null,
    transitionAfterSeconds: entry?.transitionAfterSeconds ?? null,
    transitionLabel: entry?.transitionLabel ?? "",
    entryBlocks: Array.isArray(entry?.entryBlocks)
      ? entry.entryBlocks.map((block) => ({
          id: block?.id ?? "",
          type: block?.type ?? "work",
          label: block?.label ?? "",
          metricType: block?.metricType ?? null,
          side: block?.side ?? null,
          repTargetMode: block?.repTargetMode ?? null,
          reps: block?.reps ?? null,
          durationSeconds: block?.durationSeconds ?? null,
          weight: block?.weight ?? null,
          resistance: block?.resistance ?? null,
          seconds: block?.seconds ?? null,
          holdSeconds: block?.holdSeconds ?? null,
          tempoMode: block?.tempoMode ?? null,
          tempoSecondsPerRep: block?.tempoSecondsPerRep ?? null,
          tempoDownSeconds: block?.tempoDownSeconds ?? null,
          tempoBottomHoldSeconds: block?.tempoBottomHoldSeconds ?? null,
          tempoUpSeconds: block?.tempoUpSeconds ?? null,
          tempoTopHoldSeconds: block?.tempoTopHoldSeconds ?? null,
          tempoLabel: block?.tempoLabel ?? null,
          effort: block?.effort ?? null,
          notes: block?.notes ?? "",
        }))
      : [],
    notes: entry?.notes ?? "",
  };
}

function canonicalRoutine(routine) {
  return {
    name: routine?.name ?? "",
    description: routine?.description ?? "",
    notes: routine?.notes ?? "",
    difficultyScore: Number(routine?.difficultyScore ?? 1),
    isCustom: Boolean(routine?.isCustom),
    entries: Array.isArray(routine?.entries)
      ? routine.entries.map(canonicalRoutineEntry)
      : [],
  };
}

function canonicalStage(stage) {
  const migrated = migrateStage(stage ?? {});
  return {
    id: migrated?.id ?? "",
    name: migrated?.name ?? "",
    predecessorStageId: migrated?.predecessorStageId ?? null,
    schedule: Array.isArray(migrated?.schedule)
      ? migrated.schedule.map((entry) => ({
          type: entry?.type === "rest" ? "rest" : "routine",
          routineId: entry?.type === "routine" ? entry?.routineId ?? null : null,
        }))
      : [],
    milestone: migrated?.milestone ?? null,
    transitionRule: migrated?.transitionRule ?? "prompt_user",
  };
}

function formatTheme(theme) {
  return `${theme?.icon || "PL"} / ${theme?.code || "PLN"} / ${theme?.color || "#4FD1C5"}`;
}

function formatScheduleEntry(entry, routinesById) {
  if (!entry || entry.type === "rest") {
    return "Rest";
  }
  return routinesById.get(entry.routineId)?.name || "Routine";
}

function describeStage(stage, routinesById) {
  if (!stage) {
    return "No stage";
  }

  const schedule = Array.isArray(stage.schedule) ? stage.schedule : [];
  const schedulePreview = schedule
    .map((entry) => formatScheduleEntry(entry, routinesById))
    .join(" / ");
  const milestoneDescription =
    stage?.milestone?.description ||
    (stage?.milestone?.test?.type === "exercise" ? "Milestone test" : "Eligibility milestone");

  return `${stage.name || "Unnamed Stage"} - ${schedule.length} step${schedule.length === 1 ? "" : "s"} - ${milestoneDescription}${schedulePreview ? ` - ${schedulePreview}` : ""}`;
}

function incrementVersion(version) {
  const current = String(version ?? "").trim();
  if (!current) {
    return "1.0";
  }

  const parts = current.split(".");
  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last)) {
    parts[parts.length - 1] = String(Number(last) + 1);
    return parts.join(".");
  }

  return `${current}.1`;
}

function parseRevisionPackage(input) {
  if (typeof input === "string") {
    return JSON.parse(input);
  }
  return sc(input);
}

function createIssue(message, code = "REVISION_IMPORT_ERROR") {
  return { code, message };
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildMetadataChanges(localPlan, importedPlan) {
  if (!localPlan || !importedPlan) {
    return [];
  }

  const changes = [];
  if ((localPlan.displayName ?? "") !== (importedPlan.displayName ?? "")) {
    changes.push({
      field: "displayName",
      label: "Display name",
      before: localPlan.displayName ?? "",
      after: importedPlan.displayName ?? "",
    });
  }
  if ((localPlan.description ?? "") !== (importedPlan.description ?? "")) {
    changes.push({
      field: "description",
      label: "Description",
      before: localPlan.description ?? "",
      after: importedPlan.description ?? "",
    });
  }
  if ((localPlan.goal ?? "") !== (importedPlan.goal ?? "")) {
    changes.push({
      field: "goal",
      label: "Goal",
      before: localPlan.goal ?? "",
      after: importedPlan.goal ?? "",
    });
  }
  if (stableStringify(localPlan.theme ?? {}) !== stableStringify(importedPlan.theme ?? {})) {
    changes.push({
      field: "theme",
      label: "Theme",
      before: formatTheme(localPlan.theme),
      after: formatTheme(importedPlan.theme),
    });
  }
  return changes;
}

function resolveBodyTargets(importedBodyTargets, localBodyTargets) {
  const localById = new Map(localBodyTargets.map((entry) => [entry.id, entry]));
  const map = new Map();
  const additions = [];
  const blockingIssues = [];

  importedBodyTargets.forEach((entry) => {
    const normalized = normalizeBodyTarget(entry);
    if (!normalized.id) {
      blockingIssues.push(createIssue("Imported body-target entry is missing an id.", "INVALID_BODY_TARGET"));
      return;
    }

    const existing = localById.get(normalized.id);
    if (!existing) {
      additions.push(normalized);
      map.set(normalized.id, normalized.id);
      return;
    }

    if (stableStringify(canonicalBodyTarget(existing)) === stableStringify(canonicalBodyTarget(normalized))) {
      map.set(normalized.id, normalized.id);
      return;
    }

    blockingIssues.push(
      createIssue(
        `Body-target conflict for "${normalized.name || normalized.id}". Review the shared taxonomy before importing this plan update.`,
        "BODY_TARGET_CONFLICT",
      ),
    );
  });

  return { map, additions, blockingIssues };
}

function resolveExercises(importedExercises, localExercises, bodyTargetResolution, localBodyTargets) {
  const localById = new Map(localExercises.map((entry) => [entry.id, entry]));
  const usedSlugs = new Set(localExercises.map((entry) => entry.slug).filter(Boolean));
  const localBodyTargetIds = new Set(localBodyTargets.map((entry) => entry.id));
  const map = new Map();
  const additions = [];
  const added = [];
  const forked = [];
  const blockingIssues = [];

  importedExercises.forEach((entry) => {
    const migrated = migrateExercise(entry);
    if (!migrated?.id) {
      blockingIssues.push(createIssue("Imported exercise entry is missing an id.", "INVALID_EXERCISE"));
      return;
    }

    const bodyTargets = ensureArray(migrated.bodyTargets)
      .map((bodyTargetId) => {
        if (bodyTargetResolution.map.has(bodyTargetId)) {
          return bodyTargetResolution.map.get(bodyTargetId);
        }
        if (localBodyTargetIds.has(bodyTargetId)) {
          return bodyTargetId;
        }
        blockingIssues.push(
          createIssue(
            `Exercise "${migrated.name || migrated.id}" references unknown body target "${bodyTargetId}".`,
            "UNKNOWN_BODY_TARGET",
          ),
        );
        return null;
      })
      .filter(Boolean);

    const normalized = {
      ...migrated,
      bodyTargets,
    };

    const existing = localById.get(normalized.id);
    if (existing && stableStringify(canonicalExercise(existing)) === stableStringify(canonicalExercise(normalized))) {
      map.set(normalized.id, normalized.id);
      return;
    }

    const baseSlug = slugify(normalized.slug || normalized.name || normalized.id || "exercise");
    const nextSlug = uniqueSlug(baseSlug, usedSlugs);
    usedSlugs.add(nextSlug);

    if (!existing) {
      const nextExercise = {
        ...normalized,
        id: normalized.id,
        slug: nextSlug,
      };
      additions.push(nextExercise);
      added.push({ id: nextExercise.id, name: nextExercise.name || nextExercise.id });
      map.set(normalized.id, nextExercise.id);
      return;
    }

    const forkedExercise = {
      ...normalized,
      id: createId("exercise"),
      slug: nextSlug,
    };
    additions.push(forkedExercise);
    forked.push({
      sourceId: normalized.id,
      localId: forkedExercise.id,
      name: forkedExercise.name || forkedExercise.id,
    });
    map.set(normalized.id, forkedExercise.id);
  });

  return { map, additions, added, forked, blockingIssues };
}

function resolveRoutines(importedRoutines, localRoutines, exerciseResolution, localExercises) {
  const localById = new Map(localRoutines.map((entry) => [entry.id, entry]));
  const usedNames = new Set(localRoutines.map((entry) => entry.name));
  const localExerciseIds = new Set(localExercises.map((entry) => entry.id));
  const map = new Map();
  const additions = [];
  const added = [];
  const forked = [];
  const blockingIssues = [];

  importedRoutines.forEach((entry) => {
    const migrated = migrateRoutine(entry, []);
    if (!migrated?.id) {
      blockingIssues.push(createIssue("Imported routine entry is missing an id.", "INVALID_ROUTINE"));
      return;
    }

    const normalizedEntries = ensureArray(migrated.entries).map((routineEntry) => {
      const resolvedExerciseId =
        exerciseResolution.map.get(routineEntry.exerciseId) ||
        (localExerciseIds.has(routineEntry.exerciseId) ? routineEntry.exerciseId : null);

      if (!resolvedExerciseId) {
        blockingIssues.push(
          createIssue(
            `Routine "${migrated.name || migrated.id}" references unknown exercise "${routineEntry.exerciseId}".`,
            "UNKNOWN_ROUTINE_EXERCISE",
          ),
        );
      }

      return {
        ...routineEntry,
        exerciseId: resolvedExerciseId ?? "",
      };
    });

    normalizedEntries.forEach((routineEntry) => {
      const exercise =
        exerciseResolution.additions.find((entry) => entry.id === routineEntry.exerciseId) ||
        localExercises.find((entry) => entry.id === routineEntry.exerciseId) ||
        null;
      if (!exercise) {
        return;
      }
      const validation = validateRoutineEntryAgainstExercise(routineEntry, exercise);
      if (validation.issues.length) {
        blockingIssues.push(
          createIssue(
            `Routine "${migrated.name || migrated.id}" contains an unsupported prescription for "${exercise.name || routineEntry.exerciseId}". ${validation.issues[0].message}`,
            validation.issues[0].code,
          ),
        );
      }
    });

    const normalized = {
      ...migrated,
      entries: normalizedEntries,
    };

    const existing = localById.get(normalized.id);
    if (existing && stableStringify(canonicalRoutine(existing)) === stableStringify(canonicalRoutine(normalized))) {
      map.set(normalized.id, normalized.id);
      return;
    }

    const resolvedName = uniqueCopyName(normalized.name || "Imported Routine", usedNames);
    usedNames.add(resolvedName);

    if (!existing) {
      const nextRoutine = {
        ...normalized,
        name: resolvedName,
      };
      additions.push(nextRoutine);
      added.push({ id: nextRoutine.id, name: nextRoutine.name || nextRoutine.id });
      map.set(normalized.id, nextRoutine.id);
      return;
    }

    const forkedRoutine = {
      ...normalized,
      id: createId("routine"),
      name: resolvedName,
    };
    additions.push(forkedRoutine);
    forked.push({
      sourceId: normalized.id,
      localId: forkedRoutine.id,
      name: forkedRoutine.name || forkedRoutine.id,
    });
    map.set(normalized.id, forkedRoutine.id);
  });

  return { map, additions, added, forked, blockingIssues };
}

function mapStageReferences(importedPlan, routineResolution, exerciseResolution, localRoutines, localExercises) {
  const availableRoutines = new Map([
    ...localRoutines.map((entry) => [entry.id, entry]),
    ...routineResolution.additions.map((entry) => [entry.id, entry]),
  ]);
  const availableExercises = new Set([
    ...localExercises.map((entry) => entry.id),
    ...exerciseResolution.additions.map((entry) => entry.id),
  ]);
  const blockingIssues = [];

  const stages = ensureArray(importedPlan?.stages).map((stage) => {
    const migratedStage = migrateStage(stage);
    const nextStage = sc(migratedStage);

    nextStage.schedule = ensureArray(nextStage.schedule).map((entry) => {
      if (entry?.type === "rest") {
        return { type: "rest", routineId: null };
      }

      const resolvedRoutineId =
        routineResolution.map.get(entry.routineId) ||
        (availableRoutines.has(entry.routineId) ? entry.routineId : null);

      if (!resolvedRoutineId) {
        blockingIssues.push(
          createIssue(
            `Stage "${nextStage.name || nextStage.id}" references unknown routine "${entry.routineId}".`,
            "UNKNOWN_STAGE_ROUTINE",
          ),
        );
      }

      return {
        type: "routine",
        routineId: resolvedRoutineId,
      };
    });

    const test = nextStage?.milestone?.test;
    if (test?.type === "exercise") {
      if (test.source === "stage_entry") {
        const resolvedRoutineId =
          routineResolution.map.get(test.routineId) ||
          (availableRoutines.has(test.routineId) ? test.routineId : null);

        if (!resolvedRoutineId) {
          blockingIssues.push(
            createIssue(
              `Milestone test on "${nextStage.name || nextStage.id}" references unknown routine "${test.routineId}".`,
              "UNKNOWN_MILESTONE_ROUTINE",
            ),
          );
        } else {
          nextStage.milestone.test.routineId = resolvedRoutineId;
          const resolvedRoutine = availableRoutines.get(resolvedRoutineId);
          const routineEntry = ensureArray(resolvedRoutine?.entries).find(
            (entry) => entry.id === test.routineEntryId,
          );
          if (!routineEntry) {
            blockingIssues.push(
              createIssue(
                `Milestone test on "${nextStage.name || nextStage.id}" references missing routine entry "${test.routineEntryId}".`,
                "UNKNOWN_MILESTONE_ENTRY",
              ),
            );
          } else {
            nextStage.milestone.test.exerciseId = routineEntry.exerciseId;
            const exercise =
              exerciseResolution.additions.find((entry) => entry.id === routineEntry.exerciseId) ||
              localExercises.find((entry) => entry.id === routineEntry.exerciseId) ||
              null;
            const validation = validateMilestoneTestAgainstExercise(test, exercise, routineEntry);
            nextStage.milestone.test.metric = validation.test.metric;
            validation.issues.forEach((issue) => {
              blockingIssues.push(
                createIssue(
                  `Milestone test on "${nextStage.name || nextStage.id}" is incompatible with "${exercise?.name || routineEntry.exerciseId}". ${issue.message}`,
                  issue.code,
                ),
              );
            });
          }
        }
      } else {
        const resolvedExerciseId =
          exerciseResolution.map.get(test.exerciseId) ||
          (availableExercises.has(test.exerciseId) ? test.exerciseId : null);

        if (!resolvedExerciseId) {
          blockingIssues.push(
            createIssue(
              `Milestone test on "${nextStage.name || nextStage.id}" references unknown exercise "${test.exerciseId}".`,
              "UNKNOWN_MILESTONE_EXERCISE",
            ),
          );
        } else {
          nextStage.milestone.test.exerciseId = resolvedExerciseId;
          const exercise =
            exerciseResolution.additions.find((entry) => entry.id === resolvedExerciseId) ||
            localExercises.find((entry) => entry.id === resolvedExerciseId) ||
            null;
          const validation = validateMilestoneTestAgainstExercise(test, exercise);
          nextStage.milestone.test.metric = validation.test.metric;
          validation.issues.forEach((issue) => {
            blockingIssues.push(
              createIssue(
                `Milestone test on "${nextStage.name || nextStage.id}" is incompatible with "${exercise?.name || resolvedExerciseId}". ${issue.message}`,
                issue.code,
              ),
            );
          });
        }
      }
    }

    return nextStage;
  });

  return {
    plan: {
      ...importedPlan,
      stages,
    },
    blockingIssues,
  };
}

function scheduleEntryMatches(left, right) {
  if (!left || !right) {
    return false;
  }

  if ((left.type === "rest") !== (right.type === "rest")) {
    return false;
  }

  if (left.type === "routine") {
    return left.routineId === right.routineId;
  }

  return true;
}

function buildStageDiff(beforeStage, afterStage, routinesById) {
  if (!beforeStage || !afterStage) {
    return null;
  }

  const changedFields = [];
  if ((beforeStage.name ?? "") !== (afterStage.name ?? "")) {
    changedFields.push("name");
  }
  if (
    stableStringify(ensureArray(beforeStage.schedule)) !==
    stableStringify(ensureArray(afterStage.schedule))
  ) {
    changedFields.push("schedule");
  }
  if (
    stableStringify(beforeStage.milestone ?? {}) !==
    stableStringify(afterStage.milestone ?? {})
  ) {
    changedFields.push("milestone");
  }
  if ((beforeStage.transitionRule ?? "prompt_user") !== (afterStage.transitionRule ?? "prompt_user")) {
    changedFields.push("transition rule");
  }

  return {
    changed: changedFields.length > 0,
    changedFields,
    beforeSummary: describeStage(beforeStage, routinesById),
    afterSummary: describeStage(afterStage, routinesById),
  };
}

function buildFutureStageChanges(localPlan, finalStages, routinesById) {
  const currentStageIndex = Math.max(0, Number(localPlan?.currentStageIndex ?? 0));
  const localFuture = ensureArray(localPlan?.stages).slice(currentStageIndex + 1);
  const revisedFuture = ensureArray(finalStages).slice(currentStageIndex + 1);
  const localIndexById = new Map(localFuture.map((stage, index) => [stage.id, index]));
  const revisedIds = new Set(revisedFuture.map((stage) => stage.id));
  const localById = new Map(localFuture.map((stage) => [stage.id, stage]));
  const changes = [];

  revisedFuture.forEach((stage, index) => {
    const existing = localById.get(stage.id);
    if (!existing) {
      changes.push({
        type: "added",
        stageId: stage.id,
        name: stage.name || stage.id,
        summary: describeStage(stage, routinesById),
      });
      return;
    }

    const localIndex = localIndexById.get(stage.id);
    const stageDiff = buildStageDiff(existing, stage, routinesById);
    if (stageDiff?.changed || localIndex !== index) {
      changes.push({
        type: "updated",
        stageId: stage.id,
        name: stage.name || stage.id,
        summary: stageDiff?.afterSummary || describeStage(stage, routinesById),
        beforeSummary: stageDiff?.beforeSummary || describeStage(existing, routinesById),
        reordered: localIndex !== index,
      });
    }
  });

  localFuture.forEach((stage) => {
    if (!revisedIds.has(stage.id)) {
      changes.push({
        type: "removed",
        stageId: stage.id,
        name: stage.name || stage.id,
        summary: describeStage(stage, routinesById),
      });
    }
  });

  return changes;
}

function buildStagePreview(localPlan, importedPlan, selectedStageAnchorId, blockingIssues, routinesById) {
  const currentStageIndex = Math.max(0, Number(localPlan?.currentStageIndex ?? 0));
  const localStages = ensureArray(localPlan?.stages);
  const importedStages = ensureArray(importedPlan?.stages);
  const localCurrentStage = localStages[currentStageIndex] ?? null;
  const localCurrentDayIndex = Math.max(0, Number(localPlan?.currentDayInCycle ?? 1) - 1);
  const localCurrentDayEntry = ensureArray(localCurrentStage?.schedule)[localCurrentDayIndex] ?? null;
  const candidateStages = importedStages
    .map((stage, index) => ({ stage, index }))
    .filter(({ index }) => index >= currentStageIndex)
    .map(({ stage, index }) => ({
      id: stage.id,
      index,
      name: stage.name || `Stage ${index + 1}`,
      summary: describeStage(stage, routinesById),
    }));

  let resolvedSelectedAnchorId = selectedStageAnchorId ?? null;
  let anchorIndex = -1;
  let requiresManualAnchor = false;
  let message = "Current stage and day map cleanly into the revised plan.";
  let status = "preserved";

  if (!localCurrentStage) {
    requiresManualAnchor = true;
    status = "blocked";
    message = "The local active plan has no current stage to anchor.";
    blockingIssues.push(createIssue(message, "MISSING_CURRENT_STAGE"));
  } else if (!candidateStages.length) {
    requiresManualAnchor = true;
    status = "blocked";
    message = "No current or future stages remain after freezing completed stages.";
    blockingIssues.push(createIssue(message, "NO_FUTURE_STAGES"));
  } else {
    const autoIndex = importedStages.findIndex(
      (stage, index) => index >= currentStageIndex && stage.id === localCurrentStage.id,
    );
    if (autoIndex === -1) {
      requiresManualAnchor = true;
      status = "manual";
      message = `Current stage "${localCurrentStage.name || localCurrentStage.id}" no longer exists in the revised plan. Choose a new anchor stage before applying.`;
    } else {
      const importedStage = importedStages[autoIndex];
      const importedDayEntry = ensureArray(importedStage?.schedule)[localCurrentDayIndex] ?? null;
      if (!scheduleEntryMatches(localCurrentDayEntry, importedDayEntry)) {
        requiresManualAnchor = true;
        status = "manual";
        message = "The revised current stage changes today's ordered step. Choose a new anchor stage to continue safely.";
      } else {
        resolvedSelectedAnchorId = localCurrentStage.id;
        anchorIndex = autoIndex;
      }
    }
  }

  if (requiresManualAnchor && resolvedSelectedAnchorId) {
    const selected = candidateStages.find((stage) => stage.id === resolvedSelectedAnchorId);
    if (selected) {
      anchorIndex = selected.index;
      status = "manual";
      message = `Revision will reopen the journey at "${selected.name}" and reset day/cycle counters.`;
    } else {
      resolvedSelectedAnchorId = null;
    }
  }

  const completedStageEditsIgnored = importedStages
    .slice(0, currentStageIndex)
    .reduce((count, stage, index) => {
      const localStage = localStages[index];
      return count + (stableStringify(canonicalStage(stage)) !== stableStringify(canonicalStage(localStage)) ? 1 : 0);
    }, 0);

  const finalStages =
    anchorIndex >= 0
      ? [
          ...localStages.slice(0, currentStageIndex),
          ...importedStages.slice(anchorIndex),
        ]
      : null;

  const currentStageDiff =
    finalStages && finalStages[currentStageIndex]
      ? buildStageDiff(localCurrentStage, finalStages[currentStageIndex], routinesById)
      : null;

  const futureStageChanges = finalStages
    ? buildFutureStageChanges(localPlan, finalStages, routinesById)
    : [];

  return {
    status,
    message,
    requiresManualAnchor,
    selectedStageAnchorId: resolvedSelectedAnchorId,
    candidateStages,
    currentStageDiff,
    futureStageChanges,
    completedStageEditsIgnored,
    finalStages,
    anchorIndex,
  };
}

function buildReviewFromResolution({
  activePlanId,
  localPlan,
  localRoutines,
  rawPackage,
  importedPlan,
  mappedPlan,
  bodyTargetResolution,
  exerciseResolution,
  routineResolution,
  blockingIssues,
  selectedStageAnchorId,
  changeSummary,
  staleAcknowledged,
  exportedAt,
  exportVersion,
}) {
  const routinesById = new Map([
    ...localRoutines.map((entry) => [entry.id, entry]),
    ...routineResolution.additions.map((entry) => [entry.id, entry]),
  ]);
  const stagePreview = mappedPlan
    ? buildStagePreview(localPlan, mappedPlan, selectedStageAnchorId, blockingIssues, routinesById)
    : {
        status: "blocked",
        message: "The imported revision could not be mapped safely.",
        requiresManualAnchor: false,
        selectedStageAnchorId: null,
        candidateStages: [],
        currentStageDiff: null,
        futureStageChanges: [],
        completedStageEditsIgnored: 0,
        finalStages: null,
        anchorIndex: -1,
      };

  const staleVersion = importedPlan ? importedPlan.version !== localPlan.version : false;
  const warnings = [];

  if (staleVersion) {
    warnings.push(
      createIssue(
        `This revision was exported from version ${importedPlan.version || "unknown"} while the local plan is on version ${localPlan.version || "unknown"}. Review carefully before applying.`,
        "STALE_REVISION",
      ),
    );
  }

  if (stagePreview.completedStageEditsIgnored > 0) {
    warnings.push(
      createIssue(
        `${stagePreview.completedStageEditsIgnored} completed-stage change${stagePreview.completedStageEditsIgnored === 1 ? "" : "s"} will be ignored to preserve history.`,
        "FROZEN_COMPLETED_STAGES",
      ),
    );
  }

  return {
    targetPlanId: activePlanId,
    targetPlanLabel: localPlan.displayName || localPlan.name || "Active Plan",
    exportVersion: exportVersion ?? "unknown",
    exportedAt: exportedAt ?? null,
    importedPlanLabel: importedPlan?.displayName || importedPlan?.name || "Imported Active Plan",
    importedPlanVersion: importedPlan?.version ?? null,
    localPlanVersion: localPlan.version ?? null,
    blockingIssues,
    warnings,
    staleVersion,
    staleAcknowledged: Boolean(staleAcknowledged),
    metadataChanges: importedPlan ? buildMetadataChanges(localPlan, importedPlan) : [],
    dependencySummary: {
      addedBodyTargets: bodyTargetResolution.additions.map((entry) => ({
        id: entry.id,
        name: entry.name || entry.id,
      })),
      addedExercises: exerciseResolution.added,
      forkedExercises: exerciseResolution.forked,
      addedRoutines: routineResolution.added,
      forkedRoutines: routineResolution.forked,
    },
    stageMapping: {
      status: stagePreview.status,
      message: stagePreview.message,
      requiresManualAnchor: stagePreview.requiresManualAnchor,
      candidateStages: stagePreview.candidateStages,
    },
    selectedStageAnchorId: stagePreview.selectedStageAnchorId,
    currentStageChange: stagePreview.currentStageDiff,
    futureStageChanges: stagePreview.futureStageChanges,
    completedStageEditsIgnored: stagePreview.completedStageEditsIgnored,
    changeSummary: changeSummary || DEFAULT_CHANGE_SUMMARY,
    _rawPackage: rawPackage,
    _resolution: {
      localPlan,
      importedPlan,
      mappedPlan,
      bodyTargetsToAdd: bodyTargetResolution.additions,
      exercisesToAdd: exerciseResolution.additions,
      routinesToAdd: routineResolution.additions,
      finalStages: stagePreview.finalStages,
      anchorIndex: stagePreview.anchorIndex,
      requiresManualAnchor: stagePreview.requiresManualAnchor,
    },
  };
}

function createReviewForBlockingImport(activePlanId, localPlan, rawPackage, issues, exportedAt, exportVersion, changeSummary, staleAcknowledged) {
  return {
    targetPlanId: activePlanId,
    targetPlanLabel: localPlan.displayName || localPlan.name || "Active Plan",
    exportVersion: exportVersion ?? "unknown",
    exportedAt: exportedAt ?? null,
    importedPlanLabel: rawPackage?.activePlan?.displayName || rawPackage?.activePlan?.name || "Imported Active Plan",
    importedPlanVersion: rawPackage?.activePlan?.version ?? null,
    localPlanVersion: localPlan.version ?? null,
    blockingIssues: issues,
    warnings: [],
    staleVersion: false,
    staleAcknowledged: Boolean(staleAcknowledged),
    metadataChanges: [],
    dependencySummary: {
      addedBodyTargets: [],
      addedExercises: [],
      forkedExercises: [],
      addedRoutines: [],
      forkedRoutines: [],
    },
    stageMapping: {
      status: "blocked",
      message: "This plan update package cannot be applied.",
      requiresManualAnchor: false,
      candidateStages: [],
    },
    selectedStageAnchorId: null,
    currentStageChange: null,
    futureStageChanges: [],
    completedStageEditsIgnored: 0,
    changeSummary: changeSummary || DEFAULT_CHANGE_SUMMARY,
    _rawPackage: rawPackage,
    _resolution: null,
  };
}

function updateOpenStageHistoryName(stageHistory, stageId, stageName) {
  return ensureArray(stageHistory).map((entry) => {
    if (entry.stageId === stageId && entry.completedAt == null) {
      return { ...entry, stageName };
    }
    return entry;
  });
}

function buildManualRemapStageHistory(localPlan, nextCurrentStage, timestamp) {
  const history = ensureArray(localPlan.stageHistory).map((entry) => ({ ...entry }));
  const openEntry = getCurrentStageHistoryEntry(localPlan);
  if (openEntry) {
    const index = history.findIndex(
      (entry) => entry.stageId === openEntry.stageId && entry.completedAt == null && entry.startedAt === openEntry.startedAt,
    );
    if (index >= 0) {
      history[index] = {
        ...history[index],
        completedAt: timestamp,
        completedVia: "user_override",
      };
    }
  }

  const newEntry = createStageHistoryEntry(nextCurrentStage, timestamp);
  if (newEntry) {
    history.push(newEntry);
  }

  return history;
}

function buildAppliedActivePlan(review, timestamp) {
  const { localPlan, importedPlan, finalStages, requiresManualAnchor } = review._resolution;
  const currentStageIndex = Math.max(0, Number(localPlan.currentStageIndex ?? 0));
  const nextVersion = incrementVersion(localPlan.version);
  const nextCurrentStage = ensureArray(finalStages)[currentStageIndex] ?? null;
  const modifiedBy = review.reviewMode === "editor" ? "user" : "import";
  const fallbackChangeSummary = review.reviewMode === "editor"
    ? DEFAULT_EDITOR_CHANGE_SUMMARY
    : DEFAULT_CHANGE_SUMMARY;
  const preservedStageHistory = requiresManualAnchor
    ? buildManualRemapStageHistory(localPlan, nextCurrentStage, timestamp)
    : updateOpenStageHistoryName(localPlan.stageHistory, nextCurrentStage?.id, nextCurrentStage?.name || "Unnamed Stage");

  return {
    ...localPlan,
    name: localPlan.name,
    displayName: importedPlan.displayName ?? localPlan.displayName,
    description: importedPlan.description ?? localPlan.description,
    goal: importedPlan.goal ?? localPlan.goal,
    theme: importedPlan.theme ?? localPlan.theme,
    version: nextVersion,
    versionHistory: [
      ...ensureArray(localPlan.versionHistory),
      {
        version: nextVersion,
        modifiedAt: timestamp,
        modifiedBy,
        changeSummary: review.changeSummary || fallbackChangeSummary,
      },
    ],
    startedAt: localPlan.startedAt,
    blueprintId: localPlan.blueprintId ?? null,
    blueprintVersion: localPlan.blueprintVersion ?? null,
    currentStageIndex,
    currentDayInCycle: requiresManualAnchor ? 1 : localPlan.currentDayInCycle,
    currentCycleCount: requiresManualAnchor ? 0 : localPlan.currentCycleCount,
    streakDays: localPlan.streakDays,
    lastSessionDate: localPlan.lastSessionDate,
    stageHistory: preservedStageHistory,
    sessions: ensureArray(localPlan.sessions),
    stages: sc(finalStages),
  };
}

export function prepareActivePlanRevisionReview(activePlanId, input, deps, overrides = {}) {
  const {
    activePlans = [],
    exercises = [],
    routines = [],
    bodyTargets = [],
    selectedStageAnchorId = null,
    changeSummary = DEFAULT_CHANGE_SUMMARY,
    staleAcknowledged = false,
  } = deps;

  const localPlan = activePlans.find((entry) => entry.id === activePlanId);
  if (!localPlan) {
    throw new Error("Active plan not found.");
  }

  const rawPackage = parseRevisionPackage(input);
  const exportVersion = rawPackage?.exportVersion ?? null;
  const exportedAt = rawPackage?.exportedAt ?? null;
  const blockingIssues = [];

  if (exportVersion !== SUPPORTED_EXPORT_VERSION) {
    blockingIssues.push(
      createIssue(
        `Unsupported active-plan revision package version "${exportVersion ?? "unknown"}". Expected ${SUPPORTED_EXPORT_VERSION}.`,
        "UNSUPPORTED_EXPORT_VERSION",
      ),
    );
  }

  if (!rawPackage?.activePlan || typeof rawPackage.activePlan !== "object") {
    blockingIssues.push(createIssue("Imported package does not contain an activePlan payload.", "MISSING_ACTIVE_PLAN"));
    return createReviewForBlockingImport(
      activePlanId,
      localPlan,
      rawPackage,
      blockingIssues,
      exportedAt,
      exportVersion,
      overrides.changeSummary ?? changeSummary,
      overrides.staleAcknowledged ?? staleAcknowledged,
    );
  }

  const importedPlan = migrateActivePlan(rawPackage.activePlan);
  if (importedPlan.id !== activePlanId) {
    blockingIssues.push(
      createIssue(
        `This revision targets "${importedPlan.displayName || importedPlan.name || importedPlan.id}", not "${localPlan.displayName || localPlan.name}".`,
        "ACTIVE_PLAN_ID_MISMATCH",
      ),
    );
  }

  const importedBodyTargets = ensureArray(rawPackage.bodyTargets).map(normalizeBodyTarget);
  const bodyTargetResolution = resolveBodyTargets(importedBodyTargets, bodyTargets);
  blockingIssues.push(...bodyTargetResolution.blockingIssues);

  const importedExercises = ensureArray(rawPackage.exercises).map((entry) => migrateExercise(entry));
  const exerciseResolution = resolveExercises(
    importedExercises,
    exercises,
    bodyTargetResolution,
    bodyTargets,
  );
  blockingIssues.push(...exerciseResolution.blockingIssues);

  const importedRoutines = ensureArray(rawPackage.routines).map((entry) => migrateRoutine(entry, []));
  const routineResolution = resolveRoutines(
    importedRoutines,
    routines,
    exerciseResolution,
    exercises,
  );
  blockingIssues.push(...routineResolution.blockingIssues);

  if (!ensureArray(importedPlan.stages).length) {
    blockingIssues.push(createIssue("Imported active plan does not include any stages.", "MISSING_STAGES"));
  }

  const mappedPlanResult = importedPlan.id === activePlanId
    ? mapStageReferences(importedPlan, routineResolution, exerciseResolution, routines, exercises)
    : { plan: importedPlan, blockingIssues: [] };
  blockingIssues.push(...mappedPlanResult.blockingIssues);

  if (blockingIssues.some((issue) => issue.code === "ACTIVE_PLAN_ID_MISMATCH")) {
    return createReviewForBlockingImport(
      activePlanId,
      localPlan,
      rawPackage,
      blockingIssues,
      exportedAt,
      exportVersion,
      overrides.changeSummary ?? changeSummary,
      overrides.staleAcknowledged ?? staleAcknowledged,
    );
  }

  return buildReviewFromResolution({
    activePlanId,
    localPlan,
    localRoutines: routines,
    rawPackage,
    importedPlan,
    mappedPlan: mappedPlanResult.plan,
    bodyTargetResolution,
    exerciseResolution,
    routineResolution,
    blockingIssues,
    selectedStageAnchorId: overrides.selectedStageAnchorId ?? selectedStageAnchorId,
    changeSummary: overrides.changeSummary ?? changeSummary,
    staleAcknowledged: overrides.staleAcknowledged ?? staleAcknowledged,
    exportedAt,
    exportVersion,
  });
}

export function refreshActivePlanRevisionReview(review, deps, overrides = {}) {
  if (!review?._rawPackage) {
    return review;
  }

  const refreshed = prepareActivePlanRevisionReview(
    review.targetPlanId,
    review._rawPackage,
    {
      ...deps,
      selectedStageAnchorId:
        overrides.selectedStageAnchorId !== undefined
          ? overrides.selectedStageAnchorId
          : review.selectedStageAnchorId,
      changeSummary: overrides.changeSummary ?? review.changeSummary,
      staleAcknowledged: overrides.staleAcknowledged ?? review.staleAcknowledged,
    },
  );

  return {
    ...refreshed,
    reviewMode: review.reviewMode || "import",
    returnRoute: overrides.returnRoute ?? review.returnRoute ?? null,
  };
}

export function applyPreparedActivePlanRevision(review, deps) {
  const rebuilt = refreshActivePlanRevisionReview(review, deps);
  if (!rebuilt?._resolution) {
    throw new Error("Revision review is incomplete.");
  }
  if (rebuilt.blockingIssues.length) {
    throw new Error(rebuilt.blockingIssues[0]?.message || "Revision import is blocked.");
  }
  if (rebuilt.staleVersion && !rebuilt.staleAcknowledged) {
    throw new Error("Acknowledge the stale plan-update warning before applying.");
  }
  if (rebuilt.stageMapping.requiresManualAnchor && !rebuilt.selectedStageAnchorId) {
    throw new Error("Choose a new current stage before applying this plan update.");
  }

  const timestamp = new Date().toISOString();
  const nextBodyTargets = [...deps.bodyTargets, ...rebuilt._resolution.bodyTargetsToAdd];
  const nextExercises = [...deps.exercises, ...rebuilt._resolution.exercisesToAdd];
  const nextRoutines = [...deps.routines, ...rebuilt._resolution.routinesToAdd];
  const nextPlan = buildAppliedActivePlan(rebuilt, timestamp);
  const nextActivePlans = deps.activePlans.map((plan) =>
    plan.id === rebuilt.targetPlanId ? nextPlan : plan,
  );

  return {
    review: rebuilt,
    bodyTargets: nextBodyTargets,
    exercises: nextExercises,
    routines: nextRoutines,
    activePlans: nextActivePlans,
    updatedPlan: nextPlan,
  };
}
