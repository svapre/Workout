export const BRAND_AQUA = "#4FD1C5";
export const SKY = "#63B3ED";
export const MINT = "#68D391";
export const AMBER = "#F6AD55";
export const CORAL = "#F59E8B";
export const SLATE = "#A0AEC0";
export const DANGER = "#FC8181";

export const PLAN_ACCENT_PALETTE = [BRAND_AQUA, SKY, MINT, AMBER, CORAL];

function isHexColor(value) {
  return /^#([0-9a-f]{6})$/i.test(String(value || "").trim());
}

function hashString(value) {
  return [...String(value || "")].reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7);
}

export function resolvePlanAccent(plan) {
  const explicit = String(plan?.theme?.color || "").trim();
  if (isHexColor(explicit)) {
    return explicit;
  }

  const seed = String(plan?.id || plan?.name || plan?.displayName || "plan");
  return PLAN_ACCENT_PALETTE[hashString(seed) % PLAN_ACCENT_PALETTE.length];
}

export function resolveDomainAccent(domainFamily) {
  const raw = String(domainFamily || "").trim().toLowerCase();
  if (raw === "mental") {
    return SKY;
  }
  if (raw === "mind-body" || raw === "mind body") {
    return MINT;
  }
  if (raw === "physical") {
    return BRAND_AQUA;
  }
  return BRAND_AQUA;
}

export function resolveStatusAccent(status) {
  const raw = String(status || "").trim().toLowerCase();
  if (raw === "archived") {
    return SLATE;
  }
  if (raw === "removed" || raw === "danger" || raw === "destructive" || raw === "failed") {
    return DANGER;
  }
  if (raw === "milestone" || raw === "test" || raw === "achievement") {
    return AMBER;
  }
  if (raw === "success" || raw === "complete" || raw === "completed") {
    return MINT;
  }
  return BRAND_AQUA;
}
