import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync(new URL("./result-service.ts", import.meta.url), "utf8");
const access = readFileSync(new URL("./team-access.ts", import.meta.url), "utf8");

describe("SPOGOMI result services STATIC_CONTRACT", () => {
  it("scopes form reads and writes from the server-held session rather than a client team id", () => {
    expect(service).toContain("loadSpogomiTeamSession");
    expect(service).toContain('rpc("spogomi_save_team_submission"');
    expect(service).toContain('p_team_id: session.teamId');
    expect(service).toContain("p_idempotency_key");
    expect(service).toContain("p_replaces_submission_id");
  });

  it("routes certification through an organizer/referee review boundary", () => {
    expect(service).toContain('rpc("spogomi_review_team_submission"');
    expect(service).toContain('rpc("spogomi_set_event_access"');
    expect(service).toContain("assignSpogomiObserver");
    expect(service).toContain("revokeSpogomiObserver");
    expect(service).toContain("resolveSpogomiReviewerRole");
    expect(service).toContain("SPOGOMI self-certification is forbidden");
    expect(service).toContain("reviewerClerkId");
    expect(service).toContain("actorKind");
    expect(service).toContain("Conflict: la décision");
  });

  it("hashes opaque access values and never stores the raw token", () => {
    expect(access).toContain('createHash("sha256")');
    expect(access).toContain('randomBytes(32).toString("base64url")');
    expect(access).toContain("token_hash: sha256(token)");
    expect(access).toContain("session_hash: sha256(sessionToken)");
    expect(access).not.toContain("token: token");
  });

  it("reads review sources exhaustively instead of relying on the default response limit", () => {
    expect(service).toContain("readAllSpogomiPages");
    expect(service).toContain('.range(from, to)');
    expect(service).toContain('"review participants"');
    expect(service).toContain('"review result items"');
    expect(service).toContain("registration_status === \"registered\"");
  });
});
