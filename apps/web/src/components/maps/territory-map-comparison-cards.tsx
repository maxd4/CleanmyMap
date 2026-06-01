"use client";

import dynamic from "next/dynamic";
import type { CSSProperties, ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import { Compass, MapPin, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-slate-200/70" />,
  },
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  {
    ssr: false,
    loading: () => null,
  },
);

type MapTone = "amber" | "rose" | "sky" | "yellow" | "indigo" | "emerald";

type ToneStyles = {
  section: string;
  shell: string;
  border: string;
  title: string;
  subtitle: string;
  accent: string;
  softAccent: string;
  shadow: string;
  poster: string;
  posterLines: string;
  posterText: string;
  footer: string;
};

type TerritoryMapComparisonCardsProps = {
  title: string;
  subtitle: string;
  locationLabel: string;
  tone: MapTone;
  center?: readonly [number, number];
  zoom?: number;
  note?: ReactNode;
  className?: string;
};

const DEFAULT_CENTER: readonly [number, number] = [48.8566, 2.3522];
const DEFAULT_ZOOM = 12;

const toneStyles: Record<MapTone, ToneStyles> = {
  amber: {
    section: "bg-amber-50/95",
    shell: "bg-white/90",
    border: "border-amber-200/80",
    title: "text-amber-950",
    subtitle: "text-amber-900/70",
    accent: "text-amber-700",
    softAccent: "bg-amber-100/80",
    shadow: "shadow-[0_24px_56px_-32px_rgba(217,119,6,0.24)]",
    poster: "bg-[linear-gradient(145deg,rgba(120,53,15,0.94)_0%,rgba(146,64,14,0.92)_44%,rgba(245,158,11,0.32)_100%)]",
    posterLines: "text-amber-100/20",
    posterText: "text-amber-50",
    footer: "text-amber-900/60",
  },
  rose: {
    section: "bg-rose-50/95",
    shell: "bg-white/90",
    border: "border-rose-200/80",
    title: "text-rose-950",
    subtitle: "text-rose-900/70",
    accent: "text-rose-700",
    softAccent: "bg-rose-100/80",
    shadow: "shadow-[0_24px_56px_-32px_rgba(244,63,94,0.22)]",
    poster: "bg-[linear-gradient(145deg,rgba(88,28,42,0.96)_0%,rgba(136,19,55,0.92)_44%,rgba(251,113,133,0.36)_100%)]",
    posterLines: "text-rose-100/18",
    posterText: "text-rose-50",
    footer: "text-rose-900/60",
  },
  sky: {
    section: "bg-sky-50/95",
    shell: "bg-white/90",
    border: "border-sky-200/80",
    title: "text-sky-950",
    subtitle: "text-sky-900/70",
    accent: "text-sky-700",
    softAccent: "bg-sky-100/80",
    shadow: "shadow-[0_24px_56px_-32px_rgba(56,189,248,0.20)]",
    poster: "bg-[linear-gradient(145deg,rgba(8,47,73,0.96)_0%,rgba(2,132,199,0.90)_46%,rgba(125,211,252,0.34)_100%)]",
    posterLines: "text-sky-100/18",
    posterText: "text-sky-50",
    footer: "text-sky-900/60",
  },
  yellow: {
    section: "bg-yellow-50/95",
    shell: "bg-white/90",
    border: "border-yellow-200/80",
    title: "text-yellow-950",
    subtitle: "text-yellow-900/70",
    accent: "text-yellow-700",
    softAccent: "bg-yellow-100/80",
    shadow: "shadow-[0_24px_56px_-32px_rgba(234,179,8,0.20)]",
    poster: "bg-[linear-gradient(145deg,rgba(113,63,18,0.96)_0%,rgba(161,98,7,0.90)_46%,rgba(253,224,71,0.32)_100%)]",
    posterLines: "text-yellow-100/18",
    posterText: "text-yellow-50",
    footer: "text-yellow-900/60",
  },
  indigo: {
    section: "bg-indigo-50/95",
    shell: "bg-white/90",
    border: "border-indigo-200/80",
    title: "text-indigo-950",
    subtitle: "text-indigo-900/70",
    accent: "text-indigo-700",
    softAccent: "bg-indigo-100/80",
    shadow: "shadow-[0_24px_56px_-32px_rgba(99,102,241,0.20)]",
    poster: "bg-[linear-gradient(145deg,rgba(30,27,75,0.96)_0%,rgba(67,56,202,0.90)_46%,rgba(165,180,252,0.34)_100%)]",
    posterLines: "text-indigo-100/18",
    posterText: "text-indigo-50",
    footer: "text-indigo-900/60",
  },
  emerald: {
    section: "bg-emerald-50/95",
    shell: "bg-white/90",
    border: "border-emerald-200/80",
    title: "text-emerald-950",
    subtitle: "text-emerald-900/70",
    accent: "text-emerald-700",
    softAccent: "bg-emerald-100/80",
    shadow: "shadow-[0_24px_56px_-32px_rgba(16,185,129,0.18)]",
    poster: "bg-[linear-gradient(145deg,rgba(6,78,59,0.96)_0%,rgba(4,120,87,0.90)_46%,rgba(110,231,183,0.34)_100%)]",
    posterLines: "text-emerald-100/18",
    posterText: "text-emerald-50",
    footer: "text-emerald-900/60",
  },
};

