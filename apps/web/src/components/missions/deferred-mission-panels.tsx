"use client";

import dynamic from "next/dynamic";
import { useInViewOnce } from "@/components/ui/use-in-view-once";

const DeferredMissionMapComponent = dynamic(
  () => import("@/components/missions/mission-map").then((module) => module.MissionMap),
  {
    ssr: false,
    loading: () => <div className="h-[500px] w-full animate-pulse rounded-[3rem] bg-slate-100" />,
  },
);

const DeferredMissionQRComponent = dynamic(
  () => import("@/components/missions/mission-qr").then((module) => module.MissionQR),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-3xl border border-slate-100 bg-white/80" />
    ),
  },
);

type MissionPoint = {
  latitude: number;
  longitude: number;
  recorded_at: string;
};

type MissionAction = {
  id: string;
  type: string;
  content?: string;
  image_url?: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
};

type MissionMapProps = {
  points: MissionPoint[];
  actions?: MissionAction[];
};

type MissionQRProps = {
  missionId: string;
};

export function DeferredMissionMap(props: MissionMapProps) {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({
    rootMargin: "280px 0px",
  });

  return (
    <div ref={ref} className="min-h-[500px]">
      {isInView ? (
        <DeferredMissionMapComponent {...props} />
      ) : (
        <div className="flex h-[500px] w-full items-center justify-center rounded-[3rem] bg-slate-100">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-12 w-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Chargement de la carte...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeferredMissionQR(props: MissionQRProps) {
  return <DeferredMissionQRComponent {...props} />;
}
