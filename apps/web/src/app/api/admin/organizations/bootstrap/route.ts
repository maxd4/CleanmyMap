import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveActionOrganizer } from "@/lib/actions/organizer-directory-registry";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";

export const runtime = "nodejs";
type BootstrapQueueRow = {
  entry_id: string;
  organization_name: string;
  organization_type: "entreprise" | "commerce";
  legal_identity: string | null;
  submitted_by_clerk_id: string;
};
// Explicit administrator verification, separate from ordinary partner publication.
const schema = z.object({ entryId: z.string().trim().min(1).max(255), organizerRef: z.string().trim().min(1).max(255), mandateVerified: z.literal(true), requestId: z.string().uuid() }).strict();
// Justification: mandate and applicant identity data must never enter a shared cache.
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } }); }

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) return json({ error: "Accès refusé." }, access.status);
  const rate = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 10, window: 60 });
  if (rate) { rate.headers.set("Cache-Control", "private, no-store"); return rate; }

  try {
    const client = getSupabaseServerClient(true);
    const { data: queue, error } = await client.rpc("list_organization_bootstrap_queue");
    if (error) return json({ error: "Demandes indisponibles." }, 503);
    const rows = (queue ?? []) as BootstrapQueueRow[];
    const accountIds = [...new Set(rows.slice(0, 100).map((row) => row.submitted_by_clerk_id))];
    const users = accountIds.length
      ? (await (await clerkClient()).users.getUserList({ userId: accountIds, limit: accountIds.length })).data
      : [];
    const userById = new Map(users.map((user) => [user.id, user]));
    const applications = rows.slice(0, 100).map((row) => {
      const account = userById.get(row.submitted_by_clerk_id) ?? null;
      const primaryEmail = account?.emailAddresses.find((email) => email.id === account.primaryEmailAddressId);
      return {
        entryId: row.entry_id,
        organizationName: row.organization_name,
        legalIdentity: row.legal_identity,
        organizationType: row.organization_type,
        applicantEmail: primaryEmail?.emailAddress ?? null,
        applicantAccountAvailable: account !== null,
      };
    });
    return json({ applications, hasMore: rows.length > 100 });
  } catch {
    return json({ error: "Demandes indisponibles." }, 503);
  }
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) return json({ error: "Accès refusé." }, access.status);
  const rate = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 5, window: 60 });
  if (rate) { rate.headers.set("Cache-Control", "private, no-store"); return rate; }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Mandat vérifié et référence obligatoires." }, 400);
  try {
    const client = getSupabaseServerClient(true);
    const organizer = await resolveActionOrganizer({ supabase: client, organizerType: "company", organizerId: parsed.data.organizerRef });
    if (organizer.organizerId !== parsed.data.organizerRef) return json({ error: "Référence non vérifiée." }, 409);
    const entry = await client.from("partner_annuaire_entries").select("source_request_id,publication_status").eq("id", parsed.data.entryId).maybeSingle();
    if (entry.error) return json({ error: "Source indisponible." }, 503);
    if (!entry.data || entry.data.publication_status !== "accepted") return json({ error: "Mandat non admissible." }, 409);
    const source = await client.from("partner_onboarding_requests").select("submitted_by_user_id,status,organization_type,legal_identity").eq("id", entry.data.source_request_id).maybeSingle();
    if (source.error) return json({ error: "Source indisponible." }, 503);
    if (!source.data || source.data.status !== "accepted" || !["entreprise","commerce"].includes(source.data.organization_type) || source.data.legal_identity !== organizer.organizerId) return json({ error: "Mandat non admissible." }, 409);
    await (await clerkClient()).users.getUser(source.data.submitted_by_user_id);
    const { data, error } = await client.rpc("bootstrap_organization", { p_entry: parsed.data.entryId, p_ref: organizer.organizerId, p_actor: access.userId, p_request: parsed.data.requestId });
    if (error) return json({ error: "Activation non aboutie." }, error.code === "42501" ? 403 : error.code === "23505" || error.code === "22023" ? 409 : 503);
    return json({ organizationId: data });
  } catch { return json({ error: "Activation non aboutie." }, 503); }
}