function formatCoordinate(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function MapPreviewFrame({
  center,
  zoom,
  locationLabel,
  styles,
}: {
  center: readonly [number, number];
  zoom: number;
  locationLabel: string;
  styles: ToneStyles;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/40 bg-slate-950/90">
      <div className="relative h-[18rem] overflow-hidden">
        <MapContainer
          center={center as [number, number]}
          zoom={zoom}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
        </MapContainer>

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(2,6,23,0.42)_0%,rgba(2,6,23,0.06)_42%,rgba(2,6,23,0.26)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.18)_0%,transparent_52%)]" />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className={cn("flex h-14 w-14 items-center justify-center rounded-full border bg-white/90 shadow-2xl backdrop-blur", styles.border)}>
              <MapPin size={22} className={styles.accent} />
            </div>
            <div className={cn("rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] backdrop-blur", styles.border, "bg-white/80", styles.title)}>
              {locationLabel}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute left-4 top-4">
          <div className={cn("rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] backdrop-blur", styles.border, "bg-white/80", styles.title)}>
            Carte de base
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 top-4">
          <div className={cn("rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] backdrop-blur", styles.border, "bg-white/80", styles.accent)}>
            Base live
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/60 bg-white/85 px-4 py-3 text-[10px] font-semibold">
        <span className={styles.title}>Lecture cartographique brute</span>
        <span className={styles.footer}>OpenStreetMap · CARTO</span>
      </div>
    </div>
  );
}

