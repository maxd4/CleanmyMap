"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { SignalementMediaProofs } from "@/components/actions/signalement-media/signalement-media-proofs";
import type {
  MyObservationsReadSnapshot,
} from "@/lib/actions/my-observations-client";
import type {
  MyObservation,
  MyObservationStatus,
} from "@/lib/actions/my-observations-contract";

export function getMyObservationStatusLabel(status: MyObservationStatus): string {
  switch (status) {
    case "new":
      return "En attente de validation";
    case "validated":
      return "Validé";
    case "cleaned":
      return "Nettoyé";
  }
}

function formatObservationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date indisponible";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function ObservationCard({ observation }: { observation: MyObservation }) {
  const typeLabel = observation.type === "clean_place" ? "Lieu propre" : "Spot";
  const statusLabel = getMyObservationStatusLabel(observation.status);

  return (
    <article className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-950/20 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
            {typeLabel}
          </p>
          <h3 className="truncate text-base font-bold text-white">{observation.label}</h3>
          <p className="text-xs text-white/70">
            Observé le {formatObservationDate(observation.createdAt)}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100">
          {statusLabel}
        </span>
      </div>

      <SignalementMediaProofs signalementId={observation.id} />
    </article>
  );
}

export function MyObservationsSection({
  snapshot,
  onRetry,
}: {
  snapshot: MyObservationsReadSnapshot;
  onRetry: () => void;
}) {
  return (
    <section
      id="mes-observations"
      aria-labelledby="mes-observations-title"
      className="scroll-mt-8 space-y-5 border-t border-emerald-400/15 pt-8"
    >
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
          Suivi propriétaire
        </p>
        <h2 id="mes-observations-title" className="text-2xl font-black tracking-tight text-white">
          Mes observations
        </h2>
        <p className="text-sm leading-6 text-white/70">
          Retrouvez ici vos signalements récents et leur évolution.
        </p>
      </div>

      {snapshot.status === "loading" && (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="rounded-2xl border border-slate-400/20 bg-slate-950/20 p-5 text-sm text-slate-200"
        >
          Chargement de vos observations…
        </div>
      )}

      {snapshot.status === "error" && (
        <div role="alert" className="space-y-3 rounded-2xl border border-rose-300/25 bg-rose-950/20 p-5">
          <p className="text-sm font-semibold text-rose-100">
            Vos observations n&apos;ont pas pu être chargées.
          </p>
          <CmmButton
            type="button"
            onClick={onRetry}
            tone="secondary"
            variant="ghost"
            size="sm"
            className="min-h-9 px-3 text-[10px] font-black uppercase tracking-[0.12em]"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Réessayer
          </CmmButton>
        </div>
      )}

      {snapshot.status === "empty" && (
        <div className="space-y-4 rounded-2xl border border-slate-400/20 bg-slate-950/20 p-5">
          <p className="text-sm leading-6 text-slate-100">
            Vous n&apos;avez pas encore d&apos;observation enregistrée.
          </p>
          <Link
            href="#signalement"
            className="inline-flex min-h-10 items-center rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          >
            Créer une observation
          </Link>
        </div>
      )}

      {snapshot.status === "ready" && (
        <div className="space-y-3">
          {snapshot.items.map((observation) => (
            <ObservationCard key={observation.id} observation={observation} />
          ))}
        </div>
      )}
    </section>
  );
}
