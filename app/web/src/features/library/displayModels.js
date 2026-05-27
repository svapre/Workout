import {
  getExerciseDefaultTrackingType,
  getExerciseDomains,
  getExerciseExecutionUnitType,
  getExecutionUnitLabel,
  getExercisePrimaryDomain,
  getRoutineBlockMetricType,
  getRoutineBlockTempoPresentation,
  getExerciseSupportedTrackingModes,
  getRoutineEntryBlocks,
  inferRoutineEntryTrackingType,
  isMindBodyExercise,
  normalizeRoutineEntrySideMode,
} from "../../data/schemaMigration.js";
import {
  buildEntryWorkDisplayMap,
  formatEffortLabel,
  formatRepGoalLabel,
} from "../routines/executionFlow.js";

const RESERVED_EXERCISE_FIELDS = new Set([
  "id",
  "slug",
  "name",
  "type",
  "domains",
  "primaryDomain",
  "category",
  "description",
  "summary",
  "bodyTargets",
  "primaryMuscles",
  "secondaryMuscles",
  "equipment",
  "trackingType",
  "executionUnitType",
  "supportedTrackingModes",
  "movementPattern",
  "aliases",
  "whyItHelps",
  "sourceName",
  "sourceUrl",
  "isCustom",
  "notes",
  "restSeconds",
  "cues",
  "difficultyScore",
]);

function toTitleCase(value) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDomainLabel(value) {
  if (value === "physical") return "Physical";
  if (value === "mental") return "Mental";
  return toTitleCase(value);
}

function summarizeDomainFamily(domains = []) {
  const hasPhysical = domains.includes("physical");
  const hasMental = domains.includes("mental");

  if (hasPhysical && hasMental) {
    return "Mind-body";
  }
  if (hasMental) {
    return "Mental";
  }
  if (hasPhysical) {
    return "Physical";
  }
  return "General";
}

export function formatBodyTargetLabel(value) {
  const raw = String(value ?? "");
  return toTitleCase(raw.startsWith("bm_") ? raw.slice(3) : raw);
}

function uniq(values = []) {
  return values.filter((value, index, list) => value && list.indexOf(value) === index);
}

function normalizeList(values = []) {
  return uniq(
    values
      .flat()
      .map((value) => String(value ?? "").trim())
      .filter(Boolean),
  );
}

function normalizeEquipment(values = []) {
  const cleaned = normalizeList(values);
  const withoutNone = cleaned.filter((item) => item.toLowerCase() !== "none");
  return withoutNone.length ? withoutNone : cleaned;
}

function fallbackTrackingModes(exercise) {
  return getExerciseSupportedTrackingModes(exercise).map((mode) => ({
    value: mode,
    label: toTitleCase(mode),
  }));
}

function resolveBodyTargets(exercise) {
  const values = exercise?.bodyTargets?.length ? exercise.bodyTargets : exercise?.primaryMuscles;
  return normalizeList(values).map((target) => ({
    value: target,
    label: formatBodyTargetLabel(target),
  }));
}

function resolveSecondaryTargets(exercise) {
  return normalizeList(exercise?.secondaryMuscles).map((target) => ({
    value: target,
    label: formatBodyTargetLabel(target),
  }));
}

function resolveEquipment(exercise) {
  return normalizeEquipment(exercise?.equipment).map((item) => ({
    value: item,
    label: item,
  }));
}

function resolveExecutionUnit(exercise) {
  const unit = getExerciseExecutionUnitType(exercise);
  if (!unit) {
    return [];
  }

  return [
    {
      value: unit,
      label: getExecutionUnitLabel(unit),
    },
  ];
}

function resolveMovementPattern(exercise) {
  if (!exercise?.movementPattern) {
    return [];
  }

  return [
    {
      value: exercise.movementPattern,
      label: toTitleCase(exercise.movementPattern),
    },
  ];
}

function resolveDomains(exercise) {
  return getExerciseDomains(exercise).map((domain) => ({
    value: domain,
    label: formatDomainLabel(domain),
  }));
}

function resolveCategory(exercise) {
  if (!exercise?.category) {
    return [];
  }

  return [{ value: exercise.category, label: toTitleCase(exercise.category) }];
}

function resolveAliases(exercise) {
  return normalizeList(exercise?.aliases).map((alias) => ({
    value: alias,
    label: alias,
  }));
}

function resolveCues(exercise) {
  return normalizeList(exercise?.cues).map((cue) => ({
    value: cue,
    label: cue,
  }));
}

function resolveRest(exercise) {
  if (exercise?.restSeconds == null || exercise.restSeconds === "") {
    return [];
  }

  return [{ value: exercise.restSeconds, label: `${exercise.restSeconds}s rest` }];
}

function toSupplementalTokens(value) {
  if (Array.isArray(value)) {
    return normalizeList(value).map((item) => ({ value: item, label: item }));
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, nestedValue]) => nestedValue != null && nestedValue !== "")
      .map(([key, nestedValue]) => ({
        value: nestedValue,
        label: `${toTitleCase(key)}: ${String(nestedValue)}`,
      }));
  }

  return [{ value, label: String(value) }];
}

export const EXERCISE_METADATA_REGISTRY = [
  {
    key: "bodyTargets",
    label: "Body targets",
    primitive: "chip-list",
    showOnDetail: true,
    showOnCompact: true,
    rollup: true,
    resolve: resolveBodyTargets,
  },
  {
    key: "secondaryMuscles",
    label: "Secondary muscles",
    primitive: "chip-list",
    showOnDetail: true,
    showOnCompact: false,
    rollup: false,
    resolve: resolveSecondaryTargets,
  },
  {
    key: "equipment",
    label: "Equipment",
    primitive: "chip-list",
    showOnDetail: true,
    showOnCompact: true,
    rollup: true,
    resolve: resolveEquipment,
  },
  {
    key: "supportedTrackingModes",
    label: "Tracking modes",
    primitive: "badge-list",
    showOnDetail: true,
    showOnCompact: true,
    rollup: true,
    resolve: fallbackTrackingModes,
  },
  {
    key: "executionUnitType",
    label: "Execution unit",
    primitive: "badge-list",
    showOnDetail: true,
    showOnCompact: false,
    rollup: false,
    resolve: resolveExecutionUnit,
  },
  {
    key: "movementPattern",
    label: "Movement pattern",
    primitive: "badge-list",
    showOnDetail: true,
    showOnCompact: true,
    rollup: true,
    resolve: resolveMovementPattern,
  },
  {
    key: "domains",
    label: "Domains",
    primitive: "badge-list",
    showOnDetail: true,
    showOnCompact: true,
    rollup: true,
    resolve: resolveDomains,
  },
  {
    key: "category",
    label: "Category",
    primitive: "badge-list",
    showOnDetail: true,
    showOnCompact: true,
    rollup: true,
    resolve: resolveCategory,
  },
  {
    key: "aliases",
    label: "Aliases",
    primitive: "chip-list",
    showOnDetail: true,
    showOnCompact: false,
    rollup: false,
    resolve: resolveAliases,
  },
  {
    key: "restSeconds",
    label: "Recovery",
    primitive: "badge-list",
    showOnDetail: true,
    showOnCompact: false,
    rollup: false,
    resolve: resolveRest,
  },
  {
    key: "cues",
    label: "Cues",
    primitive: "text-list",
    showOnDetail: true,
    showOnCompact: false,
    rollup: false,
    resolve: resolveCues,
  },
];

