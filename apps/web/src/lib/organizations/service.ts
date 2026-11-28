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
function isPendingMemberCollectionsRpc(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "PGRST202" || error.code === "42883") &&
    error.message?.includes("read_organization_member_collections"));
}
type OrganizationTeamMemberRow = {
  membership_id: string;
  member_role: string;
  state: string;
  site_id: string | null;
  is_self: boolean;
  label: string;
  expires_at: string | null;
};
function mapTeamMember(member: OrganizationTeamMemberRow) {
  return {
    id: member.membership_id,
    member_role: member.member_role,
    state: member.state,
    site_id: member.site_id,
    is_self: member.is_self,
    label: member.label,
    expires_at: member.expires_at,
  };
}

export async function listOrganizations(actor: string) {
  const { data, error } = await getSupabaseServerClient(true).rpc("list_my_organizations", { p_actor: actor });
  check(error);
  return organizationMembershipListSchema.parse(data);
}
export async function readOrganization(actor: string, organizationId: string, offset: number) {
  const client = getSupabaseServerClient(true);
  const memberships = await listOrganizations(actor);
  const membership = memberships.find((entry) => entry.organization_id === organizationId && entry.state === "active");
  if (!membership) throw new OrganizationServiceError(403);
  if (membership.member_role === "member") {
    const [{ data, error }, { data: members, error: membersError }] = await Promise.all([
      client.rpc("read_organization_member_collections", { p_org: organizationId, p_actor: actor, p_offset: offset }),
      client.rpc("read_organization_team_members", { p_org: organizationId, p_actor: actor }),
    ]);
    check(membersError);
    if (isPendingMemberCollectionsRpc(error)) {
      return organizationWorkspaceSchema.parse({
        id: organizationId,
        name: membership.organization_name,
        role: membership.member_role,
        site_id: null,
        members: (members ?? []).map(mapTeamMember),
        sites: [],
        campaigns: [],
        actions: [],
        actions_has_more: false,
        link_candidates: [],
        candidates_has_more: false,
        collections_available: false,
      });
    }
    check(error);
    return organizationWorkspaceSchema.parse({
      ...data,
      members: (members ?? []).map(mapTeamMember),
    });
  }
  const [{ data, error }, { data: members, error: membersError }] = await Promise.all([
    client.rpc("read_organization_workspace", { p_org: organizationId, p_actor: actor, p_offset: offset }),
    client.rpc("read_organization_team_members", { p_org: organizationId, p_actor: actor }),
  ]);
  check(error);
  check(membersError);
  return organizationWorkspaceSchema.parse({ ...data, members: (members ?? []).map(mapTeamMember) });
}
export async function mutateOrganization(actor: string, command: OrganizationCommand) {
  const client = getSupabaseServerClient(true);
  const common = { p_org: command.organizationId, p_actor: actor, p_request: command.requestId };
  if (command.operation === "invite") {
    // Confirm owner before a verified-email lookup; never accept Clerk IDs from the browser.
    const workspace = await readOrganization(actor, command.organizationId, 0);
    if (workspace.role !== "owner") throw new OrganizationServiceError(403);
    let targetId: string;
    try {
      const matches = await (await clerkClient()).users.getUserList({ emailAddress: [command.targetEmail], limit: 2 });
      const exact = matches.data.filter((user) => user.emailAddresses.some((email) =>
        email.emailAddress.trim().toLowerCase() === command.targetEmail && email.verification?.status === "verified"));
      if (exact.length !== 1) throw new Error("Account unavailable");
      targetId = exact[0].id;
    } catch { throw new OrganizationServiceError(409); }
    const { error } = await client.rpc("mutate_organization_membership", { ...common, p_operation: command.operation, p_membership: null, p_target: targetId, p_role: command.role, p_site: command.siteId });
    check(error);
    return;
  }
  if (command.operation === "accept" || command.operation === "decline" || command.operation === "revoke" || command.operation === "promote_owner" || command.operation === "transfer_owner") {
    const { error } = await client.rpc("mutate_organization_membership", { ...common, p_operation: command.operation, p_membership: command.membershipId, p_target: null, p_role: null, p_site: null });
    check(error);
    return;
  }
  if (command.operation === "leave") {
    const { error } = await client.rpc("leave_organization", common);
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
  if (command.operation === "unlink_action") {
    const { data: enabled, error: capabilityError } = await client.rpc("organization_action_detach_enabled");
    if (capabilityError || enabled !== true) throw new OrganizationServiceError(503);
    const { error } = await client.rpc("unlink_organization_action", { ...common, p_action: command.actionId, p_site: command.siteId });
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
