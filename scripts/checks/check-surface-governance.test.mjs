import assert from "node:assert/strict";
import test from "node:test";
import {
  auditCmmButtonLocalScalesInSource,
  auditCanonicalTextSurfaceScales,
  auditPrimitiveConsumerOverridesInSource,
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

test("rejects a CmmButton scale when onClick appears before className", () => {
  const violations = auditCmmButtonLocalScalesInSource(
    '<CmmButton onClick={() => doSomething()} className="group active:scale-95">Texte</CmmButton>',
    "fixture.tsx",
  );

  assert.deepEqual(violations, [
    "fixture.tsx: CmmButton className contains local text-surface scale: active:scale-95",
  ]);
});

test("rejects static scales in cn, template literals, and conditional branches", () => {
  assert.equal(
    auditCmmButtonLocalScalesInSource(
      '<CmmButton className={cn("group", "active:scale-95")} />',
      "cn.tsx",
    ).length,
    1,
  );
  assert.equal(
    auditCmmButtonLocalScalesInSource(
      '<CmmButton className={`group hover:scale-[1.02]`} />',
      "template.tsx",
    ).length,
    1,
  );
  assert.equal(
    auditCmmButtonLocalScalesInSource(
      '<CmmButton className={isActive ? "active:scale-95" : "text-slate-900"} />',
      "conditional.tsx",
    ).length,
    1,
  );
});

test("allows decorative child scales outside the CmmButton className", () => {
  assert.deepEqual(
    auditCmmButtonLocalScalesInSource(
      '<CmmButton className="group">Texte <span className="group-hover:scale-110" /></CmmButton>',
      "fixture.tsx",
    ),
    [],
  );
});

test("allows placement utilities on primitive consumers", () => {
  assert.deepEqual(
    auditPrimitiveConsumerOverridesInSource(
      '<><CmmButton className="w-full flex items-center gap-2" /><CmmCard className="flex min-w-0" /></>',
      "placement.tsx",
    ),
    [],
  );
});

test("rejects arbitrary shell recipes on CmmButton and CmmCard consumers", () => {
  const violations = auditPrimitiveConsumerOverridesInSource(
    '<><CmmButton className="rounded-[2rem] shadow-[0_0_20px_rgba(0,0,0,.2)]" /><CmmCard className="bg-[linear-gradient(red,blue)] p-[3rem]" /></>',
    "surface-overrides.tsx",
  );

  assert.equal(violations.length, 2);
  assert.match(violations[0], /CmmButton/);
  assert.match(violations[1], /CmmCard/);
});