function buildRegistryFields(exercise) {
  return EXERCISE_METADATA_REGISTRY.map((field) => {
    const items = (field.resolve ? field.resolve(exercise) : []).filter((item) => item && item.label);
    return {
      ...field,
      items,
    };
  }).filter((field) => field.items.length);
}

function buildSupplementalFields(exercise) {
  return Object.entries(exercise || {})
    .filter(([key, value]) => !RESERVED_EXERCISE_FIELDS.has(key) && value != null && value !== "")
    .map(([key, value]) => ({
      key,
      label: toTitleCase(key),
      primitive: "chip-list",
      showOnDetail: true,
      showOnCompact: false,
      rollup: false,
      items: toSupplementalTokens(value),
    }));
}

function summarizeExerciseDescription(exercise) {
  return exercise?.description || exercise?.summary || "No activity summary yet.";
}

function summarizeWhyItHelps(exercise) {
  return exercise?.whyItHelps || "No additional context yet.";
}

function summarizeItemLabels(items = [], limit = 3, fallback = "") {
  const labels = (items || [])
    .map((item) => item?.label)
    .filter(Boolean)
    .slice(0, limit);

  return labels.length ? labels.join(" / ") : fallback;
}

function summarizeUniqueLabels(values = [], limit = 2, fallback = "") {
  const normalized = uniq(
    (values || [])
      .map((value) => String(value ?? "").trim())
      .filter(Boolean),
  );
  const visible = normalized.slice(0, limit);
  if (!visible.length) {
    return fallback;
  }
  return normalized.length > visible.length
    ? `${visible.join(" / ")} +${normalized.length - visible.length}`
    : visible.join(" / ");
}

function average(values = []) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) {
    return null;
  }
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function formatDurationToken(value) {
  const seconds = Math.max(0, Number(value) || 0);
  if (!Number.isFinite(seconds)) {
    return "";
  }
  if (seconds === 0) {
    return "0s";
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (!remainder) {
    return `${minutes} min`;
  }
  return `${minutes}m ${remainder}s`;
}

function resolveEntrySetRestSeconds(entry, exercise) {
  const seconds = Number(entry?.restSeconds ?? entry?.restSec ?? exercise?.restSeconds);
  return Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
}

function resolveEntryTransitionSeconds(entry, exercise) {
  const explicit = Number(entry?.transitionAfterSeconds ?? entry?.transitionSec);
  if (Number.isFinite(explicit)) {
    return Math.max(0, explicit);
  }

  return resolveEntrySetRestSeconds(entry, exercise);
}

function resolveEntryTransitionLabel(entry) {
  return String(entry?.transitionLabel ?? entry?.transitionCue ?? "").trim();
}

function estimateEntryDurationSeconds(entry, exercise) {
  const trackingMode = inferRoutineEntryTrackingType(entry, exercise);
  const blocks = getRoutineEntryBlocks(entry);

  return blocks.reduce((sum, block) => {
    if (block.type === "rest") {
      return sum + Math.max(0, Number(block.seconds) || 0);
    }

    if (block.type !== "work") {
      return sum;
    }

    if (block.durationSeconds != null && block.durationSeconds !== "") {
      return sum + Math.max(10, Number(block.durationSeconds) || 0);
    }
    if (block.reps != null && block.reps !== "") {
      const reps = Math.max(1, Number(block.reps) || 1);
      const secondsPerRep = block.weight != null || trackingMode === "weight" ? 5 : 4;
      return sum + reps * secondsPerRep;
    }
    if (trackingMode === "duration") {
      return sum + 60;
    }

    return sum + 30;
  }, 0);
}

function estimateRoutineDurationSummary(entries = [], exerciseIndex = new Map()) {
  if (!entries.length) {
    return "Varies";
  }

  const transitionBuffer = entries.slice(0, -1).reduce((sum, entry) => {
    const exercise = exerciseIndex.get(entry.exerciseId) || null;
    return sum + resolveEntryTransitionSeconds(entry, exercise);
  }, 0);
  const totalSeconds = entries.reduce((sum, entry) => {
    const exercise = exerciseIndex.get(entry.exerciseId) || null;
    return sum + estimateEntryDurationSeconds(entry, exercise);
  }, 0) + transitionBuffer;

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "Varies";
  }

  const roundedMinutes = Math.max(5, Math.round(totalSeconds / 60 / 5) * 5);
  if (roundedMinutes <= 15) {
    return `Brief (~${roundedMinutes} min)`;
  }
  if (roundedMinutes <= 30) {
    return `Standard (~${roundedMinutes} min)`;
  }
  if (roundedMinutes <= 50) {
    return `Long (~${roundedMinutes} min)`;
  }
  return `Extended (~${roundedMinutes} min)`;
}

function deriveRoutineFormatSummary({ entryCount, domains = [], categories = [], trackingModes = [] }) {
  const domainValues = domains.map((item) => item.value);
  const categoryValues = categories.map((item) => String(item.value || "").toLowerCase());
  const trackingValues = trackingModes.map((item) => String(item.value || "").toLowerCase());
  const mentalOnly = domainValues.length && domainValues.every((value) => value === "mental");
  const mindBody = domainValues.includes("physical") && domainValues.includes("mental");
  const durationHeavy = trackingValues.length && trackingValues.every((value) => value === "duration");

  if (entryCount <= 1) {
    if (mentalOnly) return durationHeavy ? "Timed practice" : "Single practice";
    if (mindBody) return "Single mind-body activity";
    return "Single activity";
  }

  if (mentalOnly) {
    return durationHeavy ? "Timed practice routine" : "Practice routine";
  }
  if (categoryValues.includes("yoga")) return "Mind-body flow";
  if (categoryValues.includes("mobility")) return "Mobility routine";
  if (categoryValues.includes("rehab")) return "Rehab routine";
  if (categoryValues.includes("strength")) return "Strength routine";
  if (mindBody) return "Mind-body routine";
  return "Mixed routine";
}

