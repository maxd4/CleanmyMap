import type {
  ActionFormalitiesFacts,
  ActionFormalitiesQualification,
  FormalityProcedureKind,
  FormalityRequirementStatus,
} from "./qualification";
import {
  actionFormalitiesFactsSchema,
  snapshotFormalitiesFacts,
  type FormalitiesFactsSnapshot,
} from "./facts";

export {
  actionFormalitiesFactsSchema,
  deriveActionFormalitiesFacts,
} from "./facts";

const ACTION_FORMALITIES_WORKFLOW_SCHEMA_VERSION =
  "action-formalities-workflow-v1" as const;

type FormalitiesUserStatus = "not_started" | "prepared" | "sent" | "receipt_received" | "authorization_obtained" | "refused";

type FormalitySendProof = {
  kind: "user_declared" | "official_confirmation";
  reference: string | null;
  recordedAt: string;
};

type ActionFormalityProgress = {
  formalityId: string;
  userStatus: FormalitiesUserStatus;
  contentVersion: string;
  statusChangedAt: string | null;
  proof: FormalitySendProof | null;
  active: boolean;
  validForQualification: boolean;
  invalidatedAt: string | null;
};

type ActionFormalitiesTrace = {
  qualifiedAt: string;
  rulesetVersion: string | null;
  officialSourceIds: string[];
  officialSources: Array<{
    id: string;
    url: string;
    authorityLevel: "municipal" | "police" | "national";
    verifiedOn: string;
  }>;
  verifiedOn: string | null;
  /** Versioned canonical representation of dependencies affecting venue/date rules. */
  actionDependencyFingerprint: string;
  /** Normalized persisted action location; used to retain territorial duties only during provider outages. */
  actionLocationFingerprint?: string | null;
  determiningFacts: FormalitiesFactsSnapshot;
  formalities: Array<{
    id: string;
    requirementStatus: FormalityRequirementStatus;
    procedureKind: FormalityProcedureKind;
    sourceId: string | null;
  }>;
};

const ACTION_DEPENDENCY_FINGERPRINT_VERSION = "canonical-v3" as const;

export type ActionFormalitiesWorkflowState = {
  schemaVersion: typeof ACTION_FORMALITIES_WORKFLOW_SCHEMA_VERSION;
  contentVersion: string;
  trace: ActionFormalitiesTrace;
  progress: ActionFormalityProgress[];
};

export type FormalitiesWorkflowTransition = {
  formalityId: string;
  kind: "mark_prepared" | "declare_sent" | "record_receipt" | "record_authorization" | "record_refusal";
  proofReference?: string | null;
};
export type FormalitiesTransitionKind = FormalitiesWorkflowTransition["kind"];

/** The server supplies the same legal workflow choices to Web and native clients. */
export function availableFormalitiesTransitions(
  formality: Pick<ActionFormalitiesQualification["formalities"][number], "procedureKind">,
  progress: ActionFormalityProgress | undefined,
): FormalitiesTransitionKind[] {
  if (!progress?.active || !progress.validForQualification) return ["mark_prepared"];
  if (progress.userStatus === "not_started" || progress.userStatus === "refused") return ["mark_prepared"];
  if (progress.userStatus === "prepared") return ["declare_sent"];
  if (progress.userStatus === "sent") {
    return formality.procedureKind === "city_aot" || formality.procedureKind === "police_authorization" || formality.procedureKind === "other_manager"
      ? ["record_receipt", "record_authorization", "record_refusal"]
      : ["record_receipt"];
  }
  if (progress.userStatus === "receipt_received") {
    return formality.procedureKind === "city_aot" || formality.procedureKind === "police_authorization" || formality.procedureKind === "other_manager"
      ? ["record_authorization", "record_refusal"]
      : ["record_refusal"];
  }
  return [];
}

