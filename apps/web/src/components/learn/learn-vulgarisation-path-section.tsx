import Link from "next/link";
import { ArrowRight, BarChart3, BookOpenText, MapPinned, Route } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

const STEPS = [
  { icon: BookOpenText, title: { fr: "Contexte", en: "Context" }, detail: { fr: "Identifier la source, la période et le périmètre.", en: "Identify the source, period and scope." }, href: "/methodologie", link: { fr: "Voir la méthode", en: "See the method" } },
  { icon: BarChart3, title: { fr: "Ordres de grandeur", en: "Orders of magnitude" }, detail: { fr: "Comparer des indicateurs définis sur la même base.", en: "Compare indicators defined on the same basis." }, href: "/reports", link: { fr: "Lire un rapport", en: "Read a report" } },
  { icon: Route, title: { fr: "Méthodologie", en: "Methodology" }, detail: { fr: "Documenter les mesures et les données manquantes.", en: "Document measurements and missing data." }, href: "/actions/new", link: { fr: "Déclarer une action", en: "Report an action" } },
  { icon: MapPinned, title: { fr: "Exemples CleanMyMap", en: "CleanMyMap examples" }, detail: { fr: "Observer la couverture territoriale des interventions.", en: "Explore territorial coverage of interventions." }, href: "/actions/map", link: { fr: "Ouvrir la carte", en: "Open the map" } },
] as const;

export function LearnVulgarisationPathSection({ locale }: { locale: LearnLocale }) {
  const fr = locale === "fr";
  return (
    <section className="space-y-3" aria-labelledby="learn-vulgarisation-path-title">
      <h2 id="learn-vulgarisation-path-title" className="text-xl font-bold cmm-text-primary">{fr ? "Lire et utiliser les données CleanMyMap" : "Read and use CleanMyMap data"}</h2>
      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, detail, href, link }, index) => (
          <li key={href} className="flex">
            <CmmCard tone="family" className="flex w-full flex-col gap-3">
              <div className="flex items-center justify-between"><Icon className="h-6 w-6 text-amber-800 dark:text-amber-300" aria-hidden="true" /><span className="cmm-text-caption font-bold">0{index + 1}</span></div>
              <h3 className="text-base font-bold cmm-text-primary">{title[locale]}</h3>
              <p className="cmm-text-body flex-1">{detail[locale]}</p>
              <Link href={href} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-amber-900 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-200">{link[locale]}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </CmmCard>
          </li>
        ))}
      </ol>
    </section>
  );
}
