"use client";

import { useRef } from "react";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useGsapReveal } from "@/lib/animations/use-gsap-reveal";

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
];

export function OriginCredibility() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useGsapReveal(sectionRef, {
    start: "top 76%",
    stagger: 0.08,
    duration: 0.68,
    y: 22,
  });

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-transparent py-12 sm:py-16 lg:py-20"
    >
      <div className="relative mx-auto max-w-[1540px] px-4 sm:px-8">
        <div className="max-w-5xl mx-auto space-y-4 text-center">
          <h2
            data-gsap-reveal
            className="text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl lg:text-6xl"
            style={{ textWrap: "pretty" }}
          >
            Origine, terrain et crédibilité
          </h2>
          <p
            data-gsap-reveal
            className="mx-auto max-w-3xl text-base font-light leading-relaxed text-emerald-900/66 sm:text-lg"
          >
            CleanMyMap est un projet étudiant construit autour d&apos;actions
            terrain réelles, porté par une ambition partenariale progressive et
            une rigueur universitaire.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.28fr)_minmax(0,0.92fr)] lg:gap-7 xl:grid-cols-[minmax(0,1.34fr)_minmax(0,0.86fr)]">
          <article
            data-gsap-reveal
            className="rounded-[1.8rem] border border-emerald-100/18 bg-[linear-gradient(180deg,rgba(20,100,70,0.94)_0%,rgba(14,85,55,0.94)_100%)] p-6 shadow-[0_24px_50px_-30px_rgba(5,34,20,0.86)] backdrop-blur-xl sm:p-8 lg:p-10"
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-200 shadow-[0_12px_30px_-16px_rgba(74,222,128,0.45)]">
                <GraduationCap size={26} />
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

            <div className="cmm-text-card-copy space-y-5 text-[15px] leading-relaxed sm:text-base">
              <p>
                Né au sein du <span className="font-semibold text-white">DU Engagement de Sorbonne Université</span>, ce projet transforme l&apos;engagement citoyen en un outil de pilotage concret pour le territoire.
              </p>
              <p>
                Notre objectif est de structurer, cartographier et valoriser les
                actions de dépollution pour offrir une visibilité inédite sur
                l&apos;impact environnemental local.
              </p>
              <div className="rounded-[1.35rem] border border-emerald-300/14 bg-[rgba(10,44,28,0.9)] p-4 text-sm leading-relaxed cmm-text-card-copy">
                <div className="flex items-start gap-3">
                  <Sparkles size={18} className="mt-0.5 flex-shrink-0 text-emerald-300" />
                  <span>
                    Création du projet, premières actions terrain, puis développement des outils de cartographie, de rapports et d&apos;IA dans une plateforme en amélioration continue.
                  </span>
                </div>
              </div>
            </div>
          </article>

          <div className="space-y-4">
            {PROOF_CARDS.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  data-gsap-reveal
                  className="rounded-[1.35rem] border border-emerald-100/16 bg-[linear-gradient(180deg,rgba(20,100,70,0.94)_0%,rgba(14,85,55,0.94)_100%)] p-5 shadow-[0_18px_40px_-28px_rgba(5,34,20,0.8)]"
                >
                  <div className={`mb-3 flex items-center gap-2 ${card.tone}`}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                      <Icon size={16} />
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
            <div className="pt-2">
              <div
                data-gsap-reveal
                className="flex flex-wrap gap-3"
              >
                <Link
                  href="/actions/map"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#34d399] to-[#84cc16] px-4 text-[12px] font-bold text-emerald-950 transition-transform hover:-translate-y-0.5"
                >
                  Voir la carte
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/partners/network"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#16a34a] to-[#0f766e] px-4 text-[12px] font-bold text-white transition-transform hover:-translate-y-0.5"
                >
                  Annuaire partenaires
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
