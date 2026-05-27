function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTokens(items = [], className = "pill") {
  return items
    .map((item) => `<span class="${className}">${escapeHtml(item.label ?? item)}</span>`)
    .join("");
}

export function renderMetadataField(field, options = {}) {
  const { emptyLabel = "None listed" } = options;
  const items = field?.items || [];

  if (!items.length) {
    return `
      <div class="field field--full">
        <label>${escapeHtml(field?.label || "Detail")}</label>
        <div class="read-block">${escapeHtml(emptyLabel)}</div>
      </div>
    `;
  }

  if (field.primitive === "text-list") {
    return `
      <div class="field field--full">
        <label>${escapeHtml(field.label)}</label>
        <div class="read-block">
          <ul class="metadata-list">
            ${items.map((item) => `<li>${escapeHtml(item.label ?? item)}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;
  }

  const className = field.primitive === "badge-list" ? "badge badge--muted" : "pill";
  const wrapperClass = field.primitive === "badge-list" ? "timeline-item__badges" : "pill-list";

  return `
    <div class="field field--full">
      <label>${escapeHtml(field.label)}</label>
      <div class="${wrapperClass}">
        ${renderTokens(items, className)}
      </div>
    </div>
  `;
}

export function renderMetadataSummaryRow(label, items = [], { badgeClass = "badge badge--muted" } = {}) {
  if (!items?.length) {
    return "";
  }

  return `
    <div class="timeline-item__badges">
      <span class="${badgeClass}">${escapeHtml(label)}</span>
      ${renderTokens(items, "pill")}
    </div>
  `;
}

export function renderCompactTokenList(items = [], { variant = "pill", limit = 4 } = {}) {
  const visible = items.slice(0, limit);
  if (!visible.length) {
    return "";
  }

  const className = variant === "badge" ? "badge badge--muted" : "pill";
  const wrapperClass = variant === "badge" ? "timeline-item__badges" : "pill-list";
  return `
    <div class="${wrapperClass}">
      ${renderTokens(visible, className)}
      ${items.length > visible.length ? `<span class="${className}">+${items.length - visible.length}</span>` : ""}
    </div>
  `;
}

export function renderSummaryStats(items = [], { className = "summary-stats" } = {}) {
  const visible = (items || []).filter((item) => item?.value);
  if (!visible.length) {
    return "";
  }

  return `
    <div class="${className}">
      ${visible.map((item) => `
        <div class="summary-stat">
          <span class="summary-stat__label">${escapeHtml(item.label)}</span>
          <span class="summary-stat__value">${escapeHtml(item.value)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

export function renderValueStrip(items = [], { className = "value-strip" } = {}) {
  const visible = (items || []).filter((item) => item?.label && item?.value);
  if (!visible.length) {
    return "";
  }

  return `
    <div class="${className}">
      ${visible.map((item) => `
        <div class="value-strip__item">
          <span class="value-strip__label">${escapeHtml(item.label)}</span>
          <span class="value-strip__value">${escapeHtml(item.value)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

export function renderEmptyState(title, copy) {
  return `
    <section class="panel panel--section">
      <div class="panel__body">
        <div class="empty-state">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(copy)}</p>
        </div>
      </div>
    </section>
  `;
}