function deriveRoutineFeelSummary(difficultyScore, domains = [], categories = []) {
  const score = Math.max(1, Number(difficultyScore ?? 1) || 1);
  const domainValues = domains.map((item) => item.value);
  const categoryValues = categories.map((item) => String(item.value || "").toLowerCase());
  const mentalOnly = domainValues.length && domainValues.every((value) => value === "mental");
  const mindBody = domainValues.includes("physical") && domainValues.includes("mental");

  if (mentalOnly) {
    if (categoryValues.includes("breathwork")) {
      return score >= 7 ? "Deep focus" : score >= 4 ? "Steady focus" : "Calm focus";
    }
    return score >= 7 ? "Deep focus" : score >= 4 ? "Focused" : "Calm";
  }

  if (mindBody) {
    return score >= 7 ? "Demanding balance" : score >= 4 ? "Balanced effort" : "Restorative";
  }

  if (categoryValues.includes("rehab")) {
    return score >= 7 ? "Challenging" : score >= 4 ? "Controlled" : "Gentle";
  }
  if (categoryValues.includes("mobility")) {
    return score >= 7 ? "Deep range" : score >= 4 ? "Steady range" : "Easy range";
  }
  return score >= 8 ? "Demanding effort" : score >= 5 ? "Steady effort" : "Easy start";
}

function deriveRoutineTransitionSummary(
  entries = [],
  domains = [],
  trackingModes = [],
  exerciseIndex = new Map(),
) {
  if ((entries || []).length <= 1) {
    return "Single activity";
  }

  const rests = entries
    .slice(0, -1)
    .map((entry) => resolveEntryTransitionSeconds(entry, exerciseIndex.get(entry.exerciseId) || null))
    .filter((value) => Number.isFinite(value));
  const avgRest = average(rests) ?? 0;
  const domainValues = domains.map((item) => item.value);
  const trackingValues = trackingModes.map((item) => item.value);
  const durationHeavy = trackingValues.length && trackingValues.every((value) => value === "duration");
  const mentalOnly = domainValues.length && domainValues.every((value) => value === "mental");

  if ((mentalOnly && durationHeavy) || avgRest <= 10) {
    return "No reset between activities";
  }
  if (avgRest <= 30) {
    return "Quick reset between activities";
  }
  if (avgRest <= 75) {
    return "Steady reset between activities";
  }
  return "Long reset between activities";
}

function deriveRoutinePaceSummary({ categories = [], trackingModes = [], transitionSummary = "", entries = [] }) {
  const categoryValues = categories.map((item) => String(item.value || "").toLowerCase());
  const trackingValues = trackingModes.map((item) => String(item.value || "").toLowerCase());
  const durationHeavy = trackingValues.length && trackingValues.every((value) => value === "duration");

  if (categoryValues.includes("yoga")) {
    return transitionSummary === "No reset between activities" ? "Breath-led flow" : "Hold, reset, repeat";
  }
  if (categoryValues.includes("mobility")) {
    return transitionSummary === "No reset between activities" ? "Continuous flow" : "Move, reset, repeat";
  }
  if (categoryValues.includes("rehab")) {
    return "Controlled reps with reset";
  }
  if (durationHeavy) {
    return entries.length <= 1 ? "Timed hold" : "Timed intervals with reset";
  }
  if (transitionSummary === "No reset between activities") {
    return "No reset between activities";
  }
  if (transitionSummary === "Quick reset between activities") {
    return "Quick reset between activities";
  }
  if (transitionSummary === "Steady reset between activities") {
    return "Steady reset between activities";
  }
  return "Long reset between activities";
}

function derivePracticeGlyph(categoryLabel, domainFamilyLabel) {
  const raw = String(categoryLabel || domainFamilyLabel || "").trim().toLowerCase();
  if (!raw) {
    return "AC";
  }
  if (raw.includes("breath")) return "BR";
  if (raw.includes("meditation")) return "MD";
  if (raw.includes("compassion")) return "CP";
  if (raw.includes("mind")) return "MB";
  if (raw.includes("yoga")) return "YG";
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "AC";
}

function derivePracticeVisualVariant(...candidates) {
  const raw = candidates
    .flat()
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase();

  if (!raw) {
    return "meditation";
  }
  if (raw.includes("breath")) {
    return "breathwork";
  }
  if (raw.includes("scan") || raw.includes("awareness") || raw.includes("open monitoring")) {
    return "awareness";
  }
  if (raw.includes("walking") || raw.includes("moving")) {
    return "moving";
  }
  if (raw.includes("compassion") || raw.includes("loving") || raw.includes("reflection")) {
    return "reflection";
  }
  return "meditation";
}

function buildPracticeVisualModel({
  familyLabel,
  headline,
  toneKey,
  pattern,
  tracking,
  setup,
}) {
  return {
    kind: "practice",
    familyLabel,
    headline,
    glyph: derivePracticeGlyph(headline, familyLabel),
    toneKey,
    variant: derivePracticeVisualVariant(toneKey, pattern, familyLabel, headline),
    pillars: [
      { label: "Pattern", value: pattern },
      { label: "Mode", value: tracking },
      { label: "Setup", value: setup },
    ].filter((pillar) => pillar.value),
  };
}

