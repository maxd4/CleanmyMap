import assert from "node:assert/strict";
import test from "node:test";

import {
  DECEPTION_POLICY_SCHEMA_VERSION,
  validateSecurityDeceptionRegistry,
} from "./security-deception-policy.mjs";

const existingPaths = new Set([
  "apps/web/src/lib/security/deception.ts",
  "apps/web/src/lib/security/deception.test.ts",
  "apps/web/src/lib/security/deception-negative.test.ts",
  "documentation/security/SECURITY.md",
  "documentation/security/deception-decision.md",
]);

const validControl = {
  id: "future-canary",
  kind: "CANARY",
  objective: "Detect access to a deliberately inert canary marker.",
  owner: "security-maintainers",
  entrypoint: {
    path: "apps/web/src/lib/security/deception.ts",
    marker: "SECURITY_DECEPTION: future-canary",
  },
  privilege: "none",
  realSecrets: false,
  businessEffect: "none",
  monitoring: {
    mechanism: "server-side security event",
    alert: "security-maintainers triage the event",
  },
  tests: {
    positive: ["apps/web/src/lib/security/deception.test.ts"],
    negative: ["apps/web/src/lib/security/deception-negative.test.ts"],
  },
  documentation: {
    current: "documentation/security/SECURITY.md",
  },
  approval: {
    securityDecision: "documentation/security/deception-decision.md",
    reviewedRef: "0123456789abcdef0123456789abcdef01234567",
  },
};

function validate(registry, source = "SECURITY_DECEPTION: future-canary") {
  return validateSecurityDeceptionRegistry(registry, {
    fileExists: (candidate) => existingPaths.has(candidate),
    readText: () => source,
  });
}

test("the current registry explicitly records that no cyber-deception control is needed", async () => {
  const { default: registry } = await import("./security-deception-registry.json", { with: { type: "json" } });
  assert.equal(registry.schemaVersion, DECEPTION_POLICY_SCHEMA_VERSION);
  assert.deepEqual(validate(registry), []);
  assert.deepEqual(registry.controls, []);
});

test("a future deception control requires a precise entrypoint and explicit safety contract", () => {
  assert.deepEqual(validate({ schemaVersion: 1, controls: [validControl] }), []);
});

test("missing detection, owner, monitoring, tests, documentation or approval is rejected", () => {
  const invalid = structuredClone(validControl);
  delete invalid.objective;
  delete invalid.owner;
  delete invalid.monitoring;
  delete invalid.tests;
  delete invalid.documentation;
  delete invalid.approval;

  const errors = validate({ schemaVersion: 1, controls: [invalid] });
  assert.ok(errors.some((error) => error.includes("objective")));
  assert.ok(errors.some((error) => error.includes("owner")));
  assert.ok(errors.some((error) => error.includes("monitoring")));
  assert.ok(errors.some((error) => error.includes("tests")));
  assert.ok(errors.some((error) => error.includes("documentation")));
  assert.ok(errors.some((error) => error.includes("approval")));
});

test("real privilege, secrets or business effects are rejected", () => {
  const invalid = structuredClone(validControl);
  invalid.privilege = "admin";
  invalid.realSecrets = true;
  invalid.businessEffect = "legitimate-action";

  const errors = validate({ schemaVersion: 1, controls: [invalid] });
  assert.ok(errors.some((error) => error.includes("privilege")));
  assert.ok(errors.some((error) => error.includes("realSecrets")));
  assert.ok(errors.some((error) => error.includes("businessEffect")));
});

test("an unobservable or untested entrypoint is rejected", () => {
  const invalid = structuredClone(validControl);
  invalid.entrypoint.marker = "missing-marker";
  invalid.tests.positive = [];

  const errors = validate({ schemaVersion: 1, controls: [invalid] });
  assert.ok(errors.some((error) => error.includes("marker is not present")));
  assert.ok(errors.some((error) => error.includes("tests.positive")));
});

test("anti-spam honeypots are not registered as cyber-deception controls", () => {
  const invalid = structuredClone(validControl);
  invalid.kind = "HONEYPOT_ANTISPAM";

  const errors = validate({ schemaVersion: 1, controls: [invalid] });
  assert.ok(errors.some((error) => error.includes("HONEYTOKEN, DECOY or CANARY")));
});
