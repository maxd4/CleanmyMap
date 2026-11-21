import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverCriticalContracts,
  reviewCriticalContracts,
  summarizeCriticalContractReviews,
} from "./documentation-contract-review.mjs";

const paths = {
  publicRpc: "apps/web/supabase/migrations/public-rpc.sql",
  privilegedRpc: "apps/web/supabase/migrations/privileged-rpc.sql",
  unknownRpc: "apps/web/supabase/migrations/unknown-rpc.sql",
  consumer: "apps/web/src/lib/public-rpc-client.ts",
};

const sqlFunction = ({ name, security = "invoker", grant = null }) => [
  `create or replace function public.${name}(input jsonb)`,
  "returns jsonb",
  "language sql",
  `security ${security}`,
  `as $fn$ select input $fn$;`,
  ...(grant ? [`grant execute on function public.${name}(jsonb) to ${grant};`] : []),
].join("\n");

function discover(entries) {
  const files = Object.keys(entries);
  return discoverCriticalContracts({ files, readFile: (file) => entries[file] });
}

function document(path, lifecycle, lines) {
  const content = [
    `> **Statut documentaire : ${lifecycle}.**`,
    "",
    "# Contrat RPC",
    ...lines,
  ].join("\n");
  return {
    path,
    content,
    lifecycle: { statuses: lifecycle.split(/\s*\/\s*/), source: "EXPLICIT_MARKER" },
    sections: [{ title: "Contrat RPC", startLine: 3, endLine: content.split("\n").length }],
    internalLinks: { invalid: [] },
  };
}

const completeRpcLines = (source, permission) => [
  `Code : \`${source}\``,
  "Responsabilité / owner : service RPC et contrat canonique.",
  "Acteurs : le requester authentifié et le propriétaire du service.",
  `Permissions : ${permission}.`,
  "Entrées / sorties : le paramètre JSON est validé et la fonction retourne le résultat.",
  "Erreurs : refus, exception et erreur sont documentés.",
  "Tests : scénario de régression et test pgTAP associés.",
];

test("distingue RPC privilégiée, RPC publique, privilège inconnu et consommateur navigateur", () => {
  const contracts = discover({
    [paths.publicRpc]: sqlFunction({ name: "public_lookup", grant: "anon" }),
    [paths.privilegedRpc]: sqlFunction({ name: "secure_lookup", security: "definer", grant: "service_role" }),
    [paths.unknownRpc]: sqlFunction({ name: "unknown_lookup" }),
    [paths.consumer]: `export async function loadPublicLookup(client: Client) { return client.rpc("public_lookup"); }\n`,
  });
  const byPathAndKind = new Map(contracts.map((contract) => [`${contract.path}:${contract.kind}`, contract]));

  assert.equal(byPathAndKind.get(`${paths.publicRpc}:RPC_PUBLIC`).privilege.status, "PUBLIC");
  assert.equal(byPathAndKind.get(`${paths.privilegedRpc}:PRIVILEGED_RPC`).privilege.status, "PRIVILEGED");
  assert.equal(byPathAndKind.get(`${paths.unknownRpc}:RPC_PRIVILEGE_UNESTABLISHED`).privilege.status, "UNESTABLISHED");
  const consumer = byPathAndKind.get(`${paths.consumer}:RPC_CONSUMER`);
  assert.equal(consumer.signals.privileged, false);
  assert.equal(consumer.privilege.status, "UNESTABLISHED");
  assert.deepEqual(consumer.rpcNames, ["public_lookup"]);
});

test("attribue DOCUMENTED au fichier source cité et produit des preuves CURRENT localisables", () => {
  const contracts = discover({ [paths.publicRpc]: sqlFunction({ name: "public_lookup", grant: "anon" }) });
  const reviews = reviewCriticalContracts({
    contracts,
    documents: [document("documentation/rpc/public-lookup.md", "CURRENT", completeRpcLines(paths.publicRpc, "anon et public"))],
  });
  const review = reviews[0];

  assert.equal(review.kind, "RPC_PUBLIC");
  assert.equal(review.status, "DOCUMENTED");
  assert.equal(review.documentsExamined[0].attributions[0].matchKind, "SOURCE_PATH");
  assert.ok(review.evidence.dimensionProofs.permissions[0].line > 0);
  assert.equal(review.evidence.dimensionProofs.permissions[0].documentPath, "documentation/rpc/public-lookup.md");
  assert.deepEqual(summarizeCriticalContractReviews(reviews), {
    criticalContracts: 1, documentedContracts: 1, reviewRequiredContracts: 0, notMeasuredContracts: 0,
  });
});

test("ne traite pas un basename générique comme attribution précise", () => {
  const contracts = discover({ [paths.publicRpc]: sqlFunction({ name: "public_lookup", grant: "anon" }) });
  const review = reviewCriticalContracts({
    contracts,
    documents: [document("documentation/README.md", "CURRENT", [
      "Code : public-rpc.sql",
      "Responsabilité, acteurs, permissions, entrées, sorties, erreurs et tests sont listés ici.",
    ])],
  })[0];

  assert.equal(review.status, "NOT_MEASURED");
  assert.ok(review.reasons.includes("NO_PRECISE_DOCUMENTATION_ATTRIBUTION"));
  assert.deepEqual(review.documentsExamined, []);
});

