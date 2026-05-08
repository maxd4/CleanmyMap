import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apprendre - Ressources Écologie & Bonnes Pratiques | CleanMyMap",
  description:
    "Hub d'apprentissage CleanMyMap. Reprenez votre dernière étape, comprenez le contexte, entraînez-vous et retrouvez les ressources utiles sans dupliquer le contenu des pages dédiées.",
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
