import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildNpmAuditInvocation,
  EXPLICIT_MITIGATIONS,
  evaluateAuditPolicy,
  extractAuditFindings,
  formatAuditPolicyResult,
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

const BRACES_ADVISORY = "GHSA-VFJ7-8CJW-P6XM";

function bracesAuditReport() {
  return {
    vulnerabilities: {
      braces: {
        name: "braces",
        severity: "high",
        via: [{
          url: `https://github.com/advisories/${BRACES_ADVISORY}`,
          severity: "high",
        }],
        nodes: ["node_modules/braces"],
      },
    },
  };
}

function bracesLockfile({ version, path }) {
  return {
    packages: {
      "node_modules/braces": { link: true, resolved: path },
      [path]: { version },
    },
  };
}

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
    rootAdvisories: ["GHSA-528H-PC64-C93X"],
    rootPaths: [{ advisory: "GHSA-528H-PC64-C93X", path: ["stream-json"] }],
    parentPackages: [],
    runtimeScope: "UNCLASSIFIED",
    mitigationStatus: "MITIGATED_EXACT",
  }]);
});

test("root advisories, transitive paths, parents, scope and blocker status remain visible", () => {
  const report = {
    vulnerabilities: {
      "@expo/cli": { severity: "high", via: ["@expo/metro"] },
      "@expo/metro": { severity: "high", via: ["metro"] },
      metro: { severity: "high", via: ["micromatch"] },
      micromatch: { severity: "high", via: ["braces"] },
      braces: {
        name: "braces",
        severity: "high",
        via: [{
          url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
          severity: "high",
        }],
        nodes: ["node_modules/braces"],
      },
    },
  };
  const fixtureLockfile = {
    packages: {
      "": { devDependencies: { "@expo/cli": "57.0.24" } },
      "node_modules/@expo/cli": { version: "57.0.24", dependencies: { "@expo/metro": "~56.0.2" } },
      "node_modules/@expo/metro": { version: "56.0.2", dependencies: { metro: "0.84.5" } },
      "node_modules/metro": { version: "0.84.5", dependencies: { micromatch: "^4.0.4" } },
      "node_modules/micromatch": { version: "4.0.8", dependencies: { braces: "^3.0.3" } },
      "node_modules/braces": { version: "3.0.3" },
    },
  };

  const result = evaluateAuditPolicy({ auditReport: report, lockfile: fixtureLockfile });
  assert.equal(result.passed, false);
  const cliFinding = result.unmitigated.find((finding) => finding.packageName === "@expo/cli");
  assert.deepEqual(cliFinding.rootAdvisories, ["GHSA-VFJ7-8CJW-P6XM"]);
  assert.equal(
    cliFinding.rootPaths[0].path.join(" -> "),
    "@expo/cli -> @expo/metro -> metro -> micromatch -> braces",
  );
  assert.equal(cliFinding.runtimeScope, "DEV_BUILD_ONLY");
  assert.equal(cliFinding.mitigationStatus, "BLOCKED_BY_UPSTREAM");
  assert.deepEqual(result.unmitigated.find((finding) => finding.packageName === "braces").parentPackages, [
    "micromatch@4.0.8",
  ]);
  const formatted = formatAuditPolicyResult(result);
  assert.match(formatted, /ROOT_ADVISORY: GHSA-VFJ7-8CJW-P6XM/);
  assert.match(formatted, /MITIGATION_STATUS: BLOCKED_BY_UPSTREAM/);
});

function highFinding(packageName) {
  return {
    name: packageName,
    severity: "high",
    via: [{
      url: "https://github.com/advisories/GHSA-1111-1111-1111",
      severity: "high",
    }],
  };
}

test("classifies a transitive Web runtime package from workspace reachability", () => {
  const result = evaluateAuditPolicy({
    auditReport: { vulnerabilities: { "web-vulnerable": highFinding("web-vulnerable") } },
    lockfile: {
      packages: {
        "apps/web": { dependencies: { "web-parent": "1.0.0" } },
        "node_modules/web-parent": { version: "1.0.0", dependencies: { "web-vulnerable": "1.0.0" } },
        "node_modules/web-vulnerable": { version: "1.0.0" },
      },
    },
  });

  assert.equal(result.unmitigated[0].runtimeScope, "WEB_RUNTIME");
  assert.equal(result.passed, false);
});

test("classifies a transitive Mobile runtime package from workspace reachability", () => {
  const result = evaluateAuditPolicy({
    auditReport: { vulnerabilities: { "mobile-vulnerable": highFinding("mobile-vulnerable") } },
    lockfile: {
      packages: {
        "apps/mobile": { dependencies: { "expo-like": "1.0.0" } },
        "node_modules/expo-like": { version: "1.0.0", dependencies: { "mobile-vulnerable": "1.0.0" } },
        "node_modules/mobile-vulnerable": { version: "1.0.0" },
      },
    },
  });

  assert.equal(result.unmitigated[0].runtimeScope, "MOBILE_RUNTIME");
  assert.equal(result.passed, false);
});

