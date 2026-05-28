"use client";

import { useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Leaf,
  MapPinned,
  ShieldCheck,
  Clock3,
  Users,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { HomeCommunityActivitySummary } from "@/lib/accueil/data";
import { useGsapReveal } from "@/lib/animations/use-gsap-reveal";

type HomeCommunityCredibilityProps = {
  activity: HomeCommunityActivitySummary;
  errorMessage?: string | null;
};

const TONE_STYLES: Record<
  HomeCommunityActivitySummary["items"][number]["tone"],
  string
> = {
  amber: "bg-lime-400/14 text-lime-100 ring-lime-200/20",
  blue: "bg-emerald-400/14 text-emerald-100 ring-emerald-200/20",
  cyan: "bg-teal-300/14 text-teal-100 ring-teal-200/20",
  emerald: "bg-green-300/14 text-green-100 ring-green-200/20",
};

const PROOF_CARDS = [
  {
    icon: CheckCircle2,
    title: "Actions terrain documentées",
    text: "Chaque point sur notre carte représente une action réelle, vérifiée et géolocalisée.",
    tone: "text-emerald-200",
  },
  {
    icon: GraduationCap,
    title: "Cadre Sorbonne Université",
    text: "Un projet académique sérieux garantissant une approche méthodologique rigoureuse.",
    tone: "text-lime-200",
  },
  {
    icon: Users,
    title: "Écosystème en construction",
    text: "Partenariats progressifs avec les associations locales et les acteurs publics franciliens.",
    tone: "text-teal-200",
  },
] as const;

const LEFT_HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    label: "Vérifiées",
    text: "Chaque action affichée a un contexte réel.",
  },
  {
    icon: Clock3,
    label: "Récentes",
    text: "Les dernières remontées apparaissent ici.",
  },
  {
    icon: MapPinned,
    label: "Géolocalisées",
    text: "Le terrain est relié à une zone précise.",
  },
] as const;

const COMPACT_SECTION_TITLE_STYLE = {
  textWrap: "balance",
  fontSize: "clamp(2.05rem, 2.9vw, 3.2rem)",
  lineHeight: 0.94,
  letterSpacing: "-0.05em",
} as const;

const COMPACT_SECTION_SUBTITLE_STYLE = {
  maxWidth: "38rem",
} as const;

