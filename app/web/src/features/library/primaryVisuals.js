import { renderBodyVisual } from "./bodyVisuals.js";
import {
  AMBER,
  BRAND_AQUA,
  MINT,
  resolveDomainAccent,
  SKY,
} from "../../ui/semanticColors.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function hexToRgba(hex, alpha) {
  const raw = String(hex || "").trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) {
    return `rgba(79, 209, 197, ${alpha})`;
  }
  const channels = [0, 2, 4].map((index) => parseInt(raw.slice(index, index + 2), 16));
  return `rgba(${channels.join(", ")}, ${alpha})`;
}
function getPracticeTone(visual) {
  const family = String(visual?.familyLabel || visual?.domainFamily || "").trim();
  const raw = `${visual?.variant || ""} ${visual?.toneKey || ""} ${family}`.trim().toLowerCase();
  const domainAccent = resolveDomainAccent(
    raw.includes("mind-body") || raw.includes("mind body")
      ? "mind-body"
      : raw.includes("mental") || raw.includes("meditation") || raw.includes("focus")
        ? "mental"
        : family,
  );

  if (raw.includes("breath")) {
    return {
      accent: AMBER,
      glow: "rgba(246, 173, 85, 0.28)",
      chip: "rgba(246, 173, 85, 0.14)",
    };
  }
  if (raw.includes("meditation") || raw.includes("awareness") || raw.includes("focus")) {
    return {
      accent: SKY,
      glow: "rgba(99, 179, 237, 0.24)",
      chip: "rgba(99, 179, 237, 0.14)",
    };
  }
  if (raw.includes("yoga") || raw.includes("mind-body") || raw.includes("mind body")) {
    return {
      accent: MINT,
      glow: "rgba(104, 211, 145, 0.24)",
      chip: "rgba(104, 211, 145, 0.14)",
    };
  }
  const accent = domainAccent || BRAND_AQUA;
  return {
    accent,
    glow: hexToRgba(accent, 0.24),
    chip: hexToRgba(accent, 0.12),
  };
}

function resolvePracticeVariant(visual) {
  const raw = String(visual?.variant || visual?.toneKey || "").trim().toLowerCase();
  if (raw.includes("breath")) return "breathwork";
  if (raw.includes("awareness") || raw.includes("scan")) return "awareness";
  if (raw.includes("moving") || raw.includes("walking")) return "moving";
  if (raw.includes("reflection") || raw.includes("compassion") || raw.includes("loving")) return "reflection";
  return "meditation";
}

function renderPracticeScene(variant) {
  if (variant === "breathwork") {
    return `
      <div class="practice-visual__scene practice-visual__scene--breathwork" aria-hidden="true">
        <span class="practice-visual__ring practice-visual__ring--outer"></span>
        <span class="practice-visual__ring practice-visual__ring--middle"></span>
        <span class="practice-visual__ring practice-visual__ring--inner"></span>
        <span class="practice-visual__core"></span>
        <span class="practice-visual__pulse practice-visual__pulse--left"></span>
        <span class="practice-visual__pulse practice-visual__pulse--right"></span>
      </div>
    `;
  }

  if (variant === "awareness") {
    return `
      <div class="practice-visual__scene practice-visual__scene--awareness" aria-hidden="true">
        <span class="practice-visual__column"></span>
        <span class="practice-visual__beam"></span>
        <span class="practice-visual__marker practice-visual__marker--top"></span>
        <span class="practice-visual__marker practice-visual__marker--middle"></span>
        <span class="practice-visual__marker practice-visual__marker--bottom"></span>
      </div>
    `;
  }

  if (variant === "moving") {
    return `
      <div class="practice-visual__scene practice-visual__scene--moving" aria-hidden="true">
        <span class="practice-visual__path practice-visual__path--left"></span>
        <span class="practice-visual__path practice-visual__path--right"></span>
        <span class="practice-visual__step practice-visual__step--one"></span>
        <span class="practice-visual__step practice-visual__step--two"></span>
        <span class="practice-visual__step practice-visual__step--three"></span>
      </div>
    `;
  }

  if (variant === "reflection") {
    return `
      <div class="practice-visual__scene practice-visual__scene--reflection" aria-hidden="true">
        <span class="practice-visual__halo practice-visual__halo--one"></span>
        <span class="practice-visual__halo practice-visual__halo--two"></span>
        <span class="practice-visual__node practice-visual__node--left"></span>
        <span class="practice-visual__node practice-visual__node--right"></span>
        <span class="practice-visual__node practice-visual__node--center"></span>
      </div>
    `;
  }

  return `
    <div class="practice-visual__scene practice-visual__scene--meditation" aria-hidden="true">
      <span class="practice-visual__halo practice-visual__halo--one"></span>
      <span class="practice-visual__halo practice-visual__halo--two"></span>
      <span class="practice-visual__halo practice-visual__halo--three"></span>
      <span class="practice-visual__core"></span>
      <span class="practice-visual__node practice-visual__node--left"></span>
      <span class="practice-visual__node practice-visual__node--right"></span>
    </div>
  `;
}

function renderPracticeVisual(visual, options = {}) {
  const { size = "detail" } = options;
  const tone = getPracticeTone(visual);
  const variant = resolvePracticeVariant(visual);

  return `
    <div
      class="practice-visual practice-visual--${size} practice-visual--${variant}"
      style="--practice-accent: ${tone.accent}; --practice-glow: ${tone.glow}; --practice-chip: ${tone.chip};"
      aria-label="${escapeHtml(`${visual?.familyLabel || "Practice"}: ${visual?.headline || "Practice profile"}`)}"
    >
      <div class="practice-visual__canvas">
        ${renderPracticeScene(variant)}
      </div>
    </div>
  `;
}

export function renderPrimaryVisual(visual, options = {}) {
  if (!visual) {
    return "";
  }

  if (visual.kind === "body") {
    return renderBodyVisual(
      visual.primaryTargets || [],
      visual.secondaryTargets || [],
      {
        size: options.size,
        title: visual.title,
        emptyCopy: visual.emptyCopy,
      },
    );
  }

  return renderPracticeVisual(visual, options);
}

