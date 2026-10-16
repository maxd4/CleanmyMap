"use client";

import {
  useMemo,
  useState,
} from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { summarizeCreatorInboxItem, type CreatorInboxItem, type CreatorInboxSource, type CreatorInboxStatus } from "@/lib/community/creator-inbox";
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
  const [partnerReason, setPartnerReason] = useState<Record<string, string>>({});
  const [actionReasons, setActionReasons] = useState<Record<string, string>>({});

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
      setSuccessMessage(copy.messages.refreshSuccess);
      window.setTimeout(() => setSuccessMessage(null), 1800);
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
      window.setTimeout(() => setSuccessMessage(null), 1800);
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
      window.setTimeout(() => setCopiedKey(null), 1500);
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
      window.setTimeout(() => setSuccessMessage(null), 2400);
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
  };
}
