import { beforeEach, describe, expect, it, vi } from "vitest";

const workbookRowsMock = vi.hoisted(() => vi.fn());
const callFieldOperationMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("./preparation-import-workbook", () => ({
  normalizeValue: (value: unknown) => String(value ?? "").trim(),
  workbookRows: workbookRowsMock,
}));
vi.mock("./field-operations-service", () => ({ callSpogomiFieldOperation: callFieldOperationMock }));

import {
  confirmSpogomiMeasurementImport,
  previewSpogomiMeasurementWorkbook,
} from "./field-measurement-import";

type Result = { data: unknown; error: { code?: string; message?: string } | null; count?: number | null };

type FixtureOptions = {
  tables?: Record<string, unknown>;
  maybeSingles?: Record<string, unknown>;
  singleResults?: Record<string, Array<Result>>;
  awaitResults?: Record<string, Result>;
};

function supabaseFor(options: FixtureOptions = {}) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const tables = options.tables ?? {};
  const maybeSingles = options.maybeSingles ?? {};
  const singleResults = new Map(Object.entries(options.singleResults ?? {}).map(([table, results]) => [table, [...results]]));
  const awaitResults = options.awaitResults ?? {};
  const from = vi.fn((table: string) => {
    const query: Record<string, unknown> = {};
    const chain = (method: string) => (...args: unknown[]) => {
      calls.push({ table, method, args });
      return query;
    };
    for (const method of ["select", "eq", "in", "order", "update", "upsert", "insert"]) query[method] = chain(method);
    query.maybeSingle = vi.fn(async () => ({ data: maybeSingles[table] ?? null, error: null }));
    query.single = vi.fn(async () => {
      const queued = singleResults.get(table);
      if (queued?.length) return queued.shift();
      return { data: Array.isArray(tables[table]) ? tables[table][0] ?? null : tables[table] ?? null, error: null };
    });
    query.then = (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(awaitResults[table] ?? { data: tables[table] ?? [], error: null, count: Array.isArray(tables[table]) ? tables[table].length : null }).then(resolve, reject);
    return query;
  });
  return { supabase: { from, rpc: vi.fn() } as never, from, calls };
}

function file(name = "measurements.csv", body = "fixture") {
  return new File([body], name, { type: "text/csv" });
}

function workbook(sheetName = "Mesures") {
  return {
    sheets: [{
      name: sheetName,
      rows: [
        ["Équipe", "Catégorie", "Valeur", "Type", "Unité", "Méthode", "Provenance"],
        ["7", "plastic", "12,5", "mass", "g", "balance", "photo-1"],
        ["99", "unknown", "bad", "mass", "g", "balance", "photo-2"],
      ],
    }],
  };
}

