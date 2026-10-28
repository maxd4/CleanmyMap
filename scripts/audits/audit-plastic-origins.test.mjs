import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  SOURCE_COLUMNS,
  SOURCE_RESOURCES,
  auditSources,
  buildExport,
  normalizeSourceDate,
  parseCsv,
} from "./audit-plastic-origins.mjs";

const row = (overrides = {}) => ({
  campaign_id: "campaign-1",
  move: "walk",
  date: "2024-04-12 07:43:00.123",
  bank: "left",
  tracking_mode: "manual",
  trash_type: "Trash",
  lat: "48.8566",
  lon: "2.3522",
  municipality: "Paris",
  department: "PARIS",
  state: "ILE-DE-FRANCE",
  country: "France",
  river_name: "Seine",
  ...overrides,
});

function csv(headers, records, delimiter) {
  return [
    headers.join(delimiter),
    ...records.map((record) => headers.map((header) => record[header] ?? "").join(delimiter)),
    "",
  ].join("\n");
}

test("parses comma and semicolon resources without changing source values", () => {
  const parsed = parseCsv("campaign_id;river_name\ncampaign-1;L'Aa canalisée\n");

  assert.equal(parsed.delimiter, ";");
  assert.deepEqual(parsed.headers, ["campaign_id", "river_name"]);
  assert.equal(parsed.rows[0].river_name, "L'Aa canalisée");
});

test("normalizes documented source date formats without inventing a timezone", () => {
  assert.equal(normalizeSourceDate("2022-02-09 13:16:50.279"), "2022-02-09T13:16:50.279");
  assert.equal(normalizeSourceDate("12/04/2024 07:43"), "2024-04-12T07:43");
  assert.equal(normalizeSourceDate("not-a-date"), null);
});

test("audits coordinates, dates, missing values and exact duplicate grouping", () => {
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), "plastic-origins-audit-"));
  try {
    for (const resource of SOURCE_RESOURCES) {
      const delimiter = resource.year >= 2024 ? ";" : ",";
      const records = resource.year === 2022
        ? [row(), row()]
        : [row({ campaign_id: `campaign-${resource.year}`, date: `${resource.year}-01-01 10:00:00`, river_name: resource.year === 2023 ? "" : "Seine" })];
      fs.writeFileSync(
        path.join(sourceDir, resource.filename),
        csv(SOURCE_COLUMNS, records, delimiter),
        "utf8",
      );
    }

    const audit = auditSources({ sourceDir });
    const exportData = buildExport(audit, "2026-10-23T00:00:00.000Z");
    const source2022 = audit.files.find((file) => file.year === 2022);
    const grouped = exportData.observations.find((observation) => observation.properties.source.resourceId === "51440a7a-2d67-428c-aebd-70089abbe1ca");

    assert.deepEqual(audit.sourceErrors, []);
    assert.equal(audit.rows, 5);
    assert.equal(audit.normalizedObservations, 4);
    assert.equal(audit.exactDuplicateRows, 1);
    assert.equal(audit.crossResourceExactDuplicateGroups, 0);
    assert.equal(audit.missingByField.river_name, 1);
    assert.equal(audit.allCoordinatesInBounds, true);
    assert.equal(audit.allDatesParseable, true);
    assert.equal(source2022.exactDuplicateRows, 1);
    assert.match(source2022.sourceSha256, /^[0-9a-f]{64}$/i);
    assert.equal(source2022.sourceSha1, undefined);
    assert.deepEqual(grouped.properties.source.sourceRows, [2, 3]);
    assert.deepEqual(grouped.geometry.coordinates, [2.3522, 48.8566]);
    assert.deepEqual(
      new Set(exportData.observations.map((observation) => observation.properties.source.resourceId)).size,
      4,
    );
    assert.equal(exportData.source.coordinateReferenceSystem, null);
    assert.equal(exportData.quality.crossResourceExactDuplicateGroups, 0);
  } finally {
    fs.rmSync(sourceDir, { recursive: true, force: true });
  }
});
