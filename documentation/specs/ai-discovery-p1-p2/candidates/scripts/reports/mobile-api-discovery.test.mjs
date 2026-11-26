import test from "node:test";
import assert from "node:assert/strict";
import { matchApiReference, discoverMobileReferences, buildMobileApiDiscovery } from "./mobile-api-discovery.mjs";

const routes = [
  "apps/web/src/app/api/actions/route.ts",
  "apps/web/src/app/api/actions/[id]/route.ts",
  "apps/web/src/app/api/actions/history/route.ts",
  "apps/web/src/app/api/files/[...parts]/route.ts",
  "apps/web/src/app/api/archive/[[...parts]]/route.ts",
  "apps/web/src/app/api/(group)/profile/route.ts"
];

test("matches paths, query, route groups and catch-all without inventing precedence", () => {
  for (const [ref, status, count] of [["/api/actions?limit=3","CANDIDATE",1],["/api/actions/{param}","AMBIGUOUS",2],["/api/actions/history","AMBIGUOUS",2],["/api/files/a/b","CANDIDATE",1],["/api/files","UNMATCHED",0],["/api/archive","CANDIDATE",1],["/api/profile","CANDIDATE",1],["/api/actions/x{param}","UNRESOLVED_PATH",0],["/unknown","UNRESOLVED_PATH",0]]) {
    const result = matchApiReference(routes, ref);
    assert.equal(result.status, status, ref);
    assert.equal(result.candidates.length, count, ref);
  }
});

test("discovers aliased imports, methods and unresolved calls without emitting URL values", () => {
  const source = [
    "import { mobileRequest as request } from '../../shared/lib/mobile-api-client'",
    "request('/api/actions?private=redacted')",
    "request('/api/actions', { method: 'POST' })",
    "request(`/api/actions/${encodeURIComponent(id)}`, { method: 'PATCH' })",
    "request(path, options)",
    "fetch(`${baseUrl}/api/files/${name}`, { method: 'DELETE' })",
    "request('/api/actions', { ...options })",
    "fetch('https://external.invalid')",
  ].join("\n");
  const refs = discoverMobileReferences("apps/mobile/features/example.ts", source, routes);
  assert.equal(refs.length, 6);
  assert.deepEqual(refs.map(r=>r.method), ["GET","POST","PATCH",null,"DELETE",null]);
  assert.equal(refs[2].status, "AMBIGUOUS");
  assert.equal(refs[3].status, "UNRESOLVED_PATH");
  assert.equal(refs[4].kind, "fetch-path-hint");
  assert.ok(!JSON.stringify(refs).includes("private="));
});

test("requires Git view and excludes tests and vendor files", () => {
  const sha = "a".repeat(40);
  const view = {
    mode: "git",
    listFiles: () => ["apps/mobile/features/example.ts","apps/mobile/features/example.test.ts","apps/mobile/vendor/example.ts"],
    readText: () => "import { mobileRequest } from './mobile-api-client'; mobileRequest('/api/actions')"
  };
  assert.equal(buildMobileApiDiscovery(view, sha, routes).references.length, 1);
  assert.throws(() => buildMobileApiDiscovery({...view,mode:"filesystem"},sha,routes), /Git SHA/);
  assert.throws(() => buildMobileApiDiscovery(view,"HEAD",routes), /Git SHA/);
});
