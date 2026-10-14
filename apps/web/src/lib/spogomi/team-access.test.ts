import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  consumeSpogomiTeamAccessToken,
  issueSpogomiTeamAccessGrant,
  loadSpogomiTeamSession,
  revokeSpogomiTeamAccessGrant,
} from "./team-access";

function makeSupabase() {
  const calls: string[] = [];
  const from = vi.fn((table: string) => {
    let selectValue = "";
    const query = {
      select: vi.fn((value: string) => {
        selectValue = value;
        return query;
      }),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      update: vi.fn(() => query),
      insert: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        if (table === "spogomi_teams") return { data: { id: "team-1", event_id: "event-1" }, error: null };
        if (table === "spogomi_team_access_grants" && (selectValue.includes("token_hash") || selectValue.includes("expires_at, revoked_at"))) {
          return { data: { id: "grant-1", event_id: "event-1", team_id: "team-1", expires_at: "2999-01-01T00:00:00.000Z", revoked_at: null }, error: null };
        }
        if (table === "spogomi_team_access_sessions") {
          return { data: { id: "session-1", grant_id: "grant-1", event_id: "event-1", team_id: "team-1", expires_at: "2999-01-01T00:00:00.000Z", revoked_at: null }, error: null };
        }
        if (table === "spogomi_events") return { data: { id: "event-1", event_slug: "paris-2026" }, error: null };
        return { data: null, error: null };
      }),
      single: vi.fn(async () => {
        if (table === "spogomi_team_access_grants") return { data: { id: "grant-1", expires_at: "2999-01-01T00:00:00.000Z" }, error: null };
        return { data: { id: "session-1" }, error: null };
      }),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        calls.push(table);
        return Promise.resolve({ data: null, error: null }).then(resolve, reject);
      },
    };
    return query;
  });
  return { from, calls };
}

describe("SPOGOMI team access", () => {
  it("issues, consumes, loads and revokes server-owned team credentials", async () => {
    const supabase = makeSupabase();

    const grant = await issueSpogomiTeamAccessGrant({
      supabase: supabase as never,
      eventId: "event-1",
      teamId: "team-1",
      createdByClerkId: "organizer-1",
    });
    expect(grant.grantId).toBe("grant-1");
    expect(grant.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);

    const consumed = await consumeSpogomiTeamAccessToken({
      supabase: supabase as never,
      token: "a".repeat(40),
      eventSlug: "paris-2026",
    });
    expect(consumed).toMatchObject({ eventSlug: "paris-2026", teamId: "team-1" });

    await expect(loadSpogomiTeamSession(supabase as never, consumed.sessionToken)).resolves.toMatchObject({
      sessionId: "session-1",
      grantId: "grant-1",
      eventId: "event-1",
      teamId: "team-1",
    });

    await expect(revokeSpogomiTeamAccessGrant({ supabase: supabase as never, eventId: "event-1", teamId: "team-1" })).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("spogomi_team_access_grants");
    expect(supabase.from).toHaveBeenCalledWith("spogomi_team_access_sessions");
  });

  it("rejects malformed and missing team session tokens", async () => {
    const supabase = makeSupabase();

    await expect(consumeSpogomiTeamAccessToken({ supabase: supabase as never, token: "short", eventSlug: "paris-2026" })).rejects.toThrow("invalid");
    await expect(loadSpogomiTeamSession(supabase as never, undefined)).resolves.toBeNull();
  });
});
