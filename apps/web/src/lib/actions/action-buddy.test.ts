import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { ActionBuddyConflictError, loadActionBuddyState } from "./action-buddy";
import type { ActionRow } from "@/types/database";

type Row = Record<string, unknown>;
type QueryResult = { data: unknown; error: null };

class FakeQuery implements PromiseLike<QueryResult> {
  private readonly filters: Array<{ column: string; value: unknown; negated: boolean }> = [];
  private limitValue: number | null = null;
  private selectedColumns: string[] | null = null;

  constructor(private readonly rows: Row[]) {}

  select(columns?: unknown): this {
    this.selectedColumns = typeof columns === "string"
      ? columns.split(",").map((column) => column.trim()).filter(Boolean)
      : null;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, value, negated: false });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ column, value, negated: true });
    return this;
  }

  order(): this { return this; }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  private read(row: Row, path: string): unknown {
    return path.split(".").reduce<unknown>((value, segment) => (
      value && typeof value === "object" ? (value as Row)[segment] : undefined
    ), row);
  }

  private result(maybeSingle: boolean): QueryResult {
    const filtered = this.rows
      .filter((row) => this.filters.every(({ column, value, negated }) => {
        const matches = this.read(row, column) === value;
        return negated ? !matches : matches;
      }))
      .slice(0, this.limitValue ?? undefined)
      .map((row) => this.selectedColumns ? this.project(row) : row);
    return { data: maybeSingle ? (filtered[0] ?? null) : filtered, error: null };
  }

  private project(row: Row): Row {
    const projected: Row = {};
    for (const column of this.selectedColumns ?? []) {
      const nestedMatch = column.match(/^([^:]+):[^()]+\(([^)]+)\)$/);
      if (nestedMatch) {
        const [, alias, nestedColumns] = nestedMatch;
        const nestedRow = row[alias];
        if (nestedRow && typeof nestedRow === "object") {
          projected[alias] = Object.fromEntries(nestedColumns.split(";").map((name) => [name.trim(), (nestedRow as Row)[name.trim()]]));
        }
        continue;
      }
      projected[column] = row[column];
    }
    return projected;
  }

  maybeSingle(): Promise<QueryResult> {
    return Promise.resolve(this.result(true));
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result(false)).then(onfulfilled, onrejected);
  }
}

function fakeSupabase(rowsByTable: Record<string, Row[]>): SupabaseClient {
  return {
    from(table: string) {
      return new FakeQuery(rowsByTable[table] ?? []) as never;
    },
  } as unknown as SupabaseClient;
}

const actionId = "action-1";
const action = {
  id: actionId,
  action_date: "2999-01-01",
  event_start_time: "10:00",
  action_phase: "pre_action",
  status: "approved",
  review_state: "approved",
  moderation_visibility: "visible",
  published_at: "2998-12-01T10:00:00.000Z",
  access_mode: "public",
  preparation_data: {},
} as unknown as ActionRow;

function baseRows(userId: string, registrationStatus = "confirmed"): Record<string, Row[]> {
  return {
    actions: [action],
    action_registrations: [{
      action_id: actionId,
      user_id: userId,
      registration_status: registrationStatus,
      created_at: "2998-12-01T10:00:00.000Z",
      registered_at: "2998-12-01T10:00:00.000Z",
      updated_at: "2998-12-01T10:00:00.000Z",
      registration_source: "public",
      registration_cancellation_reason: null,
      manual_invitation_version: null,
    }],
    action_buddy_availability: [],
    action_buddy_requests: [],
    action_buddy_proposals: [],
    profiles: [],
  };
}

