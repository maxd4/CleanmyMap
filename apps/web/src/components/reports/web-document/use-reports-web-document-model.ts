"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { toActionListItem, toActionMapItem, type ActionDataContract } from "@/lib/actions/data-contract";
import { computeActionImpactKpis } from "@/lib/actions/impact-calculators";
import { fetchCommunityEvents, type CommunityEventItem } from "@/lib/community/http";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { computeReportModel } from "@/lib/reports/report-model";
import type {
  CommunityEventsAvailability,
  ReportDataAvailability,
} from "@/lib/reports/data-availability";
import {
  buildReportScopeOptions,
  computeReportAccountScopeCoverage,
  filterCommunityEventsByScope,
  filterReportScopeItems,
  formatReportScopeLabel,
  normalizeReportScope,
  type ReportScopeKind,
} from "@/lib/reports/scope";

type WasteProfileCategory = {
  key: "megotsKg" | "plastiqueKg" | "verreKg" | "metalKg" | "mixteKg";
  label: string;
  kg: number;
  actions: number;
};

type UseReportsWebDocumentModelOptions = {
  initialContracts?: ActionDataContract[];
  initialIsTruncated?: boolean;
  initialSourceHealth?: UnifiedSourceHealth;
  initialCommunityEvents?: CommunityEventItem[];
  initialCommunityEventsAvailability?: CommunityEventsAvailability;
  initialNow?: Date;
};

