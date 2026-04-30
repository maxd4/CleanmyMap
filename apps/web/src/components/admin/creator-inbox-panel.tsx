"use client";

import { useMemo, useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  formatCreatorInboxSourceLabel,
  formatCreatorInboxStatusLabel,
  summarizeCreatorInboxItem,
  type CreatorInboxItem,
  type CreatorInboxSource,
  type CreatorInboxStatus,
} from "@/lib/community/creator-inbox";

type CreatorInboxPanelProps = {
  initialItems: CreatorInboxItem[];
};

const SOURCE_FILTERS: Array<{ value: "all" | CreatorInboxSource; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "feedback", label: "Feedback" },
  { value: "promotion", label: "Promotion" },
  { value: "partner", label: "Partenariat" },
  { value: "event", label: "Événement" },
];

const STATUS_FILTERS: Array<{ value: "all" | CreatorInboxStatus; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "new", label: "Nouveau" },
  { value: "pending", label: "En attente" },
  { value: "accepted", label: "Accepté" },
  { value: "rejected", label: "Refusé" },
  { value: "responded", label: "Répondu" },
  { value: "treated", label: "Traité" },
  { value: "archived", label: "Archivé" },
];

function refreshList(
  items: CreatorInboxItem[],
  updated: CreatorInboxItem | null,
  deletedId?: string,
): CreatorInboxItem[] {
  if (deletedId) {
    return items.filter((item) => item.sourceRecordId !== deletedId);
  }
  if (!updated) {
    return items;
  }
  return items.map((item) =>
    item.source === updated.source && item.sourceRecordId === updated.sourceRecordId
      ? updated
      : item,
  );
}