test("ne traite pas un symbole partagé par plusieurs migrations comme attribution précise", () => {
  const contracts = discover({
    "apps/web/supabase/migrations/001_first.sql": sqlFunction({ name: "shared_lookup", grant: "anon" }),
    "apps/web/supabase/migrations/002_second.sql": sqlFunction({ name: "shared_lookup", grant: "anon" }),
  });
  const review = reviewCriticalContracts({
    contracts,
    documents: [document("documentation/rpc/shared.md", "CURRENT", completeRpcLines("shared_lookup", "anon et public"))],
  });

  assert.equal(review.length, 2);
  assert.ok(review.every((entry) => entry.status === "NOT_MEASURED"));
  assert.ok(review.every((entry) => entry.reasons.includes("NO_PRECISE_DOCUMENTATION_ATTRIBUTION")));
});

test("requiert une preuve CURRENT et laisse PLAN et HISTORY en revue", () => {
  const contracts = discover({ [paths.privilegedRpc]: sqlFunction({ name: "secure_lookup", security: "definer", grant: "service_role" }) });
  const reviews = reviewCriticalContracts({
    contracts,
    documents: [
      document("documentation/rpc/plan.md", "PLAN", completeRpcLines(paths.privilegedRpc, "service_role uniquement")),
      document("documentation/rpc/history.md", "HISTORY", completeRpcLines(paths.privilegedRpc, "service_role uniquement")),
    ],
  });

  assert.equal(reviews[0].status, "REVIEW_REQUIRED");
  assert.ok(reviews[0].reasons.includes("PLAN_IS_NOT_CURRENT_CONTRACT:documentation/rpc/plan.md"));
  assert.ok(reviews[0].reasons.includes("NON_CURRENT_DOCUMENTATION:documentation/rpc/history.md"));
  assert.deepEqual(reviews[0].documentsExamined.map((entry) => entry.path), ["documentation/rpc/plan.md", "documentation/rpc/history.md"]);
});

test("une preuve CURRENT complète reste valide malgré une référence HISTORY attribuée", () => {
  const contracts = discover({ [paths.publicRpc]: sqlFunction({ name: "public_lookup", grant: "anon" }) });
  const current = document("documentation/rpc/current.md", "CURRENT", completeRpcLines(paths.publicRpc, "anon et public"));
  const history = document("documentation/rpc/history.md", "HISTORY", completeRpcLines(paths.publicRpc, "anon et public"));
  const review = reviewCriticalContracts({ contracts, documents: [current, history] })[0];

  assert.equal(review.status, "DOCUMENTED");
  assert.deepEqual(review.documentsExamined.map((entry) => entry.path), ["documentation/rpc/current.md", "documentation/rpc/history.md"]);
  assert.ok(review.evidence.dimensionProofs.permissions.every((proof) => proof.documentPath === "documentation/rpc/current.md"));
});

test("garde REVIEW_REQUIRED pour les privilèges contradictoires et les cycles documentaires contradictoires", () => {
  const contracts = discover({ [paths.publicRpc]: sqlFunction({ name: "public_lookup", grant: "anon" }) });
  const publicClaim = document("documentation/rpc/contradictory.md", "CURRENT", completeRpcLines(paths.publicRpc, "service_role uniquement"));
  const lifecycleConflict = document("documentation/rpc/lifecycle-conflict.md", "CURRENT / PLAN", completeRpcLines(paths.publicRpc, "anon"));
  const reviews = reviewCriticalContracts({ contracts, documents: [publicClaim, lifecycleConflict] });
  const byDoc = Object.fromEntries(reviews[0].documentsExamined.map((entry) => [entry.path, entry]));

  assert.equal(reviews[0].status, "REVIEW_REQUIRED");
  assert.ok(reviews[0].reasons.some((reason) => reason.startsWith("CONTRADICTORY_PRIVILEGE_CLAIM:documentation/rpc/contradictory.md:")));
  assert.ok(reviews[0].reasons.includes("CONFLICTING_DOCUMENT_LIFECYCLE:documentation/rpc/lifecycle-conflict.md"));
  assert.deepEqual(byDoc["documentation/rpc/lifecycle-conflict.md"].lifecycle.statuses, ["CURRENT", "PLAN"]);
});

test("la preuve documentaire seule ne transforme pas un privilège source inconnu en DOCUMENTED", () => {
  const contracts = discover({ [paths.unknownRpc]: sqlFunction({ name: "unknown_lookup" }) });
  const review = reviewCriticalContracts({
    contracts,
    documents: [document("documentation/rpc/unknown.md", "CURRENT", completeRpcLines(paths.unknownRpc, "service_role uniquement"))],
  })[0];

  assert.equal(review.status, "NOT_MEASURED");
  assert.ok(review.reasons.includes("SOURCE_PRIVILEGE_NOT_ESTABLISHED"));
  assert.equal(review.evidence.privilege.status, "UNESTABLISHED");
  assert.equal(review.documentsExamined[0].path, "documentation/rpc/unknown.md");
});

test("le contrat consommateur RPC reste NOT_MEASURED même avec une documentation complète", () => {
  const contracts = discover({ [paths.consumer]: `export async function loadPublicLookup(client: Client) { return client.rpc("public_lookup"); }\n` });
  const review = reviewCriticalContracts({
    contracts,
    documents: [document("documentation/rpc/consumer.md", "CURRENT", completeRpcLines(paths.consumer, "client"))],
  })[0];

  assert.equal(review.kind, "RPC_CONSUMER");
  assert.equal(review.status, "NOT_MEASURED");
  assert.ok(review.reasons.includes("RPC_CALLER_DOES_NOT_ESTABLISH_PRIVILEGE"));
  assert.equal(review.signals, undefined);
});