describe("loadActionBuddyState proposal privacy", () => {
  it("projects requester proposals without the mentor identity, including historical states", async () => {
    const rows = baseRows("requester-1");
    rows.action_buddy_requests = [{
      id: "request-1",
      action_id: actionId,
      requester_user_id: "requester-1",
      status: "open",
      matched_mentor_user_id: null,
      created_at: "2998-12-02T10:00:00.000Z",
      updated_at: "2998-12-02T10:00:00.000Z",
      matched_at: null,
    }];
    rows.action_buddy_proposals = [
      { id: "proposal-pending", request_id: "request-1", mentor_user_id: "mentor-1", status: "pending", created_at: "2998-12-03T10:00:00.000Z", resolved_at: null },
      { id: "proposal-declined", request_id: "request-1", mentor_user_id: "mentor-2", status: "declined", created_at: "2998-12-04T10:00:00.000Z", resolved_at: "2998-12-05T10:00:00.000Z" },
      { id: "proposal-withdrawn", request_id: "request-1", mentor_user_id: "mentor-3", status: "withdrawn", created_at: "2998-12-06T10:00:00.000Z", resolved_at: "2998-12-07T10:00:00.000Z" },
    ];

    const state = await loadActionBuddyState(fakeSupabase(rows), { actionId, userId: "requester-1" });

    expect(state.receivedProposals).toEqual([
      { id: "proposal-pending", status: "pending" },
      { id: "proposal-declined", status: "declined" },
      { id: "proposal-withdrawn", status: "withdrawn" },
    ]);
    expect(state.proposals).toEqual(state.receivedProposals);
    expect(JSON.stringify(state)).not.toContain("mentor-1");
    expect(JSON.stringify(state)).not.toContain("mentor-2");
    expect(JSON.stringify(state)).not.toContain("mentor-3");
    expect(Object.keys(state.receivedProposals[0])).toEqual(["id", "status"]);
  });

  it("projects mentor-sent proposals without the requester's identity", async () => {
    const rows = baseRows("mentor-1");
    rows.action_buddy_availability = [{
      action_id: actionId,
      mentor_user_id: "mentor-1",
      created_at: "2998-12-02T10:00:00.000Z",
      updated_at: "2998-12-02T10:00:00.000Z",
    }];
    rows.action_buddy_requests = [{
      id: "request-2",
      action_id: actionId,
      requester_user_id: "requester-2",
      status: "open",
      matched_mentor_user_id: null,
      created_at: "2998-12-02T10:00:00.000Z",
      updated_at: "2998-12-02T10:00:00.000Z",
      matched_at: null,
    }];
    rows.action_buddy_proposals = [
      { id: "proposal-sent", request_id: "request-2", mentor_user_id: "mentor-1", status: "pending", created_at: "2998-12-03T10:00:00.000Z", resolved_at: null, request: { action_id: actionId } },
    ];

    const state = await loadActionBuddyState(fakeSupabase(rows), { actionId, userId: "mentor-1" });

    expect(state.sentProposals).toEqual([{ id: "proposal-sent", status: "pending" }]);
    expect(state.receivedProposals).toEqual([]);
    expect(JSON.stringify(state)).not.toContain("requester-2");
    expect(Object.keys(state.sentProposals[0])).toEqual(["id", "status"]);
  });

  it("keeps the matched partner projection for the confirmed private DM only", async () => {
    const rows = baseRows("requester-1");
    rows.action_buddy_requests = [{
      id: "request-matched",
      action_id: actionId,
      requester_user_id: "requester-1",
      status: "matched",
      matched_mentor_user_id: "mentor-1",
      created_at: "2998-12-02T10:00:00.000Z",
      updated_at: "2998-12-03T10:00:00.000Z",
      matched_at: "2998-12-03T10:00:00.000Z",
    }];
    rows.action_buddy_proposals = [{
      id: "proposal-accepted",
      request_id: "request-matched",
      mentor_user_id: "mentor-1",
      status: "accepted",
      created_at: "2998-12-02T10:00:00.000Z",
      resolved_at: "2998-12-03T10:00:00.000Z",
    }];
    rows.profiles = [{ id: "mentor-1", display_name: "Mentor privé", handle: "mentor" }];

    const state = await loadActionBuddyState(fakeSupabase(rows), { actionId, userId: "requester-1" });

    expect(state.matchedPartner).toEqual({ userId: "mentor-1", displayName: "Mentor privé", handle: "mentor" });
    expect(state.proposals).toEqual([{ id: "proposal-accepted", status: "accepted" }]);
    expect(state.proposals[0]).not.toHaveProperty("mentor_user_id");
  });

  it("does not load a private projection for an unconfirmed registration", async () => {
    const rows = baseRows("pending-user", "pending");
    rows.action_buddy_proposals = [{ id: "proposal-1", request_id: "request-1", mentor_user_id: "mentor-1", status: "pending" }];

    await expect(loadActionBuddyState(fakeSupabase(rows), { actionId, userId: "pending-user" }))
      .rejects.toBeInstanceOf(ActionBuddyConflictError);
  });
});
