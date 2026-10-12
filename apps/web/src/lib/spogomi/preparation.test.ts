import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
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

  it("splits groups into trios and repacks the remainder inside Casual bounds", () => {
    const result = buildDeterministicTeamFormation({
      mode: "casual",
      casualTeamSize: 2,
      casualTeamBounds: { minMembers: 2, maxMembers: 4 },
      participants: [
        { id: "a", sourceOrder: 1, groupPreference: "amis" },
        { id: "b", sourceOrder: 2, groupPreference: "amis" },
        { id: "c", sourceOrder: 3, groupPreference: "amis" },
        { id: "d", sourceOrder: 4, groupPreference: "amis" },
      ],
    });
    expect(result.teams.map((team) => team.participantIds)).toEqual([["a", "b", "c"]]);
    expect(result.unassignedParticipantIds).toEqual(["d"]);
  });

  it("previews CSV headers, unknown columns and duplicate rows without assuming email", async () => {
    const file = new File(["Nom;Groupe;Colonne libre\nAda Lovelace;A;oui\nAda Lovelace;A;non"], "roster.csv", { type: "text/csv" });
    const preview = await previewRosterFile(file);
    const retriedPreview = await previewRosterFile(file, preview.mapping);
    expect(preview.mapping).toMatchObject({ name: "Nom", group: "Groupe" });
    expect(preview.unknownHeaders).toEqual(["Colonne libre"]);
    expect(preview.probableDuplicateRowNumbers).toEqual([[2, 3]]);
    expect(retriedPreview.contentHash).toBe(preview.contentHash);
    expect(retriedPreview.importKey).toBe(preview.importKey);
  });

  it("keeps one anonymous place per synthetic ticket even when the buyer name is absent", async () => {
    const fixture = readFileSync(new URL("../../../../../documentation/features/spogomi-references/fixtures/cachan_2026_places_SYNTHETIQUES.csv", import.meta.url), "utf8");
    const preview = await previewRosterFile(new File([fixture], "cachan.csv", { type: "text/csv" }));
    expect(preview.sourceSystem).toBe("cachan_ticketing");
    expect(preview.rows).toHaveLength(37);
    expect(new Set(preview.rows.map((row) => row.externalReference)).size).toBe(37);
    expect(preview.rows.filter((row) => row.name === null)).toHaveLength(37);
    expect(preview.errors).toEqual([]);
    expect(preview.cancelledRowNumbers).toEqual([]);
  });

  it("proposes the versioned 37-place World Cup and Casual compositions without losing a place", async () => {
    const fixture = readFileSync(new URL("../../../../../documentation/features/spogomi-references/fixtures/cachan_2026_places_SYNTHETIQUES.csv", import.meta.url), "utf8");
    const preview = await previewRosterFile(new File([fixture], "cachan.csv", { type: "text/csv" }));
    const participants = preview.rows.map((row) => ({ id: row.externalReference as string, sourceOrder: row.rowNumber, groupPreference: row.groupPreference }));
    const worldCup = buildDeterministicTeamFormation({ mode: "world_cup", casualTeamSize: null, participants });
    const casual = buildDeterministicTeamFormation({ mode: "casual", casualTeamSize: 4, casualTeamBounds: { minMembers: 2, maxMembers: 4 }, participants });
    expect(worldCup.teams).toHaveLength(12);
    expect(worldCup.teams.every((team) => team.participantIds.length === 3)).toBe(true);
    expect(worldCup.unassignedParticipantIds).toHaveLength(1);
    expect(casual.teams.filter((team) => team.participantIds.length === 3)).toHaveLength(11);
    expect(casual.teams.filter((team) => team.participantIds.length === 4)).toHaveLength(1);
    expect(casual.unassignedParticipantIds).toEqual([]);
  });

  it("rejects a confirmation mapping that references an unknown or reused column", async () => {
    const file = new File(["Nom;Groupe\nAda Lovelace;A"], "roster.csv", { type: "text/csv" });
    await expect(previewRosterFile(file, { name: "Colonne absente" })).rejects.toThrow(/colonne absente/i);
    await expect(previewRosterFile(file, { name: "Nom", group: "Nom" })).rejects.toThrow(/deux fois/i);
  });

  it("signals ticket collisions and preserves cancellations without requiring an occupant name", async () => {
    const file = new File([
      "N. Billet;N. de commande;Statut du billet;Supprimé;Nom participant\n" +
      "TICKET-1;ORDER-1;Payé;Non;\n" +
      "TICKET-1;ORDER-1;Payé;Non;\n" +
      "TICKET-2;ORDER-1;Annulé;Oui;\n",
    ], "cachan.csv", { type: "text/csv" });
    const preview = await previewRosterFile(file);
    expect(preview.sourceSystem).toBe("cachan_ticketing");
    expect(preview.rows).toHaveLength(3);
    expect(preview.rows.map((row) => row.name)).toEqual([null, null, null]);
    expect(preview.cancelledRowNumbers).toEqual([4]);
    expect(preview.errors.filter((error) => error.code === "ticket_reference_collision")).toHaveLength(2);
  });

  it("maps the Weezevent Cachan ticket headers without using repeated buyer names", async () => {
    const file = new File([
      'Typologie;"Nom participant";"Prénom participant";"N. de commande";"N. de commande avancé";"N. Billet";"Nom Acheteur";"Statut du billet";Supprimé\n' +
      'SPOGOMI;Déclaré;Un;ORDER-1;ADV-1;TICKET-1;Acheteur répété;Payé;0\n' +
      'SPOGOMI;Déclaré;Deux;ORDER-1;ADV-1;TICKET-2;Acheteur répété;Payé;0\n',
    ], "weezevent-cachan.csv", { type: "text/csv" });
    const preview = await previewRosterFile(file);
    expect(preview.mapping).toMatchObject({
      ticketReference: "N. Billet",
      orderReference: "N. de commande",
      orderAlternativeReference: "N. de commande avancé",
      ticketStatus: "Statut du billet",
      ticketDeleted: "Supprimé",
    });
    expect(preview.rows.map((row) => row.externalReference)).toEqual(["TICKET-1", "TICKET-2"]);
    expect(preview.rows.map((row) => row.orderAlternativeReference)).toEqual(["ADV-1", "ADV-1"]);
    expect(preview.rows.every((row) => row.name === null)).toBe(true);
    expect(preview.probableDuplicateRowNumbers).toEqual([]);
    expect(preview.errors).toEqual([]);
  });

  it("rejects a MIME/extension mismatch before parsing", async () => {
    const file = new File(["Nom\nAda"], "roster.csv", { type: "application/pdf" });
    await expect(previewRosterFile(file)).rejects.toThrow(/MIME/i);
  });

  it("reads the first worksheet of a bounded XLSX file", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Nom", "Groupe"], ["Grace Hopper", "B"]]), "Roster");
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const preview = await previewRosterFile(new File([bytes], "roster.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    expect(preview.rows[0]).toMatchObject({ name: "Grace Hopper", groupPreference: "B" });
  });

  it("reads CSV, TSV, XLSX, XLS and ODS with the same stable ticket references", async () => {
    const rows = [["N. Billet", "N. de commande", "Statut du billet", "Supprimé"], ["00000000000000000001", "ORDER-1", "Payé", "0"], ["00000000000000000002", "ORDER-1", "Payé", "0"]];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Tickets");
    const inputs: Array<[string, BlobPart, string]> = [
      ["tickets.csv", rows.map((row) => row.join(";")).join("\r\n"), "text/csv"],
      ["tickets.tsv", rows.map((row) => row.join("\t")).join("\n"), "text/tab-separated-values"],
      ["tickets.xlsx", XLSX.write(workbook, { bookType: "xlsx", type: "array" }), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ["tickets.xls", XLSX.write(workbook, { bookType: "xls", type: "array" }), "application/vnd.ms-excel"],
      ["tickets.ods", XLSX.write(workbook, { bookType: "ods", type: "array" }), "application/vnd.oasis.opendocument.spreadsheet"],
    ];
    const previews = await Promise.all(inputs.map(([name, content, type]) => previewRosterFile(new File([content], name, { type }))));
    for (const preview of previews) {
      expect(preview.rows.map((row) => row.externalReference)).toEqual(["00000000000000000001", "00000000000000000002"]);
      expect(preview.errors).toEqual([]);
    }
    expect(new Set(previews.flatMap((preview) => preview.rows.map((row) => row.externalReference))).size).toBe(2);
  });

  it("detects preambles, multiline quoted cells, Windows-1252 and ambiguous mappings without guessing", async () => {
    const utf8 = "Rapport Weezevent\r\nExport du jour\r\nN. Billet;N. de commande;Statut du billet;Supprimé;Nom\r\nT-1;O-1;Payé;0;\"Déclaré\nà revoir\"\r\n";
    const preview = await previewRosterFile(new File([utf8], "tickets.csv", { type: "text/csv" }));
    expect(preview.headerRow).toBe(3);
    expect(preview.rows[0]?.externalReference).toBe("T-1");
    expect(preview.rows[0]?.name).toBe("Déclaré à revoir");
    expect(preview.encoding).toBe("utf-8");

    const cp1252 = new Uint8Array([...new TextEncoder().encode("Nom;Groupe\nAda;"), 0xE9, ...new TextEncoder().encode("quipe\n")]);
    const cp1252Preview = await previewRosterFile(new File([cp1252], "manual.csv", { type: "text/csv" }));
    expect(cp1252Preview.encoding).toBe("windows-1252");
    expect(cp1252Preview.rows[0]?.groupPreference).toBe("équipe");

    const ambiguous = await previewRosterFile(new File(["N. Billet;Ticket ID;Statut du billet;Supprimé\nT-1;T-1;Payé;0"], "ambiguous.csv", { type: "text/csv" }));
    expect(ambiguous.ambiguousFields).toContain("ticketReference");
    expect(ambiguous.requiresExplicitSelection).toBe(true);
    expect(ambiguous.errors.some((error) => error.code === "ambiguous_mapping")).toBe(true);
  });

  it("requires an explicit sheet when multiple workbook sheets are plausible and rejects formulas", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["N. Billet", "Statut du billet", "Supprimé"], ["T-1", "Payé", "0"]]), "Tickets");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["N. Billet", "Statut du billet", "Supprimé"], ["T-2", "Payé", "0"]]), "Copie");
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const preview = await previewRosterFile(new File([bytes], "multi.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    expect(preview.sheetCandidates).toHaveLength(2);
    expect(preview.requiresExplicitSelection).toBe(true);
    const selected = await previewRosterFile(new File([bytes], "multi.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), { sheetName: "Copie" });
    expect(selected.rows[0]?.externalReference).toBe("T-2");

    const formulaWorkbook = XLSX.utils.book_new();
    const formulaSheet = XLSX.utils.aoa_to_sheet([["Nom", "Groupe"], ["formule", "A"]]);
    formulaSheet.A2 = { t: "n", v: 1, f: "NOW()" };
    XLSX.utils.book_append_sheet(formulaWorkbook, formulaSheet, "Roster");
    const formulaBytes = XLSX.write(formulaWorkbook, { bookType: "xlsx", type: "array" });
    await expect(previewRosterFile(new File([formulaBytes], "formula.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))).rejects.toThrow(/formules|actif/i);
  });
});
