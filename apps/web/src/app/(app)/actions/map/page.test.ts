import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("actions map public semantics", () => {
  it("does not label the map as real-time data", () => {
    expect(source).not.toContain("Données en temps réel");
    expect(source).toContain("pollution projetée");
    expect(source).toContain("ne constituent pas une mesure actuelle du terrain");
  });

  it("keeps the public feed approved-only without exposing a status control", () => {
    expect(source).toContain('statusFilter: "approved"');
    expect(source).not.toContain("setStatusFilter");
    expect(source).not.toContain("handleStatusChange");
    expect(source).not.toContain("onStatusChange");
  });
});
