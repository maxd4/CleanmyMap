import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { enrichAndPublishMutationReport } from "./check-mutation.mjs";

function createReportFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-mutation-"));
  const reportPath = path.join(directory, "stryker-report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ summary: { score: 91 } }), "utf8");
  return { directory, reportPath };
}

test("publishes a complete enriched mutation report without partial JSON", () => {
  const fixture = createReportFixture();
  try {
    const provenance = {
      sourceSha: "a".repeat(40),
      candidateSha: "a".repeat(40),
      candidateScope: "WORKTREE",
      provenance: "WORKTREE_LIVE_NOT_ATTRIBUTABLE",
      generatedAt: "2026-10-29T00:00:00.000Z",
    };

    const enriched = enrichAndPublishMutationReport(
      fixture.reportPath,
      () => provenance,
    );

    assert.deepEqual(enriched.provenance, provenance.provenance);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(fixture.reportPath, "utf8")),
      { summary: { score: 91 }, ...provenance },
    );
    assert.deepEqual(fs.readdirSync(fixture.directory), ["stryker-report.json"]);
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test("keeps the original report when provenance enrichment fails", () => {
  const fixture = createReportFixture();
  try {
    const original = fs.readFileSync(fixture.reportPath, "utf8");

    assert.throws(
      () => enrichAndPublishMutationReport(fixture.reportPath, () => {
        throw new Error("provenance unavailable");
      }),
      /provenance unavailable/,
    );

    assert.equal(fs.readFileSync(fixture.reportPath, "utf8"), original);
    assert.deepEqual(fs.readdirSync(fixture.directory), ["stryker-report.json"]);
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
  }
});
