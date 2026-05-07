const NAV_GROUPS = [
  {
    label: null, // primary group, no label needed
    items: [
      { id: "active-plans", label: "Active Plans" },
      { id: "workouts", label: "Workouts" },
    ],
  },
  {
    label: "Library",
    items: [
      { id: "plans", label: "Plan Blueprints" },
      { id: "routines", label: "Routines" },
      { id: "exercises", label: "Exercises" },
    ],
  },
];

export function renderShell(root, state, actions) {
  root.innerHTML = `
    <main class="app-shell">
      <section class="hero">
        <div class="hero__inner">
          <div>
            <p class="eyebrow">Workout App Workspace</p>
            <h1>Modular training data, clean exports, flexible dashboards.</h1>
            <p>Each feature lives in its own module so routine editing, logging, storage, and dashboard rendering can evolve without tripping over each other.</p>
          </div>
          <div class="hero__meta">
            <span class="hero__chip">Static web app - zero build setup</span>
            <span class="hero__chip">Storage adapter: browser localStorage</span>
            <span class="hero__chip">CSV-first routine templates</span>
          </div>
        </div>
      </section>

      <nav class="nav" aria-label="Primary">
        ${NAV_GROUPS.map((group, gi) => `
          ${gi > 0 ? '<span class="nav__divider"></span>' : ''}
          ${group.label ? `<span class="nav__group-label">${group.label}</span>` : ''}
          ${group.items.map((item) => `
            <button
              class="nav__button ${state.route === item.id ? "is-active" : ""}"
              data-route="${item.id}"
              type="button"
            >
              ${item.label}
            </button>
          `).join("")}
        `).join("")}
      </nav>

      ${state.notice ? `
        <div class="status-banner">
          <span class="status-banner__dot"></span>
          <span>${state.notice}</span>
          <button class="button button--ghost" data-action="clear-notice" type="button">Dismiss</button>
        </div>
      ` : ""}

      <div data-role="outlet"></div>
    </main>
  `;

  root.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      actions.navigate(button.dataset.route);
    });
  });

  root.querySelector('[data-action="clear-notice"]')?.addEventListener("click", () => {
    actions.clearNotice();
  });

  return root.querySelector('[data-role="outlet"]');
}
