"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { PartnerOnboardingRequestRecord } from "@/lib/partners/onboarding-requests-store";
import { formatAvailabilitySummary, formatCoverageSummary } from "@/lib/partners/onboarding-types";

type PartnerOnboardingRequestsPanelProps = {
  initialItems: PartnerOnboardingRequestRecord[];
};

const STATUS_LABELS: Record<PartnerOnboardingRequestRecord["status"], { fr: string; en: string }> = {
  pending_admin_review: { fr: "En attente", en: "Pending" },
  accepted: { fr: "Acceptée", en: "Accepted" },
  rejected: { fr: "Refusée", en: "Rejected" },
};

function contactMailto(item: PartnerOnboardingRequestRecord): string | null {
  const details = item.contactDetails.trim();
  if (!details.includes("@")) {
    return null;
  }
  const subject = encodeURIComponent(`Re: demande partenaire - ${item.organizationName}`);
  const body = encodeURIComponent(
    `Bonjour ${item.contactName || item.organizationName},\n\nJe reviens vers vous au sujet de votre demande partenaire.\n\nCordialement,\n`,
  );
  return `mailto:${details}?subject=${subject}&body=${body}`;
}

export function PartnerOnboardingRequestsPanel({
  initialItems,
}: PartnerOnboardingRequestsPanelProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [items] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PartnerOnboardingRequestRecord["status"]>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        item.organizationName,
        item.organizationType,
        item.legalIdentity,
        item.contactName,
        item.contactChannel,
        item.contactDetails,
        item.motivation,
        item.submittedByEmail ?? "",
        item.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [items, query, statusFilter]);

  const statusCounts = useMemo(
    () => ({
      pending: items.filter((item) => item.status === "pending_admin_review").length,
      accepted: items.filter((item) => item.status === "accepted").length,
      rejected: items.filter((item) => item.status === "rejected").length,
    }),
    [items],
  );

  async function copySummary(item: PartnerOnboardingRequestRecord) {
    const text = [
      `Organisation: ${item.organizationName}`,
      `Type: ${item.organizationType}`,
      `Identité: ${item.legalIdentity}`,
      `Zone: ${formatCoverageSummary(item.coverage)}`,
      `Contributions: ${item.contributionTypes.join(", ")}`,
      `Disponibilité: ${formatAvailabilitySummary(item.availability)}`,
      `Contact: ${item.contactName} - ${item.contactChannel} (${item.contactDetails})`,
      `Source: Formulaire partenaires`,
      `Email soumissionnaire: ${item.submittedByEmail ?? "non communiqué"}`,
      `Statut: ${item.status}`,
      `Motivation: ${item.motivation}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
            {fr ? "Partenariats" : "Partnerships"}
          </p>
          <h2 className="mt-1 text-base font-semibold cmm-text-primary">
            {fr ? "Demandes partenaires" : "Partner requests"}
          </h2>
          <p className="mt-1 cmm-text-caption cmm-text-secondary">
            {fr
              ? "Les demandes arrivent ici avec le contact, le contexte et le statut de traitement."
              : "Requests land here with contact details, context and processing status."}
          </p>
        </div>
        <Link
          href="/partners/dashboard"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100"
        >
          {fr ? "Ouvrir la revue partenaire" : "Open partner review"}
        </Link>
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
                ? "Nom, contact, statut, motivation..."
                : "Name, contact, status, motivation..."
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {fr ? "Filtre" : "Filter"}
          </span>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as typeof statusFilter)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">{fr ? "Tous" : "All"}</option>
            <option value="pending_admin_review">{STATUS_LABELS.pending_admin_review[locale]}</option>
            <option value="accepted">{STATUS_LABELS.accepted[locale]}</option>
            <option value="rejected">{STATUS_LABELS.rejected[locale]}</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 cmm-text-caption text-slate-500">
        <span>{items.length} {fr ? "demande(s)" : "request(s)"}</span>
        <span>•</span>
        <span>{fr ? "En attente" : "Pending"}: {statusCounts.pending}</span>
        <span>•</span>
        <span>{fr ? "Acceptées" : "Accepted"}: {statusCounts.accepted}</span>
        <span>•</span>
        <span>{fr ? "Refusées" : "Rejected"}: {statusCounts.rejected}</span>
      </div>

      <div className="mt-4 space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const mailto = contactMailto(item);
            return (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="cmm-text-small font-semibold cmm-text-primary">
                      {item.organizationName}
                    </p>
                    <p className="mt-1 cmm-text-caption cmm-text-muted">
                      {item.organizationType} · {item.submittedByEmail ?? (fr ? "Email non communiqué" : "Email not provided")}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 cmm-text-caption font-semibold uppercase tracking-wide text-slate-600">
                    {STATUS_LABELS[item.status][locale]}
                  </span>
                </div>

                <p className="mt-2 cmm-text-caption cmm-text-secondary">
                  {item.contactName} · {item.contactChannel} · {item.contactDetails}
                </p>
                <p className="mt-1 cmm-text-caption cmm-text-muted">
                  {item.submittedByEmail ?? item.submittedByUserId}
                </p>
                <p className="mt-2 cmm-text-small cmm-text-secondary whitespace-pre-wrap">
                  {item.motivation}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 cmm-text-caption cmm-text-muted">
                  <span>{new Date(item.createdAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</span>
                  <span>·</span>
                  <span>{item.id}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {mailto ? (
                    <a
                      href={mailto}
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
                    {copiedId === item.id ? (fr ? "Copié" : "Copied") : (fr ? "Copier le résumé" : "Copy summary")}
                  </button>
                  <a
                    href="/partners/dashboard"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-secondary hover:bg-slate-100"
                  >
                    {fr ? "Voir la revue" : "Open review"}
                  </a>
                </div>
              </article>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 cmm-text-caption cmm-text-muted">
            {fr ? "Aucune demande partenaire ne correspond." : "No partner request matches."}
          </p>
        )}
      </div>
    </section>
  );
}
