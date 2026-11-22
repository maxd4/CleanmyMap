import { describe, expect, it } from "vitest";
import { parseExplicitlyMappedPersonalAiCsv } from "./ai-personal-csv";

const mapping = {
  delimiter: ";" as const, unit: "tokens" as const, sourceVersion: "user-column-map-v1",
  startUtcColumn: "start", endUtcColumn: "end", modelColumn: "model", inputColumn: "input", outputColumn: "output",
};

describe("mapped personal AI CSV import", () => {
  it("handles BOM, quoted delimiter text and explicit token units", async () => {
    const result = await parseExplicitlyMappedPersonalAiCsv('\uFEFFstart;end;model;input;output\n"2026-11-01T00:00:00Z";"2026-11-02T00:00:00Z";"model v2";100;50', mapping);
    expect(result.rows[0].declaration.tokens.logicalTotal).toBe(150);
    expect(result.rows[0].declaration.modelRaw).toBe("model v2");
  });

  it("stores cost-only rows without inventing tokens or a period", async () => {
    const result = await parseExplicitlyMappedPersonalAiCsv("cost;currency\n34,20;EUR", {
      delimiter: ";", unit: "tokens", sourceVersion: "invoice-map-v1", costColumn: "cost", currencyColumn: "currency",
    });
    expect(result.rows[0].costAmount).toBe(34.2);
    expect(result.rows[0].costCurrency).toBe("EUR");
    expect(result.rows[0].declaration.tokens.logicalTotal).toBeNull();
    expect(result.rows[0].declaration.periodStartUtc).toBeNull();
  });

  it("uses explicit CSV identity columns instead of period, model, cost, or counter equality", async () => {
    const csvMapping = { ...mapping, startUtcColumn: "start", endUtcColumn: "end", modelColumn: "model", costColumn: "cost", currencyColumn: "currency", identityColumns: ["event_id"] };
    const firstText = "event_id;start;end;model;input;output;cost;currency\nrequest-1;2026-11-01T00:00:00Z;2026-11-02T00:00:00Z;model-x;10;2;1.00;EUR";
    const secondText = firstText.replace("request-1", "request-2");
    const first = (await parseExplicitlyMappedPersonalAiCsv(firstText, csvMapping)).rows[0];
    const second = (await parseExplicitlyMappedPersonalAiCsv(secondText, csvMapping)).rows[0];
    const retry = (await parseExplicitlyMappedPersonalAiCsv(firstText, csvMapping)).rows[0];
    expect(first.sourceIdentityHash).not.toBe(second.sourceIdentityHash);
    expect(first.sourceIdentityHash).toBe(retry.sourceIdentityHash);
    expect(first.normalizedContentHash).toBe(retry.normalizedContentHash);
    expect(JSON.stringify(first)).not.toContain("request-1");
  });

  it("leaves CSV rows without an explicitly selected stable identity incomplete", async () => {
    const result = await parseExplicitlyMappedPersonalAiCsv("model;input\nmodel-x;10", { delimiter: ";", unit: "tokens", sourceVersion: "mapped-v1", modelColumn: "model", inputColumn: "input" });
    expect(result.rows[0].sourceIdentityHash).toBeNull();
    expect(result.rows[0].sourceScope).toBeNull();
  });

  it("rejects malformed rows individually and reports accepted/rejected counts", async () => {
    const result = await parseExplicitlyMappedPersonalAiCsv("start;end;input;output\n2026-11-01T00:00:00Z;2026-11-02T00:00:00Z;10;5\n2026-11-01T00:00:00Z;2026-11-02T00:00:00Z;formula;5", {
      ...mapping, modelColumn: undefined,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rejectedCount).toBe(1);
    expect(result.warnings[0]).toContain("Ligne 3 rejetée");
  });

  it("rejects formulas, malformed quoting, unknown units, missing columns and invalid periods", async () => {
    const formula = await parseExplicitlyMappedPersonalAiCsv("start;end;input;output\n=2;2026-11-02T00:00:00Z;1;1", { ...mapping, modelColumn: undefined });
    expect(formula.rejectedCount).toBe(1);
    await expect(parseExplicitlyMappedPersonalAiCsv('start;end;input;output\n"unclosed;2026-11-02T00:00:00Z;1;1', { ...mapping, modelColumn: undefined })).rejects.toThrow();
    await expect(parseExplicitlyMappedPersonalAiCsv("input;output\n1;2", { delimiter: ";", unit: "bytes" as "tokens", sourceVersion: "x", inputColumn: "input", outputColumn: "output" })).rejects.toThrow(/unité/);
    await expect(parseExplicitlyMappedPersonalAiCsv("start;end;input;output\n2026-11-01T00:00:00Z;2026-11-02T00:00:00Z;1;1", { ...mapping, modelColumn: "missing" })).rejects.toThrow(/colonne mappée absente/);
    const invalidPeriod = await parseExplicitlyMappedPersonalAiCsv("start;end;input;output\nnot-a-date;2026-11-02T00:00:00Z;1;1", { ...mapping, modelColumn: undefined });
    expect(invalidPeriod.rows).toHaveLength(0);
    expect(invalidPeriod.rejectedCount).toBe(1);
  });
});
