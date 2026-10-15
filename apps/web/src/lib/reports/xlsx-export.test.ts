import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { buildXlsxWorkbook, safeXlsxFilename } from "./xlsx-export";

describe("SPOGOMI XLSX export", () => {
  it("builds a real workbook and protects formula-like text", () => {
    const bytes = buildXlsxWorkbook([
      { name: "Synthèse", rows: [["Champ", "Valeur"], ["Nom", "=HYPERLINK(\"https://evil.test\")"]] },
      { name: "Équipes", rows: [["Équipe", "Rang"], ["Alpha", 1]] },
      { name: "Catégories", rows: [["Code"], ["butts"]] },
      { name: "Traçabilité", rows: [["Source"], ["rules-v1"]] },
    ]);
    const files = unzipSync(bytes);
    expect(strFromU8(files["xl/workbook.xml"])).toContain("Synthèse");
    expect(strFromU8(files["xl/worksheets/sheet1.xml"])).toContain("&apos;=HYPERLINK");
    expect(Object.keys(files).filter((name) => name.startsWith("xl/worksheets/sheet")).length).toBe(4);
  });

  it("creates a deterministic safe filename", () => {
    expect(safeXlsxFilename("SPOGOMI — Paris 2026")).toBe("SPOGOMI-Paris-2026.xlsx");
  });

  it("strips border separators before applying the length limit", () => {
    expect(safeXlsxFilename(`${"-".repeat(100)}Rapport${"-".repeat(100)}`)).toBe(
      "Rapport.xlsx",
    );
    expect(safeXlsxFilename(`${"-".repeat(100)}${"a".repeat(100)}`)).toBe(
      `${"a".repeat(80)}.xlsx`,
    );
  });
});
