export type SpogomiRegistrationReadinessStatus = "complete" | "incomplete" | "not_verified";

export type SpogomiRegistrationReadinessItem = {
  id: string;
  label: string;
  status: SpogomiRegistrationReadinessStatus;
  required: boolean;
  href: string;
  detail?: string;
};

export type SpogomiRegistrationPolicy = {
  capacity?: number | string | null;
  safetyInstructions?: string | null;
  safetyInstructionsVerified?: boolean;
  organizationContact?: string | null;
  organizationContactVerified?: boolean;
  assistanceProcedure?: string | null;
  assistanceProcedureVerified?: boolean;
  minorsApplicable?: boolean;
  minorInformation?: string | null;
  minorInformationVerified?: boolean;
  [key: string]: unknown;
};

export type SpogomiRegistrationReadiness = {
  eventId: string;
  ready: boolean;
  policy: SpogomiRegistrationPolicy;
  editionItems: SpogomiRegistrationReadinessItem[];
  divisions: Array<{
    divisionId: string;
    divisionType: "casual" | "world_cup";
    ready: boolean;
    items: SpogomiRegistrationReadinessItem[];
  }>;
};

const STATUSES = new Set<SpogomiRegistrationReadinessStatus>(["complete", "incomplete", "not_verified"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseItem(value: unknown): SpogomiRegistrationReadinessItem | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.label !== "string" || typeof value.status !== "string" || !STATUSES.has(value.status as SpogomiRegistrationReadinessStatus) || typeof value.required !== "boolean" || typeof value.href !== "string") return null;
  return { id: value.id, label: value.label, status: value.status as SpogomiRegistrationReadinessStatus, required: value.required, href: value.href, ...(typeof value.detail === "string" ? { detail: value.detail } : {}) };
}

function parseItems(value: unknown): SpogomiRegistrationReadinessItem[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map(parseItem);
  return items.every(Boolean) ? items as SpogomiRegistrationReadinessItem[] : null;
}

export function parseSpogomiRegistrationReadiness(value: unknown): SpogomiRegistrationReadiness | null {
  if (!isRecord(value) || typeof value.eventId !== "string" || typeof value.ready !== "boolean" || !isRecord(value.policy)) return null;
  const editionItems = parseItems(value.editionItems);
  if (!editionItems || !Array.isArray(value.divisions)) return null;
  const divisions = value.divisions.map((division) => {
    if (!isRecord(division) || typeof division.divisionId !== "string" || (division.divisionType !== "casual" && division.divisionType !== "world_cup") || typeof division.ready !== "boolean") return null;
    const items = parseItems(division.items);
    return items ? { divisionId: division.divisionId, divisionType: division.divisionType, ready: division.ready, items } : null;
  });
  if (divisions.some((division) => !division)) return null;
  return { eventId: value.eventId, ready: value.ready, policy: value.policy as SpogomiRegistrationPolicy, editionItems, divisions: divisions as SpogomiRegistrationReadiness["divisions"] };
}

export function readinessStatusLabel(status: SpogomiRegistrationReadinessStatus): string {
  return status === "complete" ? "Complet" : status === "not_verified" ? "Non vérifié" : "Incomplet";
}
