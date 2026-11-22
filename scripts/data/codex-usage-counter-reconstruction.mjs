/** Pure Codex rollout counter reconstruction shared by the report and browser importer. */
export function reconstructCumulativeCounters(records, { fields, sourceKey, safeTimestamp }) {
  const values = Object.fromEntries(fields.map((field) => [field, "NA"]));
  const contributions = {};
  const stats = Object.fromEntries(fields.map((field) => [field, { present: 0, missing: 0, decreases: 0, repeats: 0 }]));
  const previous = Object.fromEntries(fields.map((field) => [field, null]));
  const totals = Object.fromEntries(fields.map((field) => [field, 0]));
  for (const record of records) {
    const source = record.event?.payload?.[sourceKey];
    if (!source || typeof source !== "object") continue;
    const timestamp = safeTimestamp?.(record.event.timestamp) ?? null;
    for (const field of fields) {
      const value = source[field];
      if (!Number.isFinite(value)) { stats[field].missing += 1; continue; }
      stats[field].present += 1;
      const before = previous[field];
      let delta = value;
      if (before !== null) {
        if (value < before) stats[field].decreases += 1;
        else delta = value - before;
        if (value === before) stats[field].repeats += 1;
      }
      totals[field] += delta;
      previous[field] = value;
      if (timestamp) {
        contributions[field] ??= [];
        contributions[field].push({ timestamp, value: delta });
      }
    }
  }
  for (const field of fields) if (stats[field].present > 0) values[field] = totals[field];
  return { values, contributions, stats, semantics: "cumulative_counter_with_reset_detection" };
}

export function reconstructDirectCounters(records, { fields, sourceKey, safeTimestamp }) {
  const values = Object.fromEntries(fields.map((field) => [field, "NA"]));
  const contributions = {};
  const stats = Object.fromEntries(fields.map((field) => [field, { present: 0, missing: 0, decreases: 0, repeats: 0 }]));
  const totals = Object.fromEntries(fields.map((field) => [field, 0]));
  for (const record of records) {
    const source = record.event?.payload?.[sourceKey];
    if (!source || typeof source !== "object") continue;
    const timestamp = safeTimestamp?.(record.event.timestamp) ?? null;
    for (const field of fields) {
      const value = source[field];
      if (!Number.isFinite(value)) { stats[field].missing += 1; continue; }
      stats[field].present += 1;
      totals[field] += value;
      if (timestamp) {
        contributions[field] ??= [];
        contributions[field].push({ timestamp, value });
      }
    }
  }
  for (const field of fields) if (stats[field].present > 0) values[field] = totals[field];
  return { values, contributions, stats, semantics: "per_event_delta" };
}
