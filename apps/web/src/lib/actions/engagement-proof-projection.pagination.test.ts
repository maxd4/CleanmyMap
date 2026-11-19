import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadPersonalEngagementProofProjection } from "./engagement-proof-projection";
import type {
  RawActionRow,
  RawParticipantRow,
  RawRoleAttestationRow,
  RawSpogomiAttestationRow,
  RawSpogomiEventRow,
  RawSpogomiParticipantRow,
} from "./engagement-proof-projection.helpers";

const SUPABASE_MAX_ROWS = 1000;

function makeAction(overrides: Partial<RawActionRow> = {}): RawActionRow {
  return {
    id: "action-1",
    created_at: "2026-05-10T14:00:00Z",
    action_date: "2026-05-10",
    location_label: "Canal Saint-Martin, Paris 10e",
    department_code: "75",
    department_name: "Paris",
    actor_name: "Collectif Canal Propre",
    organizer_name: "Association Canal Vivant",
    organizer_type: "association",
    action_context: "citizen",
    status: "approved",
    action_phase: "post_action_complete",
    published_at: "2026-05-10T16:00:00Z",
    cancelled_at: null,
    moderation_visibility: "visible",
    access_mode: "public",
    data_provenance: "real",
    duration_minutes: 150,
    volunteers_count: 18,
    waste_kg: 42.5,
    cigarette_butts: 3200,
    notes: null,
    preparation_data: {
      actionTitle: "Nettoyage de printemps Canal Saint-Martin",
      durationMinutesDeclared: true,
    },
    ...overrides,
  };
}

function makeParticipant(overrides: Partial<RawParticipantRow> = {}): RawParticipantRow {
  return {
    id: "part-1",
    action_id: "action-1",
    user_id: "user-1",
    joined_at: "2026-05-10T17:00:00Z",
    created_at: "2026-05-10T17:00:00Z",
    updated_at: "2026-05-10T17:00:00Z",
    participation_status: "confirmed",
    participation_source: "post_action_claim",
    individual_waste_kg: null,
    individual_cigarette_butts_count: null,
    ...overrides,
  };
}

function makeRoleAttestation(
  overrides: Partial<RawRoleAttestationRow> = {},
): RawRoleAttestationRow {
  return {
    id: "att-1",
    action_id: "action-1",
    user_id: "user-1",
    role_code: "group_lead",
    verification_status: "confirmed",
    decided_at: "2026-05-11T09:00:00Z",
    responsibility_provenance: "planned_assignment",
    provenance_snapshot: {},
    revision: 1,
    ...overrides,
  };
}

