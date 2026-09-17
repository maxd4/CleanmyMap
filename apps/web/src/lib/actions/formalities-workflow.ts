import { z } from "zod";
import type {
  ActionFormalitiesFacts,
  ActionFormalitiesQualification,
  FormalityProcedureKind,
  FormalityRequirementStatus,
} from "./formalities-qualification";

export const ACTION_FORMALITIES_WORKFLOW_SCHEMA_VERSION =
  "action-formalities-workflow-v1" as const;

export const FORMALITIES_USER_STATUSES = [
  "not_started",
  "prepared",
  "sent",
] as const;
export type FormalitiesUserStatus = (typeof FORMALITIES_USER_STATUSES)[number];

export const actionFormalitiesFactsSchema = z
  .object({
    territory: z
      .object({
        countryCode: z.literal("FR"),
        code: z.string().trim().min(1).max(40),
        label: z.string().trim().min(1).max(120),
      })
      .strict(),
    publicSpace: z.enum(["public_domain", "private_domain", "unknown"]),
    manager: z
      .object({
        kind: z.enum([
          "paris_city",
          "state",
          "sncf",
          "haropa",
          "other_public",
          "private",
          "unknown",
        ]),
        label: z.string().trim().max(200).nullable(),
      })
      .strict(),
    isCleanwalk: z.boolean(),
    isPublicRoadwayActivity: z.union([z.boolean(), z.literal("unknown")]),
    isItinerant: z.union([z.boolean(), z.literal("unknown")]),
    isClaiming: z.union([z.boolean(), z.literal("unknown")]),
    hasInstallations: z.union([z.boolean(), z.literal("unknown")]),
    requiresPhysicalOccupation: z.union([z.boolean(), z.literal("unknown")]),
    localCustomaryUse: z.union([z.boolean(), z.literal("unknown")]),
    largeCrowdOrComplexInstallations: z.union([
      z.boolean(),
      z.literal("unknown"),
    ]),
  })
  .strict();

export type FormalitiesFactsSnapshot = Pick<
  ActionFormalitiesFacts,
  | "territory"
  | "publicSpace"
  | "manager"
  | "isCleanwalk"
  | "isPublicRoadwayActivity"
  | "isItinerant"
  | "isClaiming"
  | "hasInstallations"
  | "requiresPhysicalOccupation"
  | "localCustomaryUse"
  | "largeCrowdOrComplexInstallations"
>;

export type FormalitySendProof = {
  kind: "user_declared" | "official_confirmation";
  reference: string | null;
  recordedAt: string;
};

export type ActionFormalityProgress = {
  formalityId: string;
  userStatus: FormalitiesUserStatus;
  contentVersion: string;
  statusChangedAt: string | null;
  proof: FormalitySendProof | null;
  active: boolean;
  validForQualification: boolean;
  invalidatedAt: string | null;
};

export type ActionFormalitiesTrace = {
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

export function snapshotFormalitiesFacts(
  facts: ActionFormalitiesFacts,
): FormalitiesFactsSnapshot {
  return structuredClone(facts);
}

export function deriveActionFormalitiesFacts(params: {
  departmentCode?: string | null;
  departmentName?: string | null;
  placeType?: string | null;
  plannedObjective?: string | null;
}): ActionFormalitiesFacts {
  const departmentCode = params.departmentCode?.trim() ?? "";
  const isParis = departmentCode === "75";
  const territoryCode = departmentCode
    ? `FR-${departmentCode}`
    : "FR-unknown";
  const objective = params.plannedObjective?.trim().toLowerCase() ?? "";

  return {
    territory: {
      countryCode: "FR",
      code: isParis ? "FR-75" : territoryCode,
      label: isParis
        ? "Paris (75)"
        : params.departmentName?.trim() || "Territoire à préciser",
    },
    publicSpace: "unknown",
    manager: { kind: "unknown", label: null },
    isCleanwalk:
      objective === "nettoyage" ||
      objective === "collecte_mégots" ||
      objective === "action_mixte",
    isPublicRoadwayActivity: "unknown",
    isItinerant: "unknown",
    isClaiming: "unknown",
    hasInstallations: "unknown",
    requiresPhysicalOccupation: "unknown",
    localCustomaryUse: "unknown",
    largeCrowdOrComplexInstallations: "unknown",
  };
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
}): string {
  const source = `${params.locationLabel?.trim() ?? ""}\u001f${params.actionDate?.trim() ?? ""}`;
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
  actionDependencies: { locationLabel?: string | null; actionDate?: string | null },
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
