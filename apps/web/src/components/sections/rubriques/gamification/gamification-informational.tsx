"use client";

import { Eye, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { SectionLabel } from "./gamification-shell";

export function MethodologyBanner({ locale }: { locale: string }) {
  const fr = locale === "fr";
  return (
    <section className="rounded-[2rem] border border-[#f0d9d2] bg-[#fff7f5] px-5 py-5 shadow-[0_18px_40px_rgba(126,31,20,0.06)] lg:px-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#c51f1f] text-white shadow-[0_12px_26px_rgba(197,31,31,0.18)]">
          <ShieldCheck size={20} />
        </div>
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-[#c51f1f]">
            {fr ? "Algorithme d'impact vérifié" : "Verified impact algorithm"}
          </h3>
          <p className="max-w-4xl text-[14px] leading-7 text-[#6e5550]">
            {fr
              ? "La progression (XP) reflète uniquement des objectifs validés et des indicateurs d'impact explicites. Méthodologie transparente, fondée sur des données vérifiables."
              : "Progression (XP) reflects validated objectives only and explicit impact indicators. Transparent methodology grounded in verifiable data."}
          </p>
        </div>
      </div>
    </section>
  );
}

export function WhyGamification({
  locale,
}: {
  locale: string;
}) {
  const fr = locale === "fr";
  const items = [
    {
      icon: Eye,
      title: fr ? "Rendre visible ce qui compte" : "Make what matters visible",
      description: fr
        ? "Valoriser les contributions utiles et l'impact réel sur le terrain."
        : "Highlight useful contributions and real impact in the field.",
    },
    {
      icon: Users,
      title: fr ? "Encourager sans sur-compétition" : "Encourage without over-competition",
      description: fr
        ? "Une progression saine, coopérative et alignée avec l'intérêt collectif."
        : "A healthy, cooperative progression aligned with the collective good.",
    },
    {
      icon: TrendingUp,
      title: fr ? "Une communauté en progression" : "A community in progression",
      description: fr
        ? "Des repères clairs pour suivre l'évolution du commun."
        : "Clear markers to follow the evolution of the commons.",
    },
  ];

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={ShieldCheck}
        title={fr ? "Pourquoi cette gamification ?" : "Why this gamification?"}
        subtitle={fr ? "Une mécanique simple, lisible et utile." : "A simple, readable and useful mechanic."}
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.title}
            className="rounded-[1.65rem] border border-[#f1dfd8] bg-[#fff8f6] p-5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0ee] text-[#c51f1f]">
              <item.icon size={20} />
            </div>
            <h4 className="mt-4 max-w-[14ch] text-[18px] font-black leading-[1.1] tracking-[-0.03em] text-[#281614]">
              {item.title}
            </h4>
            <p className="mt-3 text-[14px] leading-7 text-[#6f5a56]">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
