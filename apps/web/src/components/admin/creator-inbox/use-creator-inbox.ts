"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { summarizeCreatorInboxItem, type CreatorInboxItem, type CreatorInboxSource, type CreatorInboxStatus } from "@/lib/community/creator-inbox";
import type { CommunityBugReportFollowUpMetrics, FeedbackTrackingStatus } from "@/lib/community/bug-reports-store";
import { acceptPartnerRequest, acceptPromotionRequest, applyCreatorInboxAction, decideLegalContentReport, fetchCreatorInboxPage, rejectPartnerRequest, rejectPromotionRequest } from "./creator-inbox-service";
import { refreshList } from "./inbox-constants";
import { getCreatorInboxCopy, PARTNER_CONFIRM_PHRASE, type CreatorInboxLocale } from "./creator-inbox-copy";
import { useCreatorInboxPagination } from "./use-creator-inbox-pagination";
import type {
  LegalContentReportDecisionAction,
  LegalContentReportDecisionOrigin,
} from "@/lib/legal-content-report/legal-content-report";

type UseCreatorInboxParams = {
  initialItems: CreatorInboxItem[];
  initialHasMore?: boolean;
  initialNextCursor?: string | null;
  initialCanQualify?: boolean;
  initialFeedbackMetrics?: CommunityBugReportFollowUpMetrics;
};

type Summary = {
  feedback: number;
  promotion: number;
  partner: number;
  event: number;
  legalContentReport: number;
};

function resolveInboxMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function buildCreatorInboxSummary(items: CreatorInboxItem[]): Summary {
  return {
    feedback: items.filter((item) => item.source === "feedback").length,
    promotion: items.filter((item) => item.source === "promotion").length,
    partner: items.filter((item) => item.source === "partner").length,
    event: items.filter((item) => item.source === "event").length,
    legalContentReport: items.filter((item) => item.source === "legal_content_report").length,
  };
}

