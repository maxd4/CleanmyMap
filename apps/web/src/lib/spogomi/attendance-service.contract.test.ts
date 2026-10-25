import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authorizationMock = vi.hoisted(() => ({
  resolveSpogomiEventAccess: vi.fn(),
  hasSpogomiCapability: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./authorization", () => authorizationMock);

import {
  loadSpogomiAttendanceProjection,
  setSpogomiAttendanceStatus,
} from "./attendance-service";

const service = readFileSync(new URL("./attendance-service.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../../app/api/spogomi/events/[eventId]/attendance/route.ts", import.meta.url), "utf8");

describe("SPOGOMI attendance projection STATIC_CONTRACT", () => {
  it("keeps the roster response private, paginated and minimal", () => {
    expect(service).toContain("hasSpogomiCapability(access, \"checkin\")");
    expect(service).toContain("range(from, from + pageSize - 1)");
    expect(service).toContain("displayName");
    expect(service).toContain("attendanceStatus");
    expect(service).toContain("external_reference");
    expect(service).not.toContain("account_link_status");
  });

  it("requires a server-side event capability for reads and writes", () => {
    expect(route).toContain("resolveSpogomiEventAccess");
    expect(route).toContain("hasSpogomiCapability(eventAccess, \"checkin\")");
    expect(route).toContain("expectedUpdatedAt");
    expect(route).toContain("provenance");
  });
});

type AttendanceFixtureOptions = {
  teams?: unknown[];
  participants?: unknown[];
  participantError?: Error | null;
  rpcData?: unknown;
  rpcError?: Error | null;
};

function attendanceFixture(options: AttendanceFixtureOptions = {}) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const teams = options.teams ?? [{ id: "team-1", division_id: "casual", team_number: 7, public_name: "Alpha" }];
  const participants = options.participants ?? [{
    id: "participant-1", division_id: "casual", display_name: "Camille", external_reference: "ticket-7",
    source_row_number: 7, team_id: "team-1", attendance_status: "unknown", registration_status: "registered", updated_at: "v1",
  }];
  const from = vi.fn((table: string) => {
    const data = table === "spogomi_teams" ? teams : participants;
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "or", "order", "range"]) {
      query[method] = vi.fn((...args: unknown[]) => {
        calls.push({ table, method, args });
        return query;
      });
    }
    query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve({
      data,
      count: table === "spogomi_participants" ? participants.length : null,
      error: table === "spogomi_participants" ? options.participantError ?? null : null,
    }).then(resolve, reject);
    return query;
  });
  const rpc = vi.fn(async () => ({ data: options.rpcData, error: options.rpcError ?? null }));
  return { supabase: { from, rpc } as never, calls, from, rpc };
}

