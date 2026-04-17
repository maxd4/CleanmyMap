import type { FunnelEvent, FunnelMode, FunnelStep } from "./funnel-store";

type FunnelWindowEvent = Pick<
  FunnelEvent,
  "at" | "step" | "mode" | "sessionId"
>;

export type FunnelModeMetrics = {
  mode: FunnelMode;
  counts: { views: number; starts: number; submits: number };
  sessions: { views: number; starts: number; submits: number };
  conversion: { viewToSubmit: number; startToSubmit: number };
  medianCompletionSeconds: number | null;
  completionUnder60Rate: number | null;
};

export type FunnelMetrics = {
  byMode: FunnelModeMetrics[];
  totals: { views: number; starts: number; submits: number };
  conversion: { viewToSubmit: number; startToSubmit: number };
};

export type FunnelMetricsWithBaseline = {
  current: FunnelMetrics;
  previous: FunnelMetrics;
  baseline: {
    periodDays: number;
    comparison: {
      viewToSubmitDelta: number;
      startToSubmitDelta: number;
      submitsDeltaAbs: number;
      submitsDeltaPct: number;
    };
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

function round1(value: number): number {
  return Number(value.toFixed(1));
}

function toMs(raw: string): number | null {
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function computeMedian(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return round1((sorted[middle - 1] + sorted[middle]) / 2);
  }
  return round1(sorted[middle]);
}

function safePercentDelta(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return round1(((current - previous) / Math.abs(previous)) * 100);
}

function eventsInRange(
  records: FunnelEvent[],
  fromMs: number,
  untilMs: number,
): FunnelWindowEvent[] {
  const output: FunnelWindowEvent[] = [];
  for (const entry of records) {
    const ms = toMs(entry.at);
    if (ms === null || ms < fromMs || ms > untilMs) {
      continue;
    }
    output.push({
      at: entry.at,
      step: entry.step,
      mode: entry.mode,
      sessionId: entry.sessionId,
    });
  }
  return output;
}

function completionStats(
  records: FunnelWindowEvent[],
): Record<
  FunnelMode,
  { medianSeconds: number | null; under60Rate: number | null }
> {
  const modes: FunnelMode[] = ["quick", "complete"];
  const output: Record<
    FunnelMode,
    { medianSeconds: number | null; under60Rate: number | null }
  > = {
    quick: { medianSeconds: null, under60Rate: null },
    complete: { medianSeconds: null, under60Rate: null },
  };

  for (const mode of modes) {
    const scoped = records.filter((item) => item.mode === mode);
    const bySession = new Map<
      string,
      Array<{ step: FunnelStep; atMs: number }>
    >();
    for (const item of scoped) {
      const atMs = toMs(item.at);
      if (atMs === null) {
        continue;
      }
      const previous = bySession.get(item.sessionId) ?? [];
      previous.push({ step: item.step, atMs });
      bySession.set(item.sessionId, previous);
    }

    const durationsSeconds: number[] = [];
    for (const entries of bySession.values()) {
      const sorted = [...entries].sort((a, b) => a.atMs - b.atMs);
      const start = sorted.find((entry) => entry.step === "start_form");
      if (!start) {
        continue;
      }
      const submit = sorted.find(
        (entry) => entry.step === "submit_success" && entry.atMs >= start.atMs,
      );
      if (!submit) {
        continue;
      }
      durationsSeconds.push(Math.max(0, (submit.atMs - start.atMs) / 1000));
    }

    const medianSeconds = computeMedian(durationsSeconds);
    const under60Rate =
      durationsSeconds.length > 0
        ? round1(
            (durationsSeconds.filter((value) => value <= 60).length /
              durationsSeconds.length) *
              100,
          )
        : null;
    output[mode] = { medianSeconds, under60Rate };
  }

  return output;
}

export function computeFunnelMetrics(
  records: FunnelWindowEvent[],
): FunnelMetrics {
  const modes: FunnelMode[] = ["quick", "complete"];
  const completionByMode = completionStats(records);
  const byMode = modes.map((mode) => {
    const scoped = records.filter((item) => item.mode === mode);
    const views = scoped.filter((item) => item.step === "view_new").length;
    const starts = scoped.filter((item) => item.step === "start_form").length;
    const submits = scoped.filter(
      (item) => item.step === "submit_success",
    ).length;
    const viewSessions = new Set(
      scoped
        .filter((item) => item.step === "view_new")
        .map((item) => item.sessionId),
    );
    const startSessions = new Set(
      scoped
        .filter((item) => item.step === "start_form")
        .map((item) => item.sessionId),
    );
    const submitSessions = new Set(
      scoped
        .filter((item) => item.step === "submit_success")
        .map((item) => item.sessionId),
    );
    const viewToSubmit =
      viewSessions.size > 0
        ? (submitSessions.size / viewSessions.size) * 100
        : 0;
    const startToSubmit =
      startSessions.size > 0
        ? (submitSessions.size / startSessions.size) * 100
        : 0;
    return {
      mode,
      counts: { views, starts, submits },
      sessions: {
        views: viewSessions.size,
        starts: startSessions.size,
        submits: submitSessions.size,
      },
      conversion: {
        viewToSubmit: round1(viewToSubmit),
        startToSubmit: round1(startToSubmit),
      },
      medianCompletionSeconds: completionByMode[mode].medianSeconds,
      completionUnder60Rate: completionByMode[mode].under60Rate,
    };
  });

  const totals = {
    views: byMode.reduce((acc, row) => acc + row.counts.views, 0),
    starts: byMode.reduce((acc, row) => acc + row.counts.starts, 0),
    submits: byMode.reduce((acc, row) => acc + row.counts.submits, 0),
  };

  const totalSessionViews = byMode.reduce(
    (acc, row) => acc + row.sessions.views,
    0,
  );
  const totalSessionStarts = byMode.reduce(
    (acc, row) => acc + row.sessions.starts,
    0,
  );
  const totalSessionSubmits = byMode.reduce(
    (acc, row) => acc + row.sessions.submits,
    0,
  );

  return {
    byMode,
    totals,
    conversion: {
      viewToSubmit:
        totalSessionViews > 0
          ? round1((totalSessionSubmits / totalSessionViews) * 100)
          : 0,
      startToSubmit:
        totalSessionStarts > 0
          ? round1((totalSessionSubmits / totalSessionStarts) * 100)
          : 0,
    },
  };
}

export function computeFunnelMetricsWithBaseline(params: {
  records: FunnelEvent[];
  periodDays: number;
  now?: Date;
}): FunnelMetricsWithBaseline {
  const nowMs = (params.now ?? new Date()).getTime();
  const currentFrom = nowMs - params.periodDays * DAY_MS;
  const previousFrom = currentFrom - params.periodDays * DAY_MS;
  const current = computeFunnelMetrics(
    eventsInRange(params.records, currentFrom, nowMs),
  );
  const previous = computeFunnelMetrics(
    eventsInRange(params.records, previousFrom, currentFrom - 1),
  );

  return {
    current,
    previous,
    baseline: {
      periodDays: params.periodDays,
      comparison: {
        viewToSubmitDelta: round1(
          current.conversion.viewToSubmit - previous.conversion.viewToSubmit,
        ),
        startToSubmitDelta: round1(
          current.conversion.startToSubmit - previous.conversion.startToSubmit,
        ),
        submitsDeltaAbs: current.totals.submits - previous.totals.submits,
        submitsDeltaPct: safePercentDelta(
          current.totals.submits,
          previous.totals.submits,
        ),
      },
    },
  };
}
