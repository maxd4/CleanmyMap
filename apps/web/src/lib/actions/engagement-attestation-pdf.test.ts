import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const EXPECTED_BYTE_LENGTH = 95_080;
const EXPECTED_SHA256 =
  "32511d11d75e5dfa5681d261bd717eee1bf0e21e6aa5d0e400ac6912d3224cd3";

const EXPECTED_FIELD_NAMES = [
  "organisme_nom",
  "organisme_adresse",
  "organisme_courriel",
  "organisme_telephone",
  "organisme_rna",
  "organisme_siren",
  "benevole_nom",
  "reference_cleanmymap",
  "periode_du",
  "periode_au",
  "frequence",
  "action_1_date",
  "action_1_intitule_lieu",
  "action_1_mission",
  "action_1_heures",
  "action_2_date",
  "action_2_intitule_lieu",
  "action_2_mission",
  "action_2_heures",
  "action_3_date",
  "action_3_intitule_lieu",
  "action_3_mission",
  "action_3_heures",
  "total_heures_verifiees",
  "activites_observees",
  "signataire_identite_fonction",
  "lieu_et_date_signature",
] as const;

function resolvePdfPath(): string {
  const candidates = [
    join(process.cwd(), "public", "documents", "modele-attestation-benevolat-v2.pdf"),
    join(
      process.cwd(),
      "apps",
      "web",
      "public",
      "documents",
      "modele-attestation-benevolat-v2.pdf",
    ),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("PDF modele-attestation-benevolat-v2.pdf introuvable.");
  }
  return found;
}

describe("modele-attestation-benevolat-v2.pdf asset integrity", () => {
  it("preserves exact attached bytes, 1 A4 page, AcroForm with 27 fillable text fields, and zero signature", () => {
    const pdfBytes = readFileSync(resolvePdfPath());
    expect(pdfBytes.byteLength).toBe(EXPECTED_BYTE_LENGTH);

    const sha256 = createHash("sha256").update(pdfBytes).digest("hex");
    expect(sha256).toBe(EXPECTED_SHA256);

    const latin1 = pdfBytes.toString("latin1");
    expect(latin1.startsWith("%PDF-")).toBe(true);

    const pageMatches = latin1.match(/\/Type\s*\/Page(?!s)\b/g) ?? [];
    expect(pageMatches).toHaveLength(1);

    const mediaBoxMatch = latin1.match(/\/MediaBox\s*\[\s*0\s+0\s+([0-9.]+)\s+([0-9.]+)\s*\]/);
    expect(mediaBoxMatch).not.toBeNull();
    expect(Number(mediaBoxMatch?.[1])).toBeCloseTo(595.28, 1);
    expect(Number(mediaBoxMatch?.[2])).toBeCloseTo(841.89, 1);

    expect(latin1).toContain("/AcroForm");
    const textFields = latin1.match(/\/FT\s*\/Tx\b/g) ?? [];
    expect(textFields).toHaveLength(27);

    const sigFields = latin1.match(/\/FT\s*\/Sig\b/g) ?? [];
    expect(sigFields).toHaveLength(0);

    const fieldNames = [...latin1.matchAll(/\/T\s*\(([^)]+)\)/g)].map((m) => m[1]);
    expect(fieldNames).toEqual([...EXPECTED_FIELD_NAMES]);

    // Printable (/F 4) and blank (no pre-filled /V value)
    const printFlags = latin1.match(/\/F\s+4\b/g) ?? [];
    expect(printFlags.length).toBeGreaterThanOrEqual(27);
    expect(latin1).not.toMatch(/\/V\s*\([^)]+\)/);
  });
});
