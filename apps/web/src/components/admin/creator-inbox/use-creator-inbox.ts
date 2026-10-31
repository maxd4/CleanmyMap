"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { CreatorInboxItem, CreatorInboxSource, CreatorInboxStatus } from "@/lib/community/creator-inbox";
import type { CommunityBugReportFollowUpMetrics } from "@/lib/community/bug-reports-store";
import { getCreatorInboxCopy, type CreatorInboxLocale } from "./creator-inbox-copy";
import { useCreatorInboxPagination } from "./use-creator-inbox-pagination";
import { buildCreatorInboxSummary, resolveInboxMessage, type CreatorInboxSummary } from "./use-creator-inbox.helpers";
import { filterAndSortCreatorInboxItems } from "./creator-inbox-filter";
import { createCopySummaryAction, createFeedbackInboxActions, createLegalDecisionAction, createReviewInboxActions } from "./creator-inbox-actions";
import { fetchCreatorInboxPage } from "./creator-inbox-service";

type UseCreatorInboxParams = {
  initialItems: CreatorInboxItem[];
  initialHasMore?: boolean;
  initialNextCursor?: string | null;
  initialCanQualify?: boolean;
  initialFeedbackMetrics?: CommunityBugReportFollowUpMetrics;
};

function useCreatorInboxRefresh({
  pagination,
  copy,
  setRefreshing,
  setErrorMessage,
  setCanQualify,
  setFeedbackMetrics,
  setSuccessMessage,
  scheduleFeedbackTimer,
}: {
  pagination: ReturnType<typeof useCreatorInboxPagination>;
  copy: ReturnType<typeof getCreatorInboxCopy>;
  setRefreshing: React.Dispatch<React.SetStateAction<boolean>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setCanQualify: React.Dispatch<React.SetStateAction<boolean>>;
  setFeedbackMetrics: React.Dispatch<React.SetStateAction<CommunityBugReportFollowUpMetrics | undefined>>;
  setSuccessMessage: React.Dispatch<React.SetStateAction<string | null>>;
  scheduleFeedbackTimer: (callback: () => void, delay: number) => void;
}) {
  return async function refreshInbox() {
    const replacementGeneration = pagination.beginReplacement();
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const page = await fetchCreatorInboxPage();
      if (!pagination.replacePage(page, replacementGeneration)) return;
      if (page.canQualify !== undefined) setCanQualify(page.canQualify);
      if (page.feedbackMetrics) setFeedbackMetrics(page.feedbackMetrics);
      setSuccessMessage(copy.messages.refreshSuccess);
      scheduleFeedbackTimer(() => setSuccessMessage(null), 1800);
    } catch (error) {
      if (pagination.cancelReplacement(replacementGeneration)) setErrorMessage(resolveInboxMessage(error, copy.messages.refreshError));
    } finally {
      setRefreshing(false);
    }
  };
}

