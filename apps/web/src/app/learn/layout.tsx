import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apprendre - Vulgarisation, entraînement et tri | CleanMyMap",
  description:
    "Trois rubriques pédagogiques pour vulgariser les enjeux, s'entraîner et apprendre le tri, le compost et les comportements utiles.",
  keywords: [
    "apprendre écologie",
    "vulgarisation environnement",
    "entraînement tri",
    "tri compost comportements",
    "développement durable",
    "formation bénévole",
    "écologie urbaine",
    "impact environnemental",
    "action citoyenne",
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
