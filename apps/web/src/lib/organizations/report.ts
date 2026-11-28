import "server-only";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchActionRows } from "@/lib/actions/persistence/queries";
import { toActionContract } from "@/lib/actions/unified-source/contracts";
import { toReportsExportRow } from "@/lib/reports/page-data-export";
import { OrganizationServiceError } from "./service";
import type { OrganizationReportScope } from "./contracts";

const MAX_ACTIONS = 500;
const idsSchema = z.array(z.object({ action_id: z.string().uuid() }));
async function authorizedIds(actor: string, scope: OrganizationReportScope) {
  const { data, error } = await getSupabaseServerClient(true).rpc("organization_report_action_ids", {
    p_org: scope.organizationId, p_actor: actor, p_site: scope.siteId,
    p_campaign: scope.campaignId, p_from: scope.from, p_to: scope.to, p_limit: MAX_ACTIONS + 1,
  });
  if (error) throw new OrganizationServiceError(error.code === "42501" ? 403 : 503);
  const ids = idsSchema.parse(data).map(row => row.action_id);
  if (ids.length > MAX_ACTIONS) throw new OrganizationServiceError(409);
  if (new Set(ids).size !== ids.length) throw new OrganizationServiceError(503);
  return ids;
}

export async function loadOrganizationReport(actor: string, scope: OrganizationReportScope, actionId?: string) {
  const initial = await authorizedIds(actor, scope);
  if (actionId && !initial.includes(actionId)) throw new OrganizationServiceError(403);
  const ids = actionId ? [actionId] : initial;
  const client = getSupabaseServerClient(true);
  const rows = ids.length ? await fetchActionRows(client, {
    actionIds: ids, limit: ids.length, status: "approved", includePrivateActions: true,
  }) : [];
  if (rows.length !== ids.length || new Set(rows.map(row => row.id)).size !== ids.length ||
    rows.some(row => !ids.includes(row.id))) throw new OrganizationServiceError(409);
  // Use the canonical projection; never export raw action, user, location, notes, or photo fields.
  const contracts = rows.map(row => toActionContract(row));
  const projected = contracts.map(toReportsExportRow);
  const result = projected.map((row, index) => ({
    date: row.Date, massKg: row.Masse_Kg_Declaree, impactMassKg: row.Masse_Kg_Impact,
    massSource: row.Origine_Masse, butts: row.Megots, participations: row.Bénévoles,
    durationMinutes: row.Durée_Min,
    collectorsCount: contracts[index]?.metadata.collectorsCount ?? null,
    collectorsCountProvenance: contracts[index]?.metadata.collectorsCountProvenance ?? "historical_unknown",
    wasteCategories: contracts[index]?.metadata.wasteCategories ?? null,
    wasteBreakdown: contracts[index]?.metadata.wasteBreakdown ?? null,
    wasteMeasurementMethod: contracts[index]?.metadata.wasteMeasurementMethod ?? null,
  }));
  const finalIds = await authorizedIds(actor, scope);
  if (initial.length !== finalIds.length || initial.some(id => !finalIds.includes(id))) throw new OrganizationServiceError(409);
  return result;
}
export type OrganizationReportRow = Awaited<ReturnType<typeof loadOrganizationReport>>[number];
