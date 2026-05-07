/**
 * Master Exercise Catalog
 *
 * Provides high-integrity exercise references with strict IDs and rich metadata.
 */

export function createSeedExerciseCatalog() {
  return [
    {
      id: "ex_bird_dog",
      slug: "bird-dog",
      name: "Bird Dog",
      category: "rehab",
      type: "mobility",
      trackingType: "duration",
      description:
        "A trunk stability drill where opposite arm and leg reach long while the spine stays controlled.",
      primaryMuscles: ["Core", "Glutes"],
      bodyTargets: ["bm_core", "bm_glutes"],
      equipment: ["None"],
      cues: [],
      restSeconds: 60,
      aliases: [],
      movementPattern: "",
      whyItHelps: "",
      isCustom: false,
    },
    {
      id: "ex_glute_bridge",
      slug: "glute-bridge",
      name: "Glute Bridge",
      category: "strength",
      type: "physical",
      trackingType: "reps",
      description:
        "A supine hip extension movement that trains the glutes while keeping spinal loading relatively low.",
      primaryMuscles: ["Glutes"],
      bodyTargets: ["bm_glutes"],
      equipment: ["None"],
      cues: [],
      restSeconds: 60,
      aliases: [],
      movementPattern: "",
      whyItHelps: "",
      isCustom: false,
    },
    {
      id: "ex_pushup",
      slug: "pushup",
      name: "Push-up",
      category: "strength",
      type: "physical",
      trackingType: "reps",
      description:
        "A classic bodyweight pressing movement with a strong trunk stability component.",
      primaryMuscles: ["Chest", "Triceps"],
      bodyTargets: ["bm_chest", "bm_triceps"],
      equipment: ["None"],
      cues: [],
      restSeconds: 60,
      aliases: [],
      movementPattern: "",
      whyItHelps: "",
      isCustom: false,
    },
    {
      id: "ex_band_row",
      slug: "band-row",
      name: "Band Row",
      category: "strength",
      type: "physical",
      trackingType: "reps",
      description:
        "A row pattern using a resistance band for upper-back and arm work.",
      primaryMuscles: ["Lats", "Upper Back"],
      bodyTargets: ["bm_back"],
      equipment: ["Resistance Band"],
      cues: [],
      restSeconds: 60,
      aliases: [],
      movementPattern: "",
      whyItHelps: "",
      isCustom: false,
    },
  ];
}
