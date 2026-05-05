export function createRouter(validRoutes, defaultRoute) {
  const allowed = new Set(validRoutes);
  const listeners = new Set();

  function readRoute() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    return allowed.has(hash) ? hash : defaultRoute;
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
      const nextRoute = allowed.has(route) ? route : defaultRoute;
      window.location.hash = `#/${nextRoute}`;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      window.addEventListener("hashchange", notify);

      if (!window.location.hash) {
        this.navigate(defaultRoute);
        notify();
        return;
      }

      notify();
    },
  };
}