export function useCreatorInbox({
  initialItems,
  initialHasMore = false, initialNextCursor = null,
  initialCanQualify = false,
  initialFeedbackMetrics,
}: UseCreatorInboxParams) {
  const { locale } = useSitePreferences();
  const inboxLocale: CreatorInboxLocale = locale === "fr" ? "fr" : "en";
  const copy = getCreatorInboxCopy(inboxLocale);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | CreatorInboxSource>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CreatorInboxStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "normal">("all");
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
  const [actionReasons, setActionReasons] = useState<Record<string, string>>({});
  const feedbackTimersRef = useRef<Set<number>>(new Set());

  useEffect(() => () => {
    for (const timer of feedbackTimersRef.current) {
      window.clearTimeout(timer);
    }
    feedbackTimersRef.current.clear();
  }, []);

  function scheduleFeedbackTimer(callback: () => void, delay: number) {
    const timer = window.setTimeout(() => {
      feedbackTimersRef.current.delete(timer);
      callback();
    }, delay);
    feedbackTimersRef.current.add(timer);
  }

  const pagination = useCreatorInboxPagination({
    initialItems,
    initialHasMore,
    initialNextCursor,
    onError: (error) => setErrorMessage(resolveInboxMessage(error, copy.messages.refreshError)),
  });
  const items = pagination.items;
  const setItems = pagination.setItems;
  const [promotionReasons, setPromotionReasons] = useState<Record<string, string>>({});

  const summary = useMemo(() => buildCreatorInboxSummary(items), [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (sourceFilter !== "all" && item.source !== sourceFilter) {
        return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (priorityFilter !== "all" && item.priority !== priorityFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [
        item.title,
        item.subtitle ?? "",
        item.authorName,
        item.authorEmail ?? "",
        item.authorRole ?? "",
        item.context,
        item.pagePath ?? "",
        item.source,
        item.sourceStatus,
        item.status,
        ...item.details.map((detail) => `${detail.label} ${detail.value}`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    }).sort((left, right) =>
      sortMode === "priority"
        ? Number(right.priority === "high") - Number(left.priority === "high") ||
          Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
          left.source.localeCompare(right.source) ||
          right.sourceRecordId.localeCompare(left.sourceRecordId)
        : Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
          left.source.localeCompare(right.source) ||
          right.sourceRecordId.localeCompare(left.sourceRecordId),
    );
  }, [items, priorityFilter, query, sortMode, sourceFilter, statusFilter]);

  async function refreshInbox() {
    const replacementGeneration = pagination.beginReplacement();
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const page = await fetchCreatorInboxPage();
      if (!pagination.replacePage(page, replacementGeneration)) {
        return;
      }
      if (page.canQualify !== undefined) {
        setCanQualify(page.canQualify);
      }
      if (page.feedbackMetrics) setFeedbackMetrics(page.feedbackMetrics);
      setSuccessMessage(copy.messages.refreshSuccess);
      scheduleFeedbackTimer(() => setSuccessMessage(null), 1800);
    } catch (error) {
      if (pagination.cancelReplacement(replacementGeneration)) {
        setErrorMessage(resolveInboxMessage(error, copy.messages.refreshError));
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function applyInboxAction(params: {
    source: CreatorInboxSource;
    itemId: string;
    action: "mark_treated" | "responded" | "archive" | "delete";
    reason: string;
  }) {
    const reason = params.reason.trim();
    if (reason.length < 5) {
      setErrorMessage(
        inboxLocale === "fr"
          ? "Saisissez un motif d'au moins 5 caractères."
          : "Enter a reason of at least 5 characters.",
      );
      return;
    }
    setUpdatingKey(`${params.source}:${params.itemId}:${params.action}`);
    setErrorMessage(null);
    try {
      const payload = await applyCreatorInboxAction({ ...params, reason });
      setItems((current) => refreshList(current, payload.item ?? null, payload.deletedId));
      setSuccessMessage(copy.messages.actionSuccess);
      scheduleFeedbackTimer(() => setSuccessMessage(null), 1800);
    } catch (error) {
      setErrorMessage(resolveInboxMessage(error, copy.messages.actionError));
    } finally {
      setUpdatingKey(null);
    }
  }

  async function qualifyFeedback(params: {
    item: CreatorInboxItem;
    decision: "pending" | "needs_info" | "accepted" | "duplicate" | "rejected";
    reason: string;
    duplicateFeedbackId: string | null;
  }) {
    const reason = params.reason.trim();
    if (["needs_info", "duplicate", "rejected"].includes(params.decision) && reason.length < 5) {
      setErrorMessage(
        inboxLocale === "fr"
          ? "Un motif d'au moins 5 caractères est requis pour cette décision."
          : "A reason of at least 5 characters is required for this decision.",
      );
      return;
    }
    if (params.decision === "duplicate" && !params.duplicateFeedbackId) {
      setErrorMessage(
        inboxLocale === "fr"
          ? "Sélectionnez le retour doublon concerné."
          : "Select the duplicate feedback.",
      );
      return;
    }
    setUpdatingKey(`feedback:${params.item.sourceRecordId}:qualify`);
    setErrorMessage(null);
    try {
      const payload = await applyCreatorInboxAction({
        source: "feedback",
        itemId: params.item.sourceRecordId,
        action: "qualify",
        reason,
        decision: params.decision,
        duplicateFeedbackId: params.duplicateFeedbackId,
      });
      setItems((current) => refreshList(current, payload.item ?? null));
      setSuccessMessage(copy.messages.qualificationSuccess);
      scheduleFeedbackTimer(() => setSuccessMessage(null), 1800);
    } catch (error) {
      setErrorMessage(resolveInboxMessage(error, copy.messages.qualificationError));
    } finally {
      setUpdatingKey(null);
    }
  }

  async function updateFeedbackTracking(params: {
    item: CreatorInboxItem;
    status: FeedbackTrackingStatus;
    publicSummary: string | null;
    reference: string | null;
    shippedOn: string | null;
  }) {
    if (params.status === "shipped" && (params.publicSummary?.trim().length ?? 0) < 5) {
      setErrorMessage(
        inboxLocale === "fr"
          ? "Un résumé public est requis pour une livraison."
          : "A public summary is required for delivery.",
      );
      return;
    }
    if (params.status === "shipped" && !params.shippedOn) {
      setErrorMessage(
        inboxLocale === "fr"
          ? "Une date de livraison confirmée est requise."
          : "A confirmed delivery date is required.",
      );
      return;
    }
    setUpdatingKey(`feedback:${params.item.sourceRecordId}:update_tracking`);
    setErrorMessage(null);
    try {
      const payload = await applyCreatorInboxAction({
        source: "feedback",
        itemId: params.item.sourceRecordId,
        action: "update_tracking",
        reason: "Suivi de réalisation mis à jour",
        trackingStatus: params.status,
        trackingPublicSummary: params.publicSummary,
        trackingReference: params.reference,
        trackingShippedOn: params.shippedOn,
      });
      setItems((current) => refreshList(current, payload.item ?? null));
      if (feedbackMetrics && payload.item?.tracking) {
        const wasShipped = params.item.tracking?.status === "shipped";
        const isShipped = payload.item.tracking.status === "shipped";
        if (wasShipped !== isShipped) {
          setFeedbackMetrics((current) =>
            current
              ? { ...current, shipped: current.shipped + (isShipped ? 1 : -1) }
              : current,
          );
        }
      }
      setSuccessMessage(
        inboxLocale === "fr" ? "Suivi de réalisation enregistré." : "Product follow-up saved.",
      );
      scheduleFeedbackTimer(() => setSuccessMessage(null), 1800);
    } catch (error) {
      setErrorMessage(resolveInboxMessage(error, copy.messages.actionError));
    } finally {
      setUpdatingKey(null);
    }
  }

  async function acceptPromotion(item: CreatorInboxItem) {
    const reason = promotionReasons[item.sourceRecordId] ?? "";
    if (reason.trim().length < 5) {
      setErrorMessage(
        inboxLocale === "fr"
          ? "Saisissez un motif d'au moins 5 caractères."
          : "Enter a reason of at least 5 characters.",
      );
      return;
    }
    setUpdatingKey(`promotion:${item.sourceRecordId}:accept`);
    setErrorMessage(null);
    try {
      await acceptPromotionRequest({ requestId: item.sourceRecordId, reason });
      await refreshInbox();
    } catch (error) {
      setErrorMessage(resolveInboxMessage(error, copy.messages.approvalError));
    } finally {
      setUpdatingKey(null);
    }
  }

  async function rejectPromotion(item: CreatorInboxItem) {
    const reason = promotionReasons[item.sourceRecordId] ?? "";
    if (reason.trim().length < 5) {
      setErrorMessage(
        inboxLocale === "fr"
          ? "Saisissez un motif d'au moins 5 caractères."
          : "Enter a reason of at least 5 characters.",
      );
      return;
    }
    setUpdatingKey(`promotion:${item.sourceRecordId}:reject`);
    setErrorMessage(null);
    try {
      await rejectPromotionRequest({ requestId: item.sourceRecordId, reason });
      await refreshInbox();
    } catch (error) {
      setErrorMessage(resolveInboxMessage(error, copy.messages.rejectionError));
    } finally {
      setUpdatingKey(null);
    }
  }

  async function acceptPartner(item: CreatorInboxItem) {
    if (partnerConfirm.trim().toUpperCase() !== PARTNER_CONFIRM_PHRASE) {
      setErrorMessage(copy.messages.partnerConfirmMismatch);
      return;
    }
    const reason = partnerReason[item.sourceRecordId] ?? "";
    if (reason.trim().length < 5) {
      setErrorMessage(
        inboxLocale === "fr"
          ? "Saisissez un motif d'au moins 5 caractères."
          : "Enter a reason of at least 5 characters.",
      );
      return;
    }

    setUpdatingKey(`partner:${item.sourceRecordId}:accept`);
    setErrorMessage(null);
    try {
      await acceptPartnerRequest({
        id: item.sourceRecordId,
        confirmPhrase: partnerConfirm,
        reason,
      });
      await refreshInbox();
    } catch (error) {
      setErrorMessage(resolveInboxMessage(error, copy.messages.approvalError));
    } finally {
      setUpdatingKey(null);
    }
  }

  async function rejectPartner(item: CreatorInboxItem) {
    if (partnerConfirm.trim().toUpperCase() !== PARTNER_CONFIRM_PHRASE) {
      setErrorMessage(copy.messages.partnerConfirmMismatch);
      return;
    }
    const reason = partnerReason[item.sourceRecordId] ?? "";
    if (reason.trim().length < 5) {
      setErrorMessage(
        inboxLocale === "fr"
          ? "Saisissez un motif d'au moins 5 caractères."
          : "Enter a reason of at least 5 characters.",
      );
      return;
    }

    setUpdatingKey(`partner:${item.sourceRecordId}:reject`);
    setErrorMessage(null);
    try {
      await rejectPartnerRequest({
        id: item.sourceRecordId,
        confirmPhrase: partnerConfirm,
        reason,
      });
      await refreshInbox();
    } catch (error) {
      setErrorMessage(resolveInboxMessage(error, copy.messages.rejectionError));
    } finally {
      setUpdatingKey(null);
    }
  }

  async function copySummary(item: CreatorInboxItem) {
    try {
      await navigator.clipboard.writeText(summarizeCreatorInboxItem(item, inboxLocale));
      setCopiedKey(item.id);
      scheduleFeedbackTimer(() => setCopiedKey(null), 1500);
    } catch {
      setErrorMessage(copy.messages.clipboardError);
    }
  }

  async function decideLegalReport(params: {
    item: CreatorInboxItem;
    action: LegalContentReportDecisionAction;
    origin: LegalContentReportDecisionOrigin;
    reason: string;
    automatedMeansUsed: boolean;
    legalBasis?: string;
    termsBasis?: string;
  }) {
    const reason = params.reason.trim();
    if (reason.length < 5) {
      setErrorMessage(
        inboxLocale === "fr"
          ? "Saisissez un motif d'au moins 5 caractères."
          : "Enter a reason of at least 5 characters.",
      );
      return;
    }
    setUpdatingKey(`legal_content_report:${params.item.sourceRecordId}:${params.action}`);
    setErrorMessage(null);
    try {
      const payload = await decideLegalContentReport({
        reportId: params.item.sourceRecordId,
        action: params.action,
        origin: params.origin,
        reason,
        automatedMeansUsed: params.automatedMeansUsed,
        legalBasis: params.legalBasis,
        termsBasis: params.termsBasis,
      });
      setItems((current) => refreshList(current, payload.item ?? null));
      setSuccessMessage(
        payload.status === "partial"
          ? "Décision enregistrée, mais une notification a échoué."
          : copy.messages.actionSuccess,
      );
      scheduleFeedbackTimer(() => setSuccessMessage(null), 2400);
    } catch (error) {
      setErrorMessage(resolveInboxMessage(error, copy.messages.actionError));
    } finally {
      setUpdatingKey(null);
    }
  }

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
    loadingNextPage: pagination.loadingNextPage,
    hasMore: pagination.hasMore,
    loadNextPage: pagination.loadNextPage,
    refreshInbox,
    partnerConfirm,
    setPartnerConfirm,
    partnerReason,
    setPartnerReason,
    actionReasons,
    setActionReasons,
    promotionReasons,
    setPromotionReasons,
    filteredItems,
    errorMessage,
    successMessage,
    copiedKey,
    copySummary,
    actionBusy: (source: CreatorInboxSource, id: string, action: string) =>
      updatingKey === `${source}:${id}:${action}`,
    applyInboxAction,
    acceptPromotion,
    rejectPromotion,
    acceptPartner,
    rejectPartner,
    decideLegalReport,
    qualifyFeedback,
    updateFeedbackTracking,
  };
}
