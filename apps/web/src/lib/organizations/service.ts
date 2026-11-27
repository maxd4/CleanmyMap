import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { organizationMembershipListSchema, organizationWorkspaceSchema, type OrganizationCommand } from "./contracts";

export class OrganizationServiceError extends Error {
  constructor(public readonly status: number) { super("Organization operation unavailable"); }
}
function check(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "42501") throw new OrganizationServiceError(403);
  if (error.code === "22023" || error.code === "23505" || error.code === "23514" || error.code === "23503") throw new OrganizationServiceError(409);
  throw new OrganizationServiceError(503);
}

export async function listOrganizations(actor: string) {
  const { data, error } = await getSupabaseServerClient(true).rpc("list_my_organizations", { p_actor: actor });
  check(error);
  return organizationMembershipListSchema.parse(data);
}
export async function readOrganization(actor: string, organizationId: string, offset: number) {
  const { data, error } = await getSupabaseServerClient(true).rpc("read_organization_workspace", { p_org: organizationId, p_actor: actor, p_offset: offset });
  check(error);
  return organizationWorkspaceSchema.parse(data);
}
export async function mutateOrganization(actor: string, command: OrganizationCommand) {
  const client = getSupabaseServerClient(true);
  const common = { p_org: command.organizationId, p_actor: actor, p_request: command.requestId };
  if (command.operation === "invite") {
    // Confirm owner before a Clerk lookup to prevent account enumeration by outsiders.
    const workspace = await readOrganization(actor, command.organizationId, 0);
    if (workspace.role !== "owner") throw new OrganizationServiceError(403);
    try { await (await clerkClient()).users.getUser(command.targetId); }
    catch { throw new OrganizationServiceError(409); }
    const { error } = await client.rpc("mutate_organization_membership", { ...common, p_operation: command.operation, p_membership: null, p_target: command.targetId, p_role: command.role, p_site: command.siteId });
    check(error);
    return;
  }
  if (command.operation === "accept" || command.operation === "decline" || command.operation === "revoke" || command.operation === "promote_owner" || command.operation === "transfer_owner") {
    const { error } = await client.rpc("mutate_organization_membership", { ...common, p_operation: command.operation, p_membership: command.membershipId, p_target: null, p_role: null, p_site: null });
    check(error);
    return;
  }
  if (command.operation === "site") {
    const { error } = await client.rpc("mutate_organization_site", { ...common, p_site: command.siteId, p_name: command.name, p_archive: command.archive });
    check(error);
    return;
  }
  if (command.operation === "link_action") {
    const { error } = await client.rpc("link_organization_action", { ...common, p_action: command.actionId, p_site: command.siteId });
    check(error);
    return;
  }
  if (command.operation === "campaign") {
    const { error } = await client.rpc("mutate_organization_campaign", { ...common, p_campaign: command.campaignId, p_title: command.title, p_start: command.startsOn, p_end: command.endsOn, p_target: command.targetActions, p_state: command.state });
    check(error);
    return;
  }
  const { error } = await client.rpc("link_organization_campaign_action", { ...common, p_campaign: command.campaignId, p_action: command.actionId, p_remove: command.remove });
  check(error);
}
