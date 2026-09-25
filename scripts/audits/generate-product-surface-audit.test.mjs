import test from "node:test";
import assert from "node:assert/strict";

import {
  classifySurfaceRoute,
  classifyUnresolvedRuntimeReferences,
  collectRuntimeReferences,
  extractNavigationRouteIds,
  findUnresolvedRuntimeTargets,
  isRedirectOnlyRouteSource,
  normalizeRouteTarget,
  routeFilePattern,
  routePatternMatches,
} from "./generate-product-surface-audit.mjs";

test("normalise les liens internes dynamiques et les distingue des URLs externes", () => {
  assert.equal(normalizeRouteTarget("/missions/${missionId}?tab=impact"), "/missions/[param]");
  assert.equal(normalizeRouteTarget("https://cleanmymap.fr/actions/new"), "");
  assert.equal(routePatternMatches("/missions/[id]", "/missions/42"), true);
  assert.equal(routePatternMatches("/missions/[id]", "/missions/42/history"), false);
  assert.equal(routePatternMatches("/docs/[...segments]", "/docs/a.md"), true);
  assert.equal(routePatternMatches("/docs/[...segments]", "/docs/architecture/foo.md"), true);
  assert.equal(routePatternMatches("/docs/[...segments]", "/docs/plans/foo/bar.md"), true);
  assert.equal(routePatternMatches("/docs/[...segments]", "/other/a.md"), false);
  assert.equal(routePatternMatches("/docs/[[...segments]]", "/docs"), true);
  assert.equal(routePatternMatches("/docs/[[...segments]]", "/docs/a.md"), true);
  assert.equal(routeFilePattern("apps/web/src/app/docs/[...segments]/route.ts", process.cwd()), "/docs/[...segments]");
});

test("résout les constantes indirectes du ruban de navigation", () => {
  const ids = extractNavigationRouteIds(`
    const ACT_VISIBLE_ROUTE_IDS: RouteId[] = ["rejoindre-une-action", "new", "signalement"];
    const COMMON_PROFILE_SPACE_PAGES = {
      act: ACT_VISIBLE_ROUTE_IDS,
      visualize: ["map"],
    };
    const PARCOURS_SPACE_PAGE_MAP = {
      benevole: buildProfileSpacePages(["dashboard"]),
    };
  `);

  assert.equal(ids.has("rejoindre-une-action"), true);
  assert.equal(ids.has("new"), true);
  assert.equal(ids.has("signalement"), true);
  assert.equal(ids.has("map"), true);
});

test("classe les surfaces selon leurs preuves, sans transformer un manque de lien en suppression", () => {
  assert.equal(classifySurfaceRoute({ inRibbon: "YES" }), "PRIMARY_NAV");
  assert.equal(classifySurfaceRoute({ inboundRuntimeCount: 1 }), "SECONDARY_NAV");
  assert.equal(classifySurfaceRoute({ deepLinkCount: 1 }), "DEEP_LINK");
  assert.equal(classifySurfaceRoute({ dynamicRoute: true }), "UNKNOWN");
  assert.equal(classifySurfaceRoute({ protectedRoute: true, protectedEvidence: true }), "PROTECTED_TOOL");
  assert.equal(classifySurfaceRoute({ protectedRoute: true, protectedEvidence: false, authGate: "protected" }), "UNKNOWN");
  assert.equal(classifySurfaceRoute({ isQa: true }), "QA_TOOL");
  assert.equal(classifySurfaceRoute({ canonicalStatus: "REDIRECT_COMPAT" }), "REDIRECT_COMPAT");
  assert.equal(classifySurfaceRoute({ documentationOnly: true }), "UNKNOWN");
  assert.equal(classifySurfaceRoute({}), "ORPHAN_ROUTE");
  assert.equal(classifySurfaceRoute({ authGate: "auth-blur-gate" }), "ORPHAN_ROUTE");
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

test("distingue un attribut de référence d'un href utilisateur", () => {
  const references = collectRuntimeReferences(new Map([
    ["apps/web/src/components/example.tsx", `
      <Link href="/actions/new">Créer</Link>
      const config = { path: "/dynamic-target" };
      redirect("/missing-target");
    `],
  ]));

  assert.deepEqual(
    references.map(({ kind, target }) => ({ kind, target })),
    [
      { kind: "link", target: "/actions/new" },
      { kind: "reference", target: "/dynamic-target" },
      { kind: "redirect", target: "/missing-target" },
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

test("sépare un lien statique cassé d'un finding à revoir", () => {
  const findings = classifyUnresolvedRuntimeReferences([
    { source: "apps/web/src/components/example.tsx", kind: "link", target: "/charte" },
    { source: "apps/web/src/lib/example.ts", kind: "link", target: "/feedback" },
    { source: "apps/web/src/lib/example.ts", kind: "reference", target: "/dynamic-target" },
    { source: "apps/web/src/lib/example.ts", kind: "redirect", target: "/redirect-target" },
  ], new Set(["/actions/new"]));

  assert.deepEqual(
    findings.map(({ target, severity }) => ({ target, severity })),
    [
      { target: "/charte", severity: "INVARIANT_ERROR" },
      { target: "/dynamic-target", severity: "REVIEW_FINDING" },
      { target: "/feedback", severity: "INVARIANT_ERROR" },
      { target: "/redirect-target", severity: "INVARIANT_ERROR" },
    ],
  );
});

test("ne classe comme alias que les pages dont le seul rendu est une redirection", () => {
  const files = new Map([
    ["apps/web/src/app/legacy/page.tsx", 'import { permanentRedirect } from "next/navigation"; permanentRedirect("/actions/new");'],
    ["apps/web/src/app/reglages/page.tsx", 'if (!userId) redirect("/sign-in"); return (<main>Réglages</main>);'],
  ]);

  assert.equal(isRedirectOnlyRouteSource("apps/web/src/app/legacy/page.tsx", files), true);
  assert.equal(isRedirectOnlyRouteSource("apps/web/src/app/reglages/page.tsx", files), false);
});
