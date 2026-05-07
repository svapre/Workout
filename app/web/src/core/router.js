export function createRouter(validRoutes, defaultRoute) {
  // We'll treat validRoutes as prefixes for dynamic segments if they contain a slash or we can just use simple matching for now
  const listeners = new Set();

  function readRoute() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (!hash) return defaultRoute;

    // Check for exact matches first
    if (validRoutes.includes(hash)) return hash;

    // Check for dynamic routes like "active-plan/id"
    const parts = hash.split('/');
    const base = parts[0];
    if (validRoutes.includes(base) && parts.length > 1) {
        return hash; // Allow the full hash if the base is valid
    }

    return defaultRoute;
  }

  function notify() {
    const route = readRoute();
    listeners.forEach((listener) => listener(route));
  }

  return {
    getCurrentRoute() {
      return readRoute();
    },
    navigate(route) {
      window.location.hash = `#/${route}`;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      window.addEventListener("hashchange", notify);

      if (!window.location.hash) {
        this.navigate(defaultRoute);
        // navigate will trigger hashchange which calls notify
        return;
      }

      notify();
    },
  };
}
