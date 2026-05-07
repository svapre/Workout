import { migrateActivePlan, migrateBlueprint } from "../schemaMigration.js";

export function createPlanRepository(localStore, seedFactory, collectionKey = "plans") {
  const seeded = localStore.load();
  const isActive = collectionKey === "active_plans";
  let items = Array.isArray(seeded?.[collectionKey]) && seeded[collectionKey].length
    ? seeded[collectionKey].map((p) => (isActive ? migrateActivePlan(p) : migrateBlueprint(p)))
    : seedFactory
      ? seedFactory().map((p) => (isActive ? migrateActivePlan(p) : migrateBlueprint(p)))
      : [];

  persist();

  function persist() {
    localStore.save({ [collectionKey]: items });
  }

  return {
    list() {
      return structuredClone(items);
    },
    replaceAll(nextItems) {
      items = structuredClone(nextItems).map((p) => (isActive ? migrateActivePlan(p) : migrateBlueprint(p)));
      persist();
    },
  };
}
