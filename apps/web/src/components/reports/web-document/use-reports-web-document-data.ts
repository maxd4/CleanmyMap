"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { toActionListItem, toActionMapItem, type ActionDataContract } from "@/lib/actions/data-contract";
import { fetchCommunityEvents, type CommunityEventItem } from "@/lib/community/http";
import { swrRecentViewOptions } from "@/lib/swr-config";
import type { CommunityEventsAvailability } from "@/lib/reports/data-availability";
import {
  filterReportCommunityEventsByPeriod,
  type ReportGenerationPeriodSelection,
} from "@/lib/reports/generation-period";

type UseReportsWebDocumentDataOptions = {
  initialContracts?: ActionDataContract[];
  initialScopeContracts?: ActionDataContract[];
  initialCommunityEvents?: CommunityEventItem[];
  initialCommunityEventsAvailability?: CommunityEventsAvailability;
  initialPeriod: ReportGenerationPeriodSelection;
  initialNow?: Date;
};

export function useReportsWebDocumentData({
  initialContracts,
  initialScopeContracts,
  initialCommunityEvents,
  initialCommunityEventsAvailability,
  initialPeriod,
  initialNow,
}: UseReportsWebDocumentDataOptions) {
  const initialContractsForView = useMemo(
    () => initialScopeContracts ?? initialContracts ?? [],
    [initialContracts, initialScopeContracts],
  );
  const initialActionListItems = useMemo(
    () => initialContractsForView.map((contract) => toActionListItem(contract)),
    [initialContractsForView],
  );
  const initialMapItems = useMemo(
    () => initialContractsForView.map((contract) => toActionMapItem(contract)),
    [initialContractsForView],
  );

  const actionsAll = useSWR(
    initialContracts ? null : ["report-web-actions-all"],
    () =>
      import("@/lib/actions/http").then(({ fetchActions }) =>
        fetchActions({ status: "approved", limit: 200, days: 365, types: "all" }),
      ),
    swrRecentViewOptions,
  );
  const mapAll = useSWR(
    initialContracts ? null : ["report-web-map-all"],
    () =>
      import("@/lib/actions/http").then(({ fetchMapActions }) =>
        fetchMapActions({ status: "approved", limit: 300, days: 365, types: "all" }),
      ),
    swrRecentViewOptions,
  );
  const community = useSWR(
    initialCommunityEvents ? null : ["report-web-community-events"],
    () => fetchCommunityEvents({ limit: 120 }),
    swrRecentViewOptions,
  );

  const actionsAllItems = initialContracts
    ? initialActionListItems
    : actionsAll.data?.items ?? [];
  const mapItems = initialContracts
    ? initialMapItems
    : mapAll.data?.items ?? [];
  const communityEvents = useMemo(
    () => initialCommunityEvents ?? community.data?.items ?? [],
    [community.data?.items, initialCommunityEvents],
  );
  const periodCommunityEvents = useMemo(
    () => filterReportCommunityEventsByPeriod(communityEvents, initialPeriod, initialNow ?? new Date()),
    [communityEvents, initialNow, initialPeriod],
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

  return {
    actionsAllItems,
    actionsApprovedItems: actionsAllItems,
    mapItems,
    periodCommunityEvents,
    communityEventsAvailability,
    isLoading: actionsAll.isLoading || mapAll.isLoading || community.isLoading,
    hasError: Boolean(actionsAll.error || mapAll.error || community.error),
  };
}

export type ReportsWebDocumentData = ReturnType<typeof useReportsWebDocumentData>;
