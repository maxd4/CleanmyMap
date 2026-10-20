import { describe, expect, it, vi } from "vitest";
import { loadSpogomiFirstRefereeFact } from "./gamification-facts";

type Response = { data: unknown[]; count: number | null; error: { message: string } | null };

function fakeSupabase(responses: Record<string, Response[]>): never {
  return {
    from: vi.fn((table: string) => {
      const builder: Record<string, ReturnType<typeof vi.fn>> = {};
      builder.select = vi.fn(() => builder);
      builder.eq = vi.fn(() => builder);
      builder.in = vi.fn(() => builder);
      builder.order = vi.fn(() => builder);
      builder.range = vi.fn(async () => responses[table]?.shift() ?? { data: [], count: 0, error: null });
      return builder;
    }),
  } as never;
}

function validResponses(overrides: { attendanceStatus?: string; actionParticipation?: Response[]; eventState?: string } = {}): Record<string, Response[]> {
  return {
    spogomi_participants: [{ data: [{ id: "participant-1", event_id: "event-1", clerk_id: "user-1", registration_status: "registered", attendance_status: overrides.attendanceStatus ?? "present", account_link_status: "verified" }], count: 1, error: null }],
    spogomi_recognition_attestations: [{ data: [{ id: "mission-1", participant_id: "participant-1", event_id: "event-1", certified_at: "2026-06-01T12:00:00Z", certification_version: "v1", evidence_reference: "proof:1" }], count: 1, error: null }],
    spogomi_events: [{ data: [{ id: "event-1", action_id: "action-1", starts_at: "2026-06-01T09:00:00Z", official_timezone: "Europe/Paris", state: overrides.eventState ?? "certified" }], count: 1, error: null }],
    action_participants: overrides.actionParticipation ?? [{ data: [{ id: "action-participant-1", action_id: "action-1" }], count: 1, error: null }],
  };
}

describe("SPOGOMI first referee facts", () => {
  it("requires the complete canonical mission participation proof", async () => {
    await expect(loadSpogomiFirstRefereeFact(fakeSupabase(validResponses()), "user-1")).resolves.toMatchObject({
      mechanicId: "spogomi_first_referee",
      sourceId: "user-1",
      eligible: true,
      metadata: { missionId: "mission-1", eventId: "event-1", certificationVersion: "v1" },
    });
    await expect(loadSpogomiFirstRefereeFact(fakeSupabase(validResponses({ attendanceStatus: "absent" })), "user-1")).resolves.toBeNull();
    await expect(loadSpogomiFirstRefereeFact(fakeSupabase(validResponses({ actionParticipation: [{ data: [], count: 0, error: null }] })), "user-1")).resolves.toBeNull();
    await expect(loadSpogomiFirstRefereeFact(fakeSupabase(validResponses({ eventState: "draft" })), "user-1")).resolves.toBeNull();
  });

  it("fails closed when a participant page is missing", async () => {
    const firstPage = Array.from({ length: 1_000 }, (_, index) => ({ id: `participant-${index}`, event_id: "event-1", clerk_id: "user-1", registration_status: "registered", attendance_status: "present", account_link_status: "verified" }));
    await expect(loadSpogomiFirstRefereeFact(fakeSupabase({
      spogomi_participants: [
        { data: firstPage, count: 1_001, error: null },
        { data: [], count: 1_001, error: null },
      ],
    }), "user-1")).rejects.toThrow("SPOGOMI first referee participants read failed: incomplete paginated result");
  });

  it("selects one earliest certified mission across events for the one-shot XP milestone", async () => {
    const responses = validResponses();
    responses.spogomi_participants = [{ data: [
      { id: "participant-1", event_id: "event-1", clerk_id: "user-1", registration_status: "registered", attendance_status: "present", account_link_status: "verified" },
      { id: "participant-2", event_id: "event-2", clerk_id: "user-1", registration_status: "registered", attendance_status: "present", account_link_status: "verified" },
    ], count: 2, error: null }];
    responses.spogomi_recognition_attestations = [{ data: [
      { id: "mission-late", participant_id: "participant-1", event_id: "event-1", certified_at: "2027-01-01T12:00:00Z", certification_version: "late-v1", evidence_reference: "proof:late" },
      { id: "mission-early", participant_id: "participant-2", event_id: "event-2", certified_at: "2026-12-31T12:00:00Z", certification_version: "early-v1", evidence_reference: "proof:early" },
    ], count: 2, error: null }];
    responses.spogomi_events = [{ data: [
      { id: "event-1", action_id: "action-1", starts_at: "2026-12-31T23:30:00Z", official_timezone: "Europe/Paris", state: "certified" },
      { id: "event-2", action_id: "action-2", starts_at: "2026-12-30T23:30:00Z", official_timezone: "Europe/Paris", state: "certified" },
    ], count: 2, error: null }];
    responses.action_participants = [{ data: [{ id: "ap-1", action_id: "action-1" }, { id: "ap-2", action_id: "action-2" }], count: 2, error: null }];

    await expect(loadSpogomiFirstRefereeFact(fakeSupabase(responses), "user-1")).resolves.toMatchObject({
      xpAwarded: 1,
      metadata: { missionId: "mission-early", eventId: "event-2", certificationVersion: "early-v1" },
    });
  });
});
