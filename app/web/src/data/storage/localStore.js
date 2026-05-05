export function createLocalStore(storageKey) {
  return {
    load() {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }

      try {
        return JSON.parse(raw);
      } catch (error) {
        console.warn(`Could not parse local data for ${storageKey}.`, error);
        return null;
      }
    },
    save(payload) {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    },
  };
}
