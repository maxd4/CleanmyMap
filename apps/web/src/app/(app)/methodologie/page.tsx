import type { Metadata } from "next";
import { MethodologiePageClient } from "@/components/sections/rubriques/methodologie-page-composition";
import { buildPageMetadata } from "@/lib/metadata";
import { loadMethodologiePageData } from "./methodologie-page-data";

export const metadata: Metadata = buildPageMetadata("/methodologie", {
  title: "Méthodologie - Comment nous calculons l'impact",
  description:
    "Méthodologie de calcul d'impact environnemental de CleanMyMap. Coefficients CO2, eau, valorisation des déchets. Transparence complète sur les métriques d'action citoyenne.",
  keywords: [
    "méthodologie",
    "calcul impact",
    "CO2 avoided",
    "empreinte carbone",
    "valorisation déchets",
    "impact environnemental",
    "transparence",
    "écologie",
    "développement durable",
  ],
});

// Methodology values come from weekly/monthly snapshots and daily-scale sources.
export const revalidate = 86400;

export default async function MethodologiePage() {
  const data = await loadMethodologiePageData();
  return <MethodologiePageClient {...data} />;
}
