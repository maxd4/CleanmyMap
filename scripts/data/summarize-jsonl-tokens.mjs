import {
  NA,
  TOKEN_FIELDS,
  DERIVED_TOKEN_FIELDS,
  ALL_TOKEN_FIELDS,
  safeIso,
} from "./summarize-jsonl-input.mjs";

function emptyCounterStats() {
  return { present: 0, missing: 0, decreases: 0, repeats: 0 };
}

function addContribution(target, field, timestamp, value) {
  if (!Number.isFinite(value)) return;
  target[field] ??= [];
  target[field].push({ timestamp, value });
}

function reconstructCumulativeSeries(records, sourceKey) {
  const values = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, NA]));
  const contributions = {};
  const stats = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, emptyCounterStats()]));
  const previous = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, null]));
  const totals = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, 0]));
  for (const record of records) {
    const source = record.event?.payload?.[sourceKey];
    if (!source || typeof source !== "object") continue;
    const timestamp = safeIso(record.event.timestamp);
    for (const field of TOKEN_FIELDS) {
      const value = source[field];
      if (!Number.isFinite(value)) {
        stats[field].missing += 1;
        continue;
      }
      stats[field].present += 1;
      const previousValue = previous[field];
      let delta = value;
      if (previousValue !== null) {
        if (value < previousValue) stats[field].decreases += 1;
        else delta = value - previousValue;
        if (value === previousValue) stats[field].repeats += 1;
      }
      totals[field] += delta;
      previous[field] = value;
      if (timestamp) addContribution(contributions, field, timestamp, delta);
    }
  }
  for (const field of TOKEN_FIELDS) {
    if (stats[field].present > 0) values[field] = totals[field];
  }
  return { values, contributions, stats, semantics: "cumulative_counter_with_reset_detection" };
}

function reconstructDirectUsage(records) {
  const values = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, NA]));
  const contributions = {};
  const stats = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, emptyCounterStats()]));
  const totals = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, 0]));
  for (const record of records) {
    const source = record.event?.payload?.usage;
    if (!source || typeof source !== "object") continue;
    const timestamp = safeIso(record.event.timestamp);
    for (const field of TOKEN_FIELDS) {
      const value = source[field];
      if (!Number.isFinite(value)) {
        stats[field].missing += 1;
        continue;
      }
      stats[field].present += 1;
      totals[field] += value;
      if (timestamp) addContribution(contributions, field, timestamp, value);
    }
  }
  for (const field of TOKEN_FIELDS) {
    if (stats[field].present > 0) values[field] = totals[field];
  }
  return { values, contributions, stats, semantics: "per_event_delta" };
}

function validateTotal(records, sourceKey) {
  let checked = 0;
  let inconsistent = 0;
  for (const record of records) {
    const source = record.event?.payload?.[sourceKey];
    if (!source || typeof source !== "object") continue;
    if (["input_tokens", "output_tokens", "total_tokens"].every((field) => Number.isFinite(source[field]))) {
      checked += 1;
      if (source.total_tokens !== source.input_tokens + source.output_tokens) inconsistent += 1;
    }
  }
  return { checked, inconsistent };
}

function deriveUncachedInput(reconstruction) {
  const input = reconstruction.values.input_tokens;
  const cached = reconstruction.values.cached_input_tokens;
  if (typeof input !== "number" || typeof cached !== "number" || input < cached) return;
  reconstruction.values.uncached_input_tokens = input - cached;
  const inputContributions = reconstruction.contributions.input_tokens ?? [];
  const cachedContributions = reconstruction.contributions.cached_input_tokens ?? [];
  reconstruction.contributions.uncached_input_tokens = inputContributions.map((item, index) => ({
    timestamp: item.timestamp,
    value: item.value - (cachedContributions[index]?.value ?? 0),
  })).filter((item) => item.value >= 0);
}

