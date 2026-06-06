"use client";

import dynamic from "next/dynamic";

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
  return <DeferredMissionMapComponent {...props} />;
}

export function DeferredMissionQR(props: MissionQRProps) {
  return <DeferredMissionQRComponent {...props} />;
}