export function HomeCommunityCredibility({
  activity,
  errorMessage,
}: HomeCommunityCredibilityProps) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useGsapReveal(sectionRef, {
    selector: "[data-gsap-reveal]",
    start: "top 78%",
    stagger: 0.08,
    duration: 0.65,
    y: 24,
  });

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-transparent py-8 sm:py-10 lg:py-12"
    >
      <div className="relative mx-auto w-full max-w-none px-1 sm:px-2 lg:px-4">
        <div className="overflow-hidden rounded-[2.5rem] border border-emerald-200/35 bg-[linear-gradient(180deg,rgba(235,249,239,0.98)_0%,rgba(225,244,233,0.96)_100%)] shadow-[0_30px_70px_-40px_rgba(6,95,70,0.26)] backdrop-blur-xl">
          <div className="grid lg:grid-cols-[1fr_1fr] lg:items-stretch">
            <div className="flex min-w-0 h-full flex-col justify-between gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:border-r lg:border-emerald-900/12 lg:px-10 lg:py-9">
              <div className="cmm-home-section-header space-y-3">
                <div
                  data-gsap-reveal
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200/70 bg-white/45 text-emerald-800 shadow-[0_16px_32px_-22px_rgba(6,95,70,0.35)]"
                >
                  <Users size={24} />
                </div>
                <h2
                  data-gsap-reveal
                  className="cmm-home-section-title mx-auto max-w-[14ch] lg:max-w-[13.5ch]"
                  style={COMPACT_SECTION_TITLE_STYLE}
                >
                  Une communauté vivante et engagée
                </h2>
                <p
                  data-gsap-reveal
                  className="cmm-home-section-subtitle"
                  style={COMPACT_SECTION_SUBTITLE_STYLE}
                >
                  Les dernières actions remontent ici depuis les données du terrain.
                  Rien d&apos;inventé, seulement des actions vérifiées et récentes.
                </p>
              </div>

              <div data-gsap-reveal className="rounded-[1.45rem] border border-emerald-200/28 bg-white/35 px-4 py-4 shadow-[0_16px_34px_-28px_rgba(6,95,70,0.2)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-900/70">
                      Ce que vous trouvez ici
                    </p>
                    <p className="mt-1 text-sm text-emerald-900/70">
                      Un aperçu rapide du terrain et des preuves.
                    </p>
                  </div>
                  <CmmButton
                    href="/explorer"
                    tone="secondary"
                    variant="pill"
                    className="h-9 px-4 text-[11px] font-black gap-2 whitespace-nowrap transition-transform hover:-translate-y-0.5"
                  >
                    Sommaire
                    <ArrowRight size={13} />
                  </CmmButton>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {LEFT_HIGHLIGHTS.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="rounded-[1.1rem] border border-emerald-200/28 bg-white/55 px-3 py-3 text-left shadow-[0_10px_24px_-18px_rgba(6,95,70,0.16)]"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200/50 bg-emerald-50 text-emerald-800">
                            <Icon size={14} />
                          </div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-900">
                            {item.label}
                          </p>
                        </div>
                        <p className="mt-2 text-[12px] leading-snug text-emerald-900/72">
                          {item.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="w-full space-y-3">
                {errorMessage ? (
                  <div
                    data-gsap-reveal
                    role="alert"
                    className="rounded-[1.4rem] border border-amber-200/40 bg-[linear-gradient(180deg,rgba(255,248,232,0.96)_0%,rgba(250,240,214,0.98)_100%)] px-4 py-4 shadow-[0_18px_36px_-24px_rgba(180,83,9,0.18)]"
                  >
                    <p className="text-sm font-bold text-amber-950">
                      Données terrain indisponibles.
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-amber-950/80">
                      {errorMessage}
                    </p>
                  </div>
                ) : null}

                {activity.items.length === 0 ? (
                  <div
                    data-gsap-reveal
                    className="rounded-[1.4rem] border border-emerald-200/35 bg-[linear-gradient(180deg,rgba(7,39,22,0.94)_0%,rgba(6,31,18,0.96)_100%)] px-4 py-4 shadow-[0_18px_36px_-24px_rgba(5,34,20,0.82)]"
                  >
                    <p className="text-sm font-bold text-white">
                      Aucune action terrain récente vérifiée.
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white">
                      Les prochaines données validées apparaîtront ici.
                    </p>
                  </div>
                ) : null}

                {activity.items.map((item) => (
                  <div
                    key={item.id}
                    data-gsap-reveal
                    className="flex items-center gap-3 rounded-[1.4rem] border border-emerald-200/24 bg-[linear-gradient(180deg,rgba(7,39,22,0.94)_0%,rgba(6,31,18,0.96)_100%)] px-4 py-3.5 shadow-[0_18px_36px_-24px_rgba(5,34,20,0.82)] backdrop-blur-xl transition-transform hover:-translate-y-0.5"
                  >
                    <div className="relative">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full text-[11px] font-bold ring-1 ${TONE_STYLES[item.tone]}`}
                        aria-hidden="true"
                      >
                        {item.initials}
                      </div>
                      <div className="absolute -bottom-1 -right-1 rounded-full border border-emerald-200/18 bg-emerald-950 p-1">
                        <Users size={10} className="text-emerald-300" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-white">
                          {item.actor}
                        </p>
                        <p className="flex-shrink-0 text-[10px] uppercase tracking-[0.16em] text-white/90">
                          {item.timeLabel}
                        </p>
                      </div>
                      <p className="truncate text-[13px] text-white/92">
                        {item.action}{" "}
                        <span className="font-semibold text-white">
                          @{item.location}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div data-gsap-reveal className="grid gap-3 pt-1 sm:grid-cols-2">
                <CmmButton
                  href="/actions/history"
                  tone="secondary"
                  variant="pill"
                  className="h-11 px-5 text-[12px] font-black gap-2 transition-transform hover:-translate-y-0.5"
                >
                  Voir toutes les actions
                  <ArrowRight size={14} />
                </CmmButton>
                <CmmButton
                  href="/actions/new"
                  tone="primary"
                  variant="pill"
                  className="h-11 px-5 text-[12px] font-black gap-2 transition-transform hover:-translate-y-0.5"
                >
                  Déclarer une action
                  <ArrowRight size={14} />
                </CmmButton>
              </div>
            </div>

            <div className="flex min-w-0 h-full flex-col justify-between gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
              <div className="cmm-home-section-header space-y-3">
                <div
                  data-gsap-reveal
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200/70 bg-white/45 text-emerald-800 shadow-[0_16px_32px_-22px_rgba(6,95,70,0.35)]"
                >
                  <Leaf size={24} />
                </div>
                <h2
                  data-gsap-reveal
                  className="cmm-home-section-title mx-auto max-w-[15ch]"
                  style={COMPACT_SECTION_TITLE_STYLE}
                >
                  Origine, terrain et crédibilité
                </h2>
                <p
                  data-gsap-reveal
                  className="cmm-home-section-subtitle"
                  style={COMPACT_SECTION_SUBTITLE_STYLE}
                >
                  CleanMyMap est un projet étudiant construit autour d&apos;actions terrain
                  réelles, porté par une ambition partenariale progressive et une rigueur
                  universitaire.
                </p>
              </div>

              <article
                data-gsap-reveal
                className="rounded-[2rem] border border-emerald-100/18 bg-[linear-gradient(180deg,rgba(7,82,51,0.98)_0%,rgba(4,60,38,0.98)_100%)] px-5 py-5 shadow-[0_24px_50px_-30px_rgba(5,34,20,0.86)] backdrop-blur-xl sm:px-6 sm:py-6 lg:px-7 lg:py-7"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-200 shadow-[0_12px_30px_-16px_rgba(74,222,128,0.45)]">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <p className="cmm-text-card-label text-[11px] font-bold uppercase tracking-[0.24em]">
                      L&apos;histoire du projet
                    </p>
                    <h3 className="text-xl font-bold tracking-tight text-emerald-100 sm:text-2xl">
                      Une logique d&apos;engagement concrète
                    </h3>
                  </div>
                </div>

                <div className="cmm-text-card-copy space-y-4 text-[15px] leading-relaxed sm:text-base">
                  <p>
                    Né au sein du <span className="font-semibold text-white">DU Engagement de Sorbonne Université</span>, ce projet transforme l&apos;engagement citoyen en un outil de pilotage concret pour le territoire.
                  </p>
                  <p>
                    Notre objectif est de structurer, cartographier et valoriser les
                    actions de dépollution pour offrir une visibilité inédite sur
                    l&apos;impact environnemental local.
                  </p>
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {PROOF_CARDS.map((card) => {
                      const Icon = card.icon;

                      return (
                        <div
                          key={card.title}
                          data-gsap-reveal
                          className="rounded-[1.35rem] border border-emerald-100/16 bg-white/5 p-4 shadow-[0_18px_40px_-28px_rgba(5,34,20,0.8)]"
                        >
                          <div className={`mb-3 flex items-center gap-2 ${card.tone}`}>
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                              <Icon size={15} />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.22em]">
                              {card.title}
                            </span>
                          </div>
                          <p className="cmm-text-card-copy text-sm leading-relaxed">
                            {card.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <CmmButton
                    href="/actions/map"
                    tone="primary"
                    variant="pill"
                    className="h-12 px-6 text-[13px] font-black gap-2 transition-transform hover:-translate-y-0.5"
                  >
                    Voir la carte
                    <ArrowRight size={15} />
                  </CmmButton>
                  <CmmButton
                    href="/partners/network"
                    tone="secondary"
                    variant="pill"
                    className="h-12 px-6 text-[13px] font-black gap-2 transition-transform hover:-translate-y-0.5"
                  >
                    Annuaire partenaires
                    <ArrowRight size={15} />
                  </CmmButton>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
