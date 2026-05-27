function cleanText(value) {
  return String(value ?? "").trim();
}

export function isRoutineStageStep(step) {
  return step?.type === "routine" && Boolean(step?.routine?.id || step?.routineId);
}

export function getStageStepKindLabel(step) {
  return step?.type === "rest" ? "Rest" : "Routine";
}

export function getStageStepTitle(step) {
  if (step?.type === "rest") {
    return "Rest day";
  }

  return cleanText(step?.title || step?.routine?.name) || "Routine";
}

export function getStageStepSummary(step, options = {}) {
  const compact = Boolean(options.compact);

  if (step?.type === "rest") {
    return compact
      ? "Recovery step - no routine scheduled here."
      : "Recovery step - no routine is scheduled here. Use this step exactly as the plan intends.";
  }

  const parts = [
    cleanText(step?.summary || step?.routine?.focusSummary),
    cleanText(step?.routine?.durationSummary || step?.routine?.formatSummary),
  ].filter(Boolean);

  return parts.join(" / ") || "Routine step";
}
