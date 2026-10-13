import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

describe("SPOGOMI gallery route authorization contract", () => {
  it("keeps gallery mutations behind authentication and organizer capability", () => {
    expect(source).toContain("requireAuthenticatedAccess");
    expect(source).toContain("loadAuthorizedSpogomiEvent");
    expect(source).toContain("if (\"response\" in authorized) return authorized.response");
    expect(source).toContain("export async function POST");
    expect(source).toContain("export async function DELETE");
  });

  it("requires explicit rights and subject-protection metadata in the server-owned contract", () => {
    expect(source).toContain("sourceUrl");
    expect(source).toContain("ownerName");
    expect(source).toContain("status: z.enum([\"draft\", \"published\"])");
    expect(source).toContain("rightsStatus");
    expect(source).toContain("approvedForPublication");
    expect(source).toContain("subjectProtectionReviewed");
    expect(source).toContain("minorProtectionReviewed");
    expect(source).toContain("photo.status !== \"published\"");
    expect(source).toContain("actorUserId: access.userId");
    expect(source).not.toContain("approvedAt: z.string");
  });
});
