import { computeActionImpactKpis } from "@/lib/actions/impact-calculators";
import { toActionListItem, type ActionDataContract } from "@/lib/actions/data-contract";
import {
  filterActionContractsByAdvancedFilters,
  type ReportAdvancedFilterMediaAvailability,
  type ReportAdvancedFilters,
} from "@/lib/reports/report-advanced-filters";
import { buildWasteProfile as buildCanonicalWasteProfile } from "@/lib/reports/report-model/waste-profile";

type ActionListItem = ReturnType<typeof toActionListItem>;

export function buildAdvancedFilteredIds(params: {
  initialContracts?: ActionDataContract[];
  scopedActions: ActionListItem[];
  filters: ReportAdvancedFilters;
  now: Date;
  actionMediaReadyCountByActionId: Record<string, number>;
  actionMediaAvailability: ReportAdvancedFilterMediaAvailability;
}): Set<string> | null {
  if (!params.initialContracts) return null;
  const scopedIds = new Set(params.scopedActions.map((item) => item.id));
  const scopedContracts = params.initialContracts.filter((contract) => scopedIds.has(contract.id));
  return new Set(
    filterActionContractsByAdvancedFilters({
      contracts: scopedContracts,
      filters: params.filters,
      now: params.now,
      actionMediaReadyCountByActionId: new Map(Object.entries(params.actionMediaReadyCountByActionId)),
      actionMediaAvailability: params.actionMediaAvailability,
    }).map((contract) => contract.id),
  );
}

export function buildWasteProfile(filteredActionsApproved: ActionListItem[]) {
  return buildCanonicalWasteProfile(
    filteredActionsApproved,
    (item) => item.contract?.metadata.wasteBreakdown ?? item.waste_breakdown ?? null,
  );
}

export function buildReportExportRows(filteredActionsApproved: ActionListItem[]) {
  return filteredActionsApproved.map((item) => {
    const impact = computeActionImpactKpis(
      item.contract ?? {
        metadata: {
          wasteKg: item.waste_kg,
          cigaretteButts: item.cigarette_butts,
          volunteersCount: item.volunteers_count,
          wasteBreakdown: item.waste_breakdown,
        },
      },
    );
    return {
      Date: item.action_date,
      Lieu: item.location_label,
      Compte: item.created_by_clerk_id ?? item.actor_name ?? "Inconnu",
      Association: item.association_name ?? "Sans association",
      Masse_Kg: item.waste_kg,
      Masse_Kg_Declaree: item.waste_kg,
      Masse_Kg_Impact: impact.wasteKnown ? impact.wasteKg : null,
      Origine_Masse: impact.wasteKgSource,
      Megots: impact.butts,
      Bénévoles: impact.volunteers,
      CO2e_Proxy_Kg: impact.wasteKnown ? impact.co2AvoidedKg : null,
      Eau_Proxy_L: impact.waterSavedLiters,
      Economie_Voirie_Proxy_Masse_EUR: impact.wasteKnown ? impact.streetCleaningSavings.massEstimateEuros : null,
      Economie_Voirie_Proxy_Temps_EUR: impact.streetCleaningSavings.timeEstimateEuros,
      Economie_Voirie_Proxy_Min_EUR: impact.wasteKnown ? impact.streetCleaningSavings.lowerBoundEuros : null,
      Economie_Voirie_Proxy_Max_EUR: impact.wasteKnown ? impact.streetCleaningSavings.upperBoundEuros : null,
      Economie_Voirie_Proxy_EUR: impact.wasteKnown ? impact.euroSaved : null,
      Durée_Min: Number(item.duration_minutes ?? 0),
      Type: item.record_type ?? item.contract?.type ?? "action",
      Source: item.source ?? item.contract?.source ?? "web_form",
    };
  });
}