export function CreatorInboxPanel({ initialItems }: CreatorInboxPanelProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
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

  const summary = useMemo(
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

  async function refreshInbox() {
    setRefreshing(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/creator-inbox");
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? (fr ? "Impossible de rafraîchir la file." : "Unable to refresh inbox."));
      }

      const payload = (await response.json().catch(() => null)) as
        | { items?: CreatorInboxItem[] }
        | null;
      setItems(payload?.items ?? []);
      setSuccessMessage(fr ? "File rafraîchie." : "Inbox refreshed.");
      window.setTimeout(() => setSuccessMessage(null), 1800);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
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
      const response = await fetch("/api/admin/creator-inbox", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: params.source,
          itemId: params.itemId,
          action: params.action,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? (fr ? "Action impossible." : "Action failed."));
      }

      const payload = (await response.json().catch(() => null)) as
        | { item?: CreatorInboxItem; deletedId?: string }
        | null;
      setItems((current) =>
        refreshList(current, payload?.item ?? null, payload?.deletedId),
      );
      setSuccessMessage(fr ? "Action enregistrée." : "Action saved.");
      window.setTimeout(() => setSuccessMessage(null), 1800);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
    } finally {
      setUpdatingKey(null);
    }
  }

  async function acceptPromotion(item: CreatorInboxItem) {
    setUpdatingKey(`promotion:${item.sourceRecordId}:accept`);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/promotion-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: item.sourceRecordId,
          action: "accept",
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? (fr ? "Validation impossible." : "Approval failed."));
      }
      await refreshInbox();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
    } finally {
      setUpdatingKey(null);
    }
  }

  async function rejectPromotion(item: CreatorInboxItem) {
    setUpdatingKey(`promotion:${item.sourceRecordId}:reject`);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/promotion-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: item.sourceRecordId,
          action: "reject",
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? (fr ? "Refus impossible." : "Rejection failed."));
      }
      await refreshInbox();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
    } finally {
      setUpdatingKey(null);
    }
  }

  async function acceptPartner(item: CreatorInboxItem) {
    if (partnerConfirm.trim().toUpperCase() !== "CONFIRMER PARTENAIRE") {
      setErrorMessage(
        fr
          ? 'Renseigne exactement "CONFIRMER PARTENAIRE" pour valider cette revue.'
          : 'Type exactly "CONFIRMER PARTENAIRE" to confirm this review.',
      );
      return;
    }

    setUpdatingKey(`partner:${item.sourceRecordId}:accept`);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/partners/published-directory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: item.sourceRecordId,
          publicationStatus: "accepted",
          confirmPhrase: partnerConfirm,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; message?: string; hint?: string }
          | null;
        throw new Error(body?.hint ?? body?.message ?? body?.error ?? (fr ? "Validation impossible." : "Approval failed."));
      }
      await refreshInbox();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
    } finally {
      setUpdatingKey(null);
    }
  }

  async function rejectPartner(item: CreatorInboxItem) {
    if (partnerConfirm.trim().toUpperCase() !== "CONFIRMER PARTENAIRE") {
      setErrorMessage(
        fr
          ? 'Renseigne exactement "CONFIRMER PARTENAIRE" pour valider cette revue.'
          : 'Type exactly "CONFIRMER PARTENAIRE" to confirm this review.',
      );
      return;
    }

    setUpdatingKey(`partner:${item.sourceRecordId}:reject`);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/partners/published-directory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: item.sourceRecordId,
          publicationStatus: "rejected",
          confirmPhrase: partnerConfirm,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; message?: string; hint?: string }
          | null;
        throw new Error(body?.hint ?? body?.message ?? body?.error ?? (fr ? "Refus impossible." : "Rejection failed."));
      }
      await refreshInbox();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
    } finally {
      setUpdatingKey(null);
    }
  }

  async function copySummary(item: CreatorInboxItem) {
    try {
      await navigator.clipboard.writeText(summarizeCreatorInboxItem(item, locale));
      setCopiedKey(item.id);
      window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      setErrorMessage(
        fr
          ? "Copie impossible dans le presse-papiers."
          : "Unable to copy to clipboard.",
      );
    }
  }

  function actionBusy(source: CreatorInboxSource, id: string, action: string) {
    return updatingKey === `${source}:${id}:${action}`;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
            {fr ? "Inbox créateur" : "Creator inbox"}
          </p>
          <h2 className="text-lg font-semibold cmm-text-primary">
            {fr ? "File de traitement unifiée" : "Unified processing queue"}
          </h2>
          <p className="max-w-2xl cmm-text-caption cmm-text-secondary">
            {fr
              ? "Feedback, promotion, partenariat et événements arrivent dans le même espace, avec les bons contacts, les bonnes dates et les bons statuts."
              : "Feedback, promotion, partnerships and events arrive in one space with the right contacts, dates and statuses."}
          </p>
        </div>
        <div className="text-right">
          <p className="cmm-text-caption cmm-text-muted">
            {items.length} {fr ? "élément(s)" : "item(s)"}
          </p>
          <p className="cmm-text-caption cmm-text-muted">
            {fr ? "Feedback" : "Feedback"}: {summary.feedback} · {fr ? "Promo" : "Promo"}:{" "}
            {summary.promotion} · {fr ? "Partenariat" : "Partner"}: {summary.partner} ·{" "}
            {fr ? "Événement" : "Event"}: {summary.event}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="space-y-1 md:col-span-2">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {fr ? "Rechercher" : "Search"}
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              fr
                ? "Auteur, email, titre, statut, source..."
                : "Author, email, title, status, source..."
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {fr ? "Source" : "Source"}
          </span>
          <select
            value={sourceFilter}
            onChange={(event) =>
              setSourceFilter(event.target.value as typeof sourceFilter)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
          >
            {SOURCE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {fr ? "Statut" : "Status"}
          </span>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as typeof statusFilter)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 cmm-text-caption text-slate-500">
          <span>{filteredItems.length} {fr ? "élément(s)" : "item(s)"}</span>
          <span>•</span>
          <span>{fr ? "Chargement" : "Loading"}: {refreshing ? (fr ? "oui" : "yes") : (fr ? "non" : "no")}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="space-y-1">
            <span className="cmm-text-caption font-semibold cmm-text-secondary">
              {fr ? "Phrase partenaire" : "Partner phrase"}
            </span>
            <input
              value={partnerConfirm}
              onChange={(event) => setPartnerConfirm(event.target.value)}
              placeholder="CONFIRMER PARTENAIRE"
              className="w-[240px] rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => void refreshInbox()}
            disabled={refreshing}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? (fr ? "Rafraîchissement..." : "Refreshing...") : fr ? "Rafraîchir" : "Refresh"}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-caption font-medium text-rose-700">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 cmm-text-caption font-medium text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="cmm-text-small font-semibold cmm-text-primary">
                    {item.title}
                  </p>
                  <p className="mt-1 cmm-text-caption cmm-text-muted">
                    {item.authorName}
                    {item.authorEmail ? ` · ${item.authorEmail}` : ""}
                    {item.subtitle ? ` · ${item.subtitle}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 cmm-text-caption font-semibold uppercase tracking-wide text-slate-600">
                    {formatCreatorInboxStatusLabel(item.status, locale)}
                  </span>
                  <span className="cmm-text-caption cmm-text-muted">
                    {formatCreatorInboxSourceLabel(item.source, locale)}
                  </span>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap cmm-text-small cmm-text-secondary">
                {item.context}
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {item.details.map((detail) => (
                  <div key={`${item.id}-${detail.label}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
                      {detail.label}
                    </p>
                    <p className="mt-1 cmm-text-caption cmm-text-secondary">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 cmm-text-caption cmm-text-muted">
                <span>{new Date(item.createdAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</span>
                <span>·</span>
                <span>{item.pagePath ?? (fr ? "Page non communiquée" : "Page not provided")}</span>
                <span>·</span>
                <span>{item.priority === "high" ? (fr ? "Priorité haute" : "High priority") : (fr ? "Priorité normale" : "Normal priority")}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {item.hasReplyTarget && item.authorEmail ? (
                  <a
                    href={`mailto:${item.authorEmail}?subject=${encodeURIComponent(`Re: ${item.title}`)}`}
                    className="rounded-lg bg-emerald-600 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-emerald-700"
                  >
                    {fr ? "Répondre par mail" : "Reply by email"}
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void copySummary(item)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100"
                >
                  {copiedKey === item.id ? (fr ? "Copié" : "Copied") : (fr ? "Copier le résumé" : "Copy summary")}
                </button>

                {item.source === "promotion" && item.sourceStatus === "pending_owner_review" ? (
                  <>
                    <button
                      type="button"
                      disabled={actionBusy(item.source, item.sourceRecordId, "accept")}
                      onClick={() => void acceptPromotion(item)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionBusy(item.source, item.sourceRecordId, "accept")
                        ? fr
                          ? "Validation..."
                          : "Approving..."
                        : fr
                          ? "Accepter"
                          : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy(item.source, item.sourceRecordId, "reject")}
                      onClick={() => void rejectPromotion(item)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionBusy(item.source, item.sourceRecordId, "reject")
                        ? fr
                          ? "Traitement..."
                          : "Processing..."
                        : fr
                          ? "Refuser"
                          : "Reject"}
                    </button>
                  </>
                ) : null}

                {item.source === "partner" && item.sourceStatus === "pending_admin_review" ? (
                  <>
                    <button
                      type="button"
                      disabled={actionBusy(item.source, item.sourceRecordId, "accept")}
                      onClick={() => void acceptPartner(item)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionBusy(item.source, item.sourceRecordId, "accept")
                        ? fr
                          ? "Validation..."
                          : "Approving..."
                        : fr
                          ? "Accepter"
                          : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy(item.source, item.sourceRecordId, "reject")}
                      onClick={() => void rejectPartner(item)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionBusy(item.source, item.sourceRecordId, "reject")
                        ? fr
                          ? "Traitement..."
                          : "Processing..."
                        : fr
                          ? "Refuser"
                          : "Reject"}
                    </button>
                  </>
                ) : null}

                {item.source !== "event" ? (
                  <>
                    <button
                      type="button"
                      disabled={actionBusy(item.source, item.sourceRecordId, "mark_treated")}
                      onClick={() =>
                        void applyInboxAction({
                          source: item.source,
                          itemId: item.sourceRecordId,
                          action: "mark_treated",
                        })
                      }
                      className="rounded-lg border border-emerald-200 bg-white px-3 py-2 cmm-text-caption font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionBusy(item.source, item.sourceRecordId, "mark_treated")
                        ? fr
                          ? "Traitement..."
                          : "Processing..."
                        : fr
                          ? "Marquer traité"
                          : "Mark treated"}
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy(item.source, item.sourceRecordId, "responded")}
                      onClick={() =>
                        void applyInboxAction({
                          source: item.source,
                          itemId: item.sourceRecordId,
                          action: "responded",
                        })
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionBusy(item.source, item.sourceRecordId, "responded")
                        ? fr
                          ? "Mise à jour..."
                          : "Updating..."
                        : fr
                          ? "Marquer répondu"
                          : "Mark responded"}
                    </button>
                    {item.canDelete ? (
                      <button
                        type="button"
                        disabled={actionBusy(item.source, item.sourceRecordId, "delete")}
                        onClick={() =>
                          void applyInboxAction({
                            source: item.source,
                            itemId: item.sourceRecordId,
                            action: "delete",
                          })
                        }
                        className="rounded-lg border border-rose-200 bg-white px-3 py-2 cmm-text-caption font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionBusy(item.source, item.sourceRecordId, "delete")
                          ? fr
                            ? "Suppression..."
                            : "Deleting..."
                          : fr
                            ? "Supprimer"
                            : "Delete"}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6">
            <p className="cmm-text-small font-semibold cmm-text-primary">
              {fr ? "Aucun élément à afficher." : "No items to show."}
            </p>
            <p className="mt-1 cmm-text-caption cmm-text-muted">
              {fr
                ? "Essaie un autre filtre ou rafraîchis la file."
                : "Try another filter or refresh the inbox."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
