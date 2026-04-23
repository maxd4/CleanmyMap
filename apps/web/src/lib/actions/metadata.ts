import type {
  ActionSubmissionMode,
  ActionWasteBreakdown,
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";

const META_PREFIX = "[cmm-meta]";
const INGESTION_SYNC_MARKER = "[google-sheet-sync]";

type ActionNotesMeta = {
  submissionMode?: ActionSubmissionMode;
  wasteBreakdown?: ActionWasteBreakdown;
  associationName?: string;
  placeType?: string;
  departureLocationLabel?: string;
  arrivalLocationLabel?: string;
  routeStyle?: "direct" | "souple";
  routeAdjustmentMessage?: string;
  photos?: Pick<ActionPhotoAsset, "id" | "name" | "mimeType" | "size" | "width" | "height">[];
  visionEstimate?: ActionVisionEstimate;
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
    departureLocationLabel?: string;
    arrivalLocationLabel?: string;
    routeStyle?: "direct" | "souple";
    routeAdjustmentMessage?: string;
    photos?: ActionNotesMeta["photos"];
    visionEstimate?: ActionVisionEstimate | null;
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
    metadata.placeType ||
    metadata.departureLocationLabel ||
    metadata.arrivalLocationLabel ||
    metadata.routeStyle ||
    Boolean(metadata.routeAdjustmentMessage?.trim()) ||
    Boolean(metadata.photos?.length) ||
    Boolean(metadata.visionEstimate);
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
  if (metadata.departureLocationLabel) {
    metaPayload.departureLocationLabel = metadata.departureLocationLabel;
  }
  if (metadata.arrivalLocationLabel) {
    metaPayload.arrivalLocationLabel = metadata.arrivalLocationLabel;
  }
  if (metadata.routeStyle) {
    metaPayload.routeStyle = metadata.routeStyle;
  }
  if (metadata.routeAdjustmentMessage?.trim()) {
    metaPayload.routeAdjustmentMessage = metadata.routeAdjustmentMessage.trim();
  }
  if (metadata.photos?.length) {
    metaPayload.photos = metadata.photos;
  }
  if (metadata.visionEstimate) {
    metaPayload.visionEstimate = metadata.visionEstimate;
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
  departureLocationLabel: string | null;
  arrivalLocationLabel: string | null;
  routeStyle: "direct" | "souple" | null;
  routeAdjustmentMessage: string | null;
  photos: ActionNotesMeta["photos"] | null;
  visionEstimate: ActionVisionEstimate | null;
} {
  if (!notes) {
    return {
      cleanNotes: null,
      submissionMode: null,
      wasteBreakdown: null,
      associationName: null,
      placeType: null,
      departureLocationLabel: null,
      arrivalLocationLabel: null,
      routeStyle: null,
      routeAdjustmentMessage: null,
      photos: null,
      visionEstimate: null,
    };
  }

  const lines = notes.split(/\r?\n/);
  let submissionMode: ActionSubmissionMode | null = null;
  let wasteBreakdown: ActionWasteBreakdown | null = null;
  let associationName: string | null = null;
  let placeType: string | null = null;
  let departureLocationLabel: string | null = null;
  let arrivalLocationLabel: string | null = null;
  let routeStyle: "direct" | "souple" | null = null;
  let routeAdjustmentMessage: string | null = null;
  let photos: ActionNotesMeta["photos"] | null = null;
  let visionEstimate: ActionVisionEstimate | null = null;
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
    if (
      typeof parsed.departureLocationLabel === "string" &&
      parsed.departureLocationLabel.trim().length > 0
    ) {
      departureLocationLabel = parsed.departureLocationLabel.trim();
    }
    if (
      typeof parsed.arrivalLocationLabel === "string" &&
      parsed.arrivalLocationLabel.trim().length > 0
    ) {
      arrivalLocationLabel = parsed.arrivalLocationLabel.trim();
    }
    if (parsed.routeStyle === "direct" || parsed.routeStyle === "souple") {
      routeStyle = parsed.routeStyle;
    }
    if (
      typeof parsed.routeAdjustmentMessage === "string" &&
      parsed.routeAdjustmentMessage.trim().length > 0
    ) {
      routeAdjustmentMessage = parsed.routeAdjustmentMessage.trim();
    }
    if (
      typeof parsed.placeType === "string" &&
      parsed.placeType.trim().length > 0
    ) {
      placeType = parsed.placeType.trim();
    }
    if (Array.isArray(parsed.photos)) {
      photos = parsed.photos;
    }
    if (parsed.visionEstimate && typeof parsed.visionEstimate === "object") {
      visionEstimate = parsed.visionEstimate;
    }
  }

  const cleanNotes = cleanLines
    .map((line) => line.trim() === INGESTION_SYNC_MARKER ? "" : line)
    .filter((line) => line.trim().length > 0)
    .join("\n")
    .trim();
  return {
    cleanNotes: cleanNotes.length > 0 ? cleanNotes : null,
    submissionMode,
    wasteBreakdown,
    associationName,
    placeType,
    departureLocationLabel,
    arrivalLocationLabel,
    routeStyle,
    routeAdjustmentMessage,
    photos,
    visionEstimate,
  };
}
