"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

const PROOF_CARDS = [
  {
    icon: CheckCircle2,
    title: "Actions terrain documentées",
    text: "Chaque point sur notre carte représente une action réelle, vérifiée et géolocalisée.",
    tone: "text-cyan-200",
  },
  {
    icon: GraduationCap,
    title: "Cadre Sorbonne Université",
    text: "Un projet académique sérieux garantissant une approche méthodologique rigoureuse.",
    tone: "text-emerald-200",
  },
  {
    icon: Users,
    title: "Écosystème en construction",
    text: "Partenariats progressifs avec les associations locales et les acteurs publics franciliens.",
    tone: "text-violet-200",
  },
];

export function OriginCredibility() {
  return (
    <section className="relative overflow-hidden bg-transparent py-12 sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_46%_50%_at_11%_12%,rgba(8,119,146,0.22),transparent_68%),radial-gradient(ellipse_28%_28%_at_88%_90%,rgba(87,82,211,0.18),transparent_70%),linear-gradient(180deg,rgba(12,40,57,0.42)_0%,rgba(4,9,19,0)_46%)]" />
      <div className="pointer-events-none absolute left-0 top-0 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(29,174,205,0.16)_0%,rgba(29,174,205,0.08)_34%,transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-8rem] right-[-6rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(126,92,255,0.16)_0%,rgba(126,92,255,0.06)_36%,transparent_72%)] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-8">
        <div className="max-w-4xl space-y-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Origine, terrain et crédibilité
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="max-w-4xl text-[17px] leading-[1.55] text-white/66 sm:text-lg"
          >
            CleanMyMap est un projet étudiant construit autour d&apos;actions
            terrain réelles, porté par une ambition partenariale progressive et
            une rigueur universitaire.
          </motion.p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.92fr)] lg:gap-7">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,31,53,0.96)_0%,rgba(9,24,43,0.92)_100%)] p-6 shadow-[0_24px_50px_-30px_rgba(2,6,23,0.9)] backdrop-blur-xl sm:p-8 lg:p-10"
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-200 shadow-[0_12px_30px_-16px_rgba(39,195,217,0.65)]">
                <GraduationCap size={26} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-200/70">
                  L&apos;histoire du projet
                </p>
                <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Une logique d&apos;engagement concrète
                </h3>
              </div>
            </div>

            <div className="space-y-5 text-[15px] leading-relaxed text-white/74 sm:text-base">
              <p>
                Né au sein du <span className="font-semibold text-white">DU Engagement de Sorbonne Université</span>, ce projet transforme l&apos;engagement citoyen en un outil de pilotage concret pour le territoire.
              </p>
              <p>
                Notre objectif est de structurer, cartographier et valoriser les
                actions de dépollution pour offrir une visibilité inédite sur
                l&apos;impact environnemental local.
              </p>
              <div className="rounded-[1.35rem] border border-emerald-300/12 bg-emerald-300/8 p-4 text-sm leading-relaxed text-emerald-100/88">
                <div className="flex items-start gap-3">
                  <Sparkles size={18} className="mt-0.5 flex-shrink-0 text-emerald-300" />
                  <span>
                    Création du projet, premières actions terrain, puis développement des outils de cartographie, de rapports et d&apos;IA dans une plateforme en amélioration continue.
                  </span>
                </div>
              </div>
            </div>
          </motion.article>

          <div className="space-y-4">
            {PROOF_CARDS.map((card, index) => {
              const Icon = card.icon;

              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,30,51,0.90)_0%,rgba(10,23,40,0.96)_100%)] p-5 shadow-[0_18px_40px_-28px_rgba(2,6,23,0.8)]"
                >
                  <div className={`mb-3 flex items-center gap-2 ${card.tone}`}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/6">
                      <Icon size={16} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em]">
                      {card.title}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/68">
                    {card.text}
                  </p>
                </motion.div>
              );
            })}
            <div className="pt-2">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.12 }}
                className="flex flex-wrap gap-3"
              >
                <Link
                  href="/actions/map"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#17bfd8] to-[#19b78e] px-4 text-[12px] font-bold text-[#082033] transition-transform hover:-translate-y-0.5"
                >
                  Voir la carte
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/partners/network"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7b6df7] to-[#a955f7] px-4 text-[12px] font-bold text-white transition-transform hover:-translate-y-0.5"
                >
                  Annuaire partenaires
                  <ArrowRight size={14} />
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