export function useCreatorInbox({ initialItems, initialHasMore = false, initialNextCursor = null, initialCanQualify = false, initialFeedbackMetrics }: UseCreatorInboxParams) {
  const { locale } = useSitePreferences();
  const inboxLocale: CreatorInboxLocale = locale === "fr" ? "fr" : "en";
  const copy = getCreatorInboxCopy(inboxLocale);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | CreatorInboxSource>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CreatorInboxStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "normal" | "critical">("all");
  const [sortMode, setSortMode] = useState<"priority" | "date">("priority");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerConfirm, setPartnerConfirm] = useState("");
  const [canQualify, setCanQualify] = useState(initialCanQualify);
  const [feedbackMetrics, setFeedbackMetrics] = useState(initialFeedbackMetrics);
  const [partnerReason, setPartnerReason] = useState<Record<string, string>>({});
  const [associationActionReasons, setAssociationActionReasons] = useState<Record<string, string>>({});
  const [actionReasons, setActionReasons] = useState<Record<string, string>>({});
  const [promotionReasons, setPromotionReasons] = useState<Record<string, string>>({});
  const feedbackTimersRef = useRef<Set<number>>(new Set());

  useEffect(() => () => {
    for (const timer of feedbackTimersRef.current) window.clearTimeout(timer);
    feedbackTimersRef.current.clear();
  }, []);
  const scheduleFeedbackTimer = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => { feedbackTimersRef.current.delete(timer); callback(); }, delay);
    feedbackTimersRef.current.add(timer);
  };

  const pagination = useCreatorInboxPagination({ initialItems, initialHasMore, initialNextCursor, onError: (error) => setErrorMessage(resolveInboxMessage(error, copy.messages.refreshError)) });
  const { items, setItems, loadingNextPage, hasMore, loadNextPage } = pagination;
  const summary = useMemo<CreatorInboxSummary>(() => buildCreatorInboxSummary(items), [items]);
  const filteredItems = useMemo(() => filterAndSortCreatorInboxItems(items, { query, sourceFilter, statusFilter, priorityFilter, sortMode }), [items, priorityFilter, query, sortMode, sourceFilter, statusFilter]);
  const refreshInbox = useCreatorInboxRefresh({ pagination, copy, setRefreshing, setErrorMessage, setCanQualify, setFeedbackMetrics, setSuccessMessage, scheduleFeedbackTimer });
  const getSharedActions = () => ({ inboxLocale, copy, setItems, setUpdatingKey, setErrorMessage, setSuccessMessage, scheduleFeedbackTimer });
  const applyInboxAction = (params: Parameters<ReturnType<typeof createFeedbackInboxActions>["applyInboxAction"]>[0]) => createFeedbackInboxActions({ ...getSharedActions(), feedbackMetrics, setFeedbackMetrics }).applyInboxAction(params);
  const qualifyFeedback = (params: Parameters<ReturnType<typeof createFeedbackInboxActions>["qualifyFeedback"]>[0]) => createFeedbackInboxActions({ ...getSharedActions(), feedbackMetrics, setFeedbackMetrics }).qualifyFeedback(params);
  const updateFeedbackTracking = (params: Parameters<ReturnType<typeof createFeedbackInboxActions>["updateFeedbackTracking"]>[0]) => createFeedbackInboxActions({ ...getSharedActions(), feedbackMetrics, setFeedbackMetrics }).updateFeedbackTracking(params);
  const reviewActions = () => createReviewInboxActions({ ...getSharedActions(), promotionReasons, partnerReason, associationActionReasons, partnerConfirm, refreshInbox });
  const acceptPromotion = (item: Parameters<ReturnType<typeof createReviewInboxActions>["acceptPromotion"]>[0]) => reviewActions().acceptPromotion(item);
  const rejectPromotion = (item: Parameters<ReturnType<typeof createReviewInboxActions>["rejectPromotion"]>[0]) => reviewActions().rejectPromotion(item);
  const acceptPartner = (item: Parameters<ReturnType<typeof createReviewInboxActions>["acceptPartner"]>[0]) => reviewActions().acceptPartner(item);
  const rejectPartner = (item: Parameters<ReturnType<typeof createReviewInboxActions>["rejectPartner"]>[0]) => reviewActions().rejectPartner(item);
  const decideAssociationAction = (item: Parameters<ReturnType<typeof createReviewInboxActions>["decideAssociationAction"]>[0], decision: "approve" | "reject") => reviewActions().decideAssociationAction(item, decision);
  const retryAssociationActionAnnouncement = (item: Parameters<ReturnType<typeof createReviewInboxActions>["retryAssociationActionAnnouncement"]>[0]) => reviewActions().retryAssociationActionAnnouncement(item);
  const copySummary = (item: Parameters<ReturnType<typeof createCopySummaryAction>>[0]) => createCopySummaryAction({ inboxLocale, copy, setCopiedKey, setErrorMessage, scheduleFeedbackTimer })(item);
  const decideLegalReport = (params: Parameters<ReturnType<typeof createLegalDecisionAction>>[0]) => createLegalDecisionAction(getSharedActions())(params);

  return {
    locale: inboxLocale,
    copy,
    items,
    summary,
    feedbackMetrics,
    query,
    setQuery,
    sourceFilter,
    setSourceFilter,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    sortMode,
    setSortMode,
    refreshing,
    canQualify,
    loadingNextPage,
    hasMore,
    loadNextPage,
    refreshInbox,
    partnerConfirm,
    setPartnerConfirm,
    partnerReason,
    setPartnerReason,
    associationActionReasons,
    setAssociationActionReasons,
    actionReasons,
    setActionReasons,
    promotionReasons,
    setPromotionReasons,
    filteredItems,
    errorMessage,
    successMessage,
    copiedKey,
    copySummary,
    actionBusy: (source: CreatorInboxSource, id: string, action: string) => updatingKey === `${source}:${id}:${action}`,
    applyInboxAction,
    qualifyFeedback,
    updateFeedbackTracking,
    acceptPromotion,
    rejectPromotion,
    acceptPartner,
    rejectPartner,
    decideAssociationAction,
    retryAssociationActionAnnouncement,
    decideLegalReport,
  };
}
