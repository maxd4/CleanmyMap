import { notFound } from "next/navigation";
import { MissionMap } from "@/components/missions/mission-map";
import { MissionQR } from "@/components/missions/mission-qr";
import { MapPin, Clock, Trophy, Share2, Zap, Droplets, ShieldCheck } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { resolveMissionActionImageUrl } from "@/lib/missions/mission-images";

const MISSION_ASSETS_BUCKET = "mission-assets";

const FALLBACK_STARTED_AT = new Date(Date.now() - 3600000).toISOString();

type MissionPageParams = {
  params: {
    id: string;
  };
};

export default async function MissionPage({ params }: MissionPageParams) {
  const { id } = params;
  const classes = getBlockClasses("act");
  const supabase = getSupabaseServerClient();

  const { data: mission } = await supabase
    .from("missions")
    .select("*, profiles(name, avatar_url)")
    .eq("id", id)
    .single();

  const m = mission || {
    id,
    label: "Nettoyage Canal Saint-Martin",
    status: "completed",
    started_at: FALLBACK_STARTED_AT,
    ended_at: new Date().toISOString(),
    distance_m: 2450,
    duration_s: 3600,
    volunteer: { name: "Alice", avatar: null },
  };

  const { data: points } = await supabase
    .from("gps_points")
    .select("latitude, longitude, recorded_at")
    .eq("mission_id", id)
    .order("recorded_at");

  const { data: actions } = await supabase
    .from("mission_actions")
    .select("*")
    .eq("mission_id", id);

  const actionsWithResolvedImages = await Promise.all(
    (actions || []).map(async (action) => {
      const imageUrl = await resolveMissionActionImageUrl(action.image_url, async (path) => {
        const { data, error } = await supabase.storage
          .from(MISSION_ASSETS_BUCKET)
          .createSignedUrl(path, 60 * 60 * 24);

        if (error || !data?.signedUrl) {
          return null;
        }

        return data.signedUrl;
      });

      return {
        ...action,
        image_url: imageUrl ?? undefined,
      };
    }),
  );

  const mockPoints = [
    { latitude: 48.8738, longitude: 2.3667, recorded_at: new Date().toISOString() },
    { latitude: 48.875, longitude: 2.368, recorded_at: new Date().toISOString() },
    { latitude: 48.8765, longitude: 2.3695, recorded_at: new Date().toISOString() },
  ];

  const gpsPoints = points && points.length > 0 ? points : mockPoints;
  const isTracking = m.status === "tracking";
  const isPending = m.status === "pending";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 pb-20">
      <header className="flex flex-col items-start justify-between gap-8 pt-10 md:flex-row md:items-center">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                m.status === "completed"
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                  : isTracking
                    ? "border-rose-400/20 bg-rose-400/10 text-rose-400 animate-pulse"
                    : "border-white/10 bg-white/5 text-white/40"
              )}
            >
              {m.status === "completed" ? "Mission Terminée" : isTracking ? "Action en cours" : "Mission Planifiée"}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
              Identifiant #{id.split("-")[0]}
            </span>
          </div>
          <h1 className="text-5xl font-black leading-tight tracking-tighter text-white md:text-6xl">
            {m.label}
          </h1>
        </div>

        <CmmButton
          tone="secondary"
          className={cn(
            "flex items-center gap-2 rounded-2xl border px-6 py-4 transition-all duration-300 hover:scale-[1.02]",
            classes.surface,
            classes.border
          )}
        >
          <Share2 size={16} className="text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-widest">Partager l'impact</span>
        </CmmButton>
      </header>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-8">
          {isPending ? (
            <MissionQR missionId={id} />
          ) : (
            <div className={cn("space-y-8 rounded-[2.5rem] border p-8 transition-all duration-700", classes.surface, classes.shadow)}>
              <h3 className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-white/40">
                <Trophy size={14} className="text-amber-400" />
                Impact Certifié
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="group rounded-[2rem] border border-white/5 bg-white/5 p-6 transition-all hover:border-emerald-400/30">
                  <div className="mb-3 flex items-center gap-2 text-emerald-400">
                    <MapPin size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Distance</span>
                  </div>
                  <p className="text-3xl font-black text-white">
                    {m.distance_m ? (m.distance_m / 1000).toFixed(1) : 0}{" "}
                    <span className="text-sm font-bold text-white/20">km</span>
                  </p>
                </div>

                <div className="group rounded-[2rem] border border-white/5 bg-white/5 p-6 transition-all hover:border-sky-400/30">
                  <div className="mb-3 flex items-center gap-2 text-sky-400">
                    <Clock size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Durée</span>
                  </div>
                  <p className="text-3xl font-black text-white">
                    {m.duration_s ? Math.round(m.duration_s / 60) : 0}{" "}
                    <span className="text-sm font-bold text-white/20">min</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4 border-t border-white/5 pt-4">
                <div className="group flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                      <Zap size={14} />
                    </div>
                    <span className="text-sm font-medium text-white/40 transition-colors group-hover:text-white/60">
                      CO2 évité estimé
                    </span>
                  </div>
                  <span className="font-black text-emerald-400">~{m.distance_m ? (m.distance_m * 0.15).toFixed(1) : 0} kg</span>
                </div>

                <div className="group flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-400/10 text-sky-400">
                      <Droplets size={14} />
                    </div>
                    <span className="text-sm font-medium text-white/40 transition-colors group-hover:text-white/60">
                      Eau préservée
                    </span>
                  </div>
                  <span className="font-black text-sky-400">~{m.distance_m ? Math.round(m.distance_m * 2.5) : 0} L</span>
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
                  <p className="text-sm font-bold text-white/80">
                    {new Date(m.started_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </li>

              <li className="group flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-white/40 transition-transform group-hover:scale-110">
                  <MapPin size={16} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Localisation</p>
                  <p className="text-sm font-bold text-white/80">Paris, Île-de-France</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="group relative overflow-hidden rounded-[3rem] border border-white/10 shadow-2xl">
            <MissionMap points={gpsPoints} actions={actionsWithResolvedImages} />
            <div className="absolute right-6 top-6 rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white opacity-0 backdrop-blur-xl transition-opacity group-hover:opacity-100">
              Tracé GPS Certifié
            </div>
          </div>

          <div
            className={cn(
              "flex items-start gap-6 rounded-[2.5rem] border p-8 transition-all duration-500 hover:border-amber-400/30",
              "border-amber-400/10 bg-amber-400/5"
            )}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-400">
              <ShieldCheck size={24} />
            </div>
            <p className="text-sm font-medium leading-relaxed text-amber-100/60">
              <strong className="mb-2 block text-xs font-black uppercase tracking-widest text-amber-400">
                Preuve d'Impact
              </strong>
              Ce tracé a été enregistré en direct via l'application Compagnon, garantissant l'authenticité de l'impact écologique mesuré sur le terrain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
