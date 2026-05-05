import { createId } from "../core/uid.js";

function buildExercise(config, order) {
  return {
    id: createId("exercise"),
    order,
    name: config.name,
    exerciseSlug: config.exerciseSlug ?? "",
    mode: config.mode,
    targetSets: config.targetSets,
    targetReps: config.targetReps,
    targetDurationSec: config.targetDurationSec,
    targetWeightKg: config.targetWeightKg,
    restSec: config.restSec,
    notes: config.notes,
  };
}

export function createSeedRoutines() {
  return [
    {
      id: createId("routine"),
      name: "Stage 1 Rehab",
      notes: "Foundational corrective work with simple, repeatable movements.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exercises: [
        buildExercise(
          {
            name: "Surya Namaskar",
            exerciseSlug: "surya-namaskar",
            mode: "reps+time",
            targetSets: 3,
            targetReps: 12,
            targetDurationSec: 300,
            targetWeightKg: 0,
            restSec: 30,
            notes: "Smooth tempo, no rushed transitions.",
          },
          1,
        ),
        buildExercise(
          {
            name: "Bird Dog",
            exerciseSlug: "bird-dog",
            mode: "reps+time",
            targetSets: 3,
            targetReps: 10,
            targetDurationSec: 60,
            targetWeightKg: 0,
            restSec: 30,
            notes: "Count both sides together for each set.",
          },
          2,
        ),
        buildExercise(
          {
            name: "Glute Bridge",
            exerciseSlug: "glute-bridge",
            mode: "reps-only",
            targetSets: 3,
            targetReps: 15,
            targetDurationSec: null,
            targetWeightKg: 0,
            restSec: 45,
            notes: "Pause briefly at the top.",
          },
          3,
        ),
      ],
    },
    {
      id: createId("routine"),
      name: "Push-up Base",
      notes: "Simple upper body builder with room for future progress tracking.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exercises: [
        buildExercise(
          {
            name: "Incline Push-up",
            exerciseSlug: "incline-push-up",
            mode: "reps-only",
            targetSets: 4,
            targetReps: 10,
            targetDurationSec: null,
            targetWeightKg: 0,
            restSec: 60,
            notes: "Choose a height that keeps reps crisp.",
          },
          1,
        ),
        buildExercise(
          {
            name: "Band Row",
            exerciseSlug: "band-row",
            mode: "reps-only",
            targetSets: 4,
            targetReps: 12,
            targetDurationSec: null,
            targetWeightKg: 0,
            restSec: 45,
            notes: "Pair with push-ups for balanced volume.",
          },
          2,
        ),
      ],
    },
  ];
}

export function createSeedPlans() {
  return [
    {
      id: createId("plan"),
      name: "The Mind Illuminated (Meditation)",
      description: "A 10-stage guide to integrating mindfulness into your daily life. Culadasa's progressive approach to meditation, focusing on overcoming specific obstacles at each stage.",
      isActive: true,
      goals: [
        {
          id: createId("goal"),
          title: "Daily Sit",
          target: "45 mins",
          timeframe: "End of Month 1"
        },
        {
          id: createId("goal"),
          title: "Continuous Attention",
          target: "10 mins uninterrupted",
          timeframe: "Month 3"
        }
      ],
      stages: [
        {
          id: createId("stage"),
          name: "Stage 1: Establishing a Practice",
          condition: "You can sit consistently every day for your target duration without skipping."
        },
        {
          id: createId("stage"),
          name: "Stage 2: Overcoming Mind-Wandering",
          condition: "You notice mind-wandering quickly and can return to the breath. Periods of mind-wandering are shorter than periods of sustained attention."
        },
        {
          id: createId("stage"),
          name: "Stage 3: Overcoming Forgetting",
          condition: "You rarely forget the breath entirely. You can maintain attention on the breath, though it may still slip into the background."
        },
        {
          id: createId("stage"),
          name: "Stage 4: Continuous Attention",
          condition: "Gross distractions and strong dullness are overcome. You maintain continuous, unbroken attention on the meditation object."
        }
      ]
    }
  ];
}
