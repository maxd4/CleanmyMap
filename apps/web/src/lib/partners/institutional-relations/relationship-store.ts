import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  derivePrivateInstitutionalDistinctions,
  type RelationshipEvidence,
} from "./relationship-evidence";

export const MAX_INSTITUTIONAL_CONTACTS_READ = 500;
export const MAX_INSTITUTIONAL_FACTS_READ = 2000;

export type InstitutionalContactRecord = {
  id: string;
  institutionalNodeId: string | null;
  displayName: string;
  roleLabel: string | null;
  isPubliclyPublishable: boolean;
  revalidationStatus: "verifie" | "a_revalider" | "retire";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InstitutionalFactRecord = RelationshipEvidence & {
  id: string;
  contactId: string;
  summary: string;
  occurredAt: string | null;
  createdBy: string;
  createdAt: string;
};

export type InstitutionalContactWithDistinctions = InstitutionalContactRecord & {
  facts: InstitutionalFactRecord[];
  distinctions: ReturnType<typeof derivePrivateInstitutionalDistinctions>;
};

export type InstitutionalContactsListResult = {
  contacts: InstitutionalContactWithDistinctions[];
  truncated: {
    contacts: boolean;
    facts: boolean;
  };
};

type ContactRow = {
  id: string;
  institutional_node_id: string | null;
  display_name: string;
  role_label: string | null;
  is_publicly_publishable: boolean;
  revalidation_status: "verifie" | "a_revalider" | "retire";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type FactRow = {
  id: string;
  contact_id: string;
  kind: RelationshipEvidence["kind"];
  origin: RelationshipEvidence["origin"];
  review_status: RelationshipEvidence["reviewStatus"];
  evidence_ref: string;
  summary: string;
  occurred_at: string | null;
  support_target: "cleanmymap" | "third_party" | null;
  contribution_role: "participation" | "organization" | "logistics" | "coordination" | null;
  activity_kind: "cleanmymap_action" | "external_event" | null;
  activity_ref: string | null;
  created_by: string;
  created_at: string;
};

export class InstitutionalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstitutionalValidationError";
  }
}

