"use client";

import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  FileText,
  LayoutDashboard,
  MapPin,
  Map as MapIcon,
  Network,
  Shield,
  Target,
  Users,
  Zap,
} from "lucide-react";
import type { HomeIconName } from "@/lib/accueil/config";
import { useGsapReveal } from "@/lib/animations/use-gsap-reveal";

interface Benefit {
  iconName: HomeIconName;
  title: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
}

interface HomeBenefitsProps {
  benefits: Benefit[];
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

export function HomeBenefits({ benefits }: HomeBenefitsProps) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useGsapReveal(sectionRef, {
    start: "top 78%",
    stagger: 0.08,
    duration: 0.65,
    y: 22,
  });

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-transparent px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
    >
      <div className="relative z-10 mx-auto max-w-[1540px] px-2 sm:px-4">
        <div className="cmm-home-section-header mb-6 space-y-3 sm:mb-8">
          <h2
            data-gsap-reveal
            className="cmm-home-section-title"
            style={{ textWrap: "pretty" }}
          >
            Pourquoi utiliser CleanMyMap ?
          </h2>
          <p
            data-gsap-reveal
            className="cmm-home-section-subtitle"
          >
            Un seul outil pour structurer, mesurer et valoriser vos actions
            terrain.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              data-gsap-reveal
              className="group relative overflow-hidden rounded-[1.5rem] border border-emerald-200/80 cmm-surface-texture-white p-5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/90 hover:shadow-[0_24px_48px_-28px_rgba(15,23,42,0.22)]"
            >
              <div
                className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border ${benefit.border} ${benefit.bg} shadow-sm ${benefit.color}`}
              >
                {(() => {
                  const Icon = ICONS[benefit.iconName];
                  return <Icon size={24} />;
                })()}
              </div>
              <h3 className={`mb-3 text-lg font-bold leading-tight ${benefit.color}`}>
                {benefit.title}
              </h3>
              <p className="cmm-text-card-copy text-[13px] leading-relaxed text-emerald-900/78">
                {benefit.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
