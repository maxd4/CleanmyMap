import {
  ArrowRight,
  Calendar,
  Clock,
  ExternalLink,
  Shield,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { formatNumber } from "./action-popup-content.helpers";

type ActionPopupContentBodyProps = {
  wasteKg: number;
  butts: number;
  volunteers: number;
  durationMinutes: number;
  operationalEngagementHours: number;
  associationName: string | null;
  departure: string | null;
  arrival: string | null;
  notes: string | null;
  observedAt: string;
  sourceLabel: string;
  updateHref: string | null;
  joinHref?: string | null;
  joinStatusLabel?: string | null;
  hasPollution: boolean;
};

export function ActionPopupContentBody({
  wasteKg,
  butts,
  volunteers,
  durationMinutes,
  operationalEngagementHours,
  associationName,
  departure,
  arrival,
  notes,
  observedAt,
  sourceLabel,
  updateHref,
  joinHref,
  joinStatusLabel,
  hasPollution,
}: ActionPopupContentBodyProps) {
  return (
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800">
        <div className="space-y-1 bg-white p-4 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-600">
            <Trash2 size={12} />
            <span className="cmm-text-caption font-bold uppercase tracking-wider">Déchets</span>
          </div>
          <p className="text-xl font-bold tracking-tight text-slate-950">
            {formatNumber(wasteKg)}{" "}
            <span className="cmm-text-caption font-semibold text-slate-500">kg</span>
          </p>
        </div>
        <div className="space-y-1 bg-white p-4 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-600">
            <Sparkles size={12} className="text-amber-500" />
            <span className="cmm-text-caption font-bold uppercase tracking-wider">Mégots</span>
          </div>
          <p className="text-xl font-bold tracking-tight text-slate-950">{formatNumber(butts)}</p>
        </div>
        <div className="space-y-1 bg-white p-4 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-600">
            <Users size={12} />
            <span className="cmm-text-caption font-bold uppercase tracking-wider">Équipe</span>
          </div>
          <p className="text-xl font-bold tracking-tight text-slate-950">
            {formatNumber(volunteers)}{" "}
            <span className="cmm-text-caption font-semibold text-slate-500">pers.</span>
          </p>
        </div>
        <div className="space-y-1 bg-white p-4 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-600">
            <Clock size={12} />
            <span className="cmm-text-caption font-bold uppercase tracking-wider">Temps</span>
          </div>
          <p className="text-xl font-bold tracking-tight text-slate-950">
            {formatNumber(durationMinutes)}{" "}
            <span className="cmm-text-caption font-semibold text-slate-500">min</span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100/70 bg-gradient-to-br from-emerald-50 to-white p-3 shadow-sm dark:border-emerald-800/40 dark:from-emerald-950/20 dark:to-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-emerald-600" />
            <span className="cmm-text-caption font-bold uppercase text-emerald-700 dark:text-emerald-400">
              Impact Mobilisation
            </span>
          </div>
          <span className="cmm-text-small font-bold text-emerald-700 dark:text-emerald-400">
            {formatNumber(operationalEngagementHours)}h-p
          </span>
        </div>
      </div>

      {(associationName || departure || arrival) && (
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/45">
          {associationName && (
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-50 p-1.5 text-indigo-600 ring-1 ring-inset ring-indigo-200/60 dark:bg-indigo-900/30 dark:ring-indigo-800/50">
                <Shield size={14} />
              </div>
              <p className="cmm-text-small font-semibold text-slate-950">{associationName}</p>
            </div>
          )}
          {(departure || arrival) && (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-sky-50 p-1.5 text-sky-600 ring-1 ring-inset ring-sky-200/60 dark:bg-sky-900/30 dark:ring-sky-800/50">
                <ArrowRight size={14} />
              </div>
              <div className="cmm-text-caption space-y-0.5">
                {departure && (
                  <p className="text-slate-700">
                    <span className="font-bold">Dép.</span> {departure}
                  </p>
                )}
                {arrival && (
                  <p className="text-slate-700">
                    <span className="font-bold">Arr.</span> {arrival}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {notes && (
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm dark:border-slate-800 dark:from-slate-900/70 dark:to-slate-900/30">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700" />
          <p className="mb-2 cmm-text-caption font-bold uppercase tracking-wider cmm-text-muted">
            Bilan terrain
          </p>
          <p className="cmm-text-small line-clamp-3 text-slate-800 transition-all group-hover:line-clamp-none group-hover:leading-relaxed italic">
            &quot;{notes}&quot;
          </p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-2 cmm-text-caption dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Calendar size={12} />
          <span>{observedAt}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <ExternalLink size={12} />
          <span>{sourceLabel}</span>
        </div>
      </div>

      {updateHref ? (
        <a
          href={updateHref}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-sky-200 px-4 py-4 text-center shadow-lg shadow-slate-950/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-emerald-500/0 via-white/10 to-emerald-500/0 transition-transform duration-1000 group-hover:translate-x-[100%]" />
          <span className="cmm-text-small font-bold text-slate-950">
            {hasPollution ? "Déclarer une action" : "Mettre à jour la zone"}
          </span>
          <ArrowRight size={16} className="text-slate-700 transition-transform group-hover:translate-x-1" />
        </a>
      ) : (
        <div className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center dark:border-slate-700 dark:bg-slate-800/60">
          <span className="cmm-text-small font-bold text-slate-500 dark:text-slate-300">
            Coordonnées indisponibles
          </span>
          <span className="cmm-text-caption text-slate-400 dark:text-slate-400">
            Le lieu ne peut pas encore être envoyé vers le formulaire d&apos;action.
          </span>
        </div>
      )}
      {joinHref ? (
        <CmmButton
          href={joinHref}
          tone="primary"
          variant="pill"
          className="h-11 w-full px-4 text-[11px] font-black uppercase tracking-[0.16em]"
        >
          Rejoindre un formulaire
        </CmmButton>
      ) : joinStatusLabel ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center dark:border-slate-700 dark:bg-slate-800/60">
          <span className="cmm-text-small font-bold text-slate-600 dark:text-slate-200">
            {joinStatusLabel}
          </span>
          <span className="mt-1 block cmm-text-caption text-slate-400 dark:text-slate-400">
            Le partage de ce formulaire est désactivé côté organisateur.
          </span>
        </div>
      ) : null}
    </div>
  );
}
