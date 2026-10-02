import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildNpmAuditInvocation,
  evaluateAuditPolicy,
  extractAuditFindings,
  parseAuditOutput,
} from "./audit-dependencies.mjs";

const lockfile = {
  packages: {
    "node_modules/stream-json": {
      link: true,
      resolved: "apps/mobile/vendor/stream-json",
    },
    "apps/mobile/vendor/stream-json": { version: "1.9.1" },
    "node_modules/node-forge": { version: "1.4.0" },
  },
};

test("parseAuditOutput accepts JSON surrounded by npm diagnostics", () => {
  assert.deepEqual(parseAuditOutput("warning\n{\"auditReportVersion\":2}\n"), {
    auditReportVersion: 2,
  });
});

test("extractAuditFindings resolves a vendor link to its canonical package path", () => {
  const findings = extractAuditFindings({
    vulnerabilities: {
      "stream-json": {
        name: "stream-json",
        severity: "moderate",
        via: [{
          source: 1164823,
          url: "https://github.com/advisories/GHSA-528h-pc64-c93x",
          severity: "moderate",
        }],
        nodes: ["node_modules/stream-json"],
      },
    },
  }, lockfile);

  assert.deepEqual(findings, [{
    advisory: "GHSA-528H-PC64-C93X",
    packageName: "stream-json",
    version: "1.9.1",
    path: "apps/mobile/vendor/stream-json",
    severity: "moderate",
    title: "npm audit finding for stream-json",
    url: "https://github.com/advisories/GHSA-528h-pc64-c93x",
    source: 1164823,
  }]);
});

test("the exact vendor mitigation is accepted but a changed version is not", () => {
  const report = {
    vulnerabilities: {
      "stream-json": {
        name: "stream-json",
        severity: "high",
        via: [{
          url: "https://github.com/advisories/GHSA-528h-pc64-c93x",
          severity: "high",
        }],
        nodes: ["node_modules/stream-json"],
      },
    },
  };
  const accepted = evaluateAuditPolicy({ auditReport: report, lockfile });
  assert.equal(accepted.passed, true);
  assert.equal(accepted.mitigated.length, 1);

  const rejected = evaluateAuditPolicy({
    auditReport: report,
    lockfile: {
      packages: {
        ...lockfile.packages,
        "apps/mobile/vendor/stream-json": { version: "1.9.2" },
      },
    },
  });
  assert.equal(rejected.passed, false);
  assert.equal(rejected.unmitigated[0].version, "1.9.2");
});

test("a High finding without an exact mitigation fails, including string-only via entries", () => {
  const result = evaluateAuditPolicy({
    auditReport: {
      vulnerabilities: {
        "node-forge": {
          name: "node-forge",
          severity: "high",
          via: ["@expo/cli"],
          nodes: ["node_modules/node-forge"],
        },
      },
    },
    lockfile,
  });
  assert.equal(result.passed, false);
  assert.equal(result.unmitigated[0].advisory, null);
  assert.equal(result.unmitigated[0].path, "node_modules/node-forge");
});

test("the gate invocation is exactly npm audit --json", () => {
  assert.deepEqual(buildNpmAuditInvocation().args, ["audit", "--json"]);
});