function TerrainkPreviewFrame({
  center,
  zoom,
  locationLabel,
  styles,
}: {
  center: readonly [number, number];
  zoom: number;
  locationLabel: string;
  styles: ToneStyles;
}) {
  const coordinateLabel = `${formatCoordinate(center[0])} / ${formatCoordinate(center[1])}`;

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/25">
      <div className={cn("relative h-[18rem] overflow-hidden", styles.poster)}>
        <div className="absolute inset-0 opacity-85">
          {[0, 1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={cn(
                "absolute left-1/2 top-1/2 rounded-full border",
                styles.posterLines,
              )}
              style={
                {
                  width: `${82 + step * 12}%`,
                  height: `${66 + step * 10}%`,
                  transform: `translate(-50%, -50%) rotate(${step * 6 - 12}deg)`,
                  borderWidth: step === 0 ? 2 : 1,
                } as CSSProperties
              }
            />
          ))}

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(255,255,255,0.22)_0%,transparent_26%,transparent_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.08)_50%,transparent_100%)]" />
        </div>

        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
          <div className={cn("rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] backdrop-blur", styles.border, "bg-white/12", styles.posterText)}>
            Carte Terraink
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-white/80 backdrop-blur">
          Poster imprimable
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-white/24 bg-white/10" />
              <span className="absolute inset-2 rounded-full border border-white/24" />
              <span className="absolute inset-4 rounded-full border border-white/24" />
              <span className="absolute h-4 w-4 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
            </div>
            <div className={cn("max-w-[14rem] rounded-2xl border border-white/20 bg-black/20 px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.22em] backdrop-blur", styles.posterText)}>
              {locationLabel}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute left-4 bottom-4 space-y-2">
          <div className={cn("rounded-2xl border border-white/15 bg-black/20 px-4 py-3 backdrop-blur", styles.posterText)}>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/65">
              Lecture poster
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{coordinateLabel}</p>
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 bottom-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
          <Compass size={12} />
          {zoom}x
          <LocateFixed size={12} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/20 bg-black/20 px-4 py-3 text-[10px] font-semibold text-white/80 backdrop-blur">
        <span className="font-black uppercase tracking-[0.22em] text-white">Carte stylisée</span>
        <span className="text-white/70">TerraInk / Cartogram</span>
      </div>
    </div>
  );
}

export function TerritoryMapComparisonCards({
  title,
  subtitle,
  locationLabel,
  tone,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  note,
  className,
}: TerritoryMapComparisonCardsProps) {
  const styles = toneStyles[tone];

  return (
    <section className={cn("space-y-5 rounded-[3rem] border p-6 sm:p-8 lg:p-10", styles.section, styles.border, styles.shadow, className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className={cn("text-[10px] font-black uppercase tracking-[0.28em]", styles.accent)}>
            Comparaison cartographique
          </p>
          <h2 className={cn("text-3xl font-black tracking-tight sm:text-4xl", styles.title)}>
            {title}
          </h2>
          <p className={cn("max-w-3xl text-sm font-medium leading-relaxed sm:text-base", styles.subtitle)}>
            {subtitle}
          </p>
        </div>

        <div className={cn("inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em]", styles.border, styles.softAccent, styles.title)}>
          <MapPin size={12} className={styles.accent} />
          {locationLabel}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className={cn("space-y-4 rounded-[2.5rem] border p-4 sm:p-5", styles.shell, styles.border)}>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className={cn("text-[10px] font-black uppercase tracking-[0.22em]", styles.accent)}>
                Base
              </p>
              <h3 className={cn("text-xl font-black tracking-tight sm:text-2xl", styles.title)}>
                Carte de base
              </h3>
            </div>
            <div className={cn("rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em]", styles.border, styles.softAccent, styles.title)}>
              Lecture brute
            </div>
          </div>
          <MapPreviewFrame center={center} zoom={zoom} locationLabel={locationLabel} styles={styles} />
        </article>

        <article className={cn("space-y-4 rounded-[2.5rem] border p-4 sm:p-5", styles.shell, styles.border)}>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className={cn("text-[10px] font-black uppercase tracking-[0.22em]", styles.accent)}>
                Terraink
              </p>
              <h3 className={cn("text-xl font-black tracking-tight sm:text-2xl", styles.title)}>
                Carte Terraink
              </h3>
            </div>
            <div className={cn("rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em]", styles.border, styles.softAccent, styles.title)}>
              Version poster
            </div>
          </div>
          <TerrainkPreviewFrame center={center} zoom={zoom} locationLabel={locationLabel} styles={styles} />
        </article>
      </div>

      {note ? (
        <div className={cn("rounded-[1.75rem] border px-4 py-3 text-sm font-medium leading-relaxed", styles.border, styles.softAccent, styles.title)}>
          {note}
        </div>
      ) : null}
    </section>
  );
}
