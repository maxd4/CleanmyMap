import assert from "node:assert/strict";
import crypto from "node:crypto";
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
    let source2022Content = "";
    for (const resource of SOURCE_RESOURCES) {
      const delimiter = resource.year >= 2024 ? ";" : ",";
      const records = resource.year === 2022
        ? [row(), row()]
        : [row({ campaign_id: `campaign-${resource.year}`, date: `${resource.year}-01-01 10:00:00`, river_name: resource.year === 2023 ? "" : "Seine" })];
      const content = csv(SOURCE_COLUMNS, records, delimiter);
      if (resource.year === 2022) source2022Content = content;
      fs.writeFileSync(
        path.join(sourceDir, resource.filename),
        content,
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
    const expectedSourceSha256 = crypto.createHash("sha256").update(source2022Content, "utf8").digest("hex");
    assert.equal(source2022.sourceSha256, expectedSourceSha256);
    assert.equal(source2022.sourceSha1, undefined);

    const repeatedAudit = auditSources({ sourceDir });
    assert.equal(repeatedAudit.files.find((file) => file.year === 2022).sourceSha256, expectedSourceSha256);

    fs.writeFileSync(
      path.join(sourceDir, "2022.csv"),
      source2022Content.replace("Seine", "Loire"),
      "utf8",
    );
    const changedAudit = auditSources({ sourceDir });
    assert.notEqual(
      changedAudit.files.find((file) => file.year === 2022).sourceSha256,
      expectedSourceSha256,
    );

    const historicalSourceSha1 = "e8b9e2e2de1cd470266386881db340f9e153d1fb";
    const historicalExport = buildExport({
      ...audit,
      files: audit.files.map((file) => file.year === 2022
        ? { ...file, sourceSha1: historicalSourceSha1 }
        : file),
    }, "2026-10-23T00:00:00.000Z");
    assert.equal(
      historicalExport.sourceResources.find((resource) => resource.year === 2022).sourceSha1,
      historicalSourceSha1,
    );
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
