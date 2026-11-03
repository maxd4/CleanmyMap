import { describe, expect, it } from "vitest";
import { parseSpogomiImportMapping, readSpogomiRosterImportForm } from "./import-route-schemas";

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

  it("keeps the shared roster form extraction transport-only", () => {
    const form = new FormData();
    form.set("file", new File(["name\nAlex"], "roster.csv"));
    form.set("mapping", JSON.stringify({ name: "Nom" }));
    form.set("divisionId", "division-1");
    form.set("sheetName", "Participants");
    form.set("headerRow", "3");
    form.set("acceptedRowNumbers", "[2,3]");
    form.set("allowIncompatibleMapping", "true");

    expect(readSpogomiRosterImportForm(form)).toMatchObject({
      file: expect.any(File),
      mappingResult: { ok: true, mapping: { name: "Nom" } },
      divisionId: "division-1",
      sheetName: "Participants",
      headerRow: "3",
      acceptedRowNumbers: "[2,3]",
      allowIncompatibleMapping: true,
    });
  });
});
