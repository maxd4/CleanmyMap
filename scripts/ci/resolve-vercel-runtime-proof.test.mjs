import assert from "node:assert/strict";
import test from "node:test";

import { buildRuntimeProof, resolveRuntimeProof, selectMatchingProductionDeployment } from "./resolve-vercel-runtime-proof.mjs";

const candidateSha = "a".repeat(40);
const response = (payload) => ({ ok: true, status: 200, statusText: "OK", json: async () => payload });

function fetchForCandidate(sha = candidateSha) {
  return async (url) => {
    if (url.includes("/v6/deployments")) return response({ deployments: [{ id: "dpl_candidate", projectId: "prj_test", target: "production", readyState: "READY", gitSource: { sha } }] });
    if (url.includes("/v9/projects/")) return response({ id: "prj_test", name: "web", rootDirectory: "apps/web", link: { org: "maxd4", repo: "CleanmyMap" } });
    if (url.includes("/v13/deployments/")) return response({ id: "dpl_candidate", projectId: "prj_test", target: "production", readyState: "READY", gitSource: { sha: candidateSha } });
    if (url.includes("/v2/deployments/") && url.includes("/aliases")) return response({ aliases: [{ alias: "cleanmymap.fr" }] });
    if (url.includes("/v4/aliases/")) return response({ alias: "cleanmymap.fr", deploymentId: "dpl_candidate", projectId: "prj_test", deletedAt: null });
    throw new Error(`Unexpected URL: ${url}`);
  };
}

test("selects only a READY Production deployment with the exact candidate SHA", () => {
  const payload = { deployments: [{ id: "preview", projectId: "prj_test", target: "preview", readyState: "READY", gitSource: { sha: candidateSha } }, { id: "stale", projectId: "prj_test", target: "production", readyState: "READY", gitSource: { sha: "b".repeat(40) } }, { id: "current", projectId: "prj_test", target: "production", readyState: "READY", gitSource: { sha: candidateSha } }] };
  assert.equal(selectMatchingProductionDeployment(payload, { candidateSha, projectId: "prj_test" })?.id, "current");
});

test("rejects a missing or stale deployed SHA", async () => {
  const proof = await resolveRuntimeProof({ candidateSha, migrationVersion: "20261114000002", token: "test-token", projectId: "prj_test", productionAlias: "cleanmymap.fr", fetchImpl: fetchForCandidate("b".repeat(40)) });
  assert.equal(proof.status, "INCOMPATIBLE");
  assert.match(proof.reason, /matches/);
  assert.equal(buildRuntimeProof({ candidateSha, migrationVersion: "20261114000002", status: "INCOMPATIBLE" }).status, "INCOMPATIBLE");
});

test("accepts only an API-observed Production runtime and records project, environment and SHA", async () => {
  const proof = await resolveRuntimeProof({ candidateSha, migrationVersion: "20261114000002", token: "test-token", projectId: "prj_test", productionAlias: "cleanmymap.fr", fetchImpl: fetchForCandidate() });
  assert.equal(proof.status, "COMPATIBLE");
  assert.equal(proof.verified, true);
  assert.deepEqual(proof.observed, { projectId: "prj_test", deploymentId: "dpl_candidate", target: "production", readyState: "READY", gitSha: candidateSha, productionAlias: "cleanmymap.fr" });
  assert.doesNotMatch(JSON.stringify(proof), /test-token/);
});
