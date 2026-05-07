function sc(items) {
  return typeof structuredClone === "function" ? structuredClone(items) : JSON.parse(JSON.stringify(items));
}

export function createSeedBodyMap() {
  const rows = [
    ["bm_chest", "Chest", "muscle"],
    ["bm_back", "Back", "muscle"],
    ["bm_shoulders", "Shoulders", "muscle"],
    ["bm_biceps", "Biceps", "muscle"],
    ["bm_triceps", "Triceps", "muscle"],
    ["bm_forearms", "Forearms", "muscle"],
    ["bm_core", "Core", "muscle"],
    ["bm_lower_back", "Lower Back", "muscle"],
    ["bm_glutes", "Glutes", "muscle"],
    ["bm_quads", "Quadriceps", "muscle"],
    ["bm_hamstrings", "Hamstrings", "muscle"],
    ["bm_calves", "Calves", "muscle"],
    ["bm_hip_flexors", "Hip Flexors", "muscle"],
    ["bm_neck", "Neck", "muscle"],
  ];
  return rows.map(([id, name, category]) => ({
    id,
    name,
    category,
    isCustom: false,
  }));
}

export function createBodyMapRepository(localStore, seedFactory) {
  const seeded = localStore.load();
  let bodyMaps = Array.isArray(seeded?.bodyMaps) && seeded.bodyMaps.length
    ? seeded.bodyMaps
    : seedFactory();

  persist();

  function persist() {
    localStore.save({ bodyMaps });
  }

  return {
    getAll() {
      return sc(bodyMaps);
    },
    getById(id) {
      const found = bodyMaps.find((b) => b.id === id);
      return found ? sc(found) : null;
    },
    save(entry) {
      if (!entry?.id) return null;
      const idx = bodyMaps.findIndex((b) => b.id === entry.id);
      if (idx === -1) {
        bodyMaps = [...bodyMaps, { ...entry }];
      } else {
        bodyMaps = bodyMaps.map((b) => (b.id === entry.id ? { ...b, ...entry } : b));
      }
      persist();
      return sc(bodyMaps.find((b) => b.id === entry.id));
    },
    delete(id) {
      bodyMaps = bodyMaps.filter((b) => b.id !== id);
      persist();
    },
    replaceAll(next) {
      bodyMaps = sc(next);
      persist();
    },
  };
}
