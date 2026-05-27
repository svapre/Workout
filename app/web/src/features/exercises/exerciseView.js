import {
  buildExerciseCompactModel,
  buildExerciseDetailModel,
} from "../library/displayModels.js";
import { confirmAction } from "../../ui/modal.js";
import {
  renderEmptyState,
  renderMetadataField,
  renderSummaryStats,
} from "../library/metadataPrimitives.js";
import { renderPrimaryVisual } from "../library/primaryVisuals.js";
import { getExerciseDomains } from "../../data/schemaMigration.js";
import { resolveDomainAccent } from "../../ui/semanticColors.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toTitleCase(value) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseRouteId(route) {
  return String(route || "").split("/")[1] || "";
}

const LIBRARY_SCOPE_LABELS = {
  all: "All formats",
  physical: "Body",
  mental: "Mind",
  "mind-body": "Mixed",
};

function hexToRgbList(hex) {
  const raw = String(hex || "").trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) {
    return "79, 209, 197";
  }
  return [0, 2, 4].map((index) => parseInt(raw.slice(index, index + 2), 16)).join(", ");
}

function normalizeDomainFamily(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.includes("mental")) {
    return "mental";
  }
  if (raw.includes("mind-body") || raw.includes("mind body")) {
    return "mind-body";
  }
  return "physical";
}

const DOMAIN_THEME_META = {
  physical: { icon: "Body" },
  mental: { icon: "Mind" },
  "mind-body": { icon: "Flow" },
};

function getExerciseTheme(exerciseModel) {
  const domainKey = normalizeDomainFamily(exerciseModel.domainFamilyLabel || exerciseModel.primaryDomain);
  const accent = resolveDomainAccent(domainKey);
  return {
    accent,
    accentRgb: hexToRgbList(accent),
    icon: DOMAIN_THEME_META[domainKey]?.icon || "Body",
    domainKey,
  };
}

function renderExerciseLibraryCard(exercise) {
  const model = buildExerciseCompactModel(exercise);
  const detail = buildExerciseDetailModel(exercise);
  const theme = getExerciseTheme(detail);
  const movementBadge = String(model.movementSummary || detail.movementSummary || "").trim();
  const librarySummary = [model.equipmentSummary, model.trackingSummary].filter(Boolean).join(" / ");
  const ariaLabel = `Open ${detail.title}`;

  return `
    <article class="plan-card activity-card activity-card--interactive" style="--plan-color: ${theme.accent}; --plan-color-rgb: ${theme.accentRgb}; --exercise-accent: ${theme.accent}; --exercise-accent-rgb: ${theme.accentRgb};" data-action="exercise-card" data-exercise-id="${exercise.id}" role="button" tabindex="0" aria-label="${escapeHtml(ariaLabel)}">
      <div class="plan-card__top">
        <div class="plan-card__icon" style="background: rgba(${theme.accentRgb}, 0.16); border-color: rgba(${theme.accentRgb}, 0.34); color: ${theme.accent}; font-size: 0.82rem; font-weight: 800;">
          ${theme.icon}
        </div>
        <div class="plan-card__info">
          <div class="activity-card__eyebrow">Activity</div>
          <h2 class="plan-card__title">${escapeHtml(detail.title)}</h2>
        </div>
        <span class="activity-card__drilldown" aria-hidden="true">Open &rarr;</span>
      </div>

      <div class="plan-card__label-row">
        <span class="plan-card__tag">${escapeHtml(detail.domainFamilyLabel)}</span>
        <span class="plan-card__tag">${escapeHtml(detail.categoryLabel)}</span>
        ${movementBadge ? `<span class="plan-card__tag plan-card__tag--accent">${escapeHtml(movementBadge)}</span>` : ""}
      </div>

      <div class="activity-card__body">
        <div class="activity-card__visual">
          ${renderPrimaryVisual(model.primaryVisual, { size: "compact" })}
        </div>
        <div class="activity-card__content">
          <h3 class="activity-card__focus">${escapeHtml(model.focusSummary)}</h3>
          ${librarySummary ? `<p class="activity-card__summary">${escapeHtml(librarySummary)}</p>` : ""}
        </div>
      </div>
    </article>
  `;
}