export function useReportsWebDocumentModel({
  initialContracts,
  initialIsTruncated = false,
  initialSourceHealth,
  initialCommunityEvents,
  initialCommunityEventsAvailability,
  initialNow,
}: UseReportsWebDocumentModelOptions = {}) {
  const [scopeKind, setScopeKind] = useState<ReportScopeKind>("global");
  const [scopeValue, setScopeValue] = useState<string>("");

  const initialActionListItems = useMemo(
    () => (initialContracts ?? []).map((contract) => toActionListItem(contract)),
    [initialContracts],
  );
  const initialMapItems = useMemo(
    () => (initialContracts ?? []).map((contract) => toActionMapItem(contract)),
    [initialContracts],
  );

  const actionsAll = useSWR(
    initialContracts ? null : ["report-web-actions-all"],
    () =>
      import("@/lib/actions/http").then(({ fetchActions }) =>
        fetchActions({
          status: "approved",
          limit: 200,
          days: 365,
          types: "all",
        }),
      ),
    swrRecentViewOptions,
  );
  const mapAll = useSWR(
    initialContracts ? null : ["report-web-map-all"],
    () =>
      import("@/lib/actions/http").then(({ fetchMapActions }) =>
        fetchMapActions({
          status: "approved",
          limit: 300,
          days: 365,
          types: "all",
        }),
      ),
    swrRecentViewOptions,
  );
  const community = useSWR(
    initialCommunityEvents ? null : ["report-web-community-events"],
    () => fetchCommunityEvents({ limit: 120 }),
    swrRecentViewOptions,
  );
  const actionsAllItems = useMemo(
    () => (initialContracts ? initialActionListItems : actionsAll.data?.items ?? []),
    [actionsAll.data?.items, initialActionListItems, initialContracts],
  );
  const actionsApprovedItems = useMemo(
    () => (initialContracts ? initialActionListItems : actionsAll.data?.items ?? []),
    [actionsAll.data?.items, initialActionListItems, initialContracts],
  );
  const mapItems = useMemo(
    () => (initialContracts ? initialMapItems : mapAll.data?.items ?? []),
    [initialContracts, initialMapItems, mapAll.data?.items],
  );
  const communityEvents = useMemo(
    () => initialCommunityEvents ?? community.data?.items ?? [],
    [community.data?.items, initialCommunityEvents],
  );
  const communityEventsAvailability =
    initialCommunityEventsAvailability ??
    (initialCommunityEvents !== undefined
      ? "available"
      : community.error
        ? "unavailable"
        : community.data
          ? "available"
          : undefined);
  const isLoading =
    actionsAll.isLoading ||
    mapAll.isLoading ||
    community.isLoading;
  const hasError = Boolean(
    actionsAll.error || mapAll.error || community.error,
  );

  const scopeOptions = useMemo(
    () =>
      buildReportScopeOptions([
        ...actionsAllItems,
        ...mapItems,
      ]),
    [actionsAllItems, mapItems],
  );

  const accountScopeCoverage = useMemo(
    () => computeReportAccountScopeCoverage(actionsAllItems),
    [actionsAllItems],
  );

  useEffect(() => {
    if (scopeKind === "global") {
      if (scopeValue !== "") {
        setScopeValue("");
      }
      return;
    }
    const options =
      scopeKind === "account"
        ? scopeOptions.accounts
        : scopeKind === "association"
          ? scopeOptions.associations
          : scopeOptions.arrondissements;
    if (options.length === 0) {
      if (scopeValue !== "") {
        setScopeValue("");
      }
      return;
    }
    const hasValue = options.some((option) => option.value === scopeValue);
    if (!hasValue) {
      setScopeValue(options[0].value);
    }
  }, [scopeKind, scopeOptions, scopeValue]);

  const scope = useMemo(
    () => normalizeReportScope({ kind: scopeKind, value: scopeValue }),
    [scopeKind, scopeValue],
  );

  const scopedActionsAll = useMemo(
    () => filterReportScopeItems(actionsAllItems, scope),
    [actionsAllItems, scope],
  );
  const scopedActionsApproved = useMemo(
    () => filterReportScopeItems(actionsApprovedItems, scope),
    [actionsApprovedItems, scope],
  );
  const scopedMapAll = useMemo(
    () => filterReportScopeItems(mapItems, scope),
    [mapItems, scope],
  );
  const scopedCommunity = useMemo(
    () => filterCommunityEventsByScope(communityEvents, scope),
    [communityEvents, scope],
  );

  const wasteProfile = useMemo(() => {
    const totals: Record<WasteProfileCategory["key"], WasteProfileCategory> = {
      megotsKg: { key: "megotsKg", label: "Mégots", kg: 0, actions: 0 },
      plastiqueKg: { key: "plastiqueKg", label: "Plastique", kg: 0, actions: 0 },
      verreKg: { key: "verreKg", label: "Verre", kg: 0, actions: 0 },
      metalKg: { key: "metalKg", label: "Métal", kg: 0, actions: 0 },
      mixteKg: { key: "mixteKg", label: "Déchets mixtes", kg: 0, actions: 0 },
    };

    let coveredActions = 0;
    for (const item of scopedActionsApproved) {
      const breakdown = item.contract?.metadata.wasteBreakdown ?? item.waste_breakdown ?? null;
      if (!breakdown) continue;
      coveredActions += 1;
      for (const key of Object.keys(totals) as WasteProfileCategory["key"][]) {
        const value = Number(breakdown[key] ?? 0);
        if (value > 0) {
          totals[key].kg += value;
          totals[key].actions += 1;
        }
      }
    }

    const categories = Object.values(totals)
      .filter((category) => category.kg > 0)
      .sort((a, b) => b.kg - a.kg || b.actions - a.actions);
    const dominant = categories[0] ?? null;

    return {
      categories,
      coveragePercent:
        scopedActionsApproved.length > 0
          ? (coveredActions / scopedActionsApproved.length) * 100
          : 0,
      dominantLabel: dominant?.label ?? "Déchets non typés",
      dominantKg: dominant?.kg ?? 0,
    };
  }, [scopedActionsApproved]);

  const report = useMemo(
    () =>
      computeReportModel({
        allItems: scopedActionsAll,
        approvedItems: scopedActionsApproved,
        mapItems: scopedMapAll,
        events: scopedCommunity,
        moderationAvailability: "unavailable",
        now: initialNow,
      }),
    [initialNow, scopedActionsAll, scopedActionsApproved, scopedCommunity, scopedMapAll],
  );

  const exportRows = useMemo(
    () =>
      scopedActionsApproved.map((item) => {
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
          Masse_Kg: Number(item.waste_kg ?? 0),
          Masse_Kg_Declaree: Number(item.waste_kg ?? 0),
          Masse_Kg_Impact: impact.wasteKg,
          Origine_Masse: impact.wasteKgSource,
          Megots: impact.butts,
          Bénévoles: impact.volunteers,
          CO2e_Proxy_Kg: impact.co2AvoidedKg,
          Eau_Proxy_L: impact.waterSavedLiters,
          Economie_Voirie_Proxy_EUR: impact.euroSaved,
          Durée_Min: Number(item.duration_minutes ?? 0),
          Type: item.record_type ?? item.contract?.type ?? "action",
          Source: item.source ?? item.contract?.source ?? "web_form",
        };
      }),
    [scopedActionsApproved],
  );

  const activeScopeLabel = formatReportScopeLabel(scope, scopeOptions);
  const dataAvailability: ReportDataAvailability = {
    isTruncated: initialIsTruncated,
    sourceHealth: initialSourceHealth,
    communityEventsAvailability,
  };

  return {
    scopeKind,
    setScopeKind,
    scopeValue,
    setScopeValue,
    scopeOptions,
    exportRows,
    activeScopeLabel,
    accountScopeCoverage,
    wasteProfile,
    report,
    isTruncated: initialIsTruncated,
    dataAvailability,
    isLoading,
    hasError,
  };
}
