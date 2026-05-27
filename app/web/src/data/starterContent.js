import { createSeedExerciseCatalog } from "./defaultExerciseCatalog.js";
import { createSeedRoutines, createSeedPlans } from "./defaults.js";
import { createSeedBodyMap } from "./repositories/bodyMapRepository.js";

export const STARTER_CONTENT_VERSION = "2026-05-09.5";

export function createStarterContentBundle() {
  return {
    version: STARTER_CONTENT_VERSION,
    bodyTargets: createSeedBodyMap(),
    exercises: createSeedExerciseCatalog(),
    routines: createSeedRoutines(),
    plans: createSeedPlans(),
  };
}
