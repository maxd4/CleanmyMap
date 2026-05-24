"use client";

import { useRef } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  FileText,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  Network,
  Shield,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { HomeIconName } from "@/lib/accueil/config";
import { useGsapReveal } from "@/lib/animations/use-gsap-reveal";

interface Pillar {
  iconName: HomeIconName;
  title: string;
  preview: {
    mobile: string[];
    desktop: string[];
  };
  backgroundImage: string;
  iconBg: string;
  iconColor: string;
  ring: string;
  border: string;
  text: string;
  mutedText: string;
  cta: string;
  itemHover: string;
  dot: string;
  href: string;
}

interface HomePillarsProps {
  pillars: Pillar[];
}

const ICONS: Record<HomeIconName, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  zap: Zap,
  map: MapIcon,
  target: Target,
  network: Network,
  "book-open": BookOpen,
  "map-pin": MapPin,
  "bar-chart-3": BarChart3,
  users: Users,
  "file-text": FileText,
  shield: Shield,
};

export function HomePillars({ pillars }: HomePillarsProps) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useGsapReveal(sectionRef, {
    start: "top 78%",
    stagger: 0.08,
    duration: 0.7,
    y: 24,
  });

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden px-3 py-16 sm:px-5 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="relative z-10 mx-auto max-w-[1180px]">
        {/* en-tête */}
        <div className="mb-14 space-y-3 px-4 text-center">
          <h2
            className="text-[clamp(2.5rem,5vw,4rem)] font-black leading-[1.02] tracking-[-0.03em] text-white drop-shadow-[0_8px_18px_rgba(6,44,25,0.24)]"
            style={{ textWrap: "pretty" }}
          >
            Les 5 cartes de CleanMyMap
          </h2>
          <p
            className="mx-auto max-w-2xl text-[15px] font-medium leading-relaxed text-white sm:text-base"
          >
            Accueil et pilotage, agir, cartographie et impact, réseau et
            discussions, apprendre pour piloter vos initiatives.
          </p>
        </div>

        {/* Cartes centrées : 5 en ligne large, 3 + 2 centré si l'espace manque */}
        <div
          className="flex flex-wrap justify-center gap-5 px-4 xl:flex-nowrap"
        >
          {pillars.map((bloc) => (
            <Link
              key={bloc.title}
              href={bloc.href}
              style={{ backgroundImage: bloc.backgroundImage }}
              className={`group relative flex min-h-[216px] w-full flex-col overflow-hidden rounded-[0.95rem] border ${bloc.border} p-6 ring-1 ${bloc.ring} shadow-[0_22px_48px_-28px_rgba(15,23,42,0.58)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_-30px_rgba(15,23,42,0.62)] active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#eff9ef] sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.833rem)] xl:w-[calc(20%-1rem)]`}
            >
              <div className="flex h-full min-h-[168px] flex-col">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/14 to-transparent" />
                <div className={`pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full ${bloc.dot} opacity-[0.16]`} />

                {/* coin accent dot */}
                <span
                  className={`absolute right-5 top-5 h-2 w-2 rounded-full ${bloc.dot} opacity-75 transition-opacity group-hover:opacity-100`}
                />

                {/* icône */}
                <div
                  className={`mb-6 flex h-12 w-12 items-center justify-center rounded-[0.9rem] ${bloc.iconBg} ${bloc.iconColor} shadow-[0_16px_24px_-14px_rgba(6,44,25,0.32)] transition-transform duration-300 group-hover:scale-110`}
                >
                  {(() => {
                    const Icon = ICONS[bloc.iconName];
                    return <Icon size={24} />;
                  })()}
                </div>

                {/* titre */}
                <h3 className={`mb-3 text-[17px] font-black leading-tight ${bloc.text}`}>
                  {bloc.title}
                </h3>

                {/* description — 2 lignes max */}
                <p className={`line-clamp-2 flex-1 text-[13px] leading-[1.65] ${bloc.mutedText} transition-colors group-hover:text-white`} style={{ textWrap: "pretty" }}>
                  {bloc.preview.desktop.length === 0 ? (
                    "Rubriques en cours de configuration."
                  ) : (
                    <>
                      <span className="sm:hidden">
                        {bloc.preview.mobile.join(", ")}
                      </span>
                      <span className="hidden sm:inline">
                        {bloc.preview.desktop.join(", ")}
                      </span>
                    </>
                  )}
                </p>

                {/* lien */}
                <div
                  className={`mt-7 flex items-center gap-2 whitespace-nowrap text-[11px] font-black uppercase tracking-[0.14em] ${bloc.iconColor} opacity-90 transition-opacity group-hover:opacity-100`}
                >
                  Accéder{" "}
                  <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
