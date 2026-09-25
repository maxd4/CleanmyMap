import test from "node:test";
import assert from "node:assert/strict";

import {
  classifySurfaceRoute,
  collectRuntimeReferences,
  findUnresolvedRuntimeTargets,
  normalizeRouteTarget,
  routePatternMatches,
} from "./generate-product-surface-audit.mjs";

test("normalise les liens internes dynamiques et les distingue des URLs externes", () => {
  assert.equal(normalizeRouteTarget("/missions/${missionId}?tab=impact"), "/missions/[param]");
  assert.equal(normalizeRouteTarget("https://cleanmymap.fr/actions/new"), "");
  assert.equal(routePatternMatches("/missions/[id]", "/missions/42"), true);
  assert.equal(routePatternMatches("/missions/[id]", "/missions/42/history"), false);
});

test("classe les surfaces selon leurs preuves, sans transformer un manque de lien en suppression", () => {
  assert.equal(classifySurfaceRoute({ inRibbon: "YES" }), "PRIMARY_NAV");
  assert.equal(classifySurfaceRoute({ inboundRuntimeCount: 1 }), "SECONDARY_NAV");
  assert.equal(classifySurfaceRoute({ deepLinkCount: 1 }), "DEEP_LINK");
  assert.equal(classifySurfaceRoute({ dynamicRoute: true }), "UNKNOWN");
  assert.equal(classifySurfaceRoute({ isProtectedTool: true }), "PROTECTED_TOOL");
  assert.equal(classifySurfaceRoute({ isQa: true }), "QA_TOOL");
  assert.equal(classifySurfaceRoute({ canonicalStatus: "REDIRECT_COMPAT" }), "REDIRECT_COMPAT");
  assert.equal(classifySurfaceRoute({ documentationOnly: true }), "UNKNOWN");
  assert.equal(classifySurfaceRoute({}), "ORPHAN_ROUTE");
});

test("collecte un CTA interne et ignore les liens externes", () => {
  const references = collectRuntimeReferences(new Map([
    ["apps/web/src/components/example.tsx", `
      <a href="/actions/new">Créer</a>
      <button onClick={() => router.push('/actions/map')}>Carte</button>
      <a href="https://example.com/external">Externe</a>
    `],
  ]));

  assert.deepEqual(
    references.map(({ kind, target }) => ({ kind, target })),
    [
      { kind: "navigation", target: "/actions/map" },
      { kind: "link", target: "/actions/new" },
    ],
  );
});

test("signale les href internes qui ne correspondent à aucun pattern runtime", () => {
  const references = collectRuntimeReferences(new Map([
    ["apps/web/src/components/example.tsx", '<a href="/route-inexistante">Lien</a>'],
  ]));

  assert.deepEqual(
    findUnresolvedRuntimeTargets(references, new Set(["/actions/new", "/missions/[id]"])),
    ["/route-inexistante"],
  );
});
