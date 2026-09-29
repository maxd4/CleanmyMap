import type {
  ActionFormalitiesFacts,
  ActionFormalitiesQualification,
  FormalityProcedureKind,
  FormalityRequirementStatus,
} from "./formalities-qualification";
import {
  snapshotFormalitiesFacts,
  type FormalitiesFactsSnapshot,
} from "./formalities-facts";

export {
  actionFormalitiesFactsSchema,
  deriveActionFormalitiesFacts,
} from "./formalities-facts";

const ACTION_FORMALITIES_WORKFLOW_SCHEMA_VERSION =
  "action-formalities-workflow-v1" as const;

type FormalitiesUserStatus = "not_started" | "prepared" | "sent";

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
  /** Stable, non-reversible marker for action dependencies that affect venue/date rules. */
  actionDependencyFingerprint: string;
  determiningFacts: FormalitiesFactsSnapshot;
  formalities: Array<{
    id: string;
    requirementStatus: FormalityRequirementStatus;
    procedureKind: FormalityProcedureKind;
    sourceId: string | null;
  }>;
};

export type ActionFormalitiesWorkflowState = {
  schemaVersion: typeof ACTION_FORMALITIES_WORKFLOW_SCHEMA_VERSION;
  contentVersion: string;
  trace: ActionFormalitiesTrace;
  progress: ActionFormalityProgress[];
};

export type FormalitiesWorkflowTransition = {
  formalityId: string;
  kind: "mark_prepared" | "declare_sent";
  proofReference?: string | null;
};

function isMeaningful(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

function actionDependencyFingerprint(params: {
  locationLabel?: string | null;
  actionDate?: string | null;
  territoryFingerprint?: string | null;
}): string {
  const locationDependency = params.territoryFingerprint?.trim() || params.locationLabel?.trim() || "";
  const source = `${locationDependency}\u001f${params.actionDate?.trim() ?? ""}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function contentVersionForQualification(
  qualification: ActionFormalitiesQualification,
): string {
  return [
    qualification.schemaVersion,
    qualification.rulesetVersion ?? "unknown-ruleset",
    ...qualification.formalities
      .map((formality) => `${formality.id}:${formality.requirementStatus}:${formality.procedureKind}`)
      .sort(),
  ].join("|");
}

function buildTrace(
  qualification: ActionFormalitiesQualification,
  facts: ActionFormalitiesFacts,
  actionDependencies: {
    locationLabel?: string | null;
    actionDate?: string | null;
    territoryFingerprint?: string | null;
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
  };
  now?: string;
}): ActionFormalitiesWorkflowState {
  const now = params.now ?? new Date().toISOString();
  const actionDependencies = params.actionDependencies ?? {};
  const currentActionDependencyFingerprint = actionDependencyFingerprint(actionDependencies);
  const contentVersion = contentVersionForQualification(params.qualification);
  const previousFacts = params.previous?.trace.determiningFacts ?? null;
  const actionDependenciesChanged =
    params.previous !== undefined &&
    params.previous !== null &&
    params.previous.trace.actionDependencyFingerprint !== currentActionDependencyFingerprint;
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
    return {
      ...previous,
      contentVersion,
      active: true,
      validForQualification: previous.validForQualification && !invalidated,
      invalidatedAt: invalidated ? previous.invalidatedAt ?? now : previous.invalidatedAt,
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
    if (
      params.transition.kind === "mark_prepared" &&
      item.userStatus === "sent" &&
      item.validForQualification
    ) return item;

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

    return {
      ...item,
      userStatus: "sent",
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
    typeof candidate.contentVersion !== "string" ||
    !candidate.trace ||
    typeof candidate.trace !== "object" ||
    !Array.isArray(candidate.progress)
  ) {
    return null;
  }
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
  const progressById = new Map(
    workflow.progress.map((progress) => [progress.formalityId, progress]),
  );
  return qualification.formalities.some((formality) => {
    if (formality.requirementStatus !== "required") return false;
    const progress = progressById.get(formality.id);
    return !progress ||
      !progress.active ||
      !progress.validForQualification ||
      progress.userStatus !== "sent";
  });
}
