import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ressources - CleanMyMap",
  description:
    "Accédez aux ressources de CleanMyMap: événements, calendrier des cleanwalks, outils et guides pour les bénévoles écologistes.",
  keywords: [
    "ressources",
    "événements",
    "calendrier",
    "cleanwalks",
    "outils bénévole",
    "écologie",
    "Paris",
  ],
  alternates: {
    canonical: "/learn/ressources",
  },
};

import { LearnRessourcesClient } from "./learn-ressources-client";

export default function LearnRessourcesPage() {
  return <LearnRessourcesClient />;
}