function mapFactRow(row: FactRow): InstitutionalFactRecord {
  const base = {
    id: row.id,
    contactId: row.contact_id,
    origin: row.origin,
    reviewStatus: row.review_status,
    evidenceRef: row.evidence_ref,
    summary: row.summary,
    occurredAt: row.occurred_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
  if (row.kind === "explicit_support") {
    if (row.support_target !== "cleanmymap" && row.support_target !== "third_party") {
      throw new InstitutionalValidationError("Invalid explicit_support row: missing support_target");
    }
    return { ...base, kind: "explicit_support", target: row.support_target };
  }
  if (row.kind === "completed_contribution") {
    if (!row.contribution_role) {
      throw new InstitutionalValidationError("Invalid completed_contribution row: missing contribution_role");
    }
    const ref = row.activity_ref?.trim() ?? "";
    if (!ref) {
      throw new InstitutionalValidationError("Invalid completed_contribution row: missing activity_ref");
    }
    if (row.activity_kind === "cleanmymap_action") {
      return {
        ...base,
        kind: "completed_contribution",
        activity: { kind: "cleanmymap_action", actionId: ref },
        role: row.contribution_role,
      };
    }
    if (row.activity_kind === "external_event") {
      return {
        ...base,
        kind: "completed_contribution",
        activity: { kind: "external_event", sourceId: ref },
        role: row.contribution_role,
      };
    }
    throw new InstitutionalValidationError("Invalid completed_contribution row: missing or unknown activity_kind");
  }
  return { ...base, kind: row.kind };
}

function mapContactRow(row: ContactRow): InstitutionalContactRecord {
  return {
    id: row.id,
    institutionalNodeId: row.institutional_node_id,
    displayName: row.display_name,
    roleLabel: row.role_label,
    isPubliclyPublishable: row.is_publicly_publishable,
    revalidationStatus: row.revalidation_status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPrivateInstitutionalContacts(): Promise<InstitutionalContactsListResult> {
  const supabase = getSupabaseServerClient(true);
  const { data: contacts, error: contactsError } = await supabase
    .from("institutional_relationship_contacts")
    .select("*")
    .order("updated_at", { ascending: false })
    .range(0, MAX_INSTITUTIONAL_CONTACTS_READ);
  if (contactsError) throw new Error(contactsError.message);

  const { data: facts, error: factsError } = await supabase
    .from("institutional_relationship_facts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, MAX_INSTITUTIONAL_FACTS_READ);
  if (factsError) throw new Error(factsError.message);

  const rawContacts = (contacts ?? []) as ContactRow[];
  const rawFacts = (facts ?? []) as FactRow[];
  const truncatedContacts = rawContacts.length > MAX_INSTITUTIONAL_CONTACTS_READ;
  const truncatedFacts = rawFacts.length > MAX_INSTITUTIONAL_FACTS_READ;

  const boundedContacts = truncatedContacts
    ? rawContacts.slice(0, MAX_INSTITUTIONAL_CONTACTS_READ)
    : rawContacts;
  const boundedFacts = truncatedFacts
    ? rawFacts.slice(0, MAX_INSTITUTIONAL_FACTS_READ)
    : rawFacts;

  const factsByContact = new Map<string, InstitutionalFactRecord[]>();
  for (const row of boundedFacts) {
    const list = factsByContact.get(row.contact_id) ?? [];
    list.push(mapFactRow(row));
    factsByContact.set(row.contact_id, list);
  }

  return {
    contacts: boundedContacts.map((row) => {
      const contactFacts = factsByContact.get(row.id) ?? [];
      return {
        ...mapContactRow(row),
        facts: contactFacts,
        distinctions: derivePrivateInstitutionalDistinctions(contactFacts),
      };
    }),
    truncated: {
      contacts: truncatedContacts,
      facts: truncatedFacts,
    },
  };
}

export async function upsertPrivateInstitutionalContact(input: {
  id: string;
  institutionalNodeId?: string | null;
  displayName: string;
  roleLabel?: string | null;
  isPubliclyPublishable?: boolean;
  revalidationStatus?: "verifie" | "a_revalider" | "retire";
  notes?: string | null;
}): Promise<InstitutionalContactRecord> {
  const supabase = getSupabaseServerClient(true);
  const { data, error } = await supabase
    .from("institutional_relationship_contacts")
    .upsert({
      id: input.id,
      institutional_node_id: input.institutionalNodeId ?? null,
      display_name: input.displayName,
      role_label: input.roleLabel ?? null,
      is_publicly_publishable: input.isPubliclyPublishable ?? false,
      revalidation_status: input.revalidationStatus ?? "a_revalider",
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to upsert institutional contact");
  return mapContactRow(data as ContactRow);
}

async function verifyContributionReference(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  activityKind: "cleanmymap_action" | "external_event",
  activityRef: string,
): Promise<void> {
  if (activityKind === "cleanmymap_action") {
    const { data, error } = await supabase
      .from("actions")
      .select("id")
      .eq("id", activityRef)
      .maybeSingle();
    if (error || !data) {
      throw new InstitutionalValidationError("Referenced CleanMyMap action does not exist");
    }
    return;
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(activityRef);
  } catch {
    throw new InstitutionalValidationError("External event reference must be a valid HTTPS URL");
  }
  if (parsedUrl.protocol !== "https:") {
    throw new InstitutionalValidationError("External event reference must use HTTPS");
  }
}

/** Always persists new facts as 'pending'; never trusts client-supplied verified status. */
export async function addPrivateInstitutionalFact(input: {
  contactId: string;
  kind: RelationshipEvidence["kind"];
  origin: RelationshipEvidence["origin"];
  evidenceRef: string;
  summary: string;
  occurredAt?: string | null;
  supportTarget?: "cleanmymap" | "third_party" | null;
  contributionRole?: "participation" | "organization" | "logistics" | "coordination" | null;
  activityKind?: "cleanmymap_action" | "external_event" | null;
  activityRef?: string | null;
  createdBy: string;
}): Promise<{ fact: InstitutionalFactRecord; deduplicated: boolean }> {
  const evidenceRef = input.evidenceRef.trim();
  const summary = input.summary.trim();
  if (!evidenceRef || !summary) {
    throw new InstitutionalValidationError("evidenceRef and summary are required");
  }
  if (input.kind === "explicit_support" && input.supportTarget !== "cleanmymap" && input.supportTarget !== "third_party") {
    throw new InstitutionalValidationError("supportTarget is required for explicit_support");
  }
  const activityRef = input.activityRef?.trim() ?? null;
  if (input.kind === "completed_contribution") {
    if (!input.contributionRole || !input.activityKind || !activityRef) {
      throw new InstitutionalValidationError("contributionRole, activityKind and activityRef are required for completed_contribution");
    }
  }

  const supabase = getSupabaseServerClient(true);
  if (input.kind === "completed_contribution" && input.activityKind && activityRef) {
    await verifyContributionReference(supabase, input.activityKind, activityRef);
  }

  // Prevent duplicate insertion on retries (e.g. after transient audit or network failure).
  const { data: existing, error: existingError } = await supabase
    .from("institutional_relationship_facts")
    .select("*")
    .eq("contact_id", input.contactId)
    .eq("kind", input.kind)
    .eq("origin", input.origin)
    .eq("evidence_ref", evidenceRef)
    .eq("summary", summary)
    .limit(1)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) {
    return { fact: mapFactRow(existing as FactRow), deduplicated: true };
  }

  const { data, error } = await supabase
    .from("institutional_relationship_facts")
    .insert({
      contact_id: input.contactId,
      kind: input.kind,
      origin: input.origin,
      review_status: "pending",
      evidence_ref: evidenceRef,
      summary,
      occurred_at: input.occurredAt ?? null,
      support_target: input.supportTarget ?? null,
      contribution_role: input.contributionRole ?? null,
      activity_kind: input.activityKind ?? null,
      activity_ref: activityRef,
      created_by: input.createdBy,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to insert institutional fact");
  return { fact: mapFactRow(data as FactRow), deduplicated: false };
}

export async function reviewPrivateInstitutionalFact(input: {
  factId: string;
  reviewStatus: "verified" | "withdrawn";
}): Promise<InstitutionalFactRecord> {
  const supabase = getSupabaseServerClient(true);
  const { data, error } = await supabase
    .from("institutional_relationship_facts")
    .update({
      review_status: input.reviewStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.factId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to review institutional fact");
  return mapFactRow(data as FactRow);
}
