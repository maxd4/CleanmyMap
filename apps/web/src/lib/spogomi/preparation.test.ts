import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";
import { buildDeterministicTeamFormation, previewRosterFile } from "./preparation";

describe("SPOGOMI preparation", () => {
  it("forms deterministic world cup teams of three and leaves an incomplete tail unassigned", () => {
    const result = buildDeterministicTeamFormation({
      mode: "world_cup",
      casualTeamSize: null,
      participants: [
        { id: "a", sourceOrder: 1, groupPreference: null },
        { id: "b", sourceOrder: 2, groupPreference: null },
        { id: "c", sourceOrder: 3, groupPreference: null },
        { id: "d", sourceOrder: 4, groupPreference: null },
      ],
    });
    expect(result.teams[0]?.participantIds).toEqual(["a", "b", "c"]);
    expect(result.unassignedParticipantIds).toEqual(["d"]);
    expect(result.reasons.d).toBe("incomplete_team");
  });

  it("does not split a group that cannot fit a team", () => {
    const result = buildDeterministicTeamFormation({
      mode: "casual",
      casualTeamSize: 3,
      participants: [
        { id: "a", sourceOrder: 1, groupPreference: "amis" },
        { id: "b", sourceOrder: 2, groupPreference: "amis" },
        { id: "c", sourceOrder: 3, groupPreference: "amis" },
        { id: "d", sourceOrder: 4, groupPreference: "amis" },
      ],
    });
    expect(result.teams).toHaveLength(0);
    expect(result.unassignedParticipantIds).toEqual(["a", "b", "c", "d"]);
    expect(Object.values(result.reasons)).toEqual([
      "group_exceeds_team_size",
      "group_exceeds_team_size",
      "group_exceeds_team_size",
      "group_exceeds_team_size",
    ]);
  });

  it("previews CSV headers, unknown columns and duplicate rows without assuming email", async () => {
    const file = new File(["Nom;Groupe;Colonne libre\nAda Lovelace;A;oui\nAda Lovelace;A;non"], "roster.csv", { type: "text/csv" });
    const preview = await previewRosterFile(file);
    expect(preview.mapping).toMatchObject({ name: "Nom", group: "Groupe" });
    expect(preview.unknownHeaders).toEqual(["Colonne libre"]);
    expect(preview.probableDuplicateRowNumbers).toEqual([[2, 3]]);
  });

  it("rejects a MIME/extension mismatch before parsing", async () => {
    const file = new File(["Nom\nAda"], "roster.csv", { type: "application/pdf" });
    await expect(previewRosterFile(file)).rejects.toThrow(/MIME/i);
  });

  it("reads the first worksheet of a bounded XLSX file", async () => {
    const workbook = "<workbook xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"Roster\" r:id=\"rId1\"/></sheets></workbook>";
    const relations = "<Relationships><Relationship Id=\"rId1\" Target=\"worksheets/sheet1.xml\"/></Relationships>";
    const sheet = "<worksheet><sheetData><row><c r=\"A1\" t=\"inlineStr\"><is><t>Nom</t></is></c><c r=\"B1\" t=\"inlineStr\"><is><t>Groupe</t></is></c></row><row><c r=\"A2\" t=\"inlineStr\"><is><t>Grace Hopper</t></is></c><c r=\"B2\" t=\"inlineStr\"><is><t>B</t></is></c></row></sheetData></worksheet>";
    const bytes = zipSync({ "xl/workbook.xml": new TextEncoder().encode(workbook), "xl/_rels/workbook.xml.rels": new TextEncoder().encode(relations), "xl/worksheets/sheet1.xml": new TextEncoder().encode(sheet) });
    const safeBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(safeBuffer).set(bytes);
    const preview = await previewRosterFile(new File([safeBuffer], "roster.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    expect(preview.rows[0]).toMatchObject({ name: "Grace Hopper", groupPreference: "B" });
  });
});
