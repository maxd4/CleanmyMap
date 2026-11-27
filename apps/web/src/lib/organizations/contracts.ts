import { z } from "zod";

const uuid = z.string().uuid();
const role = z.enum(["owner", "manager", "site_manager", "member"]);
const state = z.enum(["pending", "active", "declined", "revoked"]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Invalid calendar date");
const orgName = z.string().trim().min(1).max(120);
const base = { organizationId: uuid, requestId: uuid };
export const organizationCommandSchema = z.discriminatedUnion("operation", [
  z.object({ ...base, operation: z.literal("invite"), targetId: z.string().trim().min(1).max(255), role: z.enum(["manager", "site_manager", "member"]), siteId: uuid.nullable() }).strict(),
  z.object({ ...base, operation: z.literal("accept"), membershipId: uuid }).strict(),
  z.object({ ...base, operation: z.literal("decline"), membershipId: uuid }).strict(),
  z.object({ ...base, operation: z.literal("revoke"), membershipId: uuid }).strict(),
  z.object({ ...base, operation: z.literal("promote_owner"), membershipId: uuid }).strict(),
  z.object({ ...base, operation: z.literal("transfer_owner"), membershipId: uuid }).strict(),
  z.object({ ...base, operation: z.literal("site"), siteId: uuid.nullable(), name: orgName, archive: z.boolean() }).strict(),
  z.object({ ...base, operation: z.literal("link_action"), actionId: uuid, siteId: uuid.nullable() }).strict(),
  z.object({ ...base, operation: z.literal("campaign"), campaignId: uuid.nullable(), title: orgName, startsOn: date, endsOn: date, targetActions: z.number().int().min(1).max(10000).nullable(), state: z.enum(["draft", "active", "completed", "archived"]) }).strict(),
  z.object({ ...base, operation: z.literal("campaign_action"), campaignId: uuid, actionId: uuid, remove: z.boolean() }).strict(),
]).superRefine((value, ctx) => {
  if (value.operation === "invite" && (value.role === "site_manager") !== (value.siteId !== null)) {
    ctx.addIssue({ code: "custom", message: "Site scope required only for a local manager" });
  }
  if (value.operation === "campaign" && value.startsOn > value.endsOn) {
    ctx.addIssue({ code: "custom", message: "Invalid period" });
  }
  if (value.operation === "site" && value.archive && !value.siteId) {
    ctx.addIssue({ code: "custom", message: "Cannot archive a new site" });
  }
});
export type OrganizationCommand = z.infer<typeof organizationCommandSchema>;

export const organizationMembershipSchema = z.object({
  organization_id: uuid, organization_name: z.string(), membership_id: uuid,
  member_role: role, state: z.enum(["pending", "active"]),
});
export const organizationMembershipListSchema = z.array(organizationMembershipSchema);
export type OrganizationMembership = z.infer<typeof organizationMembershipSchema>;
const action = z.object({ id: uuid, title: z.string(), action_date: z.string(), action_phase: z.string().nullable(), status: z.string() });
export const organizationWorkspaceSchema = z.object({
  id: uuid, name: z.string(), role, site_id: uuid.nullable(),
  members: z.array(z.object({ id: uuid, member_role: role, state, site_id: uuid.nullable(), label: z.string(), is_self: z.boolean(), expires_at: z.string().nullable() })).max(101),
  sites: z.array(z.object({ id: uuid, name: z.string(), archived_at: z.string().nullable() })).max(101),
  campaigns: z.array(z.object({ id: uuid, title: z.string(), starts_on: date, ends_on: date, target_actions: z.number().int().nullable(), state: z.enum(["draft", "active", "completed", "archived"]), completed_actions: z.number().int().nonnegative() })).max(101),
  actions: z.array(action.extend({ site_id: uuid.nullable(), can_manage: z.boolean() })).max(100),
  actions_has_more: z.boolean(),
  link_candidates: z.array(action).max(100),
  candidates_has_more: z.boolean(),
});
export type OrganizationWorkspace = z.infer<typeof organizationWorkspaceSchema>;

export const organizationReportScopeSchema = z.object({
  organizationId: uuid, siteId: uuid.nullable(), campaignId: uuid.nullable(),
  from: date, to: date,
}).strict().refine((scope) => scope.from <= scope.to && (Date.parse(scope.to) - Date.parse(scope.from)) / 86400000 <= 3660, "Invalid period");
export type OrganizationReportScope = z.infer<typeof organizationReportScopeSchema>;
