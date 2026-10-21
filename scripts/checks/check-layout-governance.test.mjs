import test from "node:test";
import assert from "node:assert/strict";
import {
  auditStructuralShellInSource,
  auditZoomSources,
} from "./check-layout-governance.mjs";

test("accepts a functional reading width nested inside the page shell", () => {
  assert.deepEqual(
    auditStructuralShellInSource(
      '<main className="cmm-page-layout"><p className="mx-auto max-w-3xl">Texte</p></main>',
      "functional-width.tsx",
    ),
    [],
  );
});

test("rejects a parallel structural shell on a main element", () => {
  const violations = auditStructuralShellInSource(
    '<main className="mx-auto max-w-screen-xl px-6">Contenu</main>',
    "parallel-shell.tsx",
  );

  assert.equal(violations.length, 1);
  assert.match(violations[0], /parallel-shell\.tsx/);
  assert.match(violations[0], /structural shell width/);
});

test("rejects an arbitrary large section width without banning ordinary max-w utilities", () => {
  const violations = auditStructuralShellInSource(
    '<section className="mx-auto max-w-[90rem]">Grille</section>',
    "large-section.tsx",
  );

  assert.equal(violations.length, 1);
});

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
