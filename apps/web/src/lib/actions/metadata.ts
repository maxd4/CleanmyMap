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
  groupJoinEnabled?: boolean;
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

type ActionNotesExtractionState = {
  submissionMode: ActionSubmissionMode | null;
  wasteBreakdown: ActionWasteBreakdown | null;
  associationName: string | null;
  groupJoinEnabled: boolean;
  placeType: string | null;
  departureLocationLabel: string | null;
  arrivalLocationLabel: string | null;
  routeStyle: "direct" | "souple" | null;
  routeAdjustmentMessage: string | null;
  photos: ActionNotesMeta["photos"] | null;
  visionEstimate: ActionVisionEstimate | null;
  cleanLines: string[];
};

function hasNonEmptyText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasStructuredActionMetadata(metadata: {
  wasteBreakdown?: ActionWasteBreakdown;
  associationName?: string;
  groupJoinEnabled?: boolean;
  placeType?: string;
  departureLocationLabel?: string;
  arrivalLocationLabel?: string;
}): boolean {
  const associationName = metadata.associationName?.trim();
  const hasWasteBreakdown =
    metadata.wasteBreakdown &&
    Object.values(metadata.wasteBreakdown).some(
      (value) => value !== undefined && value !== null,
    );
  return Boolean(
    hasWasteBreakdown ||
      associationName ||
      typeof metadata.groupJoinEnabled === "boolean" ||
      metadata.placeType ||
      metadata.departureLocationLabel ||
      metadata.arrivalLocationLabel,
  );
}

function hasContentActionMetadata(metadata: {
  submissionMode?: ActionSubmissionMode;
  routeStyle?: "direct" | "souple";
  routeAdjustmentMessage?: string;
  photos?: ActionNotesMeta["photos"];
  visionEstimate?: ActionVisionEstimate | null;
}): boolean {
  return Boolean(
    metadata.submissionMode ||
      metadata.routeStyle ||
      hasNonEmptyText(metadata.routeAdjustmentMessage) ||
      metadata.photos?.length ||
      metadata.visionEstimate,
  );
}

function hasActionMetadata(
  metadata: {
    submissionMode?: ActionSubmissionMode;
    wasteBreakdown?: ActionWasteBreakdown;
    associationName?: string;
    groupJoinEnabled?: boolean;
    placeType?: string;
    departureLocationLabel?: string;
    arrivalLocationLabel?: string;
    routeStyle?: "direct" | "souple";
    routeAdjustmentMessage?: string;
    photos?: ActionNotesMeta["photos"];
    visionEstimate?: ActionVisionEstimate | null;
  },
): boolean {
  return (
    hasStructuredActionMetadata(metadata) || hasContentActionMetadata(metadata)
  );
}