function buildExercisePrimaryVisualModel(exercise, detailFields = []) {
  const targetField = detailFields.find((field) => field.key === "bodyTargets");
  const secondaryTargetField = detailFields.find((field) => field.key === "secondaryMuscles");
  const equipmentField = detailFields.find((field) => field.key === "equipment");
  const modeField = detailFields.find((field) => field.key === "supportedTrackingModes");
  const movementField = detailFields.find((field) => field.key === "movementPattern");
  const categoryField = detailFields.find((field) => field.key === "category");
  const domains = getExerciseDomains(exercise);
  const primaryDomain = getExercisePrimaryDomain(exercise);
  const domainFamilyLabel = summarizeDomainFamily(domains);
  const categoryLabel = summarizeItemLabels(categoryField?.items, 1, toTitleCase(exercise?.category || primaryDomain));

  if ((targetField?.items?.length || 0) || (secondaryTargetField?.items?.length || 0)) {
    return {
      kind: "body",
      title: "Muscle map",
      emptyCopy: "This activity does not map to a muscle diagram yet.",
      primaryTargets: targetField?.items || [],
      secondaryTargets: secondaryTargetField?.items || [],
    };
  }

  return buildPracticeVisualModel({
    familyLabel: primaryDomain === "mental" ? "Mental practice" : `${domainFamilyLabel} activity`,
    headline: categoryLabel,
    toneKey: exercise?.category || primaryDomain,
    pattern: summarizeItemLabels(movementField?.items, 1, categoryLabel),
    tracking: summarizeItemLabels(
      modeField?.items,
      2,
      `Default ${toTitleCase(getExerciseDefaultTrackingType(exercise))}`,
    ),
    setup: summarizeItemLabels(equipmentField?.items, 2, "Open setup"),
  });
}

function buildRoutinePrimaryVisualModel({
  targets = [],
  secondaryTargets = [],
  domains = [],
  categories = [],
  movementPatterns = [],
  trackingModes = [],
  equipment = [],
}) {
  if (targets.length || secondaryTargets.length) {
    return {
      kind: "body",
      title: "Routine muscle map",
      emptyCopy: "This routine does not resolve to a muscle diagram yet.",
      primaryTargets: targets,
      secondaryTargets,
    };
  }

  const domainLabels = domains.map((item) => item.label);
  const categoryLabel = summarizeItemLabels(categories, 2, summarizeDomainFamily(domains.map((item) => item.value)));

  return buildPracticeVisualModel({
    familyLabel: summarizeDomainFamily(domains.map((item) => item.value)),
    headline: categoryLabel,
    toneKey: categories[0]?.value || domains[0]?.value || "mental",
    pattern: summarizeItemLabels(movementPatterns, 2, categoryLabel),
    tracking: summarizeItemLabels(trackingModes, 2, "Default modes"),
    setup: summarizeItemLabels(equipment, 2, "Open setup"),
  });
}

function summarizeSource(exercise) {
  if (!exercise?.sourceName && !exercise?.sourceUrl && !exercise?.notes) {
    return null;
  }

  return {
    name: exercise.sourceName || "Internal record",
    url: exercise.sourceUrl || "",
    notes: exercise.notes || "",
  };
}

export function buildExerciseDetailModel(exercise) {
  if (!exercise) {
    return null;
  }

  const registryFields = buildRegistryFields(exercise);
  const supplementalFields = buildSupplementalFields(exercise);
  const compactFields = registryFields.filter((field) => field.showOnCompact);
  const domains = getExerciseDomains(exercise);
  const primaryDomain = getExercisePrimaryDomain(exercise);
  const domainFamilyLabel = summarizeDomainFamily(domains);
  const categoryLabel = toTitleCase(exercise.category || primaryDomain || "activity");
  const isPractice = primaryDomain === "mental";
  const recordKindLabel = "Activity";
  const targetField = registryFields.find((field) => field.key === "bodyTargets");
  const equipmentField = registryFields.find((field) => field.key === "equipment");
  const modeField = registryFields.find((field) => field.key === "supportedTrackingModes");
  const movementField = registryFields.find((field) => field.key === "movementPattern");
  const domainField = registryFields.find((field) => field.key === "domains");
  const categoryField = registryFields.find((field) => field.key === "category");
  const executionUnitField = registryFields.find((field) => field.key === "executionUnitType");
  const primaryVisual = buildExercisePrimaryVisualModel(exercise, registryFields);
  const focusSummary = (targetField?.items || []).slice(0, 3).map((item) => item.label).join(" / ")
    || (
      isPractice
        ? summarizeItemLabels(
            movementField?.items,
            1,
            summarizeItemLabels(categoryField?.items, 1, "Mental practice"),
          )
        : summarizeItemLabels(
            categoryField?.items,
            1,
            domainFamilyLabel === "Mental" ? "Mental practice" : "General movement",
          )
    );
  const equipmentSummary = summarizeItemLabels(
    equipmentField?.items,
    3,
    isPractice ? "No equipment" : "Bodyweight",
  );
  const trackingSummary = summarizeItemLabels(
    modeField?.items,
    3,
    `Default ${toTitleCase(getExerciseDefaultTrackingType(exercise))}`,
  );
  const movementSummary = summarizeItemLabels(movementField?.items, 2, "");
  const executionUnitSummary = summarizeItemLabels(
    executionUnitField?.items,
    1,
    getExecutionUnitLabel(getExerciseExecutionUnitType(exercise)),
  );
  const keyFacts = [
    { label: "Focus", value: focusSummary },
    { label: "Unit", value: executionUnitSummary },
    { label: "Equipment", value: equipmentSummary },
    { label: "Tracking", value: trackingSummary },
    { label: "Pattern", value: movementSummary },
  ].filter((fact) => fact.value);
  const metadataFields = [...registryFields, ...supplementalFields].filter((field) => field.key !== "cues");
  const profileFields = metadataFields.filter(
    (field) => ![
      "equipment",
      "supportedTrackingModes",
      "movementPattern",
      "executionUnitType",
    ].includes(field.key),
  );
  const cueField = [...registryFields, ...supplementalFields].find((field) => field.key === "cues");

  return {
    id: exercise.id,
    name: exercise.name || "Untitled activity",
    slug: exercise.slug || "",
    title: exercise.name || "Untitled activity",
    subtitle: [
      domainFamilyLabel,
      categoryLabel,
      `Default ${toTitleCase(getExerciseDefaultTrackingType(exercise))}`,
    ].filter(Boolean).join(" / "),
    primaryDomain,
    domains,
    domainFamilyLabel,
    categoryLabel,
    recordKindLabel,
    defaultTrackingMode: getExerciseDefaultTrackingType(exercise),
    executionUnitType: getExerciseExecutionUnitType(exercise),
    executionUnitLabel: executionUnitSummary,
    description: summarizeExerciseDescription(exercise),
    whyItHelps: summarizeWhyItHelps(exercise),
    source: summarizeSource(exercise),
    recordSourceLabel: exercise.isCustom ? "Custom" : "Built-in",
    primaryVisual,
    focusSummary,
    equipmentSummary,
    trackingSummary,
    movementSummary,
    keyFacts,
    bodyVisual: primaryVisual.kind === "body"
      ? {
          primaryTargets: primaryVisual.primaryTargets,
          secondaryTargets: primaryVisual.secondaryTargets,
        }
      : {
          primaryTargets: [],
          secondaryTargets: [],
        },
    detailFields: [...registryFields, ...supplementalFields],
    metadataFields,
    profileFields,
    cueField,
    compactFields,
  };
}

