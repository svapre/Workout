function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

const TARGET_ID_BY_LABEL = {
  chest: "bm_chest",
  back: "bm_back",
  shoulders: "bm_shoulders",
  biceps: "bm_biceps",
  triceps: "bm_triceps",
  forearms: "bm_forearms",
  core: "bm_core",
  "lower back": "bm_lower_back",
  glutes: "bm_glutes",
  quadriceps: "bm_quads",
  quads: "bm_quads",
  hamstrings: "bm_hamstrings",
  calves: "bm_calves",
  "hip flexors": "bm_hip_flexors",
  neck: "bm_neck",
};

const FRONT_ASSET = "./assets/body-map/neutral-front-transparent.png";
const BACK_ASSET = "./assets/body-map/neutral-back-transparent.png";
const FRONT_SLOT = { x: 14, y: 12, width: 92, height: 225 };
const BACK_SLOT = { x: 144, y: 12, width: 92, height: 225 };

const FRONT_MASKS = {
  bm_neck: "./assets/body-map/mask-front-neck.png",
  bm_shoulders: "./assets/body-map/mask-front-shoulders.png",
  bm_chest: "./assets/body-map/mask-front-chest.png",
  bm_biceps: "./assets/body-map/mask-front-biceps.png",
  bm_forearms: "./assets/body-map/mask-front-forearms.png",
  bm_core: "./assets/body-map/mask-front-core.png",
  bm_hip_flexors: "./assets/body-map/mask-front-hip-flexors.png",
  bm_quads: "./assets/body-map/mask-front-quads.png",
  bm_calves: "./assets/body-map/mask-front-calves.png",
};

const BACK_MASKS = {
  bm_neck: "./assets/body-map/mask-back-neck.png",
  bm_shoulders: "./assets/body-map/mask-back-shoulders.png",
  bm_back: "./assets/body-map/mask-back-back.png",
  bm_triceps: "./assets/body-map/mask-back-triceps.png",
  bm_forearms: "./assets/body-map/mask-back-forearms.png",
  bm_lower_back: "./assets/body-map/mask-back-lower-back.png",
  bm_glutes: "./assets/body-map/mask-back-glutes.png",
  bm_hamstrings: "./assets/body-map/mask-back-hamstrings.png",
  bm_calves: "./assets/body-map/mask-back-calves.png",
};

let bodyVisualCounter = 0;

function normalizeTargetId(target) {
  if (!target) {
    return null;
  }
  if (typeof target === "string") {
    const normalized = target.trim().toLowerCase();
    return TARGET_ID_BY_LABEL[normalized] || normalized;
  }
  if (typeof target === "object") {
    return normalizeTargetId(target.id || target.targetId || target.slug || target.key || target.label || target.name);
  }
  return null;
}

function renderAssetImage(href, slot, className) {
  return `<image class="${className}" href="${href}" x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" preserveAspectRatio="xMidYMid meet"></image>`;
}

function renderMaskedRegions(maskMap, targetIds, slot, stateClass, gradientId, glowId, filterId, prefix) {
  return [...targetIds]
    .map((id) => {
      const maskHref = maskMap[id];
      if (!maskHref) {
        return "";
      }
      const maskId = `${prefix}-${id}-mask`;
      return `
        <mask id="${maskId}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
          <image href="${maskHref}" x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" preserveAspectRatio="xMidYMid meet"></image>
        </mask>
        <g class="body-visual__region-wrap ${stateClass}">
          <rect class="body-visual__region-glow" x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" fill="url(#${glowId})" filter="url(#${filterId})" mask="url(#${maskId})"></rect>
          <rect class="body-visual__region" x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" fill="url(#${gradientId})" mask="url(#${maskId})"></rect>
        </g>
      `;
    })
    .join("");
}