test("classifies a package shared by both runtime workspaces deterministically", () => {
  const result = evaluateAuditPolicy({
    auditReport: { vulnerabilities: { "shared-vulnerable": highFinding("shared-vulnerable") } },
    lockfile: {
      packages: {
        "apps/web": { dependencies: { "shared-parent": "1.0.0" } },
        "apps/mobile": { dependencies: { "shared-parent": "1.0.0" } },
        "node_modules/shared-parent": { version: "1.0.0", dependencies: { "shared-vulnerable": "1.0.0" } },
        "node_modules/shared-vulnerable": { version: "1.0.0" },
      },
    },
  });

  assert.equal(result.unmitigated[0].runtimeScope, "WEB_RUNTIME + MOBILE_RUNTIME");
  assert.equal(result.passed, false);
});

test("classifies a development-only package without treating it as runtime", () => {
  const result = evaluateAuditPolicy({
    auditReport: { vulnerabilities: { "build-vulnerable": highFinding("build-vulnerable") } },
    lockfile: {
      packages: {
        "": { devDependencies: { "build-parent": "1.0.0" } },
        "node_modules/build-parent": { version: "1.0.0", dependencies: { "build-vulnerable": "1.0.0" } },
        "node_modules/build-vulnerable": { version: "1.0.0" },
      },
    },
  });

  assert.equal(result.unmitigated[0].runtimeScope, "DEV_BUILD_ONLY");
  assert.equal(result.passed, false);
});

test("keeps an installed package unclassified when no known root reaches it", () => {
  const result = evaluateAuditPolicy({
    auditReport: { vulnerabilities: { isolated: highFinding("isolated") } },
    lockfile: {
      packages: {
        "node_modules/isolated": { version: "1.0.0" },
      },
    },
  });

  assert.equal(result.unmitigated[0].runtimeScope, "UNCLASSIFIED");
  assert.equal(result.passed, false);
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

test("accepts only the exact braces backport and its dedicated security harness", () => {
  const mitigation = EXPLICIT_MITIGATIONS.find((entry) => entry.advisory === BRACES_ADVISORY);
  assert.deepEqual(mitigation, {
    advisory: BRACES_ADVISORY,
    packageName: "braces",
    version: "3.0.4",
    path: "apps/mobile/vendor/braces",
    documentation: "documentation/security/dependency-advisory-governance.md",
    verification: "apps/mobile/security/braces-security.test.mjs",
  });

  const result = evaluateAuditPolicy({
    auditReport: bracesAuditReport(),
    lockfile: bracesLockfile({ version: "3.0.4", path: "apps/mobile/vendor/braces" }),
  });
  assert.equal(result.passed, true);
  assert.deepEqual(result.mitigated.map(({ advisory, packageName, version, path }) => ({
    advisory,
    packageName,
    version,
    path,
  })), [{
    advisory: BRACES_ADVISORY,
    packageName: "braces",
    version: "3.0.4",
    path: "apps/mobile/vendor/braces",
  }]);
});

test("keeps upstream braces@3.0.3 blocking", () => {
  const result = evaluateAuditPolicy({
    auditReport: bracesAuditReport(),
    lockfile: bracesLockfile({ version: "3.0.3", path: "node_modules/braces" }),
  });

  assert.equal(result.passed, false);
  assert.equal(result.unmitigated[0].version, "3.0.3");
  assert.equal(result.unmitigated[0].path, "node_modules/braces");
  assert.equal(result.unmitigated[0].mitigationStatus, "BLOCKED_BY_UPSTREAM");
});

test("does not cover a different braces version or resolved path", () => {
  for (const candidate of [
    { version: "3.0.5", path: "apps/mobile/vendor/braces" },
    { version: "3.0.4", path: "apps/mobile/vendor/other-braces" },
  ]) {
    const result = evaluateAuditPolicy({
      auditReport: bracesAuditReport(),
      lockfile: bracesLockfile(candidate),
    });

    assert.equal(result.passed, false, `${candidate.version} at ${candidate.path} must remain uncovered`);
    assert.equal(result.mitigated.length, 0);
    assert.equal(result.unmitigated.length, 1);
    assert.equal(result.unmitigated[0].version, candidate.version);
    assert.equal(result.unmitigated[0].path, candidate.path);
  }
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

test("transitive npm audit relay findings disappear only when their full chain reaches an exact mitigation", () => {
  const result = evaluateAuditPolicy({
    auditReport: {
      vulnerabilities: {
        "node-forge": {
          name: "node-forge",
          severity: "high",
          via: [{
            url: "https://github.com/advisories/GHSA-86w9-cpqp-85rv",
            severity: "high",
          }],
          nodes: ["node_modules/node-forge"],
        },
        "@expo/code-signing-certificates": {
          name: "@expo/code-signing-certificates",
          severity: "high",
          via: ["node-forge"],
          nodes: ["node_modules/@expo/code-signing-certificates"],
        },
      },
    },
    lockfile: {
      packages: {
        ...lockfile.packages,
        "node_modules/node-forge": {
          link: true,
          resolved: "apps/mobile/vendor/node-forge",
        },
        "apps/mobile/vendor/node-forge": { version: "1.4.0" },
      },
    },
  });
  assert.equal(result.passed, true);
  assert.equal(result.mitigated.length, 1);
  assert.equal(result.unmitigated.length, 0);
});

test("the gate invocation is exactly npm audit --json", () => {
  assert.deepEqual(buildNpmAuditInvocation().args, ["audit", "--json"]);
});
