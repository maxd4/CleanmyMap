import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createSpogomiIdentityAssistanceRequest,
  generateSpogomiIdentityAssistanceToken,
  hashSpogomiIdentityAssistanceToken,
  transitionSpogomiIdentityAssistanceRequest,
} from "./identity-assistance";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261015000015_spogomi_identity_assistance.sql", import.meta.url),
  "utf8",
);

describe("SPOGOMI identity assistance", () => {
  it("uses an opaque token and never exposes it as stored data", () => {
    const token = generateSpogomiIdentityAssistanceToken();
    expect(token).toMatch(/^SPOGOMI-ASSIST-[0-9a-f]{48}$/);
    expect(hashSpogomiIdentityAssistanceToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(migration).toContain("token_hash");
    expect(migration).not.toContain("token text");
  });

  it("keeps request creation idempotent and hashes private invitation proof", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ request_id: "request-1", request_status: "pending" }], error: null });
    const supabase = { rpc } as never;
    const token = generateSpogomiIdentityAssistanceToken();
    await expect(createSpogomiIdentityAssistanceRequest({
      supabase,
      eventId: "event-1",
      requesterClerkId: "user-1",
      providedContext: "Je peux confirmer ma présence auprès de l’organisation.",
      invitationToken: token,
    })).resolves.toMatchObject({ id: "request-1", status: "pending" });
    expect(rpc).toHaveBeenCalledWith("create_spogomi_identity_assistance_request", expect.objectContaining({
      p_event_id: "event-1",
      p_requester_clerk_id: "user-1",
      p_invitation_token_hash: hashSpogomiIdentityAssistanceToken(token),
    }));
  });

  it("does not link or issue a code while recording the organizer decision", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: {
      id: "request-1",
      event_id: "event-1",
      provided_context: "élément",
      status: "treated",
      matched_participant_id: "participant-1",
      verification_note: "Vérification hors bande documentée.",
      resolution_note: null,
      handled_at: "2026-10-15T10:00:00.000Z",
      created_at: "2026-10-15T09:00:00.000Z",
    }, error: null });
    const supabase = { rpc } as never;
    await expect(transitionSpogomiIdentityAssistanceRequest({
      supabase,
      requestId: "request-1",
      eventId: "event-1",
      targetStatus: "treated",
      actorKind: "organizer",
      actorClerkId: "organizer-1",
      matchedParticipantId: "participant-1",
      verificationNote: "Vérification hors bande documentée.",
    })).resolves.toMatchObject({ status: "treated", matchedParticipantId: "participant-1" });
    expect(rpc).not.toHaveBeenCalledWith("issue_spogomi_identity_link_code", expect.anything());
  });

  it("keeps the database contract scoped, auditable and resistant to private-event enumeration", () => {
    expect(migration).toContain("spogomi_identity_assistance_pending_unique");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("spogomi_identity_assistance_request_events");
    expect(migration).toContain("v_event.public_visibility <> 'published'");
    expect(migration).toContain("spogomi_identity_assistance_unavailable");
    expect(migration).toContain("registration_status = 'registered'");
    expect(migration).toContain("account_link_status <> 'verified'");
    expect(migration).toMatch(/revoke all on table public\.spogomi_identity_assistance_requests from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.transition_spogomi_identity_assistance_request[\s\S]*?to service_role/i);
    expect(migration).not.toMatch(/display_name|email|ticket/i);
  });
});
