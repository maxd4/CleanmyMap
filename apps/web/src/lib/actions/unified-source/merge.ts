import {
  auditActionContract,
} from "@/lib/actions/quality/data-quality";
import type {
  ActionDataContract,
  ActionEntityType,
} from "@/lib/actions/data-contract";
import type { ActionMapViewportQuery } from "@/lib/actions/types";
import type {
  TrashSpotterSpotRow,
  UnifiedContractCandidate,
  UnifiedContractOrigin,
} from "./contracts";
import { toActionContract, toCanonicalSpotContract } from "./contracts";
import type { ActionRow } from "@/types/database";

const TEST_MARKERS = [
  "seed de test",
  "anonymized test seed",
  "runtime_seed",
  "quartier demo",
  "zone test",
  "lieu test",
  "test_seed",
] as const;

function sourcePriority(origin: UnifiedContractOrigin): number {
  if (origin === "remote") {
    return 0;
  }
  if (origin === "local") {
    return 1;
  }
  return 2;
}

function candidateTieKey(candidate: UnifiedContractCandidate): string {
  const contract = candidate.contract;
  return [
    contract.source,
    contract.dates.createdAt ?? "",
    contract.dates.importedAt ?? "",
    contract.dates.observedAt,
    contract.location.label,
  ].join("|");
}

function compareCandidates(
  left: UnifiedContractCandidate,
  right: UnifiedContractCandidate,
): number {
  const priority = sourcePriority(left.origin) - sourcePriority(right.origin);
  if (priority !== 0) {
    return priority;
  }

  return candidateTieKey(left).localeCompare(candidateTieKey(right));
}

function canonicalContractKey(contract: ActionDataContract): string {
  return `${contract.id}::${contract.type}`;
}

function dedupeContracts(
  candidates: UnifiedContractCandidate[],
): ActionDataContract[] {
  const retained = new Map<string, UnifiedContractCandidate>();

  for (const candidate of candidates) {
    const key = canonicalContractKey(candidate.contract);
    const current = retained.get(key);
    if (!current || compareCandidates(candidate, current) < 0) {
      retained.set(key, candidate);
    }
  }

  return [...retained.values()].map((candidate) => candidate.contract);
}

function filterByTypes(
  contracts: ActionDataContract[],
  types: ActionEntityType[] | null,
): ActionDataContract[] {
  if (!types || types.length === 0) {
    return contracts;
  }
  const allowed = new Set(types);
  return contracts.filter((contract) => allowed.has(contract.type));
}

function isTestLikeContract(contract: ActionDataContract): boolean {
  const haystack = [
    contract.id,
    contract.source,
    contract.location.label,
    contract.metadata.notes ?? "",
    contract.metadata.notesPlain ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return TEST_MARKERS.some((marker) => haystack.includes(marker));
}

function withDataQuality(contract: ActionDataContract): ActionDataContract {
  return {
    ...contract,
    dataQuality: contract.dataQuality ?? auditActionContract(contract),
  };
}

export function buildUnifiedActionContracts(
  remoteRows: ActionRow[],
  remoteSpots: TrashSpotterSpotRow[],
  localContracts: ActionDataContract[],
  types: ActionEntityType[] | null,
  limit: number,
): { items: ActionDataContract[]; isTruncated: boolean } {
  const candidates: UnifiedContractCandidate[] = [
    ...remoteRows.map((row) => ({
      contract: toActionContract(row),
      origin: "remote" as const,
    })),
    ...remoteSpots.map((row) => ({
      contract: toCanonicalSpotContract(row),
      origin: "remote" as const,
    })),
    ...localContracts.map((contract) => ({
      contract,
      origin: "local" as const,
    })),
  ];

  const rawContracts = filterByTypes(
    dedupeContracts(candidates),
    types,
  )
    .filter((contract) => !isTestLikeContract(contract))
    .map(withDataQuality);

  const isTruncated = rawContracts.length > limit;
  const items = rawContracts
    .sort((left, right) => {
      const observedAtOrder = right.dates.observedAt.localeCompare(left.dates.observedAt);
      if (observedAtOrder !== 0) {
        return observedAtOrder;
      }
      return canonicalContractKey(left).localeCompare(canonicalContractKey(right));
    })
    .slice(0, limit);

  return { items, isTruncated };
}

export function filterContractsByViewport(
  contracts: ActionDataContract[],
  viewport?: ActionMapViewportQuery,
): ActionDataContract[] {
  if (!viewport) {
    return contracts;
  }

  return contracts.filter((contract) => {
    const { latitude, longitude } = contract.location;
    return (
      latitude !== null &&
      longitude !== null &&
      latitude >= viewport.south &&
      latitude <= viewport.north &&
      longitude >= viewport.west &&
      longitude <= viewport.east
    );
  });
}
