import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./spogomi-team-access-links.tsx", import.meta.url), "utf8");

describe("team access link navigation contract", () => {
  it("opens only the temporary URL returned by the protected API", () => {
    expect(source).toContain("body.accessUrl");
    expect(source).toContain('href={link.url}');
    expect(source).toContain('prefetch={false}');
    expect(source).toContain("Ouvrir la saisie équipe");
  });

  it("keeps the revocation action alongside the open action", () => {
    expect(source).toContain('method: "DELETE"');
    expect(source).toContain("Révoquer");
  });
});
