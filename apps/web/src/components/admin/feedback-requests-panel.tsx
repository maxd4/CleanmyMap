"use client";

import { useMemo, useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { BugReportRecord } from "@/lib/community/bug-reports-store";

type FeedbackRequestsPanelProps = {
  initialItems: BugReportRecord[];
};

const TYPE_LABELS: Record<BugReportRecord["reportType"], { fr: string; en: string }> = {
  bug: { fr: "Bug", en: "Bug" },
  idea: { fr: "Idée", en: "Idea" },
  improvement: { fr: "Amélioration", en: "Improvement" },
  collaboration: { fr: "Collaboration", en: "Collaboration" },
};

const SOURCE_LABELS: Record<BugReportRecord["source"], { fr: string; en: string }> = {
  discussion_form: { fr: "Formulaire discussion", en: "Discussion form" },
  feedback_section: { fr: "Rubrique feedback", en: "Feedback section" },
  feedback_discussion: { fr: "Canal discussion feedback", en: "Feedback discussion channel" },
};

const STATUS_LABELS: Record<BugReportRecord["status"], { fr: string; en: string }> = {
  open: { fr: "Nouveau", en: "New" },
  treated: { fr: "Traité", en: "Treated" },
  archived: { fr: "Archivé", en: "Archived" },
};

export function FeedbackRequestsPanel({ initialItems }: FeedbackRequestsPanelProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BugReportRecord["status"]>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const summary = useMemo(
    () => ({
      bug: items.filter((item) => item.reportType === "bug").length,
      improvement: items.filter((item) => item.reportType === "improvement").length,
      collaboration: items.filter((item) => item.reportType === "collaboration").length,
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [
        item.title,
        item.description,
        item.submittedByDisplayName,
        item.submittedByEmail ?? "",
        item.submittedByUserId,
        item.pagePath ?? "",
        item.source,
        item.reportType,
        item.submittedByRole ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, query, statusFilter]);

  async function updateStatus(reportId: string, status: BugReportRecord["status"]) {
    setUpdatingId(reportId);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/community/bug-reports", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportId, status }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? (fr ? "Traitement impossible." : "Unable to update."));
      }

      const payload = (await response.json().catch(() => null)) as
        | { item?: BugReportRecord }
        | null;

      if (payload?.item) {
        setItems((current) =>
          current.map((item) => (item.id === payload.item?.id ? payload.item! : item)),
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
      setUpdatingId(null);
    }
  }

  async function copySummary(item: BugReportRecord) {
    const text = [
      `Type: ${TYPE_LABELS[item.reportType][locale]}`,
      `Auteur: ${item.submittedByDisplayName}`,
      `Email: ${item.submittedByEmail ?? "non communiqué"}`,
      `Rôle: ${item.submittedByRole ?? "non communiqué"}`,
      `Source: ${SOURCE_LABELS[item.source][locale]}`,
      `Page: ${item.pagePath ?? (fr ? "Page inconnue" : "Unknown page")}`,
      `Statut: ${STATUS_LABELS[item.status][locale]}`,
      `Titre: ${item.title}`,
      `Message: ${item.description}`,
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
            {fr ? "Inbox créateur" : "Creator inbox"}
          </p>
          <h2 className="mt-1 text-base font-semibold cmm-text-primary">
            {fr ? "Feedback centralisé" : "Centralized feedback"}
          </h2>
          <p className="mt-1 cmm-text-caption cmm-text-secondary">
            {fr
              ? "Les retours de la rubrique feedback, du canal discussion et les autres demandes arrivent ici."
              : "Feedback from the feedback section, the discussion channel and other requests land here."}
          </p>
        </div>
        <div className="text-right">
          <p className="cmm-text-caption cmm-text-muted">
            {items.length} {fr ? "retour(s)" : "request(s)"}
          </p>
          <p className="cmm-text-caption cmm-text-muted">
            {fr ? "Bug" : "Bug"}: {summary.bug} · {fr ? "Amélioration" : "Improvement"}:{" "}
            {summary.improvement} · {fr ? "Collaboration" : "Collaboration"}:{" "}
            {summary.collaboration}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="space-y-1 md:col-span-2">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {fr ? "Rechercher" : "Search"}
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              fr
                ? "Auteur, email, titre, page, source..."
                : "Author, email, title, page, source..."
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
          />
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
            <option value="all">{fr ? "Tous" : "All"}</option>
            <option value="open">{STATUS_LABELS.open[locale]}</option>
            <option value="treated">{STATUS_LABELS.treated[locale]}</option>
            <option value="archived">{STATUS_LABELS.archived[locale]}</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 cmm-text-caption text-slate-500">
        <span>{items.length} {fr ? "retour(s)" : "request(s)"}</span>
        <span>•</span>
        <span>{fr ? "Bugs" : "Bugs"}: {summary.bug}</span>
        <span>•</span>
        <span>{fr ? "Améliorations" : "Improvements"}: {summary.improvement}</span>
        <span>•</span>
        <span>{fr ? "Collaborations" : "Collaborations"}: {summary.collaboration}</span>
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
                    {item.title}
                  </p>
                  <p className="mt-1 cmm-text-caption cmm-text-muted">
                    {TYPE_LABELS[item.reportType][locale]} ·{" "}
                    {SOURCE_LABELS[item.source][locale]}
                  </p>
                </div>
                <p className="cmm-text-caption font-semibold uppercase tracking-wide text-slate-500">
                  {STATUS_LABELS[item.status][locale]}
                </p>
              </div>

              <p className="mt-3 whitespace-pre-wrap cmm-text-small cmm-text-secondary">
                {item.description}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 cmm-text-caption cmm-text-muted">
                <span>{item.submittedByDisplayName}</span>
                <span>·</span>
                <span>{item.submittedByEmail ?? (fr ? "Email non communiqué" : "Email not provided")}</span>
                <span>·</span>
                <span>{item.submittedByUserId}</span>
                <span>·</span>
                <span>{item.pagePath ?? (fr ? "Page inconnue" : "Unknown page")}</span>
                <span>·</span>
                <span>{new Date(item.createdAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.submittedByEmail ? (
                  <a
                    href={`mailto:${item.submittedByEmail}?subject=${encodeURIComponent(`Re: ${item.title}`)}`}
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
                  {copiedId === item.id ? (fr ? "Copié" : "Copied") : (fr ? "Copier le message" : "Copy message")}
                </button>
                {item.status === "open" ? (
                  <button
                    type="button"
                    disabled={updatingId === item.id}
                    onClick={() => void updateStatus(item.id, "treated")}
                    className="rounded-lg border border-emerald-200 bg-white px-3 py-2 cmm-text-caption font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingId === item.id ? (fr ? "Traitement..." : "Updating...") : (fr ? "Marquer traité" : "Mark treated")}
                  </button>
                ) : null}
                {item.status !== "archived" ? (
                  <button
                    type="button"
                    disabled={updatingId === item.id}
                    onClick={() => void updateStatus(item.id, "archived")}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingId === item.id ? (fr ? "Archivage..." : "Archiving...") : (fr ? "Archiver" : "Archive")}
                  </button>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 cmm-text-caption cmm-text-muted">
            {fr ? "Aucun retour ne correspond." : "No feedback matches."}
          </p>
        )}
      </div>
    </section>
  );
}