export function buildExerciseCompactModel(exercise) {
  if (!exercise) {
    return null;
  }

  const detail = buildExerciseDetailModel(exercise);
  const targetField = detail.detailFields.find((field) => field.key === "bodyTargets");
  const equipmentField = detail.detailFields.find((field) => field.key === "equipment");
  const modeField = detail.detailFields.find((field) => field.key === "supportedTrackingModes");
  const movementField = detail.detailFields.find((field) => field.key === "movementPattern");
  const domainField = detail.detailFields.find((field) => field.key === "domains");
  const categoryField = detail.detailFields.find((field) => field.key === "category");

  return {
    id: exercise.id,
    name: detail.name,
    description: detail.description,
    compactFields: detail.compactFields,
    targets: targetField?.items || [],
    equipment: equipmentField?.items || [],
    trackingModes: modeField?.items || [],
    movementPatterns: movementField?.items || [],
    domains: domainField?.items || [],
    categories: categoryField?.items || [],
    executionUnitType: detail.executionUnitType,
    executionUnitLabel: detail.executionUnitLabel,
    focusSummary: detail.focusSummary,
    equipmentSummary: detail.equipmentSummary,
    trackingSummary: detail.trackingSummary,
    movementSummary: detail.movementSummary,
    domainFamilyLabel: detail.domainFamilyLabel,
    recordKindLabel: detail.recordKindLabel,
    primaryVisual: detail.primaryVisual,
    bodyVisual: detail.bodyVisual,
    route: `exercise/${exercise.id}`,
  };
}

function summarizeRoutineEntry(entry, exercise) {
  return buildRoutineEntryPrescription(entry, exercise)
    .map((item) => `${item.label} ${item.value}`)
    .join(" / ");
}

function summarizeEntryTarget(entryOrBlock, exercise) {
  const trackingMode = inferRoutineEntryTrackingType(entryOrBlock, exercise);
  if (entryOrBlock?.durationSeconds != null && entryOrBlock.durationSeconds !== "") {
    return formatDurationToken(entryOrBlock.durationSeconds);
  }
  if (entryOrBlock?.repTargetMode === "max") {
    return formatRepGoalLabel({
      metricType: "reps",
      reps: entryOrBlock.reps,
      repTargetMode: entryOrBlock.repTargetMode,
      effort: entryOrBlock.effort,
    });
  }
  if (entryOrBlock?.reps != null && entryOrBlock.reps !== "") {
    return formatRepGoalLabel({
      metricType: "reps",
      reps: entryOrBlock.reps,
      repTargetMode: entryOrBlock.repTargetMode,
      effort: entryOrBlock.effort,
    });
  }
  if (entryOrBlock?.weight != null && entryOrBlock.weight !== "") {
    return `${entryOrBlock.weight}kg`;
  }
  if (entryOrBlock?.resistance) {
    return String(entryOrBlock.resistance);
  }

  if (getExerciseExecutionUnitType(exercise) === "cycle") {
    return "Timed practice";
  }
  if (trackingMode === "duration") {
    return "Timed effort";
  }
  return `Default ${toTitleCase(trackingMode)}`;
}

function summarizeEntryLoad(entryOrBlock) {
  if (entryOrBlock?.weight != null && entryOrBlock.weight !== "") {
    return `${entryOrBlock.weight}kg`;
  }
  if (entryOrBlock?.resistance) {
    return String(entryOrBlock.resistance);
  }
  return "";
}

function summarizeEntryRest(entry, exercise) {
  const seconds = resolveEntrySetRestSeconds(entry, exercise);
  if (seconds <= 0) {
    return "Direct";
  }
  return formatDurationToken(seconds);
}

function summarizeEntryTransition(entry, exercise, options = {}) {
  const { isLastEntry = false } = options;
  if (isLastEntry) {
    return "";
  }

  const seconds = resolveEntryTransitionSeconds(entry, exercise);
  const label = resolveEntryTransitionLabel(entry);
  if (seconds > 0 && label) {
    return `${formatDurationToken(seconds)} / ${label}`;
  }
  if (seconds > 0) {
    return formatDurationToken(seconds);
  }
  if (label) {
    return label;
  }
  return "No reset";
}

function hasExplicitRoutineEntryBlocks(entry) {
  return Array.isArray(entry?.entryBlocks) && entry.entryBlocks.length > 0;
}

function resolveEntrySideMode(entry) {
  const explicit = normalizeRoutineEntrySideMode(entry?.sideMode);
  if (explicit) {
    return explicit;
  }

  const notes = String(entry?.notes || "").trim().toLowerCase();
  if (notes.startsWith("each side")) {
    return "each_side_then_switch";
  }
  return "";
}

function getEntryDisplayNote(entry) {
  const raw = String(entry?.notes || "").trim();
  if (!raw) {
    return "";
  }
  if (/^each side\s*\//i.test(raw)) {
    return "";
  }
  return raw;
}

function getEntrySideBadgeLabel(entry) {
  const sideMode = resolveEntrySideMode(entry);
  if (sideMode === "each_side_then_switch") {
    return "Left then right";
  }
  if (sideMode === "alternating") {
    return "Alternating sides";
  }
  return "";
}

