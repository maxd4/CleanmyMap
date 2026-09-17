import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import { getActionOperationalContext } from "@/lib/actions/operational-context";
import { computeActionImpactKpis } from "@/lib/actions/impact-calculators";

export function toReportsExportRow(contract: ActionDataContract) {
  const operational = getActionOperationalContext(contract);
  const impact = computeActionImpactKpis(contract);
  return {
    Date: contract.dates.observedAt,
    Lieu: contract.location.label,
    Masse_Kg: contract.metadata.wasteKg,
    Masse_Kg_Declaree: contract.metadata.wasteKg,
    Masse_Kg_Impact: impact.wasteKnown ? impact.wasteKg : null,
    Origine_Masse: impact.wasteKgSource,
    Megots: contract.metadata.cigaretteButts || 0,
    Bénévoles: impact.volunteers,
    CO2e_Proxy_Kg: impact.wasteKnown ? impact.co2AvoidedKg : null,
    Eau_Proxy_L: impact.waterSavedLiters,
    Economie_Voirie_Proxy_Masse_EUR: impact.wasteKnown
      ? impact.streetCleaningSavings.massEstimateEuros
      : null,
    Economie_Voirie_Proxy_Temps_EUR: impact.streetCleaningSavings.timeEstimateEuros,
    Economie_Voirie_Proxy_Min_EUR: impact.wasteKnown
      ? impact.streetCleaningSavings.lowerBoundEuros
      : null,
    Economie_Voirie_Proxy_Max_EUR: impact.wasteKnown
      ? impact.streetCleaningSavings.upperBoundEuros
      : null,
    /** @deprecated Mass-only legacy export retained for compatibility. */
    Economie_Voirie_Proxy_EUR: impact.wasteKnown ? impact.euroSaved : null,
    Durée_Min: operational.durationMinutes,
    Charge_Terrain_Min: operational.engagementMinutes,
    Type_Lieu: operational.placeTypeLabel,
    Trajet: operational.routeStyleLabel,
    Ajustement_Trajet: operational.routeAdjustmentMessage ?? "",
    Type: contract.type,
    Source: contract.source,
  };
}
