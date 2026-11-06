import {
  ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
  ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_KEY,
  ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_VERSION,
  fetchActionCollectionContextReferenceAverages,
  invalidateActionCollectionReferenceAveragesCache,
  normalizeActionCollectionContextReferenceSnapshotPayload,
  type ActionCollectionContextReference,
  type ActionCollectionContextReferenceSnapshotItem,
  type ActionCollectionContextReferenceSnapshotMetric,
  type ActionCollectionContextReferenceSnapshotPayload,
} from "@/lib/actions/action-collection-reference-averages";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  getPublicSurfaceSnapshotDate,
  readLatestPublicSurfaceSnapshot,
  requirePersistedPublicSurfaceSnapshot,
  toPersistedPublicSurfaceSnapshot,
  upsertPublicSurfaceSnapshot,
  type PublicSurfaceSnapshotRecord,
} from "@/lib/public-surface-snapshots";
import { getUtcMonthStart } from "./periodic-job-calendar";

const CONTEXTS = ["citizen", "company", "school"] as const;

export type ActionCollectionContextReferenceJobResult = {
  status: "captured" | "reused";
  snapshot: PublicSurfaceSnapshotRecord<ActionCollectionContextReferenceSnapshotPayload>;
};

function getPreviousUtcDay(monthStart: string): string {
  const date = new Date(`${monthStart}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function isUsableMetric(metric: ActionCollectionContextReferenceSnapshotMetric): boolean {
  return metric.value !== null && Number.isFinite(metric.value) && metric.sourceCount >= 2;
}

function buildMetric(params: {
  candidateValue: number | null;
  candidateSourceCount: number;
  previous: ActionCollectionContextReferenceSnapshotMetric | null;
  period: string;
  generatedAt: string;
}): ActionCollectionContextReferenceSnapshotMetric {
  if (
    params.candidateValue !== null &&
    Number.isFinite(params.candidateValue) &&
    params.candidateValue >= 0 &&
    params.candidateSourceCount >= 2
  ) {
    return {
      value: params.candidateValue,
      sourceCount: params.candidateSourceCount,
      period: params.period,
      generatedAt: params.generatedAt,
    };
  }
  if (params.previous && isUsableMetric(params.previous)) {
    return params.previous;
  }
  return {
    value: null,
    sourceCount: params.candidateSourceCount,
    period: null,
    generatedAt: null,
  };
}

function buildSnapshotItem(params: {
  actionContext: ActionCollectionContextReferenceSnapshotItem["actionContext"];
  candidate: ActionCollectionContextReference | undefined;
  previous: ActionCollectionContextReferenceSnapshotItem | undefined;
  period: string;
  generatedAt: string;
}): ActionCollectionContextReferenceSnapshotItem {
  const candidate = params.candidate;
  return {
    actionContext: params.actionContext,
    waste: buildMetric({
      candidateValue: candidate?.wastePerEffectiveUnit ?? null,
      candidateSourceCount: candidate?.wasteSourceCount ?? 0,
      previous: params.previous?.waste ?? null,
      period: params.period,
      generatedAt: params.generatedAt,
    }),
    butts: buildMetric({
      candidateValue: candidate?.buttsPerEffectiveUnit ?? null,
      candidateSourceCount: candidate?.buttsSourceCount ?? 0,
      previous: params.previous?.butts ?? null,
      period: params.period,
      generatedAt: params.generatedAt,
    }),
    eligibleActionCount: candidate?.eligibleActionCount ?? params.previous?.eligibleActionCount ?? 0,
    formulaVersion: ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
  };
}

function buildSnapshot(params: {
  now: Date;
  period: string;
  references: Record<string, ActionCollectionContextReference>;
  previous?: ActionCollectionContextReferenceSnapshotPayload | null;
}): PublicSurfaceSnapshotRecord<ActionCollectionContextReferenceSnapshotPayload> {
  const generatedAt = params.now.toISOString();
  const references = Object.fromEntries(
    CONTEXTS.map((actionContext) => [
      actionContext,
      buildSnapshotItem({
        actionContext,
        candidate: params.references[actionContext],
        previous: params.previous?.references[actionContext],
        period: params.period,
        generatedAt,
      }),
    ]),
  ) as ActionCollectionContextReferenceSnapshotPayload["references"];

  return {
    id: `${ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_KEY}:${getPublicSurfaceSnapshotDate(params.period)}`,
    snapshotKey: ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_KEY,
    snapshotDate: params.period,
    generatedAt,
    version: ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_VERSION,
    title: "Références mensuelles de collecte par contexte",
    payload: {
      period: params.period,
      generatedAt,
      formulaVersion: ACTION_COLLECTION_CONTEXT_FORMULA_VERSION,
      source: "action_collection_context_reference_averages_v1",
      references,
    },
    meta: {
      job: "ACTION_COLLECTION_CONTEXT_REFERENCES",
      cadence: "monthly",
      source: "action_collection_context_reference_averages_v1",
      asOfDate: getPreviousUtcDay(params.period),
      publicAggregateOnly: true,
    },
  };
}

function hasUsableCandidate(
  references: Record<string, ActionCollectionContextReference>,
): boolean {
  return CONTEXTS.some((actionContext) => {
    const reference = references[actionContext];
    return Boolean(
      reference &&
        ((reference.wastePerEffectiveUnit !== null &&
          reference.wastePerEffectiveUnit >= 0 &&
          reference.wasteSourceCount >= 2) ||
          (reference.buttsPerEffectiveUnit !== null &&
            reference.buttsPerEffectiveUnit >= 0 &&
            reference.buttsSourceCount >= 2)),
    );
  });
}

export async function runActionCollectionContextReferenceJob(params: {
  now?: Date;
  force?: boolean;
  fetchReferences?: (asOfDate: string) => Promise<
    Record<string, ActionCollectionContextReference>
  >;
  readSnapshot?: () => Promise<PublicSurfaceSnapshotRecord<ActionCollectionContextReferenceSnapshotPayload> | null>;
  writeSnapshot?: (
    snapshot: Omit<PublicSurfaceSnapshotRecord<ActionCollectionContextReferenceSnapshotPayload>, "id">,
  ) => Promise<unknown>;
} = {}): Promise<ActionCollectionContextReferenceJobResult> {
  const now = params.now ?? new Date();
  const period = getUtcMonthStart(now);
  const readSnapshot = params.readSnapshot ?? (() =>
    readLatestPublicSurfaceSnapshot<ActionCollectionContextReferenceSnapshotPayload>(
      ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_KEY,
    ));
  const existing = await readSnapshot();
  const existingPayload = existing?.version === ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_VERSION &&
    existing.snapshotDate === getSnapshotPayloadPeriod(existing.payload)
    ? normalizeActionCollectionContextReferenceSnapshotPayload(existing.payload)
    : null;

  if (
    !params.force &&
    existing?.version === ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_VERSION &&
    existing.snapshotDate === period &&
    existingPayload
  ) {
    return { status: "reused", snapshot: existing };
  }

  const fetchReferences = params.fetchReferences ?? ((asOfDate: string) =>
    fetchActionCollectionContextReferenceAverages(getSupabaseServerClient(true), { asOfDate }));
  const references = await fetchReferences(getPreviousUtcDay(period));
  const snapshot = buildSnapshot({
    now,
    period,
    references,
    previous: existingPayload,
  });

  if (!hasUsableCandidate(references)) {
    if (existing && existingPayload) {
      return { status: "reused", snapshot: existing };
    }
    throw new Error("Aucune référence contextuelle de collecte disponible.");
  }

  const writeSnapshot = params.writeSnapshot ?? ((value) => upsertPublicSurfaceSnapshot(value));
  const writeResult = await writeSnapshot(toPersistedPublicSurfaceSnapshot(snapshot));
  if (writeResult === "ignored_older") {
    const latestSnapshot = await requirePersistedPublicSurfaceSnapshot(
      ACTION_COLLECTION_CONTEXT_REFERENCES_SNAPSHOT_KEY,
      period,
      readSnapshot,
    );
    return { status: "reused", snapshot: latestSnapshot };
  }

  invalidateActionCollectionReferenceAveragesCache();
  return { status: "captured", snapshot };
}

function getSnapshotPayloadPeriod(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const period = (payload as { period?: unknown }).period;
  return typeof period === "string" ? period : null;
}