function buildTokenReconstruction(events) {
  const tokenRecords = events.filter((event) => event.type === "token_usage_record");
  const threadRecords = tokenRecords.filter((event) => event.payload?.thread_token_usage).map((event) => ({ event }));
  const infoRecords = events.filter((event) => event.type === "event_msg" && event.payload?.info?.total_token_usage).map((event) => ({
    event: { ...event, payload: { ...event.payload, total_token_usage: event.payload.info.total_token_usage } },
  }));
  const usageRecords = tokenRecords.filter((event) => event.payload?.usage).map((event) => ({ event }));
  let source = "none";
  let records = [];
  let reconstruction = {
    values: Object.fromEntries([...TOKEN_FIELDS, ...DERIVED_TOKEN_FIELDS].map((field) => [field, NA])),
    contributions: {},
    stats: Object.fromEntries(TOKEN_FIELDS.map((field) => [field, emptyCounterStats()])),
    semantics: "unavailable",
  };
  if (threadRecords.length > 0) {
    source = "token_usage_record.thread_token_usage";
    records = threadRecords;
    reconstruction = reconstructCumulativeSeries(records, "thread_token_usage");
  } else if (infoRecords.length > 0) {
    source = "event_msg.info.total_token_usage";
    records = infoRecords;
    reconstruction = reconstructCumulativeSeries(records, "total_token_usage");
  } else if (usageRecords.length > 0) {
    source = "token_usage_record.usage";
    records = usageRecords;
    reconstruction = reconstructDirectUsage(records);
  }
  if (source !== "none") {
    const sourceKey = source.endsWith("thread_token_usage") ? "thread_token_usage" : source.endsWith("total_token_usage") ? "total_token_usage" : "usage";
    const coherence = validateTotal(records, sourceKey);
    reconstruction.totalCoherence = coherence;
    if (coherence.inconsistent > 0) {
      reconstruction.values.total_tokens = NA;
      delete reconstruction.contributions.total_tokens;
    }
    if (reconstruction.values.total_tokens === NA && reconstruction.values.input_tokens !== NA && reconstruction.values.output_tokens !== NA && coherence.checked === 0) {
      reconstruction.values.total_tokens = reconstruction.values.input_tokens + reconstruction.values.output_tokens;
      reconstruction.formula = "input_tokens + output_tokens";
      reconstruction.contributions.total_tokens = (reconstruction.contributions.input_tokens ?? []).map((item, index) => ({
        timestamp: item.timestamp,
        value: item.value + (reconstruction.contributions.output_tokens?.[index]?.value ?? 0),
      }));
    } else {
      reconstruction.formula = "direct total_tokens; reasoning_output_tokens is a sub-detail of output_tokens";
    }
    deriveUncachedInput(reconstruction);
  }
  for (const field of DERIVED_TOKEN_FIELDS) {
    if (reconstruction.values[field] === undefined) reconstruction.values[field] = NA;
  }
  const missingFields = ALL_TOKEN_FIELDS.filter((field) => reconstruction.values[field] === NA);
  let status = "UNUSABLE";
  const reasons = [];
  if (source === "none") {
    reasons.push("no usable token counter or usage event observed");
  } else if (missingFields.length > 0 || reconstruction.totalCoherence?.inconsistent > 0) {
    status = "PARTIAL";
    if (missingFields.length > 0) reasons.push("missing metrics: " + missingFields.join(", "));
    if (reconstruction.totalCoherence?.inconsistent > 0) reasons.push("direct total_tokens was inconsistent with input_tokens + output_tokens");
  } else if (reconstruction.semantics === "cumulative_counter_with_reset_detection") {
    status = "DERIVED_FROM_CUMULATIVE_COUNTER";
  } else {
    status = "EXACT";
  }
  if (reconstruction.stats) {
    const resetCount = TOKEN_FIELDS.reduce((sum, field) => sum + reconstruction.stats[field].decreases, 0);
    if (resetCount > 0) reasons.push(resetCount + " counter decrease(s) handled as reset(s)");
  }
  return { ...reconstruction, source, sourceRecords: records.length, quality: { status, reasons } };
}

export { buildTokenReconstruction };
