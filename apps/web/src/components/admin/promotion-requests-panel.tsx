"use client";

import { useMemo, useState } from "react";
import type { PromotionRequestRecord } from "@/lib/admin/promotion-requests-store";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type PromotionRequestsPanelProps = {
  initialItems: PromotionRequestRecord[];
};

type ActionState = {
  requestId: string;
  action: "accept" | "reject";
} | null;

const STATUS_LABELS: Record<PromotionRequestRecord["status"], { fr: string; en: string }> = {
  pending_owner_review: { fr: "En attente de révision", en: "Awaiting review" },
  accepted: { fr: "Acceptée", en: "Accepted" },
  rejected: { fr: "Refusée", en: "Rejected" },
};

export function PromotionRequestsPanel({ initialItems }: PromotionRequestsPanelProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items;
    }
    return items.filter((item) =>
      [
        item.submittedByDisplayName,
        item.submittedByEmail ?? "",
        item.submittedByUserId,
        item.submittedByRole,
        item.requestedRole,
        item.motivation,
        item.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [items, query]);

  async function reviewRequest(requestId: string, action: "accept" | "reject") {
    setActionState({ requestId, action });
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/promotion-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Impossible de traiter la demande.");
      }

      const payload = (await response.json().catch(() => null)) as
        | { item?: PromotionRequestRecord }
        | null;

      if (payload?.item) {
        setItems((current) =>
          current.map((item) => (item.id === payload.item?.id ? payload.item! : item)),
        );
      } else {
        setItems((current) =>
          current.map((item) =>
            item.id === requestId
              ? {
                  ...item,
                  status: action === "accept" ? "accepted" : "rejected",
                }
              : item,
          ),
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
    } finally {
      setActionState(null);
    }
  }

  async function copySummary(item: PromotionRequestRecord) {
    const text = [
      `Auteur: ${item.submittedByDisplayName}`,
      `Email: ${item.submittedByEmail ?? "non communiqué"}`,
      `User ID: ${item.submittedByUserId}`,
      `Source: Formulaire de promotion`,
      `Rôle actuel: ${item.submittedByRole}`,
      `Rôle demandé: ${item.requestedRole}`,
      `Statut: ${item.status}`,
      `Motivation: ${item.motivation}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
            {fr ? "Inbox propriétaire" : "Owner inbox"}
          </p>
          <h2 className="mt-1 text-base font-semibold cmm-text-primary">
            {fr ? "Demandes de promotion" : "Promotion requests"}
          </h2>
        </div>
        <p className="cmm-text-caption cmm-text-muted">
          {items.length} {fr ? "demande(s)" : "request(s)"}
        </p>
      </div>

      <div className="mt-4">
        <label className="block space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {fr ? "Rechercher" : "Search"}
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              fr
                ? "Nom, email, rôle, motivation..."
                : "Name, email, role, motivation..."
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
          />
        </label>
      </div>

      {errorMessage ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-caption font-medium text-rose-700">
          {errorMessage}
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
                    {item.submittedByDisplayName}
                  </p>
                  <p className="cmm-text-caption cmm-text-muted">
                    {item.submittedByEmail ?? item.submittedByUserId} · {item.submittedByRole} ·{" "}
                    {fr ? "Demande" : "Request"}:{" "}
                    <span className="font-semibold">{item.requestedRole}</span>
                  </p>
                </div>
                <p className="cmm-text-caption font-semibold uppercase tracking-wide text-slate-500">
                  {STATUS_LABELS[item.status][locale]}
                </p>
              </div>

              <p className="mt-3 cmm-text-small cmm-text-secondary whitespace-pre-wrap">
                {item.motivation}
              </p>
              {item.reviewedAt ? (
                <p className="mt-2 cmm-text-caption cmm-text-muted">
                  {fr ? "Traité le" : "Reviewed on"} {item.reviewedAt}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {item.submittedByEmail ? (
                  <a
                    href={`mailto:${item.submittedByEmail}?subject=${encodeURIComponent("Re: demande de promotion")}`}
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
                  {copiedId === item.id
                    ? fr
                      ? "Copié"
                      : "Copied"
                    : fr
                      ? "Copier la demande"
                      : "Copy request"}
                </button>
              </div>

              {item.status === "pending_owner_review" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionState?.requestId === item.id}
                    onClick={() => void reviewRequest(item.id, "accept")}
                    className="rounded-lg bg-emerald-600 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionState?.requestId === item.id && actionState.action === "accept"
                      ? fr
                        ? "Validation..."
                        : "Approving..."
                      : fr
                        ? "Accepter"
                        : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={actionState?.requestId === item.id}
                    onClick={() => void reviewRequest(item.id, "reject")}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionState?.requestId === item.id && actionState.action === "reject"
                      ? fr
                        ? "Traitement..."
                        : "Processing..."
                      : fr
                        ? "Refuser"
                        : "Reject"}
                  </button>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 cmm-text-caption cmm-text-muted">
            {fr
              ? "Aucune demande de promotion ne correspond."
              : "No promotion request matches."}
          </p>
        )}
      </div>
    </section>
  );
}
