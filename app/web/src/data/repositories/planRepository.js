export function createPlanRepository(localStore, seedFactory) {
  const seeded = localStore.load();
  let plans = Array.isArray(seeded?.plans) && seeded.plans.length
    ? seeded.plans
    : seedFactory ? seedFactory() : [];

  persist();

  function persist() {
    localStore.save({ plans });
  }

  return {
    list() {
      return structuredClone(plans);
    },
    replaceAll(nextPlans) {
      plans = structuredClone(nextPlans);
      persist();
    },
  };
}
