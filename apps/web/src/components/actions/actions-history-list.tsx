"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import useSWR from "swr";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { fetchActionOperationAudit } from "@/lib/actions/operation-audit";
import { isAdminLikeProfile, normalizeProfileRole } from "@/lib/profiles";
import { swrRecentViewOptions } from "@/lib/swr-config";
import type { AdminOperationAuditEntry } from "@/lib/admin/audit/operation-audit";
import { buildActionsHistoryPdfData } from "./actions-history-list-export";
import { ActionsHistoryListView } from "./actions-history-list-view";
import { useActionsHistoryListParticipation } from "./use-actions-history-list-participation";
import { useActionsHistoryListQuery } from "./use-actions-history-list-query";

function readProfileRole(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const candidate = metadata as Record<string, unknown>;
  const roleValue = candidate["role"] ?? candidate["profile"];
  return typeof roleValue === "string" ? roleValue : null;
}

function readActiveRole(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const candidate = metadata as Record<string, unknown>;
  const value = candidate["activeRole"] ?? candidate["activeProfile"];
  return typeof value === "string" ? value : null;
}

export function ActionsHistoryList() {
  const { user } = useUser();
  const { locale } = useSitePreferences();
  const query = useActionsHistoryListQuery();
  const currentUserId = user?.id ?? null;
  const fr = locale === "fr";
  const currentProfileRole = normalizeProfileRole(
    readActiveRole(user?.publicMetadata) ?? readProfileRole(user?.publicMetadata),
  );
  const isAdminLikeUser = currentProfileRole
    ? isAdminLikeProfile(currentProfileRole)
    : false;
  const selectedActionId = query.selectedItem?.id ?? null;
  const selectedCanViewActionAudit = Boolean(
    query.selectedItem &&
      (isAdminLikeUser || query.selectedItem.created_by_clerk_id === currentUserId),
  );
  const participation = useActionsHistoryListParticipation({
    fr,
    currentUserId,
    isAdminLikeUser,
    selectedItem: query.selectedItem,
    reload: query.reload,
  });
  const actionAudit = useSWR<{ items?: AdminOperationAuditEntry[] }>(
    selectedActionId && selectedCanViewActionAudit
      ? ["action-operation-audit", selectedActionId]
      : null,
    () => fetchActionOperationAudit(selectedActionId ?? "", 12),
    swrRecentViewOptions,
  );
  const pdfData = useMemo(
    () =>
      buildActionsHistoryPdfData({
        approvedFilteredItems: query.approvedFilteredItems,
        qualityById: query.qualityById,
        statusFilter: query.statusFilter,
        qualityFilter: query.qualityFilter,
        toFixOnly: query.toFixOnly,
        search: query.search,
      }),
    [
      query.approvedFilteredItems,
      query.qualityById,
      query.qualityFilter,
      query.search,
      query.statusFilter,
      query.toFixOnly,
    ],
  );
  const failedSources = query.data?.sourceHealth?.failedSources ?? [];

  return (
    <ActionsHistoryListView
      fr={fr}
      currentUserId={currentUserId}
      isAdminLikeUser={isAdminLikeUser}
      partialSourcesLabel={failedSources.length > 0 ? failedSources.join(",") : "inconnues"}
      actionAudit={{
        data: actionAudit.data,
        isLoading: actionAudit.isLoading,
        error: actionAudit.error,
      }}
      query={query}
      participation={participation}
      selectedCanViewActionAudit={selectedCanViewActionAudit}
      pdfData={pdfData}
    />
  );
}
