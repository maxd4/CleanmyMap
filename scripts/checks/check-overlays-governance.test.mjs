import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  auditModalSources,
  CANONICAL_DIALOG_PATH,
  LEGACY_MODAL_ALLOWLIST,
} from "./check-overlays-governance.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

test("accepts the canonical primitive and migrated consumers", () => {
  const entries = [
    { path: CANONICAL_DIALOG_PATH, source: read(CANONICAL_DIALOG_PATH) },
    ...[
      "apps/web/src/components/sections/rubriques/rejoindre-un-formulaire-section-dialog.tsx",
      "apps/web/src/components/actions/action-declaration/form/action-declaration-form-confirmation.tsx",
      "apps/web/src/components/actions/action-declaration/form/action-declaration-export-picker.tsx",
    ].map((path) => ({ path, source: read(path) })),
  ];

  assert.deepEqual(auditModalSources(entries), []);
});

test("accepts exactly the three bounded legacy modal exceptions", () => {
  const entries = [...LEGACY_MODAL_ALLOWLIST].map((path) => ({
    path,
    source: read(path),
  }));

  assert.deepEqual(auditModalSources(entries), []);
  assert.equal(LEGACY_MODAL_ALLOWLIST.size, 3);
});

test("rejects a new raw modal dialog", () => {
  const violations = auditModalSources([
    {
      path: "apps/web/src/components/example-raw-modal.tsx",
      source: '<div role="dialog" aria-modal="true">Contenu</div>',
    },
  ]);

  assert.equal(violations.length, 1);
  assert.match(violations[0], /example-raw-modal\.tsx/);
});

test("accepts a non-modal dialog with aria-modal=false", () => {
  assert.deepEqual(
    auditModalSources([
      {
        path: "apps/web/src/components/navigation/app-navigation-tree-menu.tsx",
        source: '<div role="dialog" aria-modal="false">Navigation</div>',
      },
    ]),
    [],
  );
});

test("removing an exception from the allowlist exposes its raw modal", () => {
  const legacyPath = [...LEGACY_MODAL_ALLOWLIST][0];
  const reducedAllowlist = new Set(LEGACY_MODAL_ALLOWLIST);
  reducedAllowlist.delete(legacyPath);

  const violations = auditModalSources(
    [{ path: legacyPath, source: read(legacyPath) }],
    { allowlist: reducedAllowlist },
  );

  assert.equal(violations.length, 1);
  assert.ok(violations[0].startsWith(legacyPath));
});
