function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function normalizeHistoricalPlanSnapshot(snapshot) {
  if (!snapshot?.id) {
    return null;
  }

  const historyStatus = snapshot.historyStatus === "removed" ? "removed" : "archived";
  const historyRecordedAt =
    snapshot.historyRecordedAt ||
    snapshot.removedAt ||
    snapshot.completedAt ||
    snapshot.startedAt ||
    null;

  return {
    ...clone(snapshot),
    historyStatus,
    historyRecordedAt,
    completedAt:
      historyStatus === "archived"
        ? snapshot.completedAt || historyRecordedAt
        : snapshot.completedAt || null,
    removedAt: historyStatus === "removed" ? snapshot.removedAt || historyRecordedAt : null,
  };
}

export function loadHistoricalPlanSnapshots(localStore) {
  const raw = localStore.load();
  const snapshots = Array.isArray(raw)
    ? raw.map(normalizeHistoricalPlanSnapshot).filter(Boolean)
    : [];

  if (JSON.stringify(raw) !== JSON.stringify(snapshots)) {
    localStore.save(snapshots);
  }

  return snapshots;
}

export function createHistoricalPlanSnapshot(
  plan,
  { historyStatus, historyRecordedAt = new Date().toISOString() },
) {
  return normalizeHistoricalPlanSnapshot({
    ...clone(plan),
    historyStatus,
    historyRecordedAt,
    completedAt: historyStatus === "archived" ? historyRecordedAt : plan?.completedAt || null,
    removedAt: historyStatus === "removed" ? historyRecordedAt : null,
  });
}

export function upsertHistoricalPlanSnapshot(existingSnapshots, nextSnapshot) {
  const normalizedNext = normalizeHistoricalPlanSnapshot(nextSnapshot);
  if (!normalizedNext) {
    return existingSnapshots;
  }

  const filtered = (existingSnapshots || []).filter((snapshot) => snapshot?.id !== normalizedNext.id);
  const combined = [...filtered, normalizedNext];

  return combined.sort((left, right) =>
    String(right.historyRecordedAt || right.completedAt || "").localeCompare(
      String(left.historyRecordedAt || left.completedAt || ""),
    ),
  );
}
