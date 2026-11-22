import type { PersonalAiImportRow } from "./ai-personal-import";

export type PersonalAiStoredImport = {
  source_identity_hash: string | null;
  normalized_content_hash: string | null;
  import_metadata: { provider?: string; granularity?: string; completeness?: string } | null;
  declaration: { periodStartUtc?: string | null; periodEndUtc?: string | null; modelRaw?: string | null; modelCanonical?: string | null };
  status: "ACTIVE" | "EXCLUDED";
};

export type PersonalAiImportStatus = "READY" | "PARTIAL" | "DUPLICATE" | "REVISION" | "CONFLICT" | "REJECTED";
export type PersonalAiImportPreviewItem = {
  row: PersonalAiImportRow;
  status: PersonalAiImportStatus;
  conflictsWith: readonly number[];
};

function sameKnownModel(left: PersonalAiStoredImport["declaration"], right: PersonalAiImportRow["declaration"]): boolean {
  const leftNames = [left.modelCanonical, left.modelRaw].filter((value): value is string => Boolean(value));
  const rightNames = [right.modelCanonical, right.modelRaw].filter((value): value is string => Boolean(value));
  if (leftNames.length === 0 && rightNames.length === 0) return true;
  return leftNames.some((name) => rightNames.includes(name));
}

export function previewPersonalAiImport(
  incoming: readonly PersonalAiImportRow[],
  existing: readonly PersonalAiStoredImport[] = [],
): readonly PersonalAiImportPreviewItem[] {
  const accepted: Array<{ row: PersonalAiImportRow; status: PersonalAiImportStatus; conflictsWith: number[] }> = incoming.map((row) => ({
    row, status: row.metadata.completeness === "COMPLETE" ? "READY" : "PARTIAL", conflictsWith: [],
  }));
  const priorRows = [...existing, ...accepted.map(({ row }) => ({
    source_identity_hash: row.sourceIdentityHash,
    normalized_content_hash: row.normalizedContentHash,
    import_metadata: row.metadata,
    declaration: row.declaration,
    status: "ACTIVE" as const,
  }))];

  accepted.forEach((candidate, incomingIndex) => {
    const sourceRowIndex = existing.length + incomingIndex;
    for (let otherIndex = 0; otherIndex < sourceRowIndex; otherIndex += 1) {
      const other = priorRows[otherIndex];
      if (other.status !== "ACTIVE") continue;
      if (other.source_identity_hash === candidate.row.sourceIdentityHash) {
        if (other.normalized_content_hash === candidate.row.normalizedContentHash) {
          candidate.status = "DUPLICATE";
        } else if (otherIndex < existing.length) candidate.status = "REVISION";
        else {
          candidate.status = "CONFLICT";
          accepted[otherIndex - existing.length].status = "CONFLICT";
        }
        candidate.conflictsWith.push(otherIndex);
        continue;
      }
      if (other.declaration.periodStartUtc && other.declaration.periodEndUtc
        && other.declaration.periodStartUtc < (candidate.row.declaration.periodEndUtc ?? "")
        && (candidate.row.declaration.periodStartUtc ?? "") < other.declaration.periodEndUtc
        && other.import_metadata?.provider === candidate.row.metadata.provider
        && sameKnownModel(other.declaration, candidate.row.declaration)) {
        candidate.status = "CONFLICT";
        candidate.conflictsWith.push(otherIndex);
        if (otherIndex >= existing.length) accepted[otherIndex - existing.length].status = "CONFLICT";
      }
    }
  });
  return accepted;
}