function isMeaningful(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIso8601Timestamp(value: unknown): value is string {
  return typeof value === "string" &&
    value === value.trim() &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableMeaningfulString(value: unknown): value is string | null {
  return value === null || isMeaningful(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFormalitySendProof(value: unknown): value is FormalitySendProof {
  if (!isRecord(value)) return false;
  const proof = value as Partial<FormalitySendProof>;
  return (
    (proof.kind === "user_declared" || proof.kind === "official_confirmation") &&
    (proof.reference === null || typeof proof.reference === "string") &&
    isIso8601Timestamp(proof.recordedAt)
  );
}

function isCanonicalOfficialSource(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isMeaningful(value.id) &&
    isMeaningful(value.url) &&
    ["municipal", "police", "national"].includes(value.authorityLevel as string) &&
    isMeaningful(value.verifiedOn);
}

function isCanonicalTraceFormality(value: unknown): value is ActionFormalitiesTrace["formalities"][number] {
  if (!isRecord(value)) return false;
  return isMeaningful(value.id) &&
    ["required", "recommended", "not_required", "unknown"].includes(value.requirementStatus as string) &&
    ["city_aot", "police_declaration", "police_authorization", "other_manager", "information_only", "none", "unknown"].includes(value.procedureKind as string) &&
    (value.sourceId === null || isMeaningful(value.sourceId));
}

function hasUniqueMeaningfulStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isMeaningful) && new Set(value).size === value.length;
}

function hasCanonicalOfficialSources(value: unknown): value is ActionFormalitiesTrace["officialSources"] {
  return Array.isArray(value) && value.every(isCanonicalOfficialSource) &&
    new Set(value.map((source) => (source as { id: string }).id)).size === value.length;
}

function hasCanonicalFormalities(value: unknown): value is ActionFormalitiesTrace["formalities"] {
  return Array.isArray(value) && value.every(isCanonicalTraceFormality) &&
    new Set(value.map((formality) => formality.id)).size === value.length;
}

function isCanonicalFormalitiesTrace(value: unknown): value is ActionFormalitiesTrace {
  if (!isRecord(value)) return false;
  return [
    isIso8601Timestamp(value.qualifiedAt),
    isNullableMeaningfulString(value.rulesetVersion),
    hasUniqueMeaningfulStrings(value.officialSourceIds),
    hasCanonicalOfficialSources(value.officialSources),
    isNullableString(value.verifiedOn) && (value.verifiedOn === null || isMeaningful(value.verifiedOn)),
    isMeaningful(value.actionDependencyFingerprint),
    value.actionLocationFingerprint === undefined || value.actionLocationFingerprint === null || isMeaningful(value.actionLocationFingerprint),
    actionFormalitiesFactsSchema.safeParse(value.determiningFacts).success,
    hasCanonicalFormalities(value.formalities),
  ].every(Boolean);
}

function isCanonicalProgress(value: unknown): value is ActionFormalityProgress {
  if (!isRecord(value)) return false;
  return isMeaningful(value.formalityId) &&
    ["not_started", "prepared", "sent", "receipt_received", "authorization_obtained", "refused"].includes(value.userStatus as string) &&
    isMeaningful(value.contentVersion) &&
    (value.statusChangedAt === null || isIso8601Timestamp(value.statusChangedAt)) &&
    (value.proof === null || isFormalitySendProof(value.proof)) &&
    typeof value.active === "boolean" &&
    typeof value.validForQualification === "boolean" &&
    (value.invalidatedAt === null || isIso8601Timestamp(value.invalidatedAt));
}

function dependencyKeysForFormality(formalityId: string): Array<keyof FormalitiesFactsSnapshot> {
  switch (formalityId) {
    case "paris-city-public-domain-aot":
      return ["publicSpace", "manager", "hasInstallations", "requiresPhysicalOccupation"];
    case "paris-police-public-roadway-declaration":
      return [
        "publicSpace",
        "isPublicRoadwayActivity",
        "isClaiming",
        "isCortegeOrGathering",
        "isItinerant",
        "hasInstallations",
        "largeCrowdOrComplexInstallations",
      ];
    case "non-municipal-public-domain-manager-authorization":
      return ["publicSpace", "manager", "hasInstallations", "requiresPhysicalOccupation"];
    case "local-customary-public-roadway-outing":
      return ["publicSpace", "localCustomaryUse"];
    case "identify-public-space-manager":
      return ["publicSpace", "manager"];
    default:
      return [
        "territory",
        "publicSpace",
        "manager",
        "isCleanwalk",
        "isPublicRoadwayActivity",
        "isItinerant",
        "isClaiming",
        "isCortegeOrGathering",
        "hasInstallations",
        "requiresPhysicalOccupation",
        "localCustomaryUse",
        "largeCrowdOrComplexInstallations",
      ];
  }
}

function dependencyChanged(
  formalityId: string,
  previous: FormalitiesFactsSnapshot | null,
  next: FormalitiesFactsSnapshot,
  actionDependenciesChanged: boolean,
): boolean {
  if (!previous || actionDependenciesChanged) return true;
  return dependencyKeysForFormality(formalityId).some(
    (key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]),
  );
}

function normalizeDependencyValue(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function actionDependencyFingerprint(params: {
  locationLabel?: string | null;
  actionDate?: string | null;
  territoryFingerprint?: string | null;
  locationFingerprint?: string | null;
}): string {
  const territoryFingerprint = normalizeDependencyValue(params.territoryFingerprint);
  return `${ACTION_DEPENDENCY_FINGERPRINT_VERSION}:${JSON.stringify({
    territoryFingerprint,
    locationFingerprint: normalizeDependencyValue(params.locationFingerprint),
    locationLabel: territoryFingerprint === null
      ? normalizeDependencyValue(params.locationLabel)
      : null,
    actionDate: normalizeDependencyValue(params.actionDate),
  })}`;
}

function actionDependencyTraceChanged(previousFingerprint: string, currentFingerprint: string): boolean {
  // FNV traces are intentionally never accepted as equivalent to the
  // canonical representation. The first read after this change requalifies
  // the workflow and persists the new trace.
  return previousFingerprint.startsWith("fnv1a-") || previousFingerprint !== currentFingerprint;
}

function contentVersionForQualification(
  qualification: ActionFormalitiesQualification,
): string {
  return [
    qualification.schemaVersion,
    qualification.rulesetVersion ?? "unknown-ruleset",
    ...qualification.formalities
      .map((formality) => `${formality.id}:${formality.requirementStatus}:${formality.procedureKind}`)
      .sort((left, right) => left < right ? -1 : left > right ? 1 : 0),
  ].join("|");
}

function buildTrace(
  qualification: ActionFormalitiesQualification,
  facts: ActionFormalitiesFacts,
  actionDependencies: {
    locationLabel?: string | null;
    actionDate?: string | null;
    territoryFingerprint?: string | null;
    locationFingerprint?: string | null;
  },
  now: string,
): ActionFormalitiesTrace {
  const sources = qualification.formalities.flatMap((formality) => [
    formality.source,
    ...formality.supportingSources,
  ]).filter((source) => source !== null);
  const verifiedOn = qualification.formalities
    .flatMap((formality) => [
      formality.source?.verifiedOn ?? null,
      ...formality.supportingSources.map((source) => source.verifiedOn),
    ])
    .find((value) => Boolean(value)) ?? null;

  return {
    qualifiedAt: now,
    rulesetVersion: qualification.rulesetVersion,
  officialSourceIds: [...new Set(sources.map((source) => source.id))],
    officialSources: [...new Map(
      sources.map((source) => [source.id, {
        id: source.id,
        url: source.url,
        authorityLevel: source.authorityLevel,
        verifiedOn: source.verifiedOn,
      }]),
    ).values()],
    verifiedOn,
    actionDependencyFingerprint: actionDependencyFingerprint(actionDependencies),
    actionLocationFingerprint: normalizeDependencyValue(actionDependencies.locationFingerprint),
    determiningFacts: snapshotFormalitiesFacts(facts),
    formalities: qualification.formalities.map((formality) => ({
      id: formality.id,
      requirementStatus: formality.requirementStatus,
      procedureKind: formality.procedureKind,
      sourceId: formality.source?.id ?? null,
    })),
  };
}

function normalProgress(formalityId: string, contentVersion: string): ActionFormalityProgress {
  return {
    formalityId,
    userStatus: "not_started",
    contentVersion,
    statusChangedAt: null,
    proof: null,
    active: true,
    validForQualification: true,
    invalidatedAt: null,
  };
}

export function buildFormalitiesWorkflowState(params: {
  qualification: ActionFormalitiesQualification;
  facts: ActionFormalitiesFacts;
  previous?: ActionFormalitiesWorkflowState | null;
  actionDependencies?: {
    locationLabel?: string | null;
    actionDate?: string | null;
    territoryFingerprint?: string | null;
    locationFingerprint?: string | null;
  };
  now?: string;
}): ActionFormalitiesWorkflowState {
  const now = params.now ?? new Date().toISOString();
  const actionDependencies = params.actionDependencies ?? {};
  const currentActionDependencyFingerprint = actionDependencyFingerprint(actionDependencies);
  const contentVersion = contentVersionForQualification(params.qualification);
  const previousFacts = params.previous?.trace.determiningFacts ?? null;
  const previousFormalitiesById = new Map(
    (params.previous?.trace.formalities ?? []).map((formality) => [formality.id, formality]),
  );
  const rulesetChanged = params.previous !== undefined && params.previous !== null &&
    params.previous.trace.rulesetVersion !== params.qualification.rulesetVersion;
  const actionDependenciesChanged =
    params.previous !== undefined &&
    params.previous !== null &&
    actionDependencyTraceChanged(
      params.previous.trace.actionDependencyFingerprint,
      currentActionDependencyFingerprint,
    );
  const previousById = new Map(
    (params.previous?.progress ?? []).map((progress) => [progress.formalityId, progress]),
  );
  const activeIds = new Set(params.qualification.formalities.map((formality) => formality.id));
  const progress: ActionFormalityProgress[] = params.qualification.formalities.map((formality): ActionFormalityProgress => {
    const previous = previousById.get(formality.id);
    if (!previous) return normalProgress(formality.id, contentVersion);

    const invalidated = dependencyChanged(
      formality.id,
      previousFacts,
      params.facts,
      actionDependenciesChanged,
    );
    const previousRule = previousFormalitiesById.get(formality.id);
    const qualificationChanged = rulesetChanged || !previousRule ||
      previousRule.requirementStatus !== formality.requirementStatus ||
      previousRule.procedureKind !== formality.procedureKind ||
      previousRule.sourceId !== (formality.source?.id ?? null);
    return {
      ...previous,
      contentVersion,
      active: true,
      validForQualification: previous.validForQualification && !invalidated && !qualificationChanged,
      invalidatedAt: invalidated || qualificationChanged ? previous.invalidatedAt ?? now : previous.invalidatedAt,
    };
  });

  for (const previous of params.previous?.progress ?? []) {
    if (activeIds.has(previous.formalityId)) continue;
    progress.push({
      ...previous,
      active: false,
      validForQualification: false,
      invalidatedAt: previous.invalidatedAt ?? now,
    });
  }

  return {
    schemaVersion: ACTION_FORMALITIES_WORKFLOW_SCHEMA_VERSION,
    contentVersion,
    trace: buildTrace(params.qualification, params.facts, actionDependencies, now),
    progress,
  };
}

export function applyFormalitiesWorkflowTransition(params: {
  workflow: ActionFormalitiesWorkflowState;
  transition: FormalitiesWorkflowTransition;
  now?: string;
}): ActionFormalitiesWorkflowState {
  const now = params.now ?? new Date().toISOString();
  const progress: ActionFormalityProgress[] = params.workflow.progress.map((item): ActionFormalityProgress => {
    if (item.formalityId !== params.transition.formalityId || !item.active) return item;
    if (item.userStatus === "authorization_obtained" && item.validForQualification) return item;
    if (params.transition.kind === "declare_sent" && item.userStatus !== "prepared") return item;
    if (params.transition.kind === "record_receipt" && item.userStatus !== "sent") return item;
    if (params.transition.kind === "record_authorization" && !["sent", "receipt_received"].includes(item.userStatus)) return item;
    if (params.transition.kind === "record_refusal" && !["sent", "receipt_received"].includes(item.userStatus)) return item;

    if (params.transition.kind === "mark_prepared") {
      return {
        ...item,
        userStatus: "prepared",
        statusChangedAt: now,
        proof: item.validForQualification ? null : item.proof,
        validForQualification: true,
        invalidatedAt: null,
      };
    }

    const userStatus: FormalitiesUserStatus = params.transition.kind === "declare_sent" ? "sent"
      : params.transition.kind === "record_receipt" ? "receipt_received"
        : params.transition.kind === "record_authorization" ? "authorization_obtained"
          : params.transition.kind === "record_refusal" ? "refused" : item.userStatus;
    return {
      ...item,
      userStatus,
      statusChangedAt: now,
      proof: {
        kind: "user_declared",
        reference: isMeaningful(params.transition.proofReference)
          ? params.transition.proofReference.trim().slice(0, 500)
          : null,
        recordedAt: now,
      },
    };
  });

  return { ...params.workflow, progress };
}

export function normalizeActionFormalitiesWorkflow(
  value: unknown,
): ActionFormalitiesWorkflowState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ActionFormalitiesWorkflowState>;
  if (
    candidate.schemaVersion !== ACTION_FORMALITIES_WORKFLOW_SCHEMA_VERSION ||
    !isMeaningful(candidate.contentVersion) ||
    !isCanonicalFormalitiesTrace(candidate.trace) ||
    !Array.isArray(candidate.progress)
  ) {
    return null;
  }
  if (!candidate.progress.every(isCanonicalProgress)) return null;

  const traceFormalityIds = new Set(candidate.trace.formalities.map((formality) => formality.id));
  const progressIds = candidate.progress.map((progress) => progress.formalityId);
  if (new Set(progressIds).size !== progressIds.length) return null;
  if (candidate.progress.some((progress) => progress.active && progress.contentVersion !== candidate.contentVersion)) {
    return null;
  }
  const activeProgressIds = new Set(
    candidate.progress
      .filter((progress) => progress.active)
      .map((progress) => progress.formalityId),
  );
  if (activeProgressIds.size !== traceFormalityIds.size) return null;
  if ([...traceFormalityIds].some((formalityId) => !activeProgressIds.has(formalityId))) return null;
  if ([...activeProgressIds].some((formalityId) => !traceFormalityIds.has(formalityId))) return null;

  return value as ActionFormalitiesWorkflowState;
}

/** Generic action PATCHes cannot create, reset, or delete this server-managed state. */
export function preserveCanonicalFormalitiesWorkflow(
  currentPreparationData: Record<string, unknown> | null | undefined,
  incomingPreparationData: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const current = currentPreparationData ?? {};
  const incoming = { ...(incomingPreparationData ?? {}) };
  delete incoming.formalitiesWorkflow;
  if (Object.prototype.hasOwnProperty.call(current, "formalitiesWorkflow")) {
    incoming.formalitiesWorkflow = current.formalitiesWorkflow;
  }
  return incoming;
}

/** Keep a dedicated qualification context when an older form omits that field. */
export function preserveFormalitiesContextWhenOmitted(
  currentPreparationData: Record<string, unknown> | null | undefined,
  incomingPreparationData: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const current = currentPreparationData ?? {};
  const incoming = { ...(incomingPreparationData ?? {}) };
  if (
    !Object.prototype.hasOwnProperty.call(incoming, "formalitiesContext") &&
    Object.prototype.hasOwnProperty.call(current, "formalitiesContext")
  ) {
    incoming.formalitiesContext = current.formalitiesContext;
  }
  return incoming;
}

export function sanitizeFormalitiesWorkflowForCreation<T extends Record<string, unknown>>(
  preparationData: T,
): Omit<T, "formalitiesWorkflow"> {
  const next = { ...preparationData };
  delete next.formalitiesWorkflow;
  return next;
}

export function isFormalitiesPublicationBlocked(
  qualification: ActionFormalitiesQualification,
  workflow: ActionFormalitiesWorkflowState,
): boolean {
  return getBlockedRequiredFormalityIds(qualification, workflow).length > 0;
}

export function getBlockedRequiredFormalityIds(
  qualification: ActionFormalitiesQualification,
  workflow: ActionFormalitiesWorkflowState,
): string[] {
  const progressById = new Map(
    workflow.progress.map((progress) => [progress.formalityId, progress]),
  );
  return qualification.formalities.filter((formality) => {
    if (formality.requirementStatus !== "required") return false;
    const progress = progressById.get(formality.id);
    const acceptedStatuses = formality.procedureKind === "city_aot" || formality.procedureKind === "police_authorization" || formality.procedureKind === "other_manager"
      ? ["authorization_obtained"]
      : formality.procedureKind === "police_declaration"
        ? ["receipt_received", "authorization_obtained"]
        : ["sent", "receipt_received", "authorization_obtained"];
    return !progress ||
      !progress.active ||
      !progress.validForQualification ||
      !acceptedStatuses.includes(progress.userStatus) ||
      !isFormalitySendProof(progress.proof);
  }).map((formality) => formality.id);
}
