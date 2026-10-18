import { describe, expect, it } from "vitest";
import {
  buildInvitationUrl,
  createInvitationToken,
  hashInvitationToken,
  isInvitationTokenFormat,
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
});
