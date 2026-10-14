import { describe, expect, it } from "vitest";
import { parseSpogomiImportMapping } from "./import-route-schemas";

describe("SPOGOMI import route mapping", () => {
  it("accepts the strict JSON mapping and rejects malformed form values", () => {
    expect(parseSpogomiImportMapping(null)).toEqual({ ok: true, mapping: undefined });
    expect(parseSpogomiImportMapping(JSON.stringify({ name: "Nom", ticketStatus: "Statut" }))).toEqual({
      ok: true,
      mapping: { name: "Nom", ticketStatus: "Statut" },
    });
    expect(parseSpogomiImportMapping(JSON.stringify({ unexpected: "field" }))).toEqual({ ok: false });
    expect(parseSpogomiImportMapping("not-json")).toEqual({ ok: false });
    expect(parseSpogomiImportMapping(new File(["mapping"], "mapping.json"))).toEqual({ ok: false });
  });
});