function attachExerciseCardInteractions(root, actions) {
  root.querySelectorAll('[data-action="exercise-card"]').forEach((card) => {
    const openDetail = () => {
      actions.openExerciseDetail(card.dataset.exerciseId, "exercises");
    };

    card.addEventListener("click", openDetail);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetail();
      }
    });
  });
}

function resolveBodyTargetRecord(state, targetId) {
  return (state.bodyTargets || []).find((target) => target.id === targetId) || null;
}

function getExercisesForBodyTarget(state, targetId) {
  return (state.exercises || []).filter((exercise) => {
    const primaryTargets = Array.isArray(exercise?.bodyTargets) ? exercise.bodyTargets : [];
    const secondaryTargets = Array.isArray(exercise?.secondaryMuscles) ? exercise.secondaryMuscles : [];
    return primaryTargets.includes(targetId) || secondaryTargets.includes(targetId);
  });
}

function renderBodyTargetField(field, state) {
  const items = field?.items || [];
  if (!items.length) {
    return renderMetadataField(field);
  }

  return `
    <div class="field field--full">
      <label>${escapeHtml(field.label)}</label>
      <div class="pill-list">
        ${items.map((item) => {
          const targetId = String(item?.value || "").trim();
          const target = resolveBodyTargetRecord(state, targetId);
          if (!target) {
            return `<span class="pill">${escapeHtml(item.label ?? item)}</span>`;
          }
          return `
            <button class="pill pill-button" type="button" data-action="open-body-target" data-target-id="${escapeHtml(target.id)}">
              ${escapeHtml(item.label ?? target.name)}
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderBodyTargetLibraryCard(target, state) {
  const usage = getExercisesForBodyTarget(state, target.id);
  const usageLabel = `${usage.length} activit${usage.length === 1 ? "y" : "ies"}`;
  return `
    <article class="plan-card activity-card activity-card--interactive" data-action="body-target-card" data-target-id="${escapeHtml(target.id)}" role="button" tabindex="0" aria-label="Open ${escapeHtml(target.name)}">
      <div class="plan-card__top">
        <div class="plan-card__icon" style="background: rgba(99, 179, 237, 0.12); border-color: rgba(99, 179, 237, 0.28); color: #63B3ED; font-size: 0.82rem; font-weight: 800;">
          BT
        </div>
        <div class="plan-card__info">
          <div class="activity-card__eyebrow">Body target</div>
          <h2 class="plan-card__title">${escapeHtml(target.name || "Unnamed target")}</h2>
        </div>
        <span class="activity-card__drilldown" aria-hidden="true">Open &rarr;</span>
      </div>
      <div class="plan-card__label-row">
        <span class="plan-card__tag">${escapeHtml(toTitleCase(target.category || "target"))}</span>
        <span class="plan-card__tag">${target.isCustom ? "Custom" : "Built-in"}</span>
      </div>
      <div class="activity-card__body">
        <div class="activity-card__content">
          <h3 class="activity-card__focus">${escapeHtml(usageLabel)}</h3>
          <p class="activity-card__summary">Shared target used by mapped activities and body visuals.</p>
        </div>
      </div>
    </article>
  `;
}

function renderBodyTargetLibrary(state) {
  const targets = [...(state.bodyTargets || [])].sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  return `
    <section class="page page-single">
      <div class="library-header">
        <div class="library-header__copy">
          <h1>Body Targets</h1>
          <p>Shared target-map labels used across activities and imported plan packages.</p>
        </div>
        <div class="library-header__actions">
          <button class="button button--ghost" data-action="back-to-exercises" type="button">Back to Activities</button>
        </div>
      </div>

      ${targets.length === 0 ? renderEmptyState(
        "No body targets found",
        "Import or create activities with mapped targets to populate this library.",
      ) : `
        <div class="plan-card-grid activity-card-grid">
          ${targets.map((target) => renderBodyTargetLibraryCard(target, state)).join("")}
        </div>
      `}
    </section>
  `;
}

function renderBodyTargetDetail(target, state) {
  const usage = getExercisesForBodyTarget(state, target.id);
  return `
    <section class="page page-single page-single--narrow">
      <div class="library-header">
        <div class="library-header__copy stack stack--tight">
          <span class="section-eyebrow">Body target</span>
          <h1>${escapeHtml(target.name || "Unnamed target")}</h1>
          <p>${escapeHtml(target.isCustom ? "Custom target imported into your library." : "Built-in target shipped with the starter library.")}</p>
        </div>
        <div class="library-header__actions">
          <button class="button button--ghost" data-action="back-from-body-target" type="button">Back</button>
        </div>
      </div>

      <section class="panel panel--hero panel--section">
        <div class="panel__body stack">
          <div class="exercise-detail-hero__badges">
            <span class="badge badge--muted">${escapeHtml(toTitleCase(target.category || "target"))}</span>
            <span class="badge badge--muted">${target.isCustom ? "Custom" : "Built-in"}</span>
          </div>
          ${renderSummaryStats([
            { label: "Activities using it", value: String(usage.length) },
            { label: "Shared target", value: "Yes" },
          ], { className: "summary-stats summary-stats--detail" })}
        </div>
      </section>

      <section class="panel panel--section">
        <div class="panel__header">
          <div>
            <span class="panel__eyebrow">Dependencies</span>
            <h3 class="panel__title">Activities using this target</h3>
            <p class="panel__copy">Body targets stay shared across every activity that maps to them.</p>
          </div>
        </div>
        <div class="panel__body">
          ${usage.length ? `
            <div class="pill-list">
              ${usage.map((exercise) => `
                <button class="pill pill-button" type="button" data-action="open-target-exercise" data-exercise-id="${escapeHtml(exercise.id)}">
                  ${escapeHtml(exercise.name)}
                </button>
              `).join("")}
            </div>
          ` : `<p class="muted">No saved activities depend on this target right now.</p>`}
        </div>
      </section>

      ${target.isCustom ? `
        <section class="support-panel support-panel--danger">
          <div>
            <p class="section-eyebrow">Actions</p>
            <h3 class="support-panel__title">Target actions</h3>
            <p class="support-panel__copy">Delete this custom target only when no saved activities still reference it.</p>
          </div>
          <div class="support-panel__actions">
            <button class="button button--danger" data-action="delete-body-target" type="button">Delete Target</button>
          </div>
        </section>
      ` : ""}
    </section>
  `;
}

function renderExerciseDetail(detail, state, { canDelete = false } = {}) {
  const ownerLabel = detail.recordKindLabel || "Activity";
  const theme = getExerciseTheme(detail);
  return `
    <div class="content-stack">
      <section class="panel panel--hero panel--section exercise-detail-hero-panel" style="--exercise-accent: ${theme.accent}; --exercise-accent-rgb: ${theme.accentRgb}; --plan-color: ${theme.accent}; --plan-color-rgb: ${theme.accentRgb};">
        <div class="panel__body exercise-detail-hero">
          <div class="exercise-detail-hero__visual">
            ${renderPrimaryVisual(detail.primaryVisual, { size: "detail" })}
          </div>
          <div class="exercise-detail-hero__copy">
            <div class="stack stack--tight">
              <span class="panel__eyebrow">${escapeHtml(ownerLabel)}</span>
              <div class="exercise-detail-hero__badges">
                <span class="badge badge--muted">${escapeHtml(detail.recordSourceLabel)}</span>
                <span class="badge badge--domain">${escapeHtml(detail.domainFamilyLabel)}</span>
                <span class="badge badge--accent">${escapeHtml(detail.categoryLabel)}</span>
              </div>
              ${detail.subtitle ? `<p class="panel__copy">${escapeHtml(detail.subtitle)}</p>` : ""}
            </div>
            <p class="exercise-detail-hero__description">${escapeHtml(detail.description || "No description available yet.")}</p>
            ${renderSummaryStats(detail.keyFacts, { className: "summary-stats summary-stats--detail" })}
          </div>
        </div>
      </section>

      ${detail.profileFields.length ? `
        <details class="journey-advanced">
          <summary class="journey-advanced__summary">Activity profile</summary>
          <div class="journey-advanced__content journey-advanced__content--spaced">
            <div class="field-grid">
              ${detail.profileFields.map((field) => (
                field.key === "bodyTargets" || field.key === "secondaryMuscles"
                  ? renderBodyTargetField(field, state)
                  : renderMetadataField(field)
              )).join("")}
            </div>
          </div>
        </details>
      ` : ""}

      ${(detail.whyItHelps || detail.cueField || detail.source) ? `
        <details class="journey-advanced">
          <summary class="journey-advanced__summary">Supporting context</summary>
          <div class="journey-advanced__content journey-advanced__content--spaced">
            <div class="stack">
              <div class="field field--full">
                <label>Why it helps</label>
                <div class="read-block">${escapeHtml(detail.whyItHelps)}</div>
              </div>
              ${detail.cueField ? renderMetadataField(detail.cueField) : ""}
              ${detail.source ? `
                <div class="field field--full">
                  <label>Source</label>
                  <div class="read-block">
                    <div class="read-block__stack">
                      <div>${escapeHtml(detail.source.name)}</div>
                      ${detail.source.url ? `<div><a class="source-link" href="${escapeHtml(detail.source.url)}" target="_blank" rel="noreferrer">Open source reference</a></div>` : ""}
                      ${detail.source.notes ? `<div>${escapeHtml(detail.source.notes)}</div>` : ""}
                    </div>
                  </div>
                </div>
              ` : ""}
            </div>
          </div>
        </details>
      ` : ""}

      ${canDelete ? `
        <section class="support-panel support-panel--danger">
          <div>
            <p class="section-eyebrow">Actions</p>
            <h3 class="support-panel__title">Activity actions</h3>
            <p class="support-panel__copy">Delete this custom activity only when you no longer need it in routines or plans.</p>
          </div>
          <div class="support-panel__actions">
            <button class="button button--danger" data-action="delete-catalog-exercise" type="button">Delete Activity</button>
          </div>
        </section>
      ` : ""}
    </div>
  `;
}

function normalizeExerciseScope(exercise) {
  const domains = getExerciseDomains(exercise);
  const hasPhysical = domains.includes("physical");
  const hasMental = domains.includes("mental");

  if (hasPhysical && hasMental) {
    return "mind-body";
  }
  if (hasMental) {
    return "mental";
  }
  return "physical";
}

function normalizeExerciseCategory(exercise) {
  return String(exercise?.category || exercise?.type || "other").trim().toLowerCase();
}

function matchesExerciseScope(exercise, scope) {
  return scope === "all" || normalizeExerciseScope(exercise) === scope;
}

function buildScopeOptions(exercises) {
  const values = new Set((exercises || []).map(normalizeExerciseScope).filter(Boolean));
  return ["all", "physical", "mental", "mind-body"].filter((scope) => scope === "all" || values.has(scope));
}

function buildCategoryOptions(exercises, activeScope) {
  const values = Array.from(
    new Set(
      (exercises || [])
        .filter((exercise) => matchesExerciseScope(exercise, activeScope))
        .map(normalizeExerciseCategory)
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return ["all", ...values];
}

function renderScopeButton(scope, activeScope) {
  const label = LIBRARY_SCOPE_LABELS[scope] || toTitleCase(scope);
  return `
    <button
      class="button button--ghost button--compact library-scope__button ${scope === activeScope ? "library-scope__button--active" : ""}"
      type="button"
      data-action="exercise-scope"
      data-scope="${escapeHtml(scope)}"
      aria-pressed="${scope === activeScope ? "true" : "false"}"
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderCategoryButton(category, activeCategory) {
  const label = category === "all" ? "All categories" : toTitleCase(category);
  return `
    <button
      class="button button--ghost button--compact library-scope__button ${category === activeCategory ? "library-scope__button--active" : ""}"
      type="button"
      data-action="exercise-category"
      data-category="${escapeHtml(category)}"
      aria-pressed="${category === activeCategory ? "true" : "false"}"
    >
      ${escapeHtml(label)}
    </button>
  `;
}

export function renderExerciseView(container, { state, actions }) {
  const exerciseId = state.route.startsWith("exercise/") ? parseRouteId(state.route) : "";
  const bodyTargetId = state.route.startsWith("body-target/") ? parseRouteId(state.route) : "";
  const selectedExercise = exerciseId
    ? state.exercises.find((exercise) => exercise.id === exerciseId) || null
    : null;
  const selectedBodyTarget = bodyTargetId
    ? resolveBodyTargetRecord(state, bodyTargetId)
    : null;
  const detail = buildExerciseDetailModel(selectedExercise);

  if (state.route === "body-targets") {
    container.innerHTML = renderBodyTargetLibrary(state);
  } else if (bodyTargetId) {
    container.innerHTML = selectedBodyTarget
      ? renderBodyTargetDetail(selectedBodyTarget, state)
      : `
        <section class="page page-single page-single--narrow">
          <div class="library-header">
            <div class="library-header__copy stack stack--tight">
              <span class="section-eyebrow">Body target</span>
              <h1>Target not found</h1>
            </div>
            <div class="library-header__actions">
              <button class="button button--ghost" data-action="back-from-body-target" type="button">Back</button>
            </div>
          </div>
          ${renderEmptyState("Target not found", "This body target no longer exists in your library.")}
        </section>
      `;
  } else if (!selectedExercise) {
    container.innerHTML = `
      <section class="page page-single">
        <div class="library-header">
          <div class="library-header__copy">
            <h1>Activity Library</h1>
            <p>Movements and practices you can use inside routines and plans.</p>
          </div>
          <div class="library-header__actions">
            <button class="button button--ghost" data-action="open-body-targets" type="button">Manage Targets</button>
            <button class="button button--ghost" data-action="import-exercises" type="button">Import Catalog</button>
            <button class="button button--secondary" data-action="export-exercises" type="button">Export Catalog</button>
            <input class="hidden" data-role="exercise-import-input" type="file" accept=".csv,.json,text/csv,application/json">
          </div>
        </div>

        ${state.exercises.length === 0 ? renderEmptyState(
          "No activities found",
          "Import a catalog or add a few activities to start building routines and plans.",
        ) : `
          <section class="panel panel--section">
            <div class="panel__body library-filter-bar">
              <div class="library-filter-bar__search">
                <div class="field field--full">
                  <label for="exercise-library-search">Search activities</label>
                  <input id="exercise-library-search" data-role="exercise-search" type="search" placeholder="Search by name, focus, category, or movement pattern">
                </div>
              </div>
              <div class="library-filter-bar__controls">
                <div class="library-filter-bar__scopes">
                  <span class="section-eyebrow">Format</span>
                  <div class="toolbar library-scope" data-role="exercise-scopes">
                    ${buildScopeOptions(state.exercises).map((scope) => renderScopeButton(scope, "all")).join("")}
                  </div>
                </div>
                <div class="library-filter-bar__categories">
                  <span class="section-eyebrow">Focus</span>
                  <div class="toolbar library-scope" data-role="exercise-categories"></div>
                </div>
                <p class="library-filter-bar__count muted" data-role="exercise-count"></p>
              </div>
            </div>
          </section>
          <div data-role="exercise-results"></div>
        `}
      </section>
    `;
  } else {
    container.innerHTML = `
      <section class="page page-single page-single--narrow">
        <div class="library-header">
          <div class="library-header__copy stack stack--tight">
            <span class="section-eyebrow">Activity</span>
            <h1>${escapeHtml(detail.title)}</h1>
          </div>
        </div>
        ${renderExerciseDetail(detail, state, { canDelete: Boolean(selectedExercise?.isCustom) })}
      </section>
    `;
  }

  const importInput = container.querySelector('[data-role="exercise-import-input"]');
  container.querySelector('[data-action="open-body-targets"]')?.addEventListener("click", () => {
    actions.navigate("body-targets");
  });
  container.querySelector('[data-action="back-to-exercises"]')?.addEventListener("click", () => {
    actions.navigate("exercises");
  });
  container.querySelector('[data-action="back-from-body-target"]')?.addEventListener("click", () => {
    actions.returnFromDetailContext("body-targets");
  });
  container.querySelector('[data-action="import-exercises"]')?.addEventListener("click", () => {
    importInput?.click();
  });
  container.querySelector('[data-action="export-exercises"]')?.addEventListener("click", () => {
    actions.exportExercises();
  });
  importInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await actions.importExercises(file);
    event.target.value = "";
  });

  container.querySelector('[data-action="delete-catalog-exercise"]')?.addEventListener("click", () => {
    if (!selectedExercise) {
      return;
    }
    confirmAction(document.body, {
      title: "Delete Activity?",
      message: `Are you sure you want to delete "${selectedExercise.name}"? This removes the custom activity from your library when nothing still depends on it.`,
      confirmText: "Delete",
      onConfirm: () => actions.deleteCatalogExercise(selectedExercise.id),
    });
  });
  container.querySelector('[data-action="delete-body-target"]')?.addEventListener("click", () => {
    if (!selectedBodyTarget) {
      return;
    }
    confirmAction(document.body, {
      title: "Delete Target?",
      message: `Are you sure you want to delete "${selectedBodyTarget.name}"? This removes the custom body target when no saved activities still depend on it.`,
      confirmText: "Delete",
      onConfirm: () => actions.deleteBodyTarget(selectedBodyTarget.id),
    });
  });
  container.querySelectorAll('[data-action="open-body-target"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.openBodyTargetDetail(button.dataset.targetId, state.route);
    });
  });
  container.querySelectorAll('[data-action="body-target-card"]').forEach((card) => {
    const openDetail = () => actions.openBodyTargetDetail(card.dataset.targetId, "body-targets");
    card.addEventListener("click", openDetail);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetail();
      }
    });
  });
  container.querySelectorAll('[data-action="open-target-exercise"]').forEach((button) => {
    button.addEventListener("click", () => {
      actions.openExerciseDetail(button.dataset.exerciseId, state.route);
    });
  });

  const searchInput = container.querySelector('[data-role="exercise-search"]');
  const resultsContainer = container.querySelector('[data-role="exercise-results"]');
  const countNode = container.querySelector('[data-role="exercise-count"]');
  const categoryContainer = container.querySelector('[data-role="exercise-categories"]');
  let activeScope = "all";
  let activeCategory = "all";

  if (resultsContainer) {
    const allExercises = [...state.exercises].sort((left, right) => left.name.localeCompare(right.name));
    const renderCategoryControls = () => {
      if (!categoryContainer) {
        return;
      }
      categoryContainer.innerHTML = buildCategoryOptions(allExercises, activeScope)
        .map((category) => renderCategoryButton(category, activeCategory))
        .join("");

      categoryContainer.querySelectorAll('[data-action="exercise-category"]').forEach((button) => {
        button.addEventListener("click", () => {
          activeCategory = button.dataset.category || "all";
          categoryContainer.querySelectorAll('[data-action="exercise-category"]').forEach((other) => {
            const isActive = other === button;
            other.classList.toggle("library-scope__button--active", isActive);
            other.setAttribute("aria-pressed", isActive ? "true" : "false");
          });
          renderLibraryResults();
        });
      });
    };
    const renderLibraryResults = () => {
      const query = String(searchInput?.value || "").trim().toLowerCase();
      const filtered = allExercises.filter((exercise) => {
        const compact = buildExerciseCompactModel(exercise);
        const haystack = [
          exercise.name,
          exercise.description,
          exercise.category,
          exercise.movementPattern,
          compact?.domainFamilyLabel,
          compact?.focusSummary,
          compact?.equipmentSummary,
          compact?.trackingSummary,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const passesScope = matchesExerciseScope(exercise, activeScope);
        const matchesCategory = activeCategory === "all" || normalizeExerciseCategory(exercise) === activeCategory;
        return matchesQuery && passesScope && matchesCategory;
      });

      resultsContainer.innerHTML = filtered.length
        ? `<div class="plan-card-grid activity-card-grid">${filtered.map((exercise) => renderExerciseLibraryCard(exercise)).join("")}</div>`
        : renderEmptyState("No activities match", "Try a broader scope or a shorter search term.");

      if (countNode) {
        countNode.textContent = `Showing ${filtered.length} of ${allExercises.length} activities`;
      }

      attachExerciseCardInteractions(resultsContainer, actions);
    };

    searchInput?.addEventListener("input", renderLibraryResults);
    container.querySelectorAll('[data-action="exercise-scope"]').forEach((button) => {
      button.addEventListener("click", () => {
        activeScope = button.dataset.scope || "all";
        activeCategory = "all";
        container.querySelectorAll('[data-action="exercise-scope"]').forEach((other) => {
          const isActive = other === button;
          other.classList.toggle("library-scope__button--active", isActive);
          other.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
        renderCategoryControls();
        renderLibraryResults();
      });
    });

    renderCategoryControls();
    renderLibraryResults();
  }

  if (!resultsContainer) {
    attachExerciseCardInteractions(container, actions);
  }
}