describe("SPOGOMI attendance projection EXECUTED_BEHAVIOR", () => {
  beforeEach(() => {
    authorizationMock.resolveSpogomiEventAccess.mockReset().mockResolvedValue({ role: "organizer" });
    authorizationMock.hasSpogomiCapability.mockReset().mockReturnValue(true);
  });

  it("fails closed before reading the roster when the actor lacks check-in capability", async () => {
    authorizationMock.hasSpogomiCapability.mockReturnValue(false);
    const fixture = attendanceFixture();

    await expect(loadSpogomiAttendanceProjection({
      supabase: fixture.supabase, eventId: "event-1", userId: "outsider",
    })).resolves.toBe(false);

    expect(fixture.calls).toHaveLength(0);
  });

  it("applies the division, numeric team filter and bounded pagination before mapping the roster", async () => {
    const fixture = attendanceFixture({
      teams: [
        { id: "team-1", division_id: "casual", team_number: 7, public_name: "Alpha" },
        { id: "team-2", division_id: "casual", team_number: 8, public_name: "Beta" },
      ],
    });

    const result = await loadSpogomiAttendanceProjection({
      supabase: fixture.supabase, eventId: "event-1", userId: "organizer",
      divisionId: "casual", search: "  7  ", page: -4, pageSize: 500,
    });

    expect(result).toMatchObject({ eventId: "event-1", divisionId: "casual", page: 0, pageSize: 100, total: 1 });
    expect(result).toMatchObject({ participants: [{ id: "participant-1", team: { id: "team-1", number: 7, publicName: "Alpha" } }] });
    expect(fixture.calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "spogomi_participants", method: "or", args: ["source_row_number.eq.7,team_id.in.(team-1)"] }),
      expect.objectContaining({ table: "spogomi_participants", method: "range", args: [0, 99] }),
    ]));
  });

  it("sanitizes a named search and keeps participants with an unknown team in a null projection", async () => {
    const fixture = attendanceFixture({
      teams: [{ id: "team-1", division_id: "casual", team_number: 7, public_name: "Alpha Nord" }],
      participants: [{
        id: "participant-2", division_id: "casual", display_name: null, external_reference: "REF-2",
        source_row_number: null, team_id: "missing-team", attendance_status: "present", registration_status: "withdrawn", updated_at: "v2",
      }],
    });

    const result = await loadSpogomiAttendanceProjection({
      supabase: fixture.supabase, eventId: "event-1", userId: "organizer", search: "Alpha,Nord", page: 2, pageSize: 10,
    });

    if (result === false) throw new Error("Expected an attendance projection");
    expect(result.participants).toEqual([expect.objectContaining({ id: "participant-2", team: null, attendanceStatus: "present", registrationStatus: "withdrawn" })]);
    expect(fixture.calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "spogomi_participants", method: "or", args: ["display_name.ilike.%Alpha Nord%,external_reference.ilike.%Alpha Nord%,team_id.in.(team-1)"] }),
      expect.objectContaining({ table: "spogomi_participants", method: "range", args: [20, 29] }),
    ]));
  });

  it("rejects malformed persisted team or participant rows instead of exposing partial data", async () => {
    const invalidTeam = attendanceFixture({ teams: [{ id: "team-1", division_id: "casual", team_number: "7", public_name: "Alpha" }] });
    await expect(loadSpogomiAttendanceProjection({ supabase: invalidTeam.supabase, eventId: "event-1", userId: "organizer" })).rejects.toThrow("projection des équipes");

    const invalidParticipant = attendanceFixture({ participants: [{ id: "participant-1", division_id: "casual", display_name: "A", external_reference: null, source_row_number: null, team_id: null, attendance_status: "unknown", registration_status: "invalid", updated_at: "v1" }] });
    await expect(loadSpogomiAttendanceProjection({ supabase: invalidParticipant.supabase, eventId: "event-1", userId: "organizer" })).rejects.toThrow("projection des participants");
  });

  it("passes an optimistic concurrency token and trimmed audit fields to the attendance RPC", async () => {
    const fixture = attendanceFixture({ rpcData: {
      changed: true, eventId: "event-1", divisionId: "casual", participantId: "participant-1",
      previousStatus: "unknown", attendanceStatus: "present", updatedAt: "v2",
    } });

    await expect(setSpogomiAttendanceStatus({
      supabase: fixture.supabase, eventId: "event-1", divisionId: "casual", participantId: "participant-1",
      status: "present", actorClerkId: "organizer", reason: "  Contrôle terrain  ", provenance: "  feuille papier  ", expectedUpdatedAt: "v1",
    })).resolves.toMatchObject({ changed: true, previousStatus: "unknown", attendanceStatus: "present" });

    expect(fixture.rpc).toHaveBeenCalledWith("spogomi_set_attendance_status", {
      p_event_id: "event-1", p_division_id: "casual", p_participant_id: "participant-1", p_next_status: "present",
      p_actor_clerk_id: "organizer", p_reason: "Contrôle terrain", p_provenance: "feuille papier", p_expected_updated_at: "v1",
    });
  });

  it("does not turn an invalid mutation response or database failure into a successful attendance change", async () => {
    const invalid = attendanceFixture({ rpcData: { changed: true }, rpcError: null });
    await expect(setSpogomiAttendanceStatus({
      supabase: invalid.supabase, eventId: "event-1", divisionId: "casual", participantId: "participant-1",
      status: "absent", actorClerkId: "organizer", reason: "reason", provenance: "source",
    })).rejects.toThrow("réponse de persistance");

    const failed = attendanceFixture({ rpcError: new Error("stale revision") });
    await expect(setSpogomiAttendanceStatus({
      supabase: failed.supabase, eventId: "event-1", divisionId: "casual", participantId: "participant-1",
      status: "absent", actorClerkId: "organizer", reason: "reason", provenance: "source",
    })).rejects.toThrow("stale revision");
  });
});