export function renderBodyVisual(primaryTargets = [], secondaryTargets = [], options = {}) {
  const { size = "detail", title = "Muscle map", emptyCopy = "No mapped body targets yet." } = options;
  const primaryIds = new Set(primaryTargets.map(normalizeTargetId).filter(Boolean));
  const secondaryIds = new Set(
    secondaryTargets
      .map(normalizeTargetId)
      .filter((id) => id && !primaryIds.has(id)),
  );
  const allLabels = [
    ...primaryTargets.map((item) => item?.label).filter(Boolean),
    ...secondaryTargets.map((item) => item?.label).filter(Boolean),
  ];
  const prefix = `body-visual-${bodyVisualCounter += 1}`;

  return `
    <div class="body-visual body-visual--${size} ${primaryIds.size || secondaryIds.size ? "" : "body-visual--empty"}" aria-label="${escapeHtml(`${title}: ${allLabels.join(", ") || emptyCopy}`)}">
      <div class="body-visual__frame">
        <svg class="body-visual__svg" viewBox="0 0 250 255" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="${prefix}-primary-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#B3FFF6" />
              <stop offset="34%" stop-color="#77F1E4" />
              <stop offset="76%" stop-color="#33B9AE" />
              <stop offset="100%" stop-color="#11736A" />
            </linearGradient>
            <linearGradient id="${prefix}-secondary-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FFE6BB" />
              <stop offset="38%" stop-color="#FFC978" />
              <stop offset="78%" stop-color="#D38A32" />
              <stop offset="100%" stop-color="#8F5212" />
            </linearGradient>
            <radialGradient id="${prefix}-primary-glow" cx="50%" cy="50%" r="64%">
              <stop offset="0%" stop-color="#B3FFF6" stop-opacity="1" />
              <stop offset="56%" stop-color="#4FD1C5" stop-opacity="0.42" />
              <stop offset="100%" stop-color="#4FD1C5" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="${prefix}-secondary-glow" cx="50%" cy="50%" r="64%">
              <stop offset="0%" stop-color="#FFE6BB" stop-opacity="0.92" />
              <stop offset="56%" stop-color="#F6AD55" stop-opacity="0.34" />
              <stop offset="100%" stop-color="#F6AD55" stop-opacity="0" />
            </radialGradient>
            <filter id="${prefix}-primary-glow-filter" x="-90%" y="-90%" width="280%" height="280%">
              <feGaussianBlur stdDeviation="4.2" />
            </filter>
            <filter id="${prefix}-secondary-glow-filter" x="-90%" y="-90%" width="280%" height="280%">
              <feGaussianBlur stdDeviation="3.4" />
            </filter>
          </defs>
          ${renderAssetImage(FRONT_ASSET, FRONT_SLOT, "body-visual__art")}
          ${renderAssetImage(BACK_ASSET, BACK_SLOT, "body-visual__art")}
          ${renderMaskedRegions(FRONT_MASKS, secondaryIds, FRONT_SLOT, "body-visual__region--secondary", `${prefix}-secondary-gradient`, `${prefix}-secondary-glow`, `${prefix}-secondary-glow-filter`, `${prefix}-front-secondary`)}
          ${renderMaskedRegions(BACK_MASKS, secondaryIds, BACK_SLOT, "body-visual__region--secondary", `${prefix}-secondary-gradient`, `${prefix}-secondary-glow`, `${prefix}-secondary-glow-filter`, `${prefix}-back-secondary`)}
          ${renderMaskedRegions(FRONT_MASKS, primaryIds, FRONT_SLOT, "body-visual__region--primary", `${prefix}-primary-gradient`, `${prefix}-primary-glow`, `${prefix}-primary-glow-filter`, `${prefix}-front-primary`)}
          ${renderMaskedRegions(BACK_MASKS, primaryIds, BACK_SLOT, "body-visual__region--primary", `${prefix}-primary-gradient`, `${prefix}-primary-glow`, `${prefix}-primary-glow-filter`, `${prefix}-back-primary`)}
        </svg>
      </div>
      <div class="body-visual__caption">
        <span>Front</span>
        <span>${escapeHtml(title)}</span>
        <span>Back</span>
      </div>
      ${primaryIds.size || secondaryIds.size ? "" : `<p class="body-visual__empty-copy">${escapeHtml(emptyCopy)}</p>`}
    </div>
  `;
}
