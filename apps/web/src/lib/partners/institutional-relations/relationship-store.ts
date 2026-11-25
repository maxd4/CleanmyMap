import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  derivePrivateInstitutionalDistinctions,
  type RelationshipEvidence,
} from "./relationship-evidence";

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
    return { ...base, kind: "explicit_support", target: row.support_target ?? "third_party" };
  }
  if (row.kind === "completed_contribution") {
    const activity =
      row.activity_kind === "cleanmymap_action"
        ? { kind: "cleanmymap_action" as const, actionId: row.activity_ref ?? "" }
        : { kind: "external_event" as const, sourceId: row.activity_ref ?? "" };
    return {
      ...base,
      kind: "completed_contribution",
      activity,
      role: row.contribution_role ?? "participation",
    };
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

export async function listPrivateInstitutionalContacts(): Promise<InstitutionalContactWithDistinctions[]> {
  const supabase = getSupabaseServerClient(true);
  const { data: contacts, error: contactsError } = await supabase
    .from("institutional_relationship_contacts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (contactsError) throw new Error(contactsError.message);

  const { data: facts, error: factsError } = await supabase
    .from("institutional_relationship_facts")
    .select("*")
    .order("created_at", { ascending: false });
  if (factsError) throw new Error(factsError.message);

  const factsByContact = new Map<string, InstitutionalFactRecord[]>();
  for (const row of (facts ?? []) as FactRow[]) {
    const list = factsByContact.get(row.contact_id) ?? [];
    list.push(mapFactRow(row));
    factsByContact.set(row.contact_id, list);
  }

  return ((contacts ?? []) as ContactRow[]).map((row) => {
    const contactFacts = factsByContact.get(row.id) ?? [];
    return {
      ...mapContactRow(row),
      facts: contactFacts,
      distinctions: derivePrivateInstitutionalDistinctions(contactFacts),
    };
  });
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
}): Promise<InstitutionalFactRecord> {
  const supabase = getSupabaseServerClient(true);
  const { data, error } = await supabase
    .from("institutional_relationship_facts")
    .insert({
      contact_id: input.contactId,
      kind: input.kind,
      origin: input.origin,
      review_status: "pending",
      evidence_ref: input.evidenceRef,
      summary: input.summary,
      occurred_at: input.occurredAt ?? null,
      support_target: input.supportTarget ?? null,
      contribution_role: input.contributionRole ?? null,
      activity_kind: input.activityKind ?? null,
      activity_ref: input.activityRef ?? null,
      created_by: input.createdBy,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to insert institutional fact");
  return mapFactRow(data as FactRow);
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
