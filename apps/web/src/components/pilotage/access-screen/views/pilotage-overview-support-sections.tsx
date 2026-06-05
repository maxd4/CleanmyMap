"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NavigationGrid } from "@/components/ui/navigation-grid";
import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";
import type { PilotageLocale } from "../access-screen-constants";
import type { PilotageOverview } from "@/lib/pilotage/overview";

type PilotageOverviewLink = {
  id: string;
  href: string;
  label: string;
  description: string;
};

type PilotageOverviewSupportSectionsProps = {
  locale: PilotageLocale;
  accessEyebrow: string;
  overview: PilotageOverview | null;
  overviewLinks: PilotageOverviewLink[];
  accessAllowed: boolean;
};

export function PilotageOverviewSupportSections({
  locale,
  accessEyebrow,
  overview,
  overviewLinks,
  accessAllowed,
}: PilotageOverviewSupportSectionsProps) {
  if (!overview) {
    return (
      <section className="rounded-[1.75rem] border border-stone-400/18 bg-[rgba(44,28,15,0.82)] p-5 md:p-6">
        <p className="text-sm text-white">
          {locale === "fr"
            ? "La source de pilotage n'a pas pu être chargée. La structure du cockpit reste disponible, mais les chiffres détaillés sont temporairement indisponibles."
            : "The pilotage source could not be loaded. The cockpit structure remains available, but detailed figures are temporarily unavailable."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={DASHBOARD_ROUTE}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_24px_-8px_rgba(234,88,12,0.45)] transition hover:-translate-y-[1px]"
          >
            {locale === "fr" ? "Mon espace" : "Dashboard"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/reports"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-orange-200/30 bg-[rgba(44,28,15,0.60)] px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:border-orange-300/50"
          >
            {locale === "fr" ? "Rapports" : "Reports"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-[1.75rem] border border-stone-400/18 bg-[rgba(44,28,15,0.82)] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
              {accessEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              {locale === "fr" ? "Accès directs aux vues utiles" : "Direct access to useful views"}
            </h2>
          </div>
          <div className="rounded-full border border-stone-400/18 bg-[rgba(69,45,28,0.72)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-orange-100">
            {overview.contracts.length} {locale === "fr" ? "contrats" : "contracts"}
          </div>
        </div>

        <div className="mt-5">
          <NavigationGrid
            columns={{ default: 1, sm: 2, md: 3, xl: accessAllowed ? 5 : 4 }}
            items={overviewLinks}
          />
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-stone-400/18 bg-[rgba(44,28,15,0.82)] p-5 md:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
          {locale === "fr" ? "Rappel méthodologique" : "Method reminder"}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
          {locale === "fr"
            ? "Le contrôle reste lisible, la preuve reste séparée"
            : "Control stays readable, proof stays separate"}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white">
          {locale === "fr"
            ? "L'espace Accueil & Pilotage sert à la supervision transverse. Les preuves détaillées, les rapports longs et les exports institutionnels restent dans leurs rubriques dédiées pour éviter de mélanger décision, observation et exécution."
            : "The Home & Operations area is for transverse supervision. Detailed evidence, long reports and institutional exports stay in their dedicated sections so that decision, observation and execution remain separate."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/reports"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_24px_-8px_rgba(234,88,12,0.45)] transition hover:-translate-y-[1px]"
          >
            {locale === "fr" ? "Ouvrir les rapports" : "Open reports"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-orange-200/30 bg-[rgba(44,28,15,0.60)] px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:border-orange-300/50"
          >
            {locale === "fr" ? "Aller à l'administration" : "Go to administration"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
