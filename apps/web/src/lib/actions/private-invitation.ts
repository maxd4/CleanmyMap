import { createHash, randomBytes } from "node:crypto";

export const INVITATION_TOKEN_BYTES = 32;
export const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createInvitationToken(): string {
  return randomBytes(INVITATION_TOKEN_BYTES).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isInvitationTokenFormat(token: string): boolean {
  return INVITATION_TOKEN_PATTERN.test(token);
}

export function buildInvitationUrl(request: Request, token: string): string {
  return new URL(`/actions/invite/${token}`, request.url).toString();
}