function buildStructuredMetadataPayload(
  metadata: {
    submissionMode?: ActionSubmissionMode;
    wasteBreakdown?: ActionWasteBreakdown;
    associationName?: string;
    groupJoinEnabled?: boolean;
    placeType?: string;
    departureLocationLabel?: string;
    arrivalLocationLabel?: string;
  },
): ActionNotesMeta {
  const metaPayload: ActionNotesMeta = {};
  if (metadata.submissionMode) {
    metaPayload.submissionMode = metadata.submissionMode;
  }
  if (
    metadata.wasteBreakdown &&
    Object.values(metadata.wasteBreakdown).some(
      (value) => value !== undefined && value !== null,
    )
  ) {
    metaPayload.wasteBreakdown = metadata.wasteBreakdown;
  }
  if (metadata.associationName?.trim()) {
    metaPayload.associationName = metadata.associationName.trim();
  }
  if (typeof metadata.groupJoinEnabled === "boolean") {
    metaPayload.groupJoinEnabled = metadata.groupJoinEnabled;
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
  return metaPayload;
}

function buildContentMetadataPayload(
  metadata: {
    routeStyle?: "direct" | "souple";
    routeAdjustmentMessage?: string;
    photos?: ActionNotesMeta["photos"];
    visionEstimate?: ActionVisionEstimate | null;
  },
): Pick<
  ActionNotesMeta,
  "routeStyle" | "routeAdjustmentMessage" | "photos" | "visionEstimate"
> {
  const metaPayload: Pick<
    ActionNotesMeta,
    "routeStyle" | "routeAdjustmentMessage" | "photos" | "visionEstimate"
  > = {};
  if (metadata.routeStyle) {
    metaPayload.routeStyle = "souple";
  }
  if (hasNonEmptyText(metadata.routeAdjustmentMessage)) {
    metaPayload.routeAdjustmentMessage = metadata.routeAdjustmentMessage.trim();
  }
  if (metadata.photos?.length) {
    metaPayload.photos = metadata.photos;
  }
  if (metadata.visionEstimate) {
    metaPayload.visionEstimate = metadata.visionEstimate;
  }
  return metaPayload;
}

function appendMetadataLine(
  lines: string[],
  line: string,
  metadataUpdated: boolean,
  groupJoinEnabled: boolean,
): { lines: string[]; metadataUpdated: boolean } {
  const trimmed = line.trim();
  if (!trimmed.startsWith(META_PREFIX)) {
    return { lines: [...lines, line], metadataUpdated };
  }

  const parsed = safeParseMeta(trimmed.slice(META_PREFIX.length));
  if (!parsed) {
    return { lines: [...lines, line], metadataUpdated };
  }

  const nextParsed = { ...parsed };
  nextParsed.groupJoinEnabled = groupJoinEnabled;

  if (Object.keys(nextParsed).length === 0) {
    return { lines, metadataUpdated: true };
  }

  return {
    lines: [...lines, `${META_PREFIX}${JSON.stringify(nextParsed)}`],
    metadataUpdated: true,
  };
}

function initializeActionNotesExtractionState(): ActionNotesExtractionState {
  return {
    submissionMode: null,
    wasteBreakdown: null,
    associationName: null,
    groupJoinEnabled: false,
    placeType: null,
    departureLocationLabel: null,
    arrivalLocationLabel: null,
    routeStyle: null,
    routeAdjustmentMessage: null,
    photos: null,
    visionEstimate: null,
    cleanLines: [],
  };
}

function applyParsedActionNotesMeta(
  parsed: ActionNotesMeta,
  state: ActionNotesExtractionState,
): void {
  applyParsedStructuredActionNotesMeta(parsed, state);
  applyParsedContentActionNotesMeta(parsed, state);
}

function applyParsedStructuredActionNotesMeta(
  parsed: ActionNotesMeta,
  state: ActionNotesExtractionState,
): void {
  if (
    parsed.submissionMode === "quick" ||
    parsed.submissionMode === "complete"
  ) {
    state.submissionMode = parsed.submissionMode;
  }
  if (parsed.wasteBreakdown && typeof parsed.wasteBreakdown === "object") {
    state.wasteBreakdown = parsed.wasteBreakdown;
  }
  if (
    typeof parsed.associationName === "string" &&
    parsed.associationName.trim().length > 0
  ) {
    state.associationName = parsed.associationName.trim();
  }
  if (typeof parsed.groupJoinEnabled === "boolean") {
    state.groupJoinEnabled = parsed.groupJoinEnabled;
  }
  if (
    typeof parsed.departureLocationLabel === "string" &&
    parsed.departureLocationLabel.trim().length > 0
  ) {
    state.departureLocationLabel = parsed.departureLocationLabel.trim();
  }
  if (
    typeof parsed.arrivalLocationLabel === "string" &&
    parsed.arrivalLocationLabel.trim().length > 0
  ) {
    state.arrivalLocationLabel = parsed.arrivalLocationLabel.trim();
  }
}

function applyParsedContentActionNotesMeta(
  parsed: ActionNotesMeta,
  state: ActionNotesExtractionState,
): void {
  if (parsed.routeStyle === "direct" || parsed.routeStyle === "souple") {
    state.routeStyle = "souple";
  }
  if (
    typeof parsed.routeAdjustmentMessage === "string" &&
    parsed.routeAdjustmentMessage.trim().length > 0
  ) {
    state.routeAdjustmentMessage = parsed.routeAdjustmentMessage.trim();
  }
  if (
    typeof parsed.placeType === "string" &&
    parsed.placeType.trim().length > 0
  ) {
    state.placeType = parsed.placeType.trim();
  }
  if (Array.isArray(parsed.photos)) {
    state.photos = parsed.photos;
  }
  if (parsed.visionEstimate && typeof parsed.visionEstimate === "object") {
    state.visionEstimate = parsed.visionEstimate;
  }
}

export function appendActionMetadataToNotes(
  baseNotes: string | undefined,
  metadata: {
    submissionMode?: ActionSubmissionMode;
    wasteBreakdown?: ActionWasteBreakdown;
    associationName?: string;
    groupJoinEnabled?: boolean;
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
  if (!hasActionMetadata(metadata)) {
    return trimmedBase || null;
  }

  const metaPayload = {
    ...buildStructuredMetadataPayload(metadata),
    ...buildContentMetadataPayload(metadata),
  };
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
  groupJoinEnabled: boolean;
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
      groupJoinEnabled: false,
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
  const state = initializeActionNotesExtractionState();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(META_PREFIX)) {
      const legacyAssociationMatch = trimmed.match(/^association\s*:\s*(.+)$/i);
      if (legacyAssociationMatch) {
        const legacyAssociation = legacyAssociationMatch[1]?.trim();
        if (legacyAssociation) {
          state.associationName = legacyAssociation;
        }
        continue;
      }
      state.cleanLines.push(line);
      continue;
    }
    const parsed = safeParseMeta(trimmed.slice(META_PREFIX.length));
    if (!parsed) {
      continue;
    }
    applyParsedActionNotesMeta(parsed, state);
  }

  const cleanNotes = state.cleanLines
    .map((line) => (line.trim() === INGESTION_SYNC_MARKER ? "" : line))
    .filter((line) => line.trim().length > 0)
    .join("\n")
    .trim();
  return {
    cleanNotes: cleanNotes.length > 0 ? cleanNotes : null,
    submissionMode: state.submissionMode,
    wasteBreakdown: state.wasteBreakdown,
    associationName: state.associationName,
    groupJoinEnabled: state.groupJoinEnabled,
    placeType: state.placeType,
    departureLocationLabel: state.departureLocationLabel,
    arrivalLocationLabel: state.arrivalLocationLabel,
    routeStyle: state.routeStyle,
    routeAdjustmentMessage: state.routeAdjustmentMessage,
    photos: state.photos,
    visionEstimate: state.visionEstimate,
  };
}

