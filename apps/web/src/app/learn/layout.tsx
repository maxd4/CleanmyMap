import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apprendre - Ressources Écologie & Bonnes Pratiques | CleanMyMap",
  description:
    "Centre de ressources CleanMyMap. Apprenez les bonnes pratiques de dépollution, comprenez l'écologie urbaine,formedez-vous au développement durable. Bénévolat, action citoyenne, coordination terrain.",
  keywords: [
    "apprendre écologie",
    "bonnes pratiques dépollution",
    "développement durable",
    "formation bénévole",
    "écologie urbaine",
    "impact environnemental",
    "action citoyenne",
    "ressources dépollution",
    "tutoriel cleanwalk",
    "guide propreté Paris",
    "méthodologie collecte",
    "formation environnement",
    "guide bénévolat",
    "coordination action",
  ],
  alternates: {
    canonical: "/learn",
  },
};

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}