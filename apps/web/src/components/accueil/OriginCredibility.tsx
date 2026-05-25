"use client";

import { useRef } from "react";
import { ArrowRight, CheckCircle2, GraduationCap, Users } from "lucide-react";
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
        <div className="cmm-home-section-header space-y-4">
          <h2
            data-gsap-reveal
            className="cmm-home-section-title"
            style={{ textWrap: "pretty" }}
          >
            Origine, terrain et crédibilité
          </h2>
          <p
            data-gsap-reveal
            className="cmm-home-section-subtitle"
          >
            CleanMyMap est un projet étudiant construit autour d&apos;actions
            terrain réelles, porté par une ambition partenariale progressive et
            une rigueur universitaire.
          </p>
        </div>

        <article
          data-gsap-reveal
          className="mt-10 rounded-[1.8rem] border border-emerald-100/18 cmm-surface-texture-emerald p-6 shadow-[0_24px_50px_-30px_rgba(5,34,20,0.86)] backdrop-blur-xl sm:p-8 lg:p-10"
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
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_auto] xl:items-end">
              <div className="grid gap-4 sm:grid-cols-3">
                {PROOF_CARDS.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div
                      key={card.title}
                      data-gsap-reveal
                      className="rounded-[1.35rem] border border-emerald-100/16 cmm-surface-texture-emerald p-5 shadow-[0_18px_40px_-28px_rgba(5,34,20,0.8)]"
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
              </div>

              <div className="flex flex-wrap gap-3 xl:justify-end">
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
        </article>
      </div>
    </section>
  );
}