export function setActionGroupJoinEnabledInNotes(
  notes: string | null | undefined,
  groupJoinEnabled: boolean,
): string | null {
  const source = notes ?? "";
  const lines = source.split(/\r?\n/);
  const outputLines: string[] = [];
  let metadataUpdated = false;

  for (const line of lines) {
    const updated = appendMetadataLine(outputLines, line, metadataUpdated, groupJoinEnabled);
    outputLines.splice(0, outputLines.length, ...updated.lines);
    metadataUpdated = updated.metadataUpdated;
  }

  if (!metadataUpdated) {
    outputLines.push(
      `${META_PREFIX}${JSON.stringify({ groupJoinEnabled })}`,
    );
  }

  const normalized = outputLines.join("\n").trim();
  return normalized.length > 0 ? normalized : null;
}

export function deriveActionTitleFromMetadata(params: {
  associationName?: string | null;
  actorName?: string | null;
  locationLabel?: string | null;
  fallback?: string;
}): string {
  const associationName = params.associationName?.trim();
  if (associationName) {
    return associationName;
  }

  const actorName = params.actorName?.trim();
  if (actorName) {
    return actorName;
  }

  const locationLabel = params.locationLabel?.trim();
  if (locationLabel) {
    return locationLabel;
  }

  return params.fallback ?? "Action sans structure";
}