function hasEntryMovementTrait(exerciseCompact, keyword) {
  const normalizedKeyword = String(keyword || "").trim().toLowerCase();
  if (!normalizedKeyword) {
    return false;
  }

  const values = [
    ...(exerciseCompact?.movementPatterns || []).map((item) => item?.label || item?.value),
    ...(exerciseCompact?.categories || []).map((item) => item?.label || item?.value),
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  return values.some((value) => value.includes(normalizedKeyword));
}

function deriveEntryTraitBadges(entry, exerciseCompact) {
  const badges = [];
  if (resolveEntrySideMode(entry)) {
    badges.push("Unilateral");
  }
  if (hasEntryMovementTrait(exerciseCompact, "balance")) {
    badges.push("Balance");
  }
  return badges;
}

function formatRoutineBlockSide(side) {
  const normalized = String(side ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  if (normalized === "left") {
    return "Left";
  }
  if (normalized === "right") {
    return "Right";
  }
  if (normalized === "both") {
    return "Both";
  }
  if (normalized === "alternating") {
    return "Alternating";
  }
  return toTitleCase(normalized);
}

function buildExecutionCell(kind, label, value, extra = {}) {
  if (!value) {
    return null;
  }
  return { kind, label, value, ...extra };
}

function deriveEntryModeSummary(entry, exercise) {
  const blocks = getRoutineEntryBlocks(entry).filter((block) => block.type === "work");
  const metricTypes = [...new Set(blocks.map((block) => getRoutineBlockMetricType(
    block,
    entry?.trackingType ?? exercise?.trackingType ?? "reps",
  )))];
  const hasWeight = blocks.some((block) => block?.weight != null && block.weight !== "");
  const hasResistance = blocks.some((block) => block?.resistance);

  if (metricTypes.length > 1) {
    return "Mixed targets";
  }
  if (metricTypes[0] === "duration") {
    return "Timed interval";
  }
  if (hasWeight) {
    return "Rep + load target";
  }
  if (hasResistance) {
    return "Rep + band target";
  }
  return "Rep target";
}

function buildWorkRowCells(block, entry, exercise, options = {}) {
  const metricType = getRoutineBlockMetricType(
    block,
    entry?.trackingType ?? exercise?.trackingType ?? "reps",
  );
  const target = summarizeEntryTarget(block, exercise);
  const load = summarizeEntryLoad(block);
  const side = formatRoutineBlockSide(block?.side);
  const hold = block?.holdSeconds ? `${formatDurationToken(block.holdSeconds)} per rep` : "";
  const tempoPresentation = getRoutineBlockTempoPresentation(block);
  const tempo = tempoPresentation?.summary || "";
  const omitSide = options.omitSide === true;

  return [
    omitSide ? null : buildExecutionCell("side", "Side", side),
    buildExecutionCell(
      metricType === "duration" ? "duration" : "reps",
      metricType === "duration" ? "Time" : "Target",
      target,
    ),
    buildExecutionCell("load", "Load", load),
    buildExecutionCell("hold", "Hold", hold),
    buildExecutionCell("tempo", "Tempo", tempo, { detail: tempoPresentation }),
    buildExecutionCell(
      "effort",
      "Effort",
      block?.effort && String(block.effort).trim().toLowerCase() !== "amrap"
        ? formatEffortLabel(block.effort)
        : "",
    ),
  ].filter(Boolean);
}

function buildExecutionRows(entry, exercise) {
  const blocks = getRoutineEntryBlocks(entry);
  const { displayMap, flowMode } = buildEntryWorkDisplayMap(blocks);

  return blocks.map((block) => {
    if (block.type === "rest") {
      return {
        type: "rest",
        id: block.id,
        label: block.label || "Rest",
        cells: [buildExecutionCell("rest", "Timer", formatDurationToken(block.seconds))].filter(Boolean),
        notes: block.notes || "",
      };
    }

    if (block.type === "switch_side") {
      return {
        type: "switch_side",
        id: block.id,
        label: block?.side ? `${formatRoutineBlockSide(block.side)} side` : (block.label || "Other side"),
        cells: [],
        notes: block.notes || "",
      };
    }

    const displayMeta = displayMap.get(block.id) || null;
    const sideLabel = formatRoutineBlockSide(block?.side);
    const compactLabel = flowMode === "each_side_then_switch"
      ? sideLabel || "Work"
      : flowMode === "alternating"
        ? "Alternating"
        : flowMode === "linear"
          ? "Work"
          : displayMeta?.displayTitle || block.label || "Work block";
    return {
      type: "work",
      id: block.id,
      label: displayMeta?.displayTitle || block.label || "Work block",
      progressLabel: displayMeta?.progressLabel || "",
      compactLabel,
      logicalIndex: displayMeta?.logicalIndex || null,
      totalLogical: displayMeta?.totalLogical || null,
      cells: buildWorkRowCells(block, entry, exercise, {
        omitSide: flowMode === "each_side_then_switch" || flowMode === "alternating",
      }),
      notes: block.notes || "",
    };
  });
}

function buildExecutionGroups(rows, flowMode, totalLogical) {
  if (!rows.length || totalLogical <= 1 || flowMode === "mixed") {
    return [];
  }

  const labelPrefix = flowMode === "linear" ? "Set" : "Round";
  const groups = [];
  let currentIndex = null;
  let currentGroup = null;

  rows.forEach((row) => {
    if (row.type === "work" && row.logicalIndex != null) {
      if (currentIndex !== row.logicalIndex) {
        currentIndex = row.logicalIndex;
        currentGroup = {
          id: `group-${row.logicalIndex}`,
          label: `${labelPrefix} ${row.logicalIndex}`,
          rows: [],
        };
        groups.push(currentGroup);
      }
    }

    if (!currentGroup) {
      currentGroup = {
        id: "group-1",
        label: labelPrefix === "Set" ? "Set 1" : "Round 1",
        rows: [],
      };
      groups.push(currentGroup);
    }

    currentGroup.rows.push(row);
  });

  return groups;
}

function buildRoutineEntryDisplayBlocks(entry, exercise) {
  const blocks = getRoutineEntryBlocks(entry);
  const rows = buildExecutionRows(entry, exercise);
  const { flowMode, totalLogical } = buildEntryWorkDisplayMap(blocks);
  const groups = buildExecutionGroups(rows, flowMode, totalLogical);
  const badge = totalLogical > 1
    ? (
      flowMode === "each_side_then_switch" || flowMode === "alternating"
        ? `${totalLogical} rounds`
        : flowMode === "linear"
          ? `${totalLogical} sets`
          : `${totalLogical} blocks`
    )
    : "";

  return [
    {
      type: "sequence",
      id: entry?.id || `sequence-${entry?.order || 0}`,
      label: rows.some((row) => row.type === "rest") ? "Execution flow" : "Execution set",
      badge,
      rows,
      groups,
      notes: "",
    },
  ];
}

function buildEntryTransitionConnector(entry, exercise, nextExercise) {
  const nextName = nextExercise?.name || "Next activity";
  const seconds = resolveEntryTransitionSeconds(entry, exercise);
  const label = resolveEntryTransitionLabel(entry);

  let summary = "";
  if (seconds > 0 && label) {
    summary = `${formatDurationToken(seconds)} reset / ${label}`;
  } else if (seconds > 0) {
    summary = `${formatDurationToken(seconds)} reset before ${nextName}`;
  } else if (label) {
    summary = label;
  } else {
    summary = `Move directly to ${nextName}`;
  }

  return {
    label: label || (seconds > 0 ? "Reset" : "No reset"),
    nextName,
    seconds,
    cue: label,
    summary,
  };
}

function buildRoutineEntryPrescription(entry, exercise, options = {}) {
  const sets = Math.max(1, Number(entry?.sets ?? 1) || 1);
  const target = summarizeEntryTarget(entry, exercise);
  const load = summarizeEntryLoad(entry);
  const setRest = summarizeEntryRest(entry, exercise);
  const parts = [];

  parts.push({
    label: "Sets",
    value: String(sets),
  });

  if (target) {
    parts.push({
      label: "Target",
      value: target,
    });
  }
  if (load) {
    parts.push({
      label: "Load",
      value: load,
    });
  }
  if (setRest) {
    parts.push({
      label: "Set rest",
      value: setRest,
    });
  }

  return parts;
}

function collectRoutineAggregate(fields, key) {
  const values = fields
    .filter((field) => field.key === key && field.rollup)
    .flatMap((field) => field.items || []);

  const seen = new Set();
  return values.filter((item) => {
    const token = `${item.value}::${item.label}`;
    if (seen.has(token)) {
      return false;
    }
    seen.add(token);
    return true;
  });
}

export function buildRoutineCompactModel(routine, exercises = []) {
  if (!routine) {
    return null;
  }

  const entries = routine.entries || routine.exercises || [];
  const exerciseIndex = new Map((exercises || []).map((exercise) => [exercise.id, exercise]));
  const linkedExercises = entries
    .map((entry) => exerciseIndex.get(entry.exerciseId))
    .filter(Boolean);
  const exerciseCompacts = linkedExercises.map((exercise) => buildExerciseCompactModel(exercise)).filter(Boolean);
  const allFields = linkedExercises.flatMap((exercise) => buildRegistryFields(exercise));
  const aggregateFields = EXERCISE_METADATA_REGISTRY
    .filter((field) => field.rollup)
    .map((field) => ({
      key: field.key,
      label: field.label,
      primitive: field.primitive,
      items: collectRoutineAggregate(allFields, field.key),
    }))
    .filter((field) => field.items.length);
  const domains = aggregateFields.find((field) => field.key === "domains")?.items || [];
  const movementPatterns = aggregateFields.find((field) => field.key === "movementPattern")?.items || [];
  const equipment = aggregateFields.find((field) => field.key === "equipment")?.items || [];
  const targets = aggregateFields.find((field) => field.key === "bodyTargets")?.items || [];
  const trackingModes = aggregateFields.find((field) => field.key === "supportedTrackingModes")?.items || [];
  const categories = aggregateFields.find((field) => field.key === "category")?.items || [];
  const focusSummary = summarizeItemLabels(
    targets,
    3,
    summarizeItemLabels(categories, 2, summarizeItemLabels(domains, 2, "Mixed session")),
  );
  const equipmentSummary = summarizeItemLabels(equipment, 3, "Bodyweight");
  const trackingSummary = summarizeItemLabels(trackingModes, 3, "Default modes");
  const domainSummary = summarizeItemLabels(domains, 2, "General");
  const movementSummary = summarizeItemLabels(movementPatterns, 2, "General");
  const formatSummary = deriveRoutineFormatSummary({
    entryCount: entries.length,
    domains,
    categories,
    trackingModes,
  });
  const transitionSummary = deriveRoutineTransitionSummary(
    entries,
    domains,
    trackingModes,
    exerciseIndex,
  );
  const paceSummary = deriveRoutinePaceSummary({
    categories,
    trackingModes,
    transitionSummary,
    entries,
  });
  const feelSummary = deriveRoutineFeelSummary(routine.difficultyScore, domains, categories);
  const durationSummary = estimateRoutineDurationSummary(entries, exerciseIndex);
  const overviewLine = [durationSummary, transitionSummary, equipmentSummary].filter(Boolean).join(" / ");
  const overviewStats = [
    { label: "Target areas", value: focusSummary },
    { label: "Session type", value: formatSummary },
    { label: "Work rhythm", value: paceSummary },
    { label: "Effort level", value: feelSummary },
  ].filter((item) => item.value);

  return {
    id: routine.id,
    name: routine.name || "Untitled Routine",
    description: routine.description || routine.notes || "No routine summary yet.",
    difficultyScore: routine.difficultyScore ?? null,
    recordSourceLabel: routine.isCustom ? "Custom" : "Built-in",
    entryCount: entries.length,
    route: `routine/${routine.id}`,
    equipment,
    targets,
    trackingModes,
    movementPatterns,
    domains,
    categories,
    focusSummary,
    equipmentSummary,
    trackingSummary,
    domainSummary,
    movementSummary,
    formatSummary,
    transitionSummary,
    paceSummary,
    feelSummary,
    durationSummary,
    overviewLine,
    overviewStats,
    primaryVisual: buildRoutinePrimaryVisualModel({
      targets,
      secondaryTargets: [],
      domains,
      categories,
      movementPatterns,
      trackingModes,
      equipment,
    }),
    bodyVisual: {
      primaryTargets: targets,
      secondaryTargets: [],
    },
    aggregateFields,
    exercises: exerciseCompacts,
  };
}

export function buildRoutineDetailModel(routine, exercises = []) {
  if (!routine) {
    return null;
  }

  const entries = routine.entries || routine.exercises || [];
  const exerciseIndex = new Map((exercises || []).map((exercise) => [exercise.id, exercise]));
  const compact = buildRoutineCompactModel(routine, exercises);
  const detailEntries = entries.map((entry, index) => {
    const exercise = exerciseIndex.get(entry.exerciseId) || null;
    const nextExercise = exerciseIndex.get(entries[index + 1]?.exerciseId) || null;
    const exerciseCompact = buildExerciseCompactModel(exercise);
    const isLastEntry = index === entries.length - 1;
    return {
      id: entry.id,
      order: entry.order ?? index + 1,
      type: entry.type || "exercise",
      exerciseId: entry.exerciseId,
      exerciseName: exercise?.name || "Unknown activity",
      exerciseCompact,
      sideBadgeLabel: getEntrySideBadgeLabel(entry),
      traitBadges: deriveEntryTraitBadges(entry, exerciseCompact),
      executionUnitLabel: exercise ? getExecutionUnitLabel(getExerciseExecutionUnitType(exercise)) : "",
      modeSummary: deriveEntryModeSummary(entry, exercise),
      summary: summarizeRoutineEntry(entry, exercise),
      setRestSummary: summarizeEntryRest(entry, exercise),
      transitionSummary: summarizeEntryTransition(entry, exercise, { isLastEntry }),
      prescriptionItems: buildRoutineEntryPrescription(entry, exercise),
      displayBlocks: buildRoutineEntryDisplayBlocks(entry, exercise),
      transitionConnector: isLastEntry ? null : buildEntryTransitionConnector(entry, exercise, nextExercise),
      notes: getEntryDisplayNote(entry),
    };
  });
  const flowItems = detailEntries.flatMap((entry) => {
    const items = [
      {
        kind: "entry",
        key: `entry-${entry.id || entry.order}`,
        entry,
      },
    ];

    if (entry.transitionConnector) {
      items.push({
        kind: "transition",
        key: `transition-${entry.id || entry.order}`,
        transition: entry.transitionConnector,
      });
    }

    return items;
  });

  return {
    ...compact,
    notes: routine.notes || "",
    entries: detailEntries,
    flowItems,
  };
}

function summarizeMilestone(stage, exercises = []) {
  const milestone = stage?.milestone || {};
  const eligibility = milestone.eligibility || { type: "cycles", target: 1, requiresContinuous: false };
  const test = milestone.test || {};

  if (test.type === "exercise" && test.exerciseId) {
    const exerciseName =
      exercises.find((exercise) => exercise.id === test.exerciseId)?.name || "Activity";
    const metricLabel = test.metric === "duration" ? "seconds" : "reps";
    return `Milestone test: ${exerciseName} / ${test.target ?? 1} ${metricLabel}`;
  }

  if (eligibility.type === "none") {
    return stage?.transitionRule === "manual" ? "Manual advancement stage" : "Advance any time";
  }

  if (eligibility.type === "sessions") {
    const target = eligibility.target ?? 1;
    return `Unlock after ${target} session${target === 1 ? "" : "s"}`;
  }

  const target = eligibility.target ?? 1;
  if (eligibility.requiresContinuous) {
    return `Unlock after ${target} consecutive cycle completion${target === 1 ? "" : "s"}`;
  }
  return `Unlock after ${target} cycle completion${target === 1 ? "" : "s"}`;
}

function summarizeStageSupport(stage) {
  const parts = [];
  const feedbackPrompts = Array.isArray(stage?.milestone?.feedbackPrompts) ? stage.milestone.feedbackPrompts : [];
  const onFailure = stage?.milestone?.onFailure || {};

  if (stage?.transitionRule === "manual") {
    parts.push("Advance later by hand");
  }
  if (onFailure.action === "restart_stage") {
    parts.push("Failed test restarts this stage");
  } else if (onFailure.action === "goto_stage") {
    parts.push("Failed test redirects to another stage");
  }
  if (feedbackPrompts.length) {
    parts.push(`Check-ins: ${feedbackPrompts.map((prompt) => prompt.label).join(" / ")}`);
  }

  return parts.join(" / ");
}
export function buildStageStudyModel(stage, routines = [], exercises = [], options = {}) {
  if (!stage) {
    return null;
  }

  const routineIndex = new Map((routines || []).map((routine) => [routine.id, routine]));
  const exerciseIndex = new Map((exercises || []).map((exercise) => [exercise.id, exercise]));
  const scheduleSteps = (stage.schedule || []).map((entry, index) => {
    if (entry?.type === "rest" || !entry?.routineId) {
      return {
        key: `rest-${index}`,
        stepIndex: index + 1,
        type: "rest",
        title: "Rest day",
        summary: "Recovery step - no routine scheduled here.",
        routine: null,
      };
    }

    const routine = routineIndex.get(entry.routineId) || null;
    const routineCompact = buildRoutineCompactModel(routine, exercises);
    return {
      key: `${entry.routineId}-${index}`,
      stepIndex: index + 1,
      type: "routine",
      title: routine?.name || "Routine",
      routine: routineCompact,
      summary:
        routineCompact?.focusSummary
        || routine?.description
        || routine?.notes
        || "No routine summary yet.",
    };
  });

  const milestoneExercise = stage?.milestone?.test?.exerciseId
    ? exerciseIndex.get(stage.milestone.test.exerciseId) || null
    : null;
  const stageEquipment = normalizeEquipment([
    ...scheduleSteps.flatMap((step) => step.routine?.equipment?.map((item) => item.label) || []),
    ...(milestoneExercise?.equipment || []),
  ]);
  const routineSummaries = scheduleSteps
    .filter((step) => step.routine)
    .map((step) => step.routine);
  const stageOverviewStats = [
    { label: "Focus", value: summarizeUniqueLabels(routineSummaries.map((routine) => routine.focusSummary), 2, "") },
    { label: "Session mix", value: summarizeUniqueLabels(routineSummaries.map((routine) => routine.formatSummary), 2, "") },
    { label: "Cadence", value: summarizeUniqueLabels(routineSummaries.map((routine) => routine.paceSummary), 1, "") },
    { label: "Setup", value: stageEquipment.length ? stageEquipment.join(" / ") : "" },
  ].filter((item) => item.value);

  return {
    id: stage.id,
    name: stage.name || "Untitled Stage",
    guidance: stage.guidance || stage.milestone?.description || "No stage guidance written yet.",
    milestoneSummary: summarizeMilestone(stage, exercises),
    feedbackPrompts: Array.isArray(stage?.milestone?.feedbackPrompts)
      ? stage.milestone.feedbackPrompts.map((prompt) => ({
          id: prompt.id,
          label: prompt.label,
          placeholder: prompt.placeholder || "",
        }))
      : [],
    stageOverviewStats,
    supportSummary: summarizeStageSupport(stage),
    stageEquipment: stageEquipment.map((item) => ({ value: item, label: item })),
    scheduleSteps,
    stepCount: scheduleSteps.length,
    isCurrent: Boolean(options.isCurrent),
    stateLabel: options.stateLabel || "",
  };
}


