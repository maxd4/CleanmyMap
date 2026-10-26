import {
  normalizePartnerAvailability,
  normalizePartnerCoverage,
  normalizeEngagementTypes,
  normalizePublicWebUrl,
  type PartnerOnboardingRequestInput,
} from "./onboarding-types";

export type PartnerOnboardingRequestRecord = Omit<PartnerOnboardingRequestInput, "publicWebsiteConsent"> & {
  id: string;
  createdAt: string;
  submittedByUserId: string;
  submittedByEmail: string | null;
  idempotencyKey?: string;
  publicWebsiteConsent: boolean;
  status: "pending_admin_review" | "accepted" | "rejected";
  creatorState: "new" | "pending" | "responded" | "treated" | "archived" | "accepted" | "rejected";
};

function readStringField(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key] : "";
}

function readOptionalStringField(record: Record<string, unknown>, key: string): string | null {
  const value = readStringField(record, key);
  return value.trim().length > 0 ? value : null;
}

function isOrganizationType(
  value: unknown,
): value is PartnerOnboardingRequestInput["organizationType"] {
  return value === "association" || value === "commerce" || value === "entreprise" || value === "collectif";
}

function isContributionType(
  value: unknown,
): value is PartnerOnboardingRequestInput["contributionTypes"][number] {
  return (
    value === "materiel" ||
    value === "logistique" ||
    value === "accueil" ||
    value === "financement" ||
    value === "communication"
  );
}

function normalizeContributionTypes(
  rawValue: unknown,
): PartnerOnboardingRequestInput["contributionTypes"] {
  if (!Array.isArray(rawValue)) return [];
  return rawValue.filter(isContributionType);
}

function normalizeCreatorState(
  rawValue: unknown,
  status: PartnerOnboardingRequestRecord["status"],
): PartnerOnboardingRequestRecord["creatorState"] {
  if (
    rawValue === "pending" ||
    rawValue === "responded" ||
    rawValue === "treated" ||
    rawValue === "archived" ||
    rawValue === "accepted" ||
    rawValue === "rejected"
  ) return rawValue;
  return status === "accepted" ? "accepted" : status === "rejected" ? "rejected" : "new";
}

export function normalizeStoredPartnerOnboardingRequest(
  record: Record<string, unknown>,
): PartnerOnboardingRequestRecord | null {
  const id = readStringField(record, "id");
  const createdAt = readStringField(record, "createdAt");
  const submittedByUserId = readStringField(record, "submittedByUserId");
  const submittedByEmail = readOptionalStringField(record, "submittedByEmail");
  const idempotencyKey = readOptionalStringField(record, "idempotencyKey") ?? undefined;
  const status =
    record["status"] === "accepted" || record["status"] === "rejected"
      ? record["status"]
      : "pending_admin_review";
  const creatorState = normalizeCreatorState(record["creatorState"], status);
  const organizationName = readStringField(record, "organizationName");
  const organizationType = record["organizationType"];
  const partnerScope =
    record["partnerScope"] === "national" || record["partnerScope"] === "france"
      ? record["partnerScope"]
      : "local";
  const legalIdentity = readStringField(record, "legalIdentity");
  const contributionTypes = normalizeContributionTypes(record["contributionTypes"]);
  const engagementTypes = normalizeEngagementTypes(record["engagementTypes"]);

  if (
    !id ||
    !createdAt ||
    !submittedByUserId ||
    !organizationName ||
    !legalIdentity ||
    !isOrganizationType(organizationType) ||
    contributionTypes.length === 0
  ) return null;

  return {
    id,
    createdAt,
    submittedByUserId,
    submittedByEmail,
    idempotencyKey,
    status,
    organizationName,
    organizationType,
    partnerScope,
    legalIdentity,
    coverage: normalizePartnerCoverage(record["coverage"]),
    contributionTypes,
    engagementTypes,
    relayActions: readStringField(record, "relayActions"),
    availability: normalizePartnerAvailability(record["availability"]),
    contactName: readStringField(record, "contactName"),
    contactChannel: readStringField(record, "contactChannel"),
    contactDetails: readStringField(record, "contactDetails"),
    motivation: readStringField(record, "motivation"),
    publicWebsiteUrl: normalizePublicWebUrl(record["publicWebsiteUrl"]) ?? undefined,
    publicWebsiteConsent: record["publicWebsiteConsent"] === true,
    creatorState,
  };
}

export function normalizePartnerOnboardingSupabaseRow(
  row: Record<string, unknown>,
): PartnerOnboardingRequestRecord | null {
  return normalizeStoredPartnerOnboardingRequest({
    id: row.id,
    createdAt: row.created_at,
    submittedByUserId: row.submitted_by_user_id,
    submittedByEmail: row.submitted_by_email,
    idempotencyKey: row.idempotency_key,
    organizationName: row.organization_name,
    organizationType: row.organization_type,
    partnerScope: row.partner_scope,
    legalIdentity: row.legal_identity,
    coverage: row.coverage,
    contributionTypes: row.contribution_types,
    engagementTypes: row.engagement_types,
    relayActions: row.relay_actions,
    availability: row.availability,
    contactName: row.contact_name,
    contactChannel: row.contact_channel,
    contactDetails: row.contact_details,
    motivation: row.motivation,
    publicWebsiteUrl: row.public_website_url,
    publicWebsiteConsent: row.public_website_consent === true,
    status: row.status,
    creatorState: row.creator_state,
  });
}
