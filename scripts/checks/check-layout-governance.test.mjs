import test from "node:test";
import assert from "node:assert/strict";
import {
  auditZoomSources,
} from "./check-layout-governance.mjs";

test("accepts source files without page-level CSS zoom", () => {
  assert.deepEqual(
    auditZoomSources({
      sourceEntries: [{
        path: "apps/web/src/app/(app)/explorer/page.tsx",
        source: '<main className="cmm-page-layout">Explorer</main>',
      }],
      cssEntries: [{
        path: "apps/web/src/styles/layout.css",
        source: ".cmm-page-layout { max-width: var(--cmm-page-max-width); }",
      }],
    }),
    [],
  );
});

test("rejects an arbitrary Tailwind zoom class outside the homepage", () => {
  const violations = auditZoomSources({
    sourceEntries: [{
      path: "apps/web/src/app/(app)/explorer/page.tsx",
      source: '<main className="[zoom:0.9]">Explorer</main>',
    }],
  });

  assert.equal(violations.length, 1);
  assert.match(violations[0], /explorer\/page\.tsx/);
  assert.match(violations[0], /page-level CSS zoom/);
});

test("rejects a CSS zoom property in an application stylesheet", () => {
  const violations = auditZoomSources({
    cssEntries: [{
      path: "apps/web/src/styles/layout.css",
      source: ".cmm-page-layout {\n  zoom: 0.9;\n}",
    }],
  });

  assert.equal(violations.length, 1);
  assert.match(violations[0], /layout\.css:2/);
  assert.match(violations[0], /application CSS zoom/);
});

test("accepts a TypeScript map zoom field", () => {
  const source = `
    type MapViewport = {
      zoom: number;
    };
  `;

  assert.deepEqual(
    auditZoomSources({
      sourceEntries: [{ path: "apps/web/src/components/maps/map.tsx", source }],
    }),
    [],
  );
});
