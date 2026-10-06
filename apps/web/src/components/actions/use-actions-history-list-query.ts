import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { getActionOperationalContext } from "@/lib/actions/operational-context";
import type {
  ActionQualityGrade,
  ActionStatus,
} from "@/lib/actions/types";
import { swrRecentViewOptions } from "@/lib/swr-config";
import {
  buildActionHistoryQualityMap,
  filterActionHistoryItems,
  selectActionHistoryItem,
  resolveCorrectiveAction,
  type ActionHistoryQualityResult,
  type ActionsHistoryListFilters,
} from "./actions-history-list-query";

export type ActionsHistoryListQueryModel = ActionsHistoryListFilters & {
  data: Awaited<ReturnType<typeof fetchActions>> | undefined;
  error: unknown;
  isLoading: boolean;
  isValidating: boolean;
  reload: () => Promise<unknown>;
  items: Awaited<ReturnType<typeof fetchActions>>["items"];
  filteredItems: Awaited<ReturnType<typeof fetchActions>>["items"];
  approvedFilteredItems: Awaited<ReturnType<typeof fetchActions>>["items"];
  qualityById: Map<string, ActionHistoryQualityResult>;
  selectedId: string | null;
  selectedItem: Awaited<ReturnType<typeof fetchActions>>["items"][number] | null;
  selectedQuality: ActionHistoryQualityResult | null;
  selectedOperational: ReturnType<typeof getActionOperationalContext> | null;
  selectedLostPoints: number;
  correctiveAction: string | null;
  setStatusFilter: (value: ActionStatus | "all") => void;
  setQualityFilter: (value: ActionQualityGrade | "all") => void;
  setToFixOnly: (value: boolean | ((previous: boolean) => boolean)) => void;
  setLimit: (value: number | ((previous: number) => number)) => void;
  setSearch: (value: string) => void;
  setSelectedId: (value: string | null) => void;
};

export function useActionsHistoryListQuery(): ActionsHistoryListQueryModel {
  const [statusFilter, setStatusFilter] = useState<ActionStatus | "all">("approved");
  const [qualityFilter, setQualityFilter] = useState<ActionQualityGrade | "all">("all");
  const [toFixOnly, setToFixOnly] = useState(false);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const swrKey = useMemo(
    () => ["actions", statusFilter, qualityFilter, String(toFixOnly), String(limit)],
    [statusFilter, qualityFilter, toFixOnly, limit],
  );
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: reload,
  } = useSWR(
    swrKey,
    () =>
      fetchActions({
        status: statusFilter,
        qualityGrade: qualityFilter === "all" ? undefined : qualityFilter,
        toFixPriority: toFixOnly ? true : undefined,
        limit,
        types: "all",
      }),
    swrRecentViewOptions,
  );

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const filteredItems = useMemo(
    () => filterActionHistoryItems(items, search),
    [items, search],
  );
  const qualityById = useMemo(
    () => buildActionHistoryQualityMap(filteredItems),
    [filteredItems],
  );
  const approvedFilteredItems = useMemo(
    () => filteredItems.filter((item) => item.status === "approved"),
    [filteredItems],
  );
  const selectedItem = useMemo(
    () => selectActionHistoryItem(filteredItems, selectedId),
    [filteredItems, selectedId],
  );
  const selectedQuality = selectedItem
    ? (qualityById.get(selectedItem.id) ?? null)
    : null;
  const selectedOperational = selectedItem?.contract
    ? getActionOperationalContext(selectedItem.contract)
    : null;
  const selectedLostPoints = selectedQuality
    ? Math.max(0, 100 - selectedQuality.score)
    : 0;
  const correctiveAction = resolveCorrectiveAction(selectedQuality);

  return {
    statusFilter,
    qualityFilter,
    toFixOnly,
    limit,
    search,
    data,
    error,
    isLoading,
    isValidating,
    reload,
    items,
    filteredItems,
    approvedFilteredItems,
    qualityById,
    selectedId,
    selectedItem,
    selectedQuality,
    selectedOperational,
    selectedLostPoints,
    correctiveAction,
    setStatusFilter,
    setQualityFilter,
    setToFixOnly,
    setLimit,
    setSearch,
    setSelectedId,
  };
}
