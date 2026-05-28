import type { Metadata } from "next";
import { MethodologiePageClient } from "@/components/sections/rubriques/methodologie-page-client";

export const metadata: Metadata = {
  title: "Méthodologie - Comment nous calculons l'impact | CleanMyMap",
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
  alternates: {
    canonical: "/methodologie",
  },
};

export default function MethodologiePage() {
  return <MethodologiePageClient />;
}
