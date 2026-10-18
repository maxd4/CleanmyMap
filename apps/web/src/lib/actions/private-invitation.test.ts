import { describe, expect, it } from "vitest";
import {
  buildInvitationUrl,
  createInvitationToken,
  hashInvitationToken,
  isInvitationExpired,
  isInvitationTokenFormat,
  resolvePrivateInvitationActionState,
} from "./private-invitation";

describe("private action invitation tokens", () => {
  it("uses unpredictable URL-safe tokens and stores only a fixed hash", () => {
    const first = createInvitationToken();
    const second = createInvitationToken();

    expect(first).not.toBe(second);
    expect(isInvitationTokenFormat(first)).toBe(true);
    expect(hashInvitationToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashInvitationToken(first)).not.toContain(first);
    expect(hashInvitationToken(first)).not.toBe(hashInvitationToken(second));
  });

  it("builds a non-indexable invitation route without exposing the hash", () => {
    const token = createInvitationToken();
    const url = buildInvitationUrl(new Request("https://cleanmymap.example/api/actions/1/invite-link"), token);

    expect(url).toBe(`https://cleanmymap.example/actions/invite/${token}`);
    expect(url).not.toContain(hashInvitationToken(token));
  });

  it("uses the action clock to distinguish pre-action, awaiting-finalization and post-action claims", () => {
    const now = new Date("2026-10-18T10:00:00.000Z");
    const base = { access_mode: "invite_link" as const, status: "pending" as const, moderation_visibility: "visible" as const, action_date: "2026-10-20", event_start_time: "09:00:00", action_phase: "pre_action" as const };
    expect(resolvePrivateInvitationActionState(base, now)).toBe("pre_action");
    expect(resolvePrivateInvitationActionState({ ...base, action_date: "2026-10-01" }, now)).toBe("awaiting_finalization");
    expect(resolvePrivateInvitationActionState({ ...base, action_phase: "post_action_complete", status: "approved", published_at: "2026-10-10T10:00:00Z", action_date: "2026-10-01" }, now)).toBe("post_action_claim");
    expect(resolvePrivateInvitationActionState({ ...base, access_mode: "public" }, now)).toBe("closed");
  });

  it("treats the expiry instant as expired and keeps the three-month boundary server-readable", () => {
    const expiresAt = "2027-01-18T10:00:00.000Z";
    expect(isInvitationExpired(expiresAt, new Date("2027-01-18T09:59:59.999Z"))).toBe(false);
    expect(isInvitationExpired(expiresAt, new Date(expiresAt))).toBe(true);
  });
});
