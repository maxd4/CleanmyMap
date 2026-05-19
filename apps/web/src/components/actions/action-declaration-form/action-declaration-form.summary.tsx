"use client";

import { cn } from "@/lib/utils";

type SummaryRowProps = {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "slate" | "emerald";
};

export function SummaryRow({
  label,
  value,
  strong = false,
  tone = "slate",
}: SummaryRowProps) {
  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-[#ECF8EF] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-900/58">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold leading-snug",
          strong ? "text-emerald-950" : tone === "emerald" ? "text-emerald-800" : "text-emerald-900/82",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function formatDraftDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatActionDate(value: string): string {
  if (!value) return "Date non renseignée";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

export function formatWasteSummary(wasteKg: string, megotsKg: string): string {
  const waste = Number(wasteKg);
  const megots = Number(megotsKg);
  const parts: string[] = [];

  if (Number.isFinite(waste) && waste > 0) {
    parts.push(`${formatKgValue(waste)} kg déchets`);
  }
  if (Number.isFinite(megots) && megots > 0) {
    parts.push(`${formatKgValue(megots)} kg mégots`);
  }

  return parts.length > 0 ? parts.join(" · ") : "Aucune quantité saisie";
}

function formatKgValue(value: number): string {
  return (value < 1 ? value.toFixed(2) : value.toFixed(1)).replace(".", ",");
}

type FormProgressSummaryProps = {
  actionDate: string;
  wasteKg: string;
  megotsKg: string;
  draftSavedAt: string | null;
  compact?: boolean;
  showProgress?: boolean;
};

export function FormProgressSummary({
  actionDate,
  wasteKg,
  megotsKg,
  draftSavedAt,
  compact = false,
  showProgress = true,
}: FormProgressSummaryProps) {
  const stepLabel = showProgress ? "Formulaire continu" : "Synthèse";
  const dateLabel = formatActionDate(actionDate);
  const wasteLabel = formatWasteSummary(wasteKg, megotsKg);

  if (compact) {
    return (
      <aside
        aria-label="Récapitulatif de la déclaration"
        className="sticky top-2 z-20 mb-4 rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3 shadow-[0_18px_36px_-26px_rgba(34,197,94,0.2)] backdrop-blur-3xl lg:hidden"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-black text-emerald-950">{stepLabel}</span>
          {showProgress ? <span className="text-emerald-500/30">•</span> : null}
          <span className="font-semibold text-emerald-900/82">{dateLabel}</span>
          <span className="text-emerald-500/30">•</span>
          <span className="font-semibold text-emerald-900/82">{wasteLabel}</span>
          {draftSavedAt ? (
            <>
              <span className="text-emerald-500/30">•</span>
              <span className="font-semibold text-emerald-800">Brouillon sauvegardé</span>
            </>
          ) : null}
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Récapitulatif de la déclaration"
      className="sticky top-24 hidden rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] p-4 shadow-[0_18px_36px_-26px_rgba(34,197,94,0.2)] backdrop-blur-3xl lg:block"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-900/58">
        {showProgress ? "Récapitulatif" : "Synthèse"}
      </p>
      <div className="mt-4 space-y-3">
        {showProgress ? <SummaryRow label="Progression" value={stepLabel} strong /> : null}
        <SummaryRow label="Date" value={dateLabel} />
        <SummaryRow label="Récolte" value={wasteLabel} />
        <SummaryRow
          label="Brouillon"
          value={draftSavedAt ? `Sauvegardé ${draftSavedAt}` : "Pas encore modifié"}
          tone={draftSavedAt ? "emerald" : "slate"}
        />
      </div>
    </aside>
  );
}
