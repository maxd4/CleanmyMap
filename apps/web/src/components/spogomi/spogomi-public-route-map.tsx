"use client";

import dynamic from "next/dynamic";

const OfficialRouteMap = dynamic(() => import("./spogomi-official-route-map").then((module) => module.SpogomiOfficialRouteMap), { ssr: false });

export function SpogomiPublicRouteMap({ coordinates }: { coordinates: [number, number][] }) {
  return <OfficialRouteMap coordinates={coordinates} />;
}
