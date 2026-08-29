import { DeferredMissionMap, DeferredMissionQR } from "@/components/missions/deferred-mission-panels";
import { MapPin, Clock, Trophy } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { readAuthorizedMission } from "@/lib/missions/mission-access";
import {
  formatMissionDistance,
  formatMissionDuration,
  formatMissionTimestamp,
  getMissionStatusLabel,
} from "@/components/missions/mission-page-contract";

type MissionPageParams = {
  params: {
    id: string;
  };
};

export default async function MissionPage({ params }: MissionPageParams) {
  const { id } = params;
  const classes = getBlockClasses("act");
  const access = await readAuthorizedMission(id);

  if (access.kind === "unauthenticated") {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/missions/${id}`)}`);
  }

  if (access.kind === "not_found" || access.kind === "forbidden") {
    notFound();
  }

  const { mission, points } = access;
  const m = mission;
  const isPending = m.status === "pending";
  const statusLabel = getMissionStatusLabel(m.status);

  return (
    <CmmPageLayout>
      <PageHeader
        tone="emerald"
        contrast="inverse"
        title={m.label ?? "Mission terrain"}
        subtitle="Données de mission et tracé GPS enregistrés par l’application compagnon lorsqu’ils sont disponibles."
        action={
          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            <span>{statusLabel}</span>
            <span>Identifiant #{id.split("-")[0]}</span>
          </div>
        }
      />

      <CmmSectionGroup>
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-8">
          {isPending ? (
            <DeferredMissionQR missionId={id} />
          ) : (
            <div className={cn("space-y-8 rounded-[2.5rem] border p-8 transition-all duration-700", classes.surface, classes.shadow)}>
              <h3 className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-white/40">
                <Trophy size={14} className="text-amber-400" />
                Données terrain
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="group rounded-[2rem] border border-white/5 bg-white/5 p-6 transition-all hover:border-emerald-400/30">
                  <div className="mb-3 flex items-center gap-2 text-emerald-400">
                    <MapPin size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Distance</span>
                  </div>
                  <p className="text-3xl font-black text-white">
                    {formatMissionDistance(m.distance_m)}
                  </p>
                </div>

                <div className="group rounded-[2rem] border border-white/5 bg-white/5 p-6 transition-all hover:border-sky-400/30">
                  <div className="mb-3 flex items-center gap-2 text-sky-400">
                    <Clock size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Durée</span>
                  </div>
                  <p className="text-3xl font-black text-white">
                    {formatMissionDuration(m.duration_s)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className={cn("rounded-[2.5rem] border bg-white/5 p-8 transition-all duration-500 border-white/5 shadow-sm")}>
            <h4 className="mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
              Informations Logistiques
            </h4>
            <ul className="space-y-6">
              <li className="group flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-white/40 transition-transform group-hover:scale-110">
                  <Clock size={16} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Départ le</p>
                  <p className="text-sm font-bold text-white">
                    {formatMissionTimestamp(m.started_at)}
                  </p>
                </div>
              </li>

              <li className="group flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-white/40 transition-transform group-hover:scale-110">
                  <MapPin size={16} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Fin le</p>
                  <p className="text-sm font-bold text-white">
                    {formatMissionTimestamp(m.ended_at)}
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="group relative overflow-hidden rounded-[3rem] border border-white/10 shadow-2xl">
            <DeferredMissionMap points={points} />
            <div className="absolute right-6 top-6 rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white opacity-0 backdrop-blur-xl transition-opacity group-hover:opacity-100">
              Tracé GPS enregistré
            </div>
          </div>

          <div
            className={cn(
              "flex items-start gap-6 rounded-[2.5rem] border p-8 transition-all duration-500 hover:border-amber-400/30",
              "border-amber-400/10 bg-amber-400/5"
            )}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-400">
              <MapPin size={24} />
            </div>
            <p className="text-sm font-medium leading-relaxed text-amber-100/60">
              <strong className="mb-2 block text-xs font-black uppercase tracking-widest text-amber-400">
                Données terrain
              </strong>
              Les données affichées correspondent aux informations enregistrées par
              l&apos;application compagnon lorsqu&apos;elles sont disponibles.
            </p>
          </div>
        </div>
      </div>
      </CmmSectionGroup>
    </CmmPageLayout>
  );
}
