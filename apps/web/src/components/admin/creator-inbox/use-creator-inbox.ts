"use client";

import { useEffect, useMemo, useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { summarizeCreatorInboxItem, type CreatorInboxItem, type CreatorInboxSource, type CreatorInboxStatus } from "@/lib/community/creator-inbox";
import { acceptPartnerRequest, acceptPromotionRequest, applyCreatorInboxAction, fetchCreatorInboxItems, rejectPartnerRequest, rejectPromotionRequest } from "./creator-inbox-service";
import { refreshList } from "./inbox-constants";
import { getCreatorInboxCopy, PARTNER_CONFIRM_PHRASE, type CreatorInboxLocale } from "./creator-inbox-copy";

type UseCreatorInboxParams = {
  initialItems: CreatorInboxItem[];
};

type Summary = {
  feedback: number;
  promotion: number;
  partner: number;
  event: number;
};

export function useCreatorInbox({ initialItems }: UseCreatorInboxParams) {
  const { locale } = useSitePreferences();
  const inboxLocale: CreatorInboxLocale = locale === "fr" ? "fr" : "en";
  const copy = getCreatorInboxCopy(inboxLocale);

  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | CreatorInboxSource>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CreatorInboxStatus>("all");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [partnerConfirm, setPartnerConfirm] = useState("");

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const summary: Summary = useMemo(
    () => ({
      feedback: items.filter((item) => item.source === "feedback").length,
      promotion: items.filter((item) => item.source === "promotion").length,
      partner: items.filter((item) => item.source === "partner").length,
      event: items.filter((item) => item.source === "event").length,
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (sourceFilter !== "all" && item.source !== sourceFilter) {
        return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter) {
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
    });
  }, [items, query, sourceFilter, statusFilter]);

  function resolveMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }
    return fallback;
  }

  async function refreshInbox() {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const nextItems = await fetchCreatorInboxItems();
      setItems(nextItems);
      setSuccessMessage(copy.messages.refreshSuccess);
      window.setTimeout(() => setSuccessMessage(null), 1800);
    } catch (error) {
      setErrorMessage(resolveMessage(error, copy.messages.refreshError));
    } finally {
      setRefreshing(false);
    }
  }

  async function applyInboxAction(params: {
    source: CreatorInboxSource;
    itemId: string;
    action: "mark_treated" | "responded" | "archive" | "delete";
  }) {
    setUpdatingKey(`${params.source}:${params.itemId}:${params.action}`);
    setErrorMessage(null);
    try {
      const payload = await applyCreatorInboxAction(params);
      setItems((current) => refreshList(current, payload.item ?? null, payload.deletedId));
      setSuccessMessage(copy.messages.actionSuccess);
      window.setTimeout(() => setSuccessMessage(null), 1800);
    } catch (error) {
      setErrorMessage(resolveMessage(error, copy.messages.actionError));
    } finally {
      setUpdatingKey(null);
    }
  }

  async function acceptPromotion(item: CreatorInboxItem) {
    setUpdatingKey(`promotion:${item.sourceRecordId}:accept`);
    setErrorMessage(null);
    try {
      await acceptPromotionRequest(item.sourceRecordId);
      await refreshInbox();
    } catch (error) {
      setErrorMessage(resolveMessage(error, copy.messages.approvalError));
    } finally {
      setUpdatingKey(null);
    }
  }

  async function rejectPromotion(item: CreatorInboxItem) {
    setUpdatingKey(`promotion:${item.sourceRecordId}:reject`);
    setErrorMessage(null);
    try {
      await rejectPromotionRequest(item.sourceRecordId);
      await refreshInbox();
    } catch (error) {
      setErrorMessage(resolveMessage(error, copy.messages.rejectionError));
    } finally {
      setUpdatingKey(null);
    }
  }

  async function acceptPartner(item: CreatorInboxItem) {
    if (partnerConfirm.trim().toUpperCase() !== PARTNER_CONFIRM_PHRASE) {
      setErrorMessage(copy.messages.partnerConfirmMismatch);
      return;
    }

    setUpdatingKey(`partner:${item.sourceRecordId}:accept`);
    setErrorMessage(null);
    try {
      await acceptPartnerRequest({
        id: item.sourceRecordId,
        confirmPhrase: partnerConfirm,
      });
      await refreshInbox();
    } catch (error) {
      setErrorMessage(resolveMessage(error, copy.messages.approvalError));
    } finally {
      setUpdatingKey(null);
    }
  }

  async function rejectPartner(item: CreatorInboxItem) {
    if (partnerConfirm.trim().toUpperCase() !== PARTNER_CONFIRM_PHRASE) {
      setErrorMessage(copy.messages.partnerConfirmMismatch);
      return;
    }

    setUpdatingKey(`partner:${item.sourceRecordId}:reject`);
    setErrorMessage(null);
    try {
      await rejectPartnerRequest({
        id: item.sourceRecordId,
        confirmPhrase: partnerConfirm,
      });
      await refreshInbox();
    } catch (error) {
      setErrorMessage(resolveMessage(error, copy.messages.rejectionError));
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

  function actionBusy(source: CreatorInboxSource, id: string, action: string) {
    return updatingKey === `${source}:${id}:${action}`;
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
    refreshing,
    refreshInbox,
    partnerConfirm,
    setPartnerConfirm,
    filteredItems,
    errorMessage,
    successMessage,
    copiedKey,
    copySummary,
    actionBusy,
    applyInboxAction,
    acceptPromotion,
    rejectPromotion,
    acceptPartner,
    rejectPartner,
  };
}
