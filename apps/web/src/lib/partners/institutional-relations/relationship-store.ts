import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  derivePrivateInstitutionalDistinctions,
  type RelationshipEvidence,
} from "./relationship-evidence";

export const INSTITUTIONAL_READ_PAGE_SIZE = 500;
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
  distinctionsIncomplete: boolean;
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

function normalizeOccurredAt(occurredAt?: string | null): string | null {
  const trimmed = occurredAt?.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new InstitutionalValidationError("Invalid occurredAt timestamp");
  }
  return parsed.toISOString();
}

export function computeInstitutionalFactIdempotencyKey(input: {
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
}): string {
  const canonical = JSON.stringify([
    input.contactId,
    input.kind,
    input.origin,
    input.evidenceRef.trim(),
    input.summary.trim(),
    normalizeOccurredAt(input.occurredAt),
    input.supportTarget ?? null,
    input.contributionRole ?? null,
    input.activityKind ?? null,
    input.activityRef?.trim() ?? null,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
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

async function fetchFactsPaginated(
  supabase: ReturnType<typeof getSupabaseServerClient>,
): Promise<{ rows: FactRow[]; truncated: boolean }> {
  const rows: FactRow[] = [];
  let cursor: FactRow | undefined;

  while (rows.length < MAX_INSTITUTIONAL_FACTS_READ) {
    const remaining = MAX_INSTITUTIONAL_FACTS_READ - rows.length;
    const pageLimit = Math.min(INSTITUTIONAL_READ_PAGE_SIZE, remaining);
    let query = supabase
      .from("institutional_relationship_facts")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
    if (cursor) {
      // Both values originate from PostgreSQL; preserve timestamp precision.
      query = query.or(`created_at.lt."${cursor.created_at}",and(created_at.eq."${cursor.created_at}",id.gt.${cursor.id})`);
    }
    const { data, error } = await query.range(0, pageLimit);
    if (error) throw new Error(error.message);

    const page = (data ?? []) as FactRow[];
    const accepted = page.slice(0, pageLimit);
    rows.push(...accepted);
    const hasMore = page.length > pageLimit;
    if (!hasMore || rows.length === MAX_INSTITUTIONAL_FACTS_READ) {
      return { rows, truncated: hasMore };
    }
    cursor = accepted[accepted.length - 1];
  }

  return { rows, truncated: true };
}

export async function listPrivateInstitutionalContacts(): Promise<InstitutionalContactsListResult> {
  const supabase = getSupabaseServerClient(true);
  const { data: contacts, error: contactsError } = await supabase
    .from("institutional_relationship_contacts")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .range(0, MAX_INSTITUTIONAL_CONTACTS_READ);
  if (contactsError) throw new Error(contactsError.message);

  const rawContacts = (contacts ?? []) as ContactRow[];
  const truncatedContacts = rawContacts.length > MAX_INSTITUTIONAL_CONTACTS_READ;
  const boundedContacts = truncatedContacts
    ? rawContacts.slice(0, MAX_INSTITUTIONAL_CONTACTS_READ)
    : rawContacts;

  const { rows: boundedFacts, truncated: truncatedFacts } = await fetchFactsPaginated(supabase);

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
        distinctionsIncomplete: truncatedFacts || truncatedContacts,
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

/** Always persists new facts as 'pending'; atomic idempotency via PostgreSQL unique index on idempotency_key. */
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

  const occurredAt = normalizeOccurredAt(input.occurredAt);
  const idempotencyKey = computeInstitutionalFactIdempotencyKey({
    ...input,
    evidenceRef,
    summary,
    occurredAt,
    activityRef,
  });

  const { data, error } = await supabase
    .from("institutional_relationship_facts")
    .insert({
      contact_id: input.contactId,
      kind: input.kind,
      origin: input.origin,
      review_status: "pending",
      evidence_ref: evidenceRef,
      summary,
      occurred_at: occurredAt,
      support_target: input.supportTarget ?? null,
      contribution_role: input.contributionRole ?? null,
      activity_kind: input.activityKind ?? null,
      activity_ref: activityRef,
      created_by: input.createdBy,
      idempotency_key: idempotencyKey,
    })
    .select("*")
    .single();

  if (error?.code === "23505") {
    const { data: existing, error: fetchError } = await supabase
      .from("institutional_relationship_facts")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .single();
    if (fetchError || !existing) {
      throw new Error(fetchError?.message ?? "Failed to fetch deduplicated institutional fact");
    }
    return { fact: mapFactRow(existing as FactRow), deduplicated: true };
  }

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