describe("SPOGOMI measurement workbook import", () => {
  beforeEach(() => {
    workbookRowsMock.mockReset();
    callFieldOperationMock.mockReset();
  });

  it.each([
    ["empty", new File([], "measurements.csv"), /taille absente/],
    ["unsupported extension", file("measurements.pdf"), /Format refusé/],
  ])("rejects %s files before touching the database", async (_label, input, expected) => {
    workbookRowsMock.mockReset();
    const fixture = supabaseFor();
    await expect(previewSpogomiMeasurementWorkbook({ supabase: fixture.supabase, eventId: "event-1", divisionId: "casual", file: input, actorClerkId: "organizer" })).rejects.toThrow(expected);
    expect(fixture.from).not.toHaveBeenCalled();
  });

  it("rejects a missing sheet or mandatory headers before reserving an import", async () => {
    const fixture = supabaseFor();
    workbookRowsMock.mockReturnValueOnce({ sheets: [] });
    await expect(previewSpogomiMeasurementWorkbook({ supabase: fixture.supabase, eventId: "event-1", divisionId: "casual", file: file(), sheetName: "missing", actorClerkId: "organizer" })).rejects.toThrow("feuille demandée");
    workbookRowsMock.mockReturnValueOnce({ sheets: [{ name: "Mesures", rows: [["team", "category"]] }] });
    await expect(previewSpogomiMeasurementWorkbook({ supabase: fixture.supabase, eventId: "event-1", divisionId: "casual", file: file(), actorClerkId: "organizer" })).rejects.toThrow("équipe, catégorie et valeur");
  });

  it.each(["csv", "tsv", "xlsx", "xls", "ods"])("accepts the controlled %s format and an explicitly selected sheet", async (extension) => {
    const sheets = [
      { name: "Autre feuille", rows: [["team", "category", "value"], ["8", "plastic", "2"]] },
      { name: "Mesures terrain", rows: [["Équipe", "Catégorie", "Valeur"], ["7", "plastic", "3"]] },
    ];
    workbookRowsMock.mockReturnValue({ sheets });
    const fixture = supabaseFor({
      tables: { spogomi_teams: [{ id: "team-7", team_number: 7 }], spogomi_category_rules: [{ id: "category-plastic", code: "plastic", measurement_kind: "mass", unit: "g" }] },
      maybeSingles: { spogomi_measurement_imports: null },
      singleResults: { spogomi_measurement_imports: [{ data: { id: `import-${extension}` }, error: null }] },
    });
    const result = await previewSpogomiMeasurementWorkbook({
      supabase: fixture.supabase, eventId: "event-1", divisionId: "casual",
      file: file(`measurements.${extension}`), sheetName: "Mesures terrain", actorClerkId: "organizer",
    }) as { format: string; sheetName: string; rows: Array<Record<string, unknown>> };
    expect(result).toMatchObject({ format: extension, sheetName: "Mesures terrain" });
    expect(result.rows[0]).toMatchObject({ teamId: "team-7", categoryRuleId: "category-plastic", massGrams: 3, selected: true });
  });

  it("rejects a file over the limit and dangerous or blank values without reserving a confirmed measurement", async () => {
    const fixture = supabaseFor();
    await expect(previewSpogomiMeasurementWorkbook({
      supabase: fixture.supabase, eventId: "event-1", divisionId: "casual",
      file: new File([new Uint8Array(5 * 1024 * 1024 + 1)], "too-large.csv"), actorClerkId: "organizer",
    })).rejects.toThrow("supérieure à 5 Mo");
    expect(fixture.from).not.toHaveBeenCalled();

    workbookRowsMock.mockReturnValue({ sheets: [{ name: "Mesures", rows: [
      ["team", "category", "value", "type", "unit"],
      ["7", "plastic", "=1+1", "mass", "g"],
      ["7", "plastic", "", "mass", "g"],
    ] }] });
    const validFixture = supabaseFor({
      tables: { spogomi_teams: [{ id: "team-7", team_number: 7 }], spogomi_category_rules: [{ id: "category-plastic", code: "plastic", measurement_kind: "mass", unit: "g" }] },
      maybeSingles: { spogomi_measurement_imports: null },
      singleResults: { spogomi_measurement_imports: [{ data: { id: "import-dangerous" }, error: null }] },
    });
    const result = await previewSpogomiMeasurementWorkbook({ supabase: validFixture.supabase, eventId: "event-1", divisionId: "casual", file: file(), actorClerkId: "organizer" }) as { rows: Array<Record<string, unknown>> };
    expect(result.rows.every((row) => row.selected === false)).toBe(true);
    expect(result.rows.flatMap((row) => row.diagnostics as string[])).toEqual(expect.arrayContaining(["Valeur numérique absente ou invalide."]));
  });

  it("keeps valid rows selected and exposes invalid rows with actionable diagnostics", async () => {
    workbookRowsMock.mockReturnValue(workbook());
    const fixture = supabaseFor({
      tables: {
        spogomi_teams: [{ id: "team-7", team_number: 7, public_name: "Seven" }],
        spogomi_category_rules: [{ id: "category-plastic", code: "plastic", measurement_kind: "mass", unit: "g" }],
        spogomi_measurement_import_rows: [],
      },
      maybeSingles: { spogomi_measurement_imports: null },
      singleResults: { spogomi_measurement_imports: [{ data: { id: "import-1" }, error: null }] },
    });

    const result = await previewSpogomiMeasurementWorkbook({ supabase: fixture.supabase, eventId: "event-1", divisionId: "casual", file: file(), actorClerkId: "organizer" }) as { importId: string; fileName: string; format: string; sheetName: string; alreadyConfirmed: boolean; rows: Array<Record<string, unknown>> };
    expect(result).toMatchObject({ importId: "import-1", fileName: "measurements.csv", format: "csv", sheetName: "Mesures", alreadyConfirmed: false });
    expect(result.rows[0]).toMatchObject({ rowNumber: 2, teamId: "team-7", categoryRuleId: "category-plastic", massGrams: 12.5, selected: true });
    expect(result.rows[1]).toMatchObject({ rowNumber: 3, selected: false, teamId: null, categoryRuleId: null });
    expect(result.rows[1].diagnostics).toEqual(expect.arrayContaining(["Équipe introuvable dans cette division.", "Catégorie introuvable dans ce règlement.", "Valeur numérique absente ou invalide."]));
    expect(fixture.calls.some((call) => call.table === "spogomi_measurement_import_rows" && call.method === "upsert")).toBe(true);
  });

  it("reuses a raced import reservation and marks a confirmed import in the preview", async () => {
    workbookRowsMock.mockReturnValue({ sheets: [{ name: "Mesures", rows: [["team", "category", "value"], ["7", "plastic", "1"]] }] });
    const fixture = supabaseFor({
      tables: {
        spogomi_teams: [{ id: "team-7", team_number: 7 }],
        spogomi_category_rules: [{ id: "category-plastic", code: "plastic", measurement_kind: "mass", unit: "g" }],
      },
      maybeSingles: { spogomi_measurement_imports: null },
      singleResults: {
        spogomi_measurement_imports: [
          { data: null, error: { code: "23505", message: "duplicate import" } },
          { data: { id: "import-confirmed" }, error: null },
        ],
      },
    });
    const result = await previewSpogomiMeasurementWorkbook({ supabase: fixture.supabase, eventId: "event-1", divisionId: "casual", file: file("measures.xlsx"), actorClerkId: "organizer" }) as { importId: string; alreadyConfirmed: boolean };
    expect(result.importId).toBe("import-confirmed");
    expect(result.alreadyConfirmed).toBe(false);
  });

  it("confirms only admissible selected rows, calls the operational RPC and is idempotent after confirmation", async () => {
    callFieldOperationMock.mockResolvedValue({ id: "measurement-1" });
    const rows = [
      { row_number: 2, team_id: "team-1", category_rule_id: "category-1", measurement_kind: "mass", unit: "g", quantity: null, mass_grams: 10, object_count: null, measurement_method: "balance", provenance: "photo", selected: true },
      { row_number: 3, team_id: "team-2", category_rule_id: "category-2", measurement_kind: "count", unit: "piece", quantity: null, mass_grams: null, object_count: 4, measurement_method: null, provenance: null, selected: true },
    ];
    const fixture = supabaseFor({
      tables: { spogomi_measurement_import_rows: rows },
      maybeSingles: { spogomi_measurement_imports: { id: "import-1", status: "previewed", content_sha256: "hash" } },
      awaitResults: { spogomi_measurement_import_rows: { data: rows, error: null } },
      singleResults: { spogomi_measurement_imports: [{ data: { id: "import-1" }, error: null }] },
    });
    const result = await confirmSpogomiMeasurementImport({ supabase: fixture.supabase, eventId: "event-1", divisionId: "casual", importId: "import-1", selectedRowNumbers: [2], actorClerkId: "operator" });
    expect(result).toEqual({ imported: 2, alreadyConfirmed: false });
    expect(callFieldOperationMock).toHaveBeenCalledTimes(2);
    expect(callFieldOperationMock).toHaveBeenCalledWith(expect.objectContaining({ rpc: "spogomi_upsert_operational_measurement", args: expect.objectContaining({ p_source_reference: "import:import-1:row:2" }) }));
    expect(callFieldOperationMock).toHaveBeenCalledWith(expect.objectContaining({ args: expect.objectContaining({ p_source_kind: "import_excel", p_actor_clerk_id: "operator" }) }));
    expect(fixture.calls.some((call) => call.table === "spogomi_measurement_imports" && call.method === "update")).toBe(true);

    const confirmed = supabaseFor({ maybeSingles: { spogomi_measurement_imports: { id: "import-1", status: "confirmed", content_sha256: "hash" } } });
    await expect(confirmSpogomiMeasurementImport({ supabase: confirmed.supabase, eventId: "event-1", divisionId: "casual", importId: "import-1", actorClerkId: "operator" })).resolves.toEqual({ imported: 0, alreadyConfirmed: true });
  });

  it("does not mark an import confirmed when a measurement command fails", async () => {
    callFieldOperationMock.mockRejectedValueOnce(new Error("measurement conflict"));
    const fixture = supabaseFor({
      tables: { spogomi_measurement_import_rows: [{ row_number: 2, team_id: "team-1", category_rule_id: "category-1", measurement_kind: "mass", unit: "g", quantity: null, mass_grams: 10, object_count: null, selected: true }] },
      maybeSingles: { spogomi_measurement_imports: { id: "import-1", status: "previewed", content_sha256: "hash" } },
      awaitResults: { spogomi_measurement_import_rows: { data: [{ row_number: 2, team_id: "team-1", category_rule_id: "category-1", measurement_kind: "mass", unit: "g", quantity: null, mass_grams: 10, object_count: null, selected: true }], error: null } },
    });
    await expect(confirmSpogomiMeasurementImport({ supabase: fixture.supabase, eventId: "event-1", divisionId: "casual", importId: "import-1", actorClerkId: "operator" })).rejects.toThrow("measurement conflict");
    expect(fixture.calls.some((call) => call.table === "spogomi_measurement_imports" && call.method === "update")).toBe(false);
  });

  it("rejects absent, unpaired and non-admissible confirmation rows", async () => {
    const base = { maybeSingles: { spogomi_measurement_imports: null } };
    await expect(confirmSpogomiMeasurementImport({ supabase: supabaseFor(base).supabase, eventId: "e", divisionId: "d", importId: "missing", actorClerkId: "a" })).rejects.toThrow("introuvable");

    const noRows = supabaseFor({ maybeSingles: { spogomi_measurement_imports: { id: "i", status: "previewed", content_sha256: "h" } }, awaitResults: { spogomi_measurement_import_rows: { data: [], error: null } } });
    await expect(confirmSpogomiMeasurementImport({ supabase: noRows.supabase, eventId: "e", divisionId: "d", importId: "i", actorClerkId: "a" })).rejects.toThrow("Aucune ligne admissible");

    const unpaired = supabaseFor({ maybeSingles: { spogomi_measurement_imports: { id: "i", status: "previewed", content_sha256: "h" } }, awaitResults: { spogomi_measurement_import_rows: { data: [{ row_number: 2, selected: true, team_id: null, category_rule_id: "c", measurement_kind: "mass", unit: "g" }], error: null } } });
    await expect(confirmSpogomiMeasurementImport({ supabase: unpaired.supabase, eventId: "e", divisionId: "d", importId: "i", actorClerkId: "a" })).rejects.toThrow("n’est pas rapprochée");
  });
});
