#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { inspectVercelProduction } from "./deploy-validation.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const vercelApi = "https://api.vercel.com";
const shaPattern = /^[0-9a-f]{40}$/i;
const migrationPattern = /^(\d{14})_.+\.sql$/;

async function getJson(fetchImpl, url, token) {
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Vercel API ${response.status} ${response.statusText}`);
  return response.json();
}

function deploymentSha(deployment) {
  return deployment?.gitSource?.sha ?? deployment?.meta?.githubCommitSha ?? deployment?.meta?.gitCommitSha ?? "";
}

export function selectMatchingProductionDeployment(payload, { candidateSha, projectId } = {}) {
  const deployments = Array.isArray(payload) ? payload : payload?.deployments ?? [];
  return deployments.find((deployment) => (
    deployment?.projectId === projectId
      && deployment?.target === "production"
      && deployment?.readyState === "READY"
      && deploymentSha(deployment) === candidateSha
  )) ?? null;
}

export function latestMigrationVersion(migrationRoot = path.join(repositoryRoot, "apps", "web", "supabase", "migrations")) {
  return fs.readdirSync(migrationRoot)
    .map((file) => file.match(migrationPattern)?.[1] ?? "")
    .filter(Boolean)
    .sort()
    .at(-1) ?? "";
}

export function buildRuntimeProof({ candidateSha, migrationVersion, deployment, projectId, productionAlias, status, reason } = {}) {
  if (status !== "COMPATIBLE") {
    return {
      status: "INCOMPATIBLE",
      sha: candidateSha ?? "",
      migrationVersion: migrationVersion ?? "",
      source: "vercel-api-readonly",
      reason: reason ?? "no READY Production deployment matches the candidate SHA",
    };
  }
  return {
    status: "COMPATIBLE",
    sha: candidateSha,
    migrationVersion,
    source: "vercel-api-readonly",
    deploymentId: deployment.id ?? deployment.uid ?? "",
    projectId,
    productionAlias,
    target: "production",
    readyState: "READY",
  };
}

export async function resolveRuntimeProof({
  candidateSha,
  migrationVersion = latestMigrationVersion(),
  token = process.env.VERCEL_TOKEN?.trim() ?? "",
  projectId = process.env.VERCEL_PROJECT_ID?.trim() ?? "",
  teamId = process.env.VERCEL_ORG_ID?.trim() ?? "",
  productionAlias = process.env.VERCEL_PRODUCTION_ALIAS?.trim() ?? "",
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!shaPattern.test(candidateSha ?? "") || !token || !projectId || !productionAlias || typeof fetchImpl !== "function") {
    return buildRuntimeProof({ candidateSha, migrationVersion, status: "INCOMPATIBLE", reason: "Vercel runtime proof inputs are incomplete." });
  }
  try {
    const deployments = await getJson(
      fetchImpl,
      `${vercelApi}/v6/deployments?projectId=${encodeURIComponent(projectId)}&target=production&limit=20${teamId ? `&teamId=${encodeURIComponent(teamId)}` : ""}`,
      token,
    );
    const candidate = selectMatchingProductionDeployment(deployments, { candidateSha, projectId });
    if (!candidate) return buildRuntimeProof({ candidateSha, migrationVersion, status: "INCOMPATIBLE" });
    const reference = {
      version: 1,
      sha: candidateSha,
      proofSha: candidateSha,
      provider: "vercel",
      projectName: "web",
      rootDirectory: "apps/web",
      target: "production",
      projectId,
      deploymentId: candidate.id ?? candidate.uid,
      productionAlias,
      verified: true,
    };
    const inspection = await inspectVercelProduction({
      repositoryRoot,
      proof: reference,
      token,
      projectId,
      teamId,
      fetchImpl,
    });
    return inspection.valid
      ? buildRuntimeProof({ candidateSha, migrationVersion, deployment: candidate, projectId, productionAlias, status: "COMPATIBLE" })
      : buildRuntimeProof({ candidateSha, migrationVersion, status: "INCOMPATIBLE", reason: inspection.reason ?? "Vercel production inspection failed." });
  } catch (error) {
    return buildRuntimeProof({
      candidateSha,
      migrationVersion,
      status: "INCOMPATIBLE",
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

function readArg(argv, name) {
  return argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";
}

async function main() {
  const argv = process.argv.slice(2);
  const proofPath = path.resolve(readArg(argv, "--proof"));
  if (!proofPath || proofPath === path.resolve(".")) throw new Error("--proof=<path> is required");
  const proof = await resolveRuntimeProof({
    candidateSha: readArg(argv, "--sha") || process.env.GITHUB_SHA,
    migrationVersion: readArg(argv, "--migration-version") || undefined,
  });
  fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(`RUNTIME_PROOF_STATUS: ${proof.status}`);
  console.log(`RUNTIME_PROOF_SHA: ${proof.sha || "MISSING"}`);
  console.log(`RUNTIME_PROOF_MIGRATION: ${proof.migrationVersion || "MISSING"}`);
  console.log(`RUNTIME_PROOF_SOURCE: ${proof.source}`);
  if (proof.reason) console.log(`RUNTIME_PROOF_REASON: ${proof.reason}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
