import type {
  ActionSubmissionMode,
  ActionWasteBreakdown,
} from "@/lib/actions/types";

const META_PREFIX = "[cmm-meta]";

type ActionNotesMeta = {
  submissionMode?: ActionSubmissionMode;
  wasteBreakdown?: ActionWasteBreakdown;
  associationName?: string;
  placeType?: string;
};

function safeParseMeta(raw: string): ActionNotesMeta | null {
  try {
    const parsed = JSON.parse(raw) as ActionNotesMeta;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function appendActionMetadataToNotes(
  baseNotes: string | undefined,
  metadata: {
    submissionMode?: ActionSubmissionMode;
    wasteBreakdown?: ActionWasteBreakdown;
    associationName?: string;
    placeType?: string;
  },
): string | null {
  const trimmedBase = (baseNotes ?? "").trim();
  const associationName = metadata.associationName?.trim();
  const hasWasteBreakdown =
    metadata.wasteBreakdown &&
    Object.values(metadata.wasteBreakdown).some(
      (value) => value !== undefined && value !== null,
    );
  const hasMetadata =
    metadata.submissionMode ||
    hasWasteBreakdown ||
    associationName ||
    metadata.placeType;
  if (!hasMetadata) {
    return trimmedBase || null;
  }

  const metaPayload: ActionNotesMeta = {};
  if (metadata.submissionMode) {
    metaPayload.submissionMode = metadata.submissionMode;
  }
  if (hasWasteBreakdown) {
    metaPayload.wasteBreakdown = metadata.wasteBreakdown;
  }
  if (associationName) {
    metaPayload.associationName = associationName;
  }
  if (metadata.placeType) {
    metaPayload.placeType = metadata.placeType;
  }

  const encoded = `${META_PREFIX}${JSON.stringify(metaPayload)}`;
  return trimmedBase ? `${trimmedBase}\n${encoded}` : encoded;
}

export function extractActionMetadataFromNotes(
  notes: string | null | undefined,
): {
  cleanNotes: string | null;
  submissionMode: ActionSubmissionMode | null;
  wasteBreakdown: ActionWasteBreakdown | null;
  associationName: string | null;
  placeType: string | null;
} {
  if (!notes) {
    return {
      cleanNotes: null,
      submissionMode: null,
      wasteBreakdown: null,
      associationName: null,
      placeType: null,
    };
  }

  const lines = notes.split(/\r?\n/);
  let submissionMode: ActionSubmissionMode | null = null;
  let wasteBreakdown: ActionWasteBreakdown | null = null;
  let associationName: string | null = null;
  const placeType: string | null = null;
  const cleanLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(META_PREFIX)) {
      const legacyAssociationMatch = trimmed.match(/^association\s*:\s*(.+)$/i);
      if (legacyAssociationMatch) {
        const legacyAssociation = legacyAssociationMatch[1]?.trim();
        if (legacyAssociation) {
          associationName = legacyAssociation;
        }
        continue;
      }
      cleanLines.push(line);
      continue;
    }
    const parsed = safeParseMeta(trimmed.slice(META_PREFIX.length));
    if (!parsed) {
      continue;
    }
    if (
      parsed.submissionMode === "quick" ||
      parsed.submissionMode === "complete"
    ) {
      submissionMode = parsed.submissionMode;
    }
    if (parsed.wasteBreakdown && typeof parsed.wasteBreakdown === "object") {
      wasteBreakdown = parsed.wasteBreakdown;
    }
    if (
      typeof parsed.associationName === "string" &&
      parsed.associationName.trim().length > 0
    ) {
      associationName = parsed.associationName.trim();
    }
  }

  const cleanNotes = cleanLines.join("\n").trim();
  return {
    cleanNotes: cleanNotes.length > 0 ? cleanNotes : null,
    submissionMode,
    wasteBreakdown,
    associationName,
    placeType,
  };
}
