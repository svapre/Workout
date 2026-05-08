const NAV_ITEMS = [
  { id: "active-plans", label: "Home", icon: "home", description: "Active plans & current workouts" },
  { id: "workouts", label: "History", icon: "history", description: "Past workout logs" },
  { id: "plans", label: "Plans", icon: "plans", description: "Training plan blueprints" },
  { id: "routines", label: "Routines", icon: "routines", description: "Workout routines" },
  { id: "exercises", label: "Exercises", icon: "exercises", description: "Exercise catalog" },
];

function renderNavIcon(iconId, className) {
  const path = {
    home: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z"/>',
    history: '<path d="M12 7v5l3 2"/><path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4h4"/>',
    plans: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    routines: '<path d="M8 5h8"/><path d="M7 9h10"/><path d="M6 13h12"/><path d="M10 17h4"/>',
    exercises: '<path d="M7 12h10"/><path d="M9 9.5 7 12l2 2.5"/><path d="M15 9.5 17 12l-2 2.5"/><path d="M12 5v14"/>',
  }[iconId] || '<circle cx="12" cy="12" r="7"/>';

  return `
    <span class="${className}" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        ${path}
      </svg>
    </span>
  `;
}

export function renderShell(root, state, actions) {
  const currentRoute = state.route;
  const isExecutionRoute = currentRoute.startsWith("workout-player/");
  const isDetailView =
    currentRoute.includes("/") ||
    (currentRoute !== "active-plans" &&
      currentRoute !== "workouts" &&
      currentRoute !== "plans" &&
      currentRoute !== "routines" &&
      currentRoute !== "exercises");

  root.innerHTML = `
    <div class="app-container">
      ${isExecutionRoute ? "" : `
        <header class="app-header">
          <div class="header-content">
            <div class="header-left">
              ${isDetailView ? `
                <button class="back-button" data-action="back" type="button" aria-label="Go back">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
              ` : ""}
              <div class="brand">
                <h1 class="brand__title">Journey</h1>
                <span class="brand__subtitle">Your next session, defined.</span>
              </div>
            </div>

            <nav class="main-nav desktop-nav" aria-label="Main navigation">
              ${NAV_ITEMS.map((item) => `
                <button
                  class="nav-button ${getNavButtonClass(currentRoute, item.id)}"
                  data-route="${item.id}"
                  type="button"
                  aria-label="${item.label}"
                  title="${item.description}"
                >
                  ${renderNavIcon(item.icon, "nav-icon")}
                  <span class="nav-label">${item.label}</span>
                </button>
              `).join("")}
            </nav>

            <nav class="compact-nav mobile-header-nav" aria-label="Quick navigation">
              ${NAV_ITEMS.slice(0, 4).map((item) => `
                <button
                  class="compact-nav-button ${getNavButtonClass(currentRoute, item.id)}"
                  data-route="${item.id}"
                  type="button"
                  aria-label="${item.label}"
                  title="${item.description}"
                >
                  ${renderNavIcon(item.icon, "compact-nav-icon")}
                </button>
              `).join("")}
            </nav>
          </div>
        </header>
      `}

      <main class="main-content${isExecutionRoute ? " main-content--immersive" : ""}" data-role="outlet"></main>

      ${isExecutionRoute ? "" : `
        <nav class="mobile-nav" aria-label="Mobile navigation">
          ${NAV_ITEMS.map((item) => `
            <button
              class="mobile-nav-button ${getNavButtonClass(currentRoute, item.id)}"
              data-route="${item.id}"
              type="button"
              aria-label="${item.label}"
            >
              ${renderNavIcon(item.icon, "mobile-nav-icon")}
              <span class="mobile-nav-label">${item.label}</span>
            </button>
          `).join("")}
        </nav>
      `}
    </div>
  `;

  root.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      actions.navigate(button.dataset.route);
    });
  });

  root.querySelector('[data-action="back"]')?.addEventListener("click", () => {
    handleBackNavigation(currentRoute, actions, state);
  });

  root.querySelector('[data-action="clear-notice"]')?.addEventListener("click", () => {
    actions.clearNotice();
  });

  return root.querySelector('[data-role="outlet"]');
}

function getNavButtonClass(currentRoute, buttonRoute) {
  let baseRoute = currentRoute.split("/")[0];
  if (baseRoute === "active-plan" || baseRoute === "active-plan-revision" || baseRoute === "active-plan-edit") {
    baseRoute = "active-plans";
  }
  return baseRoute === buttonRoute ? "is-active" : "";
}

function handleBackNavigation(currentRoute, actions, state) {
  if (currentRoute.startsWith("active-plan-revision/")) {
    const planId = currentRoute.split("/")[1];
    if (state.pendingActivePlanRevision?.reviewMode === "editor") {
      actions.cancelActivePlanRevisionReview(planId);
      return;
    }
    actions.navigate(planId ? `active-plan/${planId}` : "active-plans");
  } else if (currentRoute.startsWith("active-plan-edit/")) {
    const planId = currentRoute.split("/")[1];
    actions.leaveActivePlanEditorToDetail(planId);
  } else if (currentRoute.startsWith("active-plan/")) {
    actions.navigate("active-plans");
  } else if (currentRoute.startsWith("workout-player/")) {
    actions.navigate("active-plans");
  } else {
    const baseRoute = currentRoute.split("/")[0];
    if (["plans", "routines", "exercises", "workouts"].includes(baseRoute)) {
      actions.navigate(baseRoute);
    } else {
      actions.navigate("active-plans");
    }
  }
}
