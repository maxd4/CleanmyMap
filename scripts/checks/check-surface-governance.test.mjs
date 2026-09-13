import assert from "node:assert/strict";
import test from "node:test";
import {
  auditCanonicalTextSurfaceScales,
  auditSurfaceRepository,
  canonicalTextSurfaceSelectors,
} from "./check-surface-governance.mjs";

test("canonical surface governance passes for the repository", () => {
  const { violations } = auditSurfaceRepository();
  assert.deepEqual(violations, []);
});

test("rejects scales and filters in canonical text-surface states", () => {
  const css = canonicalTextSurfaceSelectors
    .map((selector, index) => `${selector} { ${index === 0 ? "transform: scale(0.99);" : "filter: blur(1px);"} }`)
    .join("\n");

  const violations = auditCanonicalTextSurfaceScales(css, "fixture.css");

  assert.equal(violations.length, canonicalTextSurfaceSelectors.length);
  assert.ok(violations.some((violation) => violation.includes("scale()")));
  assert.ok(violations.some((violation) => violation.includes("filter")));
});

test("allows decorative scales outside canonical text-surface states", () => {
  const css = [
    ...canonicalTextSurfaceSelectors.map((selector) => `${selector} { transform: translateY(-2px); }`),
    ".cmm-rubrique-card__watermark:hover { transform: scale(1.04); }",
  ].join("\n");

  assert.deepEqual(auditCanonicalTextSurfaceScales(css, "fixture.css"), []);
});