function createPaginatedSupabaseMock(params: {
  action_participants?: RawParticipantRow[];
  actions?: RawActionRow[];
  action_role_attestations?: RawRoleAttestationRow[];
  spogomi_participants?: RawSpogomiParticipantRow[];
  spogomi_events?: RawSpogomiEventRow[];
  spogomi_recognition_attestations?: RawSpogomiAttestationRow[];
  omitCountForTable?: string;
  missingPageForTable?: { table: string; fromOffset: number };
  cardinalityShiftForTable?: { table: string; fromOffset: number; delta: number };
}) {
  const from = vi.fn((table: string) => {
    const filters: Array<{ op: "eq" | "in"; col: string; val: unknown }> = [];
    let orderBy: { col: string; ascending: boolean } | null = null;
    let rangeBounds: { from: number; to: number } | null = null;
    let limitCount: number | null = null;
    let includeCount = false;

    const execute = async () => {
      const rawRows =
        ((params as Record<string, unknown[]>)[table] as Array<Record<string, unknown>>) ?? [];
      const filtered = rawRows.filter((row) =>
        filters.every((filter) => {
          if (filter.op === "eq") return row[filter.col] === filter.val;
          if (filter.op === "in" && Array.isArray(filter.val)) {
            return filter.val.includes(row[filter.col]);
          }
          return true;
        }),
      );
      const sorted = orderBy
        ? [...filtered].sort((left, right) => {
            const leftVal = String(left[orderBy!.col] ?? "");
            const rightVal = String(right[orderBy!.col] ?? "");
            return orderBy!.ascending
              ? leftVal.localeCompare(rightVal)
              : rightVal.localeCompare(leftVal);
          })
        : filtered;

      let effectiveCount: number | null = includeCount ? sorted.length : null;
      if (effectiveCount !== null && params.omitCountForTable === table) {
        effectiveCount = null;
      }
      if (
        effectiveCount !== null &&
        params.cardinalityShiftForTable?.table === table &&
        (rangeBounds?.from ?? 0) >= params.cardinalityShiftForTable.fromOffset
      ) {
        effectiveCount += params.cardinalityShiftForTable.delta;
      }

      const start = rangeBounds ? rangeBounds.from : 0;
      const requestedEnd = rangeBounds
        ? rangeBounds.to + 1
        : limitCount !== null
          ? limitCount
          : sorted.length;
      const cappedEnd = Math.min(requestedEnd, start + SUPABASE_MAX_ROWS);
      let page = sorted.slice(start, cappedEnd);

      if (
        params.missingPageForTable?.table === table &&
        start >= params.missingPageForTable.fromOffset
      ) {
        page = page.slice(0, Math.max(0, Math.floor(page.length / 2)));
      }

      return { data: page, count: effectiveCount, error: null };
    };

    const chain: Record<string, unknown> = {
      select: vi.fn((_cols?: string, options?: { count?: string }) => {
        if (options?.count === "exact") {
          includeCount = true;
        }
        return chain;
      }),
      eq: vi.fn((col: string, val: unknown) => {
        filters.push({ op: "eq", col, val });
        return chain;
      }),
      in: vi.fn((col: string, val: unknown) => {
        filters.push({ op: "in", col, val });
        return chain;
      }),
      order: vi.fn((col: string, opts?: { ascending?: boolean }) => {
        orderBy = { col, ascending: opts?.ascending !== false };
        return chain;
      }),
      range: vi.fn((fromIndex: number, toIndex: number) => {
        rangeBounds = { from: fromIndex, to: toIndex };
        return chain;
      }),
      limit: vi.fn((n: number) => {
        limitCount = n;
        return chain;
      }),
      then: (
        resolve: (value: unknown) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => execute().then(resolve, reject),
    };
    return chain;
  });

  return { supabase: { from } as never, from };
}

function buildPaginatedDataset(count: number, userId = "user-1", idPrefix = "act") {
  const action_participants: RawParticipantRow[] = [];
  const actions: RawActionRow[] = [];
  for (let index = 0; index < count; index += 1) {
    const idSuffix = String(index).padStart(5, "0");
    const actionId = `${idPrefix}-${idSuffix}`;
    action_participants.push(
      makeParticipant({
        id: `${idPrefix}-part-${idSuffix}`,
        action_id: actionId,
        user_id: userId,
      }),
    );
    actions.push(
      makeAction({
        id: actionId,
        action_date: "2026-05-10",
        created_at: "2026-05-10T10:00:00Z",
      }),
    );
  }
  return { action_participants, actions };
}

describe("engagement-proof-projection pagination, max_rows=1000, and bounds", () => {
  it("handles 0, 1000, and 1001 rows across max_rows=1000 pages without truncation or duplicates", async () => {
    const emptyMock = createPaginatedSupabaseMock({
      action_participants: [],
      actions: [],
      action_role_attestations: [],
    });
    const emptyProjection = await loadPersonalEngagementProofProjection(
      emptyMock.supabase,
      "user-1",
    );
    expect(emptyProjection.status).toBe("available");
    expect(emptyProjection.participations.value).toHaveLength(0);
    expect(emptyProjection.distinctions.presenceConfirmed.value?.confirmedActionCount).toBe(0);

    const exact1000 = buildPaginatedDataset(1000);
    const mock1000 = createPaginatedSupabaseMock(exact1000);
    const projection1000 = await loadPersonalEngagementProofProjection(
      mock1000.supabase,
      "user-1",
    );
    expect(projection1000.status).toBe("available");
    expect(projection1000.participations.value).toHaveLength(1000);
    expect(
      new Set(projection1000.participations.value?.map((item) => item.actionId)).size,
    ).toBe(1000);

    const over1000 = buildPaginatedDataset(1001);
    const mock1001 = createPaginatedSupabaseMock(over1000);
    const projection1001 = await loadPersonalEngagementProofProjection(
      mock1001.supabase,
      "user-1",
    );
    expect(projection1001.status).toBe("available");
    expect(projection1001.participations.value).toHaveLength(1001);
    expect(
      new Set(projection1001.participations.value?.map((item) => item.actionId)).size,
    ).toBe(1001);
  });

  it("loads several thousand participations, batched actions, multi-page role attestations, and SPOGOMI attestations without cross-user leakage", async () => {
    const ownerData = buildPaginatedDataset(2350, "user-1", "act");
    const peerData = buildPaginatedDataset(150, "user-2", "peer-act");

    const roleAttestations: RawRoleAttestationRow[] = [];
    for (let index = 0; index < 2150; index += 1) {
      const actionIndex = index % 2350;
      roleAttestations.push(
        makeRoleAttestation({
          id: `att-${String(index).padStart(5, "0")}`,
          action_id: `act-${String(actionIndex).padStart(5, "0")}`,
          user_id: "user-1",
          role_code: "group_lead",
        }),
      );
    }
    roleAttestations.push(
      makeRoleAttestation({
        id: "att-peer-1",
        action_id: "act-00000",
        user_id: "user-2",
        role_code: "glass_bag_lead",
      }),
    );

    const spogomiParticipants: RawSpogomiParticipantRow[] = [
      {
        id: "sp-p-1",
        event_id: "sp-ev-1",
        clerk_id: "user-1",
        registration_status: "registered",
        attendance_status: "present",
        account_link_status: "verified",
      },
    ];
    const spogomiEvents: RawSpogomiEventRow[] = [
      {
        id: "sp-ev-1",
        action_id: "act-00000",
        name: "SPOGOMI Grand Paris",
        public_visibility: "published",
        state: "certified",
      },
    ];
    const spogomiAttestations: RawSpogomiAttestationRow[] = [];
    for (let index = 0; index < 1050; index += 1) {
      spogomiAttestations.push({
        id: `sp-att-${String(index).padStart(5, "0")}`,
        event_id: "sp-ev-1",
        participant_id: "sp-p-1",
        kind: "logistics_support",
        status: "certified",
        certified_at: "2026-05-10T18:00:00Z",
        evidence_reference: `ref-${index}`,
        certification_version: "v1",
      });
    }

    const mock = createPaginatedSupabaseMock({
      action_participants: [...ownerData.action_participants, ...peerData.action_participants],
      actions: [...ownerData.actions, ...peerData.actions],
      action_role_attestations: roleAttestations,
      spogomi_participants: spogomiParticipants,
      spogomi_events: spogomiEvents,
      spogomi_recognition_attestations: spogomiAttestations,
    });

    const projection = await loadPersonalEngagementProofProjection(mock.supabase, "user-1");
    expect(projection.status).toBe("available");
    expect(projection.participations.value).toHaveLength(2350);
    expect(projection.distinctions.presenceConfirmed.value?.confirmedActionCount).toBe(2350);
    expect(projection.distinctions.attestedMissions.value?.attestedMissionCount).toBe(
      2150 + 1050,
    );
    expect(JSON.stringify(projection)).not.toContain("user-2");
    expect(JSON.stringify(projection)).not.toContain("att-peer-1");
  });

  it("fails explicitly with error status on missing page, cardinality shift, missing exact count, or bound exceeded", async () => {
    const dataset2200 = buildPaginatedDataset(2200);

    const missingPageMock = createPaginatedSupabaseMock({
      ...dataset2200,
      missingPageForTable: { table: "action_participants", fromOffset: 1000 },
    });
    const missingPageResult = await loadPersonalEngagementProofProjection(
      missingPageMock.supabase,
      "user-1",
    );
    expect(missingPageResult.status).toBe("error");
    expect(missingPageResult.sourceStates.actionParticipants).toBe("error");
    expect(missingPageResult.participations.value).toBeNull();

    const cardinalityMock = createPaginatedSupabaseMock({
      ...dataset2200,
      cardinalityShiftForTable: { table: "action_participants", fromOffset: 1000, delta: 1 },
    });
    const cardinalityResult = await loadPersonalEngagementProofProjection(
      cardinalityMock.supabase,
      "user-1",
    );
    expect(cardinalityResult.status).toBe("error");
    expect(cardinalityResult.sourceStates.actionParticipants).toBe("error");
    expect(cardinalityResult.participations.value).toBeNull();

    const omitCountMock = createPaginatedSupabaseMock({
      ...dataset2200,
      omitCountForTable: "action_participants",
    });
    const omitCountResult = await loadPersonalEngagementProofProjection(
      omitCountMock.supabase,
      "user-1",
    );
    expect(omitCountResult.status).toBe("error");
    expect(omitCountResult.sourceStates.actionParticipants).toBe("error");

    const overBoundData = buildPaginatedDataset(10001);
    const overBoundMock = createPaginatedSupabaseMock(overBoundData);
    const overBoundResult = await loadPersonalEngagementProofProjection(
      overBoundMock.supabase,
      "user-1",
    );
    expect(overBoundResult.status).toBe("error");
    expect(overBoundResult.sourceStates.actionParticipants).toBe("error");
    expect(overBoundResult.participations.value).toBeNull();
  });

  it("aggregates multiple actions across periods and organizations with association_name/actor_name fallbacks and cigarette-butt declarations", async () => {
    const mock = createPaginatedSupabaseMock({
      action_participants: [
        makeParticipant({
          id: "p-1",
          action_id: "action-1",
          individual_waste_kg: 2.5,
          individual_waste_condition: "sec",
          individual_cigarette_butts_count: 150,
          individual_cigarette_butts_provenance: "counted",
        }),
        makeParticipant({
          id: "p-2",
          action_id: "action-2",
          individual_waste_kg: null,
          individual_cigarette_butts_count: 80,
          individual_cigarette_butts_provenance: "counted",
        }),
        makeParticipant({
          id: "p-3",
          action_id: "action-3",
        }),
      ],
      actions: [
        makeAction({
          id: "action-1",
          action_date: "2026-05-10",
          organizer_name: "Association Canal Vivant",
          organizer_type: "association",
          action_context: "citizen",
        }),
        makeAction({
          id: "action-2",
          action_date: "2026-05-24",
          organizer_name: "Association Canal Vivant",
          organizer_type: "association",
          action_context: "school",
        }),
        makeAction({
          id: "action-3",
          action_date: "2025-11-04",
          organizer_name: null,
          actor_name: "Collectif Rive Gauche",
          organizer_type: "collective",
          action_context: "company",
          notes: '[cmm-meta]{"associationName":"Association Rive Gauche"}',
        }),
      ],
      action_role_attestations: [],
      spogomi_participants: [],
    });

    const projection = await loadPersonalEngagementProofProjection(mock.supabase, "user-1");
    expect(projection.status).toBe("available");
    expect(projection.participations.value).toHaveLength(3);
    expect(projection.organizations.value).toHaveLength(2);
    expect(projection.organizations.value?.[0]?.confirmedParticipationsCount).toBe(2);
    expect(projection.organizations.value?.[1]?.name).toBe("Association Rive Gauche");
    expect(projection.periods.value?.byYear).toHaveLength(2);
    expect(projection.periods.value?.byMonth).toHaveLength(2);
    expect(projection.distinctions.personalDeclarations.value?.declaredActionCount).toBe(2);
  });
});
