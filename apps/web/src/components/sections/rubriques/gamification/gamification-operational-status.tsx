"use client";

import { Radio, ShieldCheck } from "lucide-react";
import { SectionLabel } from "./gamification-shell";

export function OperationalStatusCard({ locale }: { locale: string }) {
  const fr = locale === "fr";
  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={Radio}
        title={fr ? "Statut opérationnel" : "Operational status"}
        subtitle={fr ? "Le moteur de progression reste en arrière-plan et s’active sur les données validées." : "The progression engine remains in the background and activates on validated data."}
      />

      <div className="mt-6 flex min-h-[19rem] flex-col items-center justify-center rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] px-6 py-10 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#fff0ee] text-[#ea7d75] shadow-inner">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#f1c8c1] bg-white">
            <ShieldCheck size={30} strokeWidth={1.8} />
          </div>
        </div>
        <p className="mt-8 max-w-xs text-[24px] font-black leading-[1.12] tracking-[-0.04em] text-[#281614]">
          {fr ? "Moteur de progression hors ligne" : "Progression engine offline"}
        </p>
        <p className="mt-3 max-w-md text-[14px] leading-7 text-[#6f5a56]">
          {fr
            ? "Les services de progression sont en cours d'activation. Revenez bientôt."
            : "The progression services are still being activated. Check back soon."}
        </p>
      </div>
    </section>
  );
}